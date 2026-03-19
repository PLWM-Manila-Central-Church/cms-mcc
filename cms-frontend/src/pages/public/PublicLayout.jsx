import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const C = {
  navy:'#0B2447', navyMid:'#14305E', navySoft:'#1A3D72',
  blue:'#1565C0', blueH:'#1976D2', blueGlow:'rgba(21,101,192,0.10)',
  gold:'#C9A84C', goldL:'#E8C96A',
  white:'#FFFFFF', off:'#F4F7FB', border:'#E2E8F0',
  text:'#0F1B33', sub:'#475569', muted:'#64748B', light:'#94A3B8',
};

const MAX_W = '1100px';

const NAV = [
  { label:'Bible Seminar', path:'/bible-seminar', children:[
    { label:'Bible Seminar Introduction', path:'/bible-seminar' },
    { label:'For Adults',                 path:'/bible-seminar/adults' },
    { label:'Bible Seminar Schedule',     path:'/bible-seminar/schedule' },
  ]},
  { label:'Sermon', path:'/sermon', children:[
    { label:'Latest Sermon',          path:'/sermon/latest' },
    { label:'Sunday Sermon',          path:'/sermon/sunday' },
    { label:'Christian Life Seminar', path:'/sermon/christian-life' },
  ]},
  { label:'World Mission', path:'/world-mission', children:[
    { label:'Status of World Mission', path:'/world-mission/status' },
  ]},
  { label:'Introduction', path:'/introduction', children:[
    { label:'Introduction',    path:'/introduction' },
    { label:'What We Believe', path:'/introduction/beliefs' },
    { label:'C.I',             path:'/introduction/ci' },
  ]},
];

// ── Language definitions ──────────────────────────────────────
// 'searchText': what to look for inside Google Translate's option labels.
// Bicol fix: GT doesn't have 'bcl'; we search for 'Bikol' by option text.
const LANGS = [
  { code:'en',  label:'English',            flag:'🇺🇸', native:'English',  searchText:'English'    },
  { code:'ko',  label:'Korean',             flag:'🇰🇷', native:'한국어',    searchText:'Korean'     },
  { code:'tl',  label:'Filipino (Tagalog)', flag:'🇵🇭', native:'Filipino', searchText:'Filipino'   },
  { code:'ceb', label:'Cebuano',            flag:'🇵🇭', native:'Bisaya',   searchText:'Cebuano'    },
  { code:'ilo', label:'Ilocano',            flag:'🇵🇭', native:'Ilokano',  searchText:'Ilocano'    },
  { code:'hil', label:'Hiligaynon',         flag:'🇵🇭', native:'Ilonggo',  searchText:'Hiligaynon' },
  { code:'war', label:'Waray',              flag:'🇵🇭', native:'Winaray',  searchText:'Waray'      },
  { code:'bcl', label:'Bikol',              flag:'🇵🇭', native:'Bikolano', searchText:'Bikol'      },
];

// ── Shared exported components ────────────────────────────────

export function VideoEmbed({ videoId, title, start = 0, style = {} }) {
  const [active, setActive] = useState(false);
  const thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  if (active) return (
    <div style={{ position:'relative', paddingBottom:'56.25%', height:0, borderRadius:12, overflow:'hidden', ...style }}>
      <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&start=${start}&rel=0`} title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
        style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }} />
    </div>
  );
  return (
    <div onClick={() => setActive(true)} style={{ position:'relative', paddingBottom:'56.25%', height:0, cursor:'pointer', borderRadius:12, overflow:'hidden', background:C.navyMid, ...style }}>
      <img src={thumb} alt={title} onError={e => { e.target.style.display='none'; }}
        style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover' }} />
      <div style={{ position:'absolute', inset:0, background:'rgba(11,36,71,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(21,101,192,0.5)' }}>
          <span style={{ fontSize:26, marginLeft:4, color:'#fff' }}>▶</span>
        </div>
      </div>
      {title && <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(to top,rgba(11,36,71,0.9),transparent)', padding:'20px 16px 12px', color:'#fff', fontSize:13, fontWeight:600, lineHeight:1.4 }}>{title}</div>}
    </div>
  );
}

export function PlaylistEmbed({ playlistId, title, start = 0 }) {
  const [active, setActive] = useState(false);
  if (active) return (
    <div style={{ position:'relative', paddingBottom:'56.25%', height:0, borderRadius:12, overflow:'hidden' }}>
      <iframe src={`https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&controls=1&start=${start}&rel=0`} title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
        style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }} />
    </div>
  );
  return (
    <div onClick={() => setActive(true)} style={{ position:'relative', paddingBottom:'56.25%', height:0, cursor:'pointer', borderRadius:12, overflow:'hidden', background:`linear-gradient(135deg,${C.navy},${C.navySoft})` }}>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 24px rgba(21,101,192,0.5)' }}>
          <span style={{ fontSize:30, marginLeft:5, color:'#fff' }}>▶</span>
        </div>
        <div style={{ color:'rgba(255,255,255,0.8)', fontSize:15, fontWeight:600, textAlign:'center', padding:'0 20px' }}>{title}</div>
        <div style={{ color:'rgba(255,255,255,0.45)', fontSize:12 }}>Click to play playlist</div>
      </div>
    </div>
  );
}

export function Section({ children, bg = C.white, id }) {
  return (
    <section id={id} style={{ background:bg, padding:'80px 24px' }}>
      <div style={{ maxWidth:MAX_W, margin:'0 auto' }}>{children}</div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom:48 }}>
      {eyebrow && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:C.blue }}>
          <span style={{ width:20, height:2, background:C.blue, borderRadius:2, display:'inline-block' }} />
          {eyebrow}
        </div>
      )}
      {title && <h2 style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'clamp(1.6rem,3vw,2.3rem)', fontWeight:700, color:C.text, marginBottom:8, lineHeight:1.2 }}>{title}</h2>}
      {sub && <p style={{ fontSize:15, color:C.muted, lineHeight:1.75 }}>{sub}</p>}
    </div>
  );
}

// ── Shared language key (syncs portal ↔ landing page) ────────
const LANG_KEY = 'plwm_lang';
const getLangCode  = () => localStorage.getItem(LANG_KEY) || 'en';
const saveLangCode = (code) => {
  localStorage.setItem(LANG_KEY, code);
  // Keep plwm_prefs in sync so the portal picks it up
  try {
    const p = JSON.parse(localStorage.getItem('plwm_prefs') || '{}');
    p.language = code;
    localStorage.setItem('plwm_prefs', JSON.stringify(p));
  } catch (_) {}
};

// Module-level GT applier — safe to call from anywhere, retries until GT loads
function applyGTLang(lang) {
  if (!lang || lang.code === 'en') {
    // Reset to English: clear GT cookie and reload is most reliable,
    // but just toggling the select to empty works for most cases
    try {
      const sel = document.querySelector('.goog-te-combo');
      if (sel) { sel.value = ''; sel.dispatchEvent(new Event('change')); }
    } catch (_) {}
    return;
  }
  const attempt = () => {
    try {
      const sel = document.querySelector('.goog-te-combo');
      if (!sel) return false;
      if (sel.querySelector(`option[value="${lang.code}"]`)) {
        sel.value = lang.code;
        sel.dispatchEvent(new Event('change'));
        return true;
      }
      const match = Array.from(sel.options).find(o =>
        o.text.toLowerCase().includes((lang.searchText || lang.label).toLowerCase())
      );
      if (match) { sel.value = match.value; sel.dispatchEvent(new Event('change')); return true; }
    } catch (_) {}
    return false;
  };
  if (!attempt()) {
    let tries = 0;
    const iv = setInterval(() => { tries++; if (attempt() || tries > 40) clearInterval(iv); }, 150);
  }
}

// ── Main layout ───────────────────────────────────────────────

export default function PublicLayout({ children }) {
  const [openNav,     setOpenNav]     = useState(null);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [mobileSub,   setMobileSub]   = useState(null);
  const [langOpen,    setLangOpen]    = useState(false);
  const [currentLang, setCurrentLang] = useState(() => {
    // Restore language label from shared key instantly — no flash
    const saved = LANGS.find(l => l.code === getLangCode());
    return saved ? saved.label : 'English';
  });
  const [scrolled,    setScrolled]    = useState(false);

  const location = useLocation();
  const langRef  = useRef(null);
  const navRef   = useRef(null);
  const isHome   = location.pathname === '/';

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive:true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    setMobileOpen(false); setOpenNav(null); setMobileSub(null); setLangOpen(false);
  }, [location]);

  useEffect(() => {
    const fn = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (!openNav) return;
    const fn = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpenNav(null); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [openNav]);

  // Load Google Translate widget (hidden) + restore saved language after init
  useEffect(() => {
    const restoreSaved = () => {
      const code = getLangCode();
      if (code && code !== 'en') {
        const saved = LANGS.find(l => l.code === code);
        if (saved) applyGTLang(saved);
      }
    };

    if (document.getElementById('gt-script')) {
      // Script already injected (SPA navigation) — just restore language
      restoreSaved();
      return;
    }
    window.googleTranslateElementInit = () => {
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement({ pageLanguage:'en', autoDisplay:false }, 'google_translate_element');
      // Restore saved language immediately after widget initialises
      restoreSaved();
    };
    const s = document.createElement('script');
    s.id  = 'gt-script';
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.head.appendChild(s);
  }, []); // eslint-disable-line

  // Listen for language changes fired by the member portal
  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code;
      const lang = LANGS.find(l => l.code === code);
      if (lang) { setCurrentLang(lang.label); applyGTLang(lang); }
    };
    window.addEventListener('plwm-lang-change', handler);
    return () => window.removeEventListener('plwm-lang-change', handler);
  }, []);

  // ── Language switch — saves to shared key so portal picks it up instantly ──
  const switchLang = (lang) => {
    setCurrentLang(lang.label);
    setLangOpen(false);
    saveLangCode(lang.code);
    window.dispatchEvent(new CustomEvent('plwm-lang-change', { detail: { code: lang.code } }));
    applyGTLang(lang);
  };

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const headerBg = isHome
    ? (scrolled ? 'rgba(11,36,71,0.97)' : 'rgba(11,36,71,0.18)')
    : 'rgba(11,36,71,0.97)';

  const currentFlag = LANGS.find(l => l.label === currentLang)?.flag || '🌐';

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", color:C.text, minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* Hidden Google Translate widget */}
      <div id="google_translate_element" style={{ position:'fixed', bottom:-200, left:0, opacity:0, pointerEvents:'none', zIndex:-1 }} />

      {/* ── Sticky nav bar (single unified bar) ── */}
      <div style={{
        position: isHome ? 'fixed' : 'sticky',
        top:0, left:0, right:0, zIndex:1001,
        boxShadow: scrolled || !isHome ? '0 2px 20px rgba(0,0,0,0.22)' : 'none',
        transition: 'box-shadow 0.3s',
      }}>
        <header style={{
          height:64, padding:'0 20px', display:'flex', alignItems:'center',
          background: headerBg,
          backdropFilter: scrolled || !isHome ? 'blur(16px)' : 'none',
          transition: 'background 0.3s, backdrop-filter 0.3s',
        }}>
          <div ref={navRef} style={{ maxWidth:MAX_W, width:'100%', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>

            {/* Logo */}
            <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, textDecoration:'none' }}>
              <img src={process.env.PUBLIC_URL + '/logo.jpg'} alt="PLWM-MCC"
                style={{ width:40, height:40, borderRadius:8, objectFit:'contain', background:'rgba(255,255,255,0.1)', padding:2, flexShrink:0 }} />
              <div className="logo-text-hide">
                <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.2, whiteSpace:'nowrap' }}>Manila Central Church</div>
                <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.48)', letterSpacing:'0.5px', textTransform:'uppercase' }}>PLWM — Parañaque City</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav style={{ display:'flex', alignItems:'center', gap:2 }} className="desktop-nav">
              {NAV.map(item => (
                <div key={item.label} style={{ position:'relative' }}>
                  <button
                    onClick={() => setOpenNav(prev => prev === item.label ? null : item.label)}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:4,
                      padding:'6px 12px', fontSize:13.5, fontWeight:500,
                      color: openNav === item.label ? C.gold : 'rgba(255,255,255,0.87)',
                      background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                      borderBottom:`2px solid ${openNav === item.label ? C.gold : 'transparent'}`,
                      transition:'color 0.18s, border-color 0.18s', whiteSpace:'nowrap',
                    }}>
                    {item.label}
                    <span style={{ fontSize:8, opacity:0.55, display:'inline-block', transition:'transform 0.2s', transform: openNav === item.label ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </button>
                  {openNav === item.label && (
                    <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12, boxShadow:'0 8px 32px rgba(11,36,71,0.14)', minWidth:220, zIndex:999, padding:'6px 0', animation:'fadeDown 0.16s ease' }}>
                      {item.children.map(child => (
                        <Link key={child.path} to={child.path} onClick={() => setOpenNav(null)}
                          style={{ display:'block', padding:'10px 18px', fontSize:13.5, color:C.text, fontWeight:500, borderLeft:'3px solid transparent', transition:'all 0.14s', textDecoration:'none' }}
                          onMouseEnter={e => { e.currentTarget.style.background=C.blueGlow; e.currentTarget.style.color=C.blue; e.currentTarget.style.borderLeftColor=C.blue; }}
                          onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=C.text; e.currentTarget.style.borderLeftColor='transparent'; }}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Right side: lang picker + login + hamburger */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>

              {/* Language picker — merged into nav bar */}
              <div ref={langRef} style={{ position:'relative' }} className="desktop-nav">
                <button onClick={() => setLangOpen(o => !o)}
                  style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.16)', color:'rgba(255,255,255,0.82)', fontSize:12, fontWeight:600, padding:'5px 10px', borderRadius:20, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  <span>{currentFlag}</span>
                  <span style={{ fontSize:10, opacity:0.6 }}>▼</span>
                </button>
                {langOpen && (
                  <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12, boxShadow:'0 8px 32px rgba(11,36,71,0.14)', minWidth:210, zIndex:2000, overflow:'hidden' }}>
                    {[{groupLabel:'International', langs:LANGS.slice(0,2)},{groupLabel:'Filipino Languages', langs:LANGS.slice(2)}].map(group => (
                      <div key={group.groupLabel}>
                        <div style={{ padding:'6px 14px 3px', fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'1.2px', textTransform:'uppercase', background:C.off }}>{group.groupLabel}</div>
                        {group.langs.map(lang => (
                          <button key={lang.code} onClick={() => switchLang(lang)}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', fontSize:13, fontWeight:currentLang===lang.label ? 700 : 400, color:currentLang===lang.label ? C.blue : C.text, background:currentLang===lang.label ? C.blueGlow : '#fff', border:'none', width:'100%', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                            <span style={{ fontSize:16 }}>{lang.flag}</span>
                            <span style={{ flex:1 }}>{lang.label}</span>
                            <span style={{ fontSize:11, color:C.muted }}>{lang.native}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link to="/login" className="desktop-nav" style={{ textDecoration:'none' }}>
                <button style={{ background:C.gold, color:C.navy, fontWeight:700, padding:'8px 16px', borderRadius:8, fontSize:13, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  Member Login →
                </button>
              </Link>

              {/* Hamburger (mobile only) */}
              <button onClick={() => setMobileOpen(o => !o)}
                style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:'8px 4px', flexDirection:'column', gap:5, alignItems:'center' }}
                className="hamburger-btn" aria-label="Toggle menu">
                <span style={{ display:'block', width:22, height:2, background:'#fff', borderRadius:2, transition:'all 0.25s', transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
                <span style={{ display:'block', width:22, height:2, background:'#fff', borderRadius:2, opacity: mobileOpen ? 0 : 1, transition:'opacity 0.2s' }} />
                <span style={{ display:'block', width:22, height:2, background:'#fff', borderRadius:2, transition:'all 0.25s', transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* ── Mobile full-screen nav ── */}
      {mobileOpen && (
        <div style={{ position:'fixed', inset:0, background:C.navy, zIndex:1000, overflowY:'auto', display:'flex', flexDirection:'column' }}>
          {/* Mobile nav header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <img src={process.env.PUBLIC_URL + '/logo.jpg'} alt="PLWM-MCC" style={{ width:36, height:36, borderRadius:8, objectFit:'contain', background:'rgba(255,255,255,0.1)', padding:2 }} />
              <span style={{ fontFamily:"'Lora',Georgia,serif", fontSize:14, fontWeight:700, color:'#fff' }}>Manila Central Church</span>
            </div>
            <button onClick={() => setMobileOpen(false)}
              style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', borderRadius:8, width:36, height:36, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              ✕
            </button>
          </div>

          {/* Nav items */}
          <div style={{ flex:1, padding:'12px 20px' }}>
            {NAV.map(item => (
              <div key={item.label}>
                <button
                  onClick={() => setMobileSub(prev => prev === item.label ? null : item.label)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', fontSize:17, fontWeight:600, color:'rgba(255,255,255,0.92)', padding:'14px 0', background:'none', border:'none', borderBottom:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                  {item.label}
                  <span style={{ fontSize:11, opacity:0.5, transition:'transform 0.2s', display:'inline-block', transform: mobileSub === item.label ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </button>
                {mobileSub === item.label && (
                  <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, margin:'6px 0 10px', overflow:'hidden' }}>
                    {item.children.map(child => (
                      <Link key={child.path} to={child.path} style={{ display:'block', fontSize:15, color:'rgba(255,255,255,0.75)', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', textDecoration:'none', fontWeight:400 }}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile lang + login */}
          <div style={{ padding:'16px 20px 40px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', gap:10 }}>
            {/* Compact lang grid */}
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>Language</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              {LANGS.map(lang => (
                <button key={lang.code} onClick={() => switchLang(lang)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, border:`1.5px solid ${currentLang===lang.label ? C.gold : 'rgba(255,255,255,0.12)'}`, background: currentLang===lang.label ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.05)', color: currentLang===lang.label ? C.gold : 'rgba(255,255,255,0.72)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight: currentLang===lang.label ? 700 : 400 }}>
                  <span style={{ fontSize:17 }}>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
            <Link to="/login" style={{ textDecoration:'none' }}>
              <button style={{ background:C.gold, color:C.navy, fontWeight:700, padding:14, borderRadius:10, fontSize:15, cursor:'pointer', border:'none', fontFamily:'inherit', width:'100%' }}>
                Member Login →
              </button>
            </Link>
          </div>
        </div>
      )}

      <main style={{ flex:1 }}>{children}</main>

      {/* ── Footer ── */}
      <footer style={{ background:C.off, borderTop:`1px solid ${C.border}`, padding:'56px 24px 32px' }}>
        <div style={{ maxWidth:MAX_W, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:40, marginBottom:40 }}>
            <div>
              <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'1.25rem', fontWeight:700, color:C.text, marginBottom:8 }}>Manila Central Church</div>
              <div style={{ fontSize:14, color:C.muted, lineHeight:1.75, marginBottom:20, maxWidth:280 }}>Mother Church of Philippine Life Word Mission (PLWM). Serving Manila and the Philippines through the Word of God.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[['📍','Address','Lot 2 Block 2 Filipinas Ave. UPS 5, Brgy. San Isidro, Parañaque City'],['📞','Tel','(02) 7745-6212'],['📱','Senior Pastor','0915-807-6300'],['🌐','Website','www.jbch.org.ph']].map(([icon,label,value]) => (
                  <div key={label} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ width:28, height:28, background:'rgba(21,101,192,0.1)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
                      <div style={{ fontSize:13, color:C.sub }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:C.text, marginBottom:16 }}>Quick Links</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[['/', 'Home'],['/bible-seminar','Bible Seminar'],['/sermon/latest','Latest Sermon'],['/world-mission','World Mission'],['/introduction','Introduction'],['/login','Member Login']].map(([path,label]) => (
                  <Link key={path} to={path} style={{ fontSize:14, color:C.muted, transition:'color 0.18s', textDecoration:'none' }}
                    onMouseEnter={e => e.currentTarget.style.color=C.blue}
                    onMouseLeave={e => e.currentTarget.style.color=C.muted}>{label}</Link>
                ))}
                <a href="https://www.youtube.com/@PLWMManilaCentralChurch" target="_blank" rel="noopener noreferrer" style={{ fontSize:14, color:C.muted, transition:'color 0.18s', textDecoration:'none' }}
                  onMouseEnter={e => e.currentTarget.style.color='#FF0000'}
                  onMouseLeave={e => e.currentTarget.style.color=C.muted}>▶ YouTube Channel</a>
                <a href="https://www.facebook.com/group/plwmmcc" target="_blank" rel="noopener noreferrer" style={{ fontSize:14, color:C.muted, transition:'color 0.18s', textDecoration:'none' }}
                  onMouseEnter={e => e.currentTarget.style.color='#1877F2'}
                  onMouseLeave={e => e.currentTarget.style.color=C.muted}>📘 Facebook Group</a>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:C.text, marginBottom:16 }}>Service Times</div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {['☀️ Sunday 9:30–11:10 AM — Filipino Service (Main Hall)','☀️ Sunday 2:00–4:00 PM — Korean Service (Medium Hall)','📖 Wednesday 7:00–9:00 PM — Midweek Sermon (Main Hall)','🏘️ Saturday 2:00–4:00 PM — High School Fellowship','🏘️ Saturday 7:00–9:00 PM — Young Adult Fellowship','🔵 Tue & Thu 7:00 PM — Cell Group Meetings'].map(s => (
                  <span key={s} style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <p style={{ fontSize:12, color:C.light, margin:0 }}>© 2026 Manila Central Church · Philippine Life Word Mission (PLWM) · All rights reserved.</p>
            <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:7, background:C.navy, color:'#fff', fontSize:12, fontWeight:600, padding:'7px 14px', borderRadius:8, textDecoration:'none' }}>
              🔐 Church Management System
            </Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeDown { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:translateY(0);} }

        * { box-sizing:border-box; }
        html,body { overflow-x:hidden; max-width:100vw; }
        a { text-decoration:none; color:inherit; }
        img { max-width:100%; }

        /* Google Translate suppression */
        .goog-te-banner-frame, .skiptranslate { display:none !important; }
        .goog-te-gadget { display:none !important; }
        body { top:0 !important; }
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-aZ2wEe { display:none !important; }

        /* Nav breakpoints */
        @media (max-width:768px) {
          .desktop-nav { display:none !important; }
          .hamburger-btn { display:flex !important; }
        }

        /* Logo text hide on small screens */
        @media (max-width:400px) {
          .logo-text-hide { display:none; }
        }

        /* Page hero */
        .page-hero {
          background: linear-gradient(135deg,#0B2447,#1A3D72);
          padding: clamp(72px,12vw,104px) clamp(16px,4vw,24px) clamp(44px,8vw,64px);
          text-align: center;
        }
        .page-hero h1 {
          font-family: 'Lora', Georgia, serif;
          color: #fff;
          font-size: clamp(1.5rem,5vw,2.8rem);
          font-weight: 700;
          margin-bottom: 14px;
          line-height: 1.2;
        }
        .page-hero p {
          color: rgba(255,255,255,0.68);
          font-size: clamp(14px,3vw,16px);
          max-width: 540px;
          margin: 0 auto;
          line-height: 1.75;
        }

        /* Breadcrumb */
        .breadcrumb {
          display:flex; align-items:center; gap:6px;
          justify-content:center; margin-bottom:16px;
          font-size:11px; color:rgba(255,255,255,0.48);
          flex-wrap:wrap;
        }
        .breadcrumb a { color:rgba(255,255,255,0.60); }
        .breadcrumb a:hover { color:#C9A84C; }

        /* Prose */
        .prose { font-size:clamp(14px,2vw,15px); color:#475569; line-height:1.8; }
        .prose h3 { font-family:'Lora',Georgia,serif; font-size:clamp(1rem,2.5vw,1.15rem); font-weight:700; color:#0F1B33; margin-bottom:8px; margin-top:28px; }
        .prose h3:first-child { margin-top:0; }

        /* Cards */
        .card { background:#fff; border:1.5px solid #E2E8F0; border-radius:12px; padding:clamp(14px,3vw,24px); }
        .card:hover { border-color:#1565C0; box-shadow:0 4px 20px rgba(21,101,192,0.10); }

        /* Responsive grids */
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:clamp(12px,2vw,20px); }
        .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(12px,2vw,20px); }
        @media(max-width:900px)  { .grid3 { grid-template-columns:1fr 1fr; } }
        @media(max-width:600px)  { .grid2,.grid3 { grid-template-columns:1fr; } }

        section { padding-left:clamp(12px,4vw,24px) !important; padding-right:clamp(12px,4vw,24px) !important; }

        /* Fold overrides */
        @media(max-width:320px) {
          .page-hero h1 { font-size:1.3rem; }
          .page-hero { padding:60px 8px 32px; }
        }
      `}</style>
    </div>
  );
}
