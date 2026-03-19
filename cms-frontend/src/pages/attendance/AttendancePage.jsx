import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
  draft:     { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  published: { bg: '#dcfce7', color: '#16a34a', label: 'Published' },
  completed: { bg: '#e8f4fd', color: '#0066b3', label: 'Completed' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
};

export default function AttendancePage() {
  const { id: serviceId } = useParams();
  const navigate          = useNavigate();
  const { hasPermission } = useAuth();
  const canRecord         = hasPermission('attendance', 'create');

  const [service, setService]     = useState(null);
  const [records, setRecords]     = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Check-in search
  const [search, setSearch]           = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]     = useState(false);
  const [checkingIn, setCheckingIn]   = useState(null);
  const [checkInError, setCheckInError] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState('');
  const searchRef                     = useRef(null);
  const searchTimeout                 = useRef(null);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/services/${serviceId}/attendance`);
      const d   = res.data.data;
      setService(d.service);
      setRecords(d.records);
      setSummary(d.summary);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // Live member search as user types
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    setCheckInError('');
    setCheckInSuccess('');

    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axiosInstance.get(`/members?search=${encodeURIComponent(val)}&limit=8`);
        setSearchResults(res.data.data.members || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleCheckIn = async (member) => {
    setCheckingIn(member.id);
    setCheckInError('');
    setCheckInSuccess('');
    try {
      await axiosInstance.post(`/services/${serviceId}/attendance`, { member_id: member.id });
      setCheckInSuccess(`✅ ${member.first_name} ${member.last_name} checked in successfully.`);
      setSearch('');
      setSearchResults([]);
      fetchAttendance();
    } catch (err) {
      setCheckInError(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setCheckingIn(null);
    }
  };

  const handleUndoCheckIn = async (memberId, memberName) => {
    if (!window.confirm(`Remove check-in for ${memberName}?`)) return;
    try {
      await axiosInstance.delete(`/services/${serviceId}/attendance/${memberId}`);
      fetchAttendance();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to undo check-in.');
    }
  };

  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };
  const formatCheckedIn = (dt) => new Date(dt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  const isPublished = service?.status === 'published';
  const alreadyCheckedIn = (memberId) => records.some(r => r.member_id === memberId);

  if (loading) return <div style={styles.loading}>Loading attendance...</div>;
  if (error)   return <div style={styles.errorBox}>{error}</div>;

  const meta = STATUS_META[service?.status] || STATUS_META.draft;

  return (
    <div style={styles.page}>
      {/* Back */}
      <button onClick={() => navigate('/services')} style={styles.backBtn}>← Back to Services</button>

      {/* Service Header */}
      <div style={styles.serviceCard}>
        <div style={styles.serviceInfo}>
          <div style={styles.serviceTitle}>{service?.title}</div>
          <div style={styles.serviceMeta}>
            📅 {formatDate(service?.service_date)} &nbsp;·&nbsp; 🕐 {formatTime(service?.service_time)}
          </div>
        </div>
        <span style={{ ...styles.badge, background: meta.bg, color: meta.color }}>{meta.label}</span>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNum}>{records.filter(r => !r.is_pre_reg).length}</div>
          <div style={styles.summaryLabel}>Checked In</div>
        </div>
        <div style={{ ...styles.summaryCard, borderTop: '3px solid #7c3aed' }}>
          <div style={{ ...styles.summaryNum, color: '#7c3aed' }}>{records.filter(r => r.is_pre_reg).length}</div>
          <div style={styles.summaryLabel}>Pre-registered</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryNum, color: '#0066b3' }}>{service?.capacity ?? 0}</div>
          <div style={styles.summaryLabel}>Capacity</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryNum, color: '#16a34a' }}>
            {service?.capacity ? Math.round(((records.filter(r => !r.is_pre_reg).length) / service.capacity) * 100) : 0}%
          </div>
          <div style={styles.summaryLabel}>Fill Rate</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryNum, color: '#d97706' }}>
            {Math.max(0, (service?.capacity ?? 0) - records.filter(r => !r.is_pre_reg).length)}
          </div>
          <div style={styles.summaryLabel}>Remaining</div>
        </div>
      </div>

      {/* Check-in Panel (only for published services) */}
      {canRecord && isPublished && (
        <div style={styles.checkInCard}>
          <h3 style={styles.checkInTitle}>Manual Check-In</h3>
          <p style={styles.checkInHint}>Search by name, email, phone, or barcode</p>

          <div style={styles.searchWrap} ref={searchRef}>
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search member..."
              style={styles.searchInput}
              autoComplete="off"
            />
            {searching && <div style={styles.searchSpinner}>Searching...</div>}

            {searchResults.length > 0 && (
              <div style={styles.dropdown}>
                {searchResults.map(m => {
                  const checked = alreadyCheckedIn(m.id);
                  return (
                    <div key={m.id}
                      style={{ ...styles.dropdownItem, background: checked ? '#f0fdf4' : '#fff' }}
                      onClick={() => !checked && handleCheckIn(m)}
                    >
                      <div style={styles.dropdownAvatar}>
                        {m.first_name[0]}{m.last_name[0]}
                      </div>
                      <div style={styles.dropdownInfo}>
                        <div style={styles.dropdownName}>
                          {m.last_name}, {m.first_name}
                          {checked && <span style={styles.alreadyTag}> ✓ Checked In</span>}
                        </div>
                        <div style={styles.dropdownMeta}>
                          {m.barcode && <span>🏷 {m.barcode}</span>}
                          {m.email && <span> · {m.email}</span>}
                        </div>
                      </div>
                      {!checked && (
                        <button
                          style={{ ...styles.checkInBtn, opacity: checkingIn === m.id ? 0.6 : 1 }}
                          disabled={checkingIn === m.id}
                        >
                          {checkingIn === m.id ? '...' : 'Check In'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {checkInSuccess && <div style={styles.successBox}>{checkInSuccess}</div>}
          {checkInError   && <div style={styles.errorBox}>{checkInError}</div>}
        </div>
      )}

      {!isPublished && (
        <div style={styles.warningBox}>
          ⚠️ Check-in is only available for <strong>Published</strong> services.
        </div>
      )}

      {/* Attendance List */}
      <div style={styles.listHeader}>
        <h3 style={styles.listTitle}>Attendance Sheet</h3>
        <span style={styles.listCount}>{records.length} checked in</span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Member</th>
              <th style={styles.th}>Barcode</th>
              <th style={styles.th}>Method</th>
              <th style={styles.th}>Time</th>
              {canRecord && isPublished && <th style={styles.th}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={canRecord && isPublished ? 6 : 5} style={styles.centerCell}>No check-ins yet.</td></tr>
            ) : records.map((r, i) => (
              <tr key={r.id}
                style={{ ...styles.row, background: r.is_pre_reg ? '#faf5ff' : (i % 2 === 0 ? '#fff' : '#f8fafc') }}
                onMouseEnter={e => e.currentTarget.style.background = r.is_pre_reg ? '#f3e8ff' : '#e8f4fd'}
                onMouseLeave={e => e.currentTarget.style.background = r.is_pre_reg ? '#faf5ff' : (i % 2 === 0 ? '#fff' : '#f8fafc')}
              >
                <td style={{ ...styles.td, color: '#94a3b8', fontWeight: '600' }}>{i + 1}</td>
                <td style={styles.td}>
                  <div style={styles.memberCell}>
                    <div style={{ ...styles.avatar, background: r.is_pre_reg ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#005599,#13B5EA)' }}>
                      {r.Member?.first_name?.[0]}{r.Member?.last_name?.[0]}
                    </div>
                    <div>
                      <span style={styles.memberName}>
                        {r.Member?.last_name}, {r.Member?.first_name}
                      </span>
                      {r.is_pre_reg && (
                        <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginTop: 2 }}>Pre-registered — not yet checked in</div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                  {r.Member?.barcode || '—'}
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.methodBadge, ...METHOD_STYLE[r.check_in_method] }}>
                    {r.check_in_method === 'pre-reg' ? 'pre-reg' : r.check_in_method}
                  </span>
                </td>
                <td style={{ ...styles.td, color: '#64748b' }}>
                  {r.is_pre_reg ? <span style={{ color: '#a78bfa', fontSize: 12 }}>Pending check-in</span> : formatCheckedIn(r.checked_in_at)}
                </td>
                {canRecord && isPublished && (
                  <td style={styles.td}>
                    {!r.is_pre_reg && (
                      <button
                        onClick={() => handleUndoCheckIn(r.member_id, `${r.Member?.first_name} ${r.Member?.last_name}`)}
                        style={styles.undoBtn}
                      >
                        Undo
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        /* ── Responsive tables ── */
        table { width: 100%; border-collapse: collapse; }
        .table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        @media (max-width: 768px) {
          table td, table th { font-size: 12px !important; padding: 8px 10px !important; white-space: nowrap; }
        }
        @media (max-width: 480px) {
          table td, table th { font-size: 11px !important; padding: 6px 8px !important; }
        }

      `}</style>
    </div>
  );
}

