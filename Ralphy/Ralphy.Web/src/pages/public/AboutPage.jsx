import { useState, useEffect, useRef } from 'react'
import { getAboutProfile, sendContactMessage } from '../../api/about'
import Seo, { SITE_URL } from '../../components/common/Seo'
import Lightbox from '../../components/public/Lightbox'
import { cldImage } from '../../utils/cloudinary'

const TOC = [
  { id: 'about-me',        label: 'About me'        },
  { id: 'work-experience', label: 'Work experience' },
  { id: 'tech-skills',     label: 'Tech skills'     },
  { id: 'contact',         label: 'Contact'         },
]

const SOCIAL_META = [
  { key: 'instagramUrl', label: 'Instagram', color: 'bg-pink-500'   },
  { key: 'youTubeUrl',   label: 'YouTube',   color: 'bg-red-500'    },
  { key: 'gitHubUrl',    label: 'GitHub',    color: 'bg-slate-800'  },
  { key: 'linkedInUrl',  label: 'LinkedIn',  color: 'bg-sky-600'    },
]

// ── Section header ──────────────────────────────────────────────
function SectionHeader({ id, label }) {
  return (
    <h2 id={id}
        className="mb-6 flex scroll-mt-24 items-center gap-3 font-display
                   text-2xl font-semibold text-slate-900">
      <span className="inline-block h-px w-8 bg-teal-600" aria-hidden="true" />
      {label}
    </h2>
  )
}

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

// ── Hero: intro + framed ID photo ───────────────────────────────
function Hero({ profile, loading, onViewPhoto }) {
  const socials = profile
    ? SOCIAL_META
        .map((s) => ({ ...s, href: profile[s.key] }))
        .filter((s) => s.href)
    : []

  return (
    <header className="border-b border-slate-900/5 bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14
                      sm:px-6 lg:grid-cols-5 lg:gap-14 lg:px-8 lg:py-20">

        {/* Intro */}
        <div className="order-2 lg:order-1 lg:col-span-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]
                        text-teal-700">
            About me
          </p>

          {loading ? (
            <>
              <SkeletonBlock className="mb-4 h-12 w-3/4" />
              <SkeletonBlock className="mb-2 h-4 w-1/2" />
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl font-semibold leading-tight
                             text-slate-900 sm:text-5xl">
                {profile?.displayName || 'Ralph Alcaide'}
              </h1>
              {profile?.headline && (
                <p className="mt-4 max-w-xl text-base leading-relaxed
                              text-slate-500 sm:text-lg">
                  {profile.headline}
                </p>
              )}
            </>
          )}

          <p className="mt-4 inline-flex items-center gap-2 rounded-full
                        bg-stone-100 px-3.5 py-1.5 text-xs font-medium
                        text-slate-600 ring-1 ring-slate-900/5">
            📍 Occidental Mindoro, Philippines
            <span className="text-slate-300" aria-hidden="true">·</span>
            @lakbayOksi
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contact"
              className="rounded-full bg-teal-600 px-7 py-3 text-sm
                         font-semibold text-white transition-colors
                         hover:bg-teal-500"
            >
              Contact me
            </a>
            {profile?.cvUrl && (
              <a
                href={profile.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-200 px-7 py-3
                           text-sm font-semibold text-slate-700
                           transition-colors hover:border-teal-600
                           hover:text-teal-700"
              >
                Download CV ↓
              </a>
            )}
          </div>

          {/* Socials */}
          {socials.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2"
                aria-label="Social profiles">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 text-sm
                               font-medium text-slate-500 transition-colors
                               hover:text-teal-700"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${s.color}
                                      transition-transform
                                      group-hover:scale-125`}
                          aria-hidden="true" />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Framed ID photo */}
        <div className="order-1 flex justify-center lg:order-2 lg:col-span-2">
          {loading ? (
            <SkeletonBlock className="aspect-[4/5] w-64 rounded-2xl sm:w-72" />
          ) : profile?.profileImageUrl ? (
            <div className="relative">
              {/* Decorative blobs behind the frame */}
              <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full
                              bg-amber-200/60 blur-2xl"
                   aria-hidden="true" />
              <div className="absolute -bottom-8 -right-6 h-32 w-32
                              rounded-full bg-teal-200/60 blur-2xl"
                   aria-hidden="true" />

              <button
                onClick={onViewPhoto}
                aria-label="View photo full screen"
                className="group relative block rotate-2 cursor-zoom-in
                           rounded-2xl bg-white p-3 pb-12 shadow-xl
                           shadow-slate-900/10 ring-1 ring-slate-900/5
                           transition-transform duration-300
                           hover:rotate-0 hover:scale-[1.02]
                           focus:outline-none focus:ring-2
                           focus:ring-teal-500"
              >
                <img
                  src={cldImage(profile.profileImageUrl, 600)}
                  alt={`Portrait of ${profile.displayName || 'Ralph Alcaide'}`}
                  className="aspect-[4/5] w-60 rounded-lg bg-stone-100
                             object-cover object-top sm:w-72"
                />
                {/* Polaroid caption */}
                <span className="absolute inset-x-0 bottom-4 text-center
                                 font-display text-sm italic text-slate-500">
                  {profile.displayName || 'Ralph Alcaide'}
                </span>
                {/* Zoom hint */}
                <span className="absolute right-5 top-5 flex h-9 w-9
                                 items-center justify-center rounded-full
                                 bg-slate-950/50 text-white opacity-0
                                 backdrop-blur-sm transition-opacity
                                 group-hover:opacity-100"
                      aria-hidden="true">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor"
                       viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35M11 8v6m-3-3h6m5 0a8 8 0
                             11-16 0 8 8 0 0116 0z" />
                  </svg>
                </span>
              </button>
            </div>
          ) : (
            <div className="flex aspect-[4/5] w-64 items-center justify-center
                            rounded-2xl bg-stone-100 ring-1 ring-slate-900/5">
              <span className="text-6xl" aria-hidden="true">👋</span>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}

// ── Work experience timeline ────────────────────────────────────
function WorkExperience({ profile, loading }) {
  return (
    <section aria-labelledby="work-experience" className="mb-14">
      <SectionHeader id="work-experience" label="Work experience" />

      <div className="relative">
        <div className="absolute bottom-4 left-[9px] top-4 w-px bg-slate-200"
             aria-hidden="true" />

        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="mb-4 flex gap-5">
              <div className="mt-5 h-5 w-5 flex-shrink-0 rounded-full
                              bg-slate-200" />
              <div className="flex-1 rounded-2xl bg-white p-5 ring-1
                              ring-slate-900/5">
                <SkeletonBlock className="mb-2 h-4 w-3/5" />
                <SkeletonBlock className="h-3 w-2/5" />
              </div>
            </div>
          ))
        ) : profile?.workExperiences?.length > 0 ? (
          profile.workExperiences.map((job, i) => (
            <div key={job.id} className="relative mb-4 flex gap-5">
              <span
                className={`z-10 mt-5 h-5 w-5 flex-shrink-0 rounded-full
                            border-2 border-teal-600 ${
                  i === 0 ? 'bg-teal-600' : 'bg-white'
                }`}
                aria-hidden="true"
              />
              <div className="flex-1 rounded-2xl border-l-4 border-l-teal-600
                              bg-white p-5 ring-1 ring-slate-900/5">
                <div className="flex flex-wrap items-start justify-between
                                gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {job.role}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {job.company}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1
                                   text-xs font-medium text-slate-500">
                    {job.period}
                  </span>
                </div>
                {job.description && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {job.description}
                  </p>
                )}
                {job.tags?.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {job.tags.map((t) => (
                      <li key={t}
                          className="rounded-full bg-teal-50 px-2.5 py-0.5
                                     text-xs font-medium text-teal-700
                                     ring-1 ring-teal-100">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="pl-10 text-sm text-slate-400">
            No work experience added yet.
          </p>
        )}
      </div>
    </section>
  )
}

// ── Skill bar ───────────────────────────────────────────────────
function SkillBar({ name, pct, colorClass, animated }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{name}</span>
        <span className="text-xs text-slate-400">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full ${colorClass}
                      transition-[width] duration-1000 ease-out`}
          style={{ width: animated ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  )
}

// ── Tech skills ─────────────────────────────────────────────────
function TechSkills({ profile, loading, skillsRef, animated }) {
  const backend  = profile?.skills?.filter((s) => s.category === 'Backend')  ?? []
  const frontend = profile?.skills?.filter((s) => s.category === 'Frontend') ?? []
  const tools    = profile?.skills?.filter((s) => s.category === 'Tool')     ?? []

  return (
    <section aria-labelledby="tech-skills" className="mb-14" ref={skillsRef}>
      <SectionHeader id="tech-skills" label="Tech skills" />

      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5 sm:p-8">
        {loading ? (
          <SkeletonBlock className="h-24 w-full" />
        ) : backend.length > 0 || frontend.length > 0 ? (
          <>
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {backend.length > 0 && (
                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase
                                 tracking-[0.18em] text-slate-400">
                    Backend
                  </h3>
                  {backend.map((s) => (
                    <SkillBar key={s.id} name={s.name} pct={s.percentage}
                              colorClass="bg-teal-600" animated={animated} />
                  ))}
                </div>
              )}
              {frontend.length > 0 && (
                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase
                                 tracking-[0.18em] text-slate-400">
                    Frontend
                  </h3>
                  {frontend.map((s) => (
                    <SkillBar key={s.id} name={s.name} pct={s.percentage}
                              colorClass="bg-amber-400" animated={animated} />
                  ))}
                </div>
              )}
            </div>

            {tools.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t
                              border-slate-100 pt-5">
                <span className="mr-1 text-xs font-semibold uppercase
                                 tracking-[0.18em] text-slate-400">
                  Tools
                </span>
                {tools.map((t) => (
                  <span key={t.id}
                        className="rounded-full bg-stone-100 px-3 py-1 text-xs
                                   font-medium text-slate-600 ring-1
                                   ring-slate-900/5">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">No skills added yet.</p>
        )}
      </div>
    </section>
  )
}

// ── Contact form ────────────────────────────────────────────────
function ContactForm() {
  const [formData, setFormData] = useState({
    name: '', email: '', subject: '', message: ''
  })
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setStatus(null)
    try {
      await sendContactMessage({
        authorName: formData.name,
        authorEmail: formData.email,
        subject: formData.subject,
        message: formData.message,
      })
      setStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setStatus(null), 5000)
    } catch {
      setStatus('failed')
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    `w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm
     text-slate-700 placeholder-slate-400 transition focus:border-transparent
     focus:outline-none focus:ring-2 focus:ring-teal-500`

  return (
    <section aria-labelledby="contact" className="mb-6">
      <SectionHeader id="contact" label="Contact" />

      <form onSubmit={handleSubmit}
            className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5 sm:p-8">
        <p className="mb-5 text-sm text-slate-500">
          Got a project, a collab idea, or just want to say hi? Drop me a
          message — I read everything.
        </p>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            placeholder="Your name"
            aria-label="Your name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Your email"
            aria-label="Your email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={inputClass}
          />
        </div>
        <input
          placeholder="Subject (optional)"
          aria-label="Subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className={`${inputClass} mb-3`}
        />
        <textarea
          placeholder="Your message..."
          aria-label="Message"
          required
          rows={5}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className={`${inputClass} resize-y`}
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <div aria-live="polite">
            {status === 'success' && (
              <p className="text-sm font-medium text-emerald-600">
                ✓ Message sent — thank you!
              </p>
            )}
            {status === 'failed' && (
              <p className="text-sm font-medium text-red-600">
                Something went wrong. Please try again.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 rounded-full bg-teal-600 px-7
                       py-2.5 text-sm font-semibold text-white
                       transition-colors hover:bg-teal-500
                       disabled:bg-teal-400"
          >
            {sending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full
                                 border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : 'Send message'}
          </button>
        </div>
      </form>
    </section>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function AboutPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState('about-me')
  const [skillsVisible, setSkillsVisible] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const skillsRef = useRef(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getAboutProfile()
        setProfile(res.data.data)
      } catch {
        setError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  // Animate skill bars when scrolled into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setSkillsVisible(true) },
      { threshold: 0.2 }
    )
    if (skillsRef.current) observer.observe(skillsRef.current)
    return () => observer.disconnect()
  }, [loading])

  // Scroll-spy for the TOC
  useEffect(() => {
    const handleScroll = () => {
      const sections = TOC.map((t) => ({
        id: t.id,
        el: document.getElementById(t.id),
      }))
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i].el
        if (el && el.getBoundingClientRect().top <= 130) {
          setActiveSection(sections[i].id)
          break
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen">
      <Seo
        title="About Ralph Alcaide"
        description={profile?.headline ||
          'Ralph Alcaide (@lakbayOksi) — developer and traveler from Occidental Mindoro, Philippines. Bio, work experience, tech skills and contact.'}
        image={profile?.profileImageUrl}
        type="profile"
        path="/about"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: profile?.displayName || 'Ralph Alcaide',
          alternateName: 'lakbayOksi',
          description: profile?.headline,
          image: profile?.profileImageUrl,
          url: `${SITE_URL}/about`,
          sameAs: [
            profile?.instagramUrl,
            profile?.youTubeUrl,
            profile?.gitHubUrl,
            profile?.linkedInUrl,
          ].filter(Boolean),
        }}
      />

      <Hero
        profile={profile}
        loading={loading}
        onViewPhoto={() => setPhotoOpen(true)}
      />

      {/* Full-screen ID photo viewer */}
      {photoOpen && profile?.profileImageUrl && (
        <Lightbox
          photos={[{
            url: profile.profileImageUrl,
            caption: profile.displayName || 'Ralph Alcaide',
          }]}
          index={0}
          onClose={() => setPhotoOpen(false)}
          onNavigate={() => {}}
        />
      )}

      {/* Main layout */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6
                      lg:grid-cols-[1fr_240px] lg:px-8">

        <div className="min-w-0">
          {error && (
            <div className="mb-8 rounded-2xl bg-red-50 p-4 text-sm
                            text-red-600 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {/* About me */}
          <section aria-labelledby="about-me" className="mb-14">
            <SectionHeader id="about-me" label="About me" />
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5
                            sm:p-8">
              {loading ? (
                <>
                  <SkeletonBlock className="mb-3 h-4 w-full" />
                  <SkeletonBlock className="mb-3 h-4 w-11/12" />
                  <SkeletonBlock className="h-4 w-4/5" />
                </>
              ) : (
                <p className="text-[15px] leading-8 text-slate-600">
                  {profile?.bio || 'No bio yet.'}
                </p>
              )}
            </div>
          </section>

          <WorkExperience profile={profile} loading={loading} />
          <TechSkills
            profile={profile}
            loading={loading}
            skillsRef={skillsRef}
            animated={skillsVisible}
          />
          <ContactForm />
        </div>

        {/* Sticky sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">

            <nav aria-label="On this page"
                 className="rounded-2xl bg-white p-5 ring-1 ring-slate-900/5">
              <p className="mb-3 text-xs font-semibold uppercase
                            tracking-[0.18em] text-slate-400">
                On this page
              </p>
              <ul className="space-y-1">
                {TOC.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`flex items-center gap-2.5 rounded-lg px-2
                                  py-1.5 text-sm transition-colors ${
                        activeSection === item.id
                          ? 'bg-teal-50 font-semibold text-teal-700'
                          : 'text-slate-500 hover:text-teal-700'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        activeSection === item.id
                          ? 'bg-teal-600'
                          : 'bg-slate-300'
                      }`} aria-hidden="true" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {profile?.cvUrl && (
              <div className="rounded-2xl bg-white p-5 ring-1
                              ring-slate-900/5">
                <p className="mb-3 text-xs font-semibold uppercase
                              tracking-[0.18em] text-slate-400">
                  Resume / CV
                </p>
                <div className="mb-3 flex items-center gap-2.5 rounded-xl
                                bg-stone-50 px-3 py-2.5 ring-1
                                ring-slate-900/5">
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px]
                                   font-bold text-white">
                    PDF
                  </span>
                  <span className="truncate text-xs text-slate-600">
                    ralph-alcaide-cv.pdf
                  </span>
                </div>
                <a
                  href={profile.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-full bg-teal-600 py-2.5 text-center
                             text-xs font-semibold text-white
                             transition-colors hover:bg-teal-500"
                >
                  Download CV
                </a>
              </div>
            )}

          </div>
        </aside>

      </div>
    </div>
  )
}
