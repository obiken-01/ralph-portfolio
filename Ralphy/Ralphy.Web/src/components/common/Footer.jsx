import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { APP_VERSION } from '../../utils/helpers'
import { getAboutProfile } from '../../api/about'

const footerLinks = [
  { to: '/posts',    label: 'Photos'   },
  { to: '/map',      label: 'Map'      },
  { to: '/timeline', label: 'Timeline' },
  { to: '/about',    label: 'About'    },
]

const ICONS = {
  Instagram: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691
               4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012
               3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058
               -1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149
               -4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849
               0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919
               1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259
               0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059
               1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2
               4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072
               3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618
               6.979-6.98.059-1.28.073-1.689.073-4.948
               0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78
               -6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403
               0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759
               6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209
               0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791
               4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44
               1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44
               -1.439-1.44z"/>
    </svg>
  ),
  YouTube: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545
               12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0
               0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016
               3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505
               0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24
               12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818
               12l-6.273 3.568z"/>
    </svg>
  ),
  GitHub: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207
               11.387.599.111.793-.261.793-.577v-2.234c-3.338.726
               -4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756
               -1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084
               1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304
               3.492.997.107-.775.418-1.305.762-1.604-2.665-.305
               -5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221
               -.124-.303-.535-1.524.117-3.176 0 0 1.008-.322
               3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005
               2.047.138 3.006.404 2.291-1.552 3.297-1.23
               3.297-1.23.653 1.653.242 2.874.118 3.176.77.84
               1.235 1.911 1.235 3.221 0 4.609-2.807 5.624
               -5.479 5.921.43.372.823 1.102.823 2.222v3.293c0
               .319.192.694.801.576C20.566 21.797 24 17.3 24
               12c0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  LinkedIn: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037
               -1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046
               c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455
               v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064
               0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225
               0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771
               24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0
               22.222 0h.003z"/>
    </svg>
  ),
}

// Fallback hardcoded links in case API has no URLs set
const FALLBACK_SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/lakbayOksi' },
  { label: 'YouTube',   href: 'https://www.youtube.com/@Lakbay_Oksi' },
  { label: 'GitHub',    href: 'https://github.com/obiken-01/ralph-portfolio' },
  { label: 'LinkedIn',  href: 'https://www.linkedin.com/in/ralph-armand-alcaide-a9821b2a3/' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const [socials, setSocials] = useState(FALLBACK_SOCIALS)

  useEffect(() => {
    const fetchSocials = async () => {
      try {
        const res = await getAboutProfile()
        const p = res.data.data

        const live = [
          { label: 'Instagram', href: p.instagramUrl },
          { label: 'YouTube',   href: p.youTubeUrl   },
          { label: 'GitHub',    href: p.gitHubUrl     },
          { label: 'LinkedIn',  href: p.linkedInUrl   },
        ].filter(s => s.href && s.href.trim() !== '')

        // Only override fallback if at least one URL is configured
        if (live.length > 0) setSocials(live)
      } catch {
        // Silently keep fallback on error
      }
    }
    fetchSocials()
  }, [])

  return (
    <footer className="bg-slate-950 text-slate-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <p className="text-white font-display text-xl font-bold mb-2">
              Ralphy<span className="text-teal-400">.</span>
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              A personal travel blog by Ralph Alcaide.<br />
              Capturing adventures from Occidental Mindoro and beyond.
            </p>
            <p className="text-xs text-slate-500 mt-3">
              📍 Occidental Mindoro, Philippines
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Explore</p>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 hover:text-teal-400
                               transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Follow Along</p>
            <div className="flex flex-col gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-400
                             hover:text-teal-400 transition-colors duration-200 w-fit"
                >
                  {ICONS[s.label] ?? null}
                  {s.label}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 mt-8 pt-6
                        flex flex-col sm:flex-row items-center
                        justify-between gap-2">
          <p className="text-xs text-slate-500">
            © {currentYear} Ralphy · Ralph Alcaide · All rights reserved.
          </p>
          <p className="text-xs text-slate-600 font-mono">
            v{APP_VERSION}
          </p>
        </div>

      </div>
    </footer>
  )
}