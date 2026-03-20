import { Link } from 'react-router-dom';
import PublicLayout, { PlaylistEmbed, VideoEmbed } from './PublicLayout';

const C = { navy:'#0B2447', navyMid:'#14305E', blue:'#1565C0', gold:'#C9A84C', white:'#fff', off:'#F4F7FB', border:'#E2E8F0', text:'#0F1B33', sub:'#475569', muted:'#64748B', light:'#94A3B8' };

const PageHero = ({ breadcrumbs, title, sub }) => (
  <div className="page-hero">
    <div className="breadcrumb">
      {breadcrumbs.map((b, i) => (
        <span key={i}>
          {i > 0 && <span> /&nbsp;</span>}
          {b.path ? <Link to={b.path}>{b.label}</Link> : <span>{b.label}</span>}
        </span>
      ))}
    </div>
    <h1>{title}</h1>
    {sub && <p>{sub}</p>}
  </div>
);

// ── SERMON INDEX ──────────────────────────────────────────────
export function SermonPage() {
  const items = [
    { path: '/sermon/latest', icon: '🔴', title: 'Latest Sermon', desc: 'Watch the most recent message from Manila Central Church, updated weekly.' },
    { path: '/sermon/sunday', icon: '☀️', title: 'Sunday Sermon', desc: 'Full archive of Sunday morning and afternoon messages from our services.' },
    { path: '/sermon/christian-life', icon: '🕊️', title: 'Christian Life Seminar', desc: 'A series of teachings on living a godly, Spirit-filled Christian life.' },
  ];
  return (
    <PublicLayout>
      <PageHero breadcrumbs={[{label:'Home',path:'/'},{label:'Sermon'}]} title="Sermon" sub="Messages from the Word of God — for the building up of the Church." />
      <section style={{ background: C.white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map(item => (
              <Link key={item.path} to={item.path} style={{ display:'flex', gap:20, alignItems:'center', background:C.off, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'24px 28px', transition:'all 0.22s' }}
                onMouseEnter={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='rgba(21,101,192,0.35)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(11,36,71,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.background=C.off; e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow='none'; }}>
                <div style={{ width:54, height:54, background:'rgba(21,101,192,0.10)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{item.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Lora',serif", fontSize:'1.1rem', fontWeight:700, color:C.text, marginBottom:5 }}>{item.title}</div>
                  <div style={{ fontSize:14, color:C.sub, lineHeight:1.55 }}>{item.desc}</div>
                </div>
                <div style={{ fontSize:20, color:C.light, flexShrink:0 }}>→</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

// ── SUNDAY SERMON ─────────────────────────────────────────────
export function SundaySermonPage() {
  return (
    <PublicLayout>
      <PageHero breadcrumbs={[{label:'Home',path:'/'},{label:'Sermon',path:'/sermon'},{label:'Sunday Sermon'}]} title="Sunday Sermon" sub="Messages preached every Sunday at Manila Central Church" />
      <section style={{ background: C.white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:24 }}>
              {[{time:'9:30 AM', label:'Filipino Sunday Service', pastor:'Pastor Park HS'},{time:'2:00 PM', label:'Korean Sunday Service', pastor:'Pastor Park HS'}].map(s => (
                <div key={s.time} style={{ flex:1, minWidth:200, background:C.off, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'14px 18px' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.blue, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{s.time}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontSize:13, color:C.muted }}>{s.pastor}</div>
                </div>
              ))}
            </div>
          </div>
          <PlaylistEmbed playlistId="PLT0Pgr_m_NoI2Y9-ACC5Je43gHaGHEyKK" title="Sunday Sermons — Manila Central Church" start={227} />
          <div style={{ marginTop:24, textAlign:'center' }}>
            <a href="https://www.youtube.com/@PLWMManilaCentralChurch" target="_blank" rel="noopener noreferrer">
              <button style={{ background:'#FF0000', color:'#fff', border:'none', padding:'11px 24px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:8 }}>
                ▶ View All on YouTube
              </button>
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

// ── CHRISTIAN LIFE SEMINAR ────────────────────────────────────
export function ChristianLifePage() {
  const SERMONS = [
    { id: 'Y08A1zp1QH8', title: 'Christian Life Seminar — Sermon 1' },
    { id: 'tkGdumFkYPk', title: 'Christian Life Seminar — Sermon 2' },
  ];
  return (
    <PublicLayout>
      <PageHero breadcrumbs={[{label:'Home',path:'/'},{label:'Sermon',path:'/sermon'},{label:'Christian Life Seminar'}]} title="Christian Life Seminar" sub="Teachings on living a godly, Spirit-filled Christian life" />
      <section style={{ background: C.white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ maxWidth:600, marginBottom:32 }}>
            <p style={{ fontSize:15, color:C.sub, lineHeight:1.75 }}>The Christian Life Seminar is a teaching series that helps believers understand what it means to live as a child of God — walking in the Spirit, growing in faith, and bearing fruit for His Kingdom.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
            {SERMONS.map((s, i) => (
              <div key={s.id}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:C.blue, marginBottom:10 }}>Sermon {i + 1}</div>
                <VideoEmbed videoId={s.id} title={s.title} />
              </div>
            ))}
          </div>
          <div style={{ marginTop:28, textAlign:'center' }}>
            <a href="https://www.youtube.com/@PLWMManilaCentralChurch" target="_blank" rel="noopener noreferrer">
              <button style={{ background:'#FF0000', color:'#fff', border:'none', padding:'11px 24px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:8 }}>
                ▶ View Full Channel on YouTube
              </button>
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

// ── WORLD MISSION ─────────────────────────────────────────────
export function WorldMissionPage() {
  return (
    <PublicLayout>
      <PageHero breadcrumbs={[{label:'Home',path:'/'},{label:'World Mission'}]} title="World Mission" sub="Spreading the Gospel across every island of the Philippines and beyond" />
      <section style={{ background: C.white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'start', marginBottom:56 }}>
            <div>
              <div style={{ background:C.navy, borderRadius:12, padding:'20px 22px', marginBottom:24, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', right:12, top:-10, fontFamily:"'Lora',serif", fontSize:80, color:'rgba(255,255,255,0.05)', lineHeight:1 }}>"</div>
                <p style={{ fontFamily:"'Lora',serif", fontSize:'1.05rem', color:'#fff', lineHeight:1.6, marginBottom:8 }}>"I shall not die, but live, And declare the works of the LORD."</p>
                <span style={{ fontSize:12, color:C.gold, fontWeight:700 }}>— Psalm 118:17</span>
              </div>
              <p style={{ fontSize:15, color:C.sub, lineHeight:1.75, marginBottom:20 }}>
                Manila Central Church stands as the mother church of PLWM — the Philippine Life Word Mission. Through decades of faithful ministry, we have grown to plant churches and establish mission branches across every region of the Philippines.
              </p>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {[['108','PLWM Churches'],['60','Mission Branches'],['3','Major Island Groups']].map(([num,label])=>(
                  <div key={label} style={{ flex:1, minWidth:100, background:C.off, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'14px', textAlign:'center' }}>
                    <div style={{ fontFamily:"'Lora',serif", fontSize:'1.8rem', fontWeight:900, color:C.blue }}>{num}</div>
                    <div style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:3 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:24 }}>
                <Link to="/world-mission/status">
                  <button style={{ background:C.blue, color:'#fff', border:'none', padding:'12px 22px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    View Mission Status →
                  </button>
                </Link>
              </div>
            </div>
            <div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[['🇵🇭','Manila Region','Metro Manila, Calabarzon, Cavite, Batangas'],['🏝️','Visayas','Cebu, Iloilo, Leyte, Samar, Bohol'],['🌴','Mindanao','CDO, Davao, Cotabato, Sultan Kudarat'],['🌊','Palawan & Islands','Palawan, Masbate, Catanduanes, Basilan']].map(([flag,name,places])=>(
                  <div key={name} style={{ display:'flex', gap:14, alignItems:'flex-start', background:C.off, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'14px 16px' }}>
                    <span style={{ fontSize:22, flexShrink:0 }}>{flag}</span>
                    <div>
                      <div style={{ fontWeight:700, color:C.text, fontSize:14, marginBottom:3 }}>{name}</div>
                      <div style={{ fontSize:12.5, color:C.muted }}>{places}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

// ── MISSION STATUS ────────────────────────────────────────────
export function MissionStatusPage() {
  // ── PLWM Churches (108 total from official map) ──────────
  const CHURCHES = [
    'Manila Central Church','Naga Church','Quezon City Church','Cavite Church','Ortigas Church',
    'Pili Church','Subic Church','Malolos Church','Bani Church','Tagkawayan Church',
    'Angat Church','Lapidario Church','Dasmariñas Church','Palawan Church','Calauan Church',
    'Ligao Church','San Jose Del Monte Church','Bato Catanduanes Church','Manila City Church','Castillejos Church',
    'Kaylavay Church','Davao Toril Church','Siit Church','Cebu Church','Cagayan De Oro Church',
    'Tanauan Church (Taal Galilee Retreat Center)','Sultan Kudarat Church','Malasiqui Church','Iloilo Church','Palawan Quezon Church',
    'Hilongos, Leyte Church','Angeles Church','Virac Church','Dumaguete Church','Cabiao Church',
    'Caloocan Church','Sta. Magdalena Church','Bagong Silang Church','Santa Rosa Church','Marilao Church',
    'Tambac Church','Tanza Church','San Narciso Church','Ilagan Church','Tarlac Church',
    'Camalig Church','Palawan Roxas Church','Imus Church','Ragay Church','Sipocot Church',
    'Agno Church','Sta. Cruz Church','Valenzuela Church','Baclaran Church','Bacolod Church',
    'Pamplona Church','San Fabian Church','Hagonoy Church','Sta. Maria Church (Isabela)','Guinayangan Church',
    'Gigmoto Church','Palawan Sta. Teresita Church','Umingan Church','Quezon City East Church','Española Church (Palawan)',
    'San Rafael Church (Iloilo)','Ballesteros Church (Cagayan)','Antonino Church (Palawan)','Davao City Church','Baybay Church (Leyte)',
    'Burias Church (Masbate)','Tinambac Church (Naga)','Bataan Church','Tablon Church (CDO)','Langkaan Church',
    'Calauag Church','Capalonga Church','Burgos Ilocos Sur Church','San Manuel Church','Bocaue Church',
    'Abongan Church','Tanatanaon Church','Antipolo Church','Panitan Church','Iloilo City Church',
    'Sto. Nino Church','Bacoor Church','Gingoog City Church','Apalit Church','Sagay Bato Church',
    'Ramon Church','Tondo Church','Tagaytay Church','Pandi Church','Sual Church',
    'Baguio Church','Iba Church','Tubao Church','Tumarbong Church','Dumaran Island Church',
    'Legaspi Church','Pasacao Church','Tiaong Church','Sibuyan Romblon Church','Catubig Church (Northern Samar)',
    'Mariveles Church','Siaton Church','Meycauayan Church',
  ];

  // ── PLWM Mission Branches (60 total from official map) ───
  const MISSION_BRANCHES = [
    'Gapan (Cabiao)','Iriga (Naga)','Daet (Sipocot)','Caramoan (Naga)','Talisay (Sipocot)',
    'Concepcion (Angeles)','Carmen, Bohol (Cebu, Ortigas)','Pitogo (Cebu)','Rosario (Ortigas)','Lipa (Tanauan)',
    'Lopez (Tagkawayan)','Capoocan (Ortigas)','Tacloban (Cebu)','Hitaasan (Imus)','General Trias (Lapidario)',
    'Indang (Tanza)','Dumangas (Iloilo)','Pozorrubio (Malasiqui)','Baco Oriental Mindoro (Ortigas)','Payao (Baclaran)',
    'Ipil (Manila City)','Liloan (Cebu)','Simpocan (Palawan)','Bolinao (Bani)','Malatgao (Palawan)',
    'Bataraza (Palawan)','Aborlan (Palawan)','Dumarao (Palawan)','Aparri (Ballesteros)','DRT Area (Angat)',
    'Bamban (Angeles)','Buenavista (Sta. Rosa)','Ternate (Cavite)','Cabangan (San Narciso)','Reina Mercedes (Isabela)',
    'Talibon Bohol (Cebu)','Banilad (Kaylavay)','Lupi (Ragay)','El Nido (Palawan)','Tubli Caramoan (Virac)',
    'Hiyop Pandan (Virac)','Magsaysay (Davao)','Ocampo (Naga)','Tigaon (Pili)','Lobo (MCC)',
    'Daan Bantayan (Cebu)','Calapan Mindoro (Tanauan)','Santa Rita Samar (Cavite)','San Juan (San Fabian)','Benito Soliven (Ilagan)',
    'Kabankalan (Bagong Silang)','Opol (CDO)','Luna (Ilagan)','Tiwi (Langkaan)',"T'Boli (Sto. Nino)",
    'Calamba (Calauan)','Iniwaran (Burias)','San Vicente (Abongan)','Medellin (Cebu)','Gen. M. Natividad Nueva Ecija (Tarlac)',
  ];

  const ChipList = ({ items, dotColor }) => (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px,1fr))', gap:7, marginBottom:28 }}>
      {items.map((ch,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:C.off, borderRadius:8, border:`1px solid ${C.border}` }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:dotColor, flexShrink:0 }} />
          <span style={{ fontSize:12.5, color:C.text, fontWeight:500 }}>{ch}</span>
        </div>
      ))}
    </div>
  );

  return (
    <PublicLayout>
      <PageHero breadcrumbs={[{label:'Home',path:'/'},{label:'World Mission',path:'/world-mission'},{label:'Status'}]} title="Status of World Mission" sub="PLWM Churches and Mission Branches across the Philippines — 2026" />
      <section style={{ background:C.white, padding:'72px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          {/* Stats */}
          <div style={{ display:'flex', gap:16, marginBottom:56, flexWrap:'wrap' }}>
            {[
              ['108','PLWM Churches','Mother churches across the Philippines'],
              ['60','Mission Branches','Active branch missions nationwide'],
              ['3','Island Groups','Luzon, Visayas, and Mindanao'],
              ['17','Metro Cellgroups','Active cellgroups in Manila'],
            ].map(([num,label,sub])=>(
              <div key={label} style={{ flex:1, minWidth:200, background:C.off, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'22px 20px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Lora',serif", fontSize:'2.2rem', fontWeight:900, color:C.blue, lineHeight:1 }}>{num}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, margin:'6px 0 3px' }}>{label}</div>
                <div style={{ fontSize:11.5, color:C.muted }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* PLWM Churches */}
          <div style={{ marginBottom:48 }}>
            <h3 style={{ fontFamily:"'Lora',serif", fontSize:'1.35rem', fontWeight:700, color:C.text, marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:30, height:3, background:C.blue, borderRadius:2, display:'inline-block' }} />PLWM Churches
            </h3>
            <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Mother churches across the Philippines — {CHURCHES.length} total</p>
            <ChipList items={CHURCHES} dotColor="#E53E3E" />
          </div>

          {/* Mission Branches */}
          <div style={{ marginBottom:48 }}>
            <h3 style={{ fontFamily:"'Lora',serif", fontSize:'1.35rem', fontWeight:700, color:C.text, marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:30, height:3, background:C.gold, borderRadius:2, display:'inline-block' }} />Mission Branches
            </h3>
            <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Active mission branches nationwide — {MISSION_BRANCHES.length} total</p>
            <ChipList items={MISSION_BRANCHES} dotColor="#C9A84C" />
          </div>

          {/* CTA */}
          <div style={{ background:C.navy, borderRadius:14, padding:'28px 32px', textAlign:'center' }}>
            <div style={{ fontFamily:"'Lora',serif", fontSize:'1.3rem', color:'#fff', fontWeight:700, marginBottom:10 }}>See the Full 2026 PLWM Map</div>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', marginBottom:18, lineHeight:1.6 }}>For the complete list of all PLWM churches and mission branches, visit the PLWM International website.</p>
            <a href="https://www.jbch.org/en/mission/?cId=451" target="_blank" rel="noopener noreferrer">
              <button style={{ background:C.gold, color:C.navy, border:'none', padding:'12px 28px', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Visit PLWM International →</button>
            </a>
          </div>

        </div>
      </section>
    </PublicLayout>
  );
}

// ── INTRODUCTION ──────────────────────────────────────────────
export function IntroductionPage() {
  return (
    <PublicLayout>
      <PageHero breadcrumbs={[{label:'Home',path:'/'},{label:'Introduction'}]} title="Welcome to Manila Central Church" sub="The mother church of Philippine Life Word Mission (PLWM)" />
      <section style={{ background:C.white, padding:'72px 24px' }}>
        <div style={{ maxWidth:1060, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'start', marginBottom:56 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:C.blue }}>
                <span style={{ width:20, height:2, background:C.blue, borderRadius:2, display:'inline-block' }} />Our Purpose
              </div>
              <h2 style={{ fontFamily:"'Lora',serif", fontSize:'clamp(1.5rem,2.5vw,2rem)', fontWeight:700, color:C.text, marginBottom:20, lineHeight:1.3 }}>Three Core Commitments</h2>
              {[
                { icon:'⚡', title:'Prove the existence of God', body:'You can meet the living God who created the heavens and the earth, governs the history of mankind, loves humanity, solidifies the foundation of righteousness, and judges the world with righteousness and holiness.' },
                { icon:'📖', title:'Testify to the truthfulness of the Bible', body:"The Bible is written by the inspiration of God that contains the amazing grace of the living God, the destiny of mankind and the gospel of Jesus Christ. The beginning and the end of human history is written in the Bible. The Bible is not a mere religious book but God's history." },
                { icon:'✝️', title:'Preach the Gospel of Jesus Christ', body:'Through Jesus Christ, a good gospel news of redemption is delivered to the people who are suffering from sins. Moreover, we help them to live a new life with the hope of heaven that has been attained from salvation.' },
              ].map((item,i)=>(
                <div key={i} style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:38, height:38, background:'rgba(21,101,192,0.10)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0, marginTop:2 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontFamily:"'Lora',serif", fontSize:'1rem', fontWeight:700, color:C.text, marginBottom:6 }}>{item.title}</div>
                      <div style={{ fontSize:14, color:C.sub, lineHeight:1.7 }}>{item.body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ background:C.navy, borderRadius:14, padding:'28px', marginBottom:20 }}>
                <div style={{ fontFamily:"'Lora',serif", fontSize:'1.25rem', color:'#fff', fontWeight:700, marginBottom:8 }}>Manila Central Church</div>
                <div style={{ fontSize:12, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:16 }}>PLWM — Parañaque City, Philippines</div>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:1.75, marginBottom:20 }}>
                  Manila Central Church is the mother church of the Philippine Life Word Mission (PLWM) — a Gospel-centered, Bible-based mission organization with churches and mission branches across all major islands of the Philippines.
                </p>
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.12)', paddingTop:16, display:'flex', flexDirection:'column', gap:10 }}>
                  {[['📍','Address','Lot 2 Block 2 Filipinas Ave. UPS 5, Brgy. San Isidro, Parañaque City'],['📅','Founded','Manila Central Church — PLWM Philippines'],['✝️','Mission','Prove God · Testify the Bible · Preach the Gospel']].map(([icon,label,val])=>(
                    <div key={label} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <div style={{ width:28, height:28, background:'rgba(255,255,255,0.07)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{icon}</div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)' }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <Link to="/introduction/beliefs" style={{ flex:1 }}>
                  <button style={{ background:C.blue, color:'#fff', border:'none', padding:'11px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', width:'100%' }}>What We Believe</button>
                </Link>
                <Link to="/introduction/ci" style={{ flex:1 }}>
                  <button style={{ background:C.off, color:C.text, border:`1.5px solid ${C.border}`, padding:'11px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', width:'100%' }}>C.I</button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

// ── WHAT WE BELIEVE ───────────────────────────────────────────
export function WhatWeBelievePage() {
  const BELIEFS = [
    {
      title: 'The Holy Bible',
      image: '/bible.webp',
      items: [
        "The Old and New Testaments of the Bible are the complete word of God, and they are accurate and without error.",
        "The 66 books of the Bible were written through God's revelation and the inspiration of the Holy Spirit.",
        "Complete knowledge of God is given only through the Bible.",
        "Salvation can only be obtained through the Bible.",
      ],
    },
    {
      title: 'God',
      image: '/god.webp',
      items: [
        "God is spirit, self-existent, all-knowing, all-powerful, omnipresent, and one in essence.",
        "God is supremely holy, righteous, perfectly loving, and merciful.",
        "God is one in essence but exists in three persons: the Father, the Son, and the Holy Spirit.",
        "God is the Creator, Sustainer, Provider, and Judge.",
      ],
    },
    {
      title: 'Jesus Christ',
      image: '/jesus.webp',
      items: [
        "Jesus Christ is one of the persons of the Trinity and is God.",
        "Jesus Christ, as the Son of God, came as a man and is the only mediator between God and humanity.",
        "Jesus Christ bore the sins of the world and, through His death on the cross, achieved eternal atonement.",
        "Jesus Christ rose from the dead three days after His crucifixion and ascended to heaven forty days later, where He lives as our mediator.",
      ],
    },
    {
      title: 'The Holy Spirit',
      image: '/hs.webp',
      items: [
        "The Holy Spirit is one of the persons of the Trinity and is God.",
        "The Holy Spirit convicts people of sin and gives new birth through the Word of God.",
        "The Holy Spirit dwells in the hearts of believers and helps them grow in faith.",
        "The Holy Spirit unites believers, building up the Church, which is the body of Christ.",
      ],
    },
    {
      title: 'Humans',
      image: '/humans.webp',
      items: [
        "Humans were created in the image of God as spiritual beings for the purpose of glorifying God.",
        "God gave humans free will, but Adam sinned by disobeying God's command.",
        "All people will face death, and after that, there will be God's judgment.",
      ],
    },
    {
      title: 'Salvation',
      image: '/salvation.webp',
      items: [
        "Salvation is by God's grace, not based on human actions, and can only be obtained through faith.",
        "Repentance, which leads to the forgiveness of sins, must precede salvation.",
        "One is justified by faith.",
        "A person receives salvation by believing in Jesus Christ and through the forgiveness of sins.",
        "Salvation is certain, eternal, and complete.",
        "After salvation, one must live a sanctified life, becoming more like Christ.",
        "When Christ returns, Christians will be glorified.",
      ],
    },
    {
      title: 'Church',
      image: '/church.webp',
      items: [
        "The Church is a spiritual, personal community of born-again Christians united by the Holy Spirit.",
        "The Church is the body of Christ, and Christians are members of that body, each with their own role.",
        "God provides His Word through the Church and helps believers grow in their faith.",
        "The Church administers the sacraments as commanded by Jesus.",
        "The Church should be devoted to the Word, prayer, fellowship, and evangelism.",
      ],
    },
    {
      title: 'The Millennial Kingdom & Eternal Kingdom',
      image: null,
      items: [
        "Christ, who returns to the earth, will reign over the world for a thousand years.",
        "Born-again Christians will enjoy eternal life and blessedness with Christ in heaven.",
      ],
    },
  ];

  return (
    <PublicLayout>
      <PageHero
        breadcrumbs={[{label:'Home',path:'/'},{label:'Introduction',path:'/introduction'},{label:'What We Believe'}]}
        title="What We Believe"
        sub="The doctrinal foundation of Manila Central Church — Philippine Life Word Mission"
      />
      <section style={{ background: C.off, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Intro paragraph */}
          <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 56px' }}>
            <p style={{ fontSize:15, color:C.sub, lineHeight:1.8 }}>
              These are the core beliefs that form the doctrinal foundation of Manila Central Church and the Philippine Life Word Mission. Rooted in the Word of God and built on the Gospel of Jesus Christ.
            </p>
          </div>

          {/* Belief cards grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:24 }} className="beliefs-grid">
            {BELIEFS.map((b, i) => (
              <div key={i} style={{
                background: '#fff',
                borderRadius: 14,
                overflow: 'hidden',
                border: `1.5px solid ${C.border}`,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 12px rgba(11,36,71,0.06)',
                transition: 'transform 0.22s, box-shadow 0.22s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(11,36,71,0.13)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(11,36,71,0.06)'; }}
              >
                {/* Image / banner header */}
                {b.image ? (
                  <div style={{ height: 180, overflow:'hidden', flexShrink:0 }}>
                    <img
                      src={process.env.PUBLIC_URL + b.image}
                      alt={b.title}
                      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                    />
                  </div>
                ) : (
                  <div style={{ height: 180, background: 'linear-gradient(135deg, #0B2447, #1A3D72)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, flexShrink:0 }}>
                    <div style={{ fontSize: 40 }}>✝️</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', letterSpacing:'2px', textTransform:'uppercase' }}>Image coming soon</div>
                  </div>
                )}

                {/* Card body */}
                <div style={{ padding: '20px 20px 24px', flex:1, display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:'#0B2447', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {i + 1}
                    </div>
                    <h3 style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'0.97rem', fontWeight:700, color:'#0F1B33', lineHeight:1.3, margin:0 }}>
                      {b.title}
                    </h3>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1 }}>
                    {b.items.map((item, j) => (
                      <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:'#475569', lineHeight:1.65 }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:'#1565C0', marginTop:7, flexShrink:0 }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scripture footer */}
          <div style={{ marginTop:56, background:'#0B2447', borderRadius:14, padding:'28px 32px', textAlign:'center' }}>
            <p style={{ fontFamily:"'Lora',serif", fontSize:'1.15rem', color:'#fff', lineHeight:1.65, marginBottom:10, fontStyle:'italic' }}>
              "All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness."
            </p>
            <span style={{ fontSize:13, color:'#C9A84C', fontWeight:700 }}>— 2 Timothy 3:16</span>
          </div>
        </div>
      </section>
      <style>{`
        @media (max-width: 960px) { .beliefs-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .beliefs-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </PublicLayout>
  );
}

// ── C.I (Church Identity) ─────────────────────────────────────
export function CIPage() {
  return (
    <PublicLayout>
      <PageHero breadcrumbs={[{label:'Home',path:'/'},{label:'Introduction',path:'/introduction'},{label:'C.I'}]} title="C.I — Church Identity" sub="The identity and symbol of Manila Central Church — Philippine Life Word Mission" />
      <section style={{ background:C.white, padding:'72px 24px' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:48, alignItems:'start', marginBottom:56 }}>
            <div>
              {/* Church Identity Banner */}
              <div style={{ borderRadius:16, overflow:'hidden', aspectRatio:'1', background:C.navy }}>
                <img
                  src={process.env.PUBLIC_URL + '/banner.webp'}
                  alt="Manila Central Church — PLWM"
                  style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                />
              </div>
            </div>
            <div>
              <h2 style={{ fontFamily:"'Lora',serif", fontSize:'1.5rem', fontWeight:700, color:C.text, marginBottom:20 }}>Philippine Life Word Mission</h2>
              <p style={{ fontSize:15, color:C.sub, lineHeight:1.75, marginBottom:20 }}>
                The name "Life Word Mission" comes from the core mission of the organization: to bring the <strong>Word of Life</strong> — the Gospel of Jesus Christ — to all people across the Philippines and the world.
              </p>
              <p style={{ fontSize:15, color:C.sub, lineHeight:1.75, marginBottom:24 }}>
                Manila Central Church serves as the anchor and mother church of PLWM in the Philippines, coordinating missions, training evangelists, and supporting the planting of churches across every region.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[['🕊️','Life','The Gospel of Jesus Christ — the Word that gives eternal life'],['📖','Word','The Bible — God\'s complete and infallible revelation to mankind'],['🌏','Mission','The calling to go and declare the works of the LORD to all nations']].map(([icon,title,desc])=>(
                  <div key={title} style={{ display:'flex', gap:12, alignItems:'flex-start', background:C.off, borderRadius:10, padding:'12px 14px', border:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:18 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>{title}</div>
                      <div style={{ fontSize:13, color:C.muted }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Verse */}
          <div style={{ background:C.navy, borderRadius:14, padding:'28px 32px', textAlign:'center' }}>
            <p style={{ fontFamily:"'Lora',serif", fontSize:'1.3rem', color:'#fff', lineHeight:1.65, marginBottom:10, fontStyle:'italic' }}>
              "I shall not die, but live, And declare the works of the LORD."
            </p>
            <span style={{ fontSize:13, color:C.gold, fontWeight:700 }}>— Psalm 118:17</span>
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
