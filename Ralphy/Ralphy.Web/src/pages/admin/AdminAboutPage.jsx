import { useEffect, useState, useRef } from 'react'
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

// ── Work Experience Modal ───────────────────────────────────────
function WorkExpModal({ entry, onClose, onSaved }) {
  const isEdit = !!entry
  const [form, setForm] = useState({
    role:         entry?.role         ?? '',
    company:      entry?.company      ?? '',
    period:       entry?.period       ?? '',
    description:  entry?.description  ?? '',
    tags:         entry?.tags?.join(', ') ?? '',
    displayOrder: entry?.displayOrder ?? 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        displayOrder: Number(form.displayOrder),
      }
      if (isEdit) {
        await api.put(`/about/experience/${entry.id}`, payload)
        toast.success('Entry updated!')
      } else {
        await api.post('/about/experience', payload)
        toast.success('Entry added!')
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
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-slate-800">
          <h2 className="text-white font-semibold">
            {isEdit ? 'Edit Entry' : 'Add Entry'}
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
            label="Role *"
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            placeholder="e.g. Fullstack Developer"
          />
          <Input
            label="Company *"
            value={form.company}
            onChange={e => setForm({ ...form, company: e.target.value })}
            placeholder="e.g. Freelance"
          />
          <Input
            label="Period *"
            value={form.period}
            onChange={e => setForm({ ...form, period: e.target.value })}
            placeholder="e.g. 2024 – Present"
          />
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Short description..."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                         rounded-lg text-white placeholder-slate-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition resize-none"
            />
          </div>
          <Input
            label="Tags (comma separated)"
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder="e.g. .NET, React, PostgreSQL"
          />
          <Input
            label="Display Order"
            type="number"
            value={form.displayOrder}
            onChange={e => setForm({ ...form, displayOrder: e.target.value })}
            placeholder="0"
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
              ) : isEdit ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Skill Modal ─────────────────────────────────────────────────
function SkillModal({ skill, onClose, onSaved }) {
  const isEdit = !!skill
  const [form, setForm] = useState({
    name:         skill?.name         ?? '',
    percentage:   skill?.percentage   ?? 50,
    category:     skill?.category     ?? 'Backend',
    displayOrder: skill?.displayOrder ?? 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        percentage:   Number(form.percentage),
        displayOrder: Number(form.displayOrder),
        category:     ['Backend', 'Frontend', 'Tool'].indexOf(form.category),
      }
      if (isEdit) {
        await api.put(`/about/skills/${skill.id}`, payload)
        toast.success('Skill updated!')
      } else {
        await api.post('/about/skills', payload)
        toast.success('Skill added!')
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
                      w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-slate-800">
          <h2 className="text-white font-semibold">
            {isEdit ? 'Edit Skill' : 'Add Skill'}
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
            label="Skill Name *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. React"
          />
          {/* Percentage slider with live preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Percentage
              </label>
              <span className="text-xs font-mono text-blue-400">
                {form.percentage}%
              </span>
            </div>
            <input
              type="range" min={0} max={100}
              value={form.percentage}
              onChange={e => setForm({ ...form, percentage: e.target.value })}
              className="w-full accent-blue-500"
            />
            {/* Live bar preview */}
            <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${form.percentage}%` }}
              />
            </div>
          </div>
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                         rounded-lg text-white text-sm focus:outline-none
                         focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="Backend">Backend</option>
              <option value="Frontend">Frontend</option>
              <option value="Tool">Tool</option>
            </select>
          </div>
          <Input
            label="Display Order"
            type="number"
            value={form.displayOrder}
            onChange={e => setForm({ ...form, displayOrder: e.target.value })}
            placeholder="0"
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
              ) : isEdit ? 'Save Changes' : 'Add Skill'}
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
export default function AdminAboutPage() {
  const [profile,      setProfile]      = useState(null)
  const [workExps,     setWorkExps]     = useState([])
  const [skills,       setSkills]       = useState([])
  const [messages,     setMessages]     = useState([])
  const [loading,      setLoading]      = useState(true)

  // Bio form
  const [bioForm, setBioForm] = useState({
    displayName:  '',
    headline:     '',
    bio:          '',
    instagramUrl: '',
    linkedInUrl:  '',
    gitHubUrl:    '',
    youTubeUrl:   '',
  })
  const [savingBio, setSavingBio] = useState(false)

  // Images
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [coverImageFile,   setCoverImageFile]   = useState(null)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingCover,   setUploadingCover]   = useState(false)
  const profileImageRef = useRef(null)
  const coverImageRef   = useRef(null)

  // CV
  const [cvFile,       setCvFile]       = useState(null)
  const [uploadingCv,  setUploadingCv]  = useState(false)
  const [deletingCv,   setDeletingCv]   = useState(false)
  const cvInputRef = useRef(null)

  // Modals
  const [workExpModal,  setWorkExpModal]  = useState(null)
  const [skillModal,    setSkillModal]    = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  // Expanded message
  const [expandedMsg, setExpandedMsg] = useState(null)

  // ── Fetch all data ────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const [profileRes, messagesRes] = await Promise.all([
        api.get('/about'),
        api.get('/contact/messages'),
      ])

      const p = profileRes.data.data
      setProfile(p)
      setWorkExps(p.workExperiences ?? [])
      setSkills(p.skills ?? [])
      setBioForm({
        displayName:  p.displayName  ?? '',
        headline:     p.headline     ?? '',
        bio:          p.bio          ?? '',
        instagramUrl: p.instagramUrl ?? '',
        linkedInUrl:  p.linkedInUrl  ?? '',
        gitHubUrl:    p.gitHubUrl    ?? '',
        youTubeUrl:   p.youTubeUrl   ?? '',
      })
      setMessages(messagesRes.data.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Bio + Social save ─────────────────────────────────────────
  const handleSaveBio = async () => {
    setSavingBio(true)
    try {
      await api.put('/about', bioForm)
      toast.success('Profile saved!')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save')
    } finally {
      setSavingBio(false)
    }
  }

  // ── Profile image upload ──────────────────────────────────────
  const handleProfileImageUpload = async () => {
    if (!profileImageFile) return
    setUploadingProfile(true)
    try {
      const formData = new FormData()
      formData.append('file', profileImageFile)
      await api.post('/about/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Profile image uploaded!')
      setProfileImageFile(null)
      if (profileImageRef.current) profileImageRef.current.value = ''
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Upload failed')
    } finally {
      setUploadingProfile(false)
    }
  }

  // ── Cover image upload ────────────────────────────────────────
  const handleCoverImageUpload = async () => {
    if (!coverImageFile) return
    setUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('file', coverImageFile)
      await api.post('/about/cover-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Cover image uploaded!')
      setCoverImageFile(null)
      if (coverImageRef.current) coverImageRef.current.value = ''
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Upload failed')
    } finally {
      setUploadingCover(false)
    }
  }

  // ── CV upload ─────────────────────────────────────────────────
  const handleCvUpload = async () => {
    if (!cvFile) return
    setUploadingCv(true)
    try {
      const formData = new FormData()
      formData.append('file', cvFile)
      await api.post('/about/cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('CV uploaded!')
      setCvFile(null)
      if (cvInputRef.current) cvInputRef.current.value = ''
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Upload failed')
    } finally {
      setUploadingCv(false)
    }
  }

  // ── CV delete ─────────────────────────────────────────────────
  const handleCvDelete = async () => {
    setDeletingCv(true)
    try {
      await api.delete('/about/cv')
      toast.success('CV removed')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to remove CV')
    } finally {
      setDeletingCv(false)
    }
  }

  // ── Work exp delete ───────────────────────────────────────────
  const handleDeleteWorkExp = async (id) => {
    await api.delete(`/about/experience/${id}`)
    toast.success('Entry deleted')
    fetchAll()
  }

  // ── Skill delete ──────────────────────────────────────────────
  const handleDeleteSkill = async (id) => {
    await api.delete(`/about/skills/${id}`)
    toast.success('Skill deleted')
    fetchAll()
  }

  // ── Message actions ───────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/contact/messages/${id}/read`)
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, isRead: true } : m
      ))
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const handleDeleteMessage = async (id) => {
    try {
      await api.delete(`/contact/messages/${id}`)
      toast.success('Message deleted')
      setMessages(prev => prev.filter(m => m.id !== id))
      if (expandedMsg === id) setExpandedMsg(null)
    } catch {
      toast.error('Failed to delete message')
    }
  }

  const unreadCount = messages.filter(m => !m.isRead).length

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-white">About Manager</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your public profile, skills, and contact messages.
          </p>
        </div>

        {/* ── Bio + Social Links ── */}
        <Section title="Profile & Social Links">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Display Name"
                value={bioForm.displayName}
                onChange={e => setBioForm({ ...bioForm, displayName: e.target.value })}
                placeholder="Ralph Alcaide"
              />
              <Input
                label="Headline"
                value={bioForm.headline}
                onChange={e => setBioForm({ ...bioForm, headline: e.target.value })}
                placeholder="Fullstack Developer & Travel Blogger"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Bio
              </label>
              <textarea
                value={bioForm.bio}
                onChange={e => setBioForm({ ...bioForm, bio: e.target.value })}
                rows={4}
                placeholder="Tell your story..."
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white placeholder-slate-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           transition resize-none"
              />
            </div>

            {/* Social links */}
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-medium text-slate-400 mb-3 uppercase
                            tracking-widest">
                Social Links
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Instagram URL"
                  value={bioForm.instagramUrl}
                  onChange={e => setBioForm({ ...bioForm, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/lakbayOksi"
                />
                <Input
                  label="LinkedIn URL"
                  value={bioForm.linkedInUrl}
                  onChange={e => setBioForm({ ...bioForm, linkedInUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
                <Input
                  label="GitHub URL"
                  value={bioForm.gitHubUrl}
                  onChange={e => setBioForm({ ...bioForm, gitHubUrl: e.target.value })}
                  placeholder="https://github.com/obiken-01"
                />
                <Input
                  label="YouTube URL"
                  value={bioForm.youTubeUrl}
                  onChange={e => setBioForm({ ...bioForm, youTubeUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveBio}
                disabled={savingBio}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700
                           disabled:bg-blue-800 text-white text-sm font-semibold
                           rounded-lg transition-colors flex items-center gap-2"
              >
                {savingBio ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white
                                    border-t-transparent rounded-full
                                    animate-spin" />
                    Saving...
                  </>
                ) : 'Save Profile'}
              </button>
            </div>
          </div>
        </Section>

        {/* ── Profile & Cover Images ── */}
        <Section title="Profile & Cover Images">
          <div className="space-y-6">

            {/* Profile photo */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase
                            tracking-widest mb-3">
                Profile Photo
              </p>
              <div className="flex items-center gap-4">
                {/* Preview circle */}
                <div className="w-16 h-16 rounded-full bg-slate-800 border
                                border-slate-700 overflow-hidden shrink-0
                                flex items-center justify-center">
                  {profile?.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-400 text-xl font-bold">
                      {bioForm.displayName?.slice(0, 2).toUpperCase() || 'RA'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <input
                      ref={profileImageRef}
                      type="file"
                      accept="image/*"
                      onChange={e => setProfileImageFile(e.target.files[0] ?? null)}
                      className="flex-1 text-sm text-slate-400 file:mr-3
                                 file:py-2 file:px-4 file:rounded-lg
                                 file:border-0 file:text-sm file:font-medium
                                 file:bg-slate-700 file:text-white
                                 hover:file:bg-slate-600 file:cursor-pointer
                                 cursor-pointer"
                    />
                    <button
                      onClick={handleProfileImageUpload}
                      disabled={!profileImageFile || uploadingProfile}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700
                                 disabled:bg-slate-700 disabled:text-slate-500
                                 text-white text-sm font-medium rounded-lg
                                 transition-colors flex items-center gap-2
                                 shrink-0"
                    >
                      {uploadingProfile ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white
                                          border-t-transparent rounded-full
                                          animate-spin" />
                          Uploading...
                        </>
                      ) : profile?.profileImageUrl ? 'Replace' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800" />

            {/* Cover / banner image */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase
                            tracking-widest mb-3">
                Banner / Cover Image
              </p>
              {/* Preview */}
              {profile?.coverImageUrl && (
                <div className="w-full h-28 rounded-lg overflow-hidden mb-3
                                border border-slate-700">
                  <img
                    src={profile.coverImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  ref={coverImageRef}
                  type="file"
                  accept="image/*"
                  onChange={e => setCoverImageFile(e.target.files[0] ?? null)}
                  className="flex-1 text-sm text-slate-400 file:mr-3
                             file:py-2 file:px-4 file:rounded-lg file:border-0
                             file:text-sm file:font-medium file:bg-slate-700
                             file:text-white hover:file:bg-slate-600
                             file:cursor-pointer cursor-pointer"
                />
                <button
                  onClick={handleCoverImageUpload}
                  disabled={!coverImageFile || uploadingCover}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700
                             disabled:bg-slate-700 disabled:text-slate-500
                             text-white text-sm font-medium rounded-lg
                             transition-colors flex items-center gap-2
                             shrink-0"
                >
                  {uploadingCover ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white
                                      border-t-transparent rounded-full
                                      animate-spin" />
                      Uploading...
                    </>
                  ) : profile?.coverImageUrl ? 'Replace' : 'Upload'}
                </button>
              </div>
            </div>

          </div>
        </Section>

        {/* ── CV Upload ── */}
        <Section title="Resume / CV">
          <div className="space-y-4">
            {profile?.cvUrl ? (
              <div className="flex items-center gap-3 p-3 bg-slate-800
                              rounded-lg border border-slate-700">
                <div className="w-8 h-8 rounded bg-red-500/20 flex items-center
                                justify-center shrink-0">
                  <span className="text-red-400 text-xs font-bold">PDF</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    ralph-alcaide-cv.pdf
                  </p>
                  <a
                    href={profile.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs hover:underline"
                  >
                    View current CV ↗
                  </a>
                </div>
                <button
                  onClick={handleCvDelete}
                  disabled={deletingCv}
                  className="text-slate-400 hover:text-red-400 transition-colors
                             shrink-0"
                  title="Remove CV"
                >
                  {deletingCv ? (
                    <div className="w-4 h-4 border-2 border-slate-400
                                    border-t-transparent rounded-full
                                    animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2
                               2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1
                               1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No CV uploaded yet.</p>
            )}
            <div className="flex items-center gap-3">
              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf"
                onChange={e => setCvFile(e.target.files[0] ?? null)}
                className="flex-1 text-sm text-slate-400 file:mr-3
                           file:py-2 file:px-4 file:rounded-lg file:border-0
                           file:text-sm file:font-medium file:bg-slate-700
                           file:text-white hover:file:bg-slate-600
                           file:cursor-pointer cursor-pointer"
              />
              <button
                onClick={handleCvUpload}
                disabled={!cvFile || uploadingCv}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700
                           disabled:bg-slate-700 disabled:text-slate-500
                           text-white text-sm font-medium rounded-lg
                           transition-colors flex items-center gap-2 shrink-0"
              >
                {uploadingCv ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white
                                    border-t-transparent rounded-full
                                    animate-spin" />
                    Uploading...
                  </>
                ) : profile?.cvUrl ? 'Replace CV' : 'Upload CV'}
              </button>
            </div>
          </div>
        </Section>

        {/* ── Work Experience ── */}
        <Section title="Work Experience">
          <div className="space-y-3 mb-4">
            {workExps.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No work experience added yet.
              </p>
            ) : (
              workExps.map(exp => (
                <div key={exp.id}
                     className="flex items-start gap-3 p-3 bg-slate-800
                                rounded-lg border border-slate-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">
                      {exp.role}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {exp.company}
                      <span className="mx-1.5">·</span>
                      {exp.period}
                    </p>
                    {exp.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {exp.tags.map(t => (
                          <span key={t}
                                className="text-xs px-2 py-0.5 bg-slate-700
                                           text-slate-300 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setWorkExpModal(exp)}
                      className="w-7 h-7 flex items-center justify-center
                                 rounded-lg text-slate-400 hover:bg-slate-700
                                 hover:text-white transition-colors"
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
                    <button
                      onClick={() => setDeleteTarget({
                        label: exp.role,
                        onConfirm: () => handleDeleteWorkExp(exp.id)
                      })}
                      className="w-7 h-7 flex items-center justify-center
                                 rounded-lg text-slate-400 hover:bg-red-500/10
                                 hover:text-red-400 transition-colors"
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
          <button
            onClick={() => setWorkExpModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800
                       hover:bg-slate-700 text-slate-300 text-sm font-medium
                       rounded-lg transition-colors border border-slate-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </button>
        </Section>

        {/* ── Skills ── */}
        <Section title="Tech Skills">
          <div className="space-y-3 mb-4">
            {skills.length === 0 ? (
              <p className="text-slate-500 text-sm">No skills added yet.</p>
            ) : (
              ['Backend', 'Frontend', 'Tool'].map(cat => {
                const catSkills = skills.filter(s => s.category === cat)
                if (catSkills.length === 0) return null
                return (
                  <div key={cat}>
                    <p className="text-xs font-medium text-slate-500 uppercase
                                  tracking-widest mb-2">
                      {cat}
                    </p>
                    {catSkills.map(skill => (
                      <div key={skill.id}
                           className="flex items-center gap-3 mb-2">
                        <div className="w-28 shrink-0">
                          <p className="text-slate-300 text-xs truncate">
                            {skill.name}
                          </p>
                        </div>
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full
                                        overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${skill.percentage}%`,
                              background: cat === 'Backend'
                                ? '#185fa5'
                                : cat === 'Frontend'
                                ? '#1d9e75'
                                : '#854f0b'
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-mono
                                         w-8 text-right shrink-0">
                          {skill.percentage}%
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setSkillModal(skill)}
                            className="w-6 h-6 flex items-center justify-center
                                       rounded text-slate-400 hover:bg-slate-700
                                       hover:text-white transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none"
                                 stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2
                                       2 0 002-2v-5m-1.414-9.414a2 2 0 112.828
                                       2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget({
                              label: skill.name,
                              onConfirm: () => handleDeleteSkill(skill.id)
                            })}
                            className="w-6 h-6 flex items-center justify-center
                                       rounded text-slate-400
                                       hover:bg-red-500/10 hover:text-red-400
                                       transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none"
                                 stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138
                                       21H7.862a2 2 0 01-1.995-1.858L5
                                       7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1
                                       1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </div>
          <button
            onClick={() => setSkillModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800
                       hover:bg-slate-700 text-slate-300 text-sm font-medium
                       rounded-lg transition-colors border border-slate-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Skill
          </button>
        </Section>

        {/* ── Contact Messages ── */}
        <Section title={`Contact Messages${unreadCount > 0
          ? ` (${unreadCount} unread)` : ''}`}>
          {messages.length === 0 ? (
            <p className="text-slate-500 text-sm">No messages yet.</p>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => (
                <div key={msg.id}
                     className={`rounded-lg border transition-colors ${
                       msg.isRead
                         ? 'bg-slate-800/50 border-slate-700/50'
                         : 'bg-slate-800 border-slate-700'
                     }`}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => {
                      setExpandedMsg(expandedMsg === msg.id ? null : msg.id)
                      if (!msg.isRead) handleMarkRead(msg.id)
                    }}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      msg.isRead ? 'bg-transparent' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${
                          msg.isRead ? 'text-slate-400' : 'text-white'
                        }`}>
                          {msg.authorName}
                        </p>
                        {msg.subject && (
                          <p className="text-slate-500 text-xs truncate
                                        hidden sm:block">
                            — {msg.subject}
                          </p>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs truncate">
                        {msg.authorEmail}
                        <span className="mx-1.5">·</span>
                        {new Date(msg.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteMessage(msg.id)
                        }}
                        className="w-7 h-7 flex items-center justify-center
                                   rounded-lg text-slate-500
                                   hover:bg-red-500/10 hover:text-red-400
                                   transition-colors"
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
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform ${
                          expandedMsg === msg.id ? 'rotate-180' : ''
                        }`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {expandedMsg === msg.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-700">
                      <p className="text-slate-300 text-sm leading-relaxed
                                    whitespace-pre-wrap mt-3">
                        {msg.message}
                      </p>
                      <a
                        href={`mailto:${msg.authorEmail}`}
                        className="inline-flex items-center gap-1.5 mt-3
                                   text-blue-400 text-xs hover:underline"
                      >
                        Reply to {msg.authorEmail} ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>

      {/* ── Modals ── */}
      {workExpModal && (
        <WorkExpModal
          entry={workExpModal === 'new' ? null : workExpModal}
          onClose={() => setWorkExpModal(null)}
          onSaved={fetchAll}
        />
      )}
      {skillModal && (
        <SkillModal
          skill={skillModal === 'new' ? null : skillModal}
          onClose={() => setSkillModal(null)}
          onSaved={fetchAll}
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