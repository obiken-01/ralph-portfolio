import { Link } from 'react-router-dom'
import { formatShortDate } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'

/**
 * Image-led card for the photo feed.
 *
 * The old card led with a 3:2 crop, then date · reading time, then a two-line
 * excerpt. On a photo-first site the excerpt and the reading time are noise —
 * and with Content optional in v2.0, `readingTime(null)` cheerfully returns
 * "1 min read" for a post with no words at all. Both are gone.
 *
 * The photo renders at its own aspect ratio (Width/Height from the API), so
 * nothing crops and nothing shifts as images decode.
 */
export default function PostCard({ post }) {
  const thumb = post.thumbnailUrl ?? post.photos?.[0]?.url
  const photoCount = post.photoCount ?? post.photos?.length ?? 0
  const width = post.thumbnailWidth ?? post.photos?.[0]?.width
  const height = post.thumbnailHeight ?? post.photos?.[0]?.height

  // TakenAt is when the shutter fired; PublishedAt is when it got written up.
  // On a photo feed the first is the truer date.
  const date = post.takenAt ?? post.publishedAt

  return (
    <Link
      to={`/posts/${post.id}`}
      className="group mb-4 block break-inside-avoid overflow-hidden rounded-2xl
                 bg-white shadow-sm ring-1 ring-slate-900/5 transition-all
                 duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <article>
        <div
          className="relative overflow-hidden bg-slate-200"
          style={{
            aspectRatio: width && height ? `${width} / ${height}` : '3 / 2',
          }}
        >
          {thumb ? (
            <img
              src={cldImage(thumb, 700)}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform
                         duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center
                            bg-gradient-to-br from-amber-50 to-slate-200">
              <span className="text-4xl" aria-hidden="true">📷</span>
            </div>
          )}

          {photoCount > 1 && (
            <span className="absolute right-3 top-3 rounded-full bg-slate-950/60
                             px-2.5 py-1 text-xs font-medium text-white
                             backdrop-blur-sm">
              {photoCount} photos
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-display text-base font-semibold leading-snug
                         text-slate-900 transition-colors line-clamp-2
                         group-hover:text-teal-700">
            {post.title}
          </h3>

          <p className="mt-1.5 text-xs text-slate-400">
            {post.locationName && (
              <>
                <span className="text-slate-500">{post.locationName}</span>
                {date && <span className="mx-1.5" aria-hidden="true">·</span>}
              </>
            )}
            {date && (
              <time dateTime={date}>{formatShortDate(date)}</time>
            )}
          </p>

          {post.tags?.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1">
              {post.tags.slice(0, 3).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-teal-50 px-2 py-0.5 text-xs
                             font-medium text-teal-700"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </Link>
  )
}

export function PostCardSkeleton() {
  return (
    <div className="mb-4 break-inside-avoid animate-pulse overflow-hidden
                    rounded-2xl bg-white ring-1 ring-slate-900/5">
      <div className="aspect-[3/2] bg-slate-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
      </div>
    </div>
  )
}
