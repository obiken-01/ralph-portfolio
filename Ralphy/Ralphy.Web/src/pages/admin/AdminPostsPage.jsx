import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import api from '../../api/axios'
import { formatShortDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Delete Confirm Modal ────────────────────────────────────────
function DeleteModal({ post, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/posts/${post.id}`)
      toast.success('Post deleted!')
      onDeleted()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to delete post')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center
                    justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl
                      w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center
                          justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-400" fill="none"
                 stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                       01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
                       00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-white font-semibold mb-1">Delete Post</h2>
          <p className="text-slate-400 text-sm">
            Are you sure you want to delete
            <span className="text-white font-medium"> {post.title}</span>?
            This will also delete all photos and videos.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700
                       text-slate-300 text-sm font-medium rounded-lg
                       transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700
                       disabled:bg-red-800 text-white text-sm font-semibold
                       rounded-lg transition-colors flex items-center
                       justify-center gap-2"
          >
            {deleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white
                                border-t-transparent rounded-full
                                animate-spin" />
                Deleting...
              </>
            ) : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function AdminPostsPage() {
  const [posts,      setPosts]      = useState([])
  const [trips,      setTrips]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [deletePost, setDeletePost] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')

  const fetchData = async () => {
    try {
      const [postsRes, tripsRes] = await Promise.all([
        api.get('/posts/all'),
        api.get('/trips/all'),
      ])
      setPosts(postsRes.data.data ?? [])
      setTrips(tripsRes.data.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const getTripTitle = (tripId) =>
    trips.find((t) => t.id === tripId)?.title ?? '—'

  const handlePublishToggle = async (post) => {
    setTogglingId(post.id)
    try {
      const isPublished = post.status === 'Published' || post.status === 1
      if (isPublished) {
        await api.put(`/posts/${post.id}/unpublish`)
        toast.success('Post unpublished')
      } else {
        await api.put(`/posts/${post.id}/publish`)
        toast.success('Post published! 🎉')
      }
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = useMemo(() => {
    let result = [...posts]
    if (filter === 'published') {
      result = result.filter(
        (p) => p.status === 'Published' || p.status === 1
      )
    } else if (filter === 'draft') {
      result = result.filter(
        (p) => p.status !== 'Published' && p.status !== 1
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.title.toLowerCase().includes(q))
    }
    return result
  }, [posts, filter, search])

  return (
    <AdminLayout>
      <div className="w-full max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Posts</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your blog posts.
            </p>
          </div>
          <Link
            to="/admin/posts/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600
                       hover:bg-blue-700 text-white text-sm font-semibold
                       rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </Link>
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                            text-slate-400" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Search posts..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border
                         border-slate-700 rounded-lg text-sm text-slate-300
                         placeholder-slate-500 focus:outline-none
                         focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all',       label: 'All'       },
              { key: 'published', label: 'Published' },
              { key: 'draft',     label: 'Drafts'    },
            ].map((f) => (
              <button
                key={f.key} onClick={() => setFilter(f.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium
                            transition-colors ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 border border-slate-700 text-slate-400\
                       hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-slate-500 mb-4">
            {filtered.length} {filtered.length === 1 ? 'post' : 'posts'} found
          </p>
        )}

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl
                        overflow-hidden">

          {/* Table header */}
          <div className="flex items-center px-5 py-3 border-b border-slate-800
                          bg-slate-800/50">
            <div className="flex-1">
              <span className="text-xs font-semibold text-slate-400
                               uppercase tracking-widest">Post</span>
            </div>
            <div className="w-28 flex justify-center">
              <span className="text-xs font-semibold text-slate-400
                               uppercase tracking-widest">Status</span>
            </div>
            <div className="w-24 flex justify-end">
              <span className="text-xs font-semibold text-slate-400
                               uppercase tracking-widest">Actions</span>
            </div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                    <div className="h-3 bg-slate-800 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl block mb-3">📝</span>
              <p className="text-slate-400 text-sm mb-3">
                {search ? 'No posts found.' : 'No posts yet.'}
              </p>
              {!search && (
                <Link to="/admin/posts/new"
                      className="text-blue-400 text-sm hover:underline">
                  Create your first post →
                </Link>
              )}
            </div>
          ) : (
            filtered.map((post) => {
              const isPublished =
                post.status === 'Published' || post.status === 1
              return (
                <div
                  key={post.id}
                  className="flex items-center px-5 py-4 border-b
                             border-slate-800 last:border-0
                             hover:bg-slate-800/30 transition-colors"
                >
                  {/* Post info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {post.title}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">
                      {getTripTitle(post.tripId)}
                      <span className="mx-1.5">·</span>
                      {formatShortDate(post.publishedAt ?? post.createdAt)}
                      {post.viewCount > 0 && (
                        <span className="ml-1.5">· 👁 {post.viewCount}</span>
                      )}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div className="w-28 flex justify-center">
                    <button
                      onClick={() => handlePublishToggle(post)}
                      disabled={togglingId === post.id}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium
                                  transition-colors disabled:opacity-50 ${
                        isPublished
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {togglingId === post.id
                        ? '...'
                        : isPublished ? 'Published' : 'Draft'
                      }
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="w-24 flex items-center justify-end gap-1">

                    {/* Edit */}
                    <Link
                      to={`/admin/posts/${post.id}/edit`}
                      className="w-7 h-7 flex items-center justify-center
                                 rounded-lg text-slate-400 hover:bg-slate-700
                                 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none"
                           stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2
                                 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828
                                 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>

                    {/* View */}
                    {isPublished && (
                      <Link
                        to={`/trips/${post.tripId}/posts/${post.id}`}
                        target="_blank"
                        className="w-7 h-7 flex items-center justify-center
                                   rounded-lg text-slate-400 hover:bg-slate-700
                                   hover:text-white transition-colors"
                        title="View"
                      >
                        <svg className="w-3.5 h-3.5" fill="none"
                             stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2
                                   2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => setDeletePost(post)}
                      className="w-7 h-7 flex items-center justify-center
                                 rounded-lg text-slate-400 hover:bg-red-500/10
                                 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none"
                           stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2
                                 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1
                                 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Delete modal */}
      {deletePost && (
        <DeleteModal
          post={deletePost}
          onClose={() => setDeletePost(null)}
          onDeleted={fetchData}
        />
      )}

    </AdminLayout>
  )
}