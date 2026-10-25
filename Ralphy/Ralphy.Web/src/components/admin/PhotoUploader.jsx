import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { cldImage } from '../../utils/cloudinary'
import { useUploadQueue } from '../../hooks/useUploadQueue'
import { ItemStatus, failedCount, isSettled } from '../../hooks/uploadQueueReducer'
import { exposureLine, gearLine } from '../../utils/cameraFormat'
import CameraInfoDialog from './CameraInfoDialog'

const PHASE_LABEL = {
  [ItemStatus.Pending]: 'Waiting',
  [ItemStatus.Reading]: 'Reading photo info',
  [ItemStatus.Compressing]: 'Compressing',
  [ItemStatus.Uploading]: 'Uploading',
  [ItemStatus.Done]: 'Done',
  [ItemStatus.Failed]: 'Failed',
}

// What the file's EXIF yielded. Said out loud, because a stripped export is
// otherwise invisible until the photo is live without its details.
function CameraFound({ camera }) {
  const summary = [gearLine(camera), exposureLine(camera)]
    .filter(Boolean)
    .join(' · ')

  return summary ? (
    <p className="mt-1 truncate text-xs text-slate-400" title={summary}>
      📷 {summary}
    </p>
  ) : (
    <p className="mt-1 text-xs leading-snug text-amber-400">
      No camera info in this file — add it afterwards with the i button
    </p>
  )
}

