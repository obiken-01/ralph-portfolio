import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import AdminLayout from '../../components/admin/AdminLayout'
import api from '../../api/axios'
import toast from 'react-hot-toast'

// ── TipTap Toolbar ──────────────────────────────────────────────
function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs
                  font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }) {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2
                    border-b border-slate-700 bg-slate-800/50">

      {/* Text style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')} title="Bold"
      >B</ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')} title="Italic"
      ><em>I</em></ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')} title="Strikethrough"
      ><s>S</s></ToolbarButton>

      <div className="w-px h-5 bg-slate-700 mx-1" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })} title="Heading 1"
      >H1</ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })} title="Heading 2"
      >H2</ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })} title="Heading 3"
      >H3</ToolbarButton>

      <div className="w-px h-5 bg-slate-700 mx-1" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')} title="Bullet List"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
             viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')} title="Ordered List"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
             viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5l7 7-7 7" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')} title="Blockquote"
      >❝</ToolbarButton>

      <div className="w-px h-5 bg-slate-700 mx-1" />

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
      >↩</ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
      >↪</ToolbarButton>

    </div>
  )
}

// ── Media Upload Section ────────────────────────────────────────
function MediaUpload({ postId, onUploaded }) {
  const [uploading,   setUploading]   = useState(false)
  const [uploadProgress,  setUploadProgress]  = useState(0)
  const [mediaSource, setMediaSource] = useState('1') // 1=Drone, 0=Phone
  const [caption,     setCaption]     = useState('')
  const [photos,      setPhotos]      = useState([])
  const [videos,      setVideos]      = useState([])

  const fetchMedia = useCallback(async () => {
    if (!postId) return
    try {
      const [pRes, vRes] = await Promise.all([
        api.get(`/photos/post/${postId}`),
        api.get(`/videos/post/${postId}`),
      ])
      setPhotos(pRes.data.data ?? [])
      setVideos(vRes.data.data ?? [])
    } catch (err) {
      console.error(err)
    }
  }, [postId])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const handleUpload = async (e, type) => {
    const file = e.target.files[0]
    if (!file) return
  
    setUploading(true)
    setUploadProgress(0)   // ← ADD
  
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source', mediaSource)
      if (caption) formData.append('caption', caption)
  
      const endpoint = type === 'photo'
        ? `/photos/upload/${postId}`
        : `/videos/upload/${postId}`
  
      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {          // ← ADD
          const pct = Math.round(                       // ← ADD
            (progressEvent.loaded * 100) / progressEvent.total  // ← ADD
          )                                             // ← ADD
          setUploadProgress(pct)                        // ← ADD
        },                                              // ← ADD
      })
  
      toast.success(`${type === 'photo' ? 'Photo' : 'Video'} uploaded!`)
      setCaption('')
      setUploadProgress(0)   // ← ADD
      fetchMedia()
      if (onUploaded) onUploaded()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Upload failed')
      setUploadProgress(0)   // ← ADD
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeletePhoto = async (photoId) => {
    try {
      await api.delete(`/photos/${photoId}`)
      toast.success('Photo deleted')
      fetchMedia()
    } catch {
      toast.error('Failed to delete photo')
    }
  }

  const handleDeleteVideo = async (videoId) => {
    try {
      await api.delete(`/videos/${videoId}`)
      toast.success('Video deleted')
      fetchMedia()
    } catch {
      toast.error('Failed to delete video')
    }
  }

  if (!postId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-2">Media</h3>
        <p className="text-slate-500 text-xs">
          Save the post first to upload media.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-4">Media</h3>

      {/* Source selector */}
      <div className="flex gap-2 mb-3">
        {[{ value: '1', label: '🚁 Drone' }, { value: '0', label: '📱 Phone' }].map((s) => (
          <button
            key={s.value} type="button"
            onClick={() => setMediaSource(s.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium
                        transition-colors ${
              mediaSource === s.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Caption */}
      <input
        type="text" placeholder="Caption (optional)"
        value={caption} onChange={(e) => setCaption(e.target.value)}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700
                   rounded-lg text-white text-xs placeholder-slate-500
                   focus:outline-none focus:ring-1 focus:ring-blue-500
                   transition mb-3"
      />

      {/* Upload buttons */}
      <div className="flex gap-2 mb-4">
        <label className={`flex-1 flex items-center justify-center gap-1.5
                           py-2 rounded-lg text-xs font-medium cursor-pointer
                           transition-colors ${
          uploading
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
               viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2
                     2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0
                     00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Photo
          <input type="file" accept="image/jpg,image/jpeg,image/png,image/webp"
                 className="hidden" disabled={uploading}
                 onChange={(e) => handleUpload(e, 'photo')} />
        </label>

        <label className={`flex-1 flex items-center justify-center gap-1.5
                           py-2 rounded-lg text-xs font-medium cursor-pointer
                           transition-colors ${
          uploading
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
               viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0
                     01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0
                     00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Video
          <input type="file" accept="video/mp4,video/mov,video/avi,video/mkv"
                 className="hidden" disabled={uploading}
                 onChange={(e) => handleUpload(e, 'video')} />
        </label>
      </div>

      {uploading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-400 flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-blue-400
                              border-t-transparent rounded-full animate-spin" />
              Uploading...
            </span>
            <span className="text-xs text-blue-400 font-medium">
              {uploadProgress}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Photos grid */}
      {photos.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-400 font-medium mb-2">
            Photos ({photos.length})
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo) => (
              <div key={photo.id}
                   className="relative aspect-square rounded-lg overflow-hidden
                              bg-slate-800 group">
                <img src={photo.url} alt={photo.caption || ''}
                     className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0
                                group-hover:opacity-100 transition-opacity
                                flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="w-6 h-6 bg-red-500 rounded-full flex items-center
                               justify-center text-white text-xs"
                  >×</button>
                </div>
                <div className={`absolute bottom-1 right-1 w-2.5 h-2.5
                                 rounded-sm ${
                  photo.source === 1 ? 'bg-blue-500' : 'bg-green-500'
                }`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos list */}
      {videos.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 font-medium mb-2">
            Videos ({videos.length})
          </p>
          <div className="space-y-2">
            {videos.map((video) => (
              <div key={video.id}
                   className="flex items-center gap-2 bg-slate-800
                              rounded-lg p-2">
                <div className="w-8 h-8 bg-slate-700 rounded flex items-center
                                justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-400" fill="none"
                       stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010
                             9.87v4.263a1 1 0 001.555.832l3.197-2.132a1
                             1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">
                    {video.caption || 'Video'}
                  </p>
                  <span className={`text-xs ${
                    video.source === 1 ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {video.source === 1 ? '🚁 Drone' : '📱 Phone'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteVideo(video.id)}
                  className="w-6 h-6 flex items-center justify-center
                             text-slate-500 hover:text-red-400 transition-colors
                             flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2
                             2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1
                             1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function PostEditorPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const isEdit   = !!id

  const [trips,   setTrips]   = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)
  const [postId,  setPostId]  = useState(isEdit ? Number(id) : null)

  const [form, setForm] = useState({
    title:    '',
    tripId:   '',
    videoUrl: '',
    publishedAt: '',
  })

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: 'Write your post content here...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[300px] px-4 py-3\
                focus:outline-none text-slate-200',
      },
    },
  })

  // Fetch trips for selector
  useEffect(() => {
    api.get('/trips/all')
      .then((res) => setTrips(res.data.data ?? []))
      .catch(console.error)
  }, [])

  // Fetch existing post if editing
  useEffect(() => {
    if (!isEdit) return
    api.get(`/posts/${id}`)
      .then((res) => {
        const post = res.data.data
        setForm({
          title:    post.title    ?? '',
          tripId:   post.tripId   ?? '',
          videoUrl: post.videoUrl ?? '',
          publishedAt: post.publishedAt
            ? post.publishedAt.substring(0, 10)
            : '',
        })
        editor?.commands.setContent(post.content ?? '')
      })
      .catch(() => toast.error('Failed to load post'))
      .finally(() => setLoading(false))
  }, [id, isEdit, editor])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async (publish = false) => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.tripId) {
      toast.error('Please select a trip')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title:    form.title,
        content:  editor?.getHTML() ?? '',
        tripId:   Number(form.tripId),
        videoUrl: form.videoUrl || null,
        publishedAt: form.publishedAt
          ? new Date(form.publishedAt).toISOString()
          : null,
      }

      let savedId = postId

      if (isEdit || postId) {
        const res = await api.put(`/posts/${postId ?? id}`, payload)
        const updated = res.data.data
        setForm((prev) => ({
          ...prev,
          publishedAt: updated.publishedAt
            ? updated.publishedAt.substring(0, 10)
            : prev.publishedAt,
        }))
        toast.success('Post saved!')
      } else {
        const res = await api.post('/posts', payload)
        savedId = res.data.data.id
        setPostId(savedId)
        toast.success('Post created!')
      }

      if (publish) {
        await api.put(`/posts/${savedId}/publish`)
        toast.success('Post published! 🎉')
        navigate('/admin/posts')
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600
                          border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="w-full max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Post' : 'New Post'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isEdit ? 'Update your post content.' : 'Create a new blog post.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/posts')}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: main editor */}
          <div className="lg:col-span-2 space-y-4">

            {/* Title */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Post Title *
              </label>
              <input
                type="text" name="title" value={form.title}
                onChange={handleChange}
                placeholder="e.g. Day 1 — Arriving in Beautiful Mindoro"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white placeholder-slate-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           transition"
              />
            </div>

            {/* TipTap editor */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl
                            overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5
                              border-b border-slate-800">
                <span className="text-xs font-medium text-slate-400">
                  Content
                </span>
                <span className="text-xs text-slate-600">
                  Rich text editor
                </span>
              </div>
              <Toolbar editor={editor} />
              <EditorContent editor={editor} />
            </div>

            {/* Media upload */}
            <MediaUpload postId={postId} />

          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">

            {/* Publish actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">
                Publish
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700
                             disabled:opacity-50 text-slate-300 text-sm
                             font-medium rounded-lg transition-colors
                             flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-400
                                    border-t-transparent rounded-full
                                    animate-spin" />
                  ) : null}
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700
                             disabled:opacity-50 text-white text-sm font-semibold
                             rounded-lg transition-colors flex items-center
                             justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white
                                    border-t-transparent rounded-full
                                    animate-spin" />
                  ) : null}
                  {isEdit ? 'Save & Publish' : 'Create & Publish'}
                </button>
              </div>
            </div>

            {/* Trip selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">
                Trip *
              </h3>
              <select
                name="tripId" value={form.tripId}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white text-sm focus:outline-none
                           focus:ring-2 focus:ring-blue-500 transition
                           [color-scheme:dark]"
              >
                <option value="">Select a trip...</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Post Date */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-1">
                  Post Date
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Set the actual date of this event — useful for backdating old trips.
                </p>
                <input
                  type="date"
                  name="publishedAt"
                  value={form.publishedAt}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                            rounded-lg text-white text-sm focus:outline-none
                            focus:ring-2 focus:ring-blue-500 transition
                            [color-scheme:dark]"
                />
              </div>

            {/* Video URL */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">
                Video URL
              </h3>
              <input
                type="url" name="videoUrl" value={form.videoUrl}
                onChange={handleChange}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                           rounded-lg text-white placeholder-slate-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           transition"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Optional YouTube / Vimeo embed URL
              </p>
            </div>

            {/* Post ID info */}
            {postId && (
              <div className="bg-slate-900 border border-slate-800
                              rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-2">
                  Post Info
                </h3>
                <p className="text-xs text-slate-400">
                  Post ID: <span className="text-slate-300">{postId}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  You can now upload photos and videos below.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </AdminLayout>
  )
}