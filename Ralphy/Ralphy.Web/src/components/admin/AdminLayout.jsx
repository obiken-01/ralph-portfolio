import { useState } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

const navItems = [
  {
    to: '/admin',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2
                 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0
                 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/admin/trips',
    label: 'Trips',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0
                 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1
                 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0
                 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    to: '/admin/posts',
    label: 'Posts',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
                 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828
                 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    to: '/admin/about',
    label: 'About',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7
                 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/admin/timekeeping-users',
    label: 'Timekeeping Users',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor"
          viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

// ── Sidebar Content ─────────────────────────────────────────────
function SidebarContent({ user, onLogout, onClose }) {
  return (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-80
                     transition-opacity"
        >
          <img src="/logo.png" alt="Ralphy"
               className="h-7 w-7 object-contain" />
          <span className="text-white font-bold text-lg">
            Ralphy<span className="text-blue-400">.</span>
          </span>
        </Link>
        <p className="text-slate-500 text-xs mt-1">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
               font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
            onClick={onClose}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center
                          justify-center text-white text-sm font-bold
                          flex-shrink-0">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user?.username}
            </p>
            <p className="text-slate-500 text-xs truncate">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                     text-sm font-medium text-slate-400 hover:bg-slate-800
                     hover:text-red-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor"
               viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3
                     3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>

        {/* View site */}
        <Link
          to="/"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                     text-sm font-medium text-slate-400 hover:bg-slate-800
                     hover:text-white transition-colors mt-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor"
               viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0
                     002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View Site
        </Link>
      </div>
    </>
  )
}

// ── Admin Layout ────────────────────────────────────────────────
export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-x-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-slate-900
                        border-r border-slate-800 fixed top-0 bottom-0
                        left-0 z-30">
        <SidebarContent
          user={user}
          onLogout={handleLogout}
          onClose={() => {}}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-56 bg-slate-900
                            border-r border-slate-800 z-50">
            <SidebarContent
              user={user}
              onLogout={handleLogout}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen overflow-x-hidden">

        {/* Top bar */}
        <header className="bg-slate-900 border-b border-slate-800
                           px-4 sm:px-6 h-14 flex items-center
                           justify-between flex-shrink-0">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-slate-400 hover:text-white
                       transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                 viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden lg:block" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs hidden sm:block">
              {user?.email}
            </span>
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center
                            justify-center text-white text-xs font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 bg-slate-950 overflow-x-hidden">
          {children}
        </main>

      </div>
    </div>
  )
}