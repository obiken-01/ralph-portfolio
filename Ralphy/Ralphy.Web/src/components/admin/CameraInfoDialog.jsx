import { useState } from 'react'
import { formatShutter, parseShutter } from '../../utils/cameraFormat'

const toText = (value) => (value == null ? '' : String(value))

const toNumber = (text) => {
  const value = text.trim()
  return value === '' ? null : Number(value)
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-600">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass = `w-full rounded-lg border border-slate-700 bg-slate-950 px-3
  py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1
  focus:ring-blue-500`

/**
 * Corrects the camera details EXIF supplied, or fills them in where it
 * supplied none — a film scan reports the scanner, and an export with
 * metadata switched off reports nothing. Saving replaces every field, so a
 * field cleared here is cleared on the photo.
 */
export default function CameraInfoDialog({ photo, onSave, onClose }) {
  const [form, setForm] = useState({
    camera: toText(photo.camera),
    lens: toText(photo.lens),
    focalLength: toText(photo.focalLength),
    fNumber: toText(photo.fNumber),
    shutter: formatShutter(photo.exposureTime)?.replace(/s$/, '') ?? '',
    iso: toText(photo.iso),
    editedWith: toText(photo.editedWith),
  })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    const exposureTime = parseShutter(form.shutter)
    const values = {
      camera: form.camera.trim() || null,
      lens: form.lens.trim() || null,
      focalLength: toNumber(form.focalLength),
      fNumber: toNumber(form.fNumber),
      exposureTime,
      iso: toNumber(form.iso),
      editedWith: form.editedWith.trim() || null,
    }

    if (Number.isNaN(exposureTime)) {
      setError('Shutter speed should look like 1/250 or 2')
      return
    }
    if ([values.focalLength, values.fNumber, values.iso].some(Number.isNaN)) {
      setError('Focal length, aperture and ISO must be numbers')
      return
    }
    if (values.iso != null) values.iso = Math.round(values.iso)

    setError(null)
    setSaving(true)
    try {
      await onSave(values)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Could not save the camera details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6"
      >
        <h2 className="mb-1 font-semibold text-white">Camera details</h2>
        <p className="mb-5 text-xs text-slate-500">
          Read from the photo when it was uploaded. Leave a field empty to
          hide it.
        </p>

        <div className="space-y-3">
          <Field label="Camera">
            <input value={form.camera} onChange={set('camera')}
                   placeholder="Sony ILCE-7M4" className={inputClass} />
          </Field>
          <Field label="Lens">
            <input value={form.lens} onChange={set('lens')}
                   placeholder="FE 35mm F1.8" className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Focal" hint="mm">
              <input value={form.focalLength} onChange={set('focalLength')}
                     inputMode="decimal" placeholder="35" className={inputClass} />
            </Field>
            <Field label="Aperture" hint="f/">
              <input value={form.fNumber} onChange={set('fNumber')}
                     inputMode="decimal" placeholder="1.8" className={inputClass} />
            </Field>
            <Field label="Shutter" hint="s">
              <input value={form.shutter} onChange={set('shutter')}
                     placeholder="1/250" className={inputClass} />
            </Field>
            <Field label="ISO">
              <input value={form.iso} onChange={set('iso')}
                     inputMode="numeric" placeholder="200" className={inputClass} />
            </Field>
          </div>

          <Field label="Edited in">
            <input value={form.editedWith} onChange={set('editedWith')}
                   placeholder="Lightroom" className={inputClass} />
          </Field>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm
                       font-medium text-slate-300 transition-colors
                       hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm
                       font-semibold text-white transition-colors
                       hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
