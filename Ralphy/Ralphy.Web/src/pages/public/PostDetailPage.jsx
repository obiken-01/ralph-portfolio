import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatDate, formatShortDate, stripHtml, readingTime } from '../../utils/helpers'
import { cldImage, cldVideo, cldVideoPoster } from '../../utils/cloudinary'
import Seo, { SITE_URL, AUTHOR_LD } from '../../components/common/Seo'
import Lightbox from '../../components/public/Lightbox'

// ── Breadcrumb ──────────────────────────────────────────────────
function Breadcrumb({ trip, postTitle }) {
  return (
    <nav aria-label="Breadcrumb"
         className="mb-8 flex flex-wrap items-center gap-1.5 text-xs
                    text-slate-400">
      <Link to="/" className="transition-colors hover:text-teal-700">Home</Link>
      <span aria-hidden="true">/</span>
      <Link to="/trips" className="transition-colors hover:text-teal-700">
        Trips
      </Link>
      {trip && (
        <>
          <span aria-hidden="true">/</span>
          <Link to={`/trips/${trip.id}`}
                className="max-w-[140px] truncate transition-colors
                           hover:text-teal-700">
            {trip.title}
          </Link>
        </>
      )}
      <span aria-hidden="true">/</span>
      <span className="max-w-[180px] truncate text-slate-600">{postTitle}</span>
    </nav>
  )
}

// ── Photo Gallery ───────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [activeTab, setActiveTab] = useState('all')
  const [lightboxIndex, setLightboxIndex] = useState(null)

  if (!photos?.length) return null

  const filtered = photos.filter((p) => {
    if (activeTab === 'drone') return p.source === 1
    if (activeTab === 'phone') return p.source === 0
    return true
  })

  const droneCount = photos.filter((p) => p.source === 1).length
  const phoneCount = photos.filter((p) => p.source === 0).length

  const tabs = [
    { key: 'all',   label: `All (${photos.length})` },
    ...(droneCount ? [{ key: 'drone', label: `🚁 Drone (${droneCount})` }] : []),
    ...(phoneCount ? [{ key: 'phone', label: `📱 Phone (${phoneCount})` }] : []),
  ]

  return (
    <section aria-labelledby="gallery-heading" className="mt-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="gallery-heading"
            className="font-display text-2xl font-semibold text-slate-900">
          Photo gallery
        </h2>

        {tabs.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist"
               aria-label="Filter photos by source">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold
                            transition-colors ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No photos for this filter.
        </p>
      ) : (
        /* Masonry-style columns preserve each photo's aspect ratio */
        <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
          {filtered.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(i)}
              className="group relative block w-full overflow-hidden
                         rounded-xl bg-slate-100 focus:outline-none
                         focus:ring-2 focus:ring-teal-500"
              aria-label={photo.caption || 'Open photo'}
            >
              <img
                src={cldImage(photo.url, 700)}
                alt={photo.caption ||
                     (photo.source === 1 ? 'Drone photo' : 'Phone photo')}
                loading="lazy"
                decoding="async"
                className="w-full transition-transform duration-500
                           group-hover:scale-[1.03]"
              />
              <span
                className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5
                            text-xs font-medium text-white backdrop-blur-sm ${
                  photo.source === 1 ? 'bg-sky-600/80' : 'bg-emerald-600/80'
                }`}
                aria-hidden="true"
              >
                {photo.source === 1 ? '🚁' : '📱'}
              </span>
              {photo.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t
                                 from-black/70 to-transparent p-2.5 pt-8
                                 text-left text-xs text-white opacity-0
                                 transition-opacity group-hover:opacity-100">
                  {photo.caption}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
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
    <section aria-labelledby="videos-heading" className="mt-14">
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
            <figcaption className="flex items-center justify-between gap-3
                                   px-5 py-4">
              <span className="flex-1 text-sm text-slate-600">
                {video.caption || 'Trip footage'}
              </span>
              <span
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs
                            font-semibold ${
                  video.source === 1
                    ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                }`}
              >
                {video.source === 1 ? '🚁 Drone' : '📱 Phone'}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

// ── Part of trip banner ─────────────────────────────────────────
function TripBanner({ trip }) {
  if (!trip) return null

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group mt-14 flex items-center gap-4 rounded-2xl bg-white
                 p-5 ring-1 ring-slate-900/5 transition-shadow
                 hover:shadow-lg"
    >
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl
                      bg-slate-100">
        {trip.coverImageUrl ? (
          <img src={cldImage(trip.coverImageUrl, 200)} alt=""
               loading="lazy"
               className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl" aria-hidden="true">🗺️</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest
                      text-teal-700">
          Part of the trip
        </p>
        <p className="mt-0.5 truncate font-display text-lg font-semibold
                      text-slate-900 group-hover:text-teal-700
                      transition-colors">
          {trip.title}
        </p>
        <p className="text-xs text-slate-400">
          {trip.city}, {trip.country}
        </p>
      </div>
      <span className="text-teal-700 transition-transform
                       group-hover:translate-x-1" aria-hidden="true">
        →
      </span>
    </Link>
  )
}

// ── Comments ────────────────────────────────────────────────────
function Comments({ postId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({
    authorName: '', authorEmail: '', content: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

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
  const { tripId, postId } = useParams()

  const [post, setPost]     = useState(null)
  const [trip, setTrip]     = useState(null)
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [postRes, tripRes, photosRes, videosRes] = await Promise.all([
          api.get(`/posts/${postId}`),
          api.get(`/trips/${tripId}`),
          api.get(`/photos/post/${postId}`),
          api.get(`/videos/post/${postId}`),
        ])
        setPost(postRes.data.data)
        setTrip(tripRes.data.data)
        setPhotos(photosRes.data.data ?? [])
        setVideos(videosRes.data.data ?? [])
      } catch {
        setError('Post not found.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [tripId, postId])

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
        <span className="text-5xl" aria-hidden="true">✍️</span>
        <h1 className="font-display text-xl font-bold text-slate-700">
          Post not found
        </h1>
        <Link to="/trips" className="text-sm text-teal-700 hover:underline">
          ← Back to Trips
        </Link>
      </div>
    )
  }

  const cover = photos[0]
  const minutes = readingTime(post.content)
  const description = stripHtml(post.content).slice(0, 160)

  return (
    <div className="min-h-screen">
      <Seo
        title={post.title}
        description={description}
        image={cover?.url ?? trip?.coverImageUrl}
        type="article"
        path={`/trips/${tripId}/posts/${post.id}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description,
          datePublished: post.publishedAt,
          author: AUTHOR_LD,
          image: photos.slice(0, 3).map((p) => p.url),
          mainEntityOfPage:
            `${SITE_URL}/trips/${tripId}/posts/${post.id}`,
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb trip={trip} postTitle={post.title} />

        <article>
          {/* Header */}
          <header className="mb-8 text-center">
            {trip && (
              <p className="mb-4 text-xs font-semibold uppercase
                            tracking-[0.2em] text-teal-700">
                {trip.city}, {trip.country}
              </p>
            )}
            <h1 className="font-display text-3xl font-semibold leading-tight
                           text-slate-900 sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-5 text-sm text-slate-400">
              <time dateTime={post.publishedAt}>
                {formatDate(post.publishedAt)}
              </time>
              <span className="mx-2" aria-hidden="true">·</span>
              {minutes} min read
              {post.viewCount > 0 && (
                <>
                  <span className="mx-2" aria-hidden="true">·</span>
                  {post.viewCount} views
                </>
              )}
            </p>

            {post.postTags?.length > 0 && (
              <ul className="mt-4 flex flex-wrap justify-center gap-2">
                {post.postTags.map((pt) => (
                  <li key={pt.tagId}
                      className="rounded-full bg-teal-50 px-3 py-1 text-xs
                                 font-medium text-teal-700 ring-1
                                 ring-teal-100">
                    #{pt.tag?.name}
                  </li>
                ))}
              </ul>
            )}
          </header>

          {/* Cover image */}
          {cover && (
            <figure className="mb-10 overflow-hidden rounded-3xl">
              <img
                src={cldImage(cover.url, 1400)}
                alt={cover.caption || post.title}
                fetchPriority="high"
                className="w-full object-cover"
              />
              {cover.caption && (
                <figcaption className="mt-2 text-center text-xs
                                       text-slate-400">
                  {cover.caption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Rich text content */}
          <div
            className="prose prose-slate prose-lg mx-auto max-w-3xl
                       prose-headings:font-display
                       prose-headings:font-semibold
                       prose-a:text-teal-700 prose-img:rounded-2xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* Galleries — skip cover photo in the grid when few photos */}
        <PhotoGallery photos={photos} />
        <VideoGallery videos={videos} />

        <TripBanner trip={trip} />

        {/* Share */}
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

        <Comments postId={postId} />
      </div>
    </div>
  )
}
