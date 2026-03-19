import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const BRAND = 'linear-gradient(135deg,#003d70,#005599,#13B5EA)';
const PHP   = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' }) : '—';

const CATEGORY_STYLES = {
  Tithe:           { bg:'#fefce8', color:'#854d0e', border:'1px solid #fef08a' },
  Offering:        { bg:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe' },
  'Special Offering':{ bg:'transparent', color:'#374151', border:'1px solid #d1d5db' },
};
const catStyle = (name) => CATEGORY_STYLES[name] || { bg:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0' };

/* ── Tabs ────────────────────────────────────────────────────── */
const TABS = ['Overview','Events','My Attendance','My Tithes and Offerings'];

/* ── Stat Card ───────────────────────────────────────────────── */
function StatCard({ label, value, sub }) {
  return (
    <div style={{ flex:1, border:'1px solid #e2e8f0', borderRadius:10, padding:'18px 22px', background:'#fff', minWidth:0 }}>
      <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

/* ── Profile Field ───────────────────────────────────────────── */
function ProfileField({ label, value }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:15, color:'#0f172a', fontWeight:500 }}>{value || '—'}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function MemberPortal() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [tab, setTab]    = useState('Overview');

  // Data
  const [profile,    setProfile]    = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [finance,    setFinance]    = useState(null);
  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Profile edit
  const [editing,   setEditing]   = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [editSaving,setEditSaving]= useState(false);
  const [editError, setEditError] = useState('');

  // Event actions
  const [evtLoading, setEvtLoading] = useState(null);
  const [evtMsg,     setEvtMsg]     = useState('');

  const firstName = user?.email?.split('@')[0] || 'Friend';
  const greeting  = profile
    ? `${profile.gender === 'Female' ? 'Sister' : 'Brother'} ${profile.first_name}`
    : firstName;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [pRes, aRes, fRes, eRes] = await Promise.all([
        axiosInstance.get('/member-portal/profile'),
        axiosInstance.get('/member-portal/attendance'),
        axiosInstance.get('/member-portal/finance'),
        axiosInstance.get('/member-portal/events'),
      ]);
      setProfile(pRes.data.data);
      setAttendance(aRes.data.data);
      setFinance(fRes.data.data);
      setEvents(eRes.data.data);
    } catch { setError('Failed to load your portal data. Please refresh.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    setEditForm({
      first_name:         profile?.first_name         || '',
      last_name:          profile?.last_name          || '',
      phone:              profile?.phone              || '',
      email:              profile?.email              || '',
      birthdate:          profile?.birthdate          || '',
      spiritual_birthday: profile?.spiritual_birthday || '',
      address:            profile?.address            || '',
    });
    setEditError('');
    setEditing(true);
  };

  const saveEdit = async () => {
    setEditSaving(true); setEditError('');
    try {
      const res = await axiosInstance.put('/member-portal/profile', editForm);
      setProfile(res.data.data);
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to save.');
    } finally { setEditSaving(false); }
  };

  const handleRegister = async (eventId) => {
    setEvtLoading(eventId); setEvtMsg('');
    try {
      await axiosInstance.post(`/member-portal/events/${eventId}/register`);
      setEvtMsg('Registered successfully!');
      const res = await axiosInstance.get('/member-portal/events');
      setEvents(res.data.data);
    } catch (err) {
      setEvtMsg(err.response?.data?.message || 'Registration failed.');
    } finally { setEvtLoading(null); }
  };

  const handleCancel = async (eventId) => {
    if (!window.confirm('Cancel your registration for this event?')) return;
    setEvtLoading(eventId); setEvtMsg('');
    try {
      await axiosInstance.delete(`/member-portal/events/${eventId}/register`);
      setEvtMsg('Registration cancelled.');
      const res = await axiosInstance.get('/member-portal/events');
      setEvents(res.data.data);
    } catch (err) {
      setEvtMsg(err.response?.data?.message || 'Cancellation failed.');
    } finally { setEvtLoading(null); }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  /* ── Header ──────────────────────────────────────────────── */
  const Header = () => (
    <div style={{ background:BRAND, padding:'14px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:40, height:40, borderRadius:8, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'#fff', fontWeight:900, fontSize:14 }}>P</span>
        </div>
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:16, lineHeight:1 }}>Member Portal</div>
          <div style={{ color:'rgba(255,255,255,0.8)', fontSize:12, marginTop:2 }}>Welcome {greeting}</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate('/portal/settings')}
          style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          Settings
        </button>
        <button onClick={handleLogout}
          style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          Logout
        </button>
      </div>
    </div>
  );

  /* ── Tab Bar ─────────────────────────────────────────────── */
  const TabBar = () => (
    <div style={{ borderBottom:'1px solid #e2e8f0', background:'#fff', display:'flex', gap:0, padding:'0 28px', overflowX:'auto' }}>
      {TABS.map(t => (
        <button key={t} onClick={() => setTab(t)}
          style={{ padding:'14px 20px', fontSize:14, fontWeight: tab===t ? 700 : 500, color: tab===t ? '#005599' : '#64748b', background:'none', border:'none', borderBottom: tab===t ? '2.5px solid #005599' : '2.5px solid transparent', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'color 0.15s' }}>
          {t}
        </button>
      ))}
    </div>
  );

  /* ── Overview Tab ────────────────────────────────────────── */
  const OverviewTab = () => (
    <div>
      {/* Stat Cards */}
      <div style={{ display:'flex', gap:14, marginBottom:24, flexWrap:'wrap' }}>
        <StatCard
          label="Attendance Rate"
          value={`${attendance?.attendanceRate ?? '—'}%`}
          sub="Last 2 months"
        />
        <StatCard
          label="Total Tithes and Offerings"
          value={finance ? PHP(finance.ytdTotal) : '—'}
          sub="This year"
        />
        <StatCard
          label="Member Since"
          value={profile ? fmtDate(profile.created_at) : '—'}
          sub="Join date"
        />
      </div>

      {/* My Profile card */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:'24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1f5f9' }}>
          <div style={{ fontSize:17, fontWeight:700, color:'#0f172a' }}>My Profile</div>
          {!editing ? (
            <button onClick={startEdit}
              style={{ background:'#eff6ff', color:'#005599', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Edit Profile
            </button>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setEditing(false)} style={{ background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={saveEdit} disabled={editSaving} style={{ background:BRAND, color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {editError && <div style={{ background:'#fef2f2', color:'#dc2626', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>{editError}</div>}

        {!editing ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 40px' }}>
            <ProfileField label="Member ID"        value={profile?.member_id_formatted} />
            <ProfileField label="Group"            value={profile?.group?.name} />
            <ProfileField label="Member Name"      value={profile ? `${profile.first_name} ${profile.last_name}` : null} />
            <ProfileField label="Contact No"       value={profile?.phone} />
            <ProfileField label="Spiritual Birthday" value={fmtDate(profile?.spiritual_birthday)} />
            <ProfileField label="Flesh Birthday"   value={fmtDate(profile?.birthdate)} />
            <ProfileField label="Cell Group"       value={profile?.cellGroup?.name} />
            <div />
            <div style={{ gridColumn:'1 / -1' }}><ProfileField label="Address" value={profile?.address} /></div>
            <ProfileField label="Join Date"        value={fmtDate(profile?.created_at)} />
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div>
                <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Status</div>
                <span style={{ padding:'4px 14px', borderRadius:20, fontSize:13, fontWeight:700, background: profile?.status==='Active' ? '#dcfce7' : '#f3f4f6', color: profile?.status==='Active' ? '#16a34a' : '#6b7280', border: profile?.status==='Active' ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
                  {profile?.status || '—'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 24px' }}>
            {[
              { label:'First Name',         key:'first_name' },
              { label:'Last Name',          key:'last_name' },
              { label:'Phone',              key:'phone' },
              { label:'Email',              key:'email',      type:'email' },
              { label:'Birthdate',          key:'birthdate',  type:'date' },
              { label:'Spiritual Birthday', key:'spiritual_birthday', type:'date' },
            ].map(({ label, key, type='text' }) => (
              <div key={key}>
                <label style={{ fontSize:12, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>{label}</label>
                <input type={type} value={editForm[key] || ''} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', fontSize:14, border:'1.5px solid #e2e8f0', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#0f172a' }} />
              </div>
            ))}
            <div style={{ gridColumn:'1 / -1' }}>
              <label style={{ fontSize:12, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>Address</label>
              <textarea value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                rows={3} style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', fontSize:14, border:'1.5px solid #e2e8f0', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#0f172a', resize:'vertical' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ── Events Tab ──────────────────────────────────────────── */
  const EventsTab = () => {
    const myRegistrations = events.filter(e => e.is_registered);
    return (
      <div>
        {evtMsg && (
          <div style={{ padding:'10px 16px', borderRadius:8, marginBottom:16, fontSize:13, background: evtMsg.includes('success') || evtMsg.includes('cancel') ? '#f0fdf4' : '#fef2f2', color: evtMsg.includes('success') || evtMsg.includes('cancel') ? '#16a34a' : '#dc2626', border: `1px solid ${evtMsg.includes('success') || evtMsg.includes('cancel') ? '#bbf7d0' : '#fecaca'}` }}>
            {evtMsg}
          </div>
        )}

        {/* All published events */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:28 }}>
          {events.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8', background:'#fff', borderRadius:12, border:'1px solid #e2e8f0' }}>No upcoming events at this time.</div>
          )}
          {events.map(e => (
            <div key={e.id} style={{ background:'#fff', borderRadius:12, border: `1.5px solid ${e.is_registered ? '#86efac' : '#e2e8f0'}`, padding:'20px 24px', display:'flex', gap:20, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.3px' }}>{e.title}</div>
                {e.description && <div style={{ fontSize:13, color:'#64748b', marginBottom:10 }}>{e.description}</div>}
                <div style={{ fontSize:13, color:'#475569', display:'flex', flexDirection:'column', gap:3, marginBottom:14 }}>
                  <span>📅 {fmtDate(e.start_date)}{e.end_date && e.end_date !== e.start_date ? ` – ${fmtDate(e.end_date)}` : ''}</span>
                  {e.location && <span>📍 {e.location}</span>}
                  {e.registration_deadline && <span>🕐 Registration Deadline: {fmtDate(e.registration_deadline)}</span>}
                  <span>👥 {e.registration_count} registered{e.capacity ? ` of ${e.capacity}` : ''}</span>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {e.is_registered ? (
                    <>
                      <button onClick={() => handleCancel(e.id)} disabled={evtLoading===e.id || !e.can_cancel}
                        style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor: e.can_cancel ? 'pointer' : 'not-allowed', background:'none', border:'1.5px solid #ef4444', color:'#ef4444', fontFamily:'inherit', opacity: !e.can_cancel ? 0.5 : 1 }}>
                        {evtLoading===e.id ? '…' : 'Cancel Registration'}
                      </button>
                      <button style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:600, background:'#f1f5f9', border:'1.5px solid #e2e8f0', color:'#475569', cursor:'default', fontFamily:'inherit' }}>
                        View Registration Details
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleRegister(e.id)} disabled={evtLoading===e.id || !e.can_register}
                      style={{ padding:'9px 22px', borderRadius:8, fontSize:13, fontWeight:700, cursor: e.can_register ? 'pointer' : 'not-allowed', background: e.can_register ? '#0f172a' : '#e2e8f0', color: e.can_register ? '#fff' : '#94a3b8', border:'none', fontFamily:'inherit' }}>
                      {evtLoading===e.id ? '…' : e.deadline_passed ? 'Registration Closed' : 'Register Now'}
                    </button>
                  )}
                </div>
              </div>
              {/* Poster placeholder */}
              <div style={{ width:90, height:90, borderRadius:10, background:'#f1f5f9', border:'1px solid #e2e8f0', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:11, textAlign:'center', padding:8 }}>
                Poster
              </div>
            </div>
          ))}
        </div>

        {/* My Registrations */}
        {myRegistrations.length > 0 && (
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:'20px 24px' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:14, paddingBottom:12, borderBottom:'1px solid #f1f5f9' }}>My Registrations</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {myRegistrations.map(e => (
                <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #f8fafc' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>{e.title}</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                      {fmtDate(e.start_date)}{e.location ? ` | ${e.location}` : ''}
                    </div>
                  </div>
                  <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0' }}>Confirmed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── Attendance Tab ──────────────────────────────────────── */
  const AttendanceTab = () => (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
      <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>My Attendance History</div>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['Date','Service','Check-in Time','Status'].map(h => (
                <th key={h} style={{ padding:'11px 20px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!attendance?.records || attendance.records.length === 0) ? (
              <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>No attendance records found.</td></tr>
            ) : attendance.records.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc', borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'13px 20px', fontSize:14, color:'#374151' }}>{fmtDate(r.date)}</td>
                <td style={{ padding:'13px 20px', fontSize:14, color:'#374151' }}>{r.service_title}</td>
                <td style={{ padding:'13px 20px', fontSize:14, color:'#374151' }}>{r.check_in_time ? fmtTime(r.check_in_time) : '—'}</td>
                <td style={{ padding:'13px 20px' }}>
                  <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, background: r.status==='Present' ? '#dcfce7' : '#fef2f2', color: r.status==='Present' ? '#16a34a' : '#dc2626', border: `1px solid ${r.status==='Present' ? '#bbf7d0' : '#fecaca'}` }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ── Finance Tab ─────────────────────────────────────────── */
  const FinanceTab = () => (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
      <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>My Tithes and Offering History</div>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['Date','Type','Amount'].map(h => (
                <th key={h} style={{ padding:'11px 20px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!finance?.records || finance.records.length === 0) ? (
              <tr><td colSpan={3} style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>No giving records found.</td></tr>
            ) : finance.records.map((r, i) => {
              const cs = catStyle(r.category?.name);
              return (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc', borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'13px 20px', fontSize:14, color:'#374151' }}>{fmtDate(r.transaction_date)}</td>
                  <td style={{ padding:'13px 20px' }}>
                    <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:cs.bg, color:cs.color, border:cs.border }}>
                      {r.category?.name || 'Offering'}
                    </span>
                  </td>
                  <td style={{ padding:'13px 20px', fontSize:14, color:'#0f172a', fontWeight:500 }}>{PHP(r.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {finance && (
        <div style={{ padding:'16px 20px', borderTop:'2px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fafbfc' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#374151' }}>Total Year-to-Date Tithes and Offerings</span>
          <span style={{ fontSize:22, fontWeight:900, color:'#0f172a' }}>{PHP(finance.ytdTotal)}</span>
        </div>
      )}
      <div style={{ padding:'14px 20px', background:'#fafbfc', borderTop:'1px solid #f1f5f9', textAlign:'center', fontStyle:'italic', fontSize:13, color:'#94a3b8' }}>
        "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver." — 2 Corinthians 9:7
      </div>
    </div>
  );

  /* ── Render ──────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ textAlign:'center', color:'#94a3b8' }}>
        <div style={{ fontSize:32, marginBottom:10 }}>✝</div>
        <div>Loading your portal…</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'Segoe UI',sans-serif" }}>
      <Header />
      <TabBar />
      <div style={{ maxWidth:980, margin:'0 auto', padding:'28px 24px' }}>
        {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:14 }}>{error}</div>}
        {tab === 'Overview'                 && <OverviewTab />}
        {tab === 'Events'                   && <EventsTab />}
        {tab === 'My Attendance'            && <AttendanceTab />}
        {tab === 'My Tithes and Offerings'  && <FinanceTab />}
      </div>
    </div>
  );
}
