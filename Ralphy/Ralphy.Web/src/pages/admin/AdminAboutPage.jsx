// Ralphy.Web/src/pages/admin/AdminTimekeepingUsersPage.jsx (ADD)

import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import api from '../../api/axios'
import toast from 'react-hot-toast'

// ── Section wrapper ─────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl
                    overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-slate-800">
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      <div className="px-5 py-5">
        {children}
      </div>
    </div>
  )
}

// ── Input ───────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                   rounded-lg text-white placeholder-slate-500 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   transition"
      />
    </div>
  )
}

// ── Create User Modal ───────────────────────────────────────────
function CreateUserModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/timekeeping/admin/users', form)
      toast.success('User created!')
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
                      w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-slate-800">
          <h2 className="text-white font-semibold">Create User</h2>
          <button onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Input
            label="Username *"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="e.g. john_doe"
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. john@example.com"
          />
          <Input
            label="Password *"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Min 8 characters"
          />
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
                  Creating...
                </>
              ) : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit User Modal ─────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/timekeeping/admin/users/${user.publicId}`, form)
      toast.success('User updated!')
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
                      w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-slate-800">
          <h2 className="text-white font-semibold">Edit User</h2>
          <button onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Input
            label="Username *"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="e.g. john_doe"
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. john@example.com"
          />
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
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reset Password Modal ────────────────────────────────────────
function ResetPasswordModal({ user, onClose }) {
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(
        `/timekeeping/admin/users/${user.publicId}/reset-password`,
        { newPassword }
      )
      toast.success('Password reset successfully!')
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
                      w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-slate-800">
          <h2 className="text-white font-semibold">
            Reset Password — {user.username}
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
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Input
            label="New Password *"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
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
              className="flex-1 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700
                         disabled:bg-yellow-800 text-white text-sm font-semibold
                         rounded-lg transition-colors flex items-center
                         justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white
                                  border-t-transparent rounded-full
                                  animate-spin" />
                  Resetting...
                </>
              ) : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm ──────────────────────────────────────────────
function DeleteModal({ label, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
    onClose()
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
          <h2 className="text-white font-semibold mb-1">Confirm Delete</h2>
          <p className="text-slate-400 text-sm">
            Are you sure you want to delete
            <span className="text-white font-medium"> {label}</span>?
            This will also delete all their time logs.
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
export default function AdminTimekeepingUsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showCreate,     setShowCreate]     = useState(false)
  const [editTarget,     setEditTarget]     = useState(null)
  const [resetTarget,    setResetTarget]    = useState(null)
  const [deleteTarget,   setDeleteTarget]   = useState(null)

  const fetchUsers = async () => {
    try {
      const res = await api.get('/timekeeping/admin/users')
      setUsers(res.data.data ?? [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleToggleActive = async (user) => {
    try {
      const endpoint = user.isActive
        ? `/timekeeping/admin/users/${user.publicId}/deactivate`
        : `/timekeeping/admin/users/${user.publicId}/activate`
      await api.patch(endpoint)
      toast.success(user.isActive ? 'User deactivated' : 'User activated')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to update status')
    }
  }

  const handleDelete = async (publicId) => {
    await api.delete(`/timekeeping/admin/users/${publicId}`)
    toast.success('User deleted')
    fetchUsers()
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800
                                    rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-1/4 mb-4" />
              <div className="h-3 bg-slate-800 rounded w-full mb-2" />
              <div className="h-3 bg-slate-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Timekeeping Users</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage user accounts for the timekeeping tool.
          </p>
        </div>

        <Section title={`Users (${users.length})`}>
          <div className="space-y-3 mb-4">
            {users.length === 0 ? (
              <p className="text-slate-500 text-sm">No users added yet.</p>
            ) : (
              users.map(user => (
                <div key={user.publicId}
                     className="flex items-center gap-3 p-3 bg-slate-800
                                rounded-lg border border-slate-700">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex
                                  items-center justify-center shrink-0">
                    <span className="text-slate-300 text-sm font-semibold">
                      {user.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">
                        {user.username}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full
                                        font-medium shrink-0 ${
                        user.isActive
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">
                      {user.email}
                      <span className="mx-1.5">·</span>
                      Joined {new Date(user.createdAt).toLocaleDateString(
                        'en-US', { month: 'short', day: 'numeric',
                                   year: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Edit */}
                    <button
                      onClick={() => setEditTarget(user)}
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

                    {/* Reset password */}
                    <button
                      onClick={() => setResetTarget(user)}
                      className="w-7 h-7 flex items-center justify-center
                                 rounded-lg text-slate-400 hover:bg-yellow-500/10
                                 hover:text-yellow-400 transition-colors"
                      title="Reset password"
                    >
                      <svg className="w-3.5 h-3.5" fill="none"
                           stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743
                                 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1
                                 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </button>

                    {/* Activate / Deactivate */}
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`w-7 h-7 flex items-center justify-center
                                  rounded-lg transition-colors ${
                        user.isActive
                          ? 'text-slate-400 hover:bg-red-500/10 hover:text-red-400'
                          : 'text-slate-400 hover:bg-green-500/10 hover:text-green-400'
                      }`}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? (
                        <svg className="w-3.5 h-3.5" fill="none"
                             stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728
                                   12.728A9 9 0 015.636 5.636m12.728
                                   12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none"
                             stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0
                                   0118 0z" />
                        </svg>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteTarget({
                        label: user.username,
                        onConfirm: () => handleDelete(user.publicId)
                      })}
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
              ))
            )}
          </div>

          {/* Add user button */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800
                       hover:bg-slate-700 text-slate-300 text-sm font-medium
                       rounded-lg transition-colors border border-slate-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </Section>

      </div>

      {/* ── Modals ── */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSaved={fetchUsers}
        />
      )}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={fetchUsers}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          label={deleteTarget.label}
          onClose={() => setDeleteTarget(null)}
          onConfirm={deleteTarget.onConfirm}
        />
      )}
    </AdminLayout>
  )
}