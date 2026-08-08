import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import PostCard from '../../components/public/PostCard'
import JustifiedGrid from '../../components/public/JustifiedGrid'
import { TagFilterBar } from '../../components/public/TagChips'
import Seo, { breadcrumbLd } from '../../components/common/Seo'
import { groupByMonth } from '../../utils/helpers'
import { postAspect } from '../../utils/justify'

/** Placeholder rows while the feed loads, at plausible photo shapes. */
function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {[[1.5, 0.7, 1.6], [1.8, 1.2, 1.4]].map((row, i) => (
        <div key={i} className="flex gap-1.5" style={{ height: 260 }}>
          {row.map((aspect, j) => (
            <div
              key={j}
              className="animate-pulse rounded-sm bg-slate-200"
              style={{ flexGrow: aspect, flexBasis: 0 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * The photo feed — the site's primary browse surface.
 *
 * Doubles as the tag-filtered view at /tags/:name, since the two differ only
 * in which endpoint they read and what the header says.
 */
export default function PostsFeedPage({ filterByTag = false }) {
  const { name: tagName } = useParams()

  const [posts, setPosts] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    const endpoint = filterByTag
      ? `/tags/${encodeURIComponent(tagName)}/posts`
      : '/posts'

    Promise.all([api.get(endpoint), api.get('/tags')])
      .then(([postsRes, tagsRes]) => {
        if (cancelled) return
        setPosts(postsRes.data.data ?? [])
        setTags(tagsRes.data.data ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        // The API 404s an unknown tag rather than returning an empty list,
        // precisely so a typo is distinguishable from an empty result.
        if (err.response?.status === 404) setNotFound(true)
        else console.error(err)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [filterByTag, tagName])

  const groups = useMemo(() => groupByMonth(posts), [posts])

  // postAspect is module-level, so its identity is already stable; only the
  // closure needs memoizing to keep JustifiedGrid from repacking each render.
  const renderItem = useCallback(
    (post, { width }) => <PostCard post={post} width={width} />,
    []
  )

  const heading = filterByTag ? `#${tagName}` : 'Photos'
  const path = filterByTag ? `/tags/${tagName}` : '/posts'

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <span className="text-5xl" aria-hidden="true">🏷️</span>
        <h1 className="font-display text-xl font-bold text-slate-700">
          No such tag
        </h1>
        <Link to="/posts" className="text-sm text-teal-700 hover:underline">
          ← Back to all photos
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Seo
        title={filterByTag ? `#${tagName}` : 'Photos'}
        description={
          filterByTag
            ? `Photos tagged #${tagName} — from Occidental Mindoro and around the Philippines.`
            : 'Photographs from Occidental Mindoro and around the Philippines — '
              + 'beaches, peaks, dive sites and the roads between them.'
        }
        path={path}
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Photos', path: '/posts' },
          ...(filterByTag ? [{ name: `#${tagName}`, path }] : []),
        ])}
      />

      <header className="border-b border-slate-900/5 bg-white">
        <div className="mx-auto max-w-[112rem] px-3 py-12 sm:px-5 sm:py-14">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]
                        text-teal-700">
            {filterByTag ? 'Tagged' : 'The feed'}
          </p>
          <h1 className="font-display text-4xl font-semibold text-slate-900
                         sm:text-5xl">
            {heading}
          </h1>
          {!loading && (
            <p className="mt-3 text-sm text-slate-500">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
          )}
        </div>
      </header>

      {/* Wider than the old 7xl: justified rows earn their keep with width,
          and the tiles carry their own labels now, so there's no text column
          to keep readable. */}
      <div className="mx-auto max-w-[112rem] px-3 py-8 sm:px-5">
        <div className="mb-8">
          <TagFilterBar tags={tags} active={filterByTag ? tagName : null} />
        </div>

        {loading ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <span className="mb-3 block text-4xl" aria-hidden="true">📷</span>
            <p className="text-sm text-slate-400">Nothing here yet.</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="mb-10">
              <h2 className="mb-3 flex items-center gap-3 text-xs font-semibold
                             uppercase tracking-[0.16em] text-slate-400">
                {group.label}
                <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              </h2>

              <JustifiedGrid
                items={group.posts}
                aspectOf={postAspect}
                renderItem={renderItem}
              />
            </section>
          ))
        )}
      </div>
    </div>
  )
}
