import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatShortDate, truncateText } from '../../utils/helpers'

// ── Breadcrumb ──────────────────────────────────────────────────
function Breadcrumb({ tripTitle }) {
  return (
    <nav className="text-xs text-slate-400 mb-6 flex items-center gap-1.5">
      <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
      <span>/</span>
      <Link to="/trips" className="hover:text-blue-600 transition-colors">Trips</Link>
      <span>/</span>
      <span className="text-slate-600 truncate max-w-xs">{tripTitle}</span>
    </nav>
  )
}

// ── Trip Hero ───────────────────────────────────────────────────
function TripHero({ trip }) {
  return (
    <div className="relative h-72 sm:h-96 bg-slate-900 overflow-hidden
                    rounded-xl mb-8">
      {trip.coverImageUrl ? (
        <img
          src={trip.coverImageUrl}
          alt={trip.title}
          className="w-full h-full object-cover opacity-70"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center
                        bg-gradient-to-br from-slate-800 to-slate-900">
          <span className="text-8xl">🗺️</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t
                      from-slate-900 via-slate-900/20 to-transparent" />

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="bg-blue-600 text-white text-xs font-semibold
                           px-2.5 py-1 rounded-full">
            {trip.country}
          </span>
          <span className="bg-green-500 text-white text-xs font-semibold
                           px-2.5 py-1 rounded-full">
            Published
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          {trip.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-slate-300 text-xs">
          <span>📍 {trip.city}, {trip.country}</span>
          <span>·</span>
          <span>🗓 {formatShortDate(trip.startDate)}
            {trip.endDate && ` — ${formatShortDate(trip.endDate)}`}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Post Card ───────────────────────────────────────────────────
function PostCard({ post, tripId }) {
  return (
    <Link
      to={`/trips/${tripId}/posts/${post.id}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden
                 border border-slate-200 hover:shadow-lg hover:-translate-y-0.5
                 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-slate-100 overflow-hidden">
        {post.photos?.[0]?.url ? (
          <img
            src={post.photos[0].url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105
                       transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center
                          bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-4xl">📝</span>
          </div>
        )}
        {/* View count */}
        {post.viewCount > 0 && (
          <div className="absolute top-3 right-3 bg-slate-900/70
                          backdrop-blur-sm text-white text-xs px-2 py-0.5
                          rounded-full">
            👁 {post.viewCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-900 text-sm mb-1
                       group-hover:text-blue-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-slate-400 text-xs mb-2">
          {formatShortDate(post.publishedAt)}
        </p>
        {post.content && (
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 flex-1">
            {truncateText(post.content.replace(/<[^>]+>/g, ''), 80)}
          </p>
        )}
        <p className="text-blue-600 text-xs font-medium mt-3
                      group-hover:underline">
          Read post →
        </p>
      </div>
    </Link>
  )
}

// ── Post Skeleton ───────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200
                    overflow-hidden animate-pulse">
      <div className="h-40 bg-slate-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
      </div>
    </div>
  )
}

// ── Locations Mini Map ──────────────────────────────────────────
function LocationsList({ locations }) {
  if (!locations?.length) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-900 text-sm mb-4">
        📍 Locations
      </h2>
      <div className="space-y-3">
        {locations.map((loc) => (
          <div key={loc.id}
               className="flex items-start gap-3 pb-3 border-b
                          border-slate-100 last:border-0 last:pb-0">
            <div className="w-7 h-7 rounded-full bg-blue-50 border
                            border-blue-100 flex items-center justify-center
                            flex-shrink-0 mt-0.5">
              <span className="text-xs">📍</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {loc.placeName}
              </p>
              {loc.description && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {loc.description}
                </p>
              )}
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sidebar ─────────────────────────────────────────────────────
function Sidebar({ trip, postCount }) {
  const duration = trip.endDate
    ? Math.ceil(
        (new Date(trip.endDate) - new Date(trip.startDate))
        / (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="space-y-4">

      {/* Trip info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-4">
          Trip Info
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Destination', value: `${trip.city}, ${trip.country}` },
            { label: 'Start Date',  value: formatShortDate(trip.startDate)  },
            { label: 'End Date',    value: trip.endDate
                ? formatShortDate(trip.endDate) : 'Ongoing'                 },
            { label: 'Duration',    value: duration
                ? `${duration} day${duration > 1 ? 's' : ''}` : '—'        },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-start
                                        text-xs gap-2">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-700 font-medium text-right">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-4">
          Stats
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Posts',     value: postCount },
            { label: 'Locations', value: trip.locations?.length ?? 0 },
          ].map(({ label, value }) => (
            <div key={label}
                 className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

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
              href: `https://twitter.com/intent/tweet?url=${window.location.href}&text=${trip.title}`,
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
export default function TripDetailPage() {
  const { id } = useParams()

  const [trip,  setTrip]    = useState(null)
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [error, setError]   = useState(null)

  // Fetch trip details
  useEffect(() => {
    api.get(`/trips/${id}`)
      .then((res) => setTrip(res.data.data))
      .catch(() => setError('Trip not found.'))
      .finally(() => setLoading(false))
  }, [id])

  // Fetch posts for this trip
  useEffect(() => {
    api.get(`/posts/trip/${id}`)
      .then((res) => setPosts(res.data.data ?? []))
      .catch((err) => console.error(err))
      .finally(() => setPostsLoading(false))
  }, [id])

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
  if (error || !trip) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center
                      justify-center gap-4">
        <span className="text-5xl">🗺️</span>
        <h1 className="text-xl font-bold text-slate-700">Trip not found</h1>
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

        <Breadcrumb tripTitle={trip.title} />
        <TripHero trip={trip} />

        {/* Description */}
        {trip.description && (
          <div className="bg-white rounded-xl border border-slate-200
                          p-6 mb-8">
            <p className="text-slate-600 text-sm leading-relaxed">
              {trip.description}
            </p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: posts + locations */}
          <div className="lg:col-span-2">

            {/* Posts */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">
                  Posts
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    ({posts.length})
                  </span>
                </h2>
              </div>

              {postsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => <PostSkeleton key={i} />)}
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200
                                p-10 text-center">
                  <span className="text-4xl block mb-3">📝</span>
                  <p className="text-slate-400 text-sm">
                    No posts yet for this trip.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} tripId={id} />
                  ))}
                </div>
              )}
            </div>

            {/* Locations */}
            <LocationsList locations={trip.locations} />

          </div>

          {/* Right: sidebar */}
          <div className="lg:col-span-1">
            <Sidebar trip={trip} postCount={posts.length} />
          </div>

        </div>
      </div>
    </div>
  )
}