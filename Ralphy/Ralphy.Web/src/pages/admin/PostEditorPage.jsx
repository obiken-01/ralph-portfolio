import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import toast from 'react-hot-toast'
import AdminLayout from '../../components/admin/AdminLayout'
import LocationSelect from '../../components/admin/LocationSelect'
import PhotoUploader from '../../components/admin/PhotoUploader'
import TagInput from '../../components/admin/TagInput'
import api from '../../api/axios'

// ── TipTap Toolbar ──────────────────────────────────────────────
function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded text-xs
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
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-700
                    bg-slate-800/50 px-3 py-2">
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

      <div className="mx-1 h-5 w-px bg-slate-700" />

      {[1, 2, 3].map((level) => (
        <ToolbarButton
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          active={editor.isActive('heading', { level })}
          title={`Heading ${level}`}
        >H{level}</ToolbarButton>
      ))}

      <div className="mx-1 h-5 w-px bg-slate-700" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')} title="Bullet list"
      >•</ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')} title="Numbered list"
      >1.</ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')} title="Quote"
      >❝</ToolbarButton>

      <div className="mx-1 h-5 w-px bg-slate-700" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()} title="Undo"
      >↩</ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()} title="Redo"
      >↪</ToolbarButton>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function PostEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [postId, setPostId] = useState(isEdit ? Number(id) : null)
  const [tags, setTags] = useState([])

  // Content is optional as of v2.0, so the writing surface starts collapsed —
  // most posts are a set of photos and a place, nothing more.
  const [showEditor, setShowEditor] = useState(false)

  const [form, setForm] = useState({
    title: '',
    locationId: null,
    videoUrl: '',
    publishedAt: '',
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: 'Anything worth saying about these photos…',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[240px] px-4 py-3 '
             + 'focus:outline-none text-slate-200',
      },
    },
  })

  // Load the post being edited
  useEffect(() => {
    if (!isEdit) return

    api.get(`/posts/${id}`)
      .then((res) => {
        const post = res.data.data
        setForm({
          title: post.title ?? '',
          locationId: post.locationId ?? null,
          videoUrl: post.videoUrl ?? '',
          publishedAt: post.publishedAt
            ? post.publishedAt.substring(0, 10)
            : '',
        })
        setTags(post.tags ?? [])
        if (post.content) {
          editor?.commands.setContent(post.content)
          setShowEditor(true)
        }
      })
      .catch(() => toast.error('Failed to load post'))
      .finally(() => setLoading(false))
  }, [id, isEdit, editor])

  const buildPayload = () => ({
    title: form.title.trim(),
    content: editor?.getText().trim() ? editor.getHTML() : null,
    locationId: form.locationId,
    videoUrl: form.videoUrl || null,
    publishedAt: form.publishedAt
      ? new Date(form.publishedAt).toISOString()
      : null,
  })

  const validate = () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return false
    }
    // Post.LocationId is a required FK — catching it here saves a round-trip
    // and a 400 the user would have to decode.
    if (!form.locationId) {
      toast.error('Pick a location first')
      return false
    }
    return true
  }

  const saveTags = async (targetId) => {
    try {
      // The endpoint replaces the whole set, so send every chip, not a delta.
      await api.post(`/tags/assign/${targetId}`, { tags })
    } catch {
      toast.error('Post saved, but the tags did not stick')
    }
  }

  /** Used by the uploader's "Save draft & add photos" button. */
  const createDraft = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const res = await api.post('/posts', buildPayload())
      const savedId = res.data.data.id
      setPostId(savedId)
      await saveTags(savedId)
      toast.success('Draft saved — add your photos below')
      // Keep the editor mounted rather than navigating: losing the typed title
      // to a redirect is exactly what the old flow did wrong.
      window.history.replaceState(null, '', `/admin/posts/${savedId}/edit`)
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (publish = false) => {
    if (!validate()) return

    setSaving(true)
    try {
      let savedId = postId

      if (postId) {
        const res = await api.put(`/posts/${postId}`, buildPayload())
        const updated = res.data.data
        setForm((prev) => ({
          ...prev,
          publishedAt: updated.publishedAt
            ? updated.publishedAt.substring(0, 10)
            : prev.publishedAt,
        }))
        toast.success('Post saved')
      } else {
        const res = await api.post('/posts', buildPayload())
        savedId = res.data.data.id
        setPostId(savedId)
        toast.success('Post created')
      }

      await saveTags(savedId)

      if (publish) {
        await api.put(`/posts/${savedId}/publish`)
        toast.success('Published 🎉')
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
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4
                          border-blue-600 border-t-transparent" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-6xl">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Post' : 'New Post'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Photos first. Words are optional.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/posts')}
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left: photos lead */}
          <div className="space-y-4 lg:col-span-2">

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Morning at Bugtong Bato"
                className="w-full rounded-lg border border-slate-700 bg-slate-800
                           px-3 py-2.5 text-sm text-white placeholder-slate-500
                           transition focus:outline-none focus:ring-2
                           focus:ring-blue-500"
              />
            </div>

            <PhotoUploader postId={postId} onCreateDraft={createDraft} />

            {/* Description — collapsed by default */}
            <div className="overflow-hidden rounded-xl border border-slate-800
                            bg-slate-900">
              <button
                type="button"
                onClick={() => setShowEditor((open) => !open)}
                className="flex w-full items-center justify-between px-4 py-3
                           text-left"
              >
                <span className="text-xs font-medium text-slate-400">
                  Description <span className="text-slate-600">(optional)</span>
                </span>
                <span className="text-xs text-slate-500">
                  {showEditor ? 'Hide' : 'Add words'}
                </span>
              </button>

              {showEditor && (
                <>
                  <Toolbar editor={editor} />
                  <EditorContent editor={editor} />
                </>
              )}
            </div>
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Publish</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2
                             rounded-lg bg-slate-800 py-2.5 text-sm font-medium
                             text-slate-300 transition-colors hover:bg-slate-700
                             disabled:opacity-50"
                >
                  {saving && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2
                                    border-slate-400 border-t-transparent" />
                  )}
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2
                             rounded-lg bg-green-600 py-2.5 text-sm font-semibold
                             text-white transition-colors hover:bg-green-700
                             disabled:opacity-50"
                >
                  {saving && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2
                                    border-white border-t-transparent" />
                  )}
                  {postId ? 'Save & Publish' : 'Create & Publish'}
                </button>
              </div>
            </div>

            <LocationSelect
              value={form.locationId}
              onChange={(locationId) => setForm({ ...form, locationId })}
            />

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">Tags</h3>
              <TagInput value={tags} onChange={setTags} />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="mb-1 text-sm font-semibold text-white">Post Date</h3>
              <p className="mb-3 text-xs text-slate-500">
                Leave blank and the photos’ own capture dates order the timeline.
              </p>
              <input
                type="date"
                value={form.publishedAt}
                onChange={(e) =>
                  setForm({ ...form, publishedAt: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-800
                           px-3 py-2.5 text-sm text-white transition
                           [color-scheme:dark] focus:outline-none focus:ring-2
                           focus:ring-blue-500"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">Video URL</h3>
              <input
                type="url"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=…"
                className="w-full rounded-lg border border-slate-700 bg-slate-800
                           px-3 py-2.5 text-sm text-white placeholder-slate-500
                           transition focus:outline-none focus:ring-2
                           focus:ring-blue-500"
              />
            </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
