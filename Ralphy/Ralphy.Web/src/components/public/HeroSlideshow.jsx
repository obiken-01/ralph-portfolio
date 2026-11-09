import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cldImage } from '../../utils/cloudinary'

// Long enough to actually look at a landscape before it moves on.
const ADVANCE_MS = 5500

// A slow dissolve; each photo also drifts in slightly (the `kenburns` class)
// for the whole time it's on screen, fade-out included.
const FADE_MS = 1200

/**
 * Rotating full-bleed photographs behind the home page masthead.
 *
 * Photos are drawn at random from the whole published library, so the front
 * page differs on every visit and every photograph gets a turn — not just the
 * ones that happen to be a post's cover.
 *
 * Slides crossfade between stacked layers rather than transforming, so the
 * outgoing photo stays put while the next one fades in over it.
 */
export default function HeroSlideshow({ photos = [], children, footer }) {
  // `previous` is the slide currently fading out.
  const [{ index, previous }, setSlide] = useState({ index: 0, previous: null })
  const setIndex = useCallback((update) => {
    setSlide((slide) => {
      const next = typeof update === 'function' ? update(slide.index) : update
      return next === slide.index ? slide : { index: next, previous: slide.index }
    })
  }, [])
  const [paused, setPaused] = useState(false)
  const reduceMotion = useRef(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotion.current = query.matches

    const onChange = (e) => { reduceMotion.current = e.matches }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const step = useCallback((delta) => {
    setIndex((current) =>
      photos.length === 0
        ? current
        : ((current + delta) % photos.length + photos.length) % photos.length)
  }, [photos.length, setIndex])

  const goTo = useCallback((target) => {
    if (photos.length === 0) return
    setIndex(((target % photos.length) + photos.length) % photos.length)
  }, [photos.length, setIndex])

  // setTimeout keyed on `index`, not setInterval. An interval keeps its own
  // cadence, so pressing next could be followed 100ms later by an automatic
  // advance and the slideshow would appear to jump two. Restarting the clock
  // on every index change — however it changed — gives each photo its full
  // turn after a manual step.
  //
  // Advancing unconditionally, without tracking which images have decoded:
  // every slide carries its src from first render so the browser fetches them
  // in parallel, and skip-the-unloaded logic turned out to cost more than it
  // saved. A cached image can finish before React attaches onLoad, so it never
  // gets marked ready, gets skipped forever, and if nothing qualifies the
  // timeout never reschedules and the slideshow stops dead.
  useEffect(() => {
    if (paused || photos.length < 2 || reduceMotion.current) return

    const timer = setTimeout(() => step(1), ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [index, paused, photos.length, step])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  }

  const current = photos[index]
  const hasControls = photos.length > 1

  const arrowClass =
    'absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center '
    + 'justify-center rounded-full border border-white/25 bg-slate-950/35 '
    + 'text-white/80 backdrop-blur-sm transition-colors hover:bg-slate-950/60 '
    + 'hover:text-white focus:outline-none focus-visible:ring-2 '
    + 'focus-visible:ring-white sm:h-11 sm:w-11'

  return (
    <section
      className="relative flex min-h-[calc(100svh-4rem)] flex-col sm:min-h-[92vh] overflow-hidden bg-slate-950"
      // Deliberately no pause on hover. This section fills the viewport, so the
      // pointer sits over it almost permanently — hover-pause meant the
      // slideshow simply never advanced. Focus still pauses, which is the case
      // that actually matters: someone tabbing through the controls.
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
      aria-roledescription="carousel"
      aria-label="Recent photographs"
    >
      {/* `drift`: the photos scroll a little slower than the page. */}
      <div className="drift absolute inset-0" aria-hidden="true">
        {photos.map((photo, i) => (
          <img
            key={photo.id}
            src={cldImage(photo.url, 1800)}
            alt=""
            fetchPriority={i === 0 ? 'high' : 'auto'}
            decoding="async"
            style={{
              transitionDuration: `${FADE_MS}ms`,
              '--kenburns-ms': `${ADVANCE_MS + FADE_MS * 2}ms`,
            }}
            className={`absolute inset-0 h-full w-full object-cover
                        transition-opacity ease-in-out
                        motion-reduce:transition-none ${
              i === index ? 'opacity-100' : 'opacity-0'
            } ${
              // The outgoing photo keeps its zoom running while it fades,
              // rather than snapping back to scale(1) mid-dissolve.
              (i === index || i === previous) && photos.length > 1 ? 'kenburns' : ''
            }`}
          />
        ))}
      </div>

      {photos.length === 0 && (
        <img
          src="/hero.jpg"
          alt="Aerial view of Occidental Mindoro"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Only top and bottom are darkened — enough for the nav edge and the
          masthead anchored bottom-left. The sides stay clear so the photograph
          is what you see. */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40
                      via-transparent to-slate-950/80" />

      {hasControls && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous photograph"
            className={`${arrowClass} left-3 sm:left-5`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor"
                 strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next photograph"
            className={`${arrowClass} right-3 sm:right-5`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor"
                 strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Masthead — supplied by the page so this component stays about photos.
          Bottom-left, clear of the arrows at mid-height. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[100rem] flex-1
                      items-end px-5 pb-3 sm:px-10 lg:px-14">
        <div className="max-w-xs text-left sm:max-w-sm md:max-w-md">
          {children}
        </div>
      </div>

      {footer && (
        <div className="relative z-10 border-t border-white/10">{footer}</div>
      )}

      {current && (
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap
                        items-center justify-between gap-3 px-4 pb-4 sm:px-6">
          <Link viewTransition
            to={`/posts/${current.postId}`}
            className="group max-w-full truncate rounded-full bg-white/10 px-4
                       py-2 text-xs text-white/80 backdrop-blur-sm
                       transition-colors hover:bg-white/20 hover:text-white
                       focus:outline-none focus-visible:ring-2
                       focus-visible:ring-white/70"
          >
            <span className="font-medium">
              {current.caption || current.postTitle}
            </span>
            {current.locationName && (
              <span className="text-white/55"> · {current.locationName}</span>
            )}
            <span className="ml-1 inline-block transition-transform
                             group-hover:translate-x-0.5" aria-hidden="true">→</span>
          </Link>

          {hasControls && (
            <div className="flex items-center gap-1.5" role="tablist"
                 aria-label="Choose a photograph">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Photograph ${i + 1} of ${photos.length}`}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300
                              focus:outline-none focus-visible:ring-2
                              focus-visible:ring-white/70 ${
                    i === index
                      ? 'w-6 bg-white'
                      : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
