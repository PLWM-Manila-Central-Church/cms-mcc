import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';

const ACTION_COLORS = {
  CREATE:  { bg: '#f0fdf4', color: '#16a34a' },
  UPDATE:  { bg: '#eff6ff', color: '#2563eb' },
  DELETE:  { bg: '#fef2f2', color: '#dc2626' },
  LOGIN:   { bg: '#f5f3ff', color: '#7c3aed' },
  LOGOUT:  { bg: '#f1f5f9', color: '#475569' },
  APPROVE: { bg: '#fffbeb', color: '#d97706' },
  DEFAULT: { bg: '#f1f5f9', color: '#475569' },
};

const TABLE_LABELS = {
  members:           '👤 Members',
  users:             '🔑 Users',
  events:            '📅 Events',
  services:          '⛪ Services',
  financial_records: '💰 Finance',
  inventory_items:   '📦 Inventory',
  archive_records:   '🗂 Archives',
  attendance:        '✅ Attendance',
};

const getActionColor = (action = '') => {
  const key = Object.keys(ACTION_COLORS).find(k => action.startsWith(k));
  return ACTION_COLORS[key] || ACTION_COLORS.DEFAULT;
};

export default function AuditLogPage() {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const [filterAction, setFilterAction]   = useState('');
  const [filterTable, setFilterTable]     = useState('');
  const [filterUserId, setFilterUserId]   = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');

  const [expanded, setExpanded] = useState(null);

  const limit = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (filterAction)   params.append('action',       filterAction);
      if (filterTable)    params.append('target_table', filterTable);
      if (filterUserId)   params.append('user_id',      filterUserId);
      if (filterDateFrom) params.append('date_from',    filterDateFrom);
      if (filterDateTo)   params.append('date_to',      filterDateTo);
      const res = await axiosInstance.get(`/audit-logs?${params}`);
      const d   = res.data.data;
      setLogs(d.logs); setTotal(d.total); setTotalPages(d.total_pages);
    } catch { setError('Failed to load audit logs.'); }
    finally { setLoading(false); }
  }, [page, filterAction, filterTable, filterUserId, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const clearFilters = () => {
    setFilterAction(''); setFilterTable(''); setFilterUserId('');
    setFilterDateFrom(''); setFilterDateTo(''); setPage(1);
  };

  const formatTs = (ts) => new Date(ts).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const hasFilters = filterAction || filterTable || filterUserId || filterDateFrom || filterDateTo;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Audit Logs</h1>
          <p style={s.subtitle}>{total.toLocaleString()} total entries</p>
        </div>
      </div>

      {/* Filters */}
      <div style={s.filterCard}>
        <div style={s.filterRow}>
          <div style={s.filterField}>
            <label style={s.filterLabel}>Action</label>
            <input value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
              placeholder="e.g. CREATE_MEMBER" style={s.filterInput} />
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>Table</label>
            <select value={filterTable} onChange={e => { setFilterTable(e.target.value); setPage(1); }} style={s.filterSelect}>
              <option value="">All Tables</option>
              {Object.keys(TABLE_LABELS).map(t => (
                <option key={t} value={t}>{TABLE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>User ID</label>
            <input type="number" value={filterUserId} onChange={e => { setFilterUserId(e.target.value); setPage(1); }}
              placeholder="User ID" style={s.filterInput} />
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>From</label>
            <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} style={s.filterInput} />
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>To</label>
            <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} style={s.filterInput} />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} style={s.clearBtn}>✕ Clear</button>
          )}
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Logs table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>#</th>
              <th style={s.th}>Timestamp</th>
              <th style={s.th}>User</th>
              <th style={s.th}>Action</th>
              <th style={s.th}>Table</th>
              <th style={s.th}>Record ID</th>
              <th style={s.th}>IP Address</th>
              <th style={s.th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={s.centerCell}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} style={s.centerCell}>No logs found.</td></tr>
            ) : logs.map((log, i) => {
              const actionStyle = getActionColor(log.action);
              const isExpanded  = expanded === log.id;
              const hasValues   = log.old_values || log.new_values;

              return (
                <>
                  <tr key={log.id}
                    style={{ ...s.row, background: i % 2 === 0 ? '#fff' : '#f8fafc', cursor: hasValues ? 'pointer' : 'default' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}
                    onClick={() => hasValues && setExpanded(isExpanded ? null : log.id)}
                  >
                    <td style={{ ...s.td, color: '#94a3b8', fontSize: '12px' }}>
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td style={{ ...s.td, fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatTs(log.created_at)}
                    </td>
                    <td style={s.td}>
                      <div style={s.userCell}>
                        <div style={s.avatar}>{log.User?.email?.[0]?.toUpperCase()}</div>
                        <span style={{ fontSize: '13px', color: '#374151' }}>{log.User?.email}</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.actionBadge, background: actionStyle.bg, color: actionStyle.color }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontSize: '13px', color: '#64748b' }}>
                      {TABLE_LABELS[log.target_table] || log.target_table || '—'}
                    </td>
                    <td style={{ ...s.td, fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
                      {log.target_id || '—'}
                    </td>
                    <td style={{ ...s.td, fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={s.td}>
                      {hasValues && (
                        <span style={s.expandBtn}>{isExpanded ? '▲ Hide' : '▼ Show'}</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded diff row */}
                  {isExpanded && (
                    <tr key={`${log.id}-detail`} style={{ background: '#f8fafc' }}>
                      <td colSpan={8} style={s.diffCell}>
                        <div style={s.diffGrid}>
                          {log.old_values && (
                            <div style={s.diffPanel}>
                              <div style={s.diffTitle}>Before</div>
                              <pre style={s.diffPre}>{JSON.stringify(log.old_values, null, 2)}</pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div style={s.diffPanel}>
                              <div style={{ ...s.diffTitle, color: '#16a34a' }}>After</div>
                              <pre style={s.diffPre}>{JSON.stringify(log.new_values, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={s.pageBtn}>← Prev</button>
          <span style={s.pageInfo}>Page {page} of {totalPages} ({total.toLocaleString()} entries)</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={s.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}

const s = {
  page:        { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:       { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  subtitle:    { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  filterCard:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  filterRow:   { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterField: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '140px' },
  filterLabel: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  filterInput: { padding: '8px 12px', fontSize: '13px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none' },
  filterSelect:{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none', background: '#fff' },
  clearBtn:    { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-end' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' },
  tableWrap:   { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  thead:       { background: '#f8fafc' },
  th:          { padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  row:         { transition: 'background 0.1s' },
  td:          { padding: '11px 14px', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  centerCell:  { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  userCell:    { display: 'flex', alignItems: 'center', gap: '8px' },
  avatar:      { width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  actionBadge: { padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace', whiteSpace: 'nowrap' },
  expandBtn:   { fontSize: '11px', color: '#2563eb', fontWeight: '600', whiteSpace: 'nowrap' },
  diffCell:    { padding: '0 14px 14px' },
  diffGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' },
  diffPanel:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' },
  diffTitle:   { fontSize: '11px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', marginBottom: '8px' },
  diffPre:     { fontSize: '11px', color: '#374151', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto' },
  pagination:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '20px' },
  pageBtn:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' },
  pageInfo:    { fontSize: '13px', color: '#64748b' },
};
