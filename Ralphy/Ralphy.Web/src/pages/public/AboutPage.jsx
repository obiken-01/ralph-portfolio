import { useState, useEffect, useRef } from "react";
import { getAboutProfile, sendContactMessage } from "../../api/about";
import Seo, { SITE_URL } from "../../components/common/Seo";

const TOC = [
  { id: "about-me", label: "About Me" },
  { id: "work-experience", label: "Work Experience" },
  { id: "tech-skills", label: "Tech Skills" },
  { id: "contact", label: "Contact" },
];

function SkillBar({ name, pct, color, animated }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{name}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "var(--color-border-tertiary)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: animated ? `${pct}%` : "0%",
          background: color,
          borderRadius: 3,
          transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}

function Tag({ label }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 4,
      border: "0.5px solid var(--color-border-secondary)",
      color: "var(--color-text-secondary)",
      marginRight: 4,
      marginTop: 4,
      fontFamily: "monospace",
    }}>
      {label}
    </span>
  );
}

function SkeletonBlock({ width = "100%", height = 16, mb = 8 }) {
  return (
    <div style={{
      width,
      height,
      marginBottom: mb,
      borderRadius: 4,
      background: "var(--color-border-tertiary)",
      animation: "pulse 1.5s ease-in-out infinite",
    }} />
  );
}

export default function AboutPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("about-me");
  const [skillsVisible, setSkillsVisible] = useState(false);
  const skillsRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getAboutProfile();
        setProfile(res.data.data);
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setSkillsVisible(true); },
      { threshold: 0.2 }
    );
    if (skillsRef.current) observer.observe(skillsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = TOC.map((t) => ({ id: t.id, el: document.getElementById(t.id) }));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i].el;
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const backendSkills = profile?.skills?.filter(s => s.category === "Backend") ?? [];
  const frontendSkills = profile?.skills?.filter(s => s.category === "Frontend") ?? [];
  const tools = profile?.skills?.filter(s => s.category === "Tool") ?? [];

  const socials = profile ? [
    { label: "Instagram", color: "#E1306C", href: profile.instagramUrl },
    { label: "LinkedIn",  color: "#0A66C2", href: profile.linkedInUrl },
    { label: "GitHub",    color: "#24292E", href: profile.gitHubUrl },
    { label: "YouTube",   color: "#FF0000", href: profile.youTubeUrl },
  ].filter(s => s.href) : [];

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "var(--color-background-tertiary)" }}>

      <Seo
        title="About Ralph Alcaide"
        description={profile?.headline ||
          "Ralph Alcaide (@lakbayOksi) — developer and traveler from Occidental Mindoro, Philippines. Bio, work experience, tech skills and contact."}
        image={profile?.profileImageUrl}
        type="profile"
        path="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: profile?.displayName || "Ralph Alcaide",
          alternateName: "lakbayOksi",
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

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* ── Hero banner ── */}
      <div style={{
        position: "relative",
        height: 260,
        overflow: "hidden",
        background: "#0d1117",
      }}>

        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg,rgba(255,255,255,0.02) 0px,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(255,255,255,0.02) 0px,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 40px)`
        }} />

        {/* Profile photo — right side, contained, anchored to bottom */}
        {profile?.profileImageUrl && (
          <div style={{
            position: "absolute",
            right: 0, bottom: 0,
            height: "100%",
            width: 260,
          }}>
            <img
              src={profile.profileImageUrl}
              alt={profile.displayName}
              style={{
                height: "100%",
                width: "100%",
                objectFit: "contain",
                objectPosition: "bottom right",
              }}
            />
            {/* Right edge fade into dark background */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to left, #0d1117 0%, transparent 30%)"
            }} />
            {/* Bottom fade */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, #0d1117 0%, transparent 15%)"
            }} />
          </div>
        )}

        {/* Left side — name + headline */}
        <div style={{
          position: "absolute",
          left: 48, top: 0, bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "60%",
          zIndex: 1,
        }}>
          {loading ? (
            <>
              <SkeletonBlock width={220} height={30} mb={10} />
              <SkeletonBlock width={160} height={13} mb={0} />
            </>
          ) : (
            <>
              <h1 style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}>
                {profile?.displayName || "Ralph Alcaide"}
              </h1>
              {profile?.headline && (
                <p style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.55)",
                  fontFamily: "monospace",
                  letterSpacing: "0.02em",
                }}>
                  {profile.headline}
                </p>
              )}
            </>
          )}
        </div>

      </div>

      {/* Profile sub-header */}
      <div style={{
        background: "#0d1117",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "10px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <span style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "monospace",
          letterSpacing: "0.04em",
        }}>
          @lakbayOksi
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="#contact"
            style={{
              fontSize: 13, padding: "6px 16px", borderRadius: 6,
              background: "#185fa5", color: "#fff",
              textDecoration: "none", fontWeight: 500,
            }}
          >
            Contact me
          </a>
          {profile?.cvUrl && (
            <button
              onClick={() => window.open(profile.cvUrl, "_blank")}
              style={{
                fontSize: 13, padding: "6px 16px", borderRadius: 6,
                border: "0.5px solid rgba(255,255,255,0.2)",
                background: "transparent", color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
              }}
            >
              Download CV
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem",
        display: "grid", gridTemplateColumns: "1fr 260px", gap: "2rem", alignItems: "start",
      }}>

        <div>
          {error && (
            <div style={{ padding: "1rem", borderRadius: 8, background: "var(--color-background-danger)", color: "var(--color-text-danger)", marginBottom: "1.5rem", fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* About Me */}
          <section id="about-me" style={{ marginBottom: "2.5rem" }}>
            <SectionHeader label="About Me" />
            <div style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "1.5rem" }}>
              {loading
                ? <><SkeletonBlock height={14} /><SkeletonBlock height={14} width="90%" /><SkeletonBlock height={14} width="80%" /></>
                : <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "var(--color-text-secondary)", fontWeight: 300 }}>
                    {profile?.bio || "No bio yet."}
                  </p>
              }
            </div>
          </section>

          {/* Work Experience */}
          <section id="work-experience" style={{ marginBottom: "2.5rem" }}>
            <SectionHeader label="Work Experience" />
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 10, top: 14, bottom: 14, width: 1.5, background: "var(--color-border-tertiary)" }} />
              {loading
                ? [1,2,3].map(i => (
                    <div key={i} style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--color-border-secondary)", background: "var(--color-background-primary)", flexShrink: 0, marginTop: 16 }} />
                      <div style={{ flex: 1, background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "14px 16px" }}>
                        <SkeletonBlock width="60%" height={14} mb={6} />
                        <SkeletonBlock width="40%" height={12} />
                      </div>
                    </div>
                  ))
                : profile?.workExperiences?.length > 0
                  ? profile.workExperiences.map((job, i) => (
                      <div key={job.id} style={{ display: "flex", gap: 20, marginBottom: 16, position: "relative" }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          border: "2px solid #185fa5",
                          background: i === 0 ? "#185fa5" : "var(--color-background-primary)",
                          flexShrink: 0, marginTop: 16, zIndex: 1,
                        }} />
                        <div style={{ flex: 1, background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", borderLeft: "2px solid #185fa5", padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 4 }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{job.role}</p>
                              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>{job.company}</p>
                            </div>
                            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>{job.period}</span>
                          </div>
                          {job.description && (
                            <p style={{ margin: "8px 0 8px", fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)", fontWeight: 300 }}>{job.description}</p>
                          )}
                          <div>{job.tags?.map(t => <Tag key={t} label={t} />)}</div>
                        </div>
                      </div>
                    ))
                  : <p style={{ fontSize: 14, color: "var(--color-text-tertiary)", paddingLeft: 32 }}>No work experience added yet.</p>
              }
            </div>
          </section>

          {/* Tech Skills */}
          <section id="tech-skills" style={{ marginBottom: "2.5rem" }} ref={skillsRef}>
            <SectionHeader label="Tech Skills" />
            <div style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "1.5rem" }}>
              {loading
                ? <SkeletonBlock height={80} />
                : (backendSkills.length > 0 || frontendSkills.length > 0)
                  ? <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem" }}>
                        {backendSkills.length > 0 && (
                          <div>
                            <p style={{ margin: "0 0 14px", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Backend</p>
                            {backendSkills.map(s => <SkillBar key={s.id} name={s.name} pct={s.percentage} color="#185fa5" animated={skillsVisible} />)}
                          </div>
                        )}
                        {frontendSkills.length > 0 && (
                          <div>
                            <p style={{ margin: "0 0 14px", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Frontend</p>
                            {frontendSkills.map(s => <SkillBar key={s.id} name={s.name} pct={s.percentage} color="#1d9e75" animated={skillsVisible} />)}
                          </div>
                        )}
                      </div>
                      {tools.length > 0 && (
                        <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontFamily: "monospace", marginRight: 4 }}>Tools:</span>
                          {tools.map(t => <Tag key={t.id} label={t.name} />)}
                        </div>
                      )}
                    </>
                  : <p style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>No skills added yet.</p>
              }
            </div>
          </section>

          <ContactForm />
        </div>

        {/* Right: sidebar */}
        <div style={{ position: "sticky", top: 68, display: "flex", flexDirection: "column", gap: 16 }}>

          <SidebarCard title="On this page">
            {TOC.map(item => (
              <a key={item.id} href={`#${item.id}`} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                textDecoration: "none", fontSize: 13,
                color: activeSection === item.id ? "#4fa3e3" : "var(--color-text-secondary)",
                transition: "color 0.15s",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeSection === item.id ? "#4fa3e3" : "var(--color-border-primary)", flexShrink: 0 }} />
                {item.label}
              </a>
            ))}
          </SidebarCard>

          {socials.length > 0 && (
            <SidebarCard title="Find me online">
              {socials.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
                  textDecoration: "none", fontSize: 13, color: "var(--color-text-secondary)",
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  {s.label}
                </a>
              ))}
            </SidebarCard>
          )}

          {profile?.cvUrl && (
            <SidebarCard title="Resume / CV">
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 5px", borderRadius: 3, background: "#c0392b", color: "#fff", fontWeight: 500 }}>PDF</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>ralph-alcaide-cv.pdf</span>
              </div>
              <button
                onClick={() => window.open(profile.cvUrl, "_blank")}
                style={{ width: "100%", padding: "8px 0", borderRadius: 6, background: "#185fa5", color: "#fff", border: "none", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}
              >
                Download CV
              </button>
            </SidebarCard>
          )}

        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label }) {
  return (
    <h2 style={{
      fontSize: 13, fontFamily: "monospace", letterSpacing: "0.12em",
      color: "#4fa3e3", textTransform: "uppercase", marginBottom: 16,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ display: "inline-block", width: 18, height: 1.5, background: "#4fa3e3" }} />
      {label}
    </h2>
  );
}

function SidebarCard({ title, children }) {
  return (
    <div style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "14px 16px" }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.1em", color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      setStatus("error");
      return;
    }

    setSending(true);
    try {
      await sendContactMessage({
        authorName: formData.name,
        authorEmail: formData.email,
        subject: formData.subject,
        message: formData.message,
      });
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setStatus(null), 4000);
    } catch {
      setStatus("failed");
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    fontSize: 14, padding: "9px 12px", borderRadius: 6,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    color: "var(--color-text-primary)", outline: "none",
    width: "100%", boxSizing: "border-box",
  };

  return (
    <section id="contact" style={{ marginBottom: "2rem" }}>
      <SectionHeader label="Contact" />
      <div style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
          <input placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={inputStyle} />
        </div>
        <input placeholder="Subject" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} style={{ ...inputStyle, display: "block", marginBottom: 12 }} />
        <textarea placeholder="Message..." rows={5} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
          style={{ ...inputStyle, resize: "vertical", display: "block", marginBottom: 12, fontFamily: "sans-serif" }}
        />
        <button onClick={handleSubmit} disabled={sending} style={{
          width: "100%", padding: "10px 0", borderRadius: 6,
          background: sending ? "#0c4478" : "#185fa5",
          color: "#fff", border: "none", fontSize: 14, fontWeight: 500,
          cursor: sending ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.04em",
        }}>
          {sending ? "Sending..." : "Send Message"}
        </button>
        {status === "success" && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--color-text-success)", textAlign: "center" }}>✓ Message sent!</p>}
        {status === "error" && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--color-text-danger)", textAlign: "center" }}>Please fill in your name, email, and message.</p>}
        {status === "failed" && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--color-text-danger)", textAlign: "center" }}>Something went wrong. Please try again.</p>}
      </div>
    </section>
  );
}