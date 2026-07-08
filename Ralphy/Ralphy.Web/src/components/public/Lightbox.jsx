import { useCallback, useEffect } from 'react'
import { cldImage } from '../../utils/cloudinary'

/**
 * Full-screen photo lightbox with prev/next arrows, keyboard
 * navigation (Esc / ← / →) and a position counter.
 *
 * @param photos  array of { url, caption, source }
 * @param index   index of the open photo
 * @param onClose () => void
 * @param onNavigate (newIndex) => void
 */
export default function Lightbox({ photos, index, onClose, onNavigate }) {
  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1)
    },
    [index, hasPrev, hasNext, onClose, onNavigate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-slate-950/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || 'Photo viewer'}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close photo viewer"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center
                   justify-center rounded-full bg-white/10 text-xl text-white
                   hover:bg-white/20 transition-colors"
      >
        ×
      </button>

      {/* Counter */}
      <p className="absolute top-6 left-1/2 -translate-x-1/2 text-sm
                    font-medium text-white/60">
        {index + 1} / {photos.length}
      </p>

      {/* Prev / Next */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
          aria-label="Previous photo"
          className="absolute left-3 sm:left-6 z-10 flex h-11 w-11
                     items-center justify-center rounded-full bg-white/10
                     text-white hover:bg-white/20 transition-colors"
        >
          ←
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
          aria-label="Next photo"
          className="absolute right-3 sm:right-6 z-10 flex h-11 w-11
                     items-center justify-center rounded-full bg-white/10
                     text-white hover:bg-white/20 transition-colors"
        >
          →
        </button>
      )}

      {/* Image */}
      <figure
        className="max-h-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={cldImage(photo.url, 1600)}
          alt={photo.caption || 'Travel photo'}
          className="mx-auto max-h-[82vh] max-w-full rounded-lg
                     object-contain"
        />
        <figcaption className="mt-3 flex items-center justify-center gap-2
                               text-center text-sm text-white/80">
          <span aria-hidden="true">
            {photo.source === 1 ? '🚁' : '📱'}
          </span>
          {photo.caption || (photo.source === 1 ? 'Drone shot' : 'Phone shot')}
        </figcaption>
      </figure>
    </div>
  )
}
