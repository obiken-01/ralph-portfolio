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
      map.setView([locations[0].latitude, locations[0].longitude], 10)
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
function LocationCard({ location, onHover, onSelect }) {
  return (
    <div
      className="group cursor-pointer border-b border-slate-100 p-4
                 transition-colors last:border-0 hover:bg-teal-50/60"
      onMouseEnter={() => onHover(location)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(location)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center
                        justify-center rounded-full bg-teal-50">
          <span className="text-xs" aria-hidden="true">📍</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 transition-colors
                        group-hover:text-teal-700">
            {location.placeName}
          </p>
          <p className="text-xs text-teal-600">
            {location.postCount} {location.postCount === 1 ? 'post' : 'posts'}
          </p>
          {location.description && (
            <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
              {location.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Posts behind a pin ──────────────────────────────────────────
function PopupPosts({ locationId }) {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get(`/posts/location/${locationId}`)
      .then((res) => { if (!cancelled) setPosts(res.data.data ?? []) })
      .catch(() => { if (!cancelled) setPosts([]) })
    return () => { cancelled = true }
  }, [locationId])

  if (posts === null) {
    return <p className="text-xs text-slate-400">Loading…</p>
  }

  if (posts.length === 0) {
    return <p className="text-xs text-slate-400">No posts here yet.</p>
  }

  return (
    <ul className="space-y-1">
      {posts.slice(0, 4).map((post) => (
        <li key={post.id}>
          <Link
            to={`/posts/${post.id}`}
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            {post.title}
          </Link>
        </li>
      ))}
      {posts.length > 4 && (
        <li className="text-xs text-slate-400">
          +{posts.length - 4} more
        </li>
      )}
    </ul>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function MapPage() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hoveredLocation, setHoveredLocation] = useState(null)
  const [focused, setFocused] = useState(null)

  useEffect(() => {
    // GET /locations is the public feed: the seeded placeholder and any place
    // with no published post are already excluded server-side, so the map
    // never shows a pin cluster floating in the Mindoro Strait while the
    // post-migration cleanup is still in progress.
    api.get('/locations')
      .then((res) => setLocations(res.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = locations.filter((l) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      l.placeName.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q)
    )
  })

  const defaultCenter = [12.8797, 121.7740]
  const defaultZoom = 6

  return (
    <div className="min-h-screen">
      <Seo
        title="Travel Map"
        description="Interactive map of every place Ralph has photographed
          across Occidental Mindoro and the Philippines — beaches, peaks and
          hidden trails."
        path="/map"
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Map', path: '/map' },
        ])}
      />

      <header className="border-b border-slate-900/5 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]
                        text-teal-700">
            Where I've been
          </p>
          <h1 className="font-display text-4xl font-semibold text-slate-900
                         sm:text-5xl">
            Travel Map
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Every place I've photographed, pinned on the map.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2">
            <div className="h-[420px] overflow-hidden rounded-2xl shadow-sm
                            ring-1 ring-slate-900/5 sm:h-[560px]">
              {loading ? (
                <div className="flex h-full w-full items-center justify-center
                                bg-slate-100">
                  <div className="h-8 w-8 animate-spin rounded-full border-4
                                  border-teal-600 border-t-transparent" />
                </div>
              ) : (
                <MapContainer
                  center={defaultCenter}
                  zoom={defaultZoom}
                  style={{ width: '100%', height: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {locations.length > 0 && (
                    <FitBounds locations={focused ? [focused] : locations} />
                  )}

                  {filtered.map((location) => {
                    const isHovered = hoveredLocation?.id === location.id
                    return (
                      <Marker
                        key={location.id}
                        position={[location.latitude, location.longitude]}
                        icon={createPinIcon(isHovered ? '#f59e0b' : '#0f766e')}
                      >
                        <Popup>
                          <div className="min-w-[180px]">
                            <p className="mb-1 text-sm font-semibold
                                          text-slate-900">
                              {location.placeName}
                            </p>
                            {location.description && (
                              <p className="mb-2 text-xs text-slate-500">
                                {location.description}
                              </p>
                            )}
                            <PopupPosts locationId={location.id} />
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}
                </MapContainer>
              )}
            </div>

            <div className="mt-3 flex items-center gap-4 px-1">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-teal-600" />
                <span className="text-xs text-slate-500">Location pin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="text-xs text-slate-500">Highlighted</span>
              </div>
              <span className="ml-auto text-xs text-slate-400">
                {filtered.length} location{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm
                            ring-1 ring-slate-900/5">

              <div className="border-b border-slate-100 p-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4
                                  -translate-y-1/2 text-slate-400"
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
                    className="w-full rounded-full border border-slate-200
                               bg-slate-50 py-2 pl-9 pr-4 text-base
                               text-slate-700 placeholder-slate-400 transition
                               focus:outline-none focus:ring-2
                               focus:ring-teal-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
                {loading ? (
                  <div className="space-y-3 p-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex animate-pulse gap-3">
                        <div className="h-7 w-7 flex-shrink-0 rounded-full
                                        bg-slate-200" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-3/4 rounded bg-slate-200" />
                          <div className="h-3 w-1/2 rounded bg-slate-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center">
                    <span className="mb-2 block text-3xl" aria-hidden="true">📍</span>
                    <p className="text-sm text-slate-400">
                      {search ? 'No locations found.' : 'No locations yet.'}
                    </p>
                  </div>
                ) : (
                  filtered.map((location) => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      onHover={setHoveredLocation}
                      onSelect={setFocused}
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
