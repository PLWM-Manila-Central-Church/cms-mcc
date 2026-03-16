import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const C = {
  navy:'#0B2447', navyMid:'#14305E', navySoft:'#1A3D72',
  blue:'#1565C0', blueH:'#1976D2', blueGlow:'rgba(21,101,192,0.10)',
  gold:'#C9A84C', goldL:'#E8C96A',
  white:'#FFFFFF', off:'#F4F7FB', border:'#E2E8F0',
  text:'#0F1B33', sub:'#475569', muted:'#64748B', light:'#94A3B8',
};

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

const LANGS = [
  { code:'en',  label:'English',            flag:'🇺🇸', native:'English'   },
  { code:'ko',  label:'Korean',             flag:'🇰🇷', native:'한국어'     },
  { code:'tl',  label:'Filipino (Tagalog)', flag:'🇵🇭', native:'Filipino'  },
  { code:'ceb', label:'Cebuano',            flag:'🇵🇭', native:'Bisaya'    },
  { code:'ilo', label:'Ilocano',            flag:'🇵🇭', native:'Ilokano'   },
  { code:'hil', label:'Hiligaynon',         flag:'🇵🇭', native:'Ilonggo'   },
  { code:'war', label:'Waray',              flag:'🇵🇭', native:'Winaray'   },
  { code:'bcl', label:'Bikol',              flag:'🇵🇭', native:'Bikolano'  },
];

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
      <div style={{ maxWidth:1160, margin:'0 auto' }}>{children}</div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom:48 }}>
      {eyebrow && <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:C.blue }}><span style={{ width:20, height:2, background:C.blue, borderRadius:2, display:'inline-block' }} />{eyebrow}</div>}
      {title && <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.6rem,3vw,2.3rem)', fontWeight:700, color:C.text, marginBottom:8, lineHeight:1.25 }}>{title}</h2>}
      {sub && <p style={{ fontSize:15, color:C.muted, lineHeight:1.65 }}>{sub}</p>}
    </div>
  );
}

export default function PublicLayout({ children }) {
  const [openNav,      setOpenNav]      = useState(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [mobileSub,    setMobileSub]    = useState(null);
  const [langOpen,     setLangOpen]     = useState(false);
  const [currentLang,  setCurrentLang]  = useState('English');
  const [scrolled,     setScrolled]     = useState(false);
  const location = useLocation();
  const langRef  = useRef(null);
  const navRef   = useRef(null);
  const isHome   = location.pathname === '/';

  // Scroll detection
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive:true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setMobileOpen(false); setOpenNav(null); setMobileSub(null);
  }, [location]);

  // Close lang on outside click
  useEffect(() => {
    const fn = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Close nav dropdown on outside click
  useEffect(() => {
    if (!openNav) return;
    const fn = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpenNav(null); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [openNav]);

  // Google Translate
  useEffect(() => {
    if (document.getElementById('gt-script')) return;
    window.googleTranslateElementInit = () => {
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement({ pageLanguage:'en', autoDisplay:false }, 'google_translate_element');
    };
    const s = document.createElement('script');
    s.id = 'gt-script';
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const switchLang = (lang) => {
    setCurrentLang(lang.label); setLangOpen(false);
    const apply = () => {
      try { const sel = document.querySelector('.goog-te-combo'); if (sel) { sel.value = lang.code; sel.dispatchEvent(new Event('change')); return true; } } catch(_) {}
      return false;
    };
    if (!apply()) { let t = 0; const iv = setInterval(() => { t++; if (apply() || t > 20) clearInterval(iv); }, 250); }
  };

  // Lock scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const headerBg = isHome
    ? (scrolled ? 'rgba(11,36,71,0.97)' : 'rgba(11,36,71,0.15)')
    : 'rgba(11,36,71,0.97)';

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:C.text, minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <div id="google_translate_element" style={{ position:'fixed', bottom:-200, left:0, opacity:0, pointerEvents:'none', zIndex:-1 }} />

      {/* ── UNIFIED STICKY/FIXED TOP BAR — lang + nav scroll together ── */}
      <div style={{
        position: isHome ? 'fixed' : 'sticky',
        top:0, left:0, right:0, zIndex:1001,
        boxShadow: scrolled || !isHome ? '0 2px 20px rgba(0,0,0,0.22)' : 'none',
        transition: 'box-shadow 0.3s',
      }}>

        {/* Language bar */}
        <div style={{ background:C.navyMid, borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'5px 24px' }}>
          <div style={{ maxWidth:1160, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,0.45)' }}>
              <span>🌐</span>
              <span>Language / 언어 / Wika</span>
            </div>
            <div ref={langRef} style={{ position:'relative' }}>
              <button onClick={() => setLangOpen(o => !o)}
                style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', color:'rgba(255,255,255,0.85)', fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:20, cursor:'pointer', fontFamily:'inherit' }}>
                🌐 {currentLang} <span style={{ fontSize:10, opacity:0.6 }}>▼</span>
              </button>
              {langOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12, boxShadow:'0 8px 32px rgba(11,36,71,0.14)', minWidth:200, zIndex:2000, overflow:'hidden' }}>
                  {[{groupLabel:'International', langs:LANGS.slice(0,2)},{groupLabel:'Filipino Dialects', langs:LANGS.slice(2)}].map(group => (
                    <div key={group.groupLabel}>
                      <div style={{ padding:'6px 14px 3px', fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'1.2px', textTransform:'uppercase', background:C.off }}>{group.groupLabel}</div>
                      {group.langs.map(lang => (
                        <button key={lang.code} onClick={() => switchLang(lang)}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', fontSize:13, fontWeight:currentLang===lang.label ? 700 : 500, color:currentLang===lang.label ? C.blue : C.text, background:currentLang===lang.label ? C.blueGlow : '#fff', border:'none', width:'100%', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
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
          </div>
        </div>

        {/* Header / Nav */}
        <header style={{
          height:68, padding:'0 24px', display:'flex', alignItems:'center',
          background: headerBg,
          backdropFilter: scrolled || !isHome ? 'blur(16px)' : 'none',
          transition: 'background 0.3s, backdrop-filter 0.3s',
        }}>
          <div ref={navRef} style={{ maxWidth:1160, width:'100%', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>

            {/* Logo */}
            <Link to="/" style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
              <img src={process.env.PUBLIC_URL + '/logo.jpg'} alt="PLWM-MCC"
                style={{ width:42, height:42, borderRadius:8, objectFit:'contain', background:'rgba(255,255,255,0.1)', padding:2 }} />
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13.5, fontWeight:700, color:'#fff', lineHeight:1.2 }}>Manila Central Church</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.50)', letterSpacing:'0.6px', textTransform:'uppercase' }}>PLWM — Parañaque City, Philippines</div>
              </div>
            </Link>

            {/* Desktop nav — CLICK-TOGGLE (not hover) */}
            <nav style={{ display:'flex', alignItems:'center', gap:4 }} className="desktop-nav">
              {NAV.map(item => (
                <div key={item.label} style={{ position:'relative' }}>
                  <button
                    onClick={() => setOpenNav(prev => prev === item.label ? null : item.label)}
                    aria-expanded={openNav === item.label}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:5,
                      padding:'6px 14px', fontSize:13.5, fontWeight:500,
                      color: openNav === item.label ? C.gold : 'rgba(255,255,255,0.85)',
                      background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                      borderBottom:`2px solid ${openNav === item.label ? C.gold : 'transparent'}`,
                      transition:'color 0.18s, border-color 0.18s', whiteSpace:'nowrap',
                    }}>
                    {item.label}
                    <span style={{ fontSize:8, opacity:0.6, transition:'transform 0.2s', display:'inline-block', transform: openNav === item.label ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </button>
                  {openNav === item.label && (
                    <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12, boxShadow:'0 8px 32px rgba(11,36,71,0.14)', minWidth:220, zIndex:999, padding:'6px 0', animation:'fadeDown 0.16s ease' }}>
                      {item.children.map(child => (
                        <Link key={child.path} to={child.path} onClick={() => setOpenNav(null)}
                          style={{ display:'block', padding:'10px 18px', fontSize:13.5, color:C.text, fontWeight:500, borderLeft:'3px solid transparent', transition:'all 0.14s' }}
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

            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Link to="/login">
                <button style={{ background:C.gold, color:C.navy, fontWeight:700, padding:'8px 18px', borderRadius:8, fontSize:13, cursor:'pointer', border:'none', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  Member Login →
                </button>
              </Link>
              {/* Hamburger */}
              <button onClick={() => setMobileOpen(o => !o)}
                style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:8, flexDirection:'column', gap:5 }}
                className="hamburger-btn" aria-label="Toggle menu">
                <span style={{ display:'block', width:22, height:2, background:'#fff', borderRadius:2, transition:'all 0.25s', transform: mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
                <span style={{ display:'block', width:22, height:2, background:'#fff', borderRadius:2, opacity: mobileOpen ? 0 : 1, transition:'opacity 0.2s' }} />
                <span style={{ display:'block', width:22, height:2, background:'#fff', borderRadius:2, transition:'all 0.25s', transform: mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
              </button>
            </div>
          </div>
        </header>
      </div>
      {/* End unified top bar */}

      {/* Mobile full-screen nav */}
      {mobileOpen && (
        <div style={{ position:'fixed', inset:0, background:C.navy, zIndex:998, padding:'110px 28px 40px', overflowY:'auto', display:'flex', flexDirection:'column', gap:0 }}>
          {NAV.map(item => (
            <div key={item.label}>
              <button
                onClick={() => setMobileSub(prev => prev === item.label ? null : item.label)}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', fontSize:20, fontWeight:600, color:'rgba(255,255,255,0.92)', padding:'14px 0', background:'none', border:'none', borderBottom:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', fontFamily:"'Playfair Display',serif", textAlign:'left' }}>
                {item.label}
                <span style={{ fontSize:12, opacity:0.5, transition:'transform 0.2s', display:'inline-block', transform: mobileSub === item.label ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>
              {mobileSub === item.label && (
                <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, margin:'6px 0 8px', overflow:'hidden' }}>
                  {item.children.map(child => (
                    <Link key={child.path} to={child.path}
                      style={{ display:'block', fontSize:15, color:'rgba(255,255,255,0.72)', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link to="/login" style={{ marginTop:24 }}>
            <button style={{ background:C.gold, color:C.navy, fontWeight:700, padding:14, borderRadius:8, fontSize:15, cursor:'pointer', border:'none', fontFamily:'inherit', width:'100%' }}>
              Member Login →
            </button>
          </Link>
        </div>
      )}

      <main style={{ flex:1 }}>{children}</main>

      {/* Footer */}
      <footer style={{ background:C.off, borderTop:`1px solid ${C.border}`, padding:'60px 24px 32px' }}>
        <div style={{ maxWidth:1160, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:40, marginBottom:48 }}>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:700, color:C.text, marginBottom:8 }}>Manila Central Church</div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:20, maxWidth:280 }}>Mother Church of Philippine Life Word Mission (PLWM). Serving Manila and the Philippines through the Word of God.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[['📍','Address','Church address (to be updated)'],['📞','Phone','Contact number (to be updated)'],['✉️','Email','Church email (to be updated)']].map(([icon,label,value]) => (
                  <div key={label} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ width:30, height:30, background:'rgba(21,101,192,0.1)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
                      <div style={{ fontSize:13, color:C.light, fontStyle:'italic' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:C.text, marginBottom:16 }}>Quick Links</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[['/', 'Home'],['/bible-seminar','Bible Seminar'],['/sermon/latest','Latest Sermon'],['/world-mission','World Mission'],['/introduction','Introduction'],['/login','Member Login']].map(([path,label]) => (
                  <Link key={path} to={path} style={{ fontSize:13.5, color:C.muted, transition:'color 0.18s' }}
                    onMouseEnter={e => e.currentTarget.style.color=C.blue}
                    onMouseLeave={e => e.currentTarget.style.color=C.muted}>{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:C.text, marginBottom:16 }}>Service Times</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {['☀️ Sunday 9:30 AM — Filipino Service','☀️ Sunday 2:00 PM — Korean Service','📖 Wednesday 7:00 PM — Midweek','🏘️ Saturday 2:00 PM — HS Fellowship','🏘️ Saturday 7:00 PM — YAG Fellowship','🔵 Tue & Thu 7:00 PM — Cell Groups'].map(s => (
                  <span key={s} style={{ fontSize:13, color:C.muted }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <p style={{ fontSize:12, color:C.light }}>© 2026 Manila Central Church · Philippine Life Word Mission (PLWM) · All rights reserved.</p>
            <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:7, background:C.navy, color:'#fff', fontSize:12, fontWeight:600, padding:'7px 14px', borderRadius:8 }}>
              🔐 Church Management System
            </Link>
          </div>
        </div>
      </footer>

      <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        html,body { overflow-x:hidden; max-width:100vw; }
        a { text-decoration:none; color:inherit; }
        img { max-width:100%; }

        @keyframes fadeDown { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:translateY(0);} }

        /* ── Google Translate suppression ── */
        .goog-te-banner-frame, .skiptranslate { display:none !important; }
        .goog-te-gadget { display:none !important; }
        body { top:0 !important; }
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-aZ2wEe { display:none !important; }

        /* ── Nav breakpoints ── */
        @media (max-width:768px) {
          .desktop-nav { display:none !important; }
          .hamburger-btn { display:flex !important; }
        }

        /* ── Page hero ── */
        .page-hero {
          background:linear-gradient(135deg,#0B2447,#1A3D72);
          padding:clamp(70px,12vw,100px) clamp(12px,4vw,24px) clamp(40px,8vw,60px);
          text-align:center;
        }
        .page-hero h1 {
          font-family:'Playfair Display',serif;
          color:#fff;
          font-size:clamp(1.4rem,5vw,2.8rem);
          font-weight:700;
          margin-bottom:12px;
          line-height:1.2;
        }
        .page-hero p {
          color:rgba(255,255,255,0.65);
          font-size:clamp(13px,3vw,16px);
          max-width:540px;
          margin:0 auto;
          line-height:1.65;
        }

        /* ── Breadcrumb ── */
        .breadcrumb {
          display:flex; align-items:center; gap:6px;
          justify-content:center; margin-bottom:16px;
          font-size:11px; color:rgba(255,255,255,0.50);
          flex-wrap:wrap;
        }
        .breadcrumb a { color:rgba(255,255,255,0.60); }
        .breadcrumb a:hover { color:#C9A84C; }

        /* ── Prose ── */
        .prose { font-size:clamp(13px,2vw,15px); color:#475569; line-height:1.8; }
        .prose h3 { font-family:'Playfair Display',serif; font-size:clamp(1rem,2.5vw,1.15rem); font-weight:700; color:#0F1B33; margin-bottom:8px; margin-top:28px; }
        .prose h3:first-child { margin-top:0; }

        /* ── Cards ── */
        .card { background:#fff; border:1.5px solid #E2E8F0; border-radius:12px; padding:clamp(14px,3vw,24px); }
        .card:hover { border-color:#1565C0; box-shadow:0 4px 20px rgba(21,101,192,0.1); }

        /* ── Responsive grids ── */
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:clamp(12px,2vw,20px); }
        .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(12px,2vw,20px); }
        @media(max-width:900px)  { .grid3 { grid-template-columns:1fr 1fr; } }
        @media(max-width:600px)  { .grid2,.grid3 { grid-template-columns:1fr; } }

        /* ── Section padding scales ── */
        section { padding-left:clamp(12px,4vw,24px) !important; padding-right:clamp(12px,4vw,24px) !important; }

        /* ── Table horizontal scroll ── */
        .table-scroll { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; }

        /* ── Fold (280–320px) specific overrides ── */
        @media(max-width:320px) {
          .page-hero h1 { font-size:1.3rem; }
          .page-hero { padding:60px 8px 32px; }
        }
      \`}</style>
    </div>
  );
}
