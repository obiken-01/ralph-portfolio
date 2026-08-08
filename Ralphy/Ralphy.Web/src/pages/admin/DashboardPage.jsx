import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import StatCard from '../../components/admin/StatCard'
import api from '../../api/axios'
import { formatShortDate, postDate } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'
import DimensionBackfillCard from '../../components/admin/DimensionBackfillCard'

export default function DashboardPage() {
  const [posts, setPosts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, locationsRes] = await Promise.all([
          api.get('/posts/all'),
          api.get('/locations/all'),
        ])
        setPosts(postsRes.data.data ?? [])
        setLocations(locationsRes.data.data ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalViews = posts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0)
  const totalPhotos = posts.reduce((sum, p) => sum + (p.photoCount ?? 0), 0)
  const drafts = posts.filter((p) => p.status === 'Draft').length

  // The v2.0 migration parked every existing post on one placeholder, so this
  // is the outstanding cleanup and it belongs on the dashboard until it's zero.
  const needsLocation = posts.filter((p) => p.locationIsPlaceholder).length

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Welcome back! Here's an overview of your content.
          </p>
        </div>

        <DimensionBackfillCard />

        {needsLocation > 0 && (
          <Link
            to="/admin/posts"
            className="mb-6 flex items-center gap-3 rounded-xl border
                       border-amber-500/30 bg-amber-500/5 px-5 py-4
                       transition-colors hover:bg-amber-500/10"
          >
            <span className="text-xl">📍</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">
                {needsLocation} {needsLocation === 1 ? 'post needs' : 'posts need'} a real location
              </p>
              <p className="text-xs text-amber-400/70">
                The v2.0 migration put them on a placeholder. They're hidden
                from the public map until they're moved.
              </p>
            </div>
            <span className="text-amber-400">→</span>
          </Link>
        )}

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Posts"
            value={posts.length}
            color="green"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2
                         2 0 002-2v-5m-1.414-9.414a2 2 0 112.828
                         2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          <StatCard
            label="Photos"
            value={totalPhotos.toLocaleString()}
            color="blue"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2
                         2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0
                         00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            label="Total Views"
            value={totalViews.toLocaleString()}
            color="amber"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478
                         0 8.268 2.943 9.542 7-1.274 4.057-5.064
                         7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          />
          <StatCard
            label="Drafts"
            value={drafts}
            color="red"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5
                         2.5 0 113.536 3.536L6.5 21.036H3v-3.572
                         L16.732 3.732z" />
              </svg>
            }
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Recent Posts */}
          <div className="overflow-hidden rounded-xl border border-slate-800
                          bg-slate-900">
            <div className="flex items-center justify-between border-b
                            border-slate-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Recent Posts</h2>
              <Link to="/admin/posts"
                    className="text-xs text-blue-400 hover:underline">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex animate-pulse gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-lg
                                    bg-slate-800" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-slate-800" />
                      <div className="h-3 w-1/2 rounded bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">No posts yet.</p>
                <Link to="/admin/posts/new"
                      className="mt-1 block text-xs text-blue-400
                                 hover:underline">
                  Create your first post →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden
                                    rounded-lg bg-slate-800">
                      {post.thumbnailUrl ? (
                        <img src={cldImage(post.thumbnailUrl, 100)}
                             alt="" loading="lazy"
                             className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center
                                        justify-center text-lg">📷</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">
                        {post.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatShortDate(postDate(post))}
                        {post.photoCount > 0 && (
                          <span className="ml-2">· 📷 {post.photoCount}</span>
                        )}
                        {post.viewCount > 0 && (
                          <span className="ml-2">· 👁 {post.viewCount}</span>
                        )}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5
                                      text-xs font-medium ${
                      post.status === 'Published'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {post.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Places */}
          <div className="overflow-hidden rounded-xl border border-slate-800
                          bg-slate-900">
            <div className="flex items-center justify-between border-b
                            border-slate-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Places</h2>
              <Link to="/map" target="_blank"
                    className="text-xs text-blue-400 hover:underline">
                View map →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex animate-pulse gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-slate-800" />
                      <div className="h-3 w-1/2 rounded bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : locations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">No places yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {[...locations]
                  .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0))
                  .slice(0, 5)
                  .map((location) => (
                    <div key={location.id}
                         className="flex items-center gap-3 px-5 py-3">
                      <span className="text-sm">
                        {location.isPlaceholder ? '⚠️' : '📍'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">
                          {location.placeName}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {location.latitude.toFixed(3)},{' '}
                          {location.longitude.toFixed(3)}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-xs text-slate-500">
                        {location.postCount ?? 0}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/posts/new"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium
                         text-white transition-colors hover:bg-green-700"
            >
              + New Post
            </Link>
            <Link
              to="/admin/posts"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium
                         text-white transition-colors hover:bg-blue-700"
            >
              Manage Posts
            </Link>
            <Link
              to="/"
              target="_blank"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium
                         text-slate-300 transition-colors hover:bg-slate-700"
            >
              View Site ↗
            </Link>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
