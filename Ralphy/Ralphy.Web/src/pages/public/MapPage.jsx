import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../api/axios'
import Seo, { breadcrumbLd } from '../../components/common/Seo'

// ── Fix Leaflet default marker icons (Vite issue) ───────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Custom pin icon ─────────────────────────────────────────────
const createPinIcon = (color = '#0f766e') => L.divIcon({
  className: '',
  html: `
    <div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize:   [28, 28],
  iconAnchor: [14, 28],
  popupAnchor:[0, -30],
})

// ── Fit map to markers ──────────────────────────────────────────
function FitBounds({ locations }) {
  const map = useMap()

  useEffect(() => {
    if (locations.length === 0) return
    if (locations.length === 1) {
      map.setView(
        [locations[0].latitude, locations[0].longitude], 10
      )
      return
    }
    const bounds = L.latLngBounds(
      locations.map((l) => [l.latitude, l.longitude])
    )
    map.fitBounds(bounds, { padding: [60, 60] })
  }, [locations, map])

  return null
}

// ── Location List Card ──────────────────────────────────────────
function LocationCard({ location, trip, onHover }) {
  return (
    <div
      className="p-4 border-b border-slate-100 last:border-0 hover:bg-teal-50/60
                 transition-colors cursor-pointer group"
      onMouseEnter={() => onHover(location)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-teal-50 flex items-center
                        justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs" aria-hidden="true">📍</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800
                        group-hover:text-teal-700 transition-colors">
            {location.placeName}
          </p>
          {trip && (
            <Link
              to={`/trips/${trip.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-teal-600 hover:underline"
            >
              {trip.title}
            </Link>
          )}
          {location.description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {location.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function MapPage() {
  const [locations, setLocations] = useState([])
  const [trips,     setTrips]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [hoveredLocation, setHoveredLocation] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locsRes, tripsRes] = await Promise.all([
          api.get('/locations'),
          api.get('/trips'),
        ])
        setLocations(locsRes.data.data ?? [])
        setTrips(tripsRes.data.data     ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Find trip for a given location
  const getTripForLocation = (location) =>
    trips.find((t) => t.id === location.tripId) ?? null

  // Filter locations by search
  const filtered = locations.filter((l) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      l.placeName.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q)
    )
  })

  // Center of Philippines as default
  const defaultCenter = [12.8797, 121.7740]
  const defaultZoom   = 6

  return (
    <div className="min-h-screen">
      <Seo
        title="Travel Map"
        description="Interactive map of every place Ralph has visited across
          Occidental Mindoro and the Philippines — beaches, peaks and
          hidden trails."
        path="/map"
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Map', path: '/map' },
        ])}
      />

      {/* Page header */}
      <header className="bg-white border-b border-slate-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-teal-700 text-xs font-semibold uppercase
                        tracking-[0.2em] mb-2">
            Where I've been
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold
                         text-slate-900">
            Travel Map
          </h1>
          <p className="text-slate-500 text-sm mt-3">
            Every place I've visited, pinned on the map.
          </p>
        </div>
      </header>

      {/* Map + Sidebar layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden ring-1 ring-slate-900/5
                            shadow-sm" style={{ height: '560px' }}>
              {loading ? (
                <div className="w-full h-full bg-slate-100 flex items-center
                                justify-center">
                  <div className="w-8 h-8 border-4 border-teal-600
                                  border-t-transparent rounded-full
                                  animate-spin" />
                </div>
              ) : (
                <MapContainer
                  center={defaultCenter}
                  zoom={defaultZoom}
                  style={{ width: '100%', height: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">
                                  OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Fit map to all markers */}
                  {locations.length > 0 && (
                    <FitBounds locations={locations} />
                  )}

                  {/* Markers */}
                  {filtered.map((location) => {
                    const trip = getTripForLocation(location)
                    const isHovered = hoveredLocation?.id === location.id
                    return (
                      <Marker
                        key={location.id}
                        position={[location.latitude, location.longitude]}
                        icon={createPinIcon(isHovered ? '#f59e0b' : '#0f766e')}
                      >
                        <Popup>
                          <div className="min-w-[160px]">
                            <p className="font-semibold text-slate-900 text-sm
                                          mb-1">
                              {location.placeName}
                            </p>
                            {location.description && (
                              <p className="text-xs text-slate-500 mb-2">
                                {location.description}
                              </p>
                            )}
                            {trip && (
                              <Link
                                to={`/trips/${trip.id}`}
                                className="text-xs text-teal-700 font-medium
                                           hover:underline"
                              >
                                📍 {trip.title} →
                              </Link>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}

                </MapContainer>
              )}
            </div>

            {/* Map legend */}
            <div className="flex items-center gap-4 mt-3 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-teal-600" />
                <span className="text-xs text-slate-500">Location pin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-xs text-slate-500">Highlighted</span>
              </div>
              <span className="text-xs text-slate-400 ml-auto">
                {filtered.length} location{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Sidebar — location list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5
                            overflow-hidden shadow-sm">

              {/* Search */}
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2
                                  w-4 h-4 text-slate-400"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search locations..."
                    aria-label="Search locations"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border
                               border-slate-200 rounded-full text-sm
                               text-slate-700 placeholder-slate-400
                               focus:outline-none focus:ring-2
                               focus:ring-teal-500 transition"
                  />
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200
                                        flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-slate-200 rounded w-3/4" />
                          <div className="h-3 bg-slate-100 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center">
                    <span className="text-3xl block mb-2" aria-hidden="true">📍</span>
                    <p className="text-slate-400 text-sm">
                      {search ? 'No locations found.' : 'No locations yet.'}
                    </p>
                  </div>
                ) : (
                  filtered.map((location) => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      trip={getTripForLocation(location)}
                      onHover={setHoveredLocation}
                    />
                  ))
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
