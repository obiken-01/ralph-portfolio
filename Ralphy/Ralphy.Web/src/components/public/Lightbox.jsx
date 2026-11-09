import { useCallback, useEffect, useRef, useState } from 'react'
import { cldImage } from '../../utils/cloudinary'
import { exposureLine, gearLine } from '../../utils/cameraFormat'
import { prefersReducedMotion } from '../../utils/viewTransition'
import BlurImage from '../common/BlurImage'

const IDLE_MS = 2500        // controls fade out after this long without input
const SWIPE_PX = 60         // horizontal drag that counts as prev/next
const DISMISS_PX = 110      // vertical drag that closes the viewer
const TAP_SLOP_PX = 8       // movement still treated as a tap
const DOUBLE_TAP_MS = 280
const TAP_ZOOM = 2.5
const MAX_ZOOM = 4

// Space kept clear for the controls, so the photo doesn't jump when they hide.
const PAD_TOP = 56
const PAD_BOTTOM = 72
const PAD_BOTTOM_STRIP = 128

const NO_ZOOM = { s: 1, x: 0, y: 0 }
const NO_DRAG = { x: 0, y: 0 }

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function srcSetFor(url) {
  if (cldImage(url, 800) === url) return undefined // not Cloudinary
  return [800, 1200, 1800, 2400].map((w) => `${cldImage(url, w)} ${w}w`).join(', ')
}

function aspectOf(photo) {
  return photo?.width > 0 && photo?.height > 0 ? photo.width / photo.height : null
}

// ── Icons ───────────────────────────────────────────────────────
const Icon = ({ d, className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2"
       viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)
const CLOSE = 'M6 18L18 6M6 6l12 12'
const PREV = 'M15 19l-7-7 7-7'
const NEXT = 'M9 5l7 7-7 7'
const INFO = 'M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'

/** Camera, lens and exposure under the caption. Absent when EXIF was. */
function CameraDetails({ photo }) {
  const gear = gearLine(photo)
  const exposure = exposureLine(photo)

  if (!gear && !exposure && !photo.editedWith) return null

  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3
                    gap-y-1 text-center text-xs text-white/60">
      {gear && <span>{gear}</span>}
      {exposure && <span className="tabular-nums">{exposure}</span>}
      {photo.editedWith && (
        <span className="rounded-full border border-white/15 px-2 py-0.5
                         text-white/70">
          Edited in {photo.editedWith}
        </span>
      )}
    </div>
  )
}

const hasCameraDetails = (photo) =>
  !!(gearLine(photo) || exposureLine(photo) || photo?.editedWith)

function captionOf(photo) {
  return photo.caption
    || (photo.source === 1 ? 'Drone shot' : photo.source === 0 ? 'Phone shot' : '')
}

/**
 * Full-screen photo viewer.
 *
 * - Keyboard: Esc closes (or zooms back out first), ← / → step, `i` toggles
 *   the camera details. Focus stays inside while it's open.
 * - Touch: swipe sideways to step, swipe down to close, pinch or double-tap to
 *   zoom, drag to pan while zoomed, tap to show/hide the controls.
 * - Mouse: click outside the photo to close, double-click to zoom,
 *   ctrl/trackpad-pinch to zoom.
 * - The controls fade away after a few seconds without input.
 * - The next and previous photos are fetched ahead of time.
 *
 * @param photos     array of { url, caption, source, width, height, camera,
 *                   lens, fNumber, exposureTime, iso, focalLength, editedWith }
 * @param index      index of the open photo
 * @param onClose    () => void
 * @param onNavigate (newIndex) => void
 * @param previewSrc an already-loaded copy of photos[index] to show while the
 *                   full-size one downloads (see usePhotoViewer)
 */
export default function Lightbox({ photos, index, onClose, onNavigate, previewSrc }) {
  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1
  const showStrip = photos.length > 1

  const dialogRef = useRef(null)
  const stageRef = useRef(null)
  const frameRef = useRef(null)
  const stripRef = useRef(null)
  const closeRef = useRef(null)

  const [chrome, setChrome] = useState(true)
  const [info, setInfo] = useState(false)
  const [zoom, setZoom] = useState(NO_ZOOM)
  const [drag, setDrag] = useState(NO_DRAG)
  const [gesturing, setGesturing] = useState(false)

  // Direction of the last step, for the slide-in. Adjusted during render
  // (rather than in an effect) so the new photo never paints un-animated.
  const [shown, setShown] = useState({ index, dir: null })
  if (shown.index !== index) {
    setShown({ index, dir: index > shown.index ? 'next' : 'prev' })
    setZoom(NO_ZOOM)
    setDrag(NO_DRAG)
  }

  const zoomRef = useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // ── Controls auto-hide ──
  const idleTimer = useRef(null)
  const wake = useCallback(() => {
    setChrome(true)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setChrome(false), IDLE_MS)
  }, [])
  useEffect(() => {
    idleTimer.current = setTimeout(() => setChrome(false), IDLE_MS)
    return () => clearTimeout(idleTimer.current)
  }, [])

  const step = useCallback((target) => {
    if (target >= 0 && target < photos.length) onNavigate(target)
  }, [photos.length, onNavigate])

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e) => {
      wake()
      if (e.key === 'Escape') {
        e.preventDefault()
        if (zoomRef.current.s > 1) setZoom(NO_ZOOM)
        else onClose()
      } else if (e.key === 'ArrowLeft') {
        step(index - 1)
      } else if (e.key === 'ArrowRight') {
        step(index + 1)
      } else if (e.key === 'i' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setInfo((v) => !v)
      } else if (e.key === 'Tab') {
        // Keep focus inside the dialog.
        const focusables = [...dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables.at(-1)
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, step, onClose, wake])

  // ── Scroll lock, without the page shifting sideways ──
  useEffect(() => {
    const { body, documentElement } = document
    const scrollbar = window.innerWidth - documentElement.clientWidth
    const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      body.style.overflow = previous.overflow
      body.style.paddingRight = previous.paddingRight
    }
  }, [])

  // ── Fetch neighbours ahead of time ──
  useEffect(() => {
    for (const i of [index + 1, index - 1]) {
      const neighbour = photos[i]
      if (!neighbour) continue
      const img = new Image()
      img.sizes = '100vw'
      const srcSet = srcSetFor(neighbour.url)
      if (srcSet) img.srcset = srcSet
      img.src = cldImage(neighbour.url, 1600)
    }
  }, [index, photos])

  // ── Keep the active thumbnail in view ──
  useEffect(() => {
    const strip = stripRef.current
    const thumb = strip?.children[index]
    if (!thumb) return
    strip.scrollTo({
      left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.offsetWidth / 2,
      behavior: prefersReducedMotion() ? 'instant' : 'smooth',
    })
  }, [index])

  // ── Zoom helpers ──
  const clampPan = useCallback((z) => {
    const frame = frameRef.current
    if (!frame || z.s <= 1) return NO_ZOOM
    const maxX = ((z.s - 1) * frame.offsetWidth) / 2
    const maxY = ((z.s - 1) * frame.offsetHeight) / 2
    return { s: z.s, x: clamp(z.x, -maxX, maxX), y: clamp(z.y, -maxY, maxY) }
  }, [])

  /** Zoom to `s`, keeping the screen point (px, py) still. */
  const zoomAt = useCallback((s, px, py) => {
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    const current = zoomRef.current
    // Offset of the point from the frame's untransformed centre, in the
    // photo's own (unzoomed) coordinates.
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (px - cx) / current.s
    const dy = (py - cy) / current.s
    const next = clamp(s, 1, MAX_ZOOM)
    setZoom(clampPan({
      s: next,
      x: current.x + dx * (current.s - next),
      y: current.y + dy * (current.s - next),
    }))
  }, [clampPan])

  // Trackpad pinch / ctrl+wheel. A native listener because React's wheel
  // handler is passive and couldn't stop the browser zooming the whole page.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (e) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      zoomAt(zoomRef.current.s * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // ── Pointer gestures ──
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const lastTap = useRef(null)
  const tapTimer = useRef(null)
  useEffect(() => () => clearTimeout(tapTimer.current), [])

  const spread = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2) {
      gesture.current = { type: 'pinch', d0: spread(), s0: zoomRef.current.s }
      setDrag(NO_DRAG)
      setGesturing(true)
    } else if (pointers.current.size === 1) {
      gesture.current = {
        type: 'pending',
        sx: e.clientX, sy: e.clientY,
        zx: zoomRef.current.x, zy: zoomRef.current.y,
      }
    }
  }

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return

    if (g.type === 'pinch') {
      if (pointers.current.size < 2) return
      const [a, b] = [...pointers.current.values()]
      zoomAt(g.s0 * (spread() / g.d0), (a.x + b.x) / 2, (a.y + b.y) / 2)
      return
    }

    const dx = e.clientX - g.sx
    const dy = e.clientY - g.sy

    if (g.type === 'pending') {
      if (Math.hypot(dx, dy) < TAP_SLOP_PX) return
      g.type = zoomRef.current.s > 1 ? 'pan'
        : Math.abs(dx) > Math.abs(dy) ? 'swipe-x' : 'swipe-y'
      setGesturing(true)
    }

    if (g.type === 'pan') {
      setZoom((z) => clampPan({ ...z, x: g.zx + dx, y: g.zy + dy }))
    } else if (g.type === 'swipe-x') {
      // Resist past the first and last photo.
      const atEdge = (dx > 0 && !hasPrev) || (dx < 0 && !hasNext)
      setDrag({ x: atEdge ? dx * 0.25 : dx, y: 0 })
    } else if (g.type === 'swipe-y') {
      setDrag({ x: 0, y: dy })
    }
  }

  const onTap = (e) => {
    const now = performance.now()
    const previous = lastTap.current
    // By position, not e.target: the stage captures the pointer, so every
    // event's target is the stage itself.
    const rect = frameRef.current?.getBoundingClientRect()
    const onPhoto = !!rect
      && e.clientX >= rect.left && e.clientX <= rect.right
      && e.clientY >= rect.top && e.clientY <= rect.bottom

    if (previous && now - previous.t < DOUBLE_TAP_MS
        && Math.hypot(e.clientX - previous.x, e.clientY - previous.y) < 30) {
      clearTimeout(tapTimer.current)
      lastTap.current = null
      if (zoomRef.current.s > 1) setZoom(NO_ZOOM)
      else if (onPhoto) zoomAt(TAP_ZOOM, e.clientX, e.clientY)
      return
    }

    lastTap.current = { t: now, x: e.clientX, y: e.clientY }
    const isMouse = e.pointerType === 'mouse'
    clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => {
      lastTap.current = null
      if (isMouse) {
        if (!onPhoto && zoomRef.current.s === 1) onClose()
      } else {
        // On touch, a tap shows or hides the controls.
        setChrome((visible) => {
          clearTimeout(idleTimer.current)
          if (!visible) idleTimer.current = setTimeout(() => setChrome(false), IDLE_MS)
          return !visible
        })
      }
    }, DOUBLE_TAP_MS)
  }

  const endGesture = (e, cancelled = false) => {
    if (!pointers.current.delete(e.pointerId)) return
    const g = gesture.current
    if (!g) return

    if (g.type === 'pinch') {
      if (pointers.current.size > 0) return // wait for the last finger
      if (zoomRef.current.s < 1.05) setZoom(NO_ZOOM)
      gesture.current = null
      setGesturing(false)
      return
    }

    gesture.current = null
    setGesturing(false)
    if (cancelled) { setDrag(NO_DRAG); return }

    const dx = e.clientX - g.sx
    const dy = e.clientY - g.sy

    if (g.type === 'pending') {
      onTap(e)
    } else if (g.type === 'swipe-x') {
      if (dx <= -SWIPE_PX && hasNext) step(index + 1)
      else if (dx >= SWIPE_PX && hasPrev) step(index - 1)
      else setDrag(NO_DRAG)
    } else if (g.type === 'swipe-y') {
      if (Math.abs(dy) >= DISMISS_PX) onClose()
      else setDrag(NO_DRAG)
    }
  }

  if (!photo) return null

  const aspect = aspectOf(photo)
  const padBottom = showStrip ? PAD_BOTTOM_STRIP : PAD_BOTTOM
  const caption = captionOf(photo)
  const canShowInfo = hasCameraDetails(photo)
  const dismissProgress = Math.min(Math.abs(drag.y) / 600, 0.5)

  const chromeClass = `transition-opacity duration-300 ${
    chrome ? 'opacity-100' : 'pointer-events-none opacity-0'
  }`
  const roundButton =
    'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 '
    + 'text-white/90 backdrop-blur-md transition-colors hover:bg-white/20 '
    + 'hover:text-white focus:outline-none focus-visible:ring-2 '
    + 'focus-visible:ring-white/80'

  const transform =
    `translate3d(${drag.x + zoom.x}px, ${drag.y + zoom.y}px, 0) scale(${zoom.s})`

  const image = (
    <BlurImage
      url={photo.url}
      src={cldImage(photo.url, 1600)}
      srcSet={srcSetFor(photo.url)}
      sizes="100vw"
      placeholder={previewSrc ?? undefined}
      alt={photo.caption || 'Travel photo'}
      draggable={false}
      className="h-full w-full"
      imgClassName="object-contain"
    />
  )

  return (
    <div
      ref={dialogRef}
      className="lightbox fixed inset-0 z-[60] select-none"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || 'Photo viewer'}
      onPointerMove={(e) => { if (e.pointerType === 'mouse') wake() }}
    >
      {/* Backdrop — lightens as a swipe-down drags the photo away. */}
      <div
        className="lightbox-backdrop absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
        style={{ opacity: 1 - dismissProgress }}
        aria-hidden="true"
      />

      {/* Stage: the photo and every gesture on it. */}
      <div
        ref={stageRef}
        className={`absolute inset-0 flex items-center justify-center px-3
                    sm:px-20 ${zoom.s > 1 ? 'cursor-grab' : ''}`}
        style={{
          paddingTop: PAD_TOP,
          paddingBottom: padBottom,
          touchAction: 'none',
          '--stage-h': `calc(100dvh - ${PAD_TOP + padBottom}px)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endGesture(e)}
        onPointerCancel={(e) => endGesture(e, true)}
      >
        <div
          key={index}
          className={`flex h-full w-full items-center justify-center ${
            shown.dir === 'next' ? 'lightbox-enter-next'
              : shown.dir === 'prev' ? 'lightbox-enter-prev' : ''
          }`}
        >
          <div
            ref={frameRef}
            className="relative"
            style={{
              viewTransitionName: 'lightbox-photo',
              transform,
              transition: gesturing ? 'none' : 'transform 250ms cubic-bezier(.2,.8,.2,1)',
              ...(aspect
                ? {
                    aspectRatio: aspect,
                    width: `min(100%, calc(var(--stage-h) * ${aspect}))`,
                  }
                : {}),
            }}
          >
            {aspect ? image : (
              <img
                src={previewSrc ?? cldImage(photo.url, 1600)}
                srcSet={previewSrc ? undefined : srcSetFor(photo.url)}
                sizes="100vw"
                alt={photo.caption || 'Travel photo'}
                draggable={false}
                className="block max-w-full object-contain"
                style={{ maxHeight: 'var(--stage-h)' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 flex
                       items-center justify-between gap-3 px-3 pt-3 sm:px-5
                       ${chromeClass}`}>
        <p className="rounded-full bg-black/30 px-3 py-1.5 text-xs font-medium
                      tabular-nums text-white/80 backdrop-blur-md"
           aria-live="polite">
          {index + 1} / {photos.length}
        </p>
        <div className="pointer-events-auto flex items-center gap-2">
          {canShowInfo && (
            <button
              type="button"
              onClick={() => setInfo((v) => !v)}
              aria-pressed={info}
              aria-label={info ? 'Hide camera details' : 'Show camera details'}
              title="Camera details (i)"
              className={`${roundButton} ${info ? 'bg-white/25 text-white' : ''}`}
            >
              <Icon d={INFO} />
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close photo viewer"
            title="Close (Esc)"
            className={roundButton}
          >
            <Icon d={CLOSE} />
          </button>
        </div>
      </div>

      {hasPrev && (
        <button
          type="button"
          onClick={() => step(index - 1)}
          aria-label="Previous photo"
          className={`${roundButton} absolute left-3 top-1/2 hidden
                      -translate-y-1/2 sm:left-5 sm:flex ${chromeClass}`}
        >
          <Icon d={PREV} />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={() => step(index + 1)}
          aria-label="Next photo"
          className={`${roundButton} absolute right-3 top-1/2 hidden
                      -translate-y-1/2 sm:right-5 sm:flex ${chromeClass}`}
        >
          <Icon d={NEXT} />
        </button>
      )}

      <div className={`pointer-events-none absolute inset-x-0 bottom-0
                       bg-gradient-to-t from-black/60 to-transparent pt-10
                       ${chromeClass}`}>
        {(caption || (info && canShowInfo)) && (
          <div className="mx-auto max-w-3xl px-4 pb-2 text-center">
            {caption && (
              <p className="text-sm text-white/90 drop-shadow">{caption}</p>
            )}
            {info && <CameraDetails photo={photo} />}
          </div>
        )}

        {showStrip && (
          <div
            ref={stripRef}
            className="no-scrollbar pointer-events-auto relative mx-auto flex
                       w-max max-w-full gap-1.5 overflow-x-auto px-4 pb-4 pt-1"
          >
            {photos.map((p, i) => (
              <button
                key={p.id ?? i}
                type="button"
                onClick={() => step(i)}
                aria-label={`Photo ${i + 1}${p.caption ? `: ${p.caption}` : ''}`}
                aria-current={i === index ? 'true' : undefined}
                className={`h-12 w-12 flex-none overflow-hidden rounded-md
                            transition-all duration-200 focus:outline-none
                            focus-visible:ring-2 focus-visible:ring-white ${
                  i === index
                    ? 'opacity-100 ring-2 ring-white'
                    : 'opacity-50 hover:opacity-90'
                }`}
              >
                <img
                  src={cldImage(p.url, 160)}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
