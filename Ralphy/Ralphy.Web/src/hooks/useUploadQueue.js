import { useCallback, useEffect, useReducer, useRef } from 'react'
import api from '../api/axios'
import { readPhotoMeta } from '../utils/exif'
import { prepareForUpload } from '../utils/imagePipeline'
import {
  ItemStatus,
  activeCount,
  initialQueue,
  nextPending,
  queueReducer,
} from './uploadQueueReducer'

// Not unbounded — a 40-photo batch would open 40 sockets and turn every
// progress bar into noise. Not strictly sequential either, which wastes a good
// connection. Three at a time is the compromise.
const MAX_CONCURRENT = 3

let nextId = 0

/**
 * Drives N single-file uploads against the existing
 * POST /api/photos/upload/{postId} endpoint. A batch endpoint would be nice
 * but is not required, and Kestrel's 100 MB body limit leaves room for one
 * later.
 */
export function useUploadQueue({ postId, startingSortOrder = 0, onUploaded }) {
  const [queue, dispatch] = useReducer(queueReducer, initialQueue)

  // The pump reads the freshest queue without being a dependency of itself.
  const queueRef = useRef(queue)
  queueRef.current = queue

  const onUploadedRef = useRef(onUploaded)
  onUploadedRef.current = onUploaded

  const runningRef = useRef(new Set())

  // Object URLs are not garbage-collected with the component. Twenty untouched
  // drone JPEGs is real memory, so revoke every one on unmount.
  const previewUrlsRef = useRef(new Set())
  useEffect(() => {
    const urls = previewUrlsRef.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const enqueue = useCallback((files) => {
    const items = Array.from(files).map((file) => {
      const previewUrl = URL.createObjectURL(file)
      previewUrlsRef.current.add(previewUrl)
      return { id: `u${nextId++}`, file, previewUrl }
    })

    dispatch({ type: 'enqueue', items, startingSortOrder })
  }, [startingSortOrder])

  const setCaption = useCallback((id, caption) => {
    dispatch({ type: 'caption', id, caption })
  }, [])

  const retry = useCallback((id) => {
    dispatch({ type: 'retry', id })
  }, [])

  const remove = useCallback((id) => {
    dispatch({ type: 'remove', id })
  }, [])

  const clearFinished = useCallback(() => {
    dispatch({ type: 'clearFinished' })
  }, [])

  const uploadOne = useCallback(async (item) => {
    const { id, file } = item

    try {
      // EXIF first, always. Canvas-based compression strips it, and
      // preserveExif is not something to bet the geotag on.
      dispatch({ type: 'status', id, status: ItemStatus.Reading })
      const meta = await readPhotoMeta(file)

      dispatch({ type: 'status', id, status: ItemStatus.Compressing })
      const prepared = await prepareForUpload(file)

      dispatch({ type: 'status', id, status: ItemStatus.Uploading })

      const form = new FormData()
      form.append('file', prepared)
      form.append('sortOrder', String(item.sortOrder))
      if (item.caption) form.append('caption', item.caption)
      if (meta.takenAt) form.append('takenAt', meta.takenAt)
      if (meta.latitude != null) form.append('latitude', String(meta.latitude))
      if (meta.longitude != null) form.append('longitude', String(meta.longitude))

      await api.post(`/photos/upload/${postId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!event.total) return
          dispatch({
            type: 'progress',
            id,
            progress: Math.round((event.loaded * 100) / event.total),
          })
        },
      })

      dispatch({ type: 'done', id })
      onUploadedRef.current?.()
    } catch (err) {
      dispatch({
        type: 'fail',
        id,
        error:
          err?.response?.data?.message ??
          err?.message ??
          'Upload failed',
      })
    } finally {
      runningRef.current.delete(id)
    }
  }, [postId])

  // Pump: whenever the queue changes, top the pool back up.
  useEffect(() => {
    if (!postId) return

    let slots = MAX_CONCURRENT - activeCount(queue.items)

    while (slots > 0) {
      const item = nextPending(
        queueRef.current.items.filter((i) => !runningRef.current.has(i.id))
      )
      if (!item) break

      runningRef.current.add(item.id)
      slots -= 1
      void uploadOne(item)
    }
  }, [queue, postId, uploadOne])

  return {
    items: queue.items,
    enqueue,
    setCaption,
    retry,
    remove,
    clearFinished,
  }
}
