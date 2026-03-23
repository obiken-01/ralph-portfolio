import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import api from '../../api/axios'
import { formatShortDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Trip Form Modal ─────────────────────────────────────────────
function TripModal({ trip, onClose, onSaved }) {
  const isEdit = !!trip
  const [form, setForm] = useState({
    title:         trip?.title         ?? '',
    description:   trip?.description   ?? '',
    country:       trip?.country       ?? '',
    city:          trip?.city          ?? '',
    startDate:     trip?.startDate
      ? trip.startDate.substring(0, 10) : '',
    endDate:       trip?.endDate
      ? trip.endDate.substring(0, 10)   : '',
    coverImageUrl: trip?.coverImageUrl ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/trips/${trip.id}`, form)
        toast.success('Trip updated!')
      } else {
        await api.post('/trips', form)
        toast.success('Trip created!')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center
                    justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl
                      w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-slate-800">
          <h2 className="text-white font-semibold">
            {isEdit ? 'Edit Trip' : 'New Trip'}
          </h2>
          <button onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Title *
            </label>
            <input
              type="text" name="title" value={form.title}
              onChange={handleChange} required
              placeholder="e.g. Apo Reef Adventure"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                         rounded-lg text-white placeholder-slate-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              name="description" value={form.description}
              onChange={handleChange} rows={3}
              placeholder="Short description of this trip..."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                         rounded-lg text-white placeholder-slate-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition resize-none"
            />
          </div>

          {/* Country + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Country *
              </label>
              <input
                type="text" name="country" value={form.country}
                onChange={handleChange} required placeholder="Philippines"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white placeholder-slate-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                City *
              </label>
              <input
                type="text" name="city" value={form.city}
                onChange={handleChange} required placeholder="San Jose"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white placeholder-slate-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           transition"
              />
            </div>
          </div>

          {/* Start + End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Start Date *
              </label>
              <input
                type="date" name="startDate" value={form.startDate}
                onChange={handleChange} required
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white text-sm focus:outline-none
                           focus:ring-2 focus:ring-blue-500 transition
                           [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                End Date
              </label>
              <input
                type="date" name="endDate" value={form.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white text-sm focus:outline-none
                           focus:ring-2 focus:ring-blue-500 transition
                           [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Cover Image URL
            </label>
            <input
              type="url" name="coverImageUrl" value={form.coverImageUrl}
              onChange={handleChange}
              placeholder="https://res.cloudinary.com/..."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                         rounded-lg text-white placeholder-slate-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition"
            />
            {form.coverImageUrl && (
              <img
                src={form.coverImageUrl} alt="Cover preview"
                className="mt-2 h-24 w-full object-cover rounded-lg
                           border border-slate-700"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700
                         text-slate-300 text-sm font-medium rounded-lg
                         transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                         disabled:bg-blue-800 text-white text-sm font-semibold
                         rounded-lg transition-colors flex items-center
                         justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white
                                  border-t-transparent rounded-full
                                  animate-spin" />
                  Saving...
                </>
              ) : isEdit ? 'Save Changes' : 'Create Trip'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ────────────────────────────────────────
function DeleteModal({ trip, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/trips/${trip.id}`)
      toast.success('Trip deleted!')
      onDeleted()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to delete trip')
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
          <h2 className="text-white font-semibold mb-1">Delete Trip</h2>
          <p className="text-slate-400 text-sm">
            Are you sure you want to delete
            <span className="text-white font-medium"> {trip.title}</span>?
            This will also delete all posts and media.
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
export default function AdminTripsPage() {
  const [trips,      setTrips]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editTrip,   setEditTrip]   = useState(null)
  const [deleteTrip, setDeleteTrip] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const fetchTrips = async () => {
    try {
      const res = await api.get('/trips/all')
      setTrips(res.data.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTrips() }, [])

  const handlePublishToggle = async (trip) => {
    setTogglingId(trip.id)
    try {
      const isPublished = trip.status === 'Published' || trip.status === 1
      if (isPublished) {
        await api.put(`/trips/${trip.id}/unpublish`)
        toast.success('Trip unpublished')
      } else {
        await api.put(`/trips/${trip.id}/publish`)
        toast.success('Trip published! 🎉')
      }
      fetchTrips()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Trips</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your travel trips.
            </p>
          </div>
          <button
            onClick={() => { setEditTrip(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600
                       hover:bg-blue-700 text-white text-sm font-semibold
                       rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Trip
          </button>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl
                        overflow-hidden">

          {/* Table header */}
          <div className="flex items-center px-5 py-3 border-b border-slate-800
                          bg-slate-800/50">
            <div className="flex-1">
              <span className="text-xs font-semibold text-slate-400
                               uppercase tracking-widest">Trip</span>
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
                  <div className="w-10 h-10 rounded-lg bg-slate-800
                                  flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                    <div className="h-3 bg-slate-800 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl block mb-3">🗺️</span>
              <p className="text-slate-400 text-sm mb-3">No trips yet.</p>
              <button
                onClick={() => { setEditTrip(null); setShowModal(true) }}
                className="text-blue-400 text-sm hover:underline"
              >
                Create your first trip →
              </button>
            </div>
          ) : (
            trips.map((trip) => {
              const isPublished = trip.status === 'Published' || trip.status === 1
              return (
                <div
                  key={trip.id}
                  className="flex items-center px-5 py-4 border-b
                             border-slate-800 last:border-0
                             hover:bg-slate-800/30 transition-colors"
                >
                  {/* Trip info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
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
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {trip.title}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        📍 {trip.city}, {trip.country}
                        <span className="mx-1.5">·</span>
                        {formatShortDate(trip.startDate)}
                        <span className="mx-1.5">·</span>
                        {trip.postCount ?? 0} posts
                      </p>
                    </div>
                  </div>

                  {/* Status toggle */}
                  <div className="w-28 flex justify-center">
                    <button
                      onClick={() => handlePublishToggle(trip)}
                      disabled={togglingId === trip.id}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium
                                  transition-colors disabled:opacity-50 ${
                        isPublished
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {togglingId === trip.id
                        ? '...'
                        : isPublished ? 'Published' : 'Draft'
                      }
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="w-24 flex items-center justify-end gap-1">
                    {/* Edit */}
                    <button
                      onClick={() => { setEditTrip(trip); setShowModal(true) }}
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
                    </button>

                    {/* View */}
                    <Link
                      to={`/trips/${trip.id}`} target="_blank"
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

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteTrip(trip)}
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

      {/* Modals */}
      {showModal && (
        <TripModal
          trip={editTrip}
          onClose={() => { setShowModal(false); setEditTrip(null) }}
          onSaved={fetchTrips}
        />
      )}
      {deleteTrip && (
        <DeleteModal
          trip={deleteTrip}
          onClose={() => setDeleteTrip(null)}
          onDeleted={fetchTrips}
        />
      )}

    </AdminLayout>
  )
}