import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { distanceMeters, NEARBY_THRESHOLD_M } from '../../utils/geo'
import LocationPicker from './LocationPicker'

/**
 * Pick an existing place, or create a new one.
 *
 * Location became a reusable record in v2.0 — many posts point at one place —
 * so re-picking "Bugtong Bato Falls" for the fifth post must not mint a fifth
 * row. That is the whole reason this is a select and not just the map picker.
 */
export default function LocationSelect({ value, onChange }) {
  const [locations, setLocations] = useState([])
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      // /all rather than the public feed: the cleanup list needs to see the
      // placeholder and places whose posts are all still drafts.
      const res = await api.get('/locations/all')
      setLocations(res.data.data ?? [])
    } catch {
      toast.error('Could not load places')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const selected = useMemo(
    () => locations.find((l) => l.id === value) ?? null,
    [locations, value]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return locations.slice(0, 8)
    return locations
      .filter((l) => l.placeName.toLowerCase().includes(q))
      .slice(0, 8)
  }, [locations, search])

  const handleCreate = async (data) => {
    const nearby = locations.find(
      (l) => distanceMeters(l, data) < NEARBY_THRESHOLD_M
    )

    if (nearby) {
      const reuse = window.confirm(
        `“${nearby.placeName}” is already pinned within 200 m of here.\n\n` +
        'OK to use that place instead, or Cancel to add a separate one.'
      )
      if (reuse) {
        onChange(nearby.id)
        setShowPicker(false)
        return
      }
    }

    try {
      const res = await api.post('/locations', data)
      const created = res.data.data
      setLocations((prev) => [...prev, created])
      onChange(created.id)
      setShowPicker(false)
      toast.success('Place added')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not add the place')
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Location *</h3>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="text-xs text-blue-400 transition-colors hover:text-blue-300"
        >
          + New place
        </button>
      </div>

      {selected ? (
        <div className="flex items-start gap-2 rounded-lg bg-slate-800 px-3 py-2.5">
          <span className="text-sm">📍</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">
              {selected.placeName}
            </p>
            <p className="font-mono text-xs text-slate-500">
              {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
            </p>
            {selected.isPlaceholder && (
              <p className="mt-1 text-xs text-amber-400">
                Placeholder — this post still needs a real place.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-slate-500 hover:text-white"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved places…"
            className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-800
                       px-3 py-2 text-sm text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="max-h-52 space-y-1 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-slate-500">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-slate-500">
                {search ? 'No match. Add it as a new place.' : 'No places yet.'}
              </p>
            ) : (
              filtered.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => onChange(location.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5
                             text-left transition-colors hover:bg-slate-800"
                >
                  <span className="text-xs">
                    {location.isPlaceholder ? '⚠️' : '📍'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
                    {location.placeName}
                  </span>
                  {location.postCount > 0 && (
                    <span className="text-xs text-slate-600">
                      {location.postCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}

      {showPicker && (
        <LocationPicker
          existingLocations={locations}
          onSave={handleCreate}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
