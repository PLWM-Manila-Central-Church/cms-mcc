import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { LANGS, getLangCode, saveLangCode, loadGTScript, applyGTLang } from '../../utils/langUtils';

// ── Constants ─────────────────────────────────────────────────
const BRAND   = 'linear-gradient(135deg,#003d70,#005599,#13B5EA)';
const API_IMG = (process.env.REACT_APP_API_URL || '').replace(/\/api$/, '');
const PHP     = (n) => `₱${Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) : '—';
const fmtShort= (d) => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}) : '—';
const fmtSvcT = (t) => { if(!t) return '—'; const [h,m]=t.split(':'); const d=new Date(); d.setHours(+h,+m); return d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}); };

const getPrefs = () => { try { return JSON.parse(localStorage.getItem('plwm_prefs')||'{}'); } catch { return {}; } };

const makeC = (prefs) => {
  const dk = prefs.theme==='dark';
  return {
    bg:dk?'#0e1420':'#f0f4f8',surface:dk?'#1a2332':'#ffffff',
    surfaceAlt:dk?'#141d2b':'#f8fafc',border:dk?'#2d3a4e':'#e2e8f0',
    borderL:dk?'#243040':'#f1f5f9',t1:dk?'#f1f5f9':'#0f172a',
    t2:dk?'#94a3b8':'#475569',t3:dk?'#64748b':'#94a3b8',
    accent:'#005599',accentL:dk?'#1e3a5f':'#eff6ff',accentT:dk?'#60a5fa':'#005599',
    success:'#16a34a',successL:dk?'#14532d':'#dcfce7',successB:dk?'#166534':'#bbf7d0',
    danger:'#dc2626',dangerL:dk?'#7f1d1d':'#fef2f2',dangerB:dk?'#991b1b':'#fecaca',
    amber:'#d97706',amberL:dk?'#78350f':'#fffbeb',
    tabActive:dk?'#13B5EA':'#005599',shadow:dk?'0 1px 4px rgba(0,0,0,0.4)':'0 1px 4px rgba(0,0,0,0.07)',dk,
  };
};

const catStyle = (name,dk) => ({
  Tithe:{bg:dk?'#78350f':'#fefce8',color:dk?'#fde68a':'#854d0e',border:`1px solid ${dk?'#92400e':'#fef08a'}`},
  Offering:{bg:dk?'#1e3a5f':'#eff6ff',color:dk?'#93c5fd':'#1d4ed8',border:`1px solid ${dk?'#2563eb':'#bfdbfe'}`},
  'Special Offering':{bg:'transparent',color:dk?'#94a3b8':'#374151',border:`1px solid ${dk?'#475569':'#d1d5db'}`},
}[name]||{bg:dk?'#243040':'#f8fafc',color:dk?'#94a3b8':'#475569',border:`1px solid ${dk?'#2d3a4e':'#e2e8f0'}`});

const RSVP_META = {
  ATTENDING:     { label:'Attending',     color:'#16a34a', bg:'#dcfce7', border:'1px solid #bbf7d0' },
  NOT_ATTENDING: { label:'Not attending', color:'#dc2626', bg:'#fef2f2', border:'1px solid #fecaca' },
  UNDECIDED:     { label:'Undecided',     color:'#d97706', bg:'#fffbeb', border:'1px solid #fde68a' },
};

const GOOGLE_FONTS = ['Inter','Open Sans','Lato','Roboto','DM Sans','Space Grotesk','Figtree','Work Sans'];
const FONTSHARE    = ['Satoshi'];

const LBL = {
  en:{tabs:['Overview','Events','Attendance','Tithes'],tabIcons:['🏠','📅','✅','💰'],portal:'Member Portal',welcome:'Welcome',settings:'Settings',logout:'Logout',attendanceRate:'Attendance Rate',last2mo:'Last month',totalOfferings:'Total Tithes & Offerings',thisYear:'This year',memberSince:'Member Since',myProfile:'My Profile',editProfile:'Edit Profile',save:'Save',cancel:'Cancel',memberId:'Member ID',memberName:'Member Name',spiritual:'Spiritual Birthday',cellGroup:'Cell Group',address:'Address',joinDate:'Join Date',group:'Group',contact:'Contact No',birthdate:'Flesh Birthday',status:'Status',ministry:'Ministry Assignments',services:'Upcoming Services',confirm:'Confirm',confirmed:'Confirmed ✓',noMinistry:'No ministry assignments.',noServices:'No upcoming services.',noEvents:'No upcoming events at this time.',registerNow:'Register Now',cancelReg:'Cancel Registration',closedReg:'Registration Closed',viewDetails:'View Details',myRegs:'My Registrations',regDeadline:'Deadline',of:'of',registered:'registered',attendanceHistory:'My Attendance History',noAttendance:'No attendance records found.',date:'Date',service:'Service',checkin:'Check-in',statusL:'Status',present:'Present',absent:'Absent',offeringsHistory:'My Tithes and Offering History',noOfferings:'No giving records.',type:'Type',amount:'Amount',totalYtd:'Total Year-to-Date',verse:'"God loves a cheerful giver." — 2 Corinthians 9:7',excellent:'Excellent',good:'Good',improve:'Needs Improvement',willAttend:'I will attend',wontAttend:'Cannot attend',undecided:'Undecided',rsvp:'RSVP',closePanel:'Close',serviceDetails:'Service Details',eventDetails:'Event Details',attending:'Attending',notAttending:'Not attending',capacity:'Capacity',responseBy:'Response by',yourRsvp:'Your RSVP'},
  tl:{tabs:['Pangkalahatang-tanaw','Mga Kaganapan','Pagdalo','Mga Handog'],tabIcons:['🏠','📅','✅','💰'],portal:'Portal ng Miyembro',welcome:'Maligayang pagdating',settings:'Mga Setting',logout:'Mag-logout',attendanceRate:'Rate ng Pagdalo',last2mo:'Nakaraang buwan',totalOfferings:'Kabuuang Ikapu at Handog',thisYear:'Ngayong taon',memberSince:'Miyembro Mula',myProfile:'Aking Profile',editProfile:'I-edit',save:'I-save',cancel:'Kanselahin',memberId:'Member ID',memberName:'Pangalan',spiritual:'Espirituwal na Kaarawan',cellGroup:'Cell Group',address:'Tirahan',joinDate:'Petsa ng Pagsali',group:'Grupo',contact:'Numero',birthdate:'Kaarawan',status:'Katayuan',ministry:'Mga Takdang Gawain',services:'Mga Paparating na Serbisyo',confirm:'Kumpirmahin',confirmed:'Nakumpirma ✓',noMinistry:'Walang mga takdang gawain.',noServices:'Walang paparating na serbisyo.',noEvents:'Walang mga kaganapan.',registerNow:'Mag-register Na',cancelReg:'Kanselahin',closedReg:'Sarado na',viewDetails:'Tingnan',myRegs:'Aking mga Pagpaparehistro',regDeadline:'Deadline',of:'sa',registered:'nakapag-register',attendanceHistory:'Kasaysayan ng Pagdalo',noAttendance:'Walang rekord ng pagdalo.',date:'Petsa',service:'Serbisyo',checkin:'Check-in',statusL:'Katayuan',present:'Naroroon',absent:'Wala',offeringsHistory:'Kasaysayan ng Ikapu at Handog',noOfferings:'Walang rekord ng pagbibigay.',type:'Uri',amount:'Halaga',totalYtd:'Kabuuang Ikapu at Handog sa Taon',verse:'"Ang nagbibigay nang masaya ay mahal ng Diyos." — 2 Mga Taga-Corinto 9:7',excellent:'Kahusayan',good:'Mabuti',improve:'Kailangan ng Pagpabuti',willAttend:'Darating ako',wontAttend:'Hindi ako makakarating',undecided:'Hindi pa sigurado',rsvp:'RSVP',closePanel:'Isara',serviceDetails:'Detalye ng Serbisyo',eventDetails:'Detalye ng Kaganapan',attending:'Darating',notAttending:'Hindi darating',capacity:'Kapasidad',responseBy:'Sagot bago ang',yourRsvp:'Iyong RSVP'},
};

// ── Mobile detection hook ─────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w;
}

// ── Shared utility components ─────────────────────────────────
function Ring({value=0,size=88,stroke=8,color='#005599',bg='#e2e8f0'}) {
  const r=(size-stroke)/2,circ=2*Math.PI*r,off=circ-(Math.min(value,100)/100)*circ;
  return (<svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
      strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
      style={{transition:'stroke-dashoffset 1s ease'}}/>
  </svg>);
}

function Skel({w='100%',h=14,r=6,mt=0}) {
  return <div style={{width:w,height:h,borderRadius:r,marginTop:mt,background:'linear-gradient(90deg,#e2e8f0 25%,#f8fafc 50%,#e2e8f0 75%)',backgroundSize:'400% 100%',animation:'shimmer 1.4s infinite'}}/>;
}

// ── Modal / Sheet backdrop ─────────────────────────────────────
// On desktop: right-side panel. On mobile: bottom sheet.
function Backdrop({onClose,children,isMobile}) {
  if (isMobile) {
    return (
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{
          width:'100%', maxHeight:'92dvh', overflowY:'auto',
          background:'#fff', borderRadius:'20px 20px 0 0',
          boxShadow:'0 -4px 32px rgba(0,0,0,0.18)',
          animation:'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)',
          paddingBottom:'calc(16px + env(safe-area-inset-bottom,0px))',
        }}>
          <div style={{width:40,height:4,background:'#cbd5e1',borderRadius:99,margin:'12px auto 0'}}/>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)',zIndex:500,display:'flex',alignItems:'flex-start',justifyContent:'flex-end'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'min(460px,95vw)',height:'100vh',overflowY:'auto',background:'#fff',boxShadow:'-4px 0 32px rgba(0,0,0,0.18)',animation:'slideInRight 0.25s ease'}}>
        {children}
      </div>
    </div>
  );
}

// ── Service RSVP Modal ─────────────────────────────────────────
function ServiceModal({svc,onClose,onRespond,responding,c,f,t,isMobile}) {
  if(!svc) return null;
  const current = svc.my_response?.attendance_status;
  const rsvpMeta = current ? RSVP_META[current] : null;
  return (
    <Backdrop onClose={onClose} isMobile={isMobile}>
      <div style={{padding:'20px 20px 8px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{fontSize:f?.lg||18,fontWeight:800,color:'#0f172a'}}>{t?.serviceDetails||'Service Details'}</div>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:'50%',width:32,height:32,fontSize:18,cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1}}>✕</button>
        </div>

        <div style={{background:'linear-gradient(135deg,#003d70,#005599)',borderRadius:12,padding:'16px',color:'#fff',marginBottom:16}}>
          <div style={{fontSize:f?.md||15,fontWeight:800,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.3px'}}>{svc.title}</div>
          <div style={{fontSize:f?.sm||13,opacity:0.85}}>📅 {fmtDate(svc.service_date)}</div>
          <div style={{fontSize:f?.sm||13,opacity:0.85}}>🕐 {fmtSvcT(svc.service_time)}</div>
          {svc.capacity&&<div style={{fontSize:f?.sm||13,opacity:0.85}}>👥 {svc.attending_count||0} / {svc.capacity}</div>}
          {svc.response_deadline&&<div style={{fontSize:f?.sm||13,opacity:0.75,marginTop:4}}>{t?.responseBy||'Response by'}: {fmtDate(svc.response_deadline)}</div>}
        </div>

        {rsvpMeta&&(
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:8,background:rsvpMeta.bg,border:rsvpMeta.border,marginBottom:14}}>
            <span style={{fontSize:f?.sm||13,fontWeight:700,color:rsvpMeta.color}}>{t?.yourRsvp||'Your RSVP'}: {rsvpMeta.label}</span>
          </div>
        )}

        <div style={{fontSize:f?.xs||11,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>{t?.rsvp||'RSVP'}</div>
        <div style={{display:'flex',flexDirection:'column',gap:10,paddingBottom:8}}>
          {[
            {status:'ATTENDING',    label:t?.willAttend||'I will attend',    emoji:'✓'},
            {status:'NOT_ATTENDING',label:t?.wontAttend||'Cannot attend',    emoji:'✕'},
            {status:'UNDECIDED',    label:t?.undecided||'Undecided',         emoji:'?'},
          ].map(({status,label,emoji})=>{
            const isActive = current===status;
            const meta = RSVP_META[status];
            return (
              <button key={status} onClick={()=>onRespond(status)} disabled={responding}
                style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:10,border:`2px solid ${isActive?meta.color:'#e2e8f0'}`,background:isActive?meta.bg:'transparent',cursor:responding?'not-allowed':'pointer',fontFamily:'inherit',opacity:responding?0.7:1,textAlign:'left',transition:'all 0.15s',minHeight:52}}>
                <span style={{width:32,height:32,borderRadius:'50%',background:isActive?meta.color:'#f1f5f9',color:isActive?'#fff':meta.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,flexShrink:0}}>{emoji}</span>
                <span style={{fontSize:f?.base||14,fontWeight:isActive?700:500,color:isActive?meta.color:'#374151'}}>{label}</span>
                {isActive&&<span style={{marginLeft:'auto',fontSize:f?.xs||11,fontWeight:700,color:meta.color}}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </Backdrop>
  );
}

// ── Event Details Modal ────────────────────────────────────────
function EventModal({evt,onClose,onRegister,onCancel,evtLoading,c,f,t,isMobile}) {
  if(!evt) return null;
  return (
    <Backdrop onClose={onClose} isMobile={isMobile}>
      <div style={{padding:'20px 20px 8px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{fontSize:f?.lg||18,fontWeight:800,color:'#0f172a'}}>{t?.eventDetails||'Event Details'}</div>
          <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:'50%',width:32,height:32,fontSize:18,cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1}}>✕</button>
        </div>

        <div style={{background:evt.is_registered?'linear-gradient(135deg,#14532d,#16a34a)':'linear-gradient(135deg,#003d70,#005599)',borderRadius:12,padding:'16px',color:'#fff',marginBottom:16}}>
          <div style={{fontSize:f?.md||15,fontWeight:800,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.3px'}}>{evt.title}</div>
          {evt.is_registered&&<div style={{fontSize:f?.xs||11,fontWeight:700,letterSpacing:'0.5px',marginBottom:6,opacity:0.9}}>✓ YOU ARE REGISTERED</div>}
          <div style={{fontSize:f?.sm||13,opacity:0.85}}>📅 {fmtDate(evt.start_date)}{evt.end_date&&evt.end_date!==evt.start_date?` – ${fmtDate(evt.end_date)}`:''}</div>
          {evt.location&&<div style={{fontSize:f?.sm||13,opacity:0.85}}>📍 {evt.location}</div>}
          <div style={{fontSize:f?.sm||13,opacity:0.85}}>👥 {evt.registration_count} {t?.registered||'registered'}{evt.capacity?` ${t?.of||'of'} ${evt.capacity}`:''}</div>
          {evt.registration_deadline&&<div style={{fontSize:f?.sm||13,opacity:0.75,marginTop:4}}>{t?.regDeadline||'Deadline'}: {fmtDate(evt.registration_deadline)}</div>}
        </div>

        {evt.description&&(
          <div style={{padding:'12px 14px',background:'#f8fafc',borderRadius:10,marginBottom:14,fontSize:f?.base||14,color:'#374151',lineHeight:1.65}}>
            {evt.description}
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:10,paddingBottom:8}}>
          {evt.is_registered?(
            <button onClick={()=>onCancel(evt.id)} disabled={evtLoading===evt.id||!evt.can_cancel}
              style={{padding:'14px',borderRadius:10,fontSize:f?.base||14,fontWeight:700,cursor:evt.can_cancel?'pointer':'not-allowed',background:'none',border:'2px solid #dc2626',color:'#dc2626',fontFamily:'inherit',opacity:!evt.can_cancel?0.5:1,minHeight:52}}>
              {evtLoading===evt.id?'…':t?.cancelReg||'Cancel Registration'}
            </button>
          ):(
            <button onClick={()=>onRegister(evt.id)} disabled={evtLoading===evt.id||!evt.can_register}
              style={{padding:'14px',borderRadius:10,fontSize:f?.base||14,fontWeight:700,cursor:evt.can_register?'pointer':'not-allowed',background:evt.can_register?'#0f172a':'#e2e8f0',color:evt.can_register?'#fff':'#94a3b8',border:'none',fontFamily:'inherit',minHeight:52}}>
              {evtLoading===evt.id?'…':evt.deadline_passed?t?.closedReg||'Registration Closed':t?.registerNow||'Register Now'}
            </button>
          )}
        </div>
      </div>
    </Backdrop>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB COMPONENTS — defined OUTSIDE MemberPortal to prevent focus loss
// ══════════════════════════════════════════════════════════════

function OverviewTab({profile,attendance,finance,editing,editForm,setEditForm,editSaving,editError,startEdit,saveEdit,setEditing,c,f,t,avatarUrl,initials,BRAND,PHP,fmtDate,isMobile}) {
  const card = {background:c.surface,borderRadius:12,border:`1px solid ${c.border}`,boxShadow:c.shadow};
  const bdg  = (bg,color,border)=>({padding:'3px 10px',borderRadius:20,fontSize:f.xs,fontWeight:700,background:bg,color,border});

  return (
    <div>
      {/* ── Stat Cards ── */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:isMobile?10:14,marginBottom:isMobile?12:20}}>
        <div style={{...card,padding:isMobile?'14px 16px':'20px 22px',display:'flex',alignItems:'center',gap:14}}>
          <div style={{position:'relative',flexShrink:0}}>
            <Ring value={attendance?.attendanceRate||0} size={isMobile?60:78} stroke={isMobile?6:7} color={c.tabActive} bg={c.border}/>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
              <div style={{fontSize:isMobile?10:f.sm,fontWeight:800,color:c.t1,lineHeight:1}}>{attendance?.attendanceRate||0}%</div>
            </div>
          </div>
          <div>
            <div style={{fontSize:f.xs,color:c.t3,fontWeight:600,marginBottom:4}}>{t.attendanceRate}</div>
            <div style={{fontSize:isMobile?f.lg:f.stat,fontWeight:900,color:c.t1,lineHeight:1,letterSpacing:'-0.5px'}}>{attendance?.attendanceRate||0}%</div>
            <div style={{fontSize:f.xs,color:c.t3,marginTop:4}}>{t.last2mo}</div>
          </div>
        </div>

        <div style={{...card,padding:isMobile?'14px 16px':'20px 22px'}}>
          <div style={{fontSize:f.xs,color:c.t3,fontWeight:600,marginBottom:4}}>{t.totalOfferings}</div>
          <div style={{fontSize:isMobile?f.lg:f.stat,fontWeight:900,color:c.t1,letterSpacing:'-0.5px',lineHeight:1.1}}>{finance?PHP(finance.ytdTotal):'—'}</div>
          <div style={{fontSize:f.xs,color:c.t3,marginTop:4}}>{t.thisYear}</div>
        </div>

        <div style={{...card,padding:isMobile?'14px 16px':'20px 22px'}}>
          <div style={{fontSize:f.xs,color:c.t3,fontWeight:600,marginBottom:4}}>{t.memberSince}</div>
          <div style={{fontSize:isMobile?f.base:f.md,fontWeight:800,color:c.t1,lineHeight:1.3}}>{profile?fmtDate(profile.join_date):'—'}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8,flexWrap:'wrap'}}>
            {profile&&<span style={bdg(c.successL,c.success,`1px solid ${c.successB}`)}>{profile.status}</span>}
            <span style={{fontSize:f.xs,color:c.t3}}>{profile?.member_id_formatted}</span>
          </div>
        </div>
      </div>

      {/* ── Profile Card ── */}
      <div style={{...card,padding:isMobile?'16px':'24px 28px'}}>
        {/* Header row */}
        <div style={{display:'flex',flexDirection:isMobile?'column':'row',justifyContent:'space-between',alignItems:isMobile?'flex-start':'center',marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${c.borderL}`,gap:isMobile?12:0}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            {avatarUrl
              ? <img src={avatarUrl} alt="profile" style={{width:isMobile?48:52,height:isMobile?48:52,borderRadius:'50%',objectFit:'cover',border:`2px solid ${c.border}`}}/>
              : <div style={{width:isMobile?48:52,height:isMobile?48:52,borderRadius:'50%',background:BRAND,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isMobile?15:17,fontWeight:800,color:'#fff'}}>{initials}</div>}
            <div>
              <div style={{fontSize:isMobile?f.md:f.lg,fontWeight:800,color:c.t1}}>{profile?`${profile.first_name} ${profile.last_name}`:'—'}</div>
              <div style={{fontSize:f.sm,color:c.t3,marginTop:2}}>{profile?.cellGroup?.name||'—'} · {profile?.group?.name||'—'}</div>
            </div>
          </div>
          {!editing
            ? <button onClick={startEdit} style={{background:c.accentL,color:c.accentT,border:`1px solid ${c.border}`,borderRadius:8,padding:'8px 18px',fontSize:f.sm,fontWeight:600,cursor:'pointer',fontFamily:'inherit',width:isMobile?'100%':'auto',minHeight:40}}>{t.editProfile}</button>
            : <div style={{display:'flex',gap:8,width:isMobile?'100%':'auto'}}>
                <button onClick={()=>setEditing(false)} style={{background:c.surfaceAlt,color:c.t2,border:`1px solid ${c.border}`,borderRadius:8,padding:'8px 14px',fontSize:f.sm,fontWeight:600,cursor:'pointer',fontFamily:'inherit',flex:isMobile?1:'none',minHeight:40}}>{t.cancel}</button>
                <button onClick={saveEdit} disabled={editSaving} style={{background:BRAND,color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontSize:f.sm,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:editSaving?0.7:1,flex:isMobile?2:'none',minHeight:40}}>{editSaving?'…':t.save}</button>
              </div>}
        </div>

        {editError&&<div style={{background:c.dangerL,color:c.danger,border:`1px solid ${c.dangerB}`,borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:f.sm}}>{editError}</div>}

        {!editing?(
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?'0':'0 40px'}}>
            {[[t.memberId,profile?.member_id_formatted],[t.group,profile?.group?.name],[t.memberName,profile?`${profile.first_name} ${profile.last_name}`:null],[t.contact,profile?.phone],[t.spiritual,fmtDate(profile?.spiritual_birthday)],[t.birthdate,fmtDate(profile?.birthdate)],[t.cellGroup,profile?.cellGroup?.name],[t.joinDate,fmtDate(profile?.join_date)],['Flesh Age',profile?.flesh_age!=null?`${profile.flesh_age} yrs old`:'—'],['Spiritual Age',profile?.spiritual_age!=null?`${profile.spiritual_age} yrs old`:'—']].map(([label,val])=>(
              <div key={label} style={{padding:'10px 0',borderBottom:`1px solid ${c.borderL}`}}>
                <div style={{fontSize:f.xs,color:c.t3,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:3}}>{label}</div>
                <div style={{fontSize:f.base,color:c.t1,fontWeight:500}}>{val||'—'}</div>
              </div>
            ))}
            <div style={{gridColumn:'1/-1',padding:'10px 0',borderBottom:`1px solid ${c.borderL}`}}>
              <div style={{fontSize:f.xs,color:c.t3,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:3}}>{t.address}</div>
              <div style={{fontSize:f.base,color:c.t1,fontWeight:500}}>{profile?.address||'—'}</div>
            </div>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?'12px':'14px 20px'}}>
            {[{label:'First Name',key:'first_name'},{label:'Last Name',key:'last_name'},{label:t.contact,key:'phone',type:'tel'},{label:'Email',key:'email',type:'email'},{label:t.birthdate,key:'birthdate',type:'date'},{label:t.spiritual,key:'spiritual_birthday',type:'date'}].map(({label,key,type='text'})=>(
              <div key={key}>
                <label style={{fontSize:f.xs,color:c.t2,fontWeight:600,display:'block',marginBottom:5}}>{label}</label>
                <input type={type} value={editForm[key]||''} onChange={e=>setEditForm(prev=>({...prev,[key]:e.target.value}))}
                  style={{width:'100%',padding:'10px 12px',fontSize:16,border:`1.5px solid ${c.border}`,borderRadius:8,outline:'none',fontFamily:'inherit',color:c.t1,background:c.surfaceAlt,boxSizing:'border-box',minHeight:44}}
                  onFocus={e=>e.target.style.borderColor='#005599'} onBlur={e=>e.target.style.borderColor=c.border}/>
              </div>
            ))}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:f.xs,color:c.t2,fontWeight:600,display:'block',marginBottom:5}}>{t.address}</label>
              <textarea value={editForm.address||''} onChange={e=>setEditForm(prev=>({...prev,address:e.target.value}))} rows={3}
                style={{width:'100%',padding:'10px 12px',fontSize:16,border:`1.5px solid ${c.border}`,borderRadius:8,outline:'none',fontFamily:'inherit',color:c.t1,background:c.surfaceAlt,resize:'vertical',boxSizing:'border-box'}}
                onFocus={e=>e.target.style.borderColor='#005599'} onBlur={e=>e.target.style.borderColor=c.border}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventsTab({events,assigns,services,evtL,confL,doRegister,doCancel,doConfirm,onServiceClick,onEventDetailsClick,c,f,t,fmtDate,fmtShort,fmtSvcT,isMobile}) {
  const card = {background:c.surface,borderRadius:12,border:`1px solid ${c.border}`,boxShadow:c.shadow};
  const bdg  = (bg,color,border)=>({padding:'3px 10px',borderRadius:20,fontSize:f.xs,fontWeight:700,background:bg,color,border});
  const myRegs = events.filter(e=>e.is_registered);
  const pending = assigns.filter(a=>!a.confirmed);

  if (isMobile) {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>

        {/* Services — compact cards on mobile */}
        {services.length>0&&(
          <div style={card}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.base,fontWeight:700,color:c.t1}}>{t.services}</div>
            {services.map((s,i)=>(
              <div key={s.id} onClick={()=>onServiceClick(s.id)}
                style={{padding:'12px 16px',borderBottom:i<services.length-1?`1px solid ${c.borderL}`:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,minHeight:56}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:f.sm,fontWeight:700,color:c.t1,marginBottom:2}}>{s.title}</div>
                  <div style={{fontSize:f.xs,color:c.t3}}>📅 {fmtShort(s.service_date)}{s.service_time?` · 🕐 ${fmtSvcT(s.service_time)}`:''}</div>
                </div>
                <span style={{...bdg(c.accentL,c.accentT,`1px solid ${c.border}`),whiteSpace:'nowrap',flexShrink:0}}>RSVP →</span>
              </div>
            ))}
          </div>
        )}

        {/* Ministry assignments */}
        <div style={card}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:f.base,fontWeight:700,color:c.t1}}>{t.ministry}</div>
            {pending.length>0&&<span style={{background:'#ef4444',color:'#fff',borderRadius:20,fontSize:f.xs,fontWeight:800,padding:'2px 8px'}}>{pending.length}</span>}
          </div>
          {assigns.length===0
            ? <div style={{padding:'20px',textAlign:'center',color:c.t3,fontSize:f.sm}}>{t.noMinistry}</div>
            : assigns.map(a=>(
              <div key={a.id} style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6}}>
                  <div>
                    <div style={{fontSize:f.sm,fontWeight:700,color:c.t1}}>{a.ministryRole?.name||'—'}</div>
                    <div style={{fontSize:f.xs,color:c.t2,marginTop:1}}>{a.Service?.title||'—'}</div>
                    <div style={{fontSize:f.xs,color:c.t3}}>{fmtShort(a.Service?.service_date)} · {fmtSvcT(a.Service?.service_time)}</div>
                  </div>
                  {a.confirmed
                    ? <span style={bdg(c.successL,c.success,`1px solid ${c.successB}`)}>{t.confirmed}</span>
                    : <button onClick={()=>doConfirm(a.id)} disabled={confL===a.id}
                        style={{padding:'7px 14px',borderRadius:7,fontSize:f.xs,fontWeight:700,cursor:'pointer',background:c.accentL,color:c.accentT,border:`1px solid ${c.border}`,fontFamily:'inherit',opacity:confL===a.id?0.6:1,minHeight:36,whiteSpace:'nowrap'}}>
                        {confL===a.id?'…':t.confirm}
                      </button>}
                </div>
              </div>
            ))}
        </div>

        {/* Events */}
        <div style={{...card,padding:'0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.base,fontWeight:700,color:c.t1}}>Events</div>
          {events.length===0
            ? <div style={{padding:'32px 20px',textAlign:'center',color:c.t3,fontSize:f.sm}}>{t.noEvents}</div>
            : events.map((e,i)=>(
              <div key={e.id} style={{padding:'14px 16px',borderBottom:i<events.length-1?`1px solid ${c.borderL}`:'none',borderLeft:`3px solid ${e.is_registered?c.success:c.border}`}}>
                <div style={{fontSize:f.sm,fontWeight:800,color:c.t1,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.2px'}}>{e.title}</div>
                <div style={{fontSize:f.xs,color:c.t2,marginBottom:2}}>📅 {fmtDate(e.start_date)}</div>
                {e.location&&<div style={{fontSize:f.xs,color:c.t2,marginBottom:2}}>📍 {e.location}</div>}
                {e.registration_deadline&&<div style={{fontSize:f.xs,color:c.amber,marginBottom:6}}>🕐 Deadline: {fmtDate(e.registration_deadline)}</div>}
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  {e.is_registered?(
                    <>
                      <button onClick={()=>doCancel(e.id)} disabled={evtL===e.id||!e.can_cancel}
                        style={{flex:1,padding:'8px',borderRadius:8,fontSize:f.xs,fontWeight:600,cursor:e.can_cancel?'pointer':'not-allowed',background:'none',border:`1.5px solid ${c.danger}`,color:c.danger,fontFamily:'inherit',opacity:!e.can_cancel?0.5:1,minHeight:40}}>
                        {evtL===e.id?'…':t.cancelReg}
                      </button>
                      <button onClick={()=>onEventDetailsClick(e)}
                        style={{flex:1,padding:'8px',borderRadius:8,fontSize:f.xs,fontWeight:600,background:c.accentL,border:`1px solid ${c.border}`,color:c.accentT,cursor:'pointer',fontFamily:'inherit',minHeight:40}}>
                        {t.viewDetails}
                      </button>
                    </>
                  ):(
                    <>
                      <button onClick={()=>doRegister(e.id)} disabled={evtL===e.id||!e.can_register}
                        style={{flex:2,padding:'8px',borderRadius:8,fontSize:f.xs,fontWeight:700,cursor:e.can_register?'pointer':'not-allowed',background:e.can_register?c.t1:c.surfaceAlt,color:e.can_register?'#fff':c.t3,border:'none',fontFamily:'inherit',minHeight:40}}>
                        {evtL===e.id?'…':e.deadline_passed?t.closedReg:t.registerNow}
                      </button>
                      <button onClick={()=>onEventDetailsClick(e)}
                        style={{flex:1,padding:'8px',borderRadius:8,fontSize:f.xs,fontWeight:600,background:c.surfaceAlt,border:`1px solid ${c.border}`,color:c.t2,cursor:'pointer',fontFamily:'inherit',minHeight:40}}>
                        {t.viewDetails}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* My Registrations */}
        {myRegs.length>0&&(
          <div style={card}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.base,fontWeight:700,color:c.t1}}>{t.myRegs}</div>
            {myRegs.map(e=>(
              <div key={e.id} style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:f.sm,fontWeight:700,color:c.t1}}>{e.title}</div>
                  <div style={{fontSize:f.xs,color:c.t3,marginTop:2}}>{fmtShort(e.start_date)}{e.location?` · ${e.location}`:''}</div>
                </div>
                <span style={bdg(c.successL,c.success,`1px solid ${c.successB}`)}>✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Desktop layout (original 3-column) ───────────────────────
  return (
    <div style={{display:'grid',gridTemplateColumns:'270px 1fr 250px',gap:16,alignItems:'start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'13px 16px',borderBottom:`1px solid ${c.borderL}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:f.base,fontWeight:700,color:c.t1}}>{t.ministry}</div>
            {pending.length>0&&<span style={{background:'#ef4444',color:'#fff',borderRadius:20,fontSize:f.xs,fontWeight:800,padding:'2px 8px'}}>{pending.length}</span>}
          </div>
          <div style={{maxHeight:460,overflowY:'auto'}}>
            {assigns.length===0
              ? <div style={{padding:'24px',textAlign:'center',color:c.t3,fontSize:f.sm}}>{t.noMinistry}</div>
              : assigns.map(a=>(
                <div key={a.id} style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,background:a.confirmed?c.surfaceAlt:c.surface}}>
                  <div style={{fontSize:f.sm,fontWeight:700,color:c.t1,marginBottom:2}}>{a.ministryRole?.name||'—'}</div>
                  <div style={{fontSize:f.xs,color:c.t2,marginBottom:1}}>{a.Service?.title||'—'}</div>
                  <div style={{fontSize:f.xs,color:c.t3,marginBottom:8}}>{fmtShort(a.Service?.service_date)} · {fmtSvcT(a.Service?.service_time)}</div>
                  {a.confirmed
                    ? <span style={bdg(c.successL,c.success,`1px solid ${c.successB}`)}>{t.confirmed}</span>
                    : <button onClick={()=>doConfirm(a.id)} disabled={confL===a.id}
                        style={{width:'100%',padding:'6px',borderRadius:7,fontSize:f.xs,fontWeight:700,cursor:'pointer',background:c.accentL,color:c.accentT,border:`1px solid ${c.border}`,fontFamily:'inherit',opacity:confL===a.id?0.6:1}}>
                        {confL===a.id?'…':t.confirm}
                      </button>}
                </div>
              ))}
          </div>
        </div>
        {myRegs.length>0&&(
          <div style={{...card,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.base,fontWeight:700,color:c.t1}}>{t.myRegs}</div>
            {myRegs.map(e=>(
              <div key={e.id} style={{padding:'10px 16px',borderBottom:`1px solid ${c.borderL}`}}>
                <div style={{fontSize:f.sm,fontWeight:700,color:c.t1,marginBottom:3}}>{e.title}</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:f.xs,color:c.t3}}>{fmtShort(e.start_date)}{e.location?` · ${e.location}`:''}</div>
                  <span style={bdg(c.successL,c.success,`1px solid ${c.successB}`)}>Confirmed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {events.length===0
          ? <div style={{...card,padding:'40px 24px',textAlign:'center',color:c.t3,fontSize:f.base}}>{t.noEvents}</div>
          : events.map(e=>(
            <div key={e.id} style={{...card,padding:'18px 20px',border:`1.5px solid ${e.is_registered?c.successB:c.border}`,transition:'border-color 0.2s'}}>
              <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:f.md,fontWeight:800,color:c.t1,marginBottom:3,textTransform:'uppercase',letterSpacing:'0.3px'}}>{e.title}</div>
                  {e.description&&<div style={{fontSize:f.sm,color:c.t2,marginBottom:8,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{e.description}</div>}
                  <div style={{display:'flex',flexDirection:'column',gap:2,marginBottom:12}}>
                    <span style={{fontSize:f.sm,color:c.t2}}>📅 {fmtDate(e.start_date)}{e.end_date&&e.end_date!==e.start_date?` – ${fmtDate(e.end_date)}`:''}</span>
                    {e.location&&<span style={{fontSize:f.sm,color:c.t2}}>📍 {e.location}</span>}
                    {e.registration_deadline&&<span style={{fontSize:f.sm,color:c.amber}}>🕐 {t.regDeadline}: {fmtDate(e.registration_deadline)}</span>}
                    <span style={{fontSize:f.sm,color:c.t3}}>👥 {e.registration_count} {t.registered}{e.capacity?` ${t.of} ${e.capacity}`:''}</span>
                  </div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {e.is_registered?(
                      <>
                        <button onClick={()=>doCancel(e.id)} disabled={evtL===e.id||!e.can_cancel}
                          style={{padding:'7px 16px',borderRadius:8,fontSize:f.sm,fontWeight:600,cursor:e.can_cancel?'pointer':'not-allowed',background:'none',border:`1.5px solid ${c.danger}`,color:c.danger,fontFamily:'inherit',opacity:!e.can_cancel?0.5:1}}>
                          {evtL===e.id?'…':t.cancelReg}
                        </button>
                        <button onClick={()=>onEventDetailsClick(e)}
                          style={{padding:'7px 16px',borderRadius:8,fontSize:f.sm,fontWeight:600,background:c.accentL,border:`1px solid ${c.border}`,color:c.accentT,cursor:'pointer',fontFamily:'inherit'}}>
                          {t.viewDetails}
                        </button>
                      </>
                    ):(
                      <>
                        <button onClick={()=>doRegister(e.id)} disabled={evtL===e.id||!e.can_register}
                          style={{padding:'8px 20px',borderRadius:8,fontSize:f.sm,fontWeight:700,cursor:e.can_register?'pointer':'not-allowed',background:e.can_register?c.t1:c.surfaceAlt,color:e.can_register?'#fff':c.t3,border:'none',fontFamily:'inherit'}}>
                          {evtL===e.id?'…':e.deadline_passed?t.closedReg:t.registerNow}
                        </button>
                        <button onClick={()=>onEventDetailsClick(e)}
                          style={{padding:'7px 14px',borderRadius:8,fontSize:f.sm,fontWeight:600,background:c.surfaceAlt,border:`1px solid ${c.border}`,color:c.t2,cursor:'pointer',fontFamily:'inherit'}}>
                          {t.viewDetails}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{width:78,height:78,borderRadius:10,background:c.surfaceAlt,border:`1px solid ${c.border}`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:c.t3,fontSize:f.xs,textAlign:'center'}}>Poster</div>
              </div>
            </div>
          ))}
      </div>

      <div style={{...card,overflow:'hidden'}}>
        <div style={{padding:'13px 16px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.base,fontWeight:700,color:c.t1}}>{t.services}</div>
        <div style={{maxHeight:500,overflowY:'auto'}}>
          {services.length===0
            ? <div style={{padding:'24px',textAlign:'center',color:c.t3,fontSize:f.sm}}>{t.noServices}</div>
            : services.map((s,i)=>(
              <div key={s.id} onClick={()=>onServiceClick(s.id)}
                style={{padding:'12px 16px',borderBottom:i<services.length-1?`1px solid ${c.borderL}`:'none',cursor:'pointer',transition:'background 0.12s'}}
                onMouseEnter={e=>e.currentTarget.style.background=c.surfaceAlt}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6,marginBottom:4}}>
                  <div style={{fontSize:f.sm,fontWeight:700,color:c.t1,flex:1}}>{s.title}</div>
                  <span style={{padding:'2px 8px',borderRadius:20,fontSize:f.xs,fontWeight:700,background:c.accentL,color:c.accentT,border:`1px solid ${c.border}`,whiteSpace:'nowrap',flexShrink:0}}>{s.status}</span>
                </div>
                <div style={{fontSize:f.xs,color:c.t3}}>📅 {fmtShort(s.service_date)}</div>
                {s.service_time&&<div style={{fontSize:f.xs,color:c.t3}}>🕐 {fmtSvcT(s.service_time)}</div>}
                <div style={{fontSize:f.xs,color:c.accentT,marginTop:4,fontWeight:500}}>Tap to RSVP →</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function AttendanceTab({attendance,c,f,t,fmtDate,fmtTime,isMobile}) {
  const card = {background:c.surface,borderRadius:12,border:`1px solid ${c.border}`,boxShadow:c.shadow};
  const bdg  = (bg,color,border)=>({padding:'4px 12px',borderRadius:20,fontSize:f.xs,fontWeight:700,background:bg,color,border});
  const rate = attendance?.attendanceRate||0;
  const rateColor = rate>=80?c.success:rate>=50?c.amber:c.danger;

  return (
    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 260px',gap:16,alignItems:'start'}}>
      <div>
        {/* Rate card on mobile — shown above the list */}
        {isMobile&&(
          <div style={{...card,padding:'16px 20px',display:'flex',alignItems:'center',gap:16,marginBottom:12}}>
            <div style={{position:'relative',flexShrink:0}}>
              <Ring value={rate} size={72} stroke={7} color={rateColor} bg={c.border}/>
              <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>
                <div style={{fontSize:f.sm,fontWeight:900,color:c.t1,lineHeight:1,textAlign:'center'}}>{rate}%</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:f.md,fontWeight:700,color:rateColor,marginBottom:4}}>{rate>=80?t.excellent:rate>=50?t.good:t.improve}</div>
              <div style={{fontSize:f.xs,color:c.t3}}>{attendance?.attended||0} {t.of} {attendance?.totalServices||0} services</div>
              <div style={{fontSize:f.xs,color:c.t3}}>{t.last2mo}</div>
            </div>
          </div>
        )}

        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.lg,fontWeight:700,color:c.t1}}>{t.attendanceHistory}</div>

          {isMobile?(
            // Card list on mobile
            <div style={{padding:'8px 0'}}>
              {(!attendance?.records||attendance.records.length===0)
                ? <div style={{padding:'32px 20px',textAlign:'center',color:c.t3,fontSize:f.sm}}>{t.noAttendance}</div>
                : attendance.records.map(r=>(
                  <div key={r.id} style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:f.sm,fontWeight:700,color:c.t1,marginBottom:2}}>{r.service_title}</div>
                      <div style={{fontSize:f.xs,color:c.t3}}>{fmtDate(r.date)}{r.check_in_time?` · ${fmtTime(r.check_in_time)}`:''}</div>
                    </div>
                    <span style={bdg(r.status==='Present'?c.successL:c.dangerL,r.status==='Present'?c.success:c.danger,`1px solid ${r.status==='Present'?c.successB:c.dangerB}`)}>
                      {r.status==='Present'?t.present:t.absent}
                    </span>
                  </div>
                ))}
            </div>
          ):(
            // Table on desktop
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:c.surfaceAlt}}>
                    {[t.date,t.service,t.checkin,t.statusL].map(h=>(
                      <th key={h} style={{padding:'11px 18px',textAlign:'left',fontSize:f.xs,fontWeight:700,color:c.t3,textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:`1px solid ${c.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!attendance?.records||attendance.records.length===0)
                    ? <tr><td colSpan={4} style={{padding:'40px',textAlign:'center',color:c.t3}}>{t.noAttendance}</td></tr>
                    : attendance.records.map((r,i)=>(
                      <tr key={r.id} style={{background:i%2===0?c.surface:c.surfaceAlt,borderBottom:`1px solid ${c.borderL}`}}>
                        <td style={{padding:'12px 18px',fontSize:f.base,color:c.t2}}>{fmtDate(r.date)}</td>
                        <td style={{padding:'12px 18px',fontSize:f.base,color:c.t1,fontWeight:500}}>{r.service_title}</td>
                        <td style={{padding:'12px 18px',fontSize:f.base,color:c.t2}}>{r.check_in_time?fmtTime(r.check_in_time):'—'}</td>
                        <td style={{padding:'12px 18px'}}>
                          <span style={bdg(r.status==='Present'?c.successL:c.dangerL,r.status==='Present'?c.success:c.danger,`1px solid ${r.status==='Present'?c.successB:c.dangerB}`)}>
                            {r.status==='Present'?t.present:t.absent}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rate card — desktop only (right column) */}
      {!isMobile&&(
        <div style={{...card,padding:'28px 22px',textAlign:'center'}}>
          <div style={{fontSize:f.sm,color:c.t3,fontWeight:600,marginBottom:18}}>{t.attendanceRate}</div>
          <div style={{display:'flex',justifyContent:'center',position:'relative',marginBottom:14}}>
            <Ring value={rate} size={100} stroke={9} color={rateColor} bg={c.border}/>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>
              <div style={{fontSize:f.lg,fontWeight:900,color:c.t1,lineHeight:1}}>{rate}%</div>
            </div>
          </div>
          <div style={{fontSize:f.md,fontWeight:700,color:rateColor,marginBottom:6}}>{rate>=80?t.excellent:rate>=50?t.good:t.improve}</div>
          <div style={{fontSize:f.xs,color:c.t3}}>{attendance?.attended||0} {t.of} {attendance?.totalServices||0} services</div>
          <div style={{fontSize:f.xs,color:c.t3,marginTop:2}}>{t.last2mo}</div>
        </div>
      )}
    </div>
  );
}

function FinanceTab({finance,c,f,t,fmtDate,PHP,isMobile}) {
  const card = {background:c.surface,borderRadius:12,border:`1px solid ${c.border}`,boxShadow:c.shadow};

  return (
    <div style={{...card,overflow:'hidden'}}>
      {/* YTD hero card */}
      {finance&&(
        <div style={{padding:isMobile?'16px':'20px 22px',background:'linear-gradient(135deg,#003d70,#005599)',color:'#fff',borderBottom:`1px solid ${c.border}`}}>
          <div style={{fontSize:f.xs,opacity:0.8,fontWeight:600,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>{t.totalYtd}</div>
          <div style={{fontSize:isMobile?28:f.stat,fontWeight:900,letterSpacing:'-1px',lineHeight:1}}>{PHP(finance.ytdTotal)}</div>
          <div style={{fontSize:f.xs,opacity:0.7,marginTop:6}}>{t.thisYear}</div>
          <div style={{fontSize:f.xs,opacity:0.7,marginTop:2,fontStyle:'italic'}}>{t.verse}</div>
        </div>
      )}

      <div style={{padding:'14px 18px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.lg,fontWeight:700,color:c.t1}}>{t.offeringsHistory}</div>

      {isMobile?(
        // Card list on mobile
        <div style={{padding:'8px 0'}}>
          {(!finance?.records||finance.records.length===0)
            ? <div style={{padding:'32px 20px',textAlign:'center',color:c.t3,fontSize:f.sm}}>{t.noOfferings}</div>
            : finance.records.map(r=>{
              const cs=catStyle(r.category?.name,c.dk);
              return (
                <div key={r.id} style={{padding:'12px 16px',borderBottom:`1px solid ${c.borderL}`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{padding:'3px 10px',borderRadius:20,fontSize:f.xs,fontWeight:600,...cs}}>{r.category?.name||'Offering'}</span>
                    <div style={{fontSize:f.xs,color:c.t3,marginTop:4}}>{fmtDate(r.transaction_date)}</div>
                  </div>
                  <div style={{fontSize:f.md,fontWeight:800,color:c.t1,flexShrink:0}}>{PHP(r.amount)}</div>
                </div>
              );
            })}
        </div>
      ):(
        // Table on desktop
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:c.surfaceAlt}}>
                {[t.date,t.type,t.amount].map(h=>(
                  <th key={h} style={{padding:'11px 20px',textAlign:'left',fontSize:f.xs,fontWeight:700,color:c.t3,textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:`1px solid ${c.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!finance?.records||finance.records.length===0)
                ? <tr><td colSpan={3} style={{padding:'40px',textAlign:'center',color:c.t3}}>{t.noOfferings}</td></tr>
                : finance.records.map((r,i)=>{
                  const cs=catStyle(r.category?.name,c.dk);
                  return (
                    <tr key={r.id} style={{background:i%2===0?c.surface:c.surfaceAlt,borderBottom:`1px solid ${c.borderL}`}}>
                      <td style={{padding:'13px 20px',fontSize:f.base,color:c.t2}}>{fmtDate(r.transaction_date)}</td>
                      <td style={{padding:'13px 20px'}}>
                        <span style={{padding:'4px 12px',borderRadius:20,fontSize:f.sm,fontWeight:600,...cs}}>{r.category?.name||'Offering'}</span>
                      </td>
                      <td style={{padding:'13px 20px',fontSize:f.base,color:c.t1,fontWeight:600}}>{PHP(r.amount)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function MemberPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const width    = useWindowWidth();
  const isMobile = width <= 768;

  const prefs = getPrefs();
  const c = makeC(prefs);
  const fontFamily = prefs.fontFamily || 'DM Sans';
  const fontSize   = prefs.fontSize   || 16;
  const zoom       = prefs.resolution || 1;

  const [lang, setLang] = useState(() => getLangCode());
  const t = LBL[lang] || LBL.en;

  useEffect(() => {
    const restoreSaved = () => {
      const code = getLangCode();
      if (code && code !== 'en') {
        const saved = LANGS.find(l => l.code === code);
        if (saved) { saveLangCode(code); applyGTLang(saved); }
      }
    };
    loadGTScript('google_translate_element_portal', restoreSaved);
  }, []); // eslint-disable-line

  useEffect(() => {
    const handler = (e) => {
      const code = e.detail?.code || getLangCode();
      setLang(code);
      if (code && code !== 'en') {
        const saved = LANGS.find(l => l.code === code);
        if (saved) applyGTLang(saved);
      }
    };
    const storageHandler = () => { const code = getLangCode(); setLang(code); };
    window.addEventListener('plwm-lang-change', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('plwm-lang-change', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  useEffect(() => {
    const googleFonts = [...GOOGLE_FONTS];
    if (googleFonts.includes(fontFamily)) {
      const id = 'plwm-font-link';
      let el = document.getElementById(id);
      if (!el) { el = document.createElement('link'); el.id=id; el.rel='stylesheet'; document.head.appendChild(el); }
      el.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;700;800;900&display=swap`;
    } else if (FONTSHARE.includes(fontFamily)) {
      const id = 'plwm-fontshare-link';
      let el = document.getElementById(id);
      if (!el) { el = document.createElement('link'); el.id=id; el.rel='stylesheet'; document.head.appendChild(el); }
      el.href = `https://api.fontshare.com/v2/css?f[]=${fontFamily.toLowerCase()}@400,500,700&display=swap`;
    }
  }, [fontFamily]);

  const f = {
    xs:   Math.max(10, Math.round(fontSize * 0.72)),
    sm:   Math.max(11, Math.round(fontSize * 0.82)),
    base: fontSize,
    md:   Math.round(fontSize * 1.07),
    lg:   Math.round(fontSize * 1.25),
    stat: Math.round(fontSize * 1.9),
  };

  const [tab, setTab]           = useState(0);
  const [profile, setProfile]   = useState(null);
  const [attendance, setAtt]    = useState(null);
  const [finance, setFin]       = useState(null);
  const [events, setEvents]     = useState([]);
  const [assigns, setAssigns]   = useState([]);
  const [services, setSvcs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);

  const [editing,   setEditing]   = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [editSaving,setES]        = useState(false);
  const [editError, setEE]        = useState('');

  const [evtL,    setEvtL]    = useState(null);
  const [confL,   setConfL]   = useState(null);

  const [serviceModal, setServiceModal] = useState(null);
  const [svcLoading,   setSvcLoading]   = useState(false);
  const [svcResponding,setSvcResponding]= useState(false);
  const [eventModal,   setEventModal]   = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const initials  = profile ? `${profile.first_name?.[0]||''}${profile.last_name?.[0]||''}`.toUpperCase() : '?';
  const greeting  = profile ? `${profile.gender==='Female'?'Sister':'Brother'} ${profile.first_name}` : user?.email?.split('@')[0]||'Friend';
  const avatarUrl = profile?.profile_photo_url ? `${API_IMG}/uploads${profile.profile_photo_url}` : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pR,aR,fR,eR,mR,sR] = await Promise.all([
        axiosInstance.get('/member-portal/profile'),
        axiosInstance.get('/member-portal/attendance'),
        axiosInstance.get('/member-portal/finance'),
        axiosInstance.get('/member-portal/events'),
        axiosInstance.get('/member-portal/ministry-assignments'),
        axiosInstance.get('/member-portal/services'),
      ]);
      setProfile(pR.data.data); setAtt(aR.data.data); setFin(fR.data.data);
      setEvents(eR.data.data); setAssigns(mR.data.data); setSvcs(sR.data.data);
    } catch { showToast('Failed to load portal data. Please refresh.','error'); }
    finally { setLoading(false); }
  },[]); // eslint-disable-line

  useEffect(()=>{load();},[load]);

  const startEdit = useCallback(()=>{
    setEditForm({ first_name:profile?.first_name||'', last_name:profile?.last_name||'', phone:profile?.phone||'', email:profile?.email||'', birthdate:profile?.birthdate||'', spiritual_birthday:profile?.spiritual_birthday||'', address:profile?.address||'' });
    setEE(''); setEditing(true);
  },[profile]);

  const saveEdit = useCallback(async ()=>{
    setES(true); setEE('');
    try {
      const res = await axiosInstance.put('/member-portal/profile', editForm);
      setProfile(res.data.data); setEditing(false); showToast('Profile updated!');
    } catch(err) { setEE(err.response?.data?.message||'Failed to save.'); }
    finally { setES(false); }
  },[editForm]);

  const doRegister = useCallback(async (eid)=>{
    setEvtL(eid);
    try {
      await axiosInstance.post(`/member-portal/events/${eid}/register`);
      showToast('Registered!');
      const r=await axiosInstance.get('/member-portal/events'); setEvents(r.data.data);
      setEventModal(prev=>prev?.id===eid?{...prev,is_registered:true,can_cancel:true,can_register:false}:prev);
    } catch(err) { showToast(err.response?.data?.message||'Failed.','error'); }
    finally { setEvtL(null); }
  },[]);

  const doCancel = useCallback(async (eid)=>{
    if(!window.confirm('Cancel your registration?')) return;
    setEvtL(eid);
    try {
      await axiosInstance.delete(`/member-portal/events/${eid}/register`);
      showToast('Registration cancelled.');
      const r=await axiosInstance.get('/member-portal/events'); setEvents(r.data.data);
      setEventModal(prev=>prev?.id===eid?{...prev,is_registered:false,can_cancel:false,can_register:!prev.deadline_passed}:prev);
    } catch(err) { showToast(err.response?.data?.message||'Failed.','error'); }
    finally { setEvtL(null); }
  },[]);

  const doConfirm = useCallback(async (aid)=>{
    setConfL(aid);
    try {
      await axiosInstance.post(`/member-portal/ministry-assignments/${aid}/confirm`);
      showToast('Assignment confirmed!');
      const r=await axiosInstance.get('/member-portal/ministry-assignments'); setAssigns(r.data.data);
    } catch(err) { showToast(err.response?.data?.message||'Failed.','error'); }
    finally { setConfL(null); }
  },[]);

  const onServiceClick = useCallback(async (svcId)=>{
    setSvcLoading(true);
    try {
      const r = await axiosInstance.get(`/member-portal/services/${svcId}`);
      setServiceModal(r.data.data);
    } catch(err) { showToast(err.response?.data?.message||'Failed to load service.','error'); }
    finally { setSvcLoading(false); }
  },[]);

  const onServiceRespond = useCallback(async (status)=>{
    if(!serviceModal) return;
    setSvcResponding(true);
    try {
      const r = await axiosInstance.post(`/member-portal/services/${serviceModal.id}/respond`,{attendance_status:status});
      setServiceModal(r.data.data);
      showToast(status==='ATTENDING'?'RSVP saved — see you at the service!':status==='NOT_ATTENDING'?'Response saved.':'Response updated.');
      const aR = await axiosInstance.get('/member-portal/attendance'); setAtt(aR.data.data);
    } catch(err) { showToast(err.response?.data?.message||'Failed.','error'); }
    finally { setSvcResponding(false); }
  },[serviceModal]);

  const onEventDetailsClick = useCallback((evt)=>{ setEventModal(evt); },[]);
  const handleLogout = async () => { await logout(); navigate('/login'); };

  // ── Header ────────────────────────────────────────────────────
  const Header = () => (
    <div style={{background:BRAND,padding:isMobile?'10px 16px':'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:200}}>
      <div style={{display:'flex',alignItems:'center',gap:isMobile?10:14}}>
        <div style={{width:isMobile?32:38,height:isMobile?32:38,borderRadius:10,background:'rgba(255,255,255,0.18)',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid rgba(255,255,255,0.28)',fontSize:isMobile?13:16,color:'#fff',flexShrink:0}}>✝</div>
        <div>
          <div style={{color:'#fff',fontWeight:800,fontSize:isMobile?f.base:f.md,lineHeight:1.1}}>{t.portal}</div>
          {!isMobile&&<div style={{color:'rgba(255,255,255,0.75)',fontSize:f.xs,marginTop:1}}>{t.welcome}, {greeting}</div>}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:isMobile?8:10}}>
        {/* Avatar + name */}
        <div style={{display:'flex',alignItems:'center',gap:isMobile?6:9,background:'rgba(255,255,255,0.12)',borderRadius:24,padding:isMobile?'3px 10px 3px 3px':'4px 14px 4px 4px',border:'1px solid rgba(255,255,255,0.2)',cursor:'pointer'}} onClick={()=>{setTab(0);startEdit();}}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{width:isMobile?26:28,height:isMobile?26:28,borderRadius:'50%',objectFit:'cover'}}/>
            : <div style={{width:isMobile?26:28,height:isMobile?26:28,borderRadius:'50%',background:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:isMobile?9:10,fontWeight:800,color:'#fff'}}>{initials}</div>}
          <span style={{color:'rgba(255,255,255,0.9)',fontSize:f.sm,fontWeight:600}}>{profile?.first_name||'—'}</span>
        </div>
        {/* Settings — icon only on mobile */}
        <button onClick={()=>navigate('/portal/settings')} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.22)',color:'#fff',borderRadius:8,padding:isMobile?'6px 10px':'6px 14px',fontSize:isMobile?16:f.sm,cursor:'pointer',fontFamily:'inherit',fontWeight:500,minHeight:36,minWidth:36,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {isMobile?'⚙️':t.settings}
        </button>
        {/* Logout — icon only on mobile */}
        <button onClick={handleLogout} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.22)',color:'#fff',borderRadius:8,padding:isMobile?'6px 10px':'6px 14px',fontSize:isMobile?16:f.sm,cursor:'pointer',fontFamily:'inherit',fontWeight:500,minHeight:36,minWidth:36,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {isMobile?'↩':t.logout}
        </button>
      </div>
    </div>
  );

  // ── Tab Bar — top on desktop, bottom on mobile ────────────────
  const TopTabBar = () => (
    <div style={{borderBottom:`1px solid ${c.border}`,background:c.surface,display:'flex',padding:'0 24px',overflowX:'auto',position:'sticky',top:isMobile?58:62,zIndex:100}}>
      {t.tabs.map((tb,i)=>(
        <button key={i} onClick={()=>setTab(i)} style={{padding:'13px 18px',fontSize:f.base,fontWeight:tab===i?700:500,color:tab===i?c.tabActive:c.t2,background:'none',border:'none',borderBottom:tab===i?`2.5px solid ${c.tabActive}`:'2.5px solid transparent',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'color 0.15s'}}>
          {tb}
        </button>
      ))}
    </div>
  );

  const MobileBottomTabBar = () => (
    <nav style={{
      position:'fixed',bottom:0,left:0,right:0,
      height:`calc(60px + env(safe-area-inset-bottom,0px))`,
      background:c.surface,borderTop:`1px solid ${c.border}`,
      display:'flex',zIndex:200,boxShadow:'0 -2px 12px rgba(0,0,0,0.08)',
      paddingBottom:'env(safe-area-inset-bottom,0px)',
    }}>
      {t.tabs.map((tb,i)=>(
        <button key={i} onClick={()=>setTab(i)} style={{
          flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          gap:3,border:'none',background:'none',cursor:'pointer',padding:'6px 4px',
          color:tab===i?c.tabActive:c.t3,fontFamily:'inherit',position:'relative',
        }}>
          {tab===i&&<span style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:32,height:3,background:c.tabActive,borderRadius:'0 0 3px 3px'}}/>}
          <span style={{fontSize:18,lineHeight:1}}>{t.tabIcons[i]}</span>
          <span style={{fontSize:10,fontWeight:tab===i?700:600,letterSpacing:'0.2px'}}>{tb}</span>
        </button>
      ))}
    </nav>
  );

  const LoadSkeleton = () => (
    <div>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:14,marginBottom:20}}>
        {[1,2,3].map(i=><div key={i} style={{background:c.surface,borderRadius:12,border:`1px solid ${c.border}`,padding:'20px'}}><Skel w="50%" h={11}/><Skel w="70%" h={28} mt={10}/></div>)}
      </div>
      <div style={{background:c.surface,borderRadius:12,border:`1px solid ${c.border}`,padding:'24px'}}>
        {[1,2,3,4,5].map(i=><div key={i} style={{marginBottom:12}}><Skel w="30%" h={10}/><Skel w="55%" h={14} mt={5}/></div>)}
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:c.bg,fontFamily:`'${fontFamily}',system-ui,sans-serif`,fontSize:`${fontSize}px`,zoom}}>
      <div id="google_translate_element_portal" style={{position:'fixed',bottom:-200,left:0,opacity:0,pointerEvents:'none',zIndex:-1}}/>
      <style>{`
        @keyframes shimmer{0%{background-position:400% 0}100%{background-position:-400% 0}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideUpSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${c.border};border-radius:10px}
      `}</style>

      <Header/>
      {/* Desktop: top tab bar. Mobile: none here (bottom bar below) */}
      {!isMobile&&<TopTabBar/>}

      <div style={{
        maxWidth:isMobile?'100%':1240,
        margin:'0 auto',
        padding:isMobile?'14px 12px':'24px 20px',
        paddingBottom:isMobile?`calc(80px + env(safe-area-inset-bottom,0px))`:'24px',
      }}>
        {/* Mobile: show tab title */}
        {isMobile&&(
          <div style={{fontSize:f.lg,fontWeight:800,color:c.t1,marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${c.border}`}}>
            {t.tabIcons[tab]} {t.tabs[tab]}
          </div>
        )}

        {loading ? <LoadSkeleton/> : (
          <>
            {tab===0&&<OverviewTab profile={profile} attendance={attendance} finance={finance} editing={editing} editForm={editForm} setEditForm={setEditForm} editSaving={editSaving} editError={editError} startEdit={startEdit} saveEdit={saveEdit} setEditing={setEditing} c={c} f={f} t={t} avatarUrl={avatarUrl} initials={initials} BRAND={BRAND} PHP={PHP} fmtDate={fmtDate} isMobile={isMobile}/>}
            {tab===1&&<EventsTab events={events} assigns={assigns} services={services} evtL={evtL} confL={confL} doRegister={doRegister} doCancel={doCancel} doConfirm={doConfirm} onServiceClick={onServiceClick} onEventDetailsClick={onEventDetailsClick} c={c} f={f} t={t} fmtDate={fmtDate} fmtShort={fmtShort} fmtSvcT={fmtSvcT} isMobile={isMobile}/>}
            {tab===2&&<AttendanceTab attendance={attendance} c={c} f={f} t={t} fmtDate={fmtDate} fmtTime={fmtTime} isMobile={isMobile}/>}
            {tab===3&&<FinanceTab finance={finance} c={c} f={f} t={t} fmtDate={fmtDate} PHP={PHP} isMobile={isMobile}/>}
          </>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      {isMobile&&<MobileBottomTabBar/>}

      {/* Service RSVP Modal */}
      {svcLoading&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:12,padding:'24px 32px',fontSize:14,color:'#64748b'}}>Loading service…</div>
        </div>
      )}
      {serviceModal&&!svcLoading&&(
        <ServiceModal svc={serviceModal} onClose={()=>setServiceModal(null)} onRespond={onServiceRespond} responding={svcResponding} c={c} f={f} t={t} isMobile={isMobile}/>
      )}

      {/* Event Details Modal */}
      {eventModal&&(
        <EventModal evt={eventModal} onClose={()=>setEventModal(null)} onRegister={doRegister} onCancel={doCancel} evtLoading={evtL} c={c} f={f} t={t} isMobile={isMobile}/>
      )}

      {/* Toast — above bottom tab bar on mobile */}
      {toast&&(
        <div style={{position:'fixed',bottom:isMobile?`calc(72px + env(safe-area-inset-bottom,0px))`:28,right:isMobile?12:28,left:isMobile?12:'auto',background:toast.type==='success'?c.success:c.danger,color:'#fff',padding:'12px 18px',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.2)',zIndex:9999,display:'flex',alignItems:'center',gap:10,fontSize:f.base,fontWeight:500,animation:'slideUp 0.3s ease'}}>
          <span style={{fontSize:15}}>{toast.type==='success'?'✓':'✕'}</span>{toast.msg}
        </div>
      )}
    </div>
  );
}
