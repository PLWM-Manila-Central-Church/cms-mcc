import { Link } from 'react-router-dom';
import PublicLayout, { VideoEmbed } from './PublicLayout';

const C = { navy:'#0B2447', blue:'#1565C0', gold:'#C9A84C', white:'#fff', off:'#F4F7FB', border:'#E2E8F0', text:'#0F1B33', sub:'#475569', muted:'#64748B' };

const VIDEOS = [
  { id: '6jDTQBiD1JY', n: 1, title: 'God Who Created the Heavens and the Earth Is Alive',        verse: 'Genesis 1:1' },
  { id: 'QTzLZgK_-lI', n: 2, title: 'Creation and Historical Events in the Bible',                verse: 'Isaiah 46:9' },
  { id: 'A1RAGMqa3iI', n: 3, title: "What Is God's Purpose in Choosing Israel?",                   verse: 'Isaiah 43:10' },
  { id: 'KG7M8qAHsdY', n: 4, title: 'Our History and the Future Through the Bible',                verse: 'Matthew 24:3' },
  { id: '-I4DKbntDTY', n: 5, title: "What Is the End of Human History and God's Kingdom?",        verse: 'Revelation 20:4' },
];

export default function BibleSeminarAdultsPage() {
  return (
    <PublicLayout>
      <div className="page-hero">
        <div className="breadcrumb">
          <Link to="/">Home</Link> /&nbsp;
          <Link to="/bible-seminar">Bible Seminar</Link> /&nbsp;
          <span>For Adults</span>
        </div>
        <h1>Bible Seminar — For Adults</h1>
        <p>A 5-part video series presenting the core truths of the Gospel</p>
      </div>

      <section style={{ background: C.white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ marginBottom: 40, maxWidth: 640 }}>
            <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75 }}>
              These five sessions cover the essential truths of the Bible — from creation and the history of Israel, to the end of human history and eternal salvation through Jesus Christ. Each video starts at the key teaching section.
            </p>
          </div>

          {/* Featured first video */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.blue }}>
              <span style={{ width: 20, height: 2, background: C.blue, borderRadius: 2, display: 'inline-block' }} />Session 1
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'center' }}>
              <VideoEmbed videoId={VIDEOS[0].id} title={VIDEOS[0].title} start={227} />
              <div>
                <div style={{ background: C.navy, color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 5, display: 'inline-block', marginBottom: 12 }}>Session 1</div>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.35rem', fontWeight:700, color:C.text, marginBottom:10, lineHeight:1.3 }}>{VIDEOS[0].title}</h3>
                <div style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginBottom: 12 }}>{VIDEOS[0].verse}</div>
                <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.7 }}>
                  You can meet the living God who created the heavens and the earth, governs the history of mankind, loves humanity, and judges the world with righteousness and holiness.
                </p>
              </div>
            </div>
          </div>

          {/* Sessions 2–5 grid */}
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', fontWeight:700, color:C.text, marginBottom:20 }}>More Sessions</h3>
          <div className="grid2">
            {VIDEOS.slice(1).map(v => (
              <div key={v.id} style={{ background: C.off, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(21,101,192,0.35)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(11,36,71,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}>
                <VideoEmbed videoId={v.id} title={`Session ${v.n}: ${v.title}`} start={227} style={{ borderRadius: 0 }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.blue, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5 }}>Session {v.n} · {v.verse}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'0.95rem', fontWeight:600, color:C.text, lineHeight:1.35 }}>{v.title}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop: 48, background: C.navy, borderRadius: 14, padding: '28px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', color:'#fff', fontWeight:700, marginBottom:6 }}>Want to attend a live Bible Seminar?</div>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>Check our schedule and join an upcoming session near you.</p>
            </div>
            <Link to="/bible-seminar/schedule">
              <button style={{ background: C.gold, color: C.navy, border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                View Schedule →
              </button>
            </Link>
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
