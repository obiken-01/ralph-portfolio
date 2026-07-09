import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatShortDate } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'
import Seo, { breadcrumbLd } from '../../components/common/Seo'

// ── Filter Bar ──────────────────────────────────────────────────
function FilterBar({ active, onChange }) {
  const filters = [
    { key: 'all',   label: 'All'         },
    { key: 'trips', label: 'Trips only'  },
    { key: 'posts', label: 'Stories only' },
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold
                      transition-colors ${
            active === f.key
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-500 hover:text-teal-700'
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
      <span className="bg-slate-900 text-white text-sm font-display font-bold
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
      className="group block ml-5 sm:ml-8"
    >
      <div className="bg-white rounded-2xl ring-1 ring-slate-900/5
                      border-l-4 border-l-teal-600 overflow-hidden
                      hover:shadow-lg hover:-translate-y-0.5
                      transition-all duration-300">
        <div className="flex gap-0">

          {/* Cover thumbnail */}
          <div className="w-20 sm:w-32 flex-shrink-0 bg-slate-100
                          relative overflow-hidden">
            {trip.coverImageUrl ? (
              <img
                src={cldImage(trip.coverImageUrl, 300)}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105
                           transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full min-h-[88px] flex items-center
                              justify-center bg-gradient-to-br
                              from-teal-50 to-slate-200">
                <span className="text-3xl" aria-hidden="true">🗺️</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex flex-wrap items-start justify-between
                            gap-x-2 gap-y-1 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                               bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                Trip
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatShortDate(date)}
              </span>
            </div>
            <h3 className="font-display font-semibold text-slate-900 text-base
                           mb-1 group-hover:text-teal-700 transition-colors
                           line-clamp-1">
              {trip.title}
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              📍 {trip.city}, {trip.country}
            </p>
            <span className="text-xs text-slate-400">
              ✍️ {trip.postCount ?? 0} {trip.postCount === 1 ? 'story' : 'stories'}
            </span>
          </div>

        </div>
      </div>
    </Link>
  )
}

// ── Post Timeline Card ──────────────────────────────────────────
function PostCard({ post, date }) {
  return (
    <Link
      to={`/trips/${post.tripId}/posts/${post.id}`}
      className="group block ml-5 sm:ml-8"
    >
      <div className="bg-white rounded-2xl ring-1 ring-slate-900/5
                      border-l-4 border-l-amber-400 overflow-hidden
                      hover:shadow-lg hover:-translate-y-0.5
                      transition-all duration-300">
        <div className="flex gap-0">

          {/* Thumbnail */}
          {post.thumbnailUrl && (
            <div className="w-20 sm:w-32 flex-shrink-0 bg-slate-100
                            relative overflow-hidden">
              <img
                src={cldImage(post.thumbnailUrl, 300)}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105
                           transition-transform duration-500"
              />
            </div>
          )}

          <div className="flex-1 p-4 min-w-0">
            <div className="flex flex-wrap items-start justify-between
                            gap-x-2 gap-y-1 mb-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                               bg-amber-50 text-amber-700 ring-1
                               ring-amber-100">
                Story
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatShortDate(date)}
              </span>
            </div>
            <h3 className="font-display font-semibold text-slate-900 text-base
                           mb-1 group-hover:text-teal-700 transition-colors
                           line-clamp-1">
              {post.title}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              {post.photoCount > 0 && (
                <span className="text-xs text-slate-400">
                  📷 {post.photoCount}
                </span>
              )}
              {post.viewCount > 0 && (
                <span className="text-xs text-slate-400">
                  👁 {post.viewCount}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </Link>
  )
}

// ── Timeline Item (date + dot + card) ───────────────────────────
function TimelineItem({ item }) {
  const isTrip = item.type === 'trip'
  const date   = isTrip ? item.data.startDate : item.data.publishedAt

  return (
    <div className="relative flex items-start gap-0 mb-5">

      {/* Date column */}
      <div className="w-12 sm:w-20 flex-shrink-0 pt-3 text-right pr-2 sm:pr-3">
        <p className="text-xs font-semibold text-slate-500 uppercase
                      leading-tight">
          {new Date(date).toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className="text-lg font-display font-bold text-slate-800
                      leading-tight">
          {new Date(date).getDate()}
        </p>
      </div>

      {/* Dot on spine */}
      <div className="absolute left-[38px] sm:left-[68px] top-4 z-10">
        <div className={`w-3 h-3 rounded-full border-2 border-white
                         shadow-sm ${
          isTrip ? 'bg-teal-600' : 'bg-amber-400'
        }`} />
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0">
        {isTrip ? (
          <TripCard trip={item.data} date={date} />
        ) : (
          <PostCard post={item.data} date={date} />
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
        items.push({ type: 'trip', date: new Date(trip.startDate), data: trip })
      })
    }

    if (filter !== 'trips') {
      posts.forEach((post) => {
        if (post.publishedAt) {
          items.push({ type: 'post', date: new Date(post.publishedAt), data: post })
        }
      })
    }

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
    <div className="min-h-screen">
      <Seo
        title="Timeline"
        description="Every trip and story on Ralphy, in chronological order —
          a travel journal from Occidental Mindoro and around the
          Philippines."
        path="/timeline"
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Timeline', path: '/timeline' },
        ])}
      />

      {/* Page header */}
      <header className="bg-white border-b border-slate-900/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-teal-700 text-xs font-semibold uppercase
                        tracking-[0.2em] mb-2">
            My travel story
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold
                         text-slate-900 mb-3">
            Timeline
          </h1>
          <p className="text-slate-500 text-sm">
            Every trip and story, in chronological order.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filter bar */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <FilterBar active={filter} onChange={setFilter} />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-teal-600" />
              <span className="text-xs text-slate-500">Trip</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-500">Story</span>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}
                   className="ml-16 sm:ml-24 bg-white rounded-2xl ring-1
                              ring-slate-900/5 p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4" aria-hidden="true">📅</span>
            <p className="text-slate-400 text-sm">
              No timeline entries yet.
            </p>
          </div>
        ) : (
          groupedByYear.map(([year, items]) => (
            <section key={year} className="mb-10" aria-label={`Year ${year}`}>

              <YearSeparator year={year} />

              {/* Vertical spine */}
              <div className="relative">
                <div className="absolute left-[44px] sm:left-[74px] top-0
                                bottom-0 w-px bg-slate-200" />

                {items.map((item, idx) => (
                  <TimelineItem
                    key={`${item.type}-${item.data.id}-${idx}`}
                    item={item}
                  />
                ))}
              </div>

            </section>
          ))
        )}

      </div>
    </div>
  )
}
