import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from './PublicLayout';

const C = { navy: '#0B2447', navyMid: '#14305E', navySoft: '#1A3D72', blue: '#1565C0', gold: '#C9A84C', goldL: '#E8C96A', white: '#fff', off: '#F4F7FB', border: '#E2E8F0', text: '#0F1B33', sub: '#475569', muted: '#64748B', light: '#94A3B8', green: '#2E7D32', greenBg: '#E8F5E9' };

const BIBLE_SEMINAR_TOPICS = [
  { n: '1', title: 'God Who Created the Heavens and the Earth Is Alive' },
  { n: '2', title: 'Creation and Historical Events in the Bible' },
  { n: '3', title: "What Is God's Purpose in Choosing Israel?" },
  { n: '4', title: 'Our History and the Future Through the Bible' },
  { n: '5', title: "What Is the End of Human History and God's Kingdom?" },
];

function Reveal({ children, delay = 0 }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(28px)', transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s` }}>
      {children}
    </div>
  );
}


/* ── Looping hero video via YouTube IFrame API ─────────────── */
function HeroVideo() {
  const containerRef = useRef(null);
  const playerRef    = useRef(null);
  const START_SEC    = 227; // where to start and loop back to

  useEffect(() => {
    // Load the YT IFrame API script once
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src   = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const init = () => {
      if (playerRef.current) return; // already created
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId:    '4v-66wXlQCE',
        playerVars: {
          autoplay:       1,
          mute:           1,
          controls:       0,
          showinfo:       0,
          rel:            0,
          disablekb:      1,
          iv_load_policy: 3,
          modestbranding: 1,
          start:          START_SEC,
          playsinline:    1,
        },
        events: {
          onReady: (e) => {
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e) => {
            // When video ends (state 0), seek back to start and keep playing
            if (e.data === window.YT.PlayerState.ENDED) {
              e.target.seekTo(START_SEC, true);
              e.target.playVideo();
            }
          },
        },
      });
    };

    // If API already loaded, init immediately; otherwise wait for callback
    if (window.YT && window.YT.Player) {
      init();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        init();
      };
    }

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div
        ref={containerRef}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '177.78vh', height: '100vh',
          minWidth: '100%', minHeight: '56.25vw',
          transform: 'translate(-50%, -50%)',
          border: 'none',
        }}
      />
    </div>
  );
}

export default function HomePage() {
  const [cgCount, setCgCount] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    // Fetch live cellgroup count from CMS public API
    const API = process.env.REACT_APP_API_URL || '';
    if (!API) { setCgCount(17); return; }
    fetch(`${API}/api/public/stats`)
      .then(r => r.json())
      .then(d => setCgCount(d.data?.cellGroups ?? 17))
      .catch(() => setCgCount(17));
  }, []);

  return (
    <PublicLayout>
      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '60px 24px 80px' }}>
        {/* Video background (desktop only) — loops from start point via YT IFrame API */}
        {!isMobile && <HeroVideo />}

        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: isMobile ? C.navy : 'linear-gradient(to bottom, rgba(11,36,71,0.88) 0%, rgba(11,36,71,0.78) 40%, rgba(11,36,71,0.88) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'radial-gradient(ellipse 70% 55% at 55% 0%, rgba(21,101,192,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Grid texture */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 3, maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.14)', border: '1px solid rgba(201,168,76,0.32)', color: C.gold, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 20, marginBottom: 24, animation: 'fadeUp 0.7s ease both' }}>
            <span style={{ width: 6, height: 6, background: C.gold, borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            Philippine Life Word Mission — Manila Central Church
          </div>

          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,5vw,3.4rem)', fontWeight: 700, color: '#fff', marginBottom: 8, animation: 'fadeUp 0.7s ease 0.1s both', lineHeight: 1.2 }}>
            Welcome to Our <em style={{ color: C.gold, fontStyle: 'normal' }}>Church</em>
          </h1>

          <p style={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontSize: 'clamp(0.9rem,2vw,1.1rem)', color: 'rgba(255,255,255,0.82)', marginBottom: 16, animation: 'fadeUp 0.7s ease 0.15s both' }}>
            Join us in Sermons, Fellowships, and Retreats
          </p>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', marginBottom: 32, fontStyle: 'italic', animation: 'fadeUp 0.7s ease 0.2s both' }}>
            "I shall not die, but live, and declare the works of the LORD" — Psalm 118:17
          </p>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.88)', marginBottom: 40, maxWidth: 480, margin: '0 auto 40px', animation: 'fadeUp 0.7s ease 0.25s both', lineHeight: 1.7 }}>
            A community rooted in faith, love, and mission — serving Manila and the Philippines for His glory.
          </p>

          {/* Cellgroups stat */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginBottom: 40, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: '18px 36px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', animation: 'fadeUp 0.7s ease 0.3s both' }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '2.6rem', fontWeight: 900, color: C.gold, lineHeight: 1, letterSpacing: '-1px' }}>
              {cgCount !== null ? cgCount : '—'}
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.18)' }} />
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Active Cellgroups</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.40)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 3 }}>Across Metro Manila</div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.7s ease 0.35s both' }}>
            <Link to="/introduction">
              <button style={{ background: C.blue, color: '#fff', border: 'none', padding: '13px 26px', borderRadius: 8, fontSize: 14.5, fontWeight: 600, cursor: 'pointer', minWidth: 170, boxShadow: '0 4px 16px rgba(21,101,192,0.32)', fontFamily: 'inherit' }}>
                ✦ Join Our Community
              </button>
            </Link>
            <Link to="/sermon/latest">
              <button style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.5)', padding: '13px 26px', borderRadius: 8, fontSize: 14.5, fontWeight: 600, cursor: 'pointer', minWidth: 170, fontFamily: 'inherit' }}>
                ▶ Watch Sermon
              </button>
            </Link>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 5, opacity: 0.35 }}>
          <span style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#fff' }}>Scroll</span>
          <div style={{ width: 18, height: 18, borderRight: '2px solid rgba(255,255,255,0.7)', borderBottom: '2px solid rgba(255,255,255,0.7)', transform: 'rotate(45deg)', animation: 'arrowBounce 1.8s ease infinite' }} />
        </div>
      </section>

      {/* PLWM Banner */}
      <div style={{ background: C.navyMid, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '18px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ background: C.blue, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.5px', textTransform: 'uppercase', flexShrink: 0 }}>PLWM</span>
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.68)' }}>
            <strong style={{ color: 'rgba(255,255,255,0.90)' }}>Philippine Life Word Mission</strong> — Manila Central Church is the mother church of PLWM, with churches and mission branches across the Philippines.
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>"I shall not die, but live…" — Ps 118:17</span>
        </div>
      </div>

      {/* ── GATHERINGS ── */}
      <section style={{ background: C.white, padding: '84px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <Reveal>
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.blue }}>
                <span style={{ width: 20, height: 2, background: C.blue, borderRadius: 2, display: 'inline-block' }} />Weekly Schedule
              </div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.6rem,3vw,2.3rem)', fontWeight: 700, color: C.text, marginBottom: 8 }}>Church Gatherings Schedule</h2>
              <p style={{ fontSize: 15, color: C.muted }}>Join us every week for worship, Word, and fellowship.</p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 28, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { icon: '🇵🇭', lang: 'Filipino Service', langColor: '#c62828', time: 'Sunday 9:30 AM', title: 'Filipino Sunday Sermon Service', pastor: 'Pastor Park HS', loc: 'Main Hall (3rd Floor)' },
                  { icon: '🇰🇷', lang: 'Korean Service',   langColor: C.blue,    time: 'Sunday 2:00 PM', title: 'Korean Sunday Sermon Service', pastor: 'Pastor Park HS', loc: 'Small Hall (2nd Floor)' },
                  { icon: '📖', lang: 'Midweek Service',  langColor: '#5c35b5', time: 'Wednesday 7:00 PM', title: 'Wednesday Midweek Sermon', pastor: 'Various Pastors', loc: 'Main Hall (3rd Floor)' },
                  { icon: '🏘️', lang: 'Youth & Young Adults', langColor: '#c07b0a', time: 'Saturday 2:00 PM & 7:00 PM', title: 'HS & YAG Fellowships', pastor: 'Evg. Leonell / Evg. Romnick', loc: 'Medium Hall (2nd Floor)' },
                ].map((s, i) => (
                  <Reveal key={i} delay={i * 0.08}>
                    <div style={{ background: C.off, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 20, transition: 'all 0.22s', cursor: 'default' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(21,101,192,0.35)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(11,36,71,0.09)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.off; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ width: 34, height: 34, background: 'rgba(21,101,192,0.10)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginBottom: 12 }}>{s.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: s.langColor, marginBottom: 4 }}>{s.lang}</div>
                      <div style={{ fontSize: 11, color: C.blue, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 5 }}>{s.time}</div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '0.95rem', fontWeight: 600, color: C.text, marginBottom: 6, lineHeight: 1.35 }}>{s.title}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{s.pastor}</div>
                      <div style={{ fontSize: 11.5, color: C.sub, display: 'flex', alignItems: 'center', gap: 5 }}>📍 {s.loc}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal delay={0.3}>
                <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(21,101,192,0.08)', border: '1px solid rgba(21,101,192,0.18)', borderRadius: 10, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>
                  <strong style={{ color: C.blue }}>Cell Group Meetings</strong> — Tuesday & Thursday evenings at 7:00 PM across various locations in Metro Manila.
                </div>
              </Reveal>
            </div>

            {/* Announcements sidebar */}
            <Reveal>
              <div style={{ background: C.off, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  Announcements
                  <span style={{ flex: 1, height: 1, background: C.border, display: 'inline-block' }} />
                </div>
                {[
                  { title: 'Cellgroup Bible Seminar', date: 'March 21–24, 2026' },
                  { title: 'Rosario Batangas Mission', date: "Bro. Arman's hometown outreach" },
                  { title: "Women's Group Fellowship", date: 'Friday 7:00 PM — Pastor Jayson' },
                  { title: 'Seoul Central Church Media Team', date: 'Documentary Team visit to MCC' },
                  { title: '2026 Summer Retreat Preparation', date: 'Home Visitation ongoing' },
                ].map((a, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 7, height: 7, background: C.blue, borderRadius: '50%', marginTop: 6, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{a.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── EVENTS ── */}
      <section id="events" style={{ background: C.off, padding: '84px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <Reveal>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.blue }}>
                <span style={{ width: 20, height: 2, background: C.blue, borderRadius: 2, display: 'inline-block' }} />Events & Retreats
              </div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.6rem,3vw,2.3rem)', fontWeight: 700, color: C.text, marginBottom: 8 }}>Upcoming Retreats / Events</h2>
              <p style={{ fontSize: 15, color: C.muted, marginBottom: 16 }}>Events posted by our Registration Team and Admins.</p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.greenBg, border: '1px solid rgba(46,125,50,0.25)', borderRadius: 10, padding: '10px 16px', marginBottom: 28, fontSize: 13, color: C.green }}>
              ✅ <strong>Live from Church System</strong> — Events below are posted by our Registration Team and Admins in real time.
            </div>
          </Reveal>

          <div style={{ display: 'flex', gap: 18, overflowX: 'auto', paddingBottom: 12 }}>
            {[
              { title: '2026 Summer Retreat — Batch 1 (Manila Region)', date: 'Apr 2–4', type: 'Retreat', venue: 'PLWM Taal Galilee Retreat Center', bg: `linear-gradient(135deg, ${C.navy}, ${C.navySoft})`, emoji: '🏕️' },
              { title: '2026 Summer Retreat — Batch 2', date: 'Apr 9–11', type: 'Retreat', venue: 'PLWM Taal Galilee Retreat Center', bg: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`, emoji: '⛺' },
              { title: 'Murcia & Pontevedra Mission Trip', date: 'Apr 19–26', type: 'Mission', venue: 'Negros Occidental', bg: 'linear-gradient(135deg, #1a3d2e, #0f2416)', emoji: '🌿' },
              { title: 'Cellgroup Bible Seminar', date: 'Mar 21–24', type: 'Seminar', venue: 'Main Hall, MCC', bg: 'linear-gradient(135deg, #4a1a1a, #2d0f0f)', emoji: '📖' },
              { title: 'Jinju Church Mission Team Collaboration', date: 'TBA', type: 'Mission', venue: 'Manila Central Church', bg: 'linear-gradient(135deg, #1a3a5e, #0f1e3a)', emoji: '✝️' },
            ].map((ev, i) => (
              <div key={i} style={{ flexShrink: 0, width: 250, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', transition: 'all 0.22s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.boxShadow = '0 8px 28px rgba(11,36,71,0.13)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ height: 130, background: ev.bg, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, opacity: 0.6 }}>
                  {ev.emoji}
                  <span style={{ position: 'absolute', top: 10, left: 10, background: C.gold, color: C.navy, fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 5 }}>{ev.date}</span>
                  <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(11,36,71,0.65)', color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.4px', backdropFilter: 'blur(4px)' }}>{ev.type}</span>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '0.92rem', fontWeight: 600, color: C.text, lineHeight: 1.4, marginBottom: 8 }}>{ev.title}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>📍 {ev.venue}</div>
                  <button style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', width: '100%', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Register</button>
                </div>
              </div>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: C.muted, padding: 14, background: '#fff', borderRadius: 10, border: `1px solid ${C.border}` }}>
              📌 <strong style={{ color: C.blue }}>Book 2–3 months in advance</strong> to guarantee your slot at retreats.
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BIBLE SEMINAR PROMO ── */}
      <section style={{ background: C.white, padding: '84px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <Reveal>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.blue }}>
                  <span style={{ width: 20, height: 2, background: C.blue, borderRadius: 2, display: 'inline-block' }} />Bible Seminar
                </div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.6rem,3vw,2.3rem)', fontWeight: 700, color: C.text, marginBottom: 16, lineHeight: 1.25 }}>
                  Are you looking for answers about life and eternal life?
                </h2>
                <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, marginBottom: 24 }}>
                  The Bible Seminar covers 7 sessions that share the Gospel message — exploring how the Bible is true and how God saved us through Jesus Christ.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {BIBLE_SEMINAR_TOPICS.map(t => (
                    <div key={t.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 24, height: 24, background: C.navy, color: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{t.n}</div>
                      <span style={{ fontSize: 14, color: C.sub, lineHeight: 1.4 }}>{t.title}</span>
                    </div>
                  ))}
                </div>
                <Link to="/bible-seminar">
                  <button style={{ background: C.blue, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Learn More →
                  </button>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: '📖', title: 'Prove the existence of God', desc: 'Meet the living God who created the heavens and earth and governs human history.' },
                  { icon: '✝️', title: 'Testify to the truthfulness of the Bible', desc: 'The Bible is not a mere religious book — it is God\'s history, containing His amazing grace.' },
                  { icon: '🕊️', title: 'Preach the Gospel of Jesus Christ', desc: 'Through Jesus Christ, the good news of redemption is delivered to all who are suffering from sin.' },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.off, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 38, height: 38, background: 'rgba(21,101,192,0.10)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 5 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── MISSION SECTION ── */}
      <section style={{ background: C.off, padding: '84px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <Reveal>
              <div>
                <div style={{ background: C.navy, borderRadius: 12, padding: '20px 22px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: 12, top: -10, fontFamily: "'Playfair Display',serif", fontSize: 80, color: 'rgba(255,255,255,0.06)', lineHeight: 1 }}>"</div>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', color: '#fff', lineHeight: 1.6, marginBottom: 8 }}>
                    "I shall not die, but live, And declare the works of the LORD."
                  </p>
                  <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>— Psalm 118:17</span>
                </div>
                <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, marginBottom: 20 }}>
                  Manila Central Church stands as the mother church of PLWM — the Philippine Life Word Mission. Through decades of faithful ministry, we have grown to plant churches and establish mission branches across every region of the Philippines.
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[['108', 'PLWM Churches'], ['60', 'Mission Branches'], ['3', 'Major Islands']].map(([num, label]) => (
                    <div key={label} style={{ flex: 1, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, color: C.blue }}>{num}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ background: C.navy, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", color: '#fff', fontSize: '1rem', marginBottom: 2 }}>2026 Philippine Life Word Mission</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Churches & Mission Branches Nationwide</div>
                </div>
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'radial-gradient(ellipse at 50% 40%, rgba(21,101,192,0.22) 0%, transparent 70%)' }}>
                  <div style={{ fontSize: 64, opacity: 0.5 }}>🗺️</div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', textAlign: 'center' }}>Churches & mission branches<br />across Luzon, Visayas, and Mindanao</p>
                </div>
                {[['#4FC3F7', 'Luzon Region', 'Manila, Cavite, Batangas & more'], ['#81C784', 'Visayas Region', 'Cebu, Iloilo, Leyte & more'], ['#FFB74D', 'Mindanao Region', 'CDO, Davao, Cotabato & more'], ['#CE93D8', 'Palawan & Islands', 'Palawan, Masbate, Catanduanes']].map(([dot, name, sub]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', flex: 1 }}>{name}</span>
                    <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)' }}>{sub}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: C.navy, padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 65% 75% at 100% 50%, rgba(21,101,192,0.22) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 700, color: '#fff', marginBottom: 16 }}>
            Become a <em style={{ color: C.gold, fontStyle: 'normal' }}>Member</em>
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginBottom: 24 }}>
            {['Join our church family', 'Experience Fellowship', 'Grow through Retreat'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, background: C.gold, borderRadius: '50%' }} />
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.68)', fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', marginBottom: 32, lineHeight: 1.7 }}>
            Join our community and experience the joy of Fellowship, Sermon, and Retreats. Every person belongs here.
          </p>
          <Link to="/introduction">
            <button style={{ background: C.gold, color: C.navy, border: 'none', fontWeight: 700, padding: '15px 36px', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
              Learn More →
            </button>
          </Link>
        </div>
      </section>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes arrowBounce { 0%,100%{transform:rotate(45deg) translateY(0);} 50%{transform:rotate(45deg) translateY(5px);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:translateY(0);} }

        /* Collapse all 2-col grids on tablet and below */
        @media(max-width:900px) {
          section > div > div[style*="grid-template-columns: minmax"] { grid-template-columns: 1fr !important; }
          section > div > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          section > div > div[style*="grid-template-columns: 1fr 300px"] { grid-template-columns: 1fr !important; }
        }

        /* Mobile: hero CTAs stack */
        @media(max-width:600px) {
          section > div > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }

        /* Samsung Fold closed (280px) */
        @media(max-width:320px) {
          section { padding-left: 8px !important; padding-right: 8px !important; }
        }
      `}</style>
    </PublicLayout>
  );
}
