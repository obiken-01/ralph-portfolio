import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cldImage } from '../../utils/cloudinary'

const ADVANCE_MS = 6500

/**
 * Rotating full-bleed photographs behind the home page masthead.
 *
 * Replaces a static hero.jpg that never changed. The photos are drawn at
 * random from the whole published library, so the front page is different on
 * every visit and every photograph gets a turn — not just the ones that happen
 * to be a post's cover.
 *
 * Every slide is a crossfade between two stacked layers rather than a
 * transform, so a slow connection shows the previous photo until the next has
 * actually decoded instead of flashing empty.
 */
export default function HeroSlideshow({ photos = [], children, footer }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  // 0 is shown immediately; 1 is warmed so the first advance is instant.
  const [loaded, setLoaded] = useState(() => new Set([0, 1]))
  const reduceMotion = useRef(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotion.current = query.matches

    const onChange = (e) => { reduceMotion.current = e.matches }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const go = useCallback((next) => {
    if (photos.length === 0) return
    const target = (next + photos.length) % photos.length
    setIndex(target)
    // Warm the neighbour so the next advance is instant.
    setLoaded((prev) => new Set(prev).add((target + 1) % photos.length))
  }, [photos.length])

  // Auto-advance. Stopped entirely under reduced-motion — an unstoppable
  // carousel is exactly what that preference is asking us not to do.
  useEffect(() => {
    if (paused || photos.length < 2 || reduceMotion.current) return

    const timer = setTimeout(() => go(index + 1), ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [index, paused, photos.length, go])

  const current = photos[index]

  return (
    <section
      className="relative flex min-h-[92vh] flex-col overflow-hidden bg-slate-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Recent photographs"
    >
      {/* Layers */}
      {photos.map((photo, i) => (
        <img
          key={photo.id}
          src={loaded.has(i) || i === index ? cldImage(photo.url, 2000) : undefined}
          alt=""
          aria-hidden="true"
          fetchPriority={i === 0 ? 'high' : 'auto'}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover
                      transition-opacity duration-1000 ease-in-out
                      motion-reduce:transition-none ${
            i === index ? 'opacity-[0.72]' : 'opacity-0'
          }`}
        />
      ))}

      {photos.length === 0 && (
        <img
          src="/hero.jpg"
          alt="Aerial view of Occidental Mindoro"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.72]"
        />
      )}

      {/* Two scrims doing different jobs. The vertical one seats the photo
          into the page top and bottom; the radial one sits under the masthead
          so the headline stays readable over a bright sky or a white beach
          without having to dim the whole photograph to match the worst case. */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70
                      via-slate-950/10 to-slate-950" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 42%, ' +
            'rgba(2,6,15,.72) 0%, rgba(2,6,15,.45) 45%, transparent 78%)',
        }}
      />

      {/* Masthead — supplied by the page so this component stays about photos */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-1 flex-col
                      items-center justify-center px-4 text-center">
        {children}
      </div>

      {footer && (
        <div className="relative z-10 border-t border-white/10">{footer}</div>
      )}

      {/* Which photograph you're looking at, and where it came from */}
      {current && (
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap
                        items-center justify-between gap-3 px-4 pb-4 sm:px-6">
          <Link
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

          {photos.length > 1 && (
            <div className="flex items-center gap-1.5" role="tablist"
                 aria-label="Choose a photograph">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Photograph ${i + 1} of ${photos.length}`}
                  onClick={() => go(i)}
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
