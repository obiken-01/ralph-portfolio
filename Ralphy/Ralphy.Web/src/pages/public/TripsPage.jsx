import { useEffect, useState, useMemo } from 'react'
import api from '../../api/axios'
import Seo, { breadcrumbLd } from '../../components/common/Seo'
import TripCard, { TripCardSkeleton } from '../../components/public/TripCard'

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ query }) {
  return (
    <div className="py-24 text-center">
      <span className="mb-4 block text-5xl" aria-hidden="true">🗺️</span>
      <h2 className="mb-1 font-display text-xl font-semibold text-slate-800">
        {query ? 'No trips found' : 'No trips yet'}
      </h2>
      <p className="text-sm text-slate-400">
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

  const countries = useMemo(() => {
    const unique = [...new Set(trips.map((t) => t.country).filter(Boolean))]
    return ['All', ...unique.sort()]
  }, [trips])

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
    <div className="min-h-screen">
      <Seo
        title="Trips"
        description="Every trip on Ralphy — travel adventures across
          Occidental Mindoro and the Philippines, documented with drone
          and phone."
        path="/trips"
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Trips', path: '/trips' },
        ])}
      />

      {/* Page header */}
      <header className="border-b border-slate-900/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="mb-2 text-xs font-semibold uppercase
                        tracking-[0.2em] text-teal-700">
            All adventures
          </p>
          <h1 className="font-display text-4xl font-semibold text-slate-900
                         sm:text-5xl">
            Trips
          </h1>
          <p className="mt-3 max-w-lg text-sm text-slate-500">
            Every journey, documented — from island hops around Mindoro to
            trips across the Philippines.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Filter bar */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2
                         text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search trips, cities, countries..."
              aria-label="Search trips"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white
                         py-2.5 pl-10 pr-4 text-sm text-slate-700
                         placeholder-slate-400 transition focus:border-transparent
                         focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            value={country}
            aria-label="Filter by country"
            onChange={(e) => setCountry(e.target.value)}
            className="cursor-pointer rounded-full border border-slate-200
                       bg-white px-4 py-2.5 text-sm text-slate-700 transition
                       focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sort}
            aria-label="Sort trips"
            onChange={(e) => setSort(e.target.value)}
            className="cursor-pointer rounded-full border border-slate-200
                       bg-white px-4 py-2.5 text-sm text-slate-700 transition
                       focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="az">A → Z</option>
          </select>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="mb-5 text-xs text-slate-400" role="status">
            {filtered.length} {filtered.length === 1 ? 'trip' : 'trips'} found
          </p>
        )}

        {/* Trip grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <TripCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState query={search} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((trip) => <TripCard key={trip.id} trip={trip} />)}
          </div>
        )}

      </div>
    </div>
  )
}
