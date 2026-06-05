import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import useIsMobile from '../../hooks/useIsMobile';
import { greetingTarget } from '../../utils/roleDisplay';

const R = {
  ADMIN: 'System Admin',
  PASTOR: 'Pastor',
  REG: 'Registration Team',
  FINANCE: 'Finance Team',
  CG: 'Cell Group Leader',
  GROUP: 'Group Leader',
  MINISTRY: 'Ministry Leader',
  MEMBER: 'Member',
};

const ACCENTS = {
  [R.ADMIN]: '#0f5f8f',
  [R.PASTOR]: '#6d5bd0',
  [R.REG]: '#0f6aa3',
  [R.FINANCE]: '#0f7a55',
  [R.CG]: '#b76b16',
  [R.GROUP]: '#12748a',
  [R.MINISTRY]: '#0f6aa3',
  [R.MEMBER]: '#64748b',
};

const ROLE_SUBTITLE = {
  [R.ADMIN]: 'System health, users, and operational signals.',
  [R.PASTOR]: 'Read-only church overview and pastoral monitoring.',
  [R.REG]: 'Member onboarding, services, and event operations.',
  [R.FINANCE]: 'Giving records, monthly totals, and finance archives.',
  [R.MINISTRY]: 'Your ministry roster, event invites, and requests.',
  [R.CG]: 'Your cell group members and attendance tasks.',
  [R.GROUP]: 'Your group members, services, events, and requests.',
  [R.MEMBER]: 'Your personal church activity.',
};

const fmtNumber = (value) => Number(value || 0).toLocaleString('en-PH');
const fmtMoney = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const fmtDate = (value) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  : 'No date';

const greeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
};

const metric = (label, value, sub, path) => ({ label, value, sub, path });
const row = (label, detail, path, value) => ({ label, detail, path, value });

function MetricCard({ item, accent, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => item.path && onOpen(item.path)}
      disabled={!item.path}
      style={{
        ...S.metricCard,
        cursor: item.path ? 'pointer' : 'default',
        borderColor: `${accent}24`,
      }}
    >
      <span style={S.metricLabel}>{item.label}</span>
      <strong style={{ ...S.metricValue, color: accent }}>{item.value}</strong>
      <span style={S.metricSub}>{item.sub}</span>
    </button>
  );
}

function Panel({ title, action, onAction, children }) {
  return (
    <section style={S.panel}>
      <div style={S.panelHeader}>
        <h2 style={S.panelTitle}>{title}</h2>
        {action && (
          <button type="button" onClick={onAction} style={S.panelAction}>
            {action}
          </button>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}

function RowList({ rows, accent, empty = 'No items to show.' }) {
  const navigate = useNavigate();
  if (!rows.length) return <div style={S.empty}>{empty}</div>;
  return rows.map((item) => (
    <button
      key={`${item.label}-${item.path || item.detail}`}
      type="button"
      onClick={() => item.path && navigate(item.path)}
      disabled={!item.path}
      style={{ ...S.row, cursor: item.path ? 'pointer' : 'default' }}
    >
      <span style={S.rowText}>
        <strong style={S.rowLabel}>{item.label}</strong>
        <span style={S.rowDetail}>{item.detail}</span>
      </span>
      <span style={{ ...S.rowValue, color: item.path ? accent : '#64748b' }}>
        {item.value || (item.path ? 'Open' : 'Read')}
      </span>
    </button>
  ));
}

function AttendanceTrendChart({ data, accent, onNavigate }) {
  if (!data || data.length === 0) {
    return <div style={S.empty}>No attendance data yet.</div>;
  }
  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, fontWeight: 600, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#16a34a' }} /> Active</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#0066b3' }} /> New</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#d97706' }} /> Semi-Active</span>
      </div>
      {data.map((item) => {
        const pct = (v) => maxTotal > 0 ? (v / maxTotal) * 100 : 0;
        return (
          <button key={item.service_id} onClick={() => onNavigate(`/services/${item.service_id}/attendance`)}
            style={{ display: 'block', width: '100%', border: 0, background: 'none', padding: '8px 0', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              {item.title} — {new Date(item.service_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 18, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                {item.active > 0 && <div style={{ width: `${pct(item.active)}%`, background: '#16a34a', transition: 'width 0.3s' }} />}
                {item.new > 0 && <div style={{ width: `${pct(item.new)}%`, background: '#0066b3', transition: 'width 0.3s' }} />}
                {item.semiActive > 0 && <div style={{ width: `${pct(item.semiActive)}%`, background: '#d97706', transition: 'width 0.3s' }} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{item.total}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function rateColor(pct) {
  if (pct >= 85) return '#16a34a';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

function CellGroupAlertsPanel({ data, latestService }) {
  const [view, setView] = useState('table');
  const [sort, setSort] = useState({ key: 'absent', dir: 'desc' });

  if (!latestService) return <div style={S.empty}>No recent service found.</div>;
  const items = (data || []).filter(g => g.absent > 0);
  if (items.length === 0) return <div style={S.empty}>All cell groups had full attendance. No alerts.</div>;

  const sorted = [...items].sort((a, b) => {
    const av = a[sort.key] ?? 0, bv = b[sort.key] ?? 0;
    if (sort.key === 'cellGroupName') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sort.dir === 'asc' ? av - bv : bv - av;
  });

  const toggleSort = (key) => {
    setSort(prev => {
      if (prev.key === key) {
        if (prev.dir === 'desc') return { key, dir: 'asc' };
        return { key: 'absent', dir: 'desc' };
      }
      return { key, dir: key === 'cellGroupName' ? 'asc' : 'desc' };
    });
  };

  const sortIndicator = (key) => {
    if (sort.key !== key) return ' ↕';
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  };

  const totalMembers = sorted.reduce((s, g) => s + g.totalMembers, 0);
  const totalAttended = sorted.reduce((s, g) => s + g.attended, 0);
  const totalAbsent = sorted.reduce((s, g) => s + g.absent, 0);
  const avgRate = totalMembers > 0 ? Math.round((totalAttended / totalMembers) * 100) : 0;

  const latestDate = new Date(latestService.service_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  const thStyle = (key) => ({
    ...S.reportTh,
    cursor: 'pointer',
    userSelect: 'none',
    color: sort.key === key ? '#0f172a' : '#64748b',
  });

  const tdStyle = (val, threshold) => ({
    ...S.reportTd,
    color: val > threshold ? '#dc2626' : '#0f172a',
    fontWeight: val > threshold ? 700 : 500,
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, fontSize: 13, color: '#64748b', fontWeight: 600, flexWrap: 'wrap', gap: 8 }}>
        <span>Latest: {latestService.title} — {latestDate}</span>
        <button type="button" onClick={() => setView(v => v === 'table' ? 'graph' : 'table')} style={S.viewToggle}>
          {view === 'table' ? '📊 Show Graph' : '📋 Show Table'}
        </button>
      </div>

      {view === 'table' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.reportTable}>
            <thead>
              <tr>
                <th style={{ ...S.reportTh, width: 32 }}>#</th>
                <th style={thStyle('cellGroupName')} onClick={() => toggleSort('cellGroupName')}>Cell Group{sortIndicator('cellGroupName')}</th>
                <th style={{ ...thStyle('totalMembers'), textAlign: 'right' }} onClick={() => toggleSort('totalMembers')}>Total{sortIndicator('totalMembers')}</th>
                <th style={{ ...thStyle('attended'), textAlign: 'right' }} onClick={() => toggleSort('attended')}>Attended{sortIndicator('attended')}</th>
                <th style={{ ...thStyle('absent'), textAlign: 'right' }} onClick={() => toggleSort('absent')}>Absent{sortIndicator('absent')}</th>
                <th style={{ ...thStyle('rate'), textAlign: 'right' }} onClick={() => toggleSort('rate')}>Rate{sortIndicator('rate')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g, i) => {
                const rate = g.totalMembers > 0 ? Math.round((g.attended / g.totalMembers) * 100) : 0;
                return (
                  <tr key={g.cellGroupId} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={S.reportTd}>{i + 1}</td>
                    <td style={{ ...S.reportTd, fontWeight: 700, color: '#0f172a' }}>{g.cellGroupName}</td>
                    <td style={{ ...S.reportTd, textAlign: 'right' }}>{g.totalMembers}</td>
                    <td style={{ ...S.reportTd, textAlign: 'right' }}>{g.attended}</td>
                    <td style={tdStyle(g.absent, 10)}>{g.absent}</td>
                    <td style={{ ...S.reportTd, textAlign: 'right', color: rateColor(rate), fontWeight: 700 }}>{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ ...S.reportTotalRow, borderTop: '2px solid #e2e8f0' }}>
                <td style={S.reportTd}></td>
                <td style={{ ...S.reportTd, fontWeight: 800, color: '#0f172a' }}>TOTAL</td>
                <td style={{ ...S.reportTd, textAlign: 'right', fontWeight: 800 }}>{totalMembers}</td>
                <td style={{ ...S.reportTd, textAlign: 'right', fontWeight: 800 }}>{totalAttended}</td>
                <td style={{ ...S.reportTd, textAlign: 'right', fontWeight: 800, color: totalAbsent > 0 ? '#dc2626' : '#0f172a' }}>{totalAbsent}</td>
                <td style={{ ...S.reportTd, textAlign: 'right', fontWeight: 800, color: rateColor(avgRate) }}>{avgRate}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div>
          {sorted.map((g) => {
            const rate = g.totalMembers > 0 ? Math.round((g.attended / g.totalMembers) * 100) : 0;
            const barPct = g.totalMembers > 0 ? (g.absent / g.totalMembers) * 100 : 0;
            const color = rateColor(rate);
            return (
              <div key={g.cellGroupId} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: '#0f172a' }}>{g.cellGroupName}</span>
                  <span style={{ color: '#64748b' }}>{g.absent} absent of {g.totalMembers} — {rate}% attended</span>
                </div>
                <div style={S.barTrack}>
                  <div style={{ ...S.barFill, width: `${Math.min(barPct, 100)}%`, background: color }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 16, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, display: 'flex', gap: 20, fontSize: 12, color: '#64748b', fontWeight: 600, flexWrap: 'wrap' }}>
            <span>Total: {totalAbsent} absent of {totalMembers}</span>
            <span>Avg Rate: <span style={{ color: rateColor(avgRate) }}>{avgRate}%</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

function getDashboardConfig({ role, stats, hasPermission }) {
  const summary = stats.roleSummary || {};
  const canMembers = hasPermission('members', 'read');
  const canFinance = hasPermission('finance', 'read');
  const canEvents = hasPermission('events', 'read');
  const canServices = hasPermission('services', 'read');
  const canInventory = hasPermission('inventory', 'read');
  const canArchives = hasPermission('archives', 'read');
  const canAudit = hasPermission('audit', 'read');

  const commonEvents = (stats.events?.upcoming || []).slice(0, 5).map((event) =>
    row(event.title, `${fmtDate(event.start_date)}${event.location ? `, ${event.location}` : ''}`, `/events/${event.id}`, event.status)
  );

  const commonFinance = (stats.finance?.recentRecords || []).slice(0, 5).map((record) =>
    row(
      record.Member ? `${record.Member.first_name} ${record.Member.last_name}` : 'Member record',
      `${record.category?.name || 'Uncategorized'} - ${fmtDate(record.transaction_date)}`,
      '/finance',
      fmtMoney(record.amount),
    )
  );

  switch (role) {
    case R.ADMIN:
      return {
        metrics: [
          metric('Active users', fmtNumber(summary.activeUsers), 'Accounts enabled', '/users'),
          metric('Members', fmtNumber(stats.members.total), `${fmtNumber(stats.members.active)} active`, '/members'),
          metric('Pending archives', fmtNumber(summary.pendingArchives), 'Need review', '/archives'),
          metric('Low stock', fmtNumber(stats.inventory.lowStock), 'Inventory alerts', '/inventory'),
        ],
        primary: [
          row('User management', 'Create and maintain staff access.', '/users'),
          row('Audit logs', 'Review recent system activity.', '/audit-logs'),
          row('Settings', 'Maintain system-level configuration.', '/settings'),
        ],
        watch: [
          row('Pending inventory requests', 'Requests waiting for review.', '/inventory', fmtNumber(stats.inventory.pendingRequests)),
          row('Upcoming events', 'Scheduled events on the calendar.', '/events', fmtNumber(stats.events.upcoming.length)),
          row('Upcoming services', 'Published services coming up.', '/services', fmtNumber(stats.services.upcoming)),
        ],
        secondaryTitle: 'Recent Activity',
        secondaryRows: canAudit ? (stats.recentActivity || []).slice(0, 6).map((log) =>
          row(log.action?.replace(/_/g, ' ') || 'Activity', log.User?.email || 'System activity', '/audit-logs', 'View')
        ) : [],
      };
    case R.PASTOR:
      return {
        metrics: [
          metric('Active members', fmtNumber(stats.members.active), 'Read-only member view', '/members'),
          metric('Upcoming services', fmtNumber(summary.upcomingServices), 'Published services', '/services'),
          metric('Upcoming events', fmtNumber(stats.events.upcoming.length), 'Read-only events', '/events'),
          metric('Pending archives', fmtNumber(summary.pendingArchives), 'Approval queue', '/archives'),
        ],
        primary: [
          row('Members', 'View member profiles and church groups.', '/members'),
          row('Events', 'Read event details and registrations.', '/events'),
          row('Archives', 'Review and approve documents.', '/archives'),
        ],
        watch: [
          row('Finance overview', 'Read giving and finance records.', '/finance', fmtMoney(stats.finance.totalThisMonth)),
          row('Cell groups', 'Review group structure.', '/cell-groups'),
          row('Audit logs', 'Read recent system activity.', '/audit-logs'),
        ],
        secondaryTitle: 'Upcoming Events',
        secondaryRows: commonEvents,
      };
    case R.REG:
      return {
        metrics: [
          metric('Total Members', fmtNumber(stats.members.total), 'All member records', '/members'),
          metric('Active Members', fmtNumber(stats.members.active), 'Active status members', '/members'),
          metric("Today's Attendance", fmtNumber(summary.todayAttendance), 'Checked in today', '/attendance'),
          metric('New Members', fmtNumber(stats.members.newThisMonth), 'Added this month', '/members'),
        ],
        primary: [],
        watch: [],
        secondaryTitle: 'Cell Group Attendance Alerts',
        secondaryRows: [],
        renderCustom: true,
      };
    case R.FINANCE:
      return {
        metrics: [
          metric('This month', fmtMoney(stats.finance.totalThisMonth), 'Recorded giving', '/finance'),
          metric('Records', fmtNumber(summary.recordsThisMonth), 'Transactions this month', '/finance'),
          metric('Members', fmtNumber(stats.members.total), 'Lookup for giving records', '/members'),
          metric('Archives', fmtNumber(summary.pendingArchives), 'Public/restricted queue', '/archives'),
        ],
        primary: [
          row('Finance records', 'Record and review contributions.', '/finance'),
          row('Member lookup', 'Find members tied to giving records.', '/members'),
          row('Archives', 'Access finance-related documents.', '/archives'),
        ],
        watch: [
          row('Recent total', 'Month-to-date giving.', '/finance', fmtMoney(stats.finance.totalThisMonth)),
          row('New members', 'Recently added member records.', '/members', fmtNumber(stats.members.newThisMonth)),
        ],
        secondaryTitle: 'Recent Finance Records',
        secondaryRows: commonFinance,
      };
    case R.MINISTRY:
      return {
        metrics: [
          metric('Ministry members', fmtNumber(summary.membersInScope), summary.scopeName || 'Assigned ministry', '/ministry'),
          metric('Pending invites', fmtNumber(summary.pendingInvites), 'Awaiting response', '/events'),
          metric('Upcoming events', fmtNumber(stats.events.upcoming.length), 'Available to coordinate', '/events'),
          metric('Requests', fmtNumber(summary.pendingRequests), 'Inventory requests', '/inventory'),
        ],
        primary: [
          row('Ministry roster', 'Add, review, or unassign ministry members.', '/ministry'),
          row('Event invites', 'Assign ministry members to posted events.', '/events'),
          row('Attendance', 'View ministry-related attendance.', '/attendance'),
        ],
        watch: [
          row('Inventory', 'Request items for ministry needs.', '/inventory', fmtNumber(summary.pendingRequests)),
          row('Archives', 'Read public and restricted documents.', '/archives'),
        ],
        secondaryTitle: 'Upcoming Events',
        secondaryRows: commonEvents,
      };
    case R.CG:
      return {
        metrics: [
          metric('Cell group members', fmtNumber(summary.membersInScope), summary.scopeName || 'Assigned cell group', '/cell-groups'),
          metric('Services', fmtNumber(stats.services.upcoming), 'Attendance tasks', '/attendance'),
          metric('Upcoming events', fmtNumber(stats.events.upcoming.length), 'Read-only event view', '/events'),
          metric('Requests', fmtNumber(summary.pendingRequests), 'Inventory requests', '/inventory'),
        ],
        primary: [
          row('Cell group', 'Manage assigned cell group members.', '/cell-groups'),
          row('Attendance', 'Check service attendance for your cell group.', '/attendance'),
          row('Events', 'Read events and attendee information.', '/events'),
        ],
        watch: [
          row('Inventory', 'Request needed items.', '/inventory', fmtNumber(summary.pendingRequests)),
          row('Archives', 'Read public and restricted documents.', '/archives'),
        ],
        secondaryTitle: 'Upcoming Events',
        secondaryRows: commonEvents,
      };
    case R.GROUP:
      return {
        metrics: [
          metric('Group members', fmtNumber(summary.membersInScope), summary.scopeName || 'Assigned group', '/members'),
          metric('Eligible candidates', fmtNumber(summary.eligibleCandidates), 'Unassigned members', '/members'),
          metric('Upcoming events', fmtNumber(stats.events.upcoming.length), 'Read-only event view', '/events'),
          metric('Requests', fmtNumber(summary.pendingRequests), 'Inventory requests', '/inventory'),
        ],
        primary: [
          row('Members', 'Manage assigned group membership.', '/members'),
          row('Services', 'Read service schedules.', canServices ? '/services' : null),
          row('Events', 'Read events and attendees.', canEvents ? '/events' : null),
        ],
        watch: [
          row('Attendance', 'View scoped attendance.', '/attendance'),
          row('Inventory', 'Request needed items.', canInventory ? '/inventory' : null, fmtNumber(summary.pendingRequests)),
          row('Archives', 'Read public and restricted documents.', canArchives ? '/archives' : null),
        ],
        secondaryTitle: 'Upcoming Events',
        secondaryRows: commonEvents,
      };
    default:
      return {
        metrics: [
          metric('Members', fmtNumber(stats.members.total), 'Church records', canMembers ? '/members' : null),
          metric('Events', fmtNumber(stats.events.upcoming.length), 'Upcoming', canEvents ? '/events' : null),
          metric('Finance', fmtMoney(stats.finance.totalThisMonth), 'This month', canFinance ? '/finance' : null),
        ],
        primary: [
          row('Events', 'Read upcoming events.', canEvents ? '/events' : null),
          row('Services', 'Read upcoming services.', canServices ? '/services' : null),
        ],
        watch: [
          row('Inventory', 'Read available items.', canInventory ? '/inventory' : null),
          row('Archives', 'Read documents.', canArchives ? '/archives' : null),
        ],
        secondaryTitle: 'Upcoming Events',
        secondaryRows: commonEvents,
      };
  }
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const role = user?.roleName || '';
  const accent = ACCENTS[role] || ACCENTS[R.MEMBER];
  const displayName = greetingTarget(user || {});

  const { data: stats, isLoading, error } = useDashboardStats();

  const fetchError = error ? 'Failed to load dashboard data.' : '';

  const config = useMemo(() => {
    if (!stats) return null;
    return getDashboardConfig({ role, stats, hasPermission });
  }, [role, stats, hasPermission]);

  if (isLoading) {
    return (
      <div style={S.state}>
        <div style={{ ...S.spinner, borderTopColor: accent }} />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (fetchError || !config) {
    return <div style={S.state}>{fetchError || 'Dashboard is unavailable.'}</div>;
  }

  const metrics = config.metrics.slice(0, 4);
  const summary = stats.roleSummary || {};

  return (
    <div style={{ ...S.page, maxWidth: isMobile ? '100%' : 1180 }}>
      <header style={S.header}>
        <div>
          <div style={{ ...S.scopePill, color: accent, background: `${accent}12`, borderColor: `${accent}28` }}>
            {summary.scopeName || role || 'Dashboard'}
          </div>
          <h1 style={S.title}>{greeting()}, {displayName}</h1>
          <p style={S.subtitle}>{ROLE_SUBTITLE[role] || 'Your role-specific workspace.'}</p>
        </div>
        <div style={S.headerMeta}>
          <span>{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <strong style={{ color: accent }}>{role}</strong>
        </div>
      </header>

      <section style={{ ...S.metrics, gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))' }}>
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} accent={accent} onOpen={navigate} />
        ))}
      </section>

      {role === R.REG ? (
        <>
          <section>
            <Panel title="Attendance Trends">
              <AttendanceTrendChart data={stats.attendanceTrend || []} accent={accent} onNavigate={navigate} />
            </Panel>
          </section>
          <section>
            <Panel title="Cell Group Attendance Alerts">
              <CellGroupAlertsPanel data={stats.cellGroupAbsences || []} latestService={stats.latestService || null} />
            </Panel>
          </section>
        </>
      ) : (
        <>
          <section style={{ ...S.grid, gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr' }}>
            <Panel title="Primary Work">
              <RowList rows={config.primary} accent={accent} />
            </Panel>
            <Panel title="Watch List">
              <RowList rows={config.watch} accent={accent} />
            </Panel>
          </section>

          <section style={{ ...S.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
            <Panel
              title={config.secondaryTitle}
              action={config.secondaryRows.length ? 'Open' : null}
              onAction={() => {
                const firstPath = config.secondaryRows.find((item) => item.path)?.path;
                if (firstPath) navigate(firstPath.startsWith('/events/') ? '/events' : firstPath);
              }}
            >
              <RowList rows={config.secondaryRows} accent={accent} empty="Nothing needs attention right now." />
            </Panel>
            <Panel title="Access Summary">
              <RowList
                rows={[
                  row('Read access', 'Pages shown in the sidebar are available to this role.', null, 'Active'),
                  row('Write controls', 'Buttons appear only when the role has the matching permission.', null, 'Guarded'),
                  row('Current session', 'Log out and back in after permission changes.', null, 'Fresh login'),
                ]}
                accent={accent}
              />
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'flex-start',
    padding: '22px 24px',
    background: '#fff',
    border: '1px solid #dfe7f1',
    borderRadius: 10,
    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
  },
  scopePill: {
    display: 'inline-flex',
    border: '1px solid',
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
  },
  title: {
    margin: 0,
    color: '#0f172a',
    fontSize: 26,
    lineHeight: 1.15,
    fontWeight: 800,
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#64748b',
    fontSize: 14,
  },
  headerMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    color: '#64748b',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  metrics: {
    display: 'grid',
    gap: 12,
  },
  metricCard: {
    textAlign: 'left',
    background: '#fff',
    border: '1px solid #dfe7f1',
    borderRadius: 10,
    padding: 16,
    minHeight: 116,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontFamily: 'inherit',
    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 1.1,
    marginTop: 12,
  },
  metricSub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 8,
  },
  grid: {
    display: 'grid',
    gap: 14,
  },
  panel: {
    background: '#fff',
    border: '1px solid #dfe7f1',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
  },
  panelHeader: {
    minHeight: 52,
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #eef2f7',
  },
  panelTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 800,
  },
  panelAction: {
    border: '1px solid #dbe6f2',
    background: '#f8fafc',
    color: '#334155',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  row: {
    width: '100%',
    border: 0,
    background: '#fff',
    borderBottom: '1px solid #f1f5f9',
    padding: '13px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  rowText: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  rowLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 750,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowDetail: {
    color: '#64748b',
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowValue: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 800,
  },
  empty: {
    padding: 24,
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  state: {
    minHeight: '55vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: '#64748b',
    fontSize: 14,
  },
  spinner: {
    width: 30,
    height: 30,
    border: '3px solid #dbe6f2',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  viewToggle: {
    border: '1px solid #dbe6f2',
    background: '#f8fafc',
    color: '#334155',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  reportTh: {
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: '#64748b',
    borderBottom: '2px solid #e2e8f0',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  reportTd: {
    padding: '8px 10px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  reportTotalRow: {
    background: '#f8fafc',
  },
  barTrack: {
    height: 22,
    background: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.4s ease',
  },
};
