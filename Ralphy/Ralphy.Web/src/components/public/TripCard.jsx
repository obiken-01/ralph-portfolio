import { Link } from 'react-router-dom'
import { formatDateRange } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'

/**
 * Photo-forward trip card used on Home and Trips pages.
 * `featured` renders a larger 16:9 variant.
 */
export default function TripCard({ trip, featured = false }) {
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group block overflow-hidden rounded-2xl bg-white
                 ring-1 ring-slate-900/5 shadow-sm hover:shadow-xl
                 hover:-translate-y-1 transition-all duration-300"
    >
      <article>
        <div
          className={`relative overflow-hidden bg-slate-200
                      ${featured ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}
        >
          {trip.coverImageUrl ? (
            <img
              src={cldImage(trip.coverImageUrl, featured ? 1400 : 700)}
              alt={`${trip.title} — ${trip.city}, ${trip.country}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover
                         group-hover:scale-105 transition-transform
                         duration-700 ease-out"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center
                            bg-gradient-to-br from-teal-50 to-slate-200">
              <span className="text-5xl" aria-hidden="true">🗺️</span>
            </div>
          )}

          {/* Bottom gradient + location */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t
                          from-slate-950/80 via-slate-950/30 to-transparent
                          pt-16 pb-3 px-4">
            <p className="text-white/90 text-xs font-medium tracking-wide">
              📍 {trip.city}, {trip.country}
            </p>
          </div>
        </div>

        <div className={featured ? 'p-6' : 'p-5'}>
          <h3
            className={`font-display font-semibold text-slate-900
                        group-hover:text-teal-700 transition-colors
                        ${featured
                          ? 'text-2xl leading-snug'
                          : 'text-lg leading-snug line-clamp-2'}`}
          >
            {trip.title}
          </h3>

          <p className="mt-1.5 text-xs text-slate-400 font-medium">
            {formatDateRange(trip.startDate, trip.endDate)}
            <span className="mx-1.5" aria-hidden="true">·</span>
            {trip.postCount ?? 0} {trip.postCount === 1 ? 'story' : 'stories'}
          </p>

          {trip.description && (
            <p
              className={`mt-3 text-sm text-slate-500 leading-relaxed
                          ${featured ? 'line-clamp-3' : 'line-clamp-2'}`}
            >
              {trip.description}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

export function TripCardSkeleton({ featured = false }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1
                    ring-slate-900/5 animate-pulse">
      <div className={`bg-slate-200 ${featured ? 'aspect-[16/9]' : 'aspect-[4/3]'}`} />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
        <div className="h-3 w-full rounded bg-slate-100" />
      </div>
    </div>
  )
}
