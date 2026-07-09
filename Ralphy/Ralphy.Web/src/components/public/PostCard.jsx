import { Link } from 'react-router-dom'
import { formatShortDate, stripHtml, truncateText, readingTime } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'

/**
 * Blog-post card. Thumbnail comes from `post.thumbnailUrl` (list
 * endpoints) with a fallback to the first loaded photo.
 */
export default function PostCard({ post, tripId }) {
  const thumb = post.thumbnailUrl ?? post.photos?.[0]?.url
  const excerpt = truncateText(stripHtml(post.content), 110)
  const photoCount = post.photoCount ?? post.photos?.length ?? 0

  return (
    <Link
      to={`/trips/${tripId ?? post.tripId}/posts/${post.id}`}
      className="group block overflow-hidden rounded-2xl bg-white
                 ring-1 ring-slate-900/5 shadow-sm hover:shadow-xl
                 hover:-translate-y-1 transition-all duration-300"
    >
      <article className="flex h-full flex-col">
        <div className="relative aspect-[3/2] overflow-hidden bg-slate-200">
          {thumb ? (
            <img
              src={cldImage(thumb, 700)}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover group-hover:scale-105
                         transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center
                            bg-gradient-to-br from-amber-50 to-slate-200">
              <span className="text-4xl" aria-hidden="true">✍️</span>
            </div>
          )}

          {photoCount > 1 && (
            <span className="absolute top-3 right-3 rounded-full
                             bg-slate-950/60 px-2.5 py-1 text-xs
                             font-medium text-white backdrop-blur-sm">
              📷 {photoCount}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-medium text-slate-400">
            {formatShortDate(post.publishedAt)}
            <span className="mx-1.5" aria-hidden="true">·</span>
            {readingTime(post.content)} min read
          </p>

          <h3 className="mt-1.5 font-display text-lg font-semibold
                         leading-snug text-slate-900 line-clamp-2
                         group-hover:text-teal-700 transition-colors">
            {post.title}
          </h3>

          {excerpt && (
            <p className="mt-2 flex-1 text-sm leading-relaxed
                          text-slate-500 line-clamp-2">
              {excerpt}
            </p>
          )}

          <p className="mt-4 text-sm font-semibold text-teal-700">
            Read story
            <span className="inline-block transition-transform
                             group-hover:translate-x-1" aria-hidden="true">
              {' '}→
            </span>
          </p>
        </div>
      </article>
    </Link>
  )
}

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1
                    ring-slate-900/5 animate-pulse">
      <div className="aspect-[3/2] bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-1/3 rounded bg-slate-100" />
        <div className="h-5 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
      </div>
    </div>
  )
}
