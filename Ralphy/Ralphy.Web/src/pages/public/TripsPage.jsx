import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatShortDate, truncateText } from '../../utils/helpers'

// ── Trip Card ───────────────────────────────────────────────────
function TripCard({ trip }) {
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group flex flex-col sm:flex-row bg-white rounded-xl
                 overflow-hidden border border-slate-200 hover:shadow-lg
                 hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Cover image */}
      <div className="relative w-full sm:w-52 h-44 sm:h-auto
                      flex-shrink-0 bg-slate-100 overflow-hidden">
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
            <span className="text-5xl">🗺️</span>
          </div>
        )}

        {/* Drone badge */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-slate-900/70 backdrop-blur-sm text-white
                           text-xs font-medium px-2 py-0.5 rounded-full">
            {trip.country}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-between p-5 flex-1 min-w-0">
        <div>
          {/* Title + status */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h2 className="font-semibold text-slate-900 text-base
                           group-hover:text-blue-600 transition-colors
                           line-clamp-1">
              {trip.title}
            </h2>
            <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5
                             rounded-full bg-green-50 text-green-600 border
                             border-green-100">
              Published
            </span>
          </div>

          {/* Meta */}
          <p className="text-slate-400 text-xs mb-3">
            📍 {trip.city}, {trip.country}
            <span className="mx-1.5">·</span>
            🗓 {formatShortDate(trip.startDate)}
            {trip.endDate && (
              <span> — {formatShortDate(trip.endDate)}</span>
            )}
          </p>

          {/* Description */}
          {trip.description && (
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
              {truncateText(trip.description, 120)}
            </p>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between mt-4 pt-3
                        border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              📝 {trip.posts?.length ?? 0} posts
            </span>
          </div>
          <span className="text-xs text-blue-600 font-medium
                           group-hover:underline">
            View trip →
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Skeleton ────────────────────────────────────────────────────
function TripSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row bg-white rounded-xl
                    border border-slate-200 overflow-hidden animate-pulse">
      <div className="w-full sm:w-52 h-44 sm:h-auto bg-slate-200
                      flex-shrink-0" />
      <div className="flex flex-col justify-between p-5 flex-1 gap-3">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-full mt-2" />
          <div className="h-3 bg-slate-100 rounded w-5/6" />
        </div>
        <div className="h-3 bg-slate-100 rounded w-1/4 mt-2" />
      </div>
    </div>
  )
}

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ query }) {
  return (
    <div className="text-center py-20">
      <span className="text-5xl mb-4 block">🗺️</span>
      <h3 className="text-slate-700 font-semibold text-lg mb-1">
        {query ? 'No trips found' : 'No trips yet'}
      </h3>
      <p className="text-slate-400 text-sm">
        {query
          ? `No results for "${query}" — try a different search.`
          : 'Check back soon for travel stories!'}
      </p>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function TripsPage() {
  const [trips, setTrips]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [country, setCountry] = useState('All')
  const [sort, setSort]       = useState('newest')

  useEffect(() => {
    api.get('/trips')
      .then((res) => setTrips(res.data.data ?? []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // Unique countries for filter dropdown
  const countries = useMemo(() => {
    const unique = [...new Set(trips.map((t) => t.country).filter(Boolean))]
    return ['All', ...unique.sort()]
  }, [trips])

  // Filtered + sorted trips
  const filtered = useMemo(() => {
    let result = [...trips]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.city?.toLowerCase().includes(q) ||
          t.country?.toLowerCase().includes(q)
      )
    }

    if (country !== 'All') {
      result = result.filter((t) => t.country === country)
    }

    if (sort === 'newest') {
      result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    } else if (sort === 'oldest') {
      result.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    } else if (sort === 'az') {
      result.sort((a, b) => a.title.localeCompare(b.title))
    }

    return result
  }, [trips, search, country, sort])

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-blue-600 text-xs font-semibold uppercase
                        tracking-widest mb-1">
            All Adventures
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Trips</h1>
          <p className="text-slate-400 text-sm mt-1">
            Every journey, documented.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">

          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                            text-slate-400" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search trips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200
                         rounded-lg text-sm text-slate-700 placeholder-slate-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent transition"
            />
          </div>

          {/* Country filter */}
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg
                       text-sm text-slate-700 focus:outline-none focus:ring-2
                       focus:ring-blue-500 transition cursor-pointer"
          >
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg
                       text-sm text-slate-700 focus:outline-none focus:ring-2
                       focus:ring-blue-500 transition cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="az">A → Z</option>
          </select>

        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-slate-400 mb-4">
            {filtered.length} {filtered.length === 1 ? 'trip' : 'trips'} found
          </p>
        )}

        {/* Trip list */}
        <div className="flex flex-col gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => <TripSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState query={search} />
          ) : (
            filtered.map((trip) => <TripCard key={trip.id} trip={trip} />)
          )}
        </div>

      </div>
    </div>
  )
}