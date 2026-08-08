import { Link } from 'react-router-dom'
import { formatShortDate, postDate } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'
import { bucketWidth } from '../../utils/justify'

/**
 * A tile in the justified feed.
 *
 * No card, no padding, no white footer — the photograph fills the space it was
 * given and the title sits on it. JustifiedGrid has already sized the wrapper
 * to the photo's real aspect ratio, so `object-cover` here crops nothing; it
 * only guards against sub-pixel rounding.
 */
export default function PostCard({ post, width }) {
  const thumb = post.thumbnailUrl ?? post.photos?.[0]?.url
  const photoCount = post.photoCount ?? post.photos?.length ?? 0
  const date = postDate(post)

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const requestWidth = bucketWidth(width || 800, dpr)

  return (
    <Link
      to={`/posts/${post.id}`}
      className="group relative block h-full w-full overflow-hidden rounded-sm
                 bg-slate-200 focus:outline-none focus-visible:ring-2
                 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
    >
      {thumb ? (
        <img
          src={cldImage(thumb, requestWidth)}
          alt={post.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform
                     duration-700 ease-out group-hover:scale-[1.03]
                     motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center
                        bg-gradient-to-br from-amber-50 to-slate-200">
          <span className="text-3xl" aria-hidden="true">📷</span>
        </div>
      )}

      {photoCount > 1 && (
        <span className="absolute right-2 top-2 rounded-full bg-slate-950/50
                         px-2 py-0.5 text-xs font-medium text-white
                         backdrop-blur-sm">
          {photoCount}
        </span>
      )}

      {/* Kept permanently visible rather than hover-only: hover doesn't exist
          on a phone, and an untitled wall of photos is hard to navigate. The
          gradient deepens on hover so the photo dominates at rest. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0
                      bg-gradient-to-t from-slate-950/80 via-slate-950/25
                      to-transparent p-3 pt-10 opacity-90 transition-opacity
                      duration-300 group-hover:opacity-100">
        <p className="truncate font-display text-sm font-semibold
                      leading-snug text-white drop-shadow-sm">
          {post.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/70">
          {post.locationName && !post.locationIsPlaceholder && (
            <span>{post.locationName}</span>
          )}
          {post.locationName && !post.locationIsPlaceholder && date && (
            <span className="mx-1" aria-hidden="true">·</span>
          )}
          {date && <time dateTime={date}>{formatShortDate(date)}</time>}
        </p>
      </div>
    </Link>
  )
}

export function PostCardSkeleton() {
  return (
    <div className="h-full w-full animate-pulse rounded-sm bg-slate-200" />
  )
}
