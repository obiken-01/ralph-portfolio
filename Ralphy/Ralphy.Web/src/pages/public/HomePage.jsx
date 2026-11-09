import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { fetchCached, peekCache } from '../../api/cache'
import Seo, { SITE_URL, AUTHOR_LD } from '../../components/common/Seo'
import PostCard from '../../components/public/PostCard'
import JustifiedGrid from '../../components/public/JustifiedGrid'
import HeroSlideshow from '../../components/public/HeroSlideshow'
import { TagFilterBar } from '../../components/public/TagChips'
import { postAspect } from '../../utils/justify'

// ── Hero ────────────────────────────────────────────────────────
function Hero({ featured }) {
  return (
    <HeroSlideshow photos={featured}>
      <>
        <h1 className="font-display text-2xl font-semibold leading-[1.05]
                       tracking-[-0.02em] text-balance text-white drop-shadow-md
                       sm:text-4xl md:text-[2.75rem]">
          Chasing horizons,
          <span className="block italic text-amber-200/95">
            one island at a time
          </span>
        </h1>

        <div className="mt-4 flex items-center gap-2 sm:mt-6
                        sm:gap-2.5">
          <Link viewTransition
            to="/posts"
            className="rounded-full bg-white px-4 py-2.5 text-center sm:px-5 sm:py-3 text-[13px]
                       font-semibold text-slate-900 shadow-lg
                       shadow-slate-950/30 transition-colors
                       hover:bg-amber-100 focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-white
                       focus-visible:ring-offset-2
                       focus-visible:ring-offset-slate-900"
          >
            Browse the photos
          </Link>
          <Link viewTransition
            to="/map"
            className="rounded-full border border-white/30 px-4 py-2.5 sm:px-5 sm:py-3
                       text-center text-[13px] font-semibold text-white/90 backdrop-blur-sm
                       transition-colors hover:border-white/60 hover:text-white
                       focus:outline-none focus-visible:ring-2
                       focus-visible:ring-white"
          >
            View the map
          </Link>
        </div>
      </>
    </HeroSlideshow>
  )
}

// ── Section header ──────────────────────────────────────────────
function SectionHeader({ eyebrow, title, to, linkLabel }) {
  return (
    <div className="reveal mb-6 flex items-end sm:mb-10 justify-between gap-4">
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
        <Link viewTransition
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

// ── Latest photos ───────────────────────────────────────────────
function LatestPhotos({ posts, tags, loading }) {
  const renderItem = useCallback(
    (post, { width }) => <PostCard post={post} width={width} />,
    []
  )

  return (
    <section className="py-12 sm:py-20" aria-labelledby="latest-photos">
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Latest adventures"
          title="Recent photos"
          to="/posts"
          linkLabel="All photos"
        />

        {tags.length > 0 && (
          <div className="mb-8">
            <TagFilterBar tags={tags} limit={8} />
          </div>
        )}

        {loading ? (
          <div className="flex gap-1.5" style={{ height: 260 }}>
            {[1.5, 0.7, 1.6, 1.2].map((aspect, i) => (
              <div
                key={i}
                className="animate-pulse rounded-sm bg-slate-200"
                style={{ flexGrow: aspect, flexBasis: 0 }}
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-400">
            Nothing here yet — check back soon!
          </p>
        ) : (
          <JustifiedGrid
            items={posts.slice(0, 9)}
            aspectOf={postAspect}
            renderItem={renderItem}
            widthKey="home"
          />
        )}
      </div>
    </section>
  )
}

// ── Map banner ──────────────────────────────────────────────────
function MapBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <Link viewTransition
        to="/map"
        className="reveal group relative block overflow-hidden rounded-3xl
                   bg-slate-950 px-5 py-10 text-center sm:px-8 sm:py-16"
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

// ── Follow CTA ──────────────────────────────────────────────────
function FollowCta() {
  return (
    <section className="border-t border-slate-900/5 bg-white py-16">
      <div className="reveal mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="font-display text-2xl font-semibold text-slate-900
                      sm:text-3xl">
          Follow the journey
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Drone reels, island stories and behind-the-scenes on Instagram
          and YouTube.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
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
  // On a return visit the page renders from the cache straight away (and keeps
  // the same slideshow photos), then refreshes the posts in the background.
  const cached = peekCache('home')
  const [data, setData] = useState(cached ?? { posts: [], tags: [], featured: [] })
  const [loading, setLoading] = useState(!cached)
  const { posts, tags, featured } = data

  useEffect(() => {
    let cancelled = false

    fetchCached('home', async () => {
      const previous = peekCache('home')
      const [postsRes, tagsRes, featuredRes] = await Promise.all([
        api.get('/posts'),
        api.get('/tags'),
        // Any published photo will do — the slideshow is about the
        // photographs, not about which post they belong to. Drawn once per
        // visit: swapping them under someone mid-slideshow would be jarring.
        previous?.featured.length
          ? null
          : api.get('/photos/random', { params: { count: 10 } }),
      ])
      return {
        posts: postsRes.data.data ?? [],
        tags: tagsRes.data.data ?? [],
        featured: featuredRes?.data.data ?? previous?.featured ?? [],
      }
    })
      .then((next) => { if (!cancelled) setData(next) })
      .catch((err) => console.error('Failed to fetch home data:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
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
      <Hero featured={featured} />
      <LatestPhotos posts={posts} tags={tags} loading={loading} />
      <MapBanner />
      <FollowCta />
    </>
  )
}