// ── One row in the upload queue ─────────────────────────────────
function QueueRow({ item, onCaption, onRetry, onRemove }) {
  const failed = item.status === ItemStatus.Failed
  const done = item.status === ItemStatus.Done

  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-800/60 p-2.5">
      <img
        src={item.previewUrl}
        alt=""
        className="h-12 w-12 flex-shrink-0 rounded object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-300">{item.file.name}</p>
          <span
            className={`flex-shrink-0 text-xs ${
              failed ? 'text-red-400' : done ? 'text-green-400' : 'text-blue-400'
            }`}
          >
            {item.status === ItemStatus.Uploading
              ? `${item.progress}%`
              : PHASE_LABEL[item.status]}
          </span>
        </div>

        {!done && !failed && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className={`h-full rounded-full bg-blue-500 transition-all
                          duration-300 ${
                item.status === ItemStatus.Uploading ? '' : 'animate-pulse'
              }`}
              style={{
                width:
                  item.status === ItemStatus.Uploading
                    ? `${item.progress}%`
                    : '100%',
              }}
            />
          </div>
        )}

        {item.camera && <CameraFound camera={item.camera} />}

        {failed && (
          <p className="mt-1 text-xs leading-snug text-red-400">{item.error}</p>
        )}

        {!done && (
          <input
            type="text"
            value={item.caption}
            onChange={(e) => onCaption(item.id, e.target.value)}
            placeholder="Caption (optional)"
            disabled={item.status !== ItemStatus.Pending && !failed}
            className="mt-1.5 w-full rounded border border-slate-700 bg-slate-900
                       px-2 py-1 text-xs text-white placeholder-slate-600
                       focus:outline-none focus:ring-1 focus:ring-blue-500
                       disabled:opacity-50"
          />
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {failed && (
          <button
            type="button"
            onClick={() => onRetry(item.id)}
            className="rounded bg-slate-700 px-2 py-1 text-xs text-white
                       hover:bg-slate-600"
          >
            Retry
          </button>
        )}
        {(failed || item.status === ItemStatus.Pending) && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            title="Remove from queue"
            className="px-1 text-slate-500 hover:text-red-400"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// ── Reorder arrows: always on touch screens, on hover elsewhere ──
function ArrowButton({ side, label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // In the caption strip, well clear of the delete button at the top.
      className={`absolute bottom-0.5 z-10 flex h-6 w-6 items-center
                  justify-center rounded-full bg-slate-700 text-sm text-white
                  opacity-0 transition-opacity group-hover:opacity-100
                  [@media(hover:none)]:opacity-100 ${
        side === 'left' ? 'left-1' : 'right-1'
      }`}
    >
      {children}
    </button>
  )
}

// ── Delete confirmation ─────────────────────────────────────────
function ConfirmDeletePhoto({ photo, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-photo-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6"
      >
        <img
          src={cldImage(photo.url, 400)}
          alt=""
          className="mx-auto mb-4 max-h-40 rounded-lg object-contain"
        />
        <h2 id="delete-photo-title" className="mb-1 text-center font-semibold text-white">
          Delete this photo?
        </h2>
        <p className="mb-5 text-center text-sm text-slate-400">
          It is removed from the post and from storage.
          <span className="font-medium text-red-400"> This cannot be undone.</span>
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm
                       font-medium text-slate-300 transition-colors
                       hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              try { await onConfirm() } finally { setDeleting(false) }
            }}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm
                       font-semibold text-white transition-colors
                       hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── The saved gallery, drag-reorderable ─────────────────────────
function GalleryGrid({ photos, onReorder, onCaption, onCamera, onDelete }) {
  const [dragId, setDragId] = useState(null)
  const [order, setOrder] = useState(photos)

  useEffect(() => { setOrder(photos) }, [photos])

  const move = (fromId, toId) => {
    if (fromId === toId) return
    const next = [...order]
    const from = next.findIndex((p) => p.id === fromId)
    const to = next.findIndex((p) => p.id === toId)
    if (from < 0 || to < 0) return
    next.splice(to, 0, next.splice(from, 1)[0])
    setOrder(next)
  }

  const save = async (next) => {
    if (next.map((p) => p.id).join() === photos.map((p) => p.id).join()) return

    try {
      await onReorder(next.map((p) => p.id))
    } catch {
      setOrder(photos)   // roll the optimistic move back
      toast.error('Could not save the new order')
    }
  }

  const commit = () => {
    setDragId(null)
    save(order)
  }

  // Drag and drop does not fire on touch screens, so phones get arrows.
  const nudge = (index, delta) => {
    const to = index + delta
    if (to < 0 || to >= order.length) return
    const next = [...order]
    next.splice(to, 0, next.splice(index, 1)[0])
    setOrder(next)
    save(next)
  }

  if (order.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-2">
      {order.map((photo, index) => (
        <div
          key={photo.id}
          draggable
          onDragStart={() => setDragId(photo.id)}
          onDragOver={(e) => { e.preventDefault(); move(dragId, photo.id) }}
          onDragEnd={commit}
          onDrop={(e) => { e.preventDefault(); commit() }}
          className={`group relative cursor-move overflow-hidden rounded-lg
                      bg-slate-800 ${dragId === photo.id ? 'opacity-40' : ''}`}
          // Reserving the real aspect ratio is what stops the grid jumping
          // as images decode.
          style={{
            aspectRatio:
              photo.width && photo.height
                ? `${photo.width} / ${photo.height}`
                : '1 / 1',
          }}
        >
          <img
            src={cldImage(photo.url, 400)}
            alt={photo.caption || ''}
            loading="lazy"
            className="h-full w-full object-cover"
          />

          <span className="absolute left-1 top-1 rounded bg-slate-950/70 px-1.5
                           py-0.5 text-xs font-medium text-white">
            {index + 1}
          </span>

          <button
            type="button"
            onClick={() => onCamera(photo)}
            title={[gearLine(photo), exposureLine(photo)].filter(Boolean)
              .join('\n') || 'No camera details — click to add'}
            aria-label="Edit camera details"
            className={`absolute right-7 top-1 flex h-5 w-5 items-center
                        [@media(hover:none)]:right-9 [@media(hover:none)]:h-7
                        [@media(hover:none)]:w-7
                        justify-center rounded-full text-[10px] font-semibold
                        transition-opacity group-hover:opacity-100
                        [@media(hover:none)]:opacity-100 ${
              photo.camera || photo.fNumber
                ? 'bg-slate-950/70 text-white opacity-0'
                : 'bg-amber-500/90 text-slate-950 opacity-0'
            }`}
          >
            i
          </button>

          {index > 0 && (
            <ArrowButton side="left" label="Move earlier"
                         onClick={() => nudge(index, -1)}>
              ←
            </ArrowButton>
          )}
          {index < order.length - 1 && (
            <ArrowButton side="right" label="Move later"
                         onClick={() => nudge(index, 1)}>
              →
            </ArrowButton>
          )}

          <button
            type="button"
            onClick={() => onDelete(photo)}
            aria-label="Delete photo"
            // Touch screens have no hover to reveal it, so it is always shown
            // there, and a size up so a fingertip can land on it.
            className="absolute right-1 top-1 flex h-5 w-5 items-center
                       justify-center rounded-full bg-red-500 text-xs text-white
                       opacity-0 transition-opacity group-hover:opacity-100
                       [@media(hover:none)]:h-7 [@media(hover:none)]:w-7
                       [@media(hover:none)]:text-sm
                       [@media(hover:none)]:opacity-100"
          >
            ×
          </button>

          <input
            type="text"
            defaultValue={photo.caption ?? ''}
            placeholder="Caption"
            onBlur={(e) => onCaption(photo.id, e.target.value)}
            onDragStart={(e) => e.preventDefault()}
            className="absolute inset-x-0 bottom-0 w-full border-0 bg-slate-950/80
                       px-1.5 py-1 text-xs text-white placeholder-slate-500
                       opacity-0 transition-opacity focus:opacity-100
                       focus:outline-none group-hover:opacity-100
                       [@media(hover:none)]:px-8
                       [@media(hover:none)]:opacity-100"
          />
        </div>
      ))}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────
export default function PhotoUploader({ postId, onCreateDraft }) {
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [cameraPhoto, setCameraPhoto] = useState(null)
  const [deletingPhoto, setDeletingPhoto] = useState(null)
  const fileInput = useRef(null)

  const fetchMedia = useCallback(async () => {
    if (!postId) return
    try {
      const [photoRes, videoRes] = await Promise.all([
        api.get(`/photos/post/${postId}`),
        api.get(`/videos/post/${postId}`),
      ])
      setPhotos(photoRes.data.data ?? [])
      setVideos(videoRes.data.data ?? [])
    } catch (err) {
      console.error(err)
    }
  }, [postId])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const queue = useUploadQueue({
    postId,
    startingSortOrder: photos.length,
    onUploaded: fetchMedia,
  })

  const settled = isSettled(queue.items)
  const failed = failedCount(queue.items)

  // Sweep the successes once everything has landed, so the queue does not grow
  // into a wall of "Done" rows across several batches.
  useEffect(() => {
    if (settled && failed === 0) {
      const timer = setTimeout(queue.clearFinished, 1500)
      return () => clearTimeout(timer)
    }
  }, [settled, failed, queue])

  const handleFiles = (files) => {
    if (!files?.length) return
    queue.enqueue(files)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleReorder = async (photoIds) => {
    await api.put(`/photos/post/${postId}/order`, { photoIds })
    await fetchMedia()
  }

  const handleCaption = async (photoId, caption) => {
    const current = photos.find((p) => p.id === photoId)
    if ((current?.caption ?? '') === caption) return

    try {
      await api.patch(`/photos/${photoId}`, { caption })
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, caption } : p))
      )
    } catch {
      toast.error('Could not save the caption')
    }
  }

  // Errors propagate so the dialog can show them and stay open.
  const handleCamera = async (values) => {
    const res = await api.put(`/photos/${cameraPhoto.id}/camera`, values)
    const saved = res.data.data
    setPhotos((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
    toast.success('Camera details saved')
  }

  // Runs from the confirmation dialog. It also deletes the Cloudinary file,
  // so there is no undo — hence the dialog.
  const handleDeletePhoto = async () => {
    const photoId = deletingPhoto.id
    try {
      await api.delete(`/photos/${photoId}`)
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      setDeletingPhoto(null)
    } catch {
      toast.error('Could not delete the photo')
    }
  }

  const handleDeleteVideo = async (videoId) => {
    try {
      await api.delete(`/videos/${videoId}`)
      setVideos((prev) => prev.filter((v) => v.id !== videoId))
    } catch {
      toast.error('Could not delete the video')
    }
  }

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const form = new FormData()
    form.append('file', file)

    try {
      await toast.promise(
        api.post(`/videos/upload/${postId}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
        { loading: 'Uploading video…', success: 'Video uploaded', error: 'Upload failed' }
      )
      fetchMedia()
    } catch (err) {
      console.error(err)
    }
  }

  // A photo needs a post to hang off, and inventing a client-side draft id
  // would orphan Cloudinary uploads every time the tab closed. But a
  // photo-first editor whose photo box is inert until you find the save button
  // has the flow backwards, so offer the save from here.
  if (!postId) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-2 text-sm font-semibold text-white">Photos</h3>
        <p className="mb-4 text-xs text-slate-500">
          Photos attach to a saved post. Save a draft and the uploader opens
          right here — you won’t lose what you’ve typed.
        </p>
        <button
          type="button"
          disabled={creatingDraft}
          onClick={async () => {
            setCreatingDraft(true)
            try { await onCreateDraft() } finally { setCreatingDraft(false) }
          }}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold
                     text-white transition-colors hover:bg-blue-700
                     disabled:opacity-50"
        >
          {creatingDraft ? 'Saving…' : 'Save draft & add photos'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Photos {photos.length > 0 && (
            <span className="text-slate-500">({photos.length})</span>
          )}
        </h3>
        <label className="cursor-pointer text-xs text-slate-400 hover:text-white">
          + Video
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
            className="hidden"
            onChange={handleVideoUpload}
          />
        </label>
      </div>

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`mb-4 w-full rounded-lg border-2 border-dashed py-6
                    transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        <span className="block text-sm font-medium text-slate-300">
          Drop photos here, or click to choose
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          JPG, PNG or WebP · select as many as you like
        </span>
      </button>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {/* Queue */}
      {queue.items.length > 0 && (
        <div className="mb-4 space-y-2">
          {queue.items.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              onCaption={queue.setCaption}
              onRetry={queue.retry}
              onRemove={queue.remove}
            />
          ))}
          {settled && failed > 0 && (
            <p className="text-xs text-red-400">
              {failed} {failed === 1 ? 'photo' : 'photos'} failed. The rest
              uploaded — retry just the ones that didn’t.
            </p>
          )}
        </div>
      )}

      {/* Saved gallery */}
      {photos.length > 0 && (
        <>
          <p className="mb-2 text-xs text-slate-500">
            <span className="[@media(hover:none)]:hidden">Drag</span>
            <span className="hidden [@media(hover:none)]:inline">Use the arrows</span>
            {' '}to reorder · the first photo is the cover
          </p>
          <GalleryGrid
            photos={photos}
            onReorder={handleReorder}
            onCaption={handleCaption}
            onCamera={setCameraPhoto}
            onDelete={setDeletingPhoto}
          />
        </>
      )}

      {deletingPhoto && (
        <ConfirmDeletePhoto
          photo={deletingPhoto}
          onConfirm={handleDeletePhoto}
          onClose={() => setDeletingPhoto(null)}
        />
      )}

      {cameraPhoto && (
        <CameraInfoDialog
          photo={cameraPhoto}
          onSave={handleCamera}
          onClose={() => setCameraPhoto(null)}
        />
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-slate-400">
            Videos ({videos.length})
          </p>
          {videos.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-2 rounded-lg bg-slate-800 p-2"
            >
              <span className="text-sm">🎬</span>
              <p className="min-w-0 flex-1 truncate text-xs text-slate-300">
                {video.caption || 'Video'}
              </p>
              <button
                type="button"
                onClick={() => handleDeleteVideo(video.id)}
                className="px-1 text-slate-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
