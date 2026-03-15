import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosInstance';

// ── Role name constants (matches what backend returns) ────────
const R = {
  ADMIN:    'System Admin',
  PASTOR:   'Pastor',
  REG:      'Registration Team',
  FINANCE:  'Finance Team',
  CG:       'Cell Group Leader',
  GRP:      'Group Leader',
  MEMBER:   'Member',
};

// ── Role accent colors ────────────────────────────────────────
const ROLE_ACCENT = {
  [R.ADMIN]:   { primary: '#dc2626', light: '#fef2f2', label: '#b91c1c' },
  [R.PASTOR]:  { primary: '#7c3aed', light: '#f5f3ff', label: '#6d28d9' },
  [R.REG]:     { primary: '#005599', light: '#e8f4fd', label: '#004080' },
  [R.FINANCE]: { primary: '#059669', light: '#f0fdf4', label: '#047857' },
  [R.CG]:      { primary: '#d97706', light: '#fffbeb', label: '#b45309' },
  [R.GRP]:     { primary: '#0891b2', light: '#ecfeff', label: '#0e7490' },
  [R.MEMBER]:  { primary: '#64748b', light: '#f8fafc', label: '#475569' },
};

// ── Format helpers ────────────────────────────────────────────
const fmtMoney = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `₱${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (v >= 1_000_000)     return `₱${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000)         return `₱${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
};
const fmtMoneyFull = (n) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// ── Sub-components ────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hover ? accent : '#e8edf2'}`,
        borderRadius: '14px',
        padding: '20px 18px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: hover ? `0 4px 20px ${accent}28` : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hover ? 'translateY(-2px)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: accent, borderRadius: '14px 0 0 14px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '24px', lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: '26px', fontWeight: '800', color: accent, lineHeight: 1, letterSpacing: '-0.5px' }}>
          {value}
        </span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{sub}</div>
    </div>
  );
}

function SectionCard({ title, icon, actionLabel, onAction, children, minHeight }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8edf2', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minHeight }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span>{icon}</span> {title}
        </span>
        {actionLabel && (
          <button onClick={onAction} style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: '700', color: '#005599', cursor: 'pointer', padding: '3px 8px', borderRadius: '6px' }}>
            {actionLabel} →
          </button>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ListRow({ left, right, sub, onClick, rightColor }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: '1px solid #f8fafc', cursor: onClick ? 'pointer' : 'default', background: hover && onClick ? '#f8fafc' : '#fff', transition: 'background 0.12s', gap: '12px' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{left}</div>
        {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
      </div>
      <div style={{ fontSize: '13px', fontWeight: '700', color: rightColor || '#374151', flexShrink: 0 }}>{right}</div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '13px', fontWeight: '500' }}>{text}</div>
    </div>
  );
}

function ActionBadge({ action }) {
  const BADGE = {
    LOGIN:                      ['#d1fae5', '#065f46'],
    LOGOUT:                     ['#f3f4f6', '#374151'],
    CREATE_MEMBER:              ['#dbeafe', '#1e40af'],
    UPDATE_MEMBER:              ['#ede9fe', '#5b21b6'],
    DELETE_MEMBER:              ['#fee2e2', '#991b1b'],
    CREATE_USER:                ['#dbeafe', '#1e40af'],
    UPDATE_USER:                ['#ede9fe', '#5b21b6'],
    DEACTIVATE_USER:            ['#fee2e2', '#991b1b'],
    ACTIVATE_USER:              ['#d1fae5', '#065f46'],
    CREATE_FINANCE_RECORD:      ['#d1fae5', '#065f46'],
    UPDATE_FINANCE_RECORD:      ['#ede9fe', '#5b21b6'],
    DELETE_FINANCE_RECORD:      ['#fee2e2', '#991b1b'],
    UPLOAD_ARCHIVE:             ['#fef3c7', '#92400e'],
    APPROVE_ARCHIVE:            ['#d1fae5', '#065f46'],
    CHECK_IN:                   ['#dbeafe', '#1e40af'],
    REGISTER_EVENT:             ['#d1fae5', '#065f46'],
    UNREGISTER_EVENT:           ['#fee2e2', '#991b1b'],
    INVENTORY_REQUEST_APPROVED: ['#d1fae5', '#065f46'],
    INVENTORY_REQUEST_REJECTED: ['#fee2e2', '#991b1b'],
    CREATE_EVENT:               ['#dbeafe', '#1e40af'],
    UPDATE_EVENT_STATUS:        ['#ede9fe', '#5b21b6'],
    RESET_PASSWORD:             ['#fef3c7', '#92400e'],
    CHANGE_PASSWORD:            ['#fef3c7', '#92400e'],
    UPDATE_SETTINGS:            ['#f0fdf4', '#166534'],
  };
  const [bg, color] = BADGE[action] || ['#f3f4f6', '#374151'];
  return (
    <span style={{ background: bg, color, padding: '2px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

function AlertBanner({ icon, text, onClick, accent }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#fff7ed' : '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.15s', marginTop: '20px' }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span style={{ fontSize: '13px', color: '#92400e', fontWeight: '600', flex: 1 }}>{text}</span>
      <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '700' }}>View →</span>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Use roleName (string) — that's what the backend returns
  const role    = user?.roleName || '';
  const accent  = (ROLE_ACCENT[role] || ROLE_ACCENT[R.MEMBER]).primary;
  const acLight = (ROLE_ACCENT[role] || ROLE_ACCENT[R.MEMBER]).light;

  // Permission-based flags (uses real permissions array — always accurate)
  const canFinance   = hasPermission('finance',    'read');
  const canInventory = hasPermission('inventory',  'read');
  const canMembers   = hasPermission('members',    'read');
  const canEvents    = hasPermission('events',     'read');
  const canServices  = hasPermission('services',   'read');
  const isMember     = role === R.MEMBER;

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '14px' }}>
      <div style={{ width: '36px', height: '36px', border: `3px solid ${acLight}`, borderTop: `3px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#94a3b8', fontSize: '14px' }}>Loading your dashboard...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: '32px' }}>⚠️</span>
      <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '600' }}>{error}</span>
    </div>
  );

  const { members, finance, services, events, inventory, recentActivity } = stats;

  // ── Build stat cards based on actual permissions ──────────
  const statCards = [];
  if (canMembers) {
    statCards.push({ icon: '👥', label: 'Total Members',    value: members.total,   sub: `+${members.newThisMonth} this month`,    accent, path: '/members' });
    if (role !== R.FINANCE && role !== R.MEMBER) {
      statCards.push({ icon: '✅', label: 'Active Members',  value: members.active,  sub: `of ${members.total} total`,              accent: '#059669', path: '/members' });
    }
  }
  if (canFinance && !isMember) {
    statCards.push({ icon: '💰', label: 'Finance (Month)',  value: fmtMoney(finance.totalThisMonth), sub: 'Total collections this month', accent: '#059669', path: '/finance' });
  }
  if (isMember) {
    statCards.push({ icon: '💰', label: 'My Giving (Month)', value: fmtMoney(finance.totalThisMonth), sub: 'Your contributions this month', accent: '#059669', path: '/finance/my-giving' });
  }
  if (canEvents) {
    statCards.push({ icon: '📅', label: 'Upcoming Events',  value: events.upcoming.length, sub: `${events.total} total events`,      accent: '#7c3aed', path: '/events' });
  }
  if (canInventory) {
    statCards.push({ icon: '📦', label: 'Inventory Items',  value: inventory.totalItems,   sub: `${inventory.pendingRequests} pending requests`, accent: '#0891b2', path: '/inventory' });
  }
  if (canServices) {
    statCards.push({ icon: '⛪', label: 'Upcoming Services', value: services.upcoming,      sub: `${services.total} total services`,  accent: '#be185d', path: '/services' });
  }

  const dateStr = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const displayName = user?.email?.split('@')[0] || 'there';

  return (
    <div style={s.page}>

      {/* ── Hero header ────────────────────────────────────── */}
      <div style={{ ...s.hero, background: `linear-gradient(135deg, ${accent}18 0%, #f8fafc 100%)`, borderBottom: `2px solid ${accent}22` }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '26px' }}>
              {role === R.ADMIN ? '🛡️' : role === R.PASTOR ? '✝️' : role === R.REG ? '📋' : role === R.FINANCE ? '💼' : role === R.CG ? '🏘️' : role === R.GRP ? '👫' : '👤'}
            </span>
            <h1 style={{ ...s.title, color: accent }}>{greeting()}, {displayName} 👋</h1>
          </div>
          <p style={s.subtitle}>Here's what's happening at PLWM-MCC today.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <span style={{ ...s.dateBadge, background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>{dateStr}</span>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{role}</span>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      {statCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(175px, 1fr))`, gap: '14px', marginBottom: '24px' }}>
          {statCards.map(card => (
            <StatCard key={card.label} {...card} onClick={() => navigate(card.path)} />
          ))}
        </div>
      )}

      {/* ── Role-specific content sections ─────────────────── */}

      {/* SYSTEM ADMIN ─────────────────────────────────────── */}
      {role === R.ADMIN && (
        <>
          <div style={s.grid2}>
            <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
              {events.upcoming.length === 0
                ? <EmptyState icon="📭" text="No upcoming events" />
                : events.upcoming.map(ev => (
                    <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date) + (ev.location ? ` · ${ev.location}` : '')}
                      right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />
                  ))
              }
            </SectionCard>
            <SectionCard title="Recent Transactions" icon="💰" actionLabel="View all" onAction={() => navigate('/finance')}>
              {finance.recentRecords.length === 0
                ? <EmptyState icon="📭" text="No transactions yet" />
                : finance.recentRecords.map(r => (
                    <ListRow key={r.id}
                      left={r.Member ? `${r.Member.first_name} ${r.Member.last_name}` : '—'}
                      sub={`${r.category?.name || '—'} · ${fmtDate(r.transaction_date)}`}
                      right={fmtMoneyFull(r.amount)} rightColor="#059669" />
                  ))
              }
            </SectionCard>
          </div>
          <div style={{ ...s.grid2, marginTop: '16px' }}>
            <SectionCard title="Recent Activity" icon="📋" actionLabel="View all" onAction={() => navigate('/audit-logs')}>
              {recentActivity.length === 0
                ? <EmptyState icon="📭" text="No activity yet" />
                : recentActivity.map(log => (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #f8fafc', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.User?.email || `User #${log.user_id}`}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{new Date(log.created_at).toLocaleString('en-PH')}</div>
                      </div>
                      <ActionBadge action={log.action} />
                    </div>
                  ))
              }
            </SectionCard>
            <SectionCard title="Services Overview" icon="⛪" actionLabel="View all" onAction={() => navigate('/services')}>
              <ListRow left="Total services"    right={services.total}    rightColor="#be185d" />
              <ListRow left="Upcoming published" right={services.upcoming} rightColor="#be185d" />
              <ListRow left="Inventory items"   right={inventory.totalItems} rightColor="#0891b2" onClick={() => navigate('/inventory')} />
              <ListRow left="Pending requests"  right={inventory.pendingRequests} rightColor={inventory.pendingRequests > 0 ? '#d97706' : '#94a3b8'} onClick={() => navigate('/inventory')} />
              <ListRow left="Total members"     right={members.total}     rightColor="#005599" onClick={() => navigate('/members')} />
              <ListRow left="Active members"    right={members.active}    rightColor="#059669" onClick={() => navigate('/members')} />
            </SectionCard>
          </div>
          {inventory.lowStock > 0 && (
            <AlertBanner icon="⚠️" accent={accent}
              text={`${inventory.lowStock} inventory item${inventory.lowStock > 1 ? 's are' : ' is'} at or below minimum stock level.`}
              onClick={() => navigate('/inventory')} />
          )}
        </>
      )}

      {/* PASTOR ────────────────────────────────────────────── */}
      {role === R.PASTOR && (
        <>
          <div style={s.grid2}>
            <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
              {events.upcoming.length === 0
                ? <EmptyState icon="📭" text="No upcoming events" />
                : events.upcoming.map(ev => (
                    <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />
                  ))
              }
            </SectionCard>
            <SectionCard title="Recent Transactions" icon="💰" actionLabel="View all" onAction={() => navigate('/finance')}>
              {finance.recentRecords.length === 0
                ? <EmptyState icon="📭" text="No transactions yet" />
                : finance.recentRecords.map(r => (
                    <ListRow key={r.id}
                      left={r.Member ? `${r.Member.first_name} ${r.Member.last_name}` : '—'}
                      sub={`${r.category?.name || '—'} · ${fmtDate(r.transaction_date)}`}
                      right={fmtMoneyFull(r.amount)} rightColor="#059669" />
                  ))
              }
            </SectionCard>
          </div>
          <div style={{ marginTop: '16px' }}>
            <SectionCard title="Recent Activity" icon="📋" actionLabel="View all" onAction={() => navigate('/audit-logs')}>
              {recentActivity.length === 0
                ? <EmptyState icon="📭" text="No activity yet" />
                : recentActivity.map(log => (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #f8fafc', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.User?.email || `User #${log.user_id}`}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{new Date(log.created_at).toLocaleString('en-PH')}</div>
                      </div>
                      <ActionBadge action={log.action} />
                    </div>
                  ))
              }
            </SectionCard>
          </div>
        </>
      )}

      {/* REGISTRATION TEAM ─────────────────────────────────── */}
      {role === R.REG && (
        <div style={s.grid2}>
          <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
            {events.upcoming.length === 0
              ? <EmptyState icon="📭" text="No upcoming events" />
              : events.upcoming.map(ev => (
                  <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />
                ))
            }
          </SectionCard>
          <SectionCard title="Services & Members" icon="⛪" actionLabel="View services" onAction={() => navigate('/services')}>
            <ListRow left="Total members"      right={members.total}    rightColor="#005599" onClick={() => navigate('/members')} />
            <ListRow left="Active members"     right={members.active}   rightColor="#059669" onClick={() => navigate('/members')} />
            <ListRow left="New this month"     right={members.newThisMonth} rightColor="#005599" />
            <ListRow left="Total services"     right={services.total}   rightColor="#be185d" onClick={() => navigate('/services')} />
            <ListRow left="Upcoming services"  right={services.upcoming} rightColor="#be185d" onClick={() => navigate('/services')} />
            <ListRow left="Total events"       right={events.total}     rightColor="#7c3aed" onClick={() => navigate('/events')} />
          </SectionCard>
        </div>
      )}

      {/* FINANCE TEAM ──────────────────────────────────────── */}
      {role === R.FINANCE && (
        <>
          <div style={s.grid2}>
            <SectionCard title="Recent Transactions" icon="💰" actionLabel="View all" onAction={() => navigate('/finance')}>
              {finance.recentRecords.length === 0
                ? <EmptyState icon="📭" text="No transactions yet" />
                : finance.recentRecords.map(r => (
                    <ListRow key={r.id}
                      left={r.Member ? `${r.Member.first_name} ${r.Member.last_name}` : '—'}
                      sub={`${r.category?.name || '—'} · ${fmtDate(r.transaction_date)}`}
                      right={fmtMoneyFull(r.amount)} rightColor="#059669" />
                  ))
              }
            </SectionCard>
            <SectionCard title="Overview" icon="📊">
              <ListRow left="Total members"     right={members.total}    rightColor="#005599" onClick={() => navigate('/members')} />
              <ListRow left="Total events"      right={events.total}     rightColor="#7c3aed" onClick={() => navigate('/events')} />
              <ListRow left="Upcoming events"   right={events.upcoming.length} rightColor="#7c3aed" />
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>This Month</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#059669' }}>{fmtMoneyFull(finance.totalThisMonth)}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Total collections</div>
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {/* CELL GROUP LEADER ─────────────────────────────────── */}
      {(role === R.CG || role === R.GRP) && (
        <div style={s.grid2}>
          <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
            {events.upcoming.length === 0
              ? <EmptyState icon="📭" text="No upcoming events" />
              : events.upcoming.map(ev => (
                  <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date)} right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />
                ))
            }
          </SectionCard>
          <SectionCard title="Inventory & Members" icon="📦" actionLabel="View inventory" onAction={() => navigate('/inventory')}>
            <ListRow left="Total items"        right={inventory.totalItems}      rightColor="#0891b2" onClick={() => navigate('/inventory')} />
            <ListRow left="Pending requests"   right={inventory.pendingRequests} rightColor={inventory.pendingRequests > 0 ? '#d97706' : '#94a3b8'} onClick={() => navigate('/inventory')} />
            <ListRow left="Low stock items"    right={inventory.lowStock}        rightColor={inventory.lowStock > 0 ? '#dc2626' : '#94a3b8'} onClick={() => navigate('/inventory')} />
            <ListRow left="Total members"      right={members.total}             rightColor="#005599" onClick={() => navigate('/members')} />
            <ListRow left="Upcoming services"  right={services.upcoming}         rightColor="#be185d" onClick={() => navigate('/services')} />
          </SectionCard>
        </div>
      )}

      {/* MEMBER ─────────────────────────────────────────────── */}
      {role === R.MEMBER && (
        <div style={s.grid2}>
          <SectionCard title="Upcoming Events" icon="📅" actionLabel="View all" onAction={() => navigate('/events')}>
            {events.upcoming.length === 0
              ? <EmptyState icon="📭" text="No upcoming events" />
              : events.upcoming.map(ev => (
                  <ListRow key={ev.id} left={ev.title} sub={fmtDate(ev.start_date) + (ev.location ? ` · ${ev.location}` : '')}
                    right={ev.status} rightColor="#7c3aed" onClick={() => navigate(`/events/${ev.id}`)} />
                ))
            }
          </SectionCard>
          <SectionCard title="My Recent Giving" icon="💰" actionLabel="View all" onAction={() => navigate('/finance/my-giving')}>
            {finance.recentRecords.length === 0
              ? <EmptyState icon="📭" text="No giving records yet" />
              : finance.recentRecords.map(r => (
                  <ListRow key={r.id}
                    left={r.category?.name || '—'}
                    sub={fmtDate(r.transaction_date)}
                    right={fmtMoneyFull(r.amount)} rightColor="#059669" />
                ))
            }
            {finance.recentRecords.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>This month total</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#059669' }}>{fmtMoneyFull(finance.totalThisMonth)}</span>
              </div>
            )}
          </SectionCard>
        </div>
      )}

    </div>
  );
}

const s = {
  page:     { padding: '0', maxWidth: '1120px', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  hero:     { padding: '24px 28px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderRadius: '0 0 0 0' },
  title:    { fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' },
  subtitle: { fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' },
  dateBadge:{ fontSize: '12px', fontWeight: '600', padding: '5px 12px', borderRadius: '20px' },
  grid2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
};
