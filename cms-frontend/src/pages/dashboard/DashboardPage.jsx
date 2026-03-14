import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosInstance';

const ROLE = { ADMIN: 1, PASTOR: 2, REG_TEAM: 3, FINANCE: 4, CG_LEADER: 5, GRP_LEADER: 6, MEMBER: 7 };

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const roleId = user?.roleId;

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const fmtMoney = (n) => {
    const v = Number(n || 0);
    if (v >= 1_000_000_000) return `₱${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (v >= 1_000_000)     return `₱${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (v >= 1_000)         return `₱${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };
  const fmtMoneyFull = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const actionBadge = (action) => {
    const map = {
      LOGIN:                      { bg: '#d1fae5', color: '#065f46' },
      LOGOUT:                     { bg: '#f3f4f6', color: '#374151' },
      CREATE_MEMBER:              { bg: '#bde3f5', color: '#1e40af' },
      UPDATE_MEMBER:              { bg: '#ede9fe', color: '#5b21b6' },
      DELETE_MEMBER:              { bg: '#fee2e2', color: '#991b1b' },
      CREATE_USER:                { bg: '#bde3f5', color: '#1e40af' },
      UPDATE_USER:                { bg: '#ede9fe', color: '#5b21b6' },
      DEACTIVATE_USER:            { bg: '#fee2e2', color: '#991b1b' },
      CREATE_FINANCE_RECORD:      { bg: '#d1fae5', color: '#065f46' },
      UPDATE_FINANCE_RECORD:      { bg: '#ede9fe', color: '#5b21b6' },
      DELETE_FINANCE_RECORD:      { bg: '#fee2e2', color: '#991b1b' },
      UPLOAD_ARCHIVE:             { bg: '#fef3c7', color: '#92400e' },
      APPROVE_ARCHIVE:            { bg: '#d1fae5', color: '#065f46' },
      UPDATE_SETTINGS:            { bg: '#f0fdf4', color: '#166534' },
      CHECK_IN:                   { bg: '#bde3f5', color: '#1e40af' },
      REGISTER_EVENT:             { bg: '#d1fae5', color: '#065f46' },
      INVENTORY_REQUEST_APPROVED: { bg: '#d1fae5', color: '#065f46' },
      INVENTORY_REQUEST_REJECTED: { bg: '#fee2e2', color: '#991b1b' },
    };
    const style = map[action] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{ background: style.bg, color: style.color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
        {action}
      </span>
    );
  };

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;
  if (error)   return <div style={styles.error}>{error}</div>;

  const { members, finance, services, events, inventory, recentActivity } = stats;

  const allCards = {
    members:   { label: 'Total Members',     value: members.total,                  sub: `+${members.newThisMonth} this month`, icon: '👥', color: '#005599', path: '/members' },
    active:    { label: 'Active Members',    value: members.active,                 sub: `of ${members.total} total`,           icon: '✅', color: '#059669', path: '/members' },
    finance:   { label: 'Finance (Month)',   value: fmtMoney(finance.totalThisMonth), sub: 'Total collections',                 icon: '💰', color: '#d97706', path: '/finance' },
    myGiving:  { label: 'My Giving (Month)', value: fmtMoney(finance.totalThisMonth), sub: 'Your contributions',                icon: '💰', color: '#d97706', path: '/finance/my-giving' },
    events:    { label: 'Upcoming Events',   value: events.upcoming.length,         sub: `${events.total} total events`,        icon: '📅', color: '#7c3aed', path: '/events' },
    inventory: { label: 'Inventory Items',   value: inventory.totalItems,           sub: `${inventory.pendingRequests} pending`, icon: '📦', color: '#0891b2', path: '/inventory' },
    services:  { label: 'Upcoming Services', value: services.upcoming,              sub: `${services.total} total services`,    icon: '⛪', color: '#be185d', path: '/services' },
  };

  const cardKeysByRole = {
    [ROLE.ADMIN]:      ['members', 'active', 'finance', 'events', 'inventory', 'services'],
    [ROLE.PASTOR]:     ['members', 'active', 'finance', 'events', 'services'],
    [ROLE.REG_TEAM]:   ['members', 'active', 'events', 'services'],
    [ROLE.FINANCE]:    ['members', 'finance', 'events'],
    [ROLE.CG_LEADER]:  ['members', 'events', 'inventory', 'services'],
    [ROLE.GRP_LEADER]: ['members', 'events', 'inventory', 'services'],
    [ROLE.MEMBER]:     ['myGiving', 'events', 'services'],
  };

  const statCards = (cardKeysByRole[roleId] || ['members', 'events', 'services'])
    .map(k => allCards[k]).filter(Boolean);

  const showFinance   = [ROLE.ADMIN, ROLE.PASTOR, ROLE.FINANCE].includes(roleId);
  const showMyGiving  = roleId === ROLE.MEMBER;
  const showInventory = [ROLE.ADMIN, ROLE.CG_LEADER, ROLE.GRP_LEADER].includes(roleId);
  const showAudit     = [ROLE.ADMIN, ROLE.PASTOR].includes(roleId);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{greeting()}, {user?.email?.split('@')[0]} 👋</h1>
          <p style={styles.subtitle}>Here's what's happening at PLWM-MCC today.</p>
        </div>
        <span style={styles.dateBadge}>{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      <div style={styles.statsGrid}>
        {statCards.map((card) => (
          <div key={card.label} style={styles.statCard} onClick={() => navigate(card.path)}>
            <div style={styles.statTop}>
              <span style={styles.statIcon}>{card.icon}</span>
              <span style={{ ...styles.statValue, color: card.color }}>{card.value}</span>
            </div>
            <div style={styles.statLabel}>{card.label}</div>
            <div style={styles.statSub}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={styles.columns}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span>📅 Upcoming Events</span>
            <button style={styles.viewAll} onClick={() => navigate('/events')}>View all</button>
          </div>
          <div style={styles.cardBody}>
            {events.upcoming.length === 0
              ? <p style={styles.empty}>No upcoming events.</p>
              : events.upcoming.map(ev => (
                <div key={ev.id} style={styles.listRow} onClick={() => navigate(`/events/${ev.id}`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.listTitle}>{ev.title}</div>
                    <div style={styles.listSub}>{fmtDate(ev.start_date)}{ev.location ? ` · ${ev.location}` : ''}</div>
                  </div>
                  <span style={{ ...styles.statusBadge, background: '#bde3f5', color: '#1e40af' }}>{ev.status}</span>
                </div>
              ))
            }
          </div>
        </div>

        {showFinance && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span>💰 Recent Transactions</span>
              <button style={styles.viewAll} onClick={() => navigate('/finance')}>View all</button>
            </div>
            <div style={styles.cardBody}>
              {finance.recentRecords.length === 0
                ? <p style={styles.empty}>No transactions yet.</p>
                : finance.recentRecords.map(r => (
                  <div key={r.id} style={styles.listRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.listTitle}>{r.Member ? `${r.Member.first_name} ${r.Member.last_name}` : '—'}</div>
                      <div style={styles.listSub}>{r.category?.name} · {fmtDate(r.transaction_date)}</div>
                    </div>
                    <span style={{ fontWeight: '700', color: '#059669', flexShrink: 0 }}>{fmtMoneyFull(r.amount)}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {showMyGiving && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span>💰 My Recent Giving</span>
              <button style={styles.viewAll} onClick={() => navigate('/finance/my-giving')}>View all</button>
            </div>
            <div style={styles.cardBody}>
              {finance.recentRecords.length === 0
                ? <p style={styles.empty}>No giving records yet.</p>
                : finance.recentRecords.map(r => (
                  <div key={r.id} style={styles.listRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.listTitle}>{r.category?.name || '—'}</div>
                      <div style={styles.listSub}>{fmtDate(r.transaction_date)}</div>
                    </div>
                    <span style={{ fontWeight: '700', color: '#059669', flexShrink: 0 }}>{fmtMoneyFull(r.amount)}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {!showFinance && !showMyGiving && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span>⛪ Services</span>
              <button style={styles.viewAll} onClick={() => navigate('/services')}>View all</button>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.listRow}>
                <div style={styles.listTitle}>Upcoming this week</div>
                <span style={{ fontWeight: '700', color: '#be185d' }}>{services.upcoming}</span>
              </div>
              <div style={styles.listRow}>
                <div style={styles.listTitle}>Total services</div>
                <span style={{ fontWeight: '700', color: '#be185d' }}>{services.total}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAudit && (
        <div style={{ ...styles.card, marginTop: '20px' }}>
          <div style={styles.cardHeader}>
            <span>📋 Recent Activity</span>
            <button style={styles.viewAll} onClick={() => navigate('/audit-logs')}>View all</button>
          </div>
          <div style={styles.cardBody}>
            {recentActivity.length === 0
              ? <p style={styles.empty}>No activity yet.</p>
              : recentActivity.map(log => (
                <div key={log.id} style={{ ...styles.listRow, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.listTitle}>{log.User?.email || `User #${log.user_id}`}</div>
                    <div style={styles.listSub}>{new Date(log.created_at).toLocaleString('en-PH')}</div>
                  </div>
                  {actionBadge(log.action)}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {showInventory && inventory.lowStock > 0 && (
        <div style={styles.warningBanner} onClick={() => navigate('/inventory')}>
          ⚠️ <strong>{inventory.lowStock}</strong> inventory item{inventory.lowStock > 1 ? 's are' : ' is'} at or below minimum stock level.
          <span style={styles.warningLink}>View Inventory →</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:         { padding: '32px', maxWidth: '1100px' },
  loading:      { padding: '48px', textAlign: 'center', color: '#888' },
  error:        { padding: '48px', textAlign: 'center', color: '#dc2626' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' },
  title:        { fontSize: '24px', fontWeight: '700', color: '#005599', margin: 0 },
  subtitle:     { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
  dateBadge:    { fontSize: '13px', color: '#6b7280', background: '#f3f4f6', padding: '6px 14px', borderRadius: '20px' },
  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 16px', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  statTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  statIcon:     { fontSize: '22px' },
  statValue:    { fontSize: '22px', fontWeight: '800', lineHeight: 1, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statLabel:    { fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '2px' },
  statSub:      { fontSize: '12px', color: '#9ca3af' },
  columns:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  card:         { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '14px', color: '#005599' },
  viewAll:      { background: 'none', border: 'none', color: '#005599', fontSize: '13px', cursor: 'pointer', fontWeight: '600' },
  cardBody:     { padding: '4px 0' },
  listRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 20px', borderBottom: '1px solid #f9fafb', cursor: 'pointer', gap: '8px' },
  listTitle:    { fontSize: '14px', fontWeight: '500', color: '#111827' },
  listSub:      { fontSize: '12px', color: '#9ca3af', marginTop: '2px' },
  statusBadge:  { padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', flexShrink: 0 },
  empty:        { textAlign: 'center', color: '#9ca3af', padding: '24px', fontSize: '14px' },
  warningBanner:{ marginTop: '20px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '14px 20px', fontSize: '14px', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  warningLink:  { marginLeft: 'auto', color: '#d97706', fontWeight: '600' },
};
