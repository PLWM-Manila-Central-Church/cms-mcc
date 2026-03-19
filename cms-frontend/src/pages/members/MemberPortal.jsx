import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const BRAND   = 'linear-gradient(135deg,#003d70,#005599,#13B5EA)';
const API_IMG = (process.env.REACT_APP_API_URL || '').replace(/\/api$/, '');
const PHP     = (n) => `₱${Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) : '—';
const fmtShort= (d) => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}) : '—';
const fmtSvcT = (t) => { if (!t) return '—'; const [h,m]=t.split(':'); const d=new Date(); d.setHours(+h,+m); return d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}); };

const getPrefs = () => { try { return JSON.parse(localStorage.getItem('plwm_prefs')||'{}'); } catch { return {}; } };

const makeC = (prefs) => {
  const dk = prefs.theme === 'dark';
  return {
    bg:dk?'#0e1420':'#f0f4f8', surface:dk?'#1a2332':'#ffffff',
    surfaceAlt:dk?'#141d2b':'#f8fafc', border:dk?'#2d3a4e':'#e2e8f0',
    borderL:dk?'#243040':'#f1f5f9', t1:dk?'#f1f5f9':'#0f172a',
    t2:dk?'#94a3b8':'#475569', t3:dk?'#64748b':'#94a3b8',
    accent:'#005599', accentL:dk?'#1e3a5f':'#eff6ff', accentT:dk?'#60a5fa':'#005599',
    success:'#16a34a', successL:dk?'#14532d':'#dcfce7', successB:dk?'#166534':'#bbf7d0',
    danger:'#dc2626', dangerL:dk?'#7f1d1d':'#fef2f2', dangerB:dk?'#991b1b':'#fecaca',
    amber:'#d97706', amberL:dk?'#78350f':'#fffbeb', amberB:dk?'#92400e':'#fde68a',
    tabActive:dk?'#13B5EA':'#005599', shadow:dk?'0 1px 4px rgba(0,0,0,0.4)':'0 1px 4px rgba(0,0,0,0.07)', dk,
  };
};

const makeF = (prefs) => {
  const s = prefs.fontSize||'md';
  return { xs:s==='sm'?10:s==='lg'?13:11, sm:s==='sm'?11:s==='lg'?14:12, base:s==='sm'?13:s==='lg'?16:14, md:s==='sm'?14:s==='lg'?17:15, lg:s==='sm'?16:s==='lg'?20:18, stat:s==='sm'?22:s==='lg'?34:27 };
};

const LBL = {
  en:{
    tabs:['Overview','Events','My Attendance','My Tithes and Offerings'],
    portal:'Member Portal',welcome:'Welcome',settings:'Settings',logout:'Logout',
    attendanceRate:'Attendance Rate',last2mo:'Last month',
    totalOfferings:'Total Tithes & Offerings',thisYear:'This year',memberSince:'Member Since',
    myProfile:'My Profile',editProfile:'Edit Profile',save:'Save',cancel:'Cancel',
    memberId:'Member ID',memberName:'Member Name',spiritual:'Spiritual Birthday',
    cellGroup:'Cell Group',address:'Address',joinDate:'Join Date',group:'Group',
    contact:'Contact No',birthdate:'Flesh Birthday',status:'Status',
    ministry:'Ministry Assignments',services:'Upcoming Services',
    confirm:'Confirm',confirmed:'Confirmed ✓',noMinistry:'No ministry assignments.',noServices:'No upcoming services.',
    noEvents:'No upcoming events at this time.',registerNow:'Register Now',
    cancelReg:'Cancel Registration',closedReg:'Registration Closed',viewDetails:'View Details',
    myRegs:'My Registrations',regDeadline:'Deadline',of:'of',registered:'registered',
    attendanceHistory:'My Attendance History',noAttendance:'No attendance records found.',
    date:'Date',service:'Service',checkin:'Check-in Time',statusL:'Status',present:'Present',absent:'Absent',
    offeringsHistory:'My Tithes and Offering History',noOfferings:'No giving records.',
    type:'Type',amount:'Amount',totalYtd:'Total Year-to-Date Tithes and Offerings',
    verse:'"God loves a cheerful giver." — 2 Corinthians 9:7',
    excellent:'Excellent',good:'Good',improve:'Needs Improvement',
  },
  tl:{
    tabs:['Pangkalahatang-tanaw','Mga Kaganapan','Aking Pagdalo','Aking mga Handog'],
    portal:'Portal ng Miyembro',welcome:'Maligayang pagdating',settings:'Mga Setting',logout:'Mag-logout',
    attendanceRate:'Rate ng Pagdalo',last2mo:'Nakaraang buwan',
    totalOfferings:'Kabuuang Ikapu at Handog',thisYear:'Ngayong taon',memberSince:'Miyembro Mula',
    myProfile:'Aking Profile',editProfile:'I-edit',save:'I-save',cancel:'Kanselahin',
    memberId:'Member ID',memberName:'Pangalan',spiritual:'Espirituwal na Kaarawan',
    cellGroup:'Cell Group',address:'Tirahan',joinDate:'Petsa ng Pagsali',group:'Grupo',
    contact:'Numero',birthdate:'Kaarawan',status:'Katayuan',
    ministry:'Mga Takdang Gawain',services:'Mga Paparating na Serbisyo',
    confirm:'Kumpirmahin',confirmed:'Nakumpirma ✓',noMinistry:'Walang mga takdang gawain.',noServices:'Walang paparating na serbisyo.',
    noEvents:'Walang mga kaganapan.',registerNow:'Mag-register Na',
    cancelReg:'Kanselahin',closedReg:'Sarado na',viewDetails:'Tingnan',
    myRegs:'Aking mga Pagpaparehistro',regDeadline:'Deadline',of:'sa',registered:'nakapag-register',
    attendanceHistory:'Kasaysayan ng Pagdalo',noAttendance:'Walang rekord ng pagdalo.',
    date:'Petsa',service:'Serbisyo',checkin:'Oras ng Pag-check in',statusL:'Katayuan',present:'Naroroon',absent:'Wala',
    offeringsHistory:'Kasaysayan ng Ikapu at Handog',noOfferings:'Walang rekord ng pagbibigay.',
    type:'Uri',amount:'Halaga',totalYtd:'Kabuuang Ikapu at Handog sa Taon',
    verse:'"Ang nagbibigay nang masaya ay mahal ng Diyos." — 2 Mga Taga-Corinto 9:7',
    excellent:'Kahusayan',good:'Mabuti',improve:'Kailangan ng Pagpabuti',
  },
};

const catStyle = (name, dk) => ({
  Tithe:{bg:dk?'#78350f':'#fefce8',color:dk?'#fde68a':'#854d0e',border:`1px solid ${dk?'#92400e':'#fef08a'}`},
  Offering:{bg:dk?'#1e3a5f':'#eff6ff',color:dk?'#93c5fd':'#1d4ed8',border:`1px solid ${dk?'#2563eb':'#bfdbfe'}`},
  'Special Offering':{bg:'transparent',color:dk?'#94a3b8':'#374151',border:`1px solid ${dk?'#475569':'#d1d5db'}`},
}[name]||{bg:dk?'#243040':'#f8fafc',color:dk?'#94a3b8':'#475569',border:`1px solid ${dk?'#2d3a4e':'#e2e8f0'}`});

function Ring({value=0,size=88,stroke=8,color='#005599',bg='#e2e8f0'}) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, off=circ-(Math.min(value,100)/100)*circ;
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

export default function MemberPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const prefs = getPrefs();
  const c = makeC(prefs);
  const f = makeF(prefs);
  const lk = prefs.language || 'en';
  const t = LBL[lk] || LBL.en;

  const [tab, setTab]           = useState(0);
  const [profile, setProfile]   = useState(null);
  const [attendance, setAtt]    = useState(null);
  const [finance, setFin]       = useState(null);
  const [events, setEvents]     = useState([]);
  const [assigns, setAssigns]   = useState([]);
  const [services, setSvcs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setES]     = useState(false);
  const [editError, setEE]      = useState('');
  const [evtL, setEvtL]         = useState(null);
  const [confL, setConfL]       = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const initials = profile ? `${profile.first_name?.[0]||''}${profile.last_name?.[0]||''}`.toUpperCase() : '?';
  const greeting = profile ? `${profile.gender==='Female'?'Sister':'Brother'} ${profile.first_name}` : user?.email?.split('@')[0]||'Friend';
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
  },[]);

  useEffect(()=>{load();},[load]);

  const startEdit = () => {
    setEditForm({ first_name:profile?.first_name||'', last_name:profile?.last_name||'', phone:profile?.phone||'', email:profile?.email||'', birthdate:profile?.birthdate||'', spiritual_birthday:profile?.spiritual_birthday||'', address:profile?.address||'' });
    setEE(''); setEditing(true);
  };

  const saveEdit = async () => {
    setES(true); setEE('');
    try {
      const res = await axiosInstance.put('/member-portal/profile', editForm);
      setProfile(res.data.data); setEditing(false); showToast('Profile updated!');
    } catch(err) { setEE(err.response?.data?.message||'Failed to save.'); }
    finally { setES(false); }
  };

  const doRegister = async (eid) => {
    setEvtL(eid);
    try { await axiosInstance.post(`/member-portal/events/${eid}/register`); showToast('Registered!'); const r=await axiosInstance.get('/member-portal/events'); setEvents(r.data.data); }
    catch(err) { showToast(err.response?.data?.message||'Failed.','error'); }
    finally { setEvtL(null); }
  };

  const doCancel = async (eid) => {
    if(!window.confirm('Cancel your registration?')) return;
    setEvtL(eid);
    try { await axiosInstance.delete(`/member-portal/events/${eid}/register`); showToast('Registration cancelled.'); const r=await axiosInstance.get('/member-portal/events'); setEvents(r.data.data); }
    catch(err) { showToast(err.response?.data?.message||'Failed.','error'); }
    finally { setEvtL(null); }
  };

  const doConfirm = async (aid) => {
    setConfL(aid);
    try { await axiosInstance.post(`/member-portal/ministry-assignments/${aid}/confirm`); showToast('Assignment confirmed!'); const r=await axiosInstance.get('/member-portal/ministry-assignments'); setAssigns(r.data.data); }
    catch(err) { showToast(err.response?.data?.message||'Failed.','error'); }
    finally { setConfL(null); }
  };

  const card = {background:c.surface,borderRadius:12,border:`1px solid ${c.border}`,boxShadow:c.shadow};
  const bdg = (bg,color,border) => ({padding:'3px 10px',borderRadius:20,fontSize:f.xs,fontWeight:700,background:bg,color,border});
  const btn = (bg,color,border='none') => ({background:bg,color,border,borderRadius:8,padding:'7px 16px',fontSize:f.sm,fontWeight:600,cursor:'pointer',fontFamily:'inherit'});

  /* ── HEADER ── */
  const Header = () => (
    <div style={{background:BRAND,padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:200}}>
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:38,height:38,borderRadius:10,background:'rgba(255,255,255,0.18)',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid rgba(255,255,255,0.28)',fontSize:16,color:'#fff'}}>✝</div>
        <div>
          <div style={{color:'#fff',fontWeight:800,fontSize:f.md,lineHeight:1.1}}>{t.portal}</div>
          <div style={{color:'rgba(255,255,255,0.75)',fontSize:f.xs,marginTop:1}}>{t.welcome}, {greeting}</div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,0.12)',borderRadius:24,padding:'4px 14px 4px 4px',border:'1px solid rgba(255,255,255,0.2)',cursor:'pointer'}} onClick={()=>{setTab(0);setEditing(true);}}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover'}}/>
            : <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff'}}>{initials}</div>}
          <span style={{color:'rgba(255,255,255,0.9)',fontSize:f.sm,fontWeight:600}}>{profile?.first_name||'—'}</span>
        </div>
        <button onClick={()=>navigate('/portal/settings')} style={btn('rgba(255,255,255,0.12)','#fff','1px solid rgba(255,255,255,0.22)')}>{t.settings}</button>
        <button onClick={async()=>{await logout();navigate('/login');}} style={btn('rgba(255,255,255,0.12)','#fff','1px solid rgba(255,255,255,0.22)')}>{t.logout}</button>
      </div>
    </div>
  );

  /* ── TAB BAR ── */
  const TabBar = () => (
    <div style={{borderBottom:`1px solid ${c.border}`,background:c.surface,display:'flex',padding:'0 24px',overflowX:'auto',position:'sticky',top:62,zIndex:100}}>
      {t.tabs.map((tb,i)=>(
        <button key={i} onClick={()=>setTab(i)} style={{padding:'13px 18px',fontSize:f.base,fontWeight:tab===i?700:500,color:tab===i?c.tabActive:c.t2,background:'none',border:'none',borderBottom:tab===i?`2.5px solid ${c.tabActive}`:'2.5px solid transparent',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'color 0.15s'}}>
          {tb}
        </button>
      ))}
    </div>
  );

  /* ── OVERVIEW ── */
  const OverviewTab = () => (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>

        <div style={{...card,padding:'20px 22px',display:'flex',alignItems:'center',gap:14}}>
          <div style={{position:'relative',flexShrink:0}}>
            <Ring value={attendance?.attendanceRate||0} size={78} stroke={7} color={c.tabActive} bg={c.border}/>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
              <div style={{fontSize:f.sm,fontWeight:800,color:c.t1,lineHeight:1}}>{attendance?.attendanceRate||0}%</div>
            </div>
          </div>
          <div>
            <div style={{fontSize:f.xs,color:c.t3,fontWeight:600,marginBottom:4}}>{t.attendanceRate}</div>
            <div style={{fontSize:f.stat,fontWeight:900,color:c.t1,lineHeight:1,letterSpacing:'-0.5px'}}>{attendance?.attendanceRate||0}%</div>
            <div style={{fontSize:f.xs,color:c.t3,marginTop:4}}>{t.last2mo}</div>
          </div>
        </div>

        <div style={{...card,padding:'20px 22px'}}>
          <div style={{fontSize:f.xs,color:c.t3,fontWeight:600,marginBottom:6}}>{t.totalOfferings}</div>
          <div style={{fontSize:f.stat,fontWeight:900,color:c.t1,letterSpacing:'-0.5px',lineHeight:1.1}}>{finance?PHP(finance.ytdTotal):'—'}</div>
          <div style={{fontSize:f.xs,color:c.t3,marginTop:6}}>{t.thisYear}</div>
        </div>

        <div style={{...card,padding:'20px 22px'}}>
          <div style={{fontSize:f.xs,color:c.t3,fontWeight:600,marginBottom:6}}>{t.memberSince}</div>
          <div style={{fontSize:f.md,fontWeight:800,color:c.t1,lineHeight:1.3}}>{profile?fmtDate(profile.created_at):'—'}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}>
            {profile&&<span style={bdg(c.successL,c.success,`1px solid ${c.successB}`)}>{profile.status}</span>}
            <span style={{fontSize:f.xs,color:c.t3}}>{profile?.member_id_formatted}</span>
          </div>
        </div>
      </div>

      <div style={{...card,padding:'24px 28px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,paddingBottom:14,borderBottom:`1px solid ${c.borderL}`}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            {avatarUrl
              ? <img src={avatarUrl} alt="profile" style={{width:52,height:52,borderRadius:'50%',objectFit:'cover',border:`2px solid ${c.border}`}}/>
              : <div style={{width:52,height:52,borderRadius:'50%',background:BRAND,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:800,color:'#fff'}}>{initials}</div>}
            <div>
              <div style={{fontSize:f.lg,fontWeight:800,color:c.t1}}>{profile?`${profile.first_name} ${profile.last_name}`:'—'}</div>
              <div style={{fontSize:f.sm,color:c.t3,marginTop:2}}>{profile?.cellGroup?.name||'—'} · {profile?.group?.name||'—'}</div>
            </div>
          </div>
          {!editing
            ? <button onClick={startEdit} style={{...btn(c.accentL,c.accentT),border:`1px solid ${c.border}`}}>{t.editProfile}</button>
            : <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setEditing(false)} style={{...btn(c.surfaceAlt,c.t2),border:`1px solid ${c.border}`}}>{t.cancel}</button>
                <button onClick={saveEdit} disabled={editSaving} style={{...btn(BRAND,'#fff'),opacity:editSaving?0.7:1}}>{editSaving?'…':t.save}</button>
              </div>}
        </div>

        {editError && <div style={{background:c.dangerL,color:c.danger,border:`1px solid ${c.dangerB}`,borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:f.sm}}>{editError}</div>}

        {!editing ? (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 40px'}}>
            {[[t.memberId,profile?.member_id_formatted],[t.group,profile?.group?.name],[t.memberName,profile?`${profile.first_name} ${profile.last_name}`:null],[t.contact,profile?.phone],[t.spiritual,fmtDate(profile?.spiritual_birthday)],[t.birthdate,fmtDate(profile?.birthdate)],[t.cellGroup,profile?.cellGroup?.name],[t.joinDate,fmtDate(profile?.join_date)],['Flesh Age', profile?.flesh_age != null ? `${profile.flesh_age} yrs old` : '—'],['Spiritual Age', profile?.spiritual_age != null ? `${profile.spiritual_age} yrs old` : '—']].map(([label,val])=>(
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
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px 20px'}}>
            {[{label:'First Name',key:'first_name'},{label:'Last Name',key:'last_name'},{label:t.contact,key:'phone'},{label:'Email',key:'email',type:'email'},{label:t.birthdate,key:'birthdate',type:'date'},{label:t.spiritual,key:'spiritual_birthday',type:'date'}].map(({label,key,type='text'})=>(
              <div key={key}>
                <label style={{fontSize:f.xs,color:c.t2,fontWeight:600,display:'block',marginBottom:5}}>{label}</label>
                <input type={type} value={editForm[key]||''} onChange={e=>setEditForm({...editForm,[key]:e.target.value})}
                  style={{width:'100%',padding:'9px 12px',fontSize:f.base,border:`1.5px solid ${c.border}`,borderRadius:8,outline:'none',fontFamily:'inherit',color:c.t1,background:c.surfaceAlt}}/>
              </div>
            ))}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:f.xs,color:c.t2,fontWeight:600,display:'block',marginBottom:5}}>{t.address}</label>
              <textarea value={editForm.address||''} onChange={e=>setEditForm({...editForm,address:e.target.value})} rows={3}
                style={{width:'100%',padding:'9px 12px',fontSize:f.base,border:`1.5px solid ${c.border}`,borderRadius:8,outline:'none',fontFamily:'inherit',color:c.t1,background:c.surfaceAlt,resize:'vertical'}}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ── EVENTS TAB — 3 columns ── */
  const EventsTab = () => {
    const myRegs = events.filter(e=>e.is_registered);
    const pending = assigns.filter(a=>!a.confirmed);
    return (
      <div style={{display:'grid',gridTemplateColumns:'270px 1fr 250px',gap:16,alignItems:'start'}}>

        {/* LEFT — Ministry */}
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
                ))
              }
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
                    <span style={bdg(c.successL,c.success,`1px solid ${c.successB}`)}>{t.confirmed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER — Events */}
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
                    <div style={{display:'flex',gap:8}}>
                      {e.is_registered?(
                        <>
                          <button onClick={()=>doCancel(e.id)} disabled={evtL===e.id||!e.can_cancel}
                            style={{padding:'7px 16px',borderRadius:8,fontSize:f.sm,fontWeight:600,cursor:e.can_cancel?'pointer':'not-allowed',background:'none',border:`1.5px solid ${c.danger}`,color:c.danger,fontFamily:'inherit',opacity:!e.can_cancel?0.5:1}}>
                            {evtL===e.id?'…':t.cancelReg}
                          </button>
                          <button style={{padding:'7px 16px',borderRadius:8,fontSize:f.sm,fontWeight:600,background:c.surfaceAlt,border:`1px solid ${c.border}`,color:c.t2,cursor:'default',fontFamily:'inherit'}}>{t.viewDetails}</button>
                        </>
                      ):(
                        <button onClick={()=>doRegister(e.id)} disabled={evtL===e.id||!e.can_register}
                          style={{padding:'8px 20px',borderRadius:8,fontSize:f.sm,fontWeight:700,cursor:e.can_register?'pointer':'not-allowed',background:e.can_register?c.t1:c.surfaceAlt,color:e.can_register?'#fff':c.t3,border:'none',fontFamily:'inherit'}}>
                          {evtL===e.id?'…':e.deadline_passed?t.closedReg:t.registerNow}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{width:78,height:78,borderRadius:10,background:c.surfaceAlt,border:`1px solid ${c.border}`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:c.t3,fontSize:f.xs,textAlign:'center'}}>Poster</div>
                </div>
              </div>
            ))
          }
        </div>

        {/* RIGHT — Services */}
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'13px 16px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.base,fontWeight:700,color:c.t1}}>{t.services}</div>
          <div style={{maxHeight:500,overflowY:'auto'}}>
            {services.length===0
              ? <div style={{padding:'24px',textAlign:'center',color:c.t3,fontSize:f.sm}}>{t.noServices}</div>
              : services.map((s,i)=>(
                <div key={s.id} style={{padding:'12px 16px',borderBottom:i<services.length-1?`1px solid ${c.borderL}`:'none'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6,marginBottom:4}}>
                    <div style={{fontSize:f.sm,fontWeight:700,color:c.t1,flex:1}}>{s.title}</div>
                    <span style={{...bdg(c.accentL,c.accentT,`1px solid ${c.border}`),whiteSpace:'nowrap',flexShrink:0}}>{s.status}</span>
                  </div>
                  <div style={{fontSize:f.xs,color:c.t3}}>📅 {fmtShort(s.service_date)}</div>
                  {s.service_time&&<div style={{fontSize:f.xs,color:c.t3}}>🕐 {fmtSvcT(s.service_time)}</div>}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  };

  /* ── ATTENDANCE TAB ── */
  const AttendanceTab = () => {
    const rate = attendance?.attendanceRate||0;
    const rateColor = rate>=80?c.success:rate>=50?c.amber:c.danger;
    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:16,alignItems:'start'}}>
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.lg,fontWeight:700,color:c.t1}}>{t.attendanceHistory}</div>
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
        </div>

        <div style={{...card,padding:'28px 22px',textAlign:'center'}}>
          <div style={{fontSize:f.sm,color:c.t3,fontWeight:600,marginBottom:18}}>{t.attendanceRate}</div>
          <div style={{display:'flex',justifyContent:'center',position:'relative',marginBottom:14}}>
            <Ring value={rate} size={100} stroke={9} color={rateColor} bg={c.border}/>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>
              <div style={{fontSize:f.lg,fontWeight:900,color:c.t1,lineHeight:1}}>{rate}%</div>
            </div>
          </div>
          <div style={{fontSize:f.md,fontWeight:700,color:rateColor,marginBottom:6}}>
            {rate>=80?t.excellent:rate>=50?t.good:t.improve}
          </div>
          <div style={{fontSize:f.xs,color:c.t3}}>{attendance?.attended||0} {t.of} {attendance?.totalServices||0} services</div>
          <div style={{fontSize:f.xs,color:c.t3,marginTop:2}}>{t.last2mo}</div>
        </div>
      </div>
    );
  };

  /* ── FINANCE TAB ── */
  const FinanceTab = () => (
    <div style={{...card,overflow:'hidden'}}>
      <div style={{padding:'16px 22px',borderBottom:`1px solid ${c.borderL}`,fontSize:f.lg,fontWeight:700,color:c.t1}}>{t.offeringsHistory}</div>
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
      {finance&&(
        <div style={{padding:'16px 20px',borderTop:`2px solid ${c.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:c.surfaceAlt}}>
          <span style={{fontSize:f.base,fontWeight:700,color:c.t2}}>{t.totalYtd}</span>
          <span style={{fontSize:f.stat,fontWeight:900,color:c.t1}}>{PHP(finance.ytdTotal)}</span>
        </div>
      )}
      <div style={{padding:'14px 20px',borderTop:`1px solid ${c.borderL}`,background:c.surfaceAlt,textAlign:'center',fontStyle:'italic',fontSize:f.sm,color:c.t3}}>{t.verse}</div>
    </div>
  );

  /* ── LOADING SKELETON ── */
  const LoadSkeleton = () => (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        {[1,2,3].map(i=><div key={i} style={{...card,padding:'20px'}}><Skel w="50%" h={11}/><Skel w="70%" h={28} mt={10}/></div>)}
      </div>
      <div style={{...card,padding:'24px'}}>
        {[1,2,3,4,5].map(i=><div key={i} style={{marginBottom:12}}><Skel w="30%" h={10}/><Skel w="55%" h={14} mt={5}/></div>)}
      </div>
    </div>
  );

  /* ── TOAST ── */
  const Toast = () => toast ? (
    <div style={{position:'fixed',bottom:28,right:28,background:toast.type==='success'?c.success:c.danger,color:'#fff',padding:'12px 20px',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.2)',zIndex:9999,display:'flex',alignItems:'center',gap:10,fontSize:f.base,fontWeight:500,animation:'slideUp 0.3s ease',maxWidth:360}}>
      <span style={{fontSize:15}}>{toast.type==='success'?'✓':'✕'}</span>{toast.msg}
    </div>
  ) : null;

  return (
    <div style={{minHeight:'100vh',background:c.bg,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        @keyframes shimmer{0%{background-position:400% 0}100%{background-position:-400% 0}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${c.border};border-radius:10px}
      `}</style>
      <Header/>
      <TabBar/>
      <div style={{maxWidth:1240,margin:'0 auto',padding:'24px 20px'}}>
        {loading ? <LoadSkeleton/> : (
          <>
            {tab===0&&<OverviewTab/>}
            {tab===1&&<EventsTab/>}
            {tab===2&&<AttendanceTab/>}
            {tab===3&&<FinanceTab/>}
          </>
        )}
      </div>
      <Toast/>
    </div>
  );
}
