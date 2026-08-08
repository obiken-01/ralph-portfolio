import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatShortDate, postDate } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'
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
function TimelineCard({ post }) {
  return (
    <Link to={`/posts/${post.id}`} className="group ml-5 block sm:ml-8">
      <div className="overflow-hidden rounded-2xl border-l-4 border-l-teal-600
                      bg-white ring-1 ring-slate-900/5 transition-all
                      duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex gap-0">
          {post.thumbnailUrl && (
            <div className="relative w-20 flex-shrink-0 overflow-hidden
                            bg-slate-100 sm:w-32">
              <img
                src={cldImage(post.thumbnailUrl, 300)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform
                           duration-500 group-hover:scale-105"
              />
            </div>
          )}

          <div className="min-w-0 flex-1 p-4">
            <div className="mb-1.5 flex flex-wrap items-start justify-between
                            gap-x-2 gap-y-1">
              {post.locationName && !post.locationIsPlaceholder ? (
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs
                                 font-semibold text-teal-700 ring-1
                                 ring-teal-100">
                  {post.locationName}
                </span>
              ) : <span />}
              <span className="flex-shrink-0 text-xs text-slate-400">
                {formatShortDate(postDate(post))}
              </span>
            </div>

            <h3 className="mb-1 font-display text-base font-semibold
                           text-slate-900 transition-colors line-clamp-1
                           group-hover:text-teal-700">
              {post.title}
            </h3>

            <div className="mt-1 flex items-center gap-3">
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
              {post.tags?.slice(0, 2).map((tag) => (
                <span key={tag} className="text-xs text-slate-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Timeline Item (date + dot + card) ───────────────────────────
function TimelineItem({ post }) {
  const date = postDate(post)
  const parsed = date ? new Date(date) : null
  const valid = parsed && !Number.isNaN(parsed.getTime())

  return (
    <div className="relative mb-5 flex items-start gap-0">
      <div className="w-12 flex-shrink-0 pr-2 pt-3 text-right sm:w-20 sm:pr-3">
        {valid ? (
          <>
            <p className="text-xs font-semibold uppercase leading-tight
                          text-slate-500">
              {parsed.toLocaleDateString('en-US', { month: 'short' })}
            </p>
            <p className="font-display text-lg font-bold leading-tight
                          text-slate-800">
              {parsed.getDate()}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-400">—</p>
        )}
      </div>

      <div className="absolute left-[38px] top-4 z-10 sm:left-[68px]">
        <div className="h-3 w-3 rounded-full border-2 border-white bg-teal-600
                        shadow-sm" />
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

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
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
                <div className="absolute bottom-0 left-[44px] top-0 w-px
                                bg-slate-200 sm:left-[74px]" />

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
