import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import StatCard from '../../components/admin/StatCard'
import api from '../../api/axios'
import { formatShortDate } from '../../utils/helpers'

export default function DashboardPage() {
  const [trips,   setTrips]   = useState([])
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, postsRes] = await Promise.all([
          api.get('/trips/all'),
          api.get('/posts/all'),
        ])
        setTrips(tripsRes.data.data ?? [])
        setPosts(postsRes.data.data ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalViews = posts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0)
  const drafts     = posts.filter((p) => p.status === 'Draft').length

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome back! Here's an overview of your content.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Trips"
            value={trips.length}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1
                         1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6
                         10l4.553 2.276A1 1 0 0021 18.382V7.618a1
                         1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            }
          />
          <StatCard
            label="Total Posts"
            value={posts.length}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
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
            label="Total Views"
            value={totalViews.toLocaleString()}
            color="amber"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
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

        {/* Two col: recent trips + recent posts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Recent Trips */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl
                          overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4
                            border-b border-slate-800">
              <h2 className="text-white font-semibold text-sm">
                Recent Trips
              </h2>
              <Link to="/admin/trips"
                    className="text-blue-400 text-xs hover:underline">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800
                                    flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">No trips yet.</p>
                <Link to="/admin/trips"
                      className="text-blue-400 text-xs mt-1 hover:underline
                                 block">
                  Create your first trip →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {trips.slice(0, 5).map((trip) => (
                  <div key={trip.id}
                       className="flex items-center gap-3 px-5 py-3">
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-slate-800
                                    overflow-hidden flex-shrink-0">
                      {trip.coverImageUrl ? (
                        <img src={trip.coverImageUrl} alt={trip.title}
                             className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center
                                        justify-center text-lg">🗺️</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium
                                    truncate">
                        {trip.title}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {trip.city}, {trip.country} ·{' '}
                        {formatShortDate(trip.startDate)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full
                                      font-medium flex-shrink-0 ${
                      trip.status === 'Published'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {trip.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Posts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl
                          overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4
                            border-b border-slate-800">
              <h2 className="text-white font-semibold text-sm">
                Recent Posts
              </h2>
              <Link to="/admin/posts"
                    className="text-blue-400 text-xs hover:underline">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">No posts yet.</p>
                <Link to="/admin/posts/new"
                      className="text-blue-400 text-xs mt-1 hover:underline
                                 block">
                  Create your first post →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id}
                       className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">
                        {post.title}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {formatShortDate(post.publishedAt ?? post.createdAt)}
                        {post.viewCount > 0 && (
                          <span className="ml-2">· 👁 {post.viewCount}</span>
                        )}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full
                                      font-medium flex-shrink-0 ${
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

        </div>

        {/* Quick actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/trips"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white
                         text-sm font-medium rounded-lg transition-colors"
            >
              + New Trip
            </Link>
            <Link
              to="/admin/posts/new"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white
                         text-sm font-medium rounded-lg transition-colors"
            >
              + New Post
            </Link>
            <Link
              to="/"
              target="_blank"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300
                         text-sm font-medium rounded-lg transition-colors"
            >
              View Site ↗
            </Link>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}