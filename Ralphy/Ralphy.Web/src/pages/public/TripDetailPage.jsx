import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatShortDate, formatDateRange } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'
import Seo, { breadcrumbLd } from '../../components/common/Seo'
import PostCard, { PostCardSkeleton } from '../../components/public/PostCard'

// ── Breadcrumb ──────────────────────────────────────────────────
function Breadcrumb({ tripTitle }) {
  return (
    <nav aria-label="Breadcrumb"
         className="mb-6 flex items-center gap-1.5 text-xs text-slate-400">
      <Link to="/" className="transition-colors hover:text-teal-700">Home</Link>
      <span aria-hidden="true">/</span>
      <Link to="/trips" className="transition-colors hover:text-teal-700">Trips</Link>
      <span aria-hidden="true">/</span>
      <span className="max-w-xs truncate text-slate-600">{tripTitle}</span>
    </nav>
  )
}

// ── Trip Hero ───────────────────────────────────────────────────
function TripHero({ trip }) {
  return (
    <header className="relative mb-10 h-80 overflow-hidden rounded-3xl
                       bg-slate-950 sm:h-[28rem]">
      {trip.coverImageUrl ? (
        <img
          src={cldImage(trip.coverImageUrl, 1600)}
          alt={`${trip.title} — ${trip.city}, ${trip.country}`}
          fetchPriority="high"
          className="h-full w-full object-cover opacity-80"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center
                        bg-gradient-to-br from-slate-800 to-slate-950">
          <span className="text-8xl" aria-hidden="true">🗺️</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950
                      via-slate-950/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full
                      border border-white/20 bg-white/10 px-3.5 py-1
                      text-xs font-medium text-white/90 backdrop-blur-sm">
          📍 {trip.city}, {trip.country}
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight
                       text-white sm:text-5xl">
          {trip.title}
        </h1>
        <p className="mt-3 text-sm font-medium text-slate-300">
          🗓 {formatDateRange(trip.startDate, trip.endDate)}
        </p>
      </div>
    </header>
  )
}

// ── Locations ───────────────────────────────────────────────────
function LocationsList({ locations }) {
  if (!locations?.length) return null

  return (
    <section aria-labelledby="locations-heading"
             className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
      <h2 id="locations-heading"
          className="mb-5 font-display text-lg font-semibold text-slate-900">
        Places visited
      </h2>
      <ol className="space-y-4">
        {locations.map((loc) => (
          <li key={loc.id}
              className="flex items-start gap-3 border-b border-slate-100
                         pb-4 last:border-0 last:pb-0">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center
                             justify-center rounded-full bg-teal-50
                             text-sm ring-1 ring-teal-100"
                  aria-hidden="true">
              📍
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {loc.placeName}
              </p>
              {loc.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {loc.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <Link to="/map"
            className="mt-5 inline-block text-sm font-semibold text-teal-700
                       hover:text-teal-600">
        See them on the map →
      </Link>
    </section>
  )
}

// ── Sidebar ─────────────────────────────────────────────────────
function Sidebar({ trip, postCount }) {
  const duration = trip.endDate
    ? Math.max(1, Math.ceil(
        (new Date(trip.endDate) - new Date(trip.startDate))
        / (1000 * 60 * 60 * 24)
      ))
    : null

  const shareUrl = window.location.href

  return (
    <aside className="space-y-5">
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
        <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">
          Trip facts
        </h2>
        <dl className="space-y-3.5">
          {[
            { label: 'Destination', value: `${trip.city}, ${trip.country}` },
            { label: 'Started',     value: formatShortDate(trip.startDate) },
            { label: 'Ended',       value: trip.endDate
                ? formatShortDate(trip.endDate) : 'Ongoing' },
            { label: 'Duration',    value: duration
                ? `${duration} day${duration > 1 ? 's' : ''}` : '—' },
            { label: 'Stories',     value: postCount },
          ].map(({ label, value }) => (
            <div key={label}
                 className="flex items-start justify-between gap-2 text-sm">
              <dt className="text-slate-400">{label}</dt>
              <dd className="text-right font-medium text-slate-700">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900">
          Share this trip
        </h2>
        <div className="flex gap-2">
          <a
            href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex-1 rounded-full bg-slate-900 py-2.5 text-center
                       text-xs font-semibold text-white transition-opacity
                       hover:opacity-85"
          >
            Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(trip.title)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex-1 rounded-full border border-slate-200 py-2.5
                       text-center text-xs font-semibold text-slate-700
                       transition-colors hover:border-teal-600
                       hover:text-teal-700"
          >
            X / Twitter
          </a>
        </div>
      </div>
    </aside>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function TripDetailPage() {
  const { id } = useParams()

  const [trip, setTrip]   = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get(`/trips/${id}`)
      .then((res) => setTrip(res.data.data))
      .catch(() => setError('Trip not found.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setPostsLoading(true)
    api.get(`/posts/trip/${id}`)
      .then((res) => setPosts(res.data.data ?? []))
      .catch((err) => console.error(err))
      .finally(() => setPostsLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4
                        border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="flex min-h-screen flex-col items-center
                      justify-center gap-4">
        <span className="text-5xl" aria-hidden="true">🗺️</span>
        <h1 className="font-display text-xl font-bold text-slate-700">
          Trip not found
        </h1>
        <Link to="/trips" className="text-sm text-teal-700 hover:underline">
          ← Back to Trips
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Seo
        title={trip.title}
        description={
          trip.description
            ? trip.description.slice(0, 160)
            : `${trip.title} — a trip to ${trip.city}, ${trip.country}, documented with drone and phone.`
        }
        image={trip.coverImageUrl}
        type="article"
        path={`/trips/${trip.id}`}
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Trips', path: '/trips' },
          { name: trip.title, path: `/trips/${trip.id}` },
        ])}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb tripTitle={trip.title} />
        <TripHero trip={trip} />

        {trip.description && (
          <p className="mx-auto mb-12 max-w-3xl text-center font-display
                        text-lg leading-relaxed text-slate-600 sm:text-xl">
            {trip.description}
          </p>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Left: stories + locations */}
          <div className="space-y-10 lg:col-span-2">
            <section aria-labelledby="stories-heading">
              <h2 id="stories-heading"
                  className="mb-6 font-display text-2xl font-semibold
                             text-slate-900">
                Stories from this trip
                <span className="ml-2 align-middle text-sm font-normal
                                 text-slate-400">
                  ({posts.length})
                </span>
              </h2>

              {postsLoading ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {[...Array(2)].map((_, i) => <PostCardSkeleton key={i} />)}
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-2xl bg-white p-12 text-center
                                ring-1 ring-slate-900/5">
                  <span className="mb-3 block text-4xl" aria-hidden="true">✍️</span>
                  <p className="text-sm text-slate-400">
                    No stories yet for this trip.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} tripId={id} />
                  ))}
                </div>
              )}
            </section>

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
