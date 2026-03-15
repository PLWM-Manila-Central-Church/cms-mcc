import { Link } from 'react-router-dom';
import PublicLayout from './PublicLayout';

const C = { navy:'#0B2447', blue:'#1565C0', gold:'#C9A84C', white:'#fff', off:'#F4F7FB', border:'#E2E8F0', text:'#0F1B33', sub:'#475569', muted:'#64748B' };

const SCHEDULE = [
  { date:'March 21–24, 2026', title:'Cellgroup Bible Seminar', location:'Main Hall, Manila Central Church', type:'Seminar', note:'All cellgroups invited', color:C.blue },
  { date:'April 2–4, 2026',   title:'2026 Summer Retreat — Batch 1 (Manila Region)', location:'PLWM Taal Galilee Retreat Center', type:'Retreat', note:'Advance Activity for Summer Retreat', color:'#2E7D32' },
  { date:'April 9–11, 2026',  title:'2026 Summer Retreat — Batch 2', location:'PLWM Taal Galilee Retreat Center', type:'Retreat', note:'', color:'#2E7D32' },
  { date:'April 19–26, 2026', title:'Murcia & Pontevedra Negros Occidental Mission', location:'Negros Occidental', type:'Mission', note:'', color:'#C07B0A' },
];

const WEEKLY = [
  { day:'Tuesday', time:'7:00 PM', desc:'Cellgroup Meetings across Metro Manila', loc:'Various locations' },
  { day:'Wednesday', time:'7:00 PM', desc:'Midweek Sermon Service', loc:'Main Hall (3rd Floor)' },
  { day:'Thursday', time:'7:00 PM', desc:'Cellgroup Meetings across Metro Manila', loc:'Various locations' },
  { day:'Saturday', time:'2:00 PM', desc:'High School Fellowship', loc:'Medium Hall (2nd Floor)' },
  { day:'Saturday', time:'7:00 PM', desc:'YAG Fellowship', loc:'Medium Hall (2nd Floor)' },
  { day:'Sunday', time:'9:30 AM', desc:'Filipino Sunday Sermon', loc:'Main Hall (3rd Floor)' },
  { day:'Sunday', time:'2:00 PM', desc:'Korean Sunday Sermon', loc:'Small Hall (2nd Floor)' },
];

export default function BibleSeminarSchedulePage() {
  return (
    <PublicLayout>
      <div className="page-hero">
        <div className="breadcrumb">
          <Link to="/">Home</Link> /&nbsp;
          <Link to="/bible-seminar">Bible Seminar</Link> /&nbsp;
          <span>Schedule</span>
        </div>
        <h1>Bible Seminar Schedule</h1>
        <p>Upcoming seminars, retreats, and mission events for 2026</p>
      </div>

      <section style={{ background: C.white, padding: '72px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>

          {/* Upcoming events */}
          <div style={{ marginBottom: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.blue }}>
              <span style={{ width: 20, height: 2, background: C.blue, borderRadius: 2, display: 'inline-block' }} />2026 Schedule
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {SCHEDULE.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', background: C.off, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '20px 22px', borderLeft: `4px solid ${ev.color}` }}>
                  <div style={{ minWidth: 140, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ev.color }}>{ev.date}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1rem', fontWeight:700, color:C.text, marginBottom:5 }}>{ev.title}</div>
                    <div style={{ fontSize: 12.5, color: C.muted, marginBottom: ev.note ? 4 : 0, display: 'flex', alignItems: 'center', gap: 5 }}>📍 {ev.location}</div>
                    {ev.note && <div style={{ fontSize: 12, color: C.sub, fontStyle: 'italic' }}>{ev.note}</div>}
                  </div>
                  <span style={{ background: ev.color, color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{ev.type}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
              📌 <strong>Book 2–3 months before</strong> any retreat to secure your slot. Contact the church for registration.
            </div>
          </div>

          {/* Weekly schedule */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.blue }}>
              <span style={{ width: 20, height: 2, background: C.blue, borderRadius: 2, display: 'inline-block' }} />Weekly Gatherings
            </div>
            <div style={{ background: C.off, border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {WEEKLY.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 20px', borderBottom: i < WEEKLY.length - 1 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? C.off : '#fff' }}>
                  <div style={{ minWidth: 100, flexShrink: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy }}>{w.day}</div>
                    <div style={{ fontSize: 11.5, color: C.blue, fontWeight: 600 }}>{w.time}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{w.desc}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>📍 {w.loc}</div>
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