const METHOD_STYLE = {
  manual:    { background: '#e8f4fd', color: '#0066b3' },
  barcode:   { background: '#f0fdf4', color: '#16a34a' },
  'pre-reg': { background: '#faf5ff', color: '#7c3aed' },
};

const styles = {
  page:          { fontFamily: "'Inter', sans-serif" },
  loading:       { padding: '48px', textAlign: 'center', color: '#94a3b8' },
  backBtn:       { background: 'none', border: 'none', color: '#0066b3', fontSize: '14px', cursor: 'pointer', fontWeight: '500', padding: '0 0 20px 0', display: 'block' },
  serviceCard:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  serviceInfo:   {},
  serviceTitle:  { fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' },
  serviceMeta:   { fontSize: '14px', color: '#64748b' },
  badge:         { padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' },
  summaryRow:    { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  summaryCard:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', flex: 1, minWidth: '120px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  summaryNum:    { fontSize: '32px', fontWeight: '800', color: '#0f172a' },
  summaryLabel:  { fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '500' },
  checkInCard:   { background: '#fff', border: '2px solid #2563eb', borderRadius: '12px', padding: '24px', marginBottom: '24px', position: 'relative' },
  checkInTitle:  { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  checkInHint:   { fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' },
  searchWrap:    { position: 'relative' },
  searchInput:   { width: '100%', padding: '12px 16px', fontSize: '15px', border: '1.5px solid #d1d5db', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' },
  searchSpinner: { fontSize: '13px', color: '#94a3b8', padding: '8px 0' },
  dropdown:      { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden', marginTop: '4px' },
  dropdownItem:  { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
  dropdownAvatar:{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 },
  dropdownInfo:  { flex: 1 },
  dropdownName:  { fontSize: '14px', fontWeight: '600', color: '#0f172a' },
  dropdownMeta:  { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  alreadyTag:    { color: '#16a34a', fontSize: '12px', fontWeight: '600' },
  checkInBtn:    { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 },
  successBox:    { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginTop: '12px' },
  errorBox:      { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginTop: '12px' },
  warningBox:    { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '20px' },
  listHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  listTitle:     { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 },
  listCount:     { fontSize: '14px', color: '#64748b', fontWeight: '600' },
  tableWrap:     { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  table:         { width: '100%', borderCollapse: 'collapse' },
  thead:         { background: '#f8fafc' },
  th:            { padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  row:           { transition: 'background 0.15s' },
  td:            { padding: '14px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  centerCell:    { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  memberCell:    { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar:        { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  memberName:    { fontWeight: '600', color: '#0f172a' },
  methodBadge:   { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  undoBtn:       { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
};
