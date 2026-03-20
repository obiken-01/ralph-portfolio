import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatShortDate } from '../../utils/helpers'

// ── Filter Bar ──────────────────────────────────────────────────
function FilterBar({ active, onChange }) {
  const filters = [
    { key: 'all',   label: 'All'        },
    { key: 'trips', label: 'Trips only' },
    { key: 'posts', label: 'Posts only' },
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium
                      transition-colors ${
            active === f.key
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200\
                 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ── Year Separator ──────────────────────────────────────────────
function YearSeparator({ year }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="bg-slate-900 text-white text-sm font-bold
                       px-4 py-1.5 rounded-full flex-shrink-0">
        {year}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

// ── Trip Timeline Card ──────────────────────────────────────────
function TripCard({ trip, date }) {
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group block ml-16 sm:ml-20"
    >
      <div className="bg-white rounded-xl border border-slate-200
                      border-l-4 border-l-blue-500 overflow-hidden
                      hover:shadow-md hover:-translate-y-0.5
                      transition-all duration-300">
        <div className="flex gap-0">

          {/* Cover thumbnail */}
          <div className="w-24 sm:w-32 flex-shrink-0 bg-slate-100
                          relative overflow-hidden">
            {trip.coverImageUrl ? (
              <img
                src={trip.coverImageUrl}
                alt={trip.title}
                className="w-full h-full object-cover group-hover:scale-105
                           transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full min-h-[88px] flex items-center
                              justify-center bg-gradient-to-br
                              from-blue-50 to-blue-100">
                <span className="text-3xl">🗺️</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                               bg-blue-50 text-blue-600 border border-blue-100">
                Trip
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatShortDate(date)}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1
                           group-hover:text-blue-600 transition-colors
                           line-clamp-1">
              {trip.title}
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              📍 {trip.city}, {trip.country}
            </p>
            <div className="flex gap-3">
              <span className="text-xs text-slate-400">
                📝 {trip.postCount ?? 0} posts
              </span>
            </div>
          </div>

        </div>
      </div>
    </Link>
  )
}

// ── Post Timeline Card ──────────────────────────────────────────
function PostCard({ post, tripId, date }) {
  return (
    <Link
      to={`/trips/${tripId}/posts/${post.id}`}
      className="group block ml-16 sm:ml-20"
    >
      <div className="bg-white rounded-xl border border-slate-200
                      border-l-4 border-l-green-500 overflow-hidden
                      hover:shadow-md hover:-translate-y-0.5
                      transition-all duration-300">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                             bg-green-50 text-green-600 border border-green-100">
              Post
            </span>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {formatShortDate(date)}
            </span>
          </div>
          <h3 className="font-semibold text-slate-900 text-sm mb-2
                         group-hover:text-green-600 transition-colors
                         line-clamp-1">
            {post.title}
          </h3>

          {/* Photo strip */}
          {post.photos?.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {post.photos.slice(0, 5).map((photo) => (
                <div key={photo.id}
                     className="relative w-10 h-8 rounded overflow-hidden
                                flex-shrink-0 bg-slate-100">
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute bottom-0.5 right-0.5 w-2.5
                                   h-2.5 rounded-sm ${
                    photo.source === 1 ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                </div>
              ))}
              {post.photos.length > 5 && (
                <div className="w-10 h-8 rounded bg-slate-100 flex items-center
                                justify-center flex-shrink-0">
                  <span className="text-xs text-slate-400 font-medium">
                    +{post.photos.length - 5}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2">
            {post.viewCount > 0 && (
              <span className="text-xs text-slate-400">
                👁 {post.viewCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Timeline Item (dot + date + card) ───────────────────────────
function TimelineItem({ item }) {
  const isTrip = item.type === 'trip'
  const date   = isTrip ? item.data.startDate : item.data.publishedAt

  return (
    <div className="relative flex items-start gap-0 mb-5">

      {/* Date column */}
      <div className="w-16 sm:w-20 flex-shrink-0 pt-3 text-right pr-3">
        <p className="text-xs font-semibold text-slate-500 uppercase leading-tight">
          {new Date(date).toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className="text-lg font-bold text-slate-800 leading-tight">
          {new Date(date).getDate()}
        </p>
      </div>

      {/* Dot on spine */}
      <div className="absolute left-[52px] sm:left-[68px] top-4 z-10">
        <div className={`w-3 h-3 rounded-full border-2 border-white
                         shadow-sm ${
          isTrip ? 'bg-blue-500' : 'bg-green-500'
        }`} />
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0">
        {isTrip ? (
          <TripCard trip={item.data} date={date} />
        ) : (
          <PostCard
            post={item.data}
            tripId={item.data.tripId}
            date={date}
          />
        )}
      </div>

    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function TimelinePage() {
  const [trips,   setTrips]   = useState([])
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, postsRes] = await Promise.all([
          api.get('/trips'),
          api.get('/posts'),
        ])
        setTrips(tripsRes.data.data ?? [])
        setPosts(postsRes.data.data ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Build unified timeline items
  const timelineItems = useMemo(() => {
    const items = []

    if (filter !== 'posts') {
      trips.forEach((trip) => {
        items.push({
          type: 'trip',
          date: new Date(trip.startDate),
          data: trip,
        })
      })
    }

    if (filter !== 'trips') {
      posts.forEach((post) => {
        if (post.publishedAt) {
          items.push({
            type: 'post',
            date: new Date(post.publishedAt),
            data: post,
          })
        }
      })
    }

    // Sort newest first
    return items.sort((a, b) => b.date - a.date)
  }, [trips, posts, filter])

  // Group by year
  const groupedByYear = useMemo(() => {
    const groups = {}
    timelineItems.forEach((item) => {
      const year = item.date.getFullYear()
      if (!groups[year]) groups[year] = []
      groups[year].push(item)
    })
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
  }, [timelineItems])

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-blue-600 text-xs font-semibold uppercase
                        tracking-widest mb-1">
            My Travel Story
          </p>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            Timeline
          </h1>
          <p className="text-slate-400 text-sm">
            Every trip and post, in chronological order.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filter bar */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <FilterBar active={filter} onChange={setFilter} />
          {/* Legend */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-500">Trip</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-500">Post</span>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}
                   className="ml-20 bg-white rounded-xl border border-slate-200
                              p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">📅</span>
            <p className="text-slate-400 text-sm">
              No timeline entries yet.
            </p>
          </div>
        ) : (
          groupedByYear.map(([year, items]) => (
            <div key={year} className="mb-10">

              {/* Year separator */}
              <YearSeparator year={year} />

              {/* Vertical spine */}
              <div className="relative">
                <div className="absolute left-[59px] sm:left-[75px] top-0
                                bottom-0 w-px bg-slate-200" />

                {/* Items */}
                {items.map((item, idx) => (
                  <TimelineItem
                    key={`${item.type}-${item.data.id}-${idx}`}
                    item={item}
                  />
                ))}
              </div>

            </div>
          ))
        )}

      </div>
    </div>
  )
}