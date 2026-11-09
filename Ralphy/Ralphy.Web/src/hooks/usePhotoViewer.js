import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { withViewTransition } from '../utils/viewTransition'

const MORPH_NAME = 'lightbox-photo'

/** 0-based index from `?photo=N` (1-based in the URL), or null. */
export function readPhotoParam(search) {
  const value = new URLSearchParams(search).get('photo')
  const n = Number(value)
  return value && Number.isInteger(n) && n > 0 ? n - 1 : null
}

/** The URL with `?photo=` set to index + 1, or removed when index is null. */
export function withPhotoParam(href, index) {
  const url = new URL(href)
  if (index == null) url.searchParams.delete('photo')
  else url.searchParams.set('photo', String(index + 1))
  return url.toString()
}

const frameOf = (source) => source?.querySelector('[data-photo-frame]') ?? source

function isOnScreen(element) {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight
}

/**
 * State and choreography for the full-screen photo viewer.
 *
 * - open(i) / close(): when the browser supports View Transitions the photo
 *   grows out of its place on the page and shrinks back into it; elsewhere the
 *   viewer simply appears and disappears.
 * - On close, the photo the visitor ended on is scrolled into view and gets
 *   keyboard focus back, so they land where they left off.
 * - With `syncUrl`, the open photo is mirrored in `?photo=N`, which makes it a
 *   link that can be shared and opens the viewer straight away.
 *
 * Pass `sourceRef(i)` as the `ref` of the element that opens photo i.
 */
export function usePhotoViewer({ syncUrl = false } = {}) {
  const [index, setIndex] = useState(() =>
    syncUrl ? readPhotoParam(window.location.search) : null)
  const [preview, setPreview] = useState(null)
  const sources = useRef(new Map())
  const indexRef = useRef(index)
  useLayoutEffect(() => { indexRef.current = index }, [index])

  const sourceRef = useCallback((i) => (element) => {
    if (element) sources.current.set(i, element)
    else if (sources.current.get(i)) sources.current.delete(i)
  }, [])

  const open = useCallback((i) => {
    const frame = frameOf(sources.current.get(i))
    const image = frame?.querySelector('[data-main-image]')
    // The copy already on screen stands in until the larger one loads, so the
    // morph never lands on an empty frame.
    const src = image?.complete && image.naturalWidth > 0 ? image.currentSrc : null

    if (frame && isOnScreen(frame)) frame.style.viewTransitionName = MORPH_NAME

    withViewTransition(() => {
      if (frame) frame.style.viewTransitionName = ''
      flushSync(() => {
        setPreview(src ? { index: i, src } : null)
        setIndex(i)
      })
    }, { kind: 'lightbox' })
  }, [])

  const close = useCallback(() => {
    const source = sources.current.get(indexRef.current)
    const frame = frameOf(source)

    const transition = withViewTransition(() => {
      flushSync(() => setIndex(null))
      if (!frame) return
      if (!isOnScreen(frame)) {
        frame.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
      frame.style.viewTransitionName = MORPH_NAME
    }, { kind: 'lightbox' })

    const finish = () => {
      if (frame) frame.style.viewTransitionName = ''
      source?.focus?.({ preventScroll: true })
    }
    if (transition) transition.finished.finally(finish)
    else finish()
  }, [])

  // Mirror the open photo into the address bar. replaceState rather than a
  // router navigation: it's synchronous (the view transition needs that), adds
  // no history entries, and keeps the router's own entry state intact.
  useEffect(() => {
    if (!syncUrl) return
    const next = withPhotoParam(window.location.href, index)
    if (next !== window.location.href) {
      window.history.replaceState(window.history.state, '', next)
    }
  }, [index, syncUrl])

  return {
    index,
    open,
    close,
    navigate: setIndex,
    sourceRef,
    previewSrc: preview?.index === index ? preview.src : null,
  }
}
