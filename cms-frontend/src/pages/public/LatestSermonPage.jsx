import { Link } from 'react-router-dom';
import PublicLayout, { PlaylistEmbed } from './PublicLayout';

const C = { navy:'#0B2447', blue:'#1565C0', gold:'#C9A84C', white:'#fff', off:'#F4F7FB', border:'#E2E8F0', text:'#0F1B33', sub:'#475569', muted:'#64748B' };

// Playlist: PLT0Pgr_m_NoI2Y9-ACC5Je43gHaGHEyKK
const PLAYLIST_ID = 'PLT0Pgr_m_NoI2Y9-ACC5Je43gHaGHEyKK';

export default function LatestSermonPage() {
  return (
    <PublicLayout>
      <div className="page-hero">
        <div className="breadcrumb">
          <Link to="/">Home</Link> /&nbsp;
          <Link to="/sermon">Sermon</Link> /&nbsp;
          <span>Latest Sermon</span>
        </div>
        <h1>Latest Sermon</h1>
        <p>The most recent sermon from Manila Central Church — PLWM</p>
      </div>

      <section style={{ background: C.white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Main playlist player */}
          <div style={{ marginBottom: 36 }}>
            <PlaylistEmbed
              playlistId={PLAYLIST_ID}
              title="Latest Sermons — Manila Central Church (PLWM)"
              start={227}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
            {[
              { icon: '🏛️', title: 'Sunday Filipino Service',  time: 'Sunday 9:30 AM', pastor: 'Pastor Park HS' },
              { icon: '✝️', title: 'Sunday Korean Service',     time: 'Sunday 2:00 PM', pastor: 'Pastor Park HS' },
              { icon: '📖', title: 'Wednesday Midweek Sermon', time: 'Wednesday 7:00 PM', pastor: 'Various Pastors' },
              { icon: '🎓', title: 'Special Seminars',         time: 'As scheduled',     pastor: 'PLWM Evangelists' },
            ].map((s, i) => (
              <div key={i} style={{ background: C.off, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>{s.time}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{s.pastor}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Other sermon links */}
          <div style={{ background: C.navy, borderRadius: 14, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily:"'Lora',serif", fontSize:'1.05rem', color:'#fff', fontWeight:700, marginBottom:6 }}>More Sermon Resources</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>Watch Sunday sermons or the Christian Life Seminar series.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/sermon/sunday">
                <button style={{ background: C.gold, color: C.navy, border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Sunday Sermon</button>
              </Link>
              <Link to="/sermon/christian-life">
                <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Christian Life Seminar</button>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <a href="https://www.youtube.com/@PLWMManilaCentralChurch" target="_blank" rel="noopener noreferrer">
              <button style={{ background: '#FF0000', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                ▶ View Full Channel on YouTube
              </button>
            </a>
          </div>
        </div>
      </section>
      <style>{`
        @media (max-width: 900px) {
          [style*="grid-template-columns: '1fr 1fr'"],
          [style*="gridTemplateColumns:'1fr 1fr'"],
          [style*="gridTemplateColumns: '1fr 1fr'"],
          [style*="gridTemplateColumns:'1fr 380px'"],
          [style*="gridTemplateColumns: '1fr 380px'"],
          [style*="gridTemplateColumns:'280px 1fr'"],
          [style*="gridTemplateColumns: '280px 1fr'"] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          section { padding-left: 12px !important; padding-right: 12px !important; }
          [style*="repeat(auto-fill, minmax(210px"] { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 380px) {
          [style*="repeat(auto-fill, minmax(210px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </PublicLayout>
  );
}
