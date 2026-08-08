import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatDate, formatShortDate, stripHtml, truncateText } from '../../utils/helpers'
import { cldImage, cldVideo, cldVideoPoster } from '../../utils/cloudinary'
import Seo, { SITE_URL, AUTHOR_LD } from '../../components/common/Seo'
import Lightbox from '../../components/public/Lightbox'
import TagChips from '../../components/public/TagChips'

// ── Breadcrumb ──────────────────────────────────────────────────
function Breadcrumb({ postTitle }) {
  return (
    <nav aria-label="Breadcrumb"
         className="mb-8 flex flex-wrap items-center gap-1.5 text-xs
                    text-slate-400">
      <Link to="/" className="transition-colors hover:text-teal-700">Home</Link>
      <span aria-hidden="true">/</span>
      <Link to="/posts" className="transition-colors hover:text-teal-700">
        Photos
      </Link>
      <span aria-hidden="true">/</span>
      <span className="max-w-[180px] truncate text-slate-600">{postTitle}</span>
    </nav>
  )
}

// ── Photo Gallery ───────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  if (!photos?.length) return null

  return (
    <section aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="sr-only">Photo gallery</h2>

      {/* Masonry columns preserve each photo's own aspect ratio */}
      <div className="columns-1 gap-3 sm:columns-2 [&>*]:mb-3">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(i)}
            className="group relative block w-full overflow-hidden rounded-xl
                       bg-slate-100 focus:outline-none focus:ring-2
                       focus:ring-teal-500"
            aria-label={photo.caption || `Open photo ${i + 1}`}
          >
            <img
              src={cldImage(photo.url, 1000)}
              alt={photo.caption || ''}
              loading={i < 2 ? 'eager' : 'lazy'}
              decoding="async"
              width={photo.width || undefined}
              height={photo.height || undefined}
              className="w-full transition-transform duration-500
                         group-hover:scale-[1.02]"
            />
            {photo.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t
                               from-black/70 to-transparent p-3 pt-10
                               text-left text-xs text-white opacity-0
                               transition-opacity group-hover:opacity-100">
                {photo.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </section>
  )
}

// ── Video Gallery ───────────────────────────────────────────────
function VideoGallery({ videos }) {
  if (!videos?.length) return null

  return (
    <section aria-labelledby="videos-heading" className="mt-12">
      <h2 id="videos-heading"
          className="mb-6 font-display text-2xl font-semibold text-slate-900">
        Videos
        <span className="ml-2 align-middle text-sm font-normal text-slate-400">
          ({videos.length})
        </span>
      </h2>

      <div className="space-y-8">
        {videos.map((video) => (
          <figure key={video.id}
                  className="overflow-hidden rounded-2xl bg-white ring-1
                             ring-slate-900/5">
            <video
              src={cldVideo(video.url)}
              poster={cldVideoPoster(video.url) ?? undefined}
              controls
              preload="none"
              playsInline
              className="aspect-video w-full bg-slate-950 object-contain"
            />
            {video.caption && (
              <figcaption className="px-5 py-4 text-sm text-slate-600">
                {video.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}

// ── Location card ───────────────────────────────────────────────
function LocationCard({ post }) {
  // A post still sitting on the placeholder is mid-cleanup — showing
  // "West Philippine Sea" to a reader would be worse than showing nothing.
  if (!post.locationName || post.locationIsPlaceholder) return null

  return (
    <Link
      to="/map"
      className="group mt-12 flex items-center gap-4 rounded-2xl bg-white p-5
                 ring-1 ring-slate-900/5 transition-shadow hover:shadow-lg"
    >
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center
                       rounded-xl bg-teal-50 text-xl" aria-hidden="true">
        📍
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest
                      text-teal-700">
          Shot at
        </p>
        <p className="mt-0.5 truncate font-display text-lg font-semibold
                      text-slate-900 transition-colors group-hover:text-teal-700">
          {post.locationName}
        </p>
        {post.latitude != null && post.longitude != null && (
          <p className="font-mono text-xs text-slate-400">
            {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
          </p>
        )}
      </div>
      <span className="text-teal-700 transition-transform
                       group-hover:translate-x-1" aria-hidden="true">→</span>
    </Link>
  )
}

// ── Comments ────────────────────────────────────────────────────
function Comments({ postId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    authorName: '', authorEmail: '', content: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.get(`/comments/post/${postId}`)
      .then((res) => setComments(res.data.data ?? []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [postId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post(`/comments/post/${postId}`, form)
      setSubmitted(true)
      setForm({ authorName: '', authorEmail: '', content: '' })
      const res = await api.get(`/comments/post/${postId}`)
      setComments(res.data.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    `rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base
     sm:text-sm text-slate-700 placeholder-slate-400 transition
     focus:border-transparent focus:outline-none focus:ring-2
     focus:ring-teal-500`

  return (
    <section aria-labelledby="comments-heading" className="mt-14">
      <h2 id="comments-heading"
          className="mb-6 font-display text-2xl font-semibold text-slate-900">
        Comments
        <span className="ml-2 align-middle text-sm font-normal text-slate-400">
          ({comments.length})
        </span>
      </h2>

      {loading ? (
        <div className="mb-8 space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex animate-pulse gap-3">
              <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="mb-8 text-sm text-slate-400">
          No comments yet — be the first!
        </p>
      ) : (
        <ul className="mb-10 space-y-5">
          {comments.map((comment) => (
            <li key={comment.id}
                className="flex gap-3 border-b border-slate-100 pb-5
                           last:border-0 last:pb-0">
              <span className="flex h-9 w-9 flex-shrink-0 items-center
                               justify-center rounded-full bg-teal-50 text-sm
                               font-semibold text-teal-700 ring-1
                               ring-teal-100">
                {comment.authorName?.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatShortDate(comment.createdAt)}
                  </span>
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {submitted ? (
        <div className="rounded-2xl bg-emerald-50 p-5 text-center ring-1
                        ring-emerald-100">
          <p className="text-sm font-semibold text-emerald-700">
            ✅ Comment submitted — thank you!
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-1 text-xs text-emerald-600 hover:underline"
          >
            Leave another comment
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}
              className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">
            Leave a comment
          </h3>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Your name"
              aria-label="Your name"
              value={form.authorName}
              onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              required
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Your email"
              aria-label="Your email"
              value={form.authorEmail}
              onChange={(e) => setForm({ ...form, authorEmail: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Write a comment..."
            aria-label="Comment"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
            rows={3}
            maxLength={1000}
            className={`${inputClass} w-full resize-none`}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {form.content.length}/1000
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-full bg-teal-600
                         px-6 py-2.5 text-sm font-semibold text-white
                         transition-colors hover:bg-teal-500
                         disabled:bg-teal-400"
            >
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full
                                   border-2 border-white border-t-transparent" />
                  Posting...
                </>
              ) : 'Post comment'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function PostDetailPage() {
  const { id } = useParams()

  const [post, setPost] = useState(null)
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [postRes, photosRes, videosRes] = await Promise.all([
          api.get(`/posts/${id}`),
          api.get(`/photos/post/${id}`),
          api.get(`/videos/post/${id}`),
        ])
        setPost(postRes.data.data)
        setPhotos(photosRes.data.data ?? [])
        setVideos(videosRes.data.data ?? [])
      } catch {
        setError('Post not found.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4
                        border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center
                      justify-center gap-4">
        <span className="text-5xl" aria-hidden="true">📷</span>
        <h1 className="font-display text-xl font-bold text-slate-700">
          Post not found
        </h1>
        <Link to="/posts" className="text-sm text-teal-700 hover:underline">
          ← Back to Photos
        </Link>
      </div>
    )
  }

  const cover = photos[0]
  const date = post.takenAt ?? post.publishedAt

  // With content optional, fall back to the place and the date rather than
  // shipping an empty meta description.
  const description = post.content
    ? truncateText(stripHtml(post.content), 160)
    : [post.locationName, date && formatDate(date)].filter(Boolean).join(' · ')
      || post.title

  return (
    <div className="min-h-screen">
      <Seo
        title={post.title}
        description={description}
        image={cover?.url}
        type="article"
        path={`/posts/${post.id}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description,
          datePublished: post.publishedAt,
          author: AUTHOR_LD,
          image: photos.slice(0, 3).map((p) => p.url),
          mainEntityOfPage: `${SITE_URL}/posts/${post.id}`,
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb postTitle={post.title} />

        <article>
          <header className="mb-8 text-center">
            {post.locationName && !post.locationIsPlaceholder && (
              <p className="mb-4 text-xs font-semibold uppercase
                            tracking-[0.2em] text-teal-700">
                {post.locationName}
              </p>
            )}
            <h1 className="font-display text-3xl font-semibold leading-tight
                           text-slate-900 sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-5 text-sm text-slate-400">
              {date && (
                <time dateTime={date}>{formatDate(date)}</time>
              )}
              {photos.length > 0 && (
                <>
                  <span className="mx-2" aria-hidden="true">·</span>
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                </>
              )}
              {post.viewCount > 0 && (
                <>
                  <span className="mx-2" aria-hidden="true">·</span>
                  {post.viewCount} views
                </>
              )}
            </p>

            {post.tags?.length > 0 && (
              <TagChips tags={post.tags} className="mt-4 justify-center" />
            )}
          </header>

          {/* Photos lead. Words, if there are any, come after. */}
          <PhotoGallery photos={photos} />

          {post.content && (
            <div
              className="prose prose-slate prose-lg mx-auto mt-12 max-w-3xl
                         prose-headings:font-display
                         prose-headings:font-semibold
                         prose-a:text-teal-700 prose-img:rounded-2xl"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}
        </article>

        <VideoGallery videos={videos} />

        <LocationCard post={post} />

        <div className="mt-10 flex items-center justify-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest
                           text-slate-400">
            Share
          </span>
          <a
            href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
            target="_blank" rel="noopener noreferrer"
            className="rounded-full bg-slate-900 px-5 py-2 text-xs
                       font-semibold text-white transition-opacity
                       hover:opacity-85"
          >
            Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
            target="_blank" rel="noopener noreferrer"
            className="rounded-full border border-slate-200 px-5 py-2 text-xs
                       font-semibold text-slate-700 transition-colors
                       hover:border-teal-600 hover:text-teal-700"
          >
            X / Twitter
          </a>
        </div>

        <Comments postId={id} />
      </div>
    </div>
  )
}
