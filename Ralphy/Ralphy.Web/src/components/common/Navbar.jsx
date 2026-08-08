import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/posts',    label: 'Photos'   },
  { to: '/map',      label: 'Map'      },
  { to: '/timeline', label: 'Timeline' },
  { to: '/about',    label: 'About'    },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const linkClass = ({ isActive }) =>
    `relative text-sm font-medium transition-colors duration-200
     after:absolute after:-bottom-1.5 after:left-0 after:h-0.5
     after:bg-teal-600 after:transition-all after:duration-300
     ${isActive
       ? 'text-teal-700 after:w-full'
       : 'text-slate-600 hover:text-teal-700 after:w-0 hover:after:w-full'}`

  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/5
                       bg-white/85 backdrop-blur-md">
      <nav
        aria-label="Main navigation"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex h-16 items-center justify-between">

          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 hover:opacity-80
                       transition-opacity"
            aria-label="Ralphy — home"
          >
            <img
              src="/logo.png"
              alt=""
              width="36"
              height="36"
              className="h-9 w-9 object-contain"
            />
            <span className="flex flex-col leading-none">
              <span className="font-display text-xl font-bold tracking-tight
                               text-slate-900">
                Ralphy<span className="text-teal-600">.</span>
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase
                               tracking-[0.18em] text-slate-400">
                lakbay Oksi
              </span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex flex-col gap-1.5 rounded-md p-2 transition-colors
                       hover:bg-slate-100 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className={`block h-0.5 w-5 bg-slate-700 transition-transform duration-300
                              ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 bg-slate-700 transition-opacity duration-300
                              ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-slate-700 transition-transform duration-300
                              ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>

        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`overflow-hidden transition-all duration-300 md:hidden
                       ${menuOpen ? 'max-h-64 border-t border-slate-100' : 'max-h-0'}`}>
        <div className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 font-semibold text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-teal-700'
                }`
              }
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  )
}
