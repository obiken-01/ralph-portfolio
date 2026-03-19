import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatShortDate, truncateText } from '../../utils/helpers'

// ── Hero ────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative h-[90vh] min-h-[560px] flex items-center
                        justify-center overflow-hidden bg-slate-950">

      {/* Background image — replace src with your actual drone photo */}
      <img
        src="/hero.jpg"
        alt="Hero"
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b
                      from-slate-950/30 via-slate-950/20 to-slate-950" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm
                        border border-white/20 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/80 text-xs font-medium tracking-wide">
            Occidental Mindoro, Philippines
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white
                       leading-tight tracking-tight mb-4">
          Adventures from
          <span className="block text-blue-400">Occidental Mindoro</span>
        </h1>

        <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8">
          Travel stories captured by drone and phone —
          one trip at a time.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/trips"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white
                       font-semibold text-sm rounded-lg transition-colors
                       duration-200"
          >
            Explore Trips
          </Link>
          <Link
            to="/map"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm
                       border border-white/20 text-white font-semibold text-sm
                       rounded-lg transition-colors duration-200"
          >
            View Map
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2
                      flex flex-col items-center gap-1 animate-bounce">
        <span className="text-white/40 text-xs">scroll</span>
        <svg className="w-4 h-4 text-white/40" fill="none"
             stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

    </section>
  )
}

// ── Stats Bar ───────────────────────────────────────────────────
function StatsBar({ trips, posts }) {
  const stats = [
    { label: 'Trips',     value: trips?.length   ?? '—' },
    { label: 'Posts',     value: posts?.length   ?? '—' },
    { label: 'Countries', value: trips
        ? [...new Set(trips.map((t) => t.country))].length
        : '—'
    },
    { label: 'Photos',    value: '📷' },
  ]

  return (
    <section className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x
                        divide-slate-800">
          {stats.map(({ label, value }) => (
            <div key={label}
                 className="py-5 text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-slate-400 text-xs mt-0.5 uppercase
                            tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Trip Card ───────────────────────────────────────────────────
function TripCard({ trip }) {
  return (
    <Link to={`/trips/${trip.id}`}
          className="group block bg-white rounded-xl overflow-hidden
                     border border-slate-200 hover:shadow-lg
                     hover:-translate-y-1 transition-all duration-300">

      {/* Cover image */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        {trip.coverImageUrl ? (
          <img
            src={trip.coverImageUrl}
            alt={trip.title}
            className="w-full h-full object-cover group-hover:scale-105
                       transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center
                          bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-4xl">🗺️</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-blue-600 text-white text-xs font-semibold
                           px-2.5 py-1 rounded-full">
            {trip.country}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-1
                       group-hover:text-blue-600 transition-colors line-clamp-1">
          {trip.title}
        </h3>
        <p className="text-slate-400 text-xs mb-3">
          {trip.city} · {formatShortDate(trip.startDate)}
        </p>
        {trip.description && (
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
            {truncateText(trip.description, 80)}
          </p>
        )}
      </div>
    </Link>
  )
}

// ── Latest Trips ────────────────────────────────────────────────
function LatestTrips({ trips, loading }) {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-blue-600 text-xs font-semibold uppercase
                          tracking-widest mb-1">
              Latest Adventures
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Recent Trips
            </h2>
          </div>
          <Link to="/trips"
                className="text-sm text-blue-600 hover:text-blue-700
                           font-medium transition-colors">
            View all →
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border
                                      border-slate-200 overflow-hidden
                                      animate-pulse">
                <div className="h-44 bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-12">
            No trips yet — check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.slice(0, 3).map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

      </div>
    </section>
  )
}

// ── Map Preview ─────────────────────────────────────────────────
function MapPreview() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-blue-600 text-xs font-semibold uppercase
                          tracking-widest mb-1">
              Where I've Been
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Travel Map
            </h2>
          </div>
          <Link to="/map"
                className="text-sm text-blue-600 hover:text-blue-700
                           font-medium transition-colors">
            Full map →
          </Link>
        </div>

        {/* Map placeholder — Leaflet map goes here in Step 37 */}
        <Link to="/map"
              className="group block relative h-56 sm:h-72 rounded-xl
                         overflow-hidden border border-slate-200
                         hover:shadow-lg transition-shadow duration-300
                         bg-slate-100">
          <div className="absolute inset-0 flex flex-col items-center
                          justify-center gap-3">
            <span className="text-5xl">🗺️</span>
            <p className="text-slate-500 text-sm font-medium
                          group-hover:text-blue-600 transition-colors">
              Click to explore the map →
            </p>
          </div>
        </Link>

      </div>
    </section>
  )
}

// ── Recent Posts ────────────────────────────────────────────────
function RecentPosts({ posts, loading }) {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-blue-600 text-xs font-semibold uppercase
                          tracking-widest mb-1">
              From the Blog
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Recent Posts
            </h2>
          </div>
          <Link to="/trips"
                className="text-sm text-blue-600 hover:text-blue-700
                           font-medium transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border
                                      border-slate-200 overflow-hidden
                                      animate-pulse">
                <div className="h-36 bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-12">
            No posts yet — check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.slice(0, 3).map((post) => (
              <div key={post.id}
                   className="group bg-white rounded-xl overflow-hidden
                              border border-slate-200 hover:shadow-lg
                              hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-36 bg-slate-100 overflow-hidden">
                  {post.photos?.[0]?.url ? (
                    <img
                      src={post.photos[0].url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105
                                 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center
                                    justify-center bg-gradient-to-br
                                    from-slate-100 to-slate-200">
                      <span className="text-3xl">📝</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 text-sm mb-1
                                 group-hover:text-blue-600 transition-colors
                                 line-clamp-1">
                    {post.title}
                  </h3>
                  <p className="text-slate-400 text-xs mb-2">
                    {formatShortDate(post.publishedAt)}
                    {post.viewCount > 0 && (
                      <span className="ml-2">· 👁 {post.viewCount}</span>
                    )}
                  </p>
                  <p className="text-slate-500 text-xs leading-relaxed
                                line-clamp-2">
                    {truncateText(post.content?.replace(/<[^>]+>/g, ''), 80)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function HomePage() {
  const [trips, setTrips]   = useState([])
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, postsRes] = await Promise.all([
          api.get('/trips'),
          api.get('/posts'),
        ])
        setTrips(tripsRes.data.data  ?? [])
        setPosts(postsRes.data.data  ?? [])
      } catch (err) {
        console.error('Failed to fetch home data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <>
      <Hero />
      <StatsBar trips={trips} posts={posts} />
      <LatestTrips trips={trips} loading={loading} />
      <MapPreview />
      <RecentPosts posts={posts} loading={loading} />
    </>
  )
}