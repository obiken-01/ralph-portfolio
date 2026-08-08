import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { postDate } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'
import { postAspect } from '../../utils/justify'
import Seo, { breadcrumbLd } from '../../components/common/Seo'

// ── Year Separator ──────────────────────────────────────────────
function YearSeparator({ year }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex-shrink-0 rounded-full bg-slate-900 px-4 py-1.5
                       font-display text-sm font-bold text-white">
        {year}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

// ── Timeline Card ───────────────────────────────────────────────
/**
 * Image-led, at the photograph's real proportions.
 *
 * The old card gave the photo a 20–32px sliver beside two lines of metadata,
 * which on a photography site had the priority backwards.
 */
function TimelineCard({ post }) {
  const aspect = postAspect(post)

  return (
    <Link to={`/posts/${post.id}`} className="group ml-4 block sm:ml-7">
      <article className="overflow-hidden rounded-xl bg-white shadow-sm ring-1
                          ring-slate-900/5 transition-all duration-300
                          hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative overflow-hidden bg-slate-200"
             style={{ aspectRatio: aspect }}>
          {post.thumbnailUrl ? (
            <img
              src={cldImage(post.thumbnailUrl, 900)}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform
                         duration-700 ease-out group-hover:scale-[1.03]
                         motion-reduce:transition-none
                         motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center
                            bg-gradient-to-br from-teal-50 to-slate-200">
              <span className="text-3xl" aria-hidden="true">📷</span>
            </div>
          )}

          {post.photoCount > 1 && (
            <span className="absolute right-2.5 top-2.5 rounded-full
                             bg-slate-950/55 px-2.5 py-1 text-xs font-medium
                             text-white backdrop-blur-sm">
              {post.photoCount}
            </span>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0
                          bg-gradient-to-t from-slate-950/85 via-slate-950/25
                          to-transparent p-3.5 pt-14">
            <h3 className="font-display text-base font-semibold leading-snug
                           text-white drop-shadow-sm sm:text-lg">
              {post.title}
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs
                          text-white/70">
              {post.locationName && !post.locationIsPlaceholder && (
                <span>{post.locationName}</span>
              )}
              {post.tags?.slice(0, 2).map((tag) => (
                <span key={tag} className="text-white/50">#{tag}</span>
              ))}
            </p>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ── Timeline Item (date + dot + card) ───────────────────────────
function TimelineItem({ post }) {
  const date = postDate(post)
  const parsed = date ? new Date(date) : null
  const valid = parsed && !Number.isNaN(parsed.getTime())

  return (
    <div className="relative mb-6 flex items-start gap-0">
      <div className="w-11 flex-shrink-0 pr-2 pt-2 text-right sm:w-16 sm:pr-3">
        {valid ? (
          <>
            <p className="text-[10px] font-semibold uppercase leading-tight
                          tracking-wider text-slate-400">
              {parsed.toLocaleDateString('en-US', { month: 'short' })}
            </p>
            <p className="font-display text-xl font-bold leading-tight
                          text-slate-700 tabular-nums">
              {parsed.getDate()}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-300">—</p>
        )}
      </div>

      <div className="absolute left-[34px] top-3 z-10 sm:left-[58px]">
        <div className="h-2.5 w-2.5 rounded-full border-2 border-white
                        bg-teal-600 shadow-sm" />
      </div>

      <div className="min-w-0 flex-1">
        <TimelineCard post={post} />
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function TimelinePage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/posts')
      .then((res) => setPosts(res.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Grouped by the year the photo was taken, not the year it was written up.
  // That is what makes backdated posts land where they belong, and it is the
  // replacement for the old trip-vs-story split.
  const groupedByYear = useMemo(() => {
    const groups = new Map()

    for (const post of posts) {
      const raw = postDate(post)
      const date = raw ? new Date(raw) : null
      const year = date && !Number.isNaN(date.getTime())
        ? date.getFullYear()
        : null

      const key = year ?? 'Undated'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push({ post, time: date?.getTime() ?? 0 })
    }

    for (const entries of groups.values()) {
      entries.sort((a, b) => b.time - a.time)
    }

    return [...groups.entries()].sort(([a], [b]) => {
      if (a === 'Undated') return 1
      if (b === 'Undated') return -1
      return Number(b) - Number(a)
    })
  }, [posts])

  return (
    <div className="min-h-screen">
      <Seo
        title="Timeline"
        description="Every photo story on Ralphy, in chronological order — a
          travel journal from Occidental Mindoro and around the Philippines."
        path="/timeline"
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Timeline', path: '/timeline' },
        ])}
      />

      <header className="border-b border-slate-900/5 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]
                        text-teal-700">
            My travel story
          </p>
          <h1 className="mb-3 font-display text-4xl font-semibold text-slate-900
                         sm:text-5xl">
            Timeline
          </h1>
          <p className="text-sm text-slate-500">
            Everything in order, by when the shutter fired.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}
                   className="ml-16 animate-pulse rounded-2xl bg-white p-4
                              ring-1 ring-slate-900/5 sm:ml-24">
                <div className="mb-2 h-4 w-1/4 rounded bg-slate-200" />
                <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <span className="mb-4 block text-5xl" aria-hidden="true">📅</span>
            <p className="text-sm text-slate-400">No timeline entries yet.</p>
          </div>
        ) : (
          groupedByYear.map(([year, entries]) => (
            <section key={year} className="mb-10" aria-label={`Year ${year}`}>
              <YearSeparator year={year} />

              <div className="relative">
                <div className="absolute bottom-0 left-[39px] top-0 w-px
                                bg-slate-200 sm:left-[63px]" />

                {entries.map(({ post }) => (
                  <TimelineItem key={post.id} post={post} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
