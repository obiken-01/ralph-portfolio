import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import PostCard, { PostCardSkeleton } from '../../components/public/PostCard'
import { TagFilterBar } from '../../components/public/TagChips'
import Seo, { breadcrumbLd } from '../../components/common/Seo'
import { groupByMonth } from '../../utils/helpers'

/**
 * The photo feed — the site's primary browse surface, replacing /trips.
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
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <TagFilterBar tags={tags} active={filterByTag ? tagName : null} />
        </div>

        {loading ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {[...Array(6)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <span className="mb-3 block text-4xl" aria-hidden="true">📷</span>
            <p className="text-sm text-slate-400">Nothing here yet.</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="mb-12">
              <h2 className="mb-4 font-display text-lg font-semibold
                             text-slate-500">
                {group.label}
              </h2>
              {/* Masonry columns keep every photo at its own aspect ratio. */}
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                {group.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
