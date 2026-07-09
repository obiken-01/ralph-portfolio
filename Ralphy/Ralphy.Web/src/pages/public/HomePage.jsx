import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Seo, { SITE_URL, AUTHOR_LD } from '../../components/common/Seo'
import TripCard, { TripCardSkeleton } from '../../components/public/TripCard'
import PostCard, { PostCardSkeleton } from '../../components/public/PostCard'

// ── Hero ────────────────────────────────────────────────────────
function Hero({ trips, posts }) {
  const countries = trips
    ? [...new Set(trips.map((t) => t.country).filter(Boolean))].length
    : null
  const photos = posts
    ? posts.reduce((sum, p) => sum + (p.photoCount ?? 0), 0)
    : null

  const stats = [
    { label: 'Trips',     value: trips?.length ?? '—' },
    { label: 'Stories',   value: posts?.length ?? '—' },
    { label: 'Countries', value: countries ?? '—' },
    { label: 'Photos',    value: photos || '—' },
  ]

  return (
    <section className="relative flex min-h-[92vh] flex-col overflow-hidden
                        bg-slate-950">
      <img
        src="/hero.jpg"
        alt="Aerial drone view of Occidental Mindoro"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b
                      from-slate-950/60 via-slate-950/20 to-slate-950" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-1 flex-col
                      items-center justify-center px-4 text-center">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full
                      border border-white/20 bg-white/10 px-4 py-1.5
                      backdrop-blur-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          <span className="text-xs font-medium tracking-widest text-white/80
                           uppercase">
            Occidental Mindoro · Philippines
          </span>
        </p>

        <h1 className="font-display text-4xl font-semibold leading-tight
                       tracking-tight text-white sm:text-6xl md:text-7xl">
          Chasing horizons,
          <span className="block text-amber-300">one island at a time.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-slate-300
                      sm:text-lg">
          I'm Ralph — I document trips around Mindoro and beyond with a
          drone in the sky and a phone in my pocket.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/trips"
            className="rounded-full bg-teal-600 px-8 py-3.5 text-sm
                       font-semibold text-white shadow-lg shadow-teal-950/40
                       transition-colors hover:bg-teal-500"
          >
            Explore the trips
          </Link>
          <Link
            to="/map"
            className="rounded-full border border-white/25 bg-white/10 px-8
                       py-3.5 text-sm font-semibold text-white backdrop-blur-sm
                       transition-colors hover:bg-white/20"
          >
            View the map
          </Link>
        </div>
      </div>

      {/* Stats strip inside the hero */}
      <div className="relative z-10 border-t border-white/10">
        <dl className="mx-auto grid max-w-4xl grid-cols-2 divide-x
                       divide-white/10 sm:grid-cols-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="py-6 text-center">
              <dd className="font-display text-3xl font-semibold text-white">
                {value}
              </dd>
              <dt className="mt-1 text-[11px] font-medium uppercase
                             tracking-[0.2em] text-slate-400">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

// ── Section header ──────────────────────────────────────────────
function SectionHeader({ eyebrow, title, to, linkLabel }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]
                      text-teal-700">
          {eyebrow}
        </p>
        <h2 className="font-display text-3xl font-semibold text-slate-900
                       sm:text-4xl">
          {title}
        </h2>
      </div>
      {to && (
        <Link
          to={to}
          className="hidden shrink-0 text-sm font-semibold text-teal-700
                     hover:text-teal-600 sm:block"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

// ── Latest trips (featured + grid) ──────────────────────────────
function LatestTrips({ trips, loading }) {
  const [featured, ...rest] = trips

  return (
    <section className="py-20" aria-labelledby="latest-trips">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Latest adventures"
          title="Recent trips"
          to="/trips"
          linkLabel="All trips"
        />

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <TripCardSkeleton featured />
            <div className="grid gap-6 sm:grid-cols-2">
              <TripCardSkeleton />
              <TripCardSkeleton />
            </div>
          </div>
        ) : trips.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400">
            No trips yet — check back soon!
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <TripCard trip={featured} featured />
            <div className="grid gap-6 sm:grid-cols-2">
              {rest.slice(0, 4).map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Map banner ──────────────────────────────────────────────────
function MapBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <Link
        to="/map"
        className="group relative block overflow-hidden rounded-3xl
                   bg-slate-950 px-8 py-14 text-center sm:py-16"
      >
        {/* Dotted "map" texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(rgba(45,212,191,0.35) 1px, transparent 1.5px)',
            backgroundSize: '26px 26px',
          }}
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]
                        text-teal-400">
            Where I've been
          </p>
          <p className="mt-3 font-display text-3xl font-semibold text-white
                        sm:text-4xl">
            Every stop, pinned on the map
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            Beaches, peaks and hidden trails around the Philippines —
            explore them all on the interactive travel map.
          </p>
          <span className="mt-7 inline-block rounded-full border
                           border-teal-500/40 bg-teal-500/10 px-7 py-3
                           text-sm font-semibold text-teal-300
                           transition-colors group-hover:bg-teal-500/20">
            Open the map →
          </span>
        </div>
      </Link>
    </section>
  )
}

// ── Recent posts ────────────────────────────────────────────────
function RecentPosts({ posts, loading }) {
  return (
    <section className="py-20" aria-labelledby="recent-posts">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="From the journal"
          title="Latest stories"
          to="/timeline"
          linkLabel="Full timeline"
        />

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400">
            No stories yet — check back soon!
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── Follow CTA ──────────────────────────────────────────────────
function FollowCta() {
  return (
    <section className="border-t border-slate-900/5 bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="font-display text-2xl font-semibold text-slate-900
                      sm:text-3xl">
          Follow the journey
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Drone reels, island stories and behind-the-scenes on Instagram
          and YouTube.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <a
            href="https://instagram.com/lakbayOksi"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-slate-900 px-7 py-3 text-sm
                       font-semibold text-white transition-colors
                       hover:bg-slate-700"
          >
            @lakbayOksi
          </a>
          <a
            href="https://www.youtube.com/@Lakbay_Oksi"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-200 px-7 py-3 text-sm
                       font-semibold text-slate-700 transition-colors
                       hover:border-teal-600 hover:text-teal-700"
          >
            YouTube ▸
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function HomePage() {
  const [trips, setTrips] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

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
        console.error('Failed to fetch home data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <>
      <Seo
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Ralphy',
          url: SITE_URL,
          description:
            'Travel blog and vlog by Ralph Alcaide (@lakbayOksi) — ' +
            'adventures across Occidental Mindoro and the Philippines.',
          author: AUTHOR_LD,
        }}
      />
      <Hero trips={loading ? null : trips} posts={loading ? null : posts} />
      <LatestTrips trips={trips} loading={loading} />
      <MapBanner />
      <RecentPosts posts={posts} loading={loading} />
      <FollowCta />
    </>
  )
}
