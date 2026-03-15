import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

// ── Design tokens ──────────────────────────────────────────────
const C = {
  navy:    '#0B2447', navyMid: '#14305E', navySoft: '#1A3D72',
  blue:    '#1565C0', blueH: '#1976D2', blueGlow: 'rgba(21,101,192,0.10)',
  gold:    '#C9A84C', goldL: '#E8C96A',
  white:   '#FFFFFF', off: '#F4F7FB', border: '#E2E8F0',
  text:    '#0F1B33', sub: '#475569', muted:  '#64748B', light: '#94A3B8',
};

// ── Nav structure ──────────────────────────────────────────────
const NAV = [
  {
    label: 'Bible Seminar', path: '/bible-seminar',
    children: [
      { label: 'Bible Seminar Introduction', path: '/bible-seminar' },
      { label: 'For Adults',                 path: '/bible-seminar/adults' },
      { label: 'Bible Seminar Schedule',     path: '/bible-seminar/schedule' },
    ],
  },
  {
    label: 'Sermon', path: '/sermon',
    children: [
      { label: 'Latest Sermon',          path: '/sermon/latest' },
      { label: 'Sunday Sermon',          path: '/sermon/sunday' },
      { label: 'Christian Life Seminar', path: '/sermon/christian-life' },
    ],
  },
  {
    label: 'World Mission', path: '/world-mission',
    children: [
      { label: 'Status of World Mission', path: '/world-mission/status' },
    ],
  },
  {
    label: 'Introduction', path: '/introduction',
    children: [
      { label: 'Introduction',    path: '/introduction' },
      { label: 'What We Believe', path: '/introduction/beliefs' },
      { label: 'C.I',             path: '/introduction/ci' },
    ],
  },
];

const LANGS = [
  { code: 'en',  label: 'English',           flag: '🇺🇸', native: 'English' },
  { code: 'ko',  label: 'Korean',            flag: '🇰🇷', native: '한국어' },
  { code: 'tl',  label: 'Filipino (Tagalog)',flag: '🇵🇭', native: 'Filipino' },
  { code: 'ceb', label: 'Cebuano',           flag: '🇵🇭', native: 'Bisaya' },
  { code: 'ilo', label: 'Ilocano',           flag: '🇵🇭', native: 'Ilokano' },
  { code: 'hil', label: 'Hiligaynon',        flag: '🇵🇭', native: 'Ilonggo' },
  { code: 'war', label: 'Waray',             flag: '🇵🇭', native: 'Winaray' },
  { code: 'bcl', label: 'Bikol',             flag: '🇵🇭', native: 'Bikolano' },
];

// ── Video Player Component (lazy iframe) ───────────────────────
export function VideoEmbed({ videoId, title, start = 0, style = {} }) {
  const [active, setActive] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  if (active) {
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden', ...style }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&start=${start}&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setActive(true)}
      style={{
        position: 'relative', paddingBottom: '56.25%', height: 0, cursor: 'pointer',
        borderRadius: '12px', overflow: 'hidden', background: C.navyMid, ...style,
      }}
    >
      <img
        src={thumbUrl}
        alt={title}
        onError={e => { e.target.style.display = 'none'; }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(11,36,71,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(21,101,192,0.5)',
        }}>
          <span style={{ fontSize: 26, marginLeft: 4, color: '#fff' }}>▶</span>
        </div>
      </div>
      {title && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(11,36,71,0.9), transparent)',
          padding: '20px 16px 12px',
          color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.4,
        }}>
          {title}
        </div>
      )}
    </div>
  );
}

// ── Playlist Embed ──────────────────────────────────────────────
export function PlaylistEmbed({ playlistId, title, start = 0 }) {
  const [active, setActive] = useState(false);
  if (active) {
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden' }}>
        <iframe
          src={`https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&controls=1&start=${start}&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }
  return (
    <div
      onClick={() => setActive(true)}
      style={{
        position: 'relative', paddingBottom: '56.25%', height: 0, cursor: 'pointer',
        borderRadius: '12px', overflow: 'hidden',
        background: `linear-gradient(135deg, ${C.navy}, ${C.navySoft})`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 24px rgba(21,101,192,0.5)' }}>
          <span style={{ fontSize: 30, marginLeft: 5, color: '#fff' }}>▶</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600, textAlign: 'center', padding: '0 20px' }}>{title}</div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Click to play playlist</div>
      </div>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────
export function Section({ children, bg = C.white, id }) {
  return (
    <section id={id} style={{ background: bg, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>{children}</div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 48 }}>
      {eyebrow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.blue }}>
          <span style={{ width: 20, height: 2, background: C.blue, borderRadius: 2, display: 'inline-block' }} />
          {eyebrow}
        </div>
      )}
      {title && <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem,3vw,2.3rem)', fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.25 }}>{title}</h2>}
      {sub && <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.65 }}>{sub}</p>}
    </div>
  );
}

// ── Main Layout ─────────────────────────────────────────────────
export default function PublicLayout({ children }) {
  const [openNav, setOpenNav] = useState(null); // which nav item is open
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('English');
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const langRef = useRef(null);
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenNav(null);
  }, [location]);

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchLang = (lang) => {
    setCurrentLang(lang.label);
    setLangOpen(false);
    if (lang.code === 'en') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.reload();
      return;
    }
    const val = '/en/' + lang.code;
    document.cookie = `googtrans=${val}; path=/`;
    window.location.reload();
  };

  const headerBg = isHome
    ? (scrolled ? 'rgba(11,36,71,0.97)' : 'rgba(11,36,71,0)')
    : 'rgba(11,36,71,0.97)';

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: C.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Google Translate hidden */}
      <div id="google_translate_element" style={{ display: 'none', visibility: 'hidden', position: 'absolute' }} />

      {/* ── Language Bar ── */}
      <div style={{ background: C.navyMid, borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '5px 24px', position: 'relative', zIndex: 1001 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            <span>🌐</span>
            <span>Language / 언어 / Wika</span>
          </div>
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              🌐 {currentLang} <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
            </button>
            {langOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(11,36,71,0.14)', minWidth: 200, zIndex: 2000, overflow: 'hidden' }}>
                {[{ groupLabel: 'International', langs: LANGS.slice(0, 2) }, { groupLabel: 'Filipino Dialects', langs: LANGS.slice(2) }].map(group => (
                  <div key={group.groupLabel}>
                    <div style={{ padding: '6px 14px 3px', fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '1.2px', textTransform: 'uppercase', background: C.off }}>{group.groupLabel}</div>
                    {group.langs.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => switchLang(lang)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', fontSize: 13, fontWeight: currentLang === lang.label ? 700 : 500, color: currentLang === lang.label ? C.blue : C.text, background: currentLang === lang.label ? C.blueGlow : '#fff', border: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                      >
                        <span style={{ fontSize: 16 }}>{lang.flag}</span>
                        <span style={{ flex: 1 }}>{lang.label}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{lang.native}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <header style={{ position: isHome ? 'fixed' : 'sticky', top: isHome ? 35 : 0, left: 0, right: 0, height: 68, padding: '0 24px', display: 'flex', alignItems: 'center', background: headerBg, backdropFilter: scrolled || !isHome ? 'blur(16px)' : 'none', boxShadow: scrolled || !isHome ? '0 2px 20px rgba(0,0,0,0.22)' : 'none', transition: 'all 0.3s', zIndex: 1000 }}>
        <div style={{ maxWidth: 1160, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, background: C.gold, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 900, color: C.navy }}>M</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Manila Central Church</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>PLWM — Parañaque City, Philippines</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
            {NAV.map(item => (
              <div
                key={item.label}
                onMouseEnter={() => setOpenNav(item.label)}
                onMouseLeave={() => setOpenNav(null)}
                style={{ position: 'relative' }}
              >
                <Link
                  to={item.path}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '6px 14px', fontSize: 13.5, fontWeight: 500,
                    color: openNav === item.label ? C.gold : 'rgba(255,255,255,0.8)',
                    borderBottom: `2px solid ${openNav === item.label ? C.gold : 'transparent'}`,
                    transition: 'all 0.18s', whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                  <span style={{ fontSize: 9, opacity: 0.5 }}>▼</span>
                </Link>
                {openNav === item.label && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0,
                    background: '#fff', border: `1.5px solid ${C.border}`,
                    borderRadius: 12, boxShadow: '0 8px 32px rgba(11,36,71,0.14)',
                    minWidth: 210, zIndex: 999, padding: '6px 0',
                    animation: 'fadeDown 0.16s ease',
                  }}>
                    {item.children.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        style={{
                          display: 'block', padding: '10px 18px',
                          fontSize: 13.5, color: C.text, fontWeight: 500,
                          borderLeft: '3px solid transparent',
                          transition: 'all 0.14s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.blueGlow; e.currentTarget.style.color = C.blue; e.currentTarget.style.borderLeftColor = C.blue; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = C.text; e.currentTarget.style.borderLeftColor = 'transparent'; }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/login">
              <button style={{ background: C.gold, color: C.navy, fontWeight: 700, padding: '8px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                Member Login →
              </button>
            </Link>
            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexDirection: 'column', gap: 5 }}
              className="hamburger-btn"
              aria-label="Toggle menu"
            >
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transition: 'all 0.25s', transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, opacity: mobileOpen ? 0 : 1 }} />
              <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transition: 'all 0.25s', transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, background: C.navy, zIndex: 998, padding: '120px 28px 40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {NAV.map(item => (
            <div key={item.label}>
              <Link to={item.path} style={{ display: 'block', fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.9)', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: "'Playfair Display',serif" }}>
                {item.label}
              </Link>
              {item.children.map(child => (
                <Link key={child.path} to={child.path} style={{ display: 'block', fontSize: 15, color: 'rgba(255,255,255,0.6)', padding: '10px 0 10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {child.label}
                </Link>
              ))}
            </div>
          ))}
          <Link to="/login" style={{ marginTop: 24 }}>
            <button style={{ background: C.gold, color: C.navy, fontWeight: 700, padding: '14px', borderRadius: 8, fontSize: 15, cursor: 'pointer', border: 'none', fontFamily: 'inherit', width: '100%' }}>
              Member Login →
            </button>
          </Link>
        </div>
      )}

      {/* ── Main Content ── */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: C.off, borderTop: `1px solid ${C.border}`, padding: '60px 24px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 40, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 700, color: C.text, marginBottom: 8 }}>Manila Central Church</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 20, maxWidth: 280 }}>
                Mother Church of Philippine Life Word Mission (PLWM). Serving Manila and the Philippines through the Word of God.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[['📍', 'Address', 'Church address (to be updated)'], ['📞', 'Phone', 'Contact number (to be updated)'], ['✉️', 'Email', 'Church email (to be updated)']].map(([icon, label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 30, height: 30, background: 'rgba(21,101,192,0.1)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                      <div style={{ fontSize: 13, color: C.light, fontStyle: 'italic' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Quick Links */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.text, marginBottom: 16 }}>Quick Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['/', 'Home'], ['/bible-seminar', 'Bible Seminar'], ['/sermon/latest', 'Latest Sermon'], ['/world-mission', 'World Mission'], ['/introduction', 'Introduction'], ['/login', 'Member Login']].map(([path, label]) => (
                  <Link key={path} to={path} style={{ fontSize: 13.5, color: C.muted, transition: 'color 0.18s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.blue}
                    onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            {/* Service Times */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.text, marginBottom: 16 }}>Service Times</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['☀️ Sunday 9:30 AM — Filipino Service', '☀️ Sunday 2:00 PM — Korean Service', '📖 Wednesday 7:00 PM — Midweek', '🏘️ Saturday 2:00 PM — HS Fellowship', '🏘️ Saturday 7:00 PM — YAG Fellowship', '🔵 Tue & Thu 7:00 PM — Cell Groups'].map(s => (
                  <span key={s} style={{ fontSize: 13, color: C.muted }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: C.light }}>© 2026 Manila Central Church · Philippine Life Word Mission (PLWM) · All rights reserved.</p>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: C.navy, color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8 }}>
              🔐 Church Management System
            </Link>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        a { text-decoration: none; color: inherit; }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:translateY(0);} }
        .goog-te-banner-frame, .skiptranslate { display: none !important; }
        body { top: 0 !important; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
        .page-hero { background: linear-gradient(135deg, #0B2447, #1A3D72); padding: 100px 24px 60px; text-align: center; }
        .page-hero h1 { font-family:'Playfair Display',serif; color:#fff; font-size:clamp(1.8rem,4vw,2.8rem); font-weight:700; margin-bottom:12px; }
        .page-hero p { color:rgba(255,255,255,0.6); font-size:16px; max-width:540px; margin:0 auto; line-height:1.65; }
        .breadcrumb { display:flex; align-items:center; gap:8px; justify-content:center; margin-bottom:20px; font-size:12px; color:rgba(255,255,255,0.45); }
        .breadcrumb a { color:rgba(255,255,255,0.55); }
        .breadcrumb a:hover { color:#C9A84C; }
        .prose { font-size:15px; color:#475569; line-height:1.8; }
        .prose h3 { font-family:'Playfair Display',serif; font-size:1.15rem; font-weight:700; color:#0F1B33; margin-bottom:8px; margin-top:32px; }
        .prose h3:first-child { margin-top:0; }
        .card { background:#fff; border:1.5px solid #E2E8F0; border-radius:12px; padding:24px; }
        .card:hover { border-color:#1565C0; box-shadow:0 4px 20px rgba(21,101,192,0.1); }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        @media(max-width:768px) { .grid2,.grid3 { grid-template-columns:1fr; } }
        @media(max-width:900px) { .grid3 { grid-template-columns:1fr 1fr; } }
      `}</style>
    </div>
  );
}
