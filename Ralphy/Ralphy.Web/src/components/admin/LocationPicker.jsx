import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom red pin for selected location
const selectedIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 24px; height: 24px;
    background: #ef4444;
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize:   [24, 24],
  iconAnchor: [12, 24],
  popupAnchor:[0, -28],
})

// ── Click handler inside map ────────────────────────────────────
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng
      onMapClick(lat, lng)
    }
  })
  return null
}

// ── Fly to location ─────────────────────────────────────────────
function FlyTo({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14, { duration: 1.2 })
    }
  }, [position, map])
  return null
}

// ── Main Component ──────────────────────────────────────────────
export default function LocationPicker({ onSave, onCancel, existingLocations = [] }) {
  const [search,      setSearch]      = useState('')
  const [searching,   setSearching]   = useState(false)
  const [results,     setResults]     = useState([])
  const [selected,    setSelected]    = useState(null) // { lat, lng, placeName }
  const [placeName,   setPlaceName]   = useState('')
  const [description, setDescription] = useState('')
  const [saving,      setSaving]      = useState(false)
  const searchTimeout                 = useRef(null)

  // Default center — Philippines
  const defaultCenter = [12.8797, 121.7740]

  // ── Search OpenStreetMap Nominatim ──────────────────────────
  const handleSearch = useCallback(async (query) => {
    if (!query.trim() || query.length < 3) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&format=json&limit=5&` +
        `addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      setResults(data)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }, [])

  // Debounce search
  const handleSearchInput = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => handleSearch(val), 500)
  }

  // Select from search results
  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const name = result.display_name.split(',')[0]
    setSelected({ lat, lng })
    setPlaceName(name)
    setResults([])
    setSearch(result.display_name.split(',').slice(0, 2).join(','))
  }

  // Click on map to drop pin
  const handleMapClick = async (lat, lng) => {
    setSelected({ lat, lng })
    // Reverse geocode to get place name
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const name = data.address?.village
        || data.address?.town
        || data.address?.city
        || data.address?.suburb
        || data.display_name.split(',')[0]
      setPlaceName(name)
    } catch {
      setPlaceName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    }
  }

  const handleSave = async () => {
    if (!selected) {
      return
    }
    if (!placeName.trim()) {
      return
    }
    setSaving(true)
    try {
      await onSave({
        placeName:   placeName.trim(),
        latitude:    selected.lat,
        longitude:   selected.lng,
        description: description.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center
                    justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl
                      w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-slate-800">
          <h2 className="text-white font-semibold">Add Location</h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Search box */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2
                                w-4 h-4 text-slate-400"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search for a place..."
                  value={search}
                  onChange={handleSearchInput}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border
                             border-slate-700 rounded-lg text-white text-sm
                             placeholder-slate-500 focus:outline-none
                             focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              {searching && (
                <div className="flex items-center px-2">
                  <div className="w-4 h-4 border-2 border-blue-400
                                  border-t-transparent rounded-full
                                  animate-spin" />
                </div>
              )}
            </div>

            {/* Search results dropdown */}
            {results.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1
                              bg-slate-800 border border-slate-700 rounded-lg
                              shadow-xl overflow-hidden">
                {results.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700
                               transition-colors border-b border-slate-700
                               last:border-0"
                  >
                    <p className="text-white text-sm font-medium truncate">
                      {result.display_name.split(',')[0]}
                    </p>
                    <p className="text-slate-400 text-xs truncate mt-0.5">
                      {result.display_name.split(',').slice(1, 3).join(',')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="rounded-xl overflow-hidden border border-slate-700"
               style={{ height: '280px' }}>
            <MapContainer
              center={selected
                ? [selected.lat, selected.lng]
                : defaultCenter}
              zoom={6}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {selected && (
                <>
                  <Marker
                    position={[selected.lat, selected.lng]}
                    icon={selectedIcon}
                  />
                  <FlyTo position={[selected.lat, selected.lng]} />
                </>
              )}
              {/* Existing locations */}
              {existingLocations.map((loc) => (
                <Marker
                  key={loc.id}
                  position={[loc.latitude, loc.longitude]}
                />
              ))}
            </MapContainer>
          </div>

          <p className="text-xs text-slate-500 text-center">
            🖱️ Click anywhere on the map to drop a pin, or search above
          </p>

          {/* Place name input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Place Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Apo Reef Natural Park"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                         rounded-lg text-white text-sm placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description
              <span className="text-slate-500 ml-1">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Best diving spot in the Philippines"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700
                         rounded-lg text-white text-sm placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition"
            />
          </div>

          {/* Coordinates preview */}
          {selected && (
            <div className="bg-slate-800 rounded-lg px-4 py-2.5 flex
                            items-center gap-3">
              <span className="text-slate-400 text-xs">📍 Coordinates:</span>
              <span className="text-slate-300 text-xs font-mono">
                {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700
                         text-slate-300 text-sm font-medium rounded-lg
                         transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selected || !placeName.trim() || saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                         disabled:bg-slate-700 disabled:text-slate-500
                         text-white text-sm font-semibold rounded-lg
                         transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white
                                border-t-transparent rounded-full animate-spin" />
              ) : '📍'}
              Save Location
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}