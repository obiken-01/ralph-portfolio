import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatShortDate } from '../../utils/helpers'

// ── Breadcrumb ──────────────────────────────────────────────────
function Breadcrumb({ trip, postTitle }) {
  return (
    <nav className="text-xs text-slate-400 mb-6 flex items-center gap-1.5
                    flex-wrap">
      <Link to="/" className="hover:text-blue-600 transition-colors">
        Home
      </Link>
      <span>/</span>
      <Link to="/trips" className="hover:text-blue-600 transition-colors">
        Trips
      </Link>
      <span>/</span>
      {trip && (
        <>
          <Link to={`/trips/${trip.id}`}
                className="hover:text-blue-600 transition-colors truncate
                           max-w-[120px]">
            {trip.title}
          </Link>
          <span>/</span>
        </>
      )}
      <span className="text-slate-600 truncate max-w-[160px]">
        {postTitle}
      </span>
    </nav>
  )
}

// ── Photo Gallery ───────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [activeTab, setActiveTab] = useState('all')
  const [lightbox, setLightbox]   = useState(null)

  if (!photos?.length) return null

  const filtered = photos.filter((p) => {
    if (activeTab === 'drone') return p.source === 1
    if (activeTab === 'phone') return p.source === 0
    return true
  })

  const tabs = [
    { key: 'all',   label: `All (${photos.length})`                              },
    { key: 'drone', label: `🚁 Drone (${photos.filter(p => p.source === 1).length})` },
    { key: 'phone', label: `📱 Phone (${photos.filter(p => p.source === 0).length})` },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-900 mb-4">Photos</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">
          No photos for this filter.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filtered.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="group relative aspect-square rounded-lg overflow-hidden
                         bg-slate-100 hover:opacity-90 transition-opacity"
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover group-hover:scale-105
                           transition-transform duration-300"
              />
              {/* Source badge */}
              <div className="absolute bottom-1.5 right-1.5">
                <span className={`text-white text-xs px-1.5 py-0.5 rounded
                                  font-medium ${
                  photo.source === 1
                    ? 'bg-blue-600/80'
                    : 'bg-green-600/80'
                }`}>
                  {photo.source === 1 ? '🚁' : '📱'}
                </span>
              </div>
              {/* Caption overlay */}
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t
                                from-black/60 to-transparent p-2 opacity-0
                                group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs line-clamp-1">
                    {photo.caption}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center
                     justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-full"
               onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.url}
              alt={lightbox.caption || 'Photo'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {lightbox.caption && (
              <p className="text-white text-sm text-center mt-3">
                {lightbox.caption}
              </p>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-4 -right-4 w-8 h-8 bg-white/20
                         hover:bg-white/30 rounded-full text-white text-lg
                         flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Video Gallery ───────────────────────────────────────────────
function VideoGallery({ videos }) {
  if (!videos?.length) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-900 mb-4">
        Videos
        <span className="ml-2 text-xs font-normal text-slate-400">
          ({videos.length})
        </span>
      </h2>

      <div className="space-y-4">
        {videos.map((video) => (
          <div key={video.id}
               className="rounded-xl overflow-hidden border border-slate-100
                          bg-slate-50">
            {/* Video player */}
            <video
              src={video.url}
              controls
              className="w-full max-h-96 bg-slate-900 rounded-t-xl"
              preload="metadata"
            />

            {/* Caption + source badge */}
            {(video.caption || video.source !== undefined) && (
              <div className="px-4 py-3 flex items-center
                              justify-between gap-3">
                {video.caption && (
                  <p className="text-sm text-slate-600 flex-1">
                    {video.caption}
                  </p>
                )}
                <span className={`flex-shrink-0 text-xs font-medium px-2.5
                                  py-1 rounded-full ${
                  video.source === 1
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : 'bg-green-50 text-green-600 border border-green-100'
                }`}>
                  {video.source === 1 ? '🚁 Drone' : '📱 Phone'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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
      // Refresh comments
      const res = await api.get(`/comments/post/${postId}`)
      setComments(res.data.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-900 mb-5">
        Comments
        <span className="ml-2 text-xs font-normal text-slate-400">
          ({comments.length})
        </span>
      </h2>

      {/* Comment list */}
      {loading ? (
        <div className="space-y-3 mb-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-slate-400 text-sm mb-6">
          No comments yet — be the first!
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id}
                 className="flex gap-3 pb-4 border-b border-slate-100
                            last:border-0 last:pb-0">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center
                              justify-center flex-shrink-0 text-blue-600 text-xs
                              font-semibold">
                {comment.authorName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-800">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatShortDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment form */}
      {submitted ? (
        <div className="bg-green-50 border border-green-100 rounded-lg p-4
                        text-center">
          <p className="text-green-700 text-sm font-medium">
            ✅ Comment submitted! Thank you.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="text-green-600 text-xs mt-1 hover:underline"
          >
            Leave another comment
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 border-t
                                                  border-slate-100 pt-5">
          <h3 className="text-sm font-medium text-slate-700">
            Leave a comment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={form.authorName}
              onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              required
              className="px-3 py-2.5 bg-slate-50 border border-slate-200
                         rounded-lg text-sm text-slate-700 placeholder-slate-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent transition"
            />
            <input
              type="email"
              placeholder="Your email"
              value={form.authorEmail}
              onChange={(e) => setForm({ ...form, authorEmail: e.target.value })}
              required
              className="px-3 py-2.5 bg-slate-50 border border-slate-200
                         rounded-lg text-sm text-slate-700 placeholder-slate-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent transition"
            />
          </div>
          <textarea
            placeholder="Write a comment..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200
                       rounded-lg text-sm text-slate-700 placeholder-slate-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:border-transparent transition resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {form.content.length}/1000
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700
                         disabled:bg-blue-400 text-white text-sm font-semibold
                         rounded-lg transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white
                                  border-t-transparent rounded-full
                                  animate-spin" />
                  Posting...
                </>
              ) : 'Post Comment'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Sidebar ─────────────────────────────────────────────────────
function Sidebar({ post, trip }) {
  return (
    <div className="space-y-4">

      {/* Post info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-4">
          Post Info
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Published', value: formatShortDate(post.publishedAt) },
            { label: 'Views',     value: post.viewCount ?? 0               },
          ].map(({ label, value }) => (
            <div key={label}
                 className="flex justify-between items-center text-xs gap-2">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-700 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {post.postTags?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-3">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {post.postTags.map((pt) => (
              <span key={pt.tagId}
                    className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs
                               font-medium rounded-full border border-blue-100">
                {pt.tag?.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Part of trip */}
      {trip && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-3">
            Part of Trip
          </h2>
          <Link
            to={`/trips/${trip.id}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden
                            flex-shrink-0">
              {trip.coverImageUrl ? (
                <img src={trip.coverImageUrl} alt={trip.title}
                     className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-lg">🗺️</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800
                            group-hover:text-blue-600 transition-colors
                            line-clamp-1">
                {trip.title}
              </p>
              <p className="text-xs text-slate-400">
                {trip.city}, {trip.country}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Share */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-3">
          Share
        </h2>
        <div className="flex gap-2">
          {[
            {
              label: 'Facebook',
              color: 'bg-blue-600',
              href: `https://facebook.com/sharer/sharer.php?u=${window.location.href}`,
            },
            {
              label: 'X',
              color: 'bg-slate-900',
              href: `https://twitter.com/intent/tweet?url=${window.location.href}&text=${post.title}`,
            },
          ].map(({ label, color, href }) => (
            
            <a key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 ${color} text-white text-xs font-medium
                          py-2 rounded-lg text-center hover:opacity-90
                          transition-opacity`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function PostDetailPage() {
  const { tripId, postId } = useParams()

  const [post,    setPost]    = useState(null)
  const [trip,    setTrip]    = useState(null)
  const [photos,  setPhotos]  = useState([])
  const [videos,  setVideos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

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

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center
                      justify-center">
        <div className="w-8 h-8 border-4 border-blue-600
                        border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Error ──
  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center
                      justify-center gap-4">
        <span className="text-5xl">📝</span>
        <h1 className="text-xl font-bold text-slate-700">Post not found</h1>
        <Link to="/trips"
              className="text-blue-600 text-sm hover:underline">
          ← Back to Trips
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Breadcrumb trip={trip} postTitle={post.title} />

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: main content */}
          <div className="lg:col-span-2">

            {/* Post header */}
            <div className="bg-white rounded-xl border border-slate-200
                            p-6 mb-6">
              {/* Meta badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-green-50 text-green-600 text-xs font-medium
                                 px-2.5 py-1 rounded-full border border-green-100">
                  Published
                </span>
                <span className="bg-slate-100 text-slate-600 text-xs px-2.5
                                 py-1 rounded-full">
                  {formatShortDate(post.publishedAt)}
                </span>
                {post.viewCount > 0 && (
                  <span className="bg-slate-100 text-slate-600 text-xs
                                   px-2.5 py-1 rounded-full">
                    👁 {post.viewCount} views
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900
                             mb-4 leading-tight">
                {post.title}
              </h1>

              {/* Rich text content */}
              <div
                className="prose prose-slate prose-sm max-w-none
                           prose-headings:font-semibold prose-a:text-blue-600
                           prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>

            {/* Photo gallery */}
            <PhotoGallery photos={photos} />

            {/* Video gallery */}
            <VideoGallery videos={videos} />

            {/* Comments */}
            <Comments postId={postId} />

          </div>

          {/* Right: sidebar */}
          <div className="lg:col-span-1">
            <Sidebar post={post} trip={trip} />
          </div>

        </div>
      </div>
    </div>
  )
}