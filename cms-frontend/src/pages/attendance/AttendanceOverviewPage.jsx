import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import MonoIcon from '../../components/common/MonoIcon';
import CollectionToolbar from '../../components/common/CollectionToolbar';
import CompactPagination from '../../components/common/CompactPagination';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
const PastorAttendanceReport = lazy(() => import('./PastorAttendanceReport'));

const STATUS_META = {
  draft:     { bg: '#f1f5f9', color: '#475569' },
  published: { bg: '#dcfce7', color: '#15803d' },
  completed: { bg: '#e8f4fd', color: '#005599' },
  cancelled: { bg: '#fef2f2', color: '#dc2626' },
};

const formatDate = (d) => d
  ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  : '—';
const formatTime = (t) => {
  if (!t) return '—';
  const [h, m] = String(t).split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};
const formatCheckedIn = (dt) => dt
  ? new Date(dt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

function SharedAttendanceOverviewPage({ hideHeader = false }) {
  const navigate = useNavigate();
  const { user, activeLeaderScopeKey, hasPermission } = useAuth();
  const isScopedLeader = ['Ministry Leader', 'Cell Group Leader', 'Group Leader', 'Leader'].includes(user?.roleName);
  const isCellGroupLeader = user?.roleName === 'Cell Group Leader'
    || (user?.roleName === 'Leader' && String(activeLeaderScopeKey || '').startsWith('cell_group:'));
  const canSearchMembers = hasPermission('members', 'read') && !isCellGroupLeader && user?.roleName !== 'Pastor';

  // Services table (server paginated)
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [svcSearch, setSvcSearch] = useState('');
  const [svcStatus, setSvcStatus] = useState('');
  const [svcPage, setSvcPage] = useState(1);
  const [svcLimit, setSvcLimit] = useState(15);
  const [svcTotal, setSvcTotal] = useState(0);
  const [svcTotalPages, setSvcTotalPages] = useState(1);

  // Member history
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [searchingMember, setSearchingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberHistory, setMemberHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const searchTimeout = useRef(null);

  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    setServicesError('');
    try {
      const params = new URLSearchParams({ page: svcPage, limit: svcLimit, sort: 'date_desc' });
      if (svcSearch) params.append('search', svcSearch);
      if (svcStatus) params.append('status', svcStatus);
      const res = await axiosInstance.get(`/services?${params}`);
      const d = res.data.data || {};
      setServices(d.services || []);
      setSvcTotal(Number(d.total || 0));
      setSvcTotalPages(Number(d.total_pages || 1));
    } catch (err) {
      setServicesError(apiErrorMessage(err, 'Failed to load services.'));
    } finally {
      setLoadingServices(false);
    }
  }, [svcPage, svcLimit, svcSearch, svcStatus]);

  useEffect(() => { fetchServices(); }, [fetchServices]);
  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  const loadHistory = useCallback(async (memberId, page) => {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const res = await axiosInstance.get(`/attendance/member/${memberId}/history?page=${page}&limit=10`);
      const d = res.data.data || {};
      setMemberHistory(d.records || []);
      setHistoryTotal(Number(d.total || 0));
      setHistoryTotalPages(Number(d.total_pages || 1));
    } catch (err) {
      setHistoryError(apiErrorMessage(err, 'Failed to load attendance history.'));
      setMemberHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMember) loadHistory(selectedMember.id, historyPage);
  }, [selectedMember, historyPage, loadHistory]);

  const handleMemberSearch = (val) => {
    setMemberSearch(val);
    setSelectedMember(null);
    setMemberHistory([]);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setMemberResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingMember(true);
      try {
        const res = await axiosInstance.get(`/members?search=${encodeURIComponent(val.trim())}&limit=6`);
        setMemberResults(res.data.data.members || []);
      } catch { setMemberResults([]); }
      finally { setSearchingMember(false); }
    }, 300);
  };

  const selectMember = (m) => {
    setMemberSearch(`${m.last_name}, ${m.first_name}`);
    setMemberResults([]);
    setHistoryPage(1);
    setSelectedMember(m);
  };

  return (
    <div className="mcc-module mcc-module-attendance-overview-page">
      {!hideHeader && (
        <div style={s.pageHeader}>
          <div>
            <h1 className="workspace-page-title" style={s.title}>Attendance</h1>
            <p style={s.subtitle}>
              {isCellGroupLeader
                ? 'Open a service to view attendance for your selected cell group'
                : isScopedLeader
                  ? 'Open a service to view attendance for your selected team'
                  : 'Service attendance sheets and member attendance history'}
            </p>
          </div>
          {hasPermission('qr_attendance', 'read') && (
            <button type="button" className="mcc-btn-secondary" onClick={() => navigate('/attendance/qr')}>
              <MonoIcon name="attendance" size={14} /> QR Attendance
            </button>
          )}
        </div>
      )}

      {canSearchMembers && (
        <section style={s.section}>
          <h2 style={s.sectionTitle}><MonoIcon name="search" size={16} /> Member Attendance History</h2>
          <div style={{ position: 'relative', maxWidth: 520, width: '100%' }}>
            <input
              value={memberSearch}
              onChange={(e) => handleMemberSearch(e.target.value)}
              placeholder="Search member by name, email, or barcode..."
              aria-label="Search member attendance history"
              style={s.searchInput}
              autoComplete="off"
            />
            {searchingMember && <div style={s.searchHint}>Searching…</div>}
            {memberResults.length > 0 && (
              <div style={s.dropdown}>
                {memberResults.map((m) => (
                  <button type="button" key={m.id} onClick={() => selectMember(m)} style={s.dropdownItem}>
                    <span style={s.dropdownAvatar}>{m.first_name?.[0]}{m.last_name?.[0]}</span>
                    <span style={{ textAlign: 'left' }}>
                      <span style={s.dropdownName}>{m.last_name}, {m.first_name}</span>
                      <span style={s.dropdownMeta}>{m.email || ''}{m.barcode ? ` · #${m.barcode}` : ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedMember && (
            <div style={s.historyBox}>
              <div style={s.historyHeader}>
                <strong>{selectedMember.last_name}, {selectedMember.first_name}</strong>
                <span style={s.historySub}>
                  {loadingHistory ? 'Loading…' : `${historyTotal} check-in${historyTotal === 1 ? '' : 's'} recorded`}
                </span>
              </div>
              {historyError && <div role="alert" style={s.errorBox}>{historyError}</div>}
              {!loadingHistory && !historyError && memberHistory.length === 0 && (
                <div style={s.emptyHistory}>No attendance records found for this member.</div>
              )}
              {memberHistory.length > 0 && (
                <div className="mcc-table-scroll">
                  <table style={s.table}>
                    <thead>
                      <tr><th style={s.th}>Service</th><th style={s.th}>Date</th><th style={s.th}>Method</th><th style={s.th}>Checked in</th></tr>
                    </thead>
                    <tbody>
                      {memberHistory.map((r) => (
                        <tr key={r.id}>
                          <td style={s.td}><strong>{r.service_title}</strong></td>
                          <td style={s.td}>{formatDate(r.service_date)} · {formatTime(r.service_time)}</td>
                          <td style={s.td}>{String(r.check_in_method || '—').replace(/_/g, ' ')}</td>
                          <td style={s.td}>{formatCheckedIn(r.checked_in_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <CompactPagination
                page={historyPage}
                totalPages={historyTotalPages}
                total={historyTotal}
                limit={10}
                pageSizes={[10]}
                onPageChange={setHistoryPage}
                itemLabel="records"
              />
            </div>
          )}
        </section>
      )}

      <section style={s.section}>
        <h2 style={s.sectionTitle}><MonoIcon name="clipboard" size={16} /> Services</h2>
        <CollectionToolbar
          searchValue={svcSearch}
          onSearchChange={(v) => { setSvcSearch(v); setSvcPage(1); }}
          searchPlaceholder="Search services..."
          tabs={[
            { key: '', label: 'All' },
            { key: 'published', label: 'Published' },
            { key: 'completed', label: 'Completed' },
          ]}
          activeTab={svcStatus}
          onTabChange={(v) => { setSvcStatus(v); setSvcPage(1); }}
        />
        {servicesError && <div role="alert" style={s.errorBox}>{servicesError}</div>}
        <div style={s.tableWrap}>
          <div className="mcc-table-scroll">
            <ResponsiveTable style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Service</th>
                  <th style={s.th}>Date &amp; Time</th>
                  {!isScopedLeader && <th style={s.th}>Attended</th>}
                  <th style={s.th}>Status</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Sheet</th>
                </tr>
              </thead>
              <tbody>
                {loadingServices ? (
                  <tr><td colSpan={5} style={s.centerCell}>Loading…</td></tr>
                ) : services.length === 0 ? (
                  <tr><td colSpan={5} style={s.centerCell}>No services found.</td></tr>
                ) : services.map((svc) => {
                  const meta = STATUS_META[svc.status] || STATUS_META.draft;
                  const attended = svc.ServiceAttendanceSummary?.total_attended ?? 0;
                  const preReg = svc.pre_registered_count ?? 0;
                  const display = attended > 0 ? attended : preReg;
                  return (
                    <tr key={svc.id}>
                      <td style={s.td}><strong>{svc.title}</strong></td>
                      <td style={s.td}>{formatDate(svc.service_date)} · {formatTime(svc.service_time)}</td>
                      {!isScopedLeader && (
                        <td style={s.td}>
                          <strong style={{ color: attended === 0 && preReg > 0 ? '#b45309' : '#005599' }}>{display}</strong>
                          {svc.capacity != null && <span style={{ color: '#64748b' }}> / {svc.capacity}</span>}
                          {attended === 0 && preReg > 0 && <span style={{ fontSize: 11, color: '#b45309', marginLeft: 4 }}>pre-reg</span>}
                        </td>
                      )}
                      <td style={s.td}><span style={{ ...s.badge, background: meta.bg, color: meta.color }}>{svc.status}</span></td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <button type="button" className="mcc-btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => navigate(`/services/${svc.id}/attendance`)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ResponsiveTable>
          </div>
        </div>
        <CompactPagination
          page={svcPage}
          totalPages={svcTotalPages}
          total={svcTotal}
          limit={svcLimit}
          pageSizes={[15, 25, 50]}
          onPageChange={setSvcPage}
          onLimitChange={(n) => { setSvcLimit(n); setSvcPage(1); }}
          itemLabel="services"
        />
      </section>
    </div>
  );
}

const s = {
  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  title:        { fontSize: 24, fontWeight: 700, color: 'var(--mcc-ink, #0f172a)', margin: 0 },
  subtitle:     { fontSize: 13.5, color: 'var(--mcc-secondary, #52647a)', margin: '4px 0 0' },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: 'var(--mcc-ink, #0f172a)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 },
  searchInput:  { width: '100%', padding: '10px 13px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 9, outline: 'none', boxSizing: 'border-box', background: 'var(--mcc-surface, #fff)', color: 'var(--mcc-ink, #0f172a)' },
  searchHint:   { fontSize: 12.5, color: '#64748b', marginTop: 5 },
  dropdown:     { position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden', marginTop: 4 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', cursor: 'pointer', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'transparent', width: '100%' },
  dropdownAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  dropdownName: { display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--mcc-ink, #0f172a)' },
  dropdownMeta: { display: 'block', fontSize: 12, color: '#64748b' },
  historyBox:   { marginTop: 12, background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 12, padding: 14 },
  historyHeader:{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  historySub:   { fontSize: 12.5, color: '#64748b' },
  emptyHistory: { padding: 18, textAlign: 'center', color: '#64748b', fontSize: 13.5 },
  tableWrap:    { background: 'var(--mcc-surface, #fff)', borderRadius: 12, border: '1px solid var(--mcc-border, #e2e8f0)', overflow: 'hidden' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--mcc-secondary, #52647a)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--mcc-border, #e2e8f0)', background: '#f8fafc', whiteSpace: 'nowrap' },
  td:           { padding: '10px 12px', fontSize: 13.5, color: '#374151', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  badge:        { display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, textTransform: 'capitalize' },
  errorBox:     { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, margin: '10px 0' },
  centerCell:   { padding: 32, textAlign: 'center', color: '#64748b', fontSize: 14 },
};

export default function AttendanceOverviewPage() {
  const { user } = useAuth();
  return user?.roleName === 'Pastor'
    ? (
      <>
        <Suspense fallback={<div style={{ padding: 24 }} role="status">Loading Pastor attendance report…</div>}>
          <PastorAttendanceReport />
        </Suspense>
        <div style={{ marginTop: 20 }}><SharedAttendanceOverviewPage hideHeader /></div>
      </>
    )
    : <SharedAttendanceOverviewPage />;
}
