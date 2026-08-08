import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import api from '../../api/axios'
import { formatShortDate, postDate } from '../../utils/helpers'
import { cldImage } from '../../utils/cloudinary'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-700
                      bg-slate-900 p-6">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center
                          justify-center rounded-full bg-red-500/10">
            <svg className="h-6 w-6 text-red-400" fill="none"
                 stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                       01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
                       00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="mb-1 font-semibold text-white">Delete Post</h2>
          <p className="text-sm text-slate-400">
            Are you sure you want to delete
            <span className="font-medium text-white"> {post.title}</span>?
            This will also delete all photos and videos.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm
                       font-medium text-slate-300 transition-colors
                       hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg
                       bg-red-600 px-4 py-2.5 text-sm font-semibold text-white
                       transition-colors hover:bg-red-700 disabled:bg-red-800"
          >
            {deleting ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2
                                border-white border-t-transparent" />
                Deleting...
              </>
            ) : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bulk location assignment ────────────────────────────────────
function BulkLocationBar({ selectedIds, locations, onDone, onClear }) {
  const [locationId, setLocationId] = useState('')
  const [applying, setApplying] = useState(false)

  const apply = async () => {
    if (!locationId) return
    setApplying(true)

    // No batch endpoint — but the whole point of this bar is that the operator
    // does not do it one form at a time. Sequential keeps the failure story
    // simple: whatever succeeded stays, and the count says how many.
    let ok = 0
    const failures = []

    for (const id of selectedIds) {
      try {
        const { data } = await api.get(`/posts/${id}`)
        const post = data.data
        await api.put(`/posts/${id}`, {
          title: post.title,
          content: post.content ?? null,
          videoUrl: post.videoUrl ?? null,
          publishedAt: post.publishedAt ?? null,
          locationId: Number(locationId),
        })
        ok += 1
      } catch {
        failures.push(id)
      }
    }

    setApplying(false)
    if (ok > 0) toast.success(`${ok} ${ok === 1 ? 'post' : 'posts'} updated`)
    if (failures.length > 0) {
      toast.error(`${failures.length} could not be updated`)
    }
    onDone()
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border
                    border-blue-500/30 bg-blue-500/5 px-4 py-3">
      <span className="text-xs font-medium text-blue-300">
        {selectedIds.length} selected
      </span>

      <select
        value={locationId}
        onChange={(e) => setLocationId(e.target.value)}
        className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3
                   py-2 text-xs text-white [color-scheme:dark]
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Move all to…</option>
        {locations
          .filter((l) => !l.isPlaceholder)
          .map((l) => (
            <option key={l.id} value={l.id}>{l.placeName}</option>
          ))}
      </select>

      <button
        type="button"
        onClick={apply}
        disabled={!locationId || applying}
        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold
                   text-white transition-colors hover:bg-blue-700
                   disabled:opacity-50"
      >
        {applying ? 'Applying…' : 'Apply'}
      </button>

      <button
        type="button"
        onClick={onClear}
        className="text-xs text-slate-400 hover:text-white"
      >
        Clear
      </button>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function AdminPostsPage() {
  const [posts, setPosts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletePost, setDeletePost] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState([])

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

  useEffect(() => { fetchData() }, [])

  // The v2.0 migration parked every existing post on one placeholder location,
  // so this count is the cleanup backlog and it should have a visible finish
  // line. Keyed on the flag, not on a magic id or a place-name match.
  const needsLocationCount = useMemo(
    () => posts.filter((p) => p.locationIsPlaceholder).length,
    [posts]
  )

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
      result = result.filter((p) => p.status === 'Published' || p.status === 1)
    } else if (filter === 'draft') {
      result = result.filter((p) => p.status !== 'Published' && p.status !== 1)
    } else if (filter === 'needsLocation') {
      result = result.filter((p) => p.locationIsPlaceholder)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.title.toLowerCase().includes(q))
    }
    return result
  }, [posts, filter, search])

  const toggleSelected = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'draft', label: 'Drafts' },
    {
      key: 'needsLocation',
      label: needsLocationCount > 0
        ? `Needs location (${needsLocationCount})`
        : 'Needs location',
    },
  ]

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-6xl">

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Posts</h1>
            <p className="mt-1 text-sm text-slate-400">
              {needsLocationCount > 0
                ? `${needsLocationCount} ${needsLocationCount === 1 ? 'post needs' : 'posts need'} a real location.`
                : 'Manage your photo posts.'}
            </p>
          </div>
          <Link
            to="/admin/posts/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5
                       text-sm font-semibold text-white transition-colors
                       hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </Link>
        </div>

        <div className="mb-6 flex flex-col gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2
                            text-slate-400" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Search posts..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900
                         py-2.5 pl-9 pr-4 text-sm text-slate-300
                         placeholder-slate-500 transition focus:outline-none
                         focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key} onClick={() => { setFilter(f.key); setSelected([]) }}
                className={`flex-1 whitespace-nowrap rounded-lg py-2 text-xs
                            font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : f.key === 'needsLocation' && needsLocationCount > 0
                      ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <BulkLocationBar
            selectedIds={selected}
            locations={locations}
            onClear={() => setSelected([])}
            onDone={() => { setSelected([]); fetchData() }}
          />
        )}

        {!loading && (
          <p className="mb-4 text-xs text-slate-500">
            {filtered.length} {filtered.length === 1 ? 'post' : 'posts'} found
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-800
                        bg-slate-900">

          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex animate-pulse gap-4">
                  <div className="h-12 w-12 rounded bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-slate-800" />
                    <div className="h-3 w-1/3 rounded bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <span className="mb-3 block text-4xl">📷</span>
              <p className="mb-3 text-sm text-slate-400">
                {search || filter !== 'all'
                  ? 'No posts match that.'
                  : 'No posts yet.'}
              </p>
              {!search && filter === 'all' && (
                <Link to="/admin/posts/new"
                      className="text-sm text-blue-400 hover:underline">
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
                  className="flex items-center gap-3 border-b border-slate-800
                             px-4 py-3 transition-colors last:border-0
                             hover:bg-slate-800/30"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(post.id)}
                    onChange={() => toggleSelected(post.id)}
                    className="h-4 w-4 flex-shrink-0 accent-blue-600"
                    aria-label={`Select ${post.title}`}
                  />

                  {/* Photo-first admin list: the thumbnail is the point of
                      the row, and until v2.0 it was always null because
                      /posts/all never included Photos. */}
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden
                                  rounded bg-slate-800">
                    {post.thumbnailUrl ? (
                      <img src={cldImage(post.thumbnailUrl, 120)} alt=""
                           loading="lazy"
                           className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center
                                      justify-center text-slate-600">
                        📷
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm
                                  font-medium text-white">
                      {post.title}
                      {post.locationIsPlaceholder && (
                        <span className="flex-shrink-0 rounded bg-amber-500/15
                                         px-1.5 py-0.5 text-xs text-amber-400">
                          needs location
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {post.locationIsPlaceholder
                        ? '—'
                        : post.locationName ?? '—'}
                      <span className="mx-1.5">·</span>
                      {formatShortDate(postDate(post))}
                      {post.photoCount > 0 && (
                        <span className="ml-1.5">· 📷 {post.photoCount}</span>
                      )}
                      {post.viewCount > 0 && (
                        <span className="ml-1.5">· 👁 {post.viewCount}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex w-24 justify-center">
                    <button
                      onClick={() => handlePublishToggle(post)}
                      disabled={togglingId === post.id}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium
                                  transition-colors disabled:opacity-50 ${
                        isPublished
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {togglingId === post.id
                        ? '...'
                        : isPublished ? 'Published' : 'Draft'}
                    </button>
                  </div>

                  <div className="flex w-20 items-center justify-end gap-1">
                    <Link
                      to={`/admin/posts/${post.id}/edit`}
                      className="flex h-7 w-7 items-center justify-center
                                 rounded-lg text-slate-400 transition-colors
                                 hover:bg-slate-700 hover:text-white"
                      title="Edit"
                    >
                      <svg className="h-3.5 w-3.5" fill="none"
                           stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2
                                 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828
                                 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>

                    {isPublished && (
                      <Link
                        to={`/posts/${post.id}`}
                        target="_blank"
                        className="flex h-7 w-7 items-center justify-center
                                   rounded-lg text-slate-400 transition-colors
                                   hover:bg-slate-700 hover:text-white"
                        title="View"
                      >
                        <svg className="h-3.5 w-3.5" fill="none"
                             stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2
                                   2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    )}

                    <button
                      onClick={() => setDeletePost(post)}
                      className="flex h-7 w-7 items-center justify-center
                                 rounded-lg text-slate-400 transition-colors
                                 hover:bg-red-500/10 hover:text-red-400"
                      title="Delete"
                    >
                      <svg className="h-3.5 w-3.5" fill="none"
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
