import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import useIsMobile from '../../hooks/useIsMobile';
import { greetingTarget } from '../../utils/roleDisplay';
import { getFinanceRecordLabel } from '../../utils/financeRecordLabel';
import { getRoleWorkspace } from '../../utils/roleWorkspace';
import { timeAgo } from '../../utils/timeAgo';
import MonoIcon from '../../components/common/MonoIcon';

const R = {
  ADMIN: 'System Admin',
  PASTOR: 'Pastor',
  REG: 'Registration Team',
  FINANCE: 'Finance Team',
  CG: 'Cell Group Leader',
  GROUP: 'Group Leader',
  MINISTRY: 'Ministry Leader',
  LEADER: 'Leader',
  MEMBER: 'Member',
};

const ACCENTS = {
  [R.ADMIN]: '#003d70',
  [R.PASTOR]: '#005599',
  [R.REG]: '#005599',
  [R.FINANCE]: '#003d70',
  [R.CG]: '#005599',
  [R.GROUP]: '#003d70',
  [R.MINISTRY]: '#005599',
  [R.LEADER]: '#003d70',
  [R.MEMBER]: '#52647a',
};

const fmtNumber = (value) => Number(value || 0).toLocaleString('en-PH');
const fmtMoney = (value) => `₱${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const fmtDate = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  : 'No date';

const greeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good evening';
};

const metric = (label, value, sub, path, tone = 'default') => ({ label, value, sub, path, tone });
const row = (label, detail, path, value, key, badge = null) => ({ label, detail, path, value, key, badge });

function MetricCard({ item, accent, onOpen }) {
  const valueColor = item.tone === 'alert' ? '#b91c1c' : item.tone === 'positive' ? '#15803d' : accent;
  return (
    <button
      type="button"
      onClick={() => item.path && onOpen(item.path)}
      disabled={!item.path}
      style={{
        ...S.metricCard,
        cursor: item.path ? 'pointer' : 'default',
        borderColor: item.tone === 'alert' ? '#fecaca' : 'var(--mcc-border, #e2e8f0)',
      }}
    >
      <span style={S.metricLabel}>{item.label}</span>
      <strong style={{ ...S.metricValue, color: valueColor }}>{item.value}</strong>
      <span style={S.metricSub}>{item.sub}</span>
    </button>
  );
}

function Panel({ title, subtitle, action, onAction, children }) {
  return (
    <section style={S.panel}>
      <div style={S.panelHeader}>
        <div style={{ minWidth: 0 }}>
          <h2 style={S.panelTitle}>{title}</h2>
          {subtitle && <p style={S.panelSub}>{subtitle}</p>}
        </div>
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

function RowList({ rows, accent, empty = 'Nothing needs attention right now.' }) {
  const navigate = useNavigate();
  if (!rows || !rows.length) return <div style={S.empty}>{empty}</div>;
  return rows.map((item) => (
    <button
      key={item.key || `${item.label}-${item.path || item.detail}`}
      type="button"
      onClick={() => item.path && navigate(item.path)}
      disabled={!item.path}
      style={{ ...S.row, cursor: item.path ? 'pointer' : 'default' }}
    >
      <span style={S.rowText}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <strong style={S.rowLabel}>{item.label}</strong>
          {item.badge && <span style={S.rowBadge}>{item.badge}</span>}
        </span>
        <span style={S.rowDetail}>{item.detail}</span>
      </span>
      <span style={{ ...S.rowValue, color: item.path ? accent : 'var(--mcc-secondary, #52647a)' }}>
        {item.value || (item.path ? 'Open' : '—')}
      </span>
    </button>
  ));
}

function GatheringOverviewList({ items, accent, onNavigate }) {
  if (!items || !items.length) {
    return (
      <div style={S.empty}>
        No completed gathering check-ins yet. Recorded service attendance will summarize here with week-over-week comparisons.
      </div>
    );
  }
  const max = Math.max(1, ...items.map((item) => Number(item.total || 0)));
  return (
    <div style={{ padding: '12px 16px 16px', display: 'grid', gap: 12 }}>
      {items.map((item) => {
        const pct = Math.min(100, Math.round((Number(item.total || 0) / max) * 100));
        const deltaText = item.delta == null
          ? null
          : item.delta > 0
            ? `+${item.delta} vs prior`
            : item.delta < 0
              ? `${item.delta} vs prior`
              : 'Same as prior';
        const deltaColor = item.delta > 0 ? '#15803d' : item.delta < 0 ? '#b45309' : '#52647a';
        return (
          <button
            key={item.service_id}
            type="button"
            onClick={() => onNavigate(`/services/${item.service_id}/attendance`)}
            style={S.gatheringRow}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--mcc-ink, #0f172a)' }}>
                {item.title}
                <span style={{ fontWeight: 500, color: '#52647a', marginLeft: 8, fontSize: 12 }}>
                  {fmtDate(item.service_date)}
                </span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
                <strong style={{ fontSize: 15, color: accent, fontVariantNumeric: 'tabular-nums' }}>{fmtNumber(item.total)}</strong>
                {deltaText && <span style={{ fontSize: 11, fontWeight: 600, color: deltaColor }}>{deltaText}</span>}
              </span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: '#eef2f7', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: accent, borderRadius: 4 }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AttendanceTrendChart({ data, onNavigate }) {
  if (!data || data.length === 0) {
    return <div style={S.empty}>No completed service attendance recorded yet.</div>;
  }
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const chartHeight = 200;
  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <div style={{ padding: '14px 16px 16px' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12, fontWeight: 600, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#005599' }} /> Active members
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#9dc0d8' }} /> Inactive / returning
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#52647a' }}>Peak: {maxTotal}</span>
      </div>

      <div style={{ position: 'relative', display: 'flex', height: chartHeight + 36 }}>
        <div style={{ position: 'relative', width: 38, height: chartHeight, flexShrink: 0 }}>
          {gridLines.map((pct) => (
            <span key={pct} style={{
              position: 'absolute', bottom: pct * chartHeight - 7, right: 6,
              fontSize: 10, color: '#64748b', fontWeight: 500,
            }}>
              {Math.round(maxTotal * pct)}
            </span>
          ))}
        </div>

        <div style={{ flex: 1, position: 'relative', height: chartHeight }}>
          {gridLines.map((pct) => (
            <div key={pct} style={{ position: 'absolute', bottom: pct * chartHeight, left: 0, right: 0, height: 1, background: '#f1f5f9' }} />
          ))}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: '#e2e8f0' }} />

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 8 ? 3 : 8, height: '100%', padding: '0 4px' }}>
            {data.map((item) => {
              const barW = data.length > 8 ? `calc(100% / ${data.length} - 3px)` : `min(48px, calc(100% / ${data.length} - 8px))`;
              const hActive = (item.active / maxTotal) * chartHeight;
              const hInactive = (item.inactive / maxTotal) * chartHeight;
              return (
                <button
                  key={item.service_id}
                  type="button"
                  onClick={() => onNavigate(`/services/${item.service_id}/attendance`)}
                  title={`${item.title} — ${item.total} total (Active: ${item.active}, Inactive: ${item.inactive})`}
                  style={{
                    flex: '0 0 auto', width: barW, display: 'flex', flexDirection: 'column',
                    alignItems: 'stretch', justifyContent: 'flex-end',
                    border: 0, background: 'none', padding: 0, margin: 0, cursor: 'pointer', minHeight: 0,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: chartHeight }}>
                    {hInactive > 0 && <div style={{ height: hInactive, background: '#9dc0d8', borderRadius: '3px 3px 0 0' }} />}
                    {hActive > 0 && <div style={{ height: hActive, background: '#005599', borderRadius: hInactive > 0 ? '0 0 3px 3px' : '3px' }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: data.length > 8 ? 3 : 8, marginLeft: 38, marginTop: 6 }}>
        {data.map((item) => {
          const barW = data.length > 8 ? `calc(100% / ${data.length} - 3px)` : `min(48px, calc(100% / ${data.length} - 8px))`;
          const label = fmtDate(item.service_date);
          return (
            <span key={item.service_id} style={{
              flex: '0 0 auto', width: barW, fontSize: 10, color: '#64748b',
              textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function rateColor(pct) {
  if (pct >= 85) return '#15803d';
  if (pct >= 70) return '#b45309';
  return '#b91c1c';
}

function CellGroupAlertsPanel({ data, latestService }) {
  const [view, setView] = useState('table');
  const [sort, setSort] = useState({ key: 'absent', dir: 'desc' });

  const items = useMemo(() => (data || []).filter((g) => g.absent > 0), [data]);
  const sorted = useMemo(() => [...items].sort((a, b) => {
    const av = a[sort.key] ?? 0;
    const bv = b[sort.key] ?? 0;
    if (sort.key === 'cellGroupName') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sort.dir === 'asc' ? av - bv : bv - av;
  }), [items, sort]);

  if (!latestService) return <div style={S.empty}>No recent completed service found yet.</div>;
  if (items.length === 0) return <div style={S.empty}>All cell groups had full attendance for the latest service.</div>;

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        if (prev.dir === 'desc') return { key, dir: 'asc' };
        return { key: 'absent', dir: 'desc' };
      }
      return { key, dir: key === 'cellGroupName' ? 'asc' : 'desc' };
    });
  };

  const totalMembers = sorted.reduce((s, g) => s + g.totalMembers, 0);
  const totalAttended = sorted.reduce((s, g) => s + g.attended, 0);
  const totalAbsent = sorted.reduce((s, g) => s + g.absent, 0);
  const avgRate = totalMembers > 0 ? Math.round((totalAttended / totalMembers) * 100) : 0;
  const latestDate = new Date(`${latestService.service_date}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

  const thStyle = (key, align = 'left') => ({
    ...S.reportTh,
    cursor: 'pointer',
    userSelect: 'none',
    textAlign: align,
    color: sort.key === key ? 'var(--mcc-ink, #0f172a)' : 'var(--mcc-secondary, #52647a)',
  });

  return (
    <div style={{ padding: '14px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, fontSize: 13, color: 'var(--mcc-secondary, #52647a)', fontWeight: 600, flexWrap: 'wrap', gap: 8 }}>
        <span>Latest: {latestService.title} · {latestDate}</span>
        <button type="button" onClick={() => setView((v) => (v === 'table' ? 'graph' : 'table'))} style={S.viewToggle}>
          <MonoIcon name={view === 'table' ? 'teamReport' : 'clipboard'} size={14} />
          <span>{view === 'table' ? 'Show Graph' : 'Show Table'}</span>
        </button>
      </div>

      {view === 'table' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.reportTable}>
            <thead>
              <tr>
                <th style={{ ...S.reportTh, width: 36 }}>#</th>
                <th style={thStyle('cellGroupName')} onClick={() => toggleSort('cellGroupName')}>Cell Group</th>
                <th style={thStyle('totalMembers', 'right')} onClick={() => toggleSort('totalMembers')}>Total</th>
                <th style={thStyle('attended', 'right')} onClick={() => toggleSort('attended')}>Attended</th>
                <th style={thStyle('absent', 'right')} onClick={() => toggleSort('absent')}>Absent</th>
                <th style={thStyle('rate', 'right')} onClick={() => toggleSort('rate')}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g, i) => {
                const rate = g.totalMembers > 0 ? Math.round((g.attended / g.totalMembers) * 100) : 0;
                return (
                  <tr key={g.cellGroupId} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={S.reportTd}>{i + 1}</td>
                    <td style={{ ...S.reportTd, fontWeight: 700, color: 'var(--mcc-ink, #0f172a)' }}>{g.cellGroupName}</td>
                    <td style={{ ...S.reportTd, textAlign: 'right' }}>{g.totalMembers}</td>
                    <td style={{ ...S.reportTd, textAlign: 'right' }}>{g.attended}</td>
                    <td style={{ ...S.reportTd, textAlign: 'right', color: g.absent > 10 ? '#b91c1c' : 'var(--mcc-ink, #0f172a)', fontWeight: g.absent > 10 ? 700 : 500 }}>{g.absent}</td>
                    <td style={{ ...S.reportTd, textAlign: 'right', color: rateColor(rate), fontWeight: 700 }}>{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                <td style={S.reportTd} />
                <td style={{ ...S.reportTd, fontWeight: 800 }}>TOTAL</td>
                <td style={{ ...S.reportTd, textAlign: 'right', fontWeight: 800 }}>{totalMembers}</td>
                <td style={{ ...S.reportTd, textAlign: 'right', fontWeight: 800 }}>{totalAttended}</td>
                <td style={{ ...S.reportTd, textAlign: 'right', fontWeight: 800, color: totalAbsent > 0 ? '#b91c1c' : 'inherit' }}>{totalAbsent}</td>
                <td style={{ ...S.reportTd, textAlign: 'right', fontWeight: 800, color: rateColor(avgRate) }}>{avgRate}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {(() => {
            const maxAbs = Math.max(...sorted.map((g) => g.absent), 1);
            return sorted.map((g) => {
              const rate = g.totalMembers > 0 ? Math.round((g.attended / g.totalMembers) * 100) : 0;
              const pct = Math.min(100, (g.absent / maxAbs) * 100);
              return (
                <div key={g.cellGroupId} style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 72px', gap: 10, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{g.cellGroupName}</span>
                  <div style={{ height: 10, borderRadius: 5, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: rateColor(rate), borderRadius: 5 }} />
                  </div>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: rateColor(rate) }}>{g.absent} absent</span>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

function getQuickActions(role, hasPermission) {
  const act = (label, path, icon, primary = false, perm = null) => ({ label, path, icon, primary, perm });
  const listByRole = {
    [R.ADMIN]: [
      act('Add Member', '/members/new', 'plus', true, ['members', 'create']),
      act('Record Attendance', '/attendance/qr', 'qr', false, ['qr_attendance', 'read']),
      act('Add Transaction', '/finance?new=giving', 'finance', false, ['finance', 'create']),
      act('Add Inventory', '/inventory', 'inventory', false, ['inventory', 'create']),
      act('Create Event', '/events', 'events', false, ['events', 'create']),
      act('Consolidated Analytics', '/reports/analytics', 'analytics', false, ['dashboard', 'read']),
    ],
    [R.PASTOR]: [
      act('Consolidated Analytics', '/reports/analytics', 'analytics', true, ['dashboard', 'read']),
      act('Attendance Report', '/attendance', 'attendance', false, ['attendance', 'read']),
      act('Care Follow-ups', '/outreach', 'outreach', false, ['outreach', 'read']),
      act('Review Archives', '/archives', 'archive', false, ['archives', 'read']),
    ],
    [R.REG]: [
      act('Open QR Desk', '/attendance/qr', 'qr', true, ['qr_attendance', 'read']),
      act('Add Member', '/members/new', 'plus', false, ['members', 'create']),
      act('Services', '/services', 'services', false, ['services', 'read']),
      act('Events', '/events', 'events', false, ['events', 'read']),
      act('Registration Analytics', '/reports/registration', 'analytics', false, ['attendance', 'read']),
    ],
    [R.FINANCE]: [
      act('Record Giving', '/finance?new=giving', 'plus', true, ['finance', 'create']),
      act('Record Expense', '/finance/expenses', 'wallet', false, ['finance', 'create']),
      act('Finance Analytics', '/reports/analytics', 'analytics', false, ['dashboard', 'read']),
      act('Financial Archives', '/archives', 'archive', false, ['archives', 'read']),
    ],
    [R.MINISTRY]: [
      act('Manage Team Roster', '/ministry', 'groups', true, ['ministry', 'read']),
      act('Schedules', '/ministry/schedules', 'schedule', false, ['ministry', 'read']),
      act('Event Invites', '/events', 'events', false, ['events', 'read']),
      act('Request Inventory', '/inventory', 'inventory', false, ['inventory', 'read']),
    ],
    [R.CG]: [
      act('Cell Roster', '/cell-groups', 'cellgroups', true, ['cell_groups', 'read']),
      act('Record Cell Attendance', '/attendance/qr', 'qr', false, ['qr_attendance', 'read']),
      act('Follow-ups', '/outreach', 'outreach', false, ['outreach', 'read']),
      act('Team Report', '/reports/team-attendance', 'teamReport', false, ['attendance', 'read']),
    ],
    [R.GROUP]: [
      act('Ministry Roster', '/members', 'members', true, ['members', 'read']),
      act('Record Attendance', '/attendance/qr', 'qr', false, ['qr_attendance', 'read']),
      act('Follow-ups', '/outreach', 'outreach', false, ['outreach', 'read']),
      act('Team Report', '/reports/team-attendance', 'teamReport', false, ['attendance', 'read']),
    ],
    [R.LEADER]: [
      act('Choose Working Team', '/leader/teams', 'myTeams', true),
      act('QR Attendance', '/attendance/qr', 'qr', false, ['qr_attendance', 'read']),
      act('Team Report', '/reports/team-attendance', 'teamReport', false, ['attendance', 'read']),
      act('Follow-ups', '/outreach', 'outreach', false, ['outreach', 'read']),
    ],
  };

  return (listByRole[role] || []).filter((item) => !item.perm || hasPermission(item.perm[0], item.perm[1]));
}

function getDashboardConfig({ role, stats, hasPermission }) {
  const summary = stats.roleSummary || {};
  const canEvents = hasPermission('events', 'read');
  const canInventory = hasPermission('inventory', 'read');
  const canArchives = hasPermission('archives', 'read');
  const canAudit = hasPermission('audit', 'read');

  const scheduleRows = (stats.upcomingSchedules || []).map((item) =>
    row(item.title, `${fmtDate(item.date)}${item.detail ? ` · ${item.detail}` : ''}`, item.path, item.kind, item.id)
  );

  const eventRows = (stats.events?.upcoming || []).slice(0, 5).map((event) =>
    row(event.title, `${fmtDate(event.start_date)}${event.location ? ` · ${event.location}` : ''}`, `/events/${event.id}`, event.status, `ev-${event.id}`)
  );

  const financeRows = (stats.finance?.recentRecords || []).slice(0, 6).map((record, index) =>
    row(
      getFinanceRecordLabel(record),
      `${record.category?.name || 'Uncategorized'} · ${fmtDate(record.transaction_date)}`,
      '/finance',
      fmtMoney(record.amount),
      `fin-${record.id ?? index}`,
    )
  );

  const activityRows = canAudit
    ? (stats.recentActivity || []).slice(0, 6).map((log, index) => {
        const label = log.label || String(log.action || 'Activity').replace(/_/g, ' ');
        const actor = log.actor || log.User?.email || 'System';
        const stamp = log.created_at ? ` · ${timeAgo(log.created_at)}` : '';
        return row(label, `${actor}${stamp}`, log.target_path || '/audit-logs', 'View', `act-${log.id ?? index}`);
      })
    : [];

  switch (role) {
    case R.ADMIN: {
      const reviewQueue = [
        row('Pending document archives', 'Uploaded records awaiting approval.', '/archives', fmtNumber(summary.pendingArchives), 'rq-archives'),
        row('Pending inventory requests', 'Equipment and supply requests to review.', '/inventory', fmtNumber(stats.inventory.pendingRequests), 'rq-inventory'),
        ...(Number(summary.openFollowUps || 0) > 0 || hasPermission('outreach', 'read')
          ? [row('Open attendance follow-ups', 'Members with 2+ consecutive absences.', '/outreach', fmtNumber(summary.openFollowUps), 'rq-followups')]
          : []),
        ...(Number(summary.pendingCampaigns || 0) > 0
          ? [row('Notification campaigns awaiting approval', 'Scheduled SMS announcements pending sign-off.', '/outreach', fmtNumber(summary.pendingCampaigns), 'rq-campaigns')]
          : []),
        ...(Number(summary.pendingExpenses || 0) > 0
          ? [row('Pending expense approvals', 'Outgoing financial requests waiting review.', '/finance/expenses', fmtNumber(summary.pendingExpenses), 'rq-expenses')]
          : []),
        row('Upcoming events & services', 'Published gatherings on the church calendar.', '/events', fmtNumber((stats.events.upcoming?.length || 0) + Number(stats.services.upcoming || 0)), 'rq-upcoming'),
      ];

      return {
        metrics: [
          metric('Members', fmtNumber(stats.members.total), `${fmtNumber(stats.members.active)} active`, '/members'),
          metric("Today's Attendance", fmtNumber(summary.todayAttendance), 'Checked in today', '/attendance'),
          metric('New Members', fmtNumber(stats.members.newThisMonth), 'Added this month', '/members'),
          metric('Open Follow-ups', fmtNumber(summary.openFollowUps), 'Members needing care', '/outreach', Number(summary.openFollowUps) > 0 ? 'alert' : 'default'),
          metric('Finance Balance', fmtMoney(stats.finance.availableBalance ?? stats.finance.netThisMonth), `MTD net ${fmtMoney(stats.finance.netThisMonth)}`, '/finance', 'positive'),
          metric('Low Stock', fmtNumber(stats.inventory.lowStock), `${fmtNumber(summary.activeUsers)} active staff accounts`, '/inventory', Number(stats.inventory.lowStock) > 0 ? 'alert' : 'default'),
        ],
        primaryLeftTitle: 'Church Attendance Overview',
        primaryLeftSubtitle: 'Latest completed gatherings with week-over-week change',
        primaryLeftType: 'gatherings',
        primaryRightTitle: 'Review Queue',
        primaryRightSubtitle: 'Items needing administrative action',
        primaryRightRows: reviewQueue,
        secondaryLeftTitle: 'Recent System Activity',
        secondaryLeftSubtitle: 'Operational record updates (routine logins filtered to Audit Logs)',
        secondaryLeftAction: 'All audit logs',
        secondaryLeftActionPath: '/audit-logs',
        secondaryLeftRows: activityRows,
        secondaryRightTitle: 'Upcoming Schedules',
        secondaryRightSubtitle: 'Next church services and scheduled events',
        secondaryRightAction: 'Calendar',
        secondaryRightActionPath: '/events',
        secondaryRightRows: scheduleRows.length ? scheduleRows : eventRows,
      };
    }

    case R.PASTOR:
      return {
        metrics: [
          metric('Active Members', fmtNumber(stats.members.active), `of ${fmtNumber(stats.members.total)} total`, '/members'),
          metric("Today's Attendance", fmtNumber(summary.todayAttendance), 'Checked in today', '/attendance'),
          metric('Open Follow-ups', fmtNumber(summary.openFollowUps), 'Pastoral care cases', '/outreach', Number(summary.openFollowUps) > 0 ? 'alert' : 'default'),
          metric('Pending Approvals', fmtNumber(Number(summary.pendingArchives || 0) + Number(summary.pendingCampaigns || 0)), `${fmtNumber(summary.pendingArchives)} archives · ${fmtNumber(summary.pendingCampaigns)} campaigns`, '/archives'),
        ],
        primaryLeftTitle: 'Church Attendance Overview',
        primaryLeftSubtitle: 'Recent worship gatherings and participation trend',
        primaryLeftType: 'gatherings',
        primaryRightTitle: 'Pastoral Oversight Queue',
        primaryRightSubtitle: 'Approvals, care follow-ups, and stewardship',
        primaryRightRows: [
          row('Documents awaiting approval', 'Review restricted and confidential archives.', '/archives', fmtNumber(summary.pendingArchives), 'p-arch'),
          row('Attendance care follow-ups', 'Review open episodes and assign care workers.', '/outreach', fmtNumber(summary.openFollowUps), 'p-care'),
          row('Finance month-to-date', `Income ${fmtMoney(stats.finance.totalThisMonth)} · Expenses ${fmtMoney(stats.finance.totalExpenseThisMonth)}`, '/finance', fmtMoney(stats.finance.netThisMonth), 'p-fin'),
          row('Cell groups & ministries', 'Browse congregation structure and leaders.', '/cell-groups', 'Browse', 'p-cg'),
        ],
        secondaryLeftTitle: 'Upcoming Church Schedule',
        secondaryLeftSubtitle: 'Next published services and events',
        secondaryLeftAction: 'All events',
        secondaryLeftActionPath: '/events',
        secondaryLeftRows: scheduleRows.length ? scheduleRows : eventRows,
        secondaryRightTitle: 'Recent System Activity',
        secondaryRightSubtitle: 'Latest operational changes across the church',
        secondaryRightAction: 'Audit logs',
        secondaryRightActionPath: '/audit-logs',
        secondaryRightRows: activityRows,
      };

    case R.REG:
      return {
        metrics: [
          metric('Total Members', fmtNumber(stats.members.total), 'All registered profiles', '/members'),
          metric('Active Members', fmtNumber(stats.members.active), 'Current active roster', '/members'),
          metric("Today's Attendance", fmtNumber(summary.todayAttendance), 'Checked in today', '/attendance'),
          metric('New Members', fmtNumber(stats.members.newThisMonth), 'Added this month', '/members'),
        ],
        renderRegistration: true,
      };

    case R.FINANCE:
      return {
        metrics: [
          metric('Available Balance', fmtMoney(stats.finance.availableBalance ?? stats.finance.netThisMonth), 'Net across recorded funds', '/finance', 'positive'),
          metric('Income (This Month)', fmtMoney(stats.finance.totalThisMonth), `${fmtNumber(summary.recordsThisMonth)} records`, '/finance'),
          metric('Expenses (This Month)', fmtMoney(stats.finance.totalExpenseThisMonth), `${fmtNumber(summary.pendingExpenses)} pending approval`, '/finance/expenses'),
          metric('Net (This Month)', fmtMoney(stats.finance.netThisMonth), 'Income less expenses', '/reports/analytics'),
        ],
        primaryLeftTitle: 'Recent Financial Records',
        primaryLeftSubtitle: 'Latest offerings, tithes, and contributions',
        primaryLeftAction: 'Open Finance',
        primaryLeftActionPath: '/finance',
        primaryLeftRows: financeRows,
        primaryRightTitle: 'Stewardship Queue',
        primaryRightSubtitle: 'Verification and monthly reporting',
        primaryRightRows: [
          row('Giving records', 'Record collective or member offerings with receipts.', '/finance', fmtNumber(summary.recordsThisMonth), 'f-inc'),
          row('Church expenses', 'Track outgoing funds and verify attachments.', '/finance/expenses', fmtMoney(stats.finance.totalExpenseThisMonth), 'f-exp'),
          row('Financial archives', 'Pending documents in Financial Records.', '/archives', fmtNumber(summary.pendingArchives), 'f-arch'),
          row('Consolidated analytics', 'Review monthly trends and export statements.', '/reports/analytics', 'Open', 'f-rep'),
        ],
      };

    case R.MINISTRY:
      return {
        metrics: [
          metric('Team Members', fmtNumber(summary.membersInScope), summary.scopeName || 'Assigned team', '/ministry'),
          metric('Pending Invites', fmtNumber(summary.pendingInvites), 'Awaiting member response', '/events'),
          metric('Upcoming Events', fmtNumber(stats.events.upcoming.length), 'Scheduled church events', '/events'),
          metric('Inventory Requests', fmtNumber(summary.pendingRequests), 'Pending approval', '/inventory'),
        ],
        primaryLeftTitle: 'Upcoming Schedule & Events',
        primaryLeftSubtitle: 'Gatherings where your team can serve or invite members',
        primaryLeftAction: 'Schedules',
        primaryLeftActionPath: '/ministry/schedules',
        primaryLeftRows: scheduleRows.length ? scheduleRows : eventRows,
        primaryRightTitle: 'Team Operations',
        primaryRightSubtitle: 'Daily coordination for your assigned scope',
        primaryRightRows: [
          row('Team roster & substitutes', 'Manage members and substitute requests.', '/ministry', fmtNumber(summary.membersInScope), 'm-roster'),
          row('Practices & cleaning duty', 'Update team schedules shown in the Member Portal.', '/ministry/schedules', 'Manage', 'm-sched'),
          row('Inventory requests', 'Request equipment or supplies for gatherings.', '/inventory', fmtNumber(summary.pendingRequests), 'm-inv'),
          row('Church archives', 'Read public and restricted documents.', '/archives', 'Open', 'm-arch'),
        ],
      };

    case R.CG:
      return {
        metrics: [
          metric('Cell Members', fmtNumber(summary.membersInScope), summary.scopeName || 'Assigned cell group', '/cell-groups'),
          metric('Upcoming Services', fmtNumber(stats.services.upcoming), 'Open attendance schedules', '/attendance'),
          metric('Upcoming Events', fmtNumber(stats.events.upcoming.length), 'Church calendar', '/events'),
          metric('Inventory Requests', fmtNumber(summary.pendingRequests), 'Pending review', '/inventory'),
        ],
        primaryLeftTitle: 'Upcoming Gatherings',
        primaryLeftSubtitle: 'Prepare attendance batches and coordinate your cell',
        primaryLeftAction: 'QR Attendance',
        primaryLeftActionPath: '/attendance/qr',
        primaryLeftRows: scheduleRows.length ? scheduleRows : eventRows,
        primaryRightTitle: 'Cell Group Care',
        primaryRightSubtitle: 'Roster, attendance, and member follow-up',
        primaryRightRows: [
          row('Cell group roster', 'View members and assign newcomers.', '/cell-groups', fmtNumber(summary.membersInScope), 'cg-roster'),
          row('Attendance follow-ups', 'Check members who missed 2+ gatherings.', '/outreach', 'Review', 'cg-care'),
          row('Team attendance report', 'Track cell participation trends over time.', '/reports/team-attendance', 'Report', 'cg-rep'),
          row('Inventory requests', 'Request materials for cell meetings.', '/inventory', fmtNumber(summary.pendingRequests), 'cg-inv'),
        ],
      };

    case R.GROUP:
      return {
        metrics: [
          metric('Ministry Members', fmtNumber(summary.membersInScope), summary.scopeName || 'Assigned ministry', '/members'),
          metric('Eligible Candidates', fmtNumber(summary.eligibleCandidates), 'Unassigned members matching rules', '/members'),
          metric('Upcoming Events', fmtNumber(stats.events.upcoming.length), 'Church calendar', '/events'),
          metric('Inventory Requests', fmtNumber(summary.pendingRequests), 'Pending review', '/inventory'),
        ],
        primaryLeftTitle: 'Upcoming Gatherings',
        primaryLeftSubtitle: 'Next services and events for your ministry',
        primaryLeftAction: 'Events',
        primaryLeftActionPath: '/events',
        primaryLeftRows: scheduleRows.length ? scheduleRows : eventRows,
        primaryRightTitle: 'Ministry Operations',
        primaryRightSubtitle: 'Roster, attendance, and pastoral care',
        primaryRightRows: [
          row('Ministry roster', 'Review members and assign eligible candidates.', '/members', fmtNumber(summary.membersInScope), 'g-roster'),
          row('Attendance follow-ups', 'Encourage members with recent absences.', '/outreach', 'Review', 'g-care'),
          row('Team attendance report', 'Monitor weekly and monthly participation.', '/reports/team-attendance', 'Report', 'g-rep'),
          row('Inventory requests', 'Request supplies for fellowship activities.', canInventory ? '/inventory' : null, fmtNumber(summary.pendingRequests), 'g-inv'),
        ],
      };

    case R.LEADER:
      return {
        metrics: [
          metric('Assigned Teams', fmtNumber(summary.assignedTeamCount), summary.scopeName || 'Active assignments', '/leader/teams'),
          metric('Members in Scope', fmtNumber(stats.members.total), `${fmtNumber(stats.members.active)} active`, '/leader/teams'),
          metric('Upcoming Events', fmtNumber(stats.events.upcoming.length), 'Church calendar', canEvents ? '/events' : null),
          metric('Inventory Requests', fmtNumber(summary.pendingRequests), 'Pending review', canInventory ? '/inventory' : null),
        ],
        primaryLeftTitle: 'Upcoming Gatherings',
        primaryLeftSubtitle: 'Select an individual team in the header before submitting attendance',
        primaryLeftAction: 'My Teams',
        primaryLeftActionPath: '/leader/teams',
        primaryLeftRows: scheduleRows.length ? scheduleRows : eventRows,
        primaryRightTitle: 'Scoped Leadership Tools',
        primaryRightSubtitle: 'Combined view is read-only; switch to one team to edit',
        primaryRightRows: [
          row('My Teams switcher', 'Open an individual cell group or ministry workspace.', '/leader/teams', fmtNumber(summary.assignedTeamCount), 'l-teams'),
          row('QR & batch attendance', 'Submit attendance for the active selected team.', hasPermission('qr_attendance', 'read') ? '/attendance/qr' : null, 'Open', 'l-qr'),
          row('Care follow-ups', 'Review absence episodes for your assigned teams.', '/outreach', 'Review', 'l-care'),
          row('Church archives', 'Browse shared church documents.', canArchives ? '/archives' : null, 'Open', 'l-arch'),
        ],
      };

    default:
      return {
        metrics: [
          metric('Members', fmtNumber(stats.members.total), 'Church records', '/members'),
          metric('Events', fmtNumber(stats.events.upcoming.length), 'Upcoming', canEvents ? '/events' : null),
          metric('Services', fmtNumber(stats.services.upcoming), 'Published', '/services'),
        ],
        primaryLeftTitle: 'Upcoming Schedules',
        primaryLeftRows: scheduleRows.length ? scheduleRows : eventRows,
        primaryRightTitle: 'Church Resources',
        primaryRightRows: [
          row('Inventory', 'View available church items.', canInventory ? '/inventory' : null, 'Open', 'd-inv'),
          row('Archives', 'Read church documents.', canArchives ? '/archives' : null, 'Open', 'd-arch'),
        ],
      };
  }
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const role = user?.roleName || '';
  const canOpenAnalytics = [R.ADMIN, R.PASTOR, R.REG, R.FINANCE].includes(role);
  const accent = ACCENTS[role] || ACCENTS[R.MEMBER];
  const displayName = greetingTarget(user || {});
  const workspace = getRoleWorkspace(user);

  const { data: stats, isLoading, error } = useDashboardStats();
  const fetchError = error ? 'Failed to load dashboard data.' : '';

  const dashboardRole = role === R.LEADER && workspace.key === 'cell' ? R.CG
    : role === R.LEADER && workspace.key === 'group' ? R.GROUP : role;

  const config = useMemo(() => {
    if (!stats) return null;
    return getDashboardConfig({ role: dashboardRole, stats, hasPermission });
  }, [dashboardRole, stats, hasPermission]);

  const quickActions = useMemo(
    () => getQuickActions(dashboardRole, hasPermission),
    [dashboardRole, hasPermission],
  );

  if (isLoading) {
    return (
      <div style={S.state}>
        <div style={{ ...S.spinner, borderTopColor: accent }} />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  if (fetchError || !config) {
    return <div style={S.state}>{fetchError || 'Dashboard is unavailable.'}</div>;
  }

  const metrics = config.metrics || [];
  const summary = stats.roleSummary || {};
  const metricCols = isMobile
    ? '1fr'
    : metrics.length >= 6
      ? 'repeat(auto-fit, minmax(185px, 1fr))'
      : `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))`;

  return (
    <div className={`role-dashboard role-dashboard-${workspace.key}`} style={S.page}>
      <header className="role-dashboard-hero" style={S.header}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...S.scopePill, color: accent, background: `${accent}12`, borderColor: `${accent}28` }}>
            {summary.scopeName || role || 'Dashboard'}
          </div>
          <span className="role-dashboard-greeting">{greeting()}, {displayName}</span>
          <h1 className="workspace-page-title" style={S.title}>{workspace.lead}</h1>
          <p style={S.subtitle}>{workspace.purpose}</p>
        </div>
        <div style={S.headerMeta}>
          <span>{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <strong style={{ color: accent }}>{role}</strong>
          {canOpenAnalytics && (
            <button type="button" onClick={() => navigate('/reports/analytics')} style={{ ...S.analyticsBtn, background: accent }}>
              <MonoIcon name="analytics" size={15} />
              <span>Consolidated Analytics</span>
            </button>
          )}
        </div>
      </header>

      {quickActions.length > 0 && (
        <nav className="role-action-bar" aria-label="Quick actions">
          <span>Quick actions</span>
          {quickActions.map((item) => (
            <button
              key={`${item.label}-${item.path}`}
              type="button"
              className={item.primary ? 'role-action-primary' : ''}
              onClick={() => navigate(item.path)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              <MonoIcon name={item.icon} size={15} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      <section className="role-dashboard-metrics" style={{ ...S.metrics, gridTemplateColumns: metricCols }}>
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} accent={accent} onOpen={navigate} />
        ))}
      </section>

      {config.renderRegistration ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.15fr .85fr', gap: 16, alignItems: 'start' }}>
          <Panel title="Attendance Trends" subtitle="Last 10 completed services (click any bar to open check-in sheet)">
            <AttendanceTrendChart data={stats.attendanceTrend || []} onNavigate={navigate} />
          </Panel>
          <Panel title="Cell Group Attendance Alerts" subtitle="Groups with absences in the latest completed service">
            <CellGroupAlertsPanel data={stats.cellGroupAbsences || []} latestService={stats.latestService || null} />
          </Panel>
        </div>
      ) : (
        <>
          <section className="role-dashboard-work" style={{ ...S.grid, gridTemplateColumns: isMobile ? '1fr' : '1.2fr .8fr' }}>
            <Panel
              title={config.primaryLeftTitle}
              subtitle={config.primaryLeftSubtitle}
              action={config.primaryLeftAction}
              onAction={config.primaryLeftActionPath ? () => navigate(config.primaryLeftActionPath) : undefined}
            >
              {config.primaryLeftType === 'gatherings' ? (
                <GatheringOverviewList items={stats.attendanceOverview || []} accent={accent} onNavigate={navigate} />
              ) : (
                <RowList rows={config.primaryLeftRows} accent={accent} />
              )}
            </Panel>

            <Panel
              title={config.primaryRightTitle}
              subtitle={config.primaryRightSubtitle}
              action={config.primaryRightAction}
              onAction={config.primaryRightActionPath ? () => navigate(config.primaryRightActionPath) : undefined}
            >
              <RowList rows={config.primaryRightRows} accent={accent} />
            </Panel>
          </section>

          {(config.secondaryLeftTitle || config.secondaryRightTitle) && (
            <section className="role-dashboard-secondary" style={{ ...S.grid, gridTemplateColumns: isMobile ? '1fr' : '1.2fr .8fr' }}>
              {config.secondaryLeftTitle && (
                <Panel
                  title={config.secondaryLeftTitle}
                  subtitle={config.secondaryLeftSubtitle}
                  action={config.secondaryLeftAction}
                  onAction={config.secondaryLeftActionPath ? () => navigate(config.secondaryLeftActionPath) : undefined}
                >
                  <RowList rows={config.secondaryLeftRows} accent={accent} empty="No operational activity recorded yet." />
                </Panel>
              )}
              {config.secondaryRightTitle && (
                <Panel
                  title={config.secondaryRightTitle}
                  subtitle={config.secondaryRightSubtitle}
                  action={config.secondaryRightAction}
                  onAction={config.secondaryRightActionPath ? () => navigate(config.secondaryRightActionPath) : undefined}
                >
                  <RowList rows={config.secondaryRightRows} accent={accent} empty="No upcoming schedules yet." />
                </Panel>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'flex-start',
    padding: '20px 24px',
    background: 'var(--mcc-surface, #fff)',
    border: '1px solid var(--mcc-border, #e2e8f0)',
    borderRadius: 'var(--mcc-radius, 14px)',
    boxShadow: 'var(--mcc-panel-shadow, 0 4px 20px rgba(11,36,71,.04))',
  },
  scopePill: {
    display: 'inline-flex',
    border: '1px solid',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    color: 'var(--mcc-ink, #0f172a)',
    fontSize: 26,
    lineHeight: 1.15,
    fontWeight: 700,
  },
  subtitle: {
    margin: '6px 0 0',
    color: 'var(--mcc-secondary, #52647a)',
    fontSize: 14,
  },
  headerMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 5,
    color: 'var(--mcc-secondary, #52647a)',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  analyticsBtn: {
    marginTop: 4,
    border: 0,
    borderRadius: 8,
    padding: '9px 14px',
    color: '#fff',
    fontWeight: 650,
    fontSize: 13,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
  },
  metrics: {
    display: 'grid',
    gap: 12,
  },
  metricCard: {
    textAlign: 'left',
    background: 'var(--mcc-surface, #fff)',
    border: '1px solid var(--mcc-border, #e2e8f0)',
    borderRadius: 'var(--mcc-radius, 14px)',
    padding: '15px 16px',
    minHeight: 108,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontFamily: 'inherit',
    boxShadow: 'var(--mcc-panel-shadow, 0 4px 20px rgba(11,36,71,.03))',
  },
  metricLabel: {
    color: 'var(--mcc-secondary, #52647a)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 1.15,
    marginTop: 8,
    fontVariantNumeric: 'tabular-nums',
  },
  metricSub: {
    color: 'var(--mcc-secondary, #52647a)',
    fontSize: 12,
    marginTop: 6,
  },
  grid: {
    display: 'grid',
    gap: 16,
    alignItems: 'start',
  },
  panel: {
    background: 'var(--mcc-surface, #fff)',
    border: '1px solid var(--mcc-border, #e2e8f0)',
    borderRadius: 'var(--mcc-radius, 14px)',
    overflow: 'hidden',
    boxShadow: 'var(--mcc-panel-shadow, 0 4px 20px rgba(11,36,71,.03))',
  },
  panelHeader: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottom: '1px solid #eef2f7',
  },
  panelTitle: {
    margin: 0,
    color: 'var(--mcc-ink, #0f172a)',
    fontSize: 15,
    fontWeight: 750,
  },
  panelSub: {
    margin: '2px 0 0',
    fontSize: 12,
    color: 'var(--mcc-secondary, #52647a)',
  },
  panelAction: {
    border: '1px solid #dbe6f2',
    background: '#f8fafc',
    color: '#005599',
    borderRadius: 8,
    padding: '6px 11px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  row: {
    width: '100%',
    border: 0,
    background: 'var(--mcc-surface, #fff)',
    borderBottom: '1px solid #f1f5f9',
    padding: '12px 16px',
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
    gap: 2,
  },
  rowLabel: {
    color: 'var(--mcc-ink, #0f172a)',
    fontSize: 13,
    fontWeight: 700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 99,
    background: '#eff6ff',
    color: '#005599',
    flexShrink: 0,
  },
  rowDetail: {
    color: 'var(--mcc-secondary, #52647a)',
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowValue: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 750,
    fontVariantNumeric: 'tabular-nums',
  },
  gatheringRow: {
    border: '1px solid #eef2f7',
    borderRadius: 10,
    padding: '10px 12px',
    background: '#fafcfe',
    display: 'grid',
    gap: 7,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
  },
  empty: {
    padding: '20px 16px',
    color: 'var(--mcc-secondary, #52647a)',
    fontSize: 13,
    lineHeight: 1.55,
  },
  state: {
    minHeight: '50vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: 'var(--mcc-secondary, #52647a)',
    fontSize: 14,
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #dbe6f2',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  viewToggle: {
    border: '1px solid #dbe6f2',
    background: '#f8fafc',
    color: '#005599',
    borderRadius: 8,
    padding: '6px 11px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
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
    color: 'var(--mcc-secondary, #52647a)',
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
};
