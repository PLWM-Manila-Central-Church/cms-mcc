import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosInstance';
import useIsMobile from '../../hooks/useIsMobile';

const R = { ADMIN:'System Admin', PASTOR:'Pastor', REG:'Registration Team', FINANCE:'Finance Team', CG:'Cell Group Leader', GRP:'Group Leader', MEMBER:'Member' };

const ROLE_ACCENT = {
  [R.ADMIN]:   { primary:'#dc2626', light:'#fef2f2' },
  [R.PASTOR]:  { primary:'#7c3aed', light:'#f5f3ff' },
  [R.REG]:     { primary:'#005599', light:'#e8f4fd' },
  [R.FINANCE]: { primary:'#059669', light:'#f0fdf4' },
  [R.CG]:      { primary:'#d97706', light:'#fffbeb' },
  [R.GRP]:     { primary:'#0891b2', light:'#ecfeff' },
  [R.MEMBER]:  { primary:'#64748b', light:'#f8fafc' },
};

const fmtMoney = (n) => { const v=Number(n||0); if(v>=1e9) return `₱${(v/1e9).toFixed(1).replace(/\.0$/,'')}B`; if(v>=1e6) return `₱${(v/1e6).toFixed(1).replace(/\.0$/,'')}M`; if(v>=1e3) return `₱${(v/1e3).toFixed(1).replace(/\.0$/,'')}K`; return `₱${v.toLocaleString('en-PH')}`; };
const fmtMoneyFull = (n) => `₱${Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—';

// CHANGE 4: Time-aware greeting function
const greeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
};

function StatCard({ icon, label, value, sub, accent, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:'#fff', border:`1.5px solid ${hov?accent:'#e8edf2'}`, borderRadius:14, padding:'18px 16px', cursor:'pointer', transition:'all 0.18s', boxShadow:hov?`0 4px 20px ${accent}28`:'0 1px 4px rgba(0,0,0,0.05)', transform:hov?'translateY(-2px)':'none', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, width:3, height:'100%', background:accent, borderRadius:'14px 0 0 14px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <span style={{ fontSize:22, lineHeight:1 }}>{icon}</span>
        <span style={{ fontSize:24, fontWeight:800, color:accent, lineHeight:1, letterSpacing:'-0.5px' }}>{value}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:12, color:'#94a3b8', fontWeight:500 }}>{sub}</div>
    </div>
  );
}

/* Mobile stat card — bigger, full-width feel */
function MobileStatCard({ icon, label, value, sub, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ background:'#fff', borderRadius:14, border:`1.5px solid #e8edf2`, padding:'16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', active:{background:'#f8fafc'} }}>
      <div style={{ width:48, height:48, borderRadius:12, background:`${accent}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:22, fontWeight:800, color:accent, lineHeight:1, letterSpacing:'-0.5px' }}>{value}</div>
        <div style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginTop:2 }}>{label}</div>
        <div style={{ fontSize:12, color:'#94a3b8', marginTop:1 }}>{sub}</div>
      </div>
      <span style={{ fontSize:18, color:'#cbd5e1' }}>›</span>
    </div>
  );
}

function SectionCard({ title, icon, actionLabel, onAction, children }) {
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e8edf2', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #f1f5f9' }}>
        <span style={{ fontSize:14, fontWeight:700, color:'#1e293b', display:'flex', alignItems:'center', gap:7 }}><span>{icon}</span>{title}</span>
        {actionLabel && <button onClick={onAction} style={{ background:'none', border:'none', fontSize:12, fontWeight:700, color:'#005599', cursor:'pointer', padding:'3px 8px', borderRadius:6, fontFamily:'inherit' }}>{actionLabel} →</button>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ListRow({ left, right, sub, onClick, rightColor }) {
  const [hov,setHov]=useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 18px', borderBottom:'1px solid #f8fafc', cursor:onClick?'pointer':'default', background:hov&&onClick?'#f8fafc':'#fff', transition:'background 0.12s', gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{left}</div>
        {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize:13, fontWeight:700, color:rightColor||'#374151', flexShrink:0 }}>{right}</div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return <div style={{ padding:'32px', textAlign:'center', color:'#94a3b8' }}><div style={{ fontSize:28, marginBottom:8 }}>{icon}</div><div style={{ fontSize:13, fontWeight:500 }}>{text}</div></div>;
}

function ActionBadge({ action }) {
  const BADGE = { LOGIN:['#d1fae5','#065f46'],LOGOUT:['#f3f4f6','#374151'],CREATE_MEMBER:['#dbeafe','#1e40af'],UPDATE_MEMBER:['#ede9fe','#5b21b6'],DELETE_MEMBER:['#fee2e2','#991b1b'],CREATE_USER:['#dbeafe','#1e40af'],UPDATE_USER:['#ede9fe','#5b21b6'],DEACTIVATE_USER:['#fee2e2','#991b1b'],ACTIVATE_USER:['#d1fae5','#065f46'],CREATE_FINANCE_RECORD:['#d1fae5','#065f46'],UPDATE_FINANCE_RECORD:['#ede9fe','#5b21b6'],DELETE_FINANCE_RECORD:['#fee2e2','#991b1b'],UPLOAD_ARCHIVE:['#fef3c7','#92400e'],APPROVE_ARCHIVE:['#d1fae5','#065f46'],CHECK_IN:['#dbeafe','#1e40af'],REGISTER_EVENT:['#d1fae5','#065f46'],UNREGISTER_EVENT:['#fee2e2','#991b1b'],INVENTORY_REQUEST_APPROVED:['#d1fae5','#065f46'],INVENTORY_REQUEST_REJECTED:['#fee2e2','#991b1b'],CREATE_EVENT:['#dbeafe','#1e40af'],UPDATE_EVENT_STATUS:['#ede9fe','#5b21b6'],RESET_PASSWORD:['#fef3c7','#92400e'],CHANGE_PASSWORD:['#fef3c7','#92400e'],UPDATE_SETTINGS:['#f0fdf4','#166534'] };
  const [bg,color] = BADGE[action]||['#f3f4f6','#374151'];
  return <span style={{ background:bg, color, padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>{action.replace(/_/g,' ')}</span>;
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const role    = user?.roleName || '';
  const isMinistryLeader = role === 'Ministry Leader' && !!user?.leadsMinistryId;
  const accent  = (ROLE_ACCENT[role]||ROLE_ACCENT[R.MEMBER]).primary;
  const acLight = (ROLE_ACCENT[role]||ROLE_ACCENT[R.MEMBER]).light;

  const canFinance   = hasPermission('finance','read');
  const canInventory = hasPermission('inventory','read');
  const canMembers   = hasPermission('members','read');
  const canEvents    = hasPermission('events','read');
  const canServices  = hasPermission('services','read') && !isMinistryLeader;
  const isMember     = role === R.MEMBER;

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:14 }}>
      <div style={{ width:36, height:36, border:`3px solid ${acLight}`, borderTop:`3px solid ${accent}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <span style={{ color:'#94a3b8', fontSize:14 }}>Loading your dashboard...</span>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:10 }}>
      <span style={{ fontSize:32 }}>⚠️</span>
      <span style={{ color:'#dc2626', fontSize:15, fontWeight:600 }}>{error}</span>
    </div>
  );

  const { members, finance, services, events, inventory, recentActivity } = stats;

  const statCards = [];
  if (canMembers && !isMinistryLeader) {
    statCards.push({ icon:'👥', label:'Total Members', value:members.total, sub:`+${members.newThisMonth} this month`, accent, path:'/members' });
    if (role!==R.FINANCE && role!==R.MEMBER)
      statCards.push({ icon:'✅', label:'Active Members', value:members.active, sub:`of ${members.total} total`, accent:'#059669', path:'/members' });
  }
  if (canFinance && !isMember) statCards.push({ icon:'💰', label:'Finance (Month)', value:fmtMoney(finance.totalThisMonth), sub:'Total collections this month', accent:'#059669', path:'/finance' });
  if (isMember) statCards.push({ icon:'💰', label:'My Giving (Month)', value:fmtMoney(finance.totalThisMonth), sub:'Your contributions', accent:'#059669', path:'/finance/my-giving' });
  if (canEvents) statCards.push({ icon:'📅', label:'Upcoming Events', value:events.upcoming.length, sub:`${events.total} total`, accent:'#7c3aed', path:'/events' });
  if (canInventory) statCards.push({ icon:'📦', label:'Inventory Items', value:inventory.totalItems, sub:`${inventory.pendingRequests} pending`, accent:'#0891b2', path:'/inventory' });
  if (canServices) statCards.push({ icon:'⛪', label:'Upcoming Services', value:services.upcoming, sub:`${services.total} total`, accent:'#be185d', path:'/services' });

  const dateStr     = new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const displayName = user?.email?.split('@')[0] || 'there';
  const roleIcon    = { [R.ADMIN]:'🛡️', [R.PASTOR]:'✝️', [R.REG]:'📋', [R.FINANCE]:'💼', [R.CG]:'🏘️', [R.GRP]:'👫' }[role] || '👤';

  // ── Mobile layout ─────────────────────────────────────────
  if (isMobile) return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Mobile greeting card */}
      <div style={{ background:`linear-gradient(135deg,${accent}20,#f8fafc)`, borderRadius:16, padding:'18px 16px', marginBottom:16, border:`1.5px solid ${accent}25` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <span style={{ fontSize:24 }}>{roleIcon}</span>
          <div>
            {/* CHANGE 5: Removed emoji after username */}
            <div style={{ fontSize:17, fontWeight:800, color:accent }}>{greeting()}, {displayName}</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{dateStr}</div>
          </div>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:`${accent}15`, borderRadius:20, padding:'4px 12px', marginTop:6 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:accent, display:'inline-block' }} />
          {/* CHANGE 6: Replace "REGISTRATION TEAM" with "Ministry Leader" for ministry leaders */}
          <span style={{ fontSize:12, color:accent, fontWeight:700 }}>{isMinistryLeader ? 'Ministry Leader' : role}</span>
        </div>
      </div>

      {/* Mobile stat cards */}
      {statCards.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {statCards.map(card => (
            <MobileStatCard key={card.label} {...card} onClick={() => navigate(card.path)} />
          ))}
        </div>
      )}

      {/* Upcoming events */}
      {canEvents && (
        <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
          {events.upcoming.length===0 ? <EmptyState icon="📭" text="No upcoming events" /> :
            events.upcoming.slice(0,4).map(ev => (
              <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)+(ev.location?` · ${ev.location}`:'')} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />
            ))
          }
        </SectionCard>
      )}

      {canFinance && !isMember && (
        <div style={{ marginTop:12 }}>
          <SectionCard title="Recent Transactions" icon="💰" actionLabel="View all" onAction={() => navigate('/finance')}>
            {finance.recentRecords.length===0 ? <EmptyState icon="📭" text="No transactions yet" /> :
              finance.recentRecords.slice(0,5).map(r => (
                <ListRow key={r.id} left={r.Member?`${r.Member.first_name} ${r.Member.last_name}`:'—'} sub={`${r.category?.name||'—'} · ${fmtDate(r.transaction_date)}`} right={fmtMoneyFull(r.amount)} rightColor="#059669" />
              ))
            }
          </SectionCard>
        </div>
      )}

      {isMember && (
        <div style={{ marginTop:12 }}>
          <SectionCard title="My Recent Giving" icon="💰" actionLabel="View all" onAction={() => navigate('/finance/my-giving')}>
            {finance.recentRecords.length===0 ? <EmptyState icon="📭" text="No giving records yet" /> :
              finance.recentRecords.slice(0,5).map(r => (
                <ListRow key={r.id} left={r.category?.name||'—'} sub={fmtDate(r.transaction_date)} right={fmtMoneyFull(r.amount)} rightColor="#059669" />
              ))
            }
          </SectionCard>
        </div>
      )}

      {inventory.lowStock > 0 && (
        <div onClick={() => navigate('/inventory')} style={{ background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:12, padding:'13px 16px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginTop:12 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <span style={{ fontSize:13, color:'#92400e', fontWeight:600, flex:1 }}>{inventory.lowStock} item{inventory.lowStock>1?'s':''} at low stock</span>
          <span style={{ fontSize:13, color:'#d97706', fontWeight:700 }}>View →</span>
        </div>
      )}
    </div>
  );

  // ── Desktop layout ────────────────────────────────────────
  return (
    <div style={{ maxWidth:1280, fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Hero header */}
      <div style={{ background:`linear-gradient(135deg,${accent}18,#f8fafc)`, borderBottom:`2px solid ${accent}22`, padding:'24px 28px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <span style={{ fontSize:26 }}>{roleIcon}</span>
            {/* CHANGE 5: Removed emoji after username */}
            <h1 style={{ fontSize:22, fontWeight:800, color:accent, margin:0, letterSpacing:'-0.3px' }}>{greeting()}, {displayName}</h1>
          </div>
          <p style={{ fontSize:13, color:'#64748b', margin:'4px 0 0' }}>Here's what's happening at PLWM-MCC today.</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
          <span style={{ fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:20, background:`${accent}15`, color:accent, border:`1px solid ${accent}30` }}>{dateStr}</span>
          {/* CHANGE 6: Replace "REGISTRATION TEAM" with "Ministry Leader" for ministry leaders */}
          <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600, letterSpacing:'0.5px', textTransform:'uppercase' }}>{isMinistryLeader ? 'Ministry Leader' : role}</span>
        </div>
      </div>

      {/* CHANGE 7: Wider stat cards grid */}
      {statCards.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:24 }}>
          {statCards.map(card => <StatCard key={card.label} {...card} onClick={() => navigate(card.path)} />)}
        </div>
      )}

      {/* CHANGE 7: Full-width role-specific sections with better layout */}
      {/* Role-specific sections */}
      {(role===R.ADMIN||role===R.PASTOR) && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:16, marginBottom:16 }}>
            <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
              {events.upcoming.length===0 ? <EmptyState icon="📭" text="No upcoming events" /> : events.upcoming.map(ev => <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)+(ev.location?` · ${ev.location}`:'')} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />)}
            </SectionCard>
            <SectionCard title="Recent Transactions" icon="💰" actionLabel="View all" onAction={() => navigate('/finance')}>
              {finance.recentRecords.length===0 ? <EmptyState icon="📭" text="No transactions yet" /> : finance.recentRecords.map(r => <ListRow key={r.id} left={r.Member?`${r.Member.first_name} ${r.Member.last_name}`:'—'} sub={`${r.category?.name||'—'} · ${fmtDate(r.transaction_date)}`} right={fmtMoneyFull(r.amount)} rightColor="#059669" />)}
            </SectionCard>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: role===R.ADMIN ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap:16 }}>
            <SectionCard title="Recent Activity" icon="📋" actionLabel="View all" onAction={() => navigate('/audit-logs')}>
              {recentActivity.length===0 ? <EmptyState icon="📭" text="No activity yet" /> : recentActivity.map(log => (
                <div key={log.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 18px', borderBottom:'1px solid #f8fafc', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.User?.email||`User #${log.user_id}`}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{new Date(log.created_at).toLocaleString('en-PH')}</div>
                  </div>
                  <ActionBadge action={log.action} />
                </div>
              ))}
            </SectionCard>
            {role===R.ADMIN && (
              <SectionCard title="Services Overview" icon="⛪" actionLabel="View all" onAction={() => navigate('/services')}>
                <ListRow left="Total services" right={services.total} rightColor="#be185d" />
                <ListRow left="Upcoming" right={services.upcoming} rightColor="#be185d" />
                <ListRow left="Inventory items" right={inventory.totalItems} rightColor="#0891b2" onClick={() => navigate('/inventory')} />
                <ListRow left="Pending requests" right={inventory.pendingRequests} rightColor={inventory.pendingRequests>0?'#d97706':'#94a3b8'} onClick={() => navigate('/inventory')} />
                <ListRow left="Total members" right={members.total} rightColor="#005599" onClick={() => navigate('/members')} />
                <ListRow left="Active members" right={members.active} rightColor="#059669" onClick={() => navigate('/members')} />
              </SectionCard>
            )}
          </div>
          {inventory.lowStock>0 && (
            <div onClick={() => navigate('/inventory')} style={{ background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:12, padding:'13px 18px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', transition:'all 0.15s', marginTop:20 }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <span style={{ fontSize:13, color:'#92400e', fontWeight:600, flex:1 }}>{inventory.lowStock} inventory item{inventory.lowStock>1?'s are':' is'} at or below minimum stock.</span>
              <span style={{ fontSize:12, color:'#d97706', fontWeight:700 }}>View →</span>
            </div>
          )}
        </>
      )}

      {role===R.REG && !isMinistryLeader && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:16 }}>
          <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
            {events.upcoming.length===0 ? <EmptyState icon="📭" text="No upcoming events" /> : events.upcoming.map(ev => <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />)}
          </SectionCard>
          <SectionCard title="Services & Members" icon="⛪" actionLabel="View services" onAction={() => navigate('/services')}>
            <ListRow left="Total members" right={members.total} rightColor="#005599" onClick={() => navigate('/members')} />
            <ListRow left="Active members" right={members.active} rightColor="#059669" onClick={() => navigate('/members')} />
            <ListRow left="New this month" right={members.newThisMonth} rightColor="#005599" />
            <ListRow left="Total services" right={services.total} rightColor="#be185d" onClick={() => navigate('/services')} />
            <ListRow left="Total events" right={events.total} rightColor="#7c3aed" onClick={() => navigate('/events')} />
          </SectionCard>
        </div>
      )}

      {role===R.REG && isMinistryLeader && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:16 }}>
          <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
            {events.upcoming.length===0 ? <EmptyState icon="📭" text="No upcoming events" /> : events.upcoming.map(ev => <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />)}
          </SectionCard>
          <SectionCard title="Ministry Overview" icon="✨" actionLabel="View ministry" onAction={() => navigate('/ministry')}>
            <ListRow left="Total events" right={events.total} rightColor="#7c3aed" onClick={() => navigate('/events')} />
            <ListRow left="Inventory items" right={inventory.totalItems} rightColor="#0891b2" onClick={() => navigate('/inventory')} />
            <ListRow left="Pending requests" right={inventory.pendingRequests} rightColor={inventory.pendingRequests>0?'#d97706':'#94a3b8'} onClick={() => navigate('/inventory')} />
          </SectionCard>
        </div>
      )}

      {role===R.FINANCE && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:16 }}>
          <SectionCard title="Recent Transactions" icon="💰" actionLabel="View all" onAction={() => navigate('/finance')}>
            {finance.recentRecords.length===0 ? <EmptyState icon="📭" text="No transactions yet" /> : finance.recentRecords.map(r => <ListRow key={r.id} left={r.Member?`${r.Member.first_name} ${r.Member.last_name}`:'—'} sub={`${r.category?.name||'—'} · ${fmtDate(r.transaction_date)}`} right={fmtMoneyFull(r.amount)} rightColor="#059669" />)}
          </SectionCard>
          <SectionCard title="Overview" icon="📊">
            <ListRow left="Total members" right={members.total} rightColor="#005599" onClick={() => navigate('/members')} />
            <ListRow left="Total events" right={events.total} rightColor="#7c3aed" onClick={() => navigate('/events')} />
            <div style={{ padding:'14px 18px', borderTop:'1px solid #f1f5f9', marginTop:4 }}>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>This Month</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#059669' }}>{fmtMoneyFull(finance.totalThisMonth)}</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Total collections</div>
            </div>
          </SectionCard>
        </div>
      )}

      {(role===R.CG||role===R.GRP) && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:16 }}>
          <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
            {events.upcoming.length===0 ? <EmptyState icon="📭" text="No upcoming events" /> : events.upcoming.map(ev => <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />)}
          </SectionCard>
          <SectionCard title="Inventory & Members" icon="📦" actionLabel="View inventory" onAction={() => navigate('/inventory')}>
            <ListRow left="Total items" right={inventory.totalItems} rightColor="#0891b2" onClick={() => navigate('/inventory')} />
            <ListRow left="Pending requests" right={inventory.pendingRequests} rightColor={inventory.pendingRequests>0?'#d97706':'#94a3b8'} onClick={() => navigate('/inventory')} />
            <ListRow left="Low stock" right={inventory.lowStock} rightColor={inventory.lowStock>0?'#dc2626':'#94a3b8'} onClick={() => navigate('/inventory')} />
            <ListRow left="Total members" right={members.total} rightColor="#005599" onClick={() => navigate('/members')} />
          </SectionCard>
        </div>
      )}

      {role===R.MEMBER && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:16 }}>
          <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
            {events.upcoming.length===0 ? <EmptyState icon="📭" text="No upcoming events" /> : events.upcoming.map(ev => <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)+(ev.location?` · ${ev.location}`:'')} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />)}
          </SectionCard>
          <SectionCard title="My Recent Giving" icon="💰" actionLabel="View all" onAction={() => navigate('/finance/my-giving')}>
            {finance.recentRecords.length===0 ? <EmptyState icon="📭" text="No giving records yet" /> : finance.recentRecords.map(r => <ListRow key={r.id} left={r.category?.name||'—'} sub={fmtDate(r.transaction_date)} right={fmtMoneyFull(r.amount)} rightColor="#059669" />)}
            {finance.recentRecords.length>0 && (
              <div style={{ padding:'12px 18px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>This month total</span>
                <span style={{ fontSize:15, fontWeight:800, color:'#059669' }}>{fmtMoneyFull(finance.totalThisMonth)}</span>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
