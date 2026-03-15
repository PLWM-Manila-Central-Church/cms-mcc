import { Link } from 'react-router-dom';
import PublicLayout from './PublicLayout';

const C = { navy:'#0B2447', blue:'#1565C0', gold:'#C9A84C', white:'#fff', off:'#F4F7FB', border:'#E2E8F0', text:'#0F1B33', sub:'#475569', muted:'#64748B' };

const TOPICS = [
  { n:1, title:'God Who Created the Heavens and the Earth Is Alive',      verse:'Genesis 1:1', body:'You can meet the living God who created the heavens and the earth, governs the history of mankind, loves humanity, and judges the world with righteousness and holiness.' },
  { n:2, title:'Creation and Historical Events in the Bible',               verse:'Isaiah 46:9', body:'Only the Almighty One who dwells in the eternal realm can declare the great events of human history exactly as they are. The Bible proves God authored history.' },
  { n:3, title:"What Is God's Purpose in Choosing Israel?",                  verse:'Isaiah 43:10', body:'As God\'s chosen people, Israel was set apart to testify about Him — a nation with a miraculous history of rise and fall, a witness to the living God even today.' },
  { n:4, title:'Our History and the Future Through the Bible',               verse:'Matthew 24:3', body:'God predetermined the timeline of history. Once His plans are fulfilled, history will come to an end. Jesus Christ will return, marking the conclusion of the age of salvation.' },
  { n:5, title:'Human Sin and Its Consequences',                             verse:'Hebrews 9:27', body:'Death is not the end. After death comes judgment. Each of us will one day stand before God and face His righteous judgment for the lives we have lived.' },
  { n:6, title:'Eternal Atonement, Perfect Salvation',                       verse:'Hebrews 9:12', body:'Through His own blood, Jesus Christ obtained eternal redemption — washing away the sins of all mankind from Adam to the last person ever born.' },
  { n:7, title:"God's Love Revealed in the Gospel",                          verse:'2 Corinthians 5:14', body:'Since all became sinners in Adam, the righteous One — Jesus Christ — bore the penalty of sin by dying in our place. This is the heart of the Gospel.' },
];

export default function BibleSeminarPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <div className="page-hero">
        <div className="breadcrumb">
          <Link to="/">Home</Link> <span>/</span> <span>Bible Seminar</span>
        </div>
        <h1>Bible Seminar</h1>
        <p>Are you looking for answers about life and eternal life?</p>
      </div>

      {/* Intro */}
      <section style={{ background: C.white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start', marginBottom: 56 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.blue }}>
                <span style={{ width: 20, height: 2, background: C.blue, borderRadius: 2, display: 'inline-block' }} />What is the Bible Seminar?
              </div>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.5rem,2.5vw,2rem)', fontWeight:700, color:C.text, marginBottom:16, lineHeight:1.3 }}>
                The Gospel shared through 7 powerful sermons
              </h2>
              <p className="prose" style={{ marginBottom: 20 }}>
                A Bible Seminar is a seminar that shares the gospel message — primarily composed of seven sermons that summarize and explain how the Bible is true and how God saved us from sin through Jesus Christ.
              </p>
              <p className="prose" style={{ marginBottom: 24 }}>
                The seminar covers history in the Bible and world history, wisdom in the Bible and modern science, prophecies in the Bible and their relevance to the present and future.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[['📖', 'Prove the existence of God', 'Meet the living God who created the heavens and earth.'],
                  ['✝️', "Testify to the Bible's truth", "The Bible is not mere religion — it is God's history."],
                  ['🕊️', 'Preach the Gospel of Jesus Christ', 'The good news of redemption delivered to all people.']
                ].map(([icon, t, d]) => (
                  <div key={t} style={{ display:'flex', gap:12, alignItems:'flex-start', background:C.off, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'14px 16px' }}>
                    <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:700, color:C.text, marginBottom:3 }}>{t}</div>
                      <div style={{ fontSize:13, color:C.muted }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: C.navy, borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'24px 24px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', fontWeight:700, color:'#fff', marginBottom:8 }}>"The greatest problem in life"</div>
                <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.6)', lineHeight:1.7 }}>
                  Throughout a person's life, there are countless things to learn and accomplish. However, among them, there are a few absolute issues that must be understood and resolved — questions about God, the Bible, and eternal life.
                </p>
              </div>
              <div style={{ padding:'20px 24px' }}>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', fontStyle:'italic', lineHeight:1.7, marginBottom:14 }}>
                  "But God said to him, 'Fool! This night your soul will be required of you; then whose will those things be which you have provided? So is he who lays up treasure for himself, and is not rich toward God.'"
                </div>
                <div style={{ fontSize:12, color:C.gold, fontWeight:700 }}>— Luke 12:20–21</div>
              </div>
            </div>
          </div>

          {/* Sub-nav */}
          <div style={{ display:'flex', gap:12, marginBottom:48, flexWrap:'wrap' }}>
            {[['For Adults (Video Series)', '/bible-seminar/adults', C.blue, '#fff'],
              ['Bible Seminar Schedule',   '/bible-seminar/schedule', C.off, C.text]].map(([label, path, bg, color]) => (
              <Link key={path} to={path}>
                <button style={{ background:bg, color, border:`1.5px solid ${bg === C.off ? C.border : bg}`, padding:'11px 22px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {label} →
                </button>
              </Link>
            ))}
          </div>

          {/* 7 Topics */}
          <div>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:700, color:C.text, marginBottom:24 }}>The 7 Seminar Topics</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {TOPICS.map(t => (
                <div key={t.n} style={{ display:'flex', gap:16, alignItems:'flex-start', background:C.off, border:`1.5px solid ${C.border}`, borderRadius:12, padding:'20px 22px', transition:'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='rgba(21,101,192,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background=C.off; e.currentTarget.style.borderColor=C.border; }}>
                  <div style={{ width:36, height:36, background:C.navy, color:'#fff', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>{t.n}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1rem', fontWeight:600, color:C.text, marginBottom:4, lineHeight:1.35 }}>{t.title}</div>
                    <div style={{ fontSize:11, color:C.blue, fontWeight:700, marginBottom:6, letterSpacing:'0.4px' }}>{t.verse}</div>
                    <div style={{ fontSize:13.5, color:C.sub, lineHeight:1.65 }}>{t.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
