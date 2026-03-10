import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function AttendanceOverviewPage() {
  const navigate = useNavigate();

  // ── Recent check-ins across all services ─────────────────
  const [services, setServices]         = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // ── Member attendance history search ─────────────────────
  const [memberSearch, setMemberSearch]     = useState('');
  const [memberResults, setMemberResults]   = useState([]);
  const [searchingMember, setSearchingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberHistory, setMemberHistory]   = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError]     = useState('');
  const searchTimeout = useRef(null);

  // ── Fetch recent published/completed services with summary ─
  const fetchRecentServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const res = await axiosInstance.get('/services?limit=10&page=1');
      setServices(res.data.data.services || []);
    } catch {}
    finally { setLoadingServices(false); }
  }, []);

  useEffect(() => { fetchRecentServices(); }, [fetchRecentServices]);

  // ── Member search ─────────────────────────────────────────
  const handleMemberSearch = (val) => {
    setMemberSearch(val);
    setSelectedMember(null);
    setMemberHistory([]);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setMemberResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingMember(true);
      try {
        const res = await axiosInstance.get(`/members?search=${encodeURIComponent(val)}&limit=6`);
        setMemberResults(res.data.data.members || []);
      } catch {}
      finally { setSearchingMember(false); }
    }, 300);
  };

  const selectMember = async (m) => {
    setSelectedMember(m);
    setMemberSearch(`${m.last_name}, ${m.first_name}`);
    setMemberResults([]);
    setLoadingHistory(true);
    setHistoryError('');
    try {
      // Fetch all services, then check attendance per service for this member
      const res = await axiosInstance.get('/services?limit=50&page=1');
      const allServices = res.data.data.services || [];

      // For each service that has attendance, check if member is in it
      const historyItems = [];
      for (const svc of allServices) {
        try {
          const attRes = await axiosInstance.get(`/services/${svc.id}/attendance`);
          const records = attRes.data.data.records || [];
          const record  = records.find(r => r.member_id === m.id);
          if (record) {
            historyItems.push({ service: svc, record });
          }
        } catch {}
      }
      setMemberHistory(historyItems);
    } catch {
      setHistoryError('Failed to load attendance history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (d) => d
    ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };
  const formatCheckedIn = (dt) => new Date(dt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  const STATUS_META = {
    draft:     { bg: '#f1f5f9', color: '#475569' },
    published: { bg: '#dcfce7', color: '#16a34a' },
    completed: { bg: '#eff6ff', color: '#2563eb' },
    cancelled: { bg: '#fef2f2', color: '#dc2626' },
  };

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Attendance</h1>
          <p style={s.subtitle}>Overview of recent services and member attendance history</p>
        </div>
      </div>

      {/* ── Member Attendance History Search ─────────────── */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>🔍 Member Attendance History</h2>
        <p style={s.sectionSub}>Search a member to see which services they attended</p>

        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <input
            value={memberSearch}
            onChange={e => handleMemberSearch(e.target.value)}
            placeholder="Search member by name, email, or barcode..."
            style={s.searchInput}
            autoComplete="off"
          />
          {searchingMember && <div style={s.searchHint}>Searching...</div>}
          {memberResults.length > 0 && (
            <div style={s.dropdown}>
              {memberResults.map(m => (
                <div key={m.id} onClick={() => selectMember(m)} style={s.dropdownItem}>
                  <div style={s.dropdownAvatar}>{m.first_name[0]}{m.last_name[0]}</div>
                  <div>
                    <div style={s.dropdownName}>{m.last_name}, {m.first_name}</div>
                    <div style={s.dropdownMeta}>{m.email || ''}{m.barcode ? ` · #${m.barcode}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Member history results */}
        {selectedMember && (
          <div style={s.historyBox}>
            <div style={s.historyHeader}>
              <div style={s.historyAvatar}>
                {selectedMember.first_name[0]}{selectedMember.last_name[0]}
              </div>
              <div>
                <div style={s.historyName}>
                  {selectedMember.last_name}, {selectedMember.first_name}
                </div>
                <div style={s.historySub}>
                  {loadingHistory
                    ? 'Loading history...'
                    : `${memberHistory.length} service${memberHistory.length !== 1 ? 's' : ''} attended`
                  }
                </div>
              </div>
            </div>

            {historyError && <div style={s.errorBox}>{historyError}</div>}

            {!loadingHistory && memberHistory.length === 0 && (
              <div style={s.emptyHistory}>No attendance records found for this member.</div>
            )}

            {memberHistory.length > 0 && (
              <div style={s.historyList}>
                {memberHistory.map(({ service: svc, record }) => {
                  const meta = STATUS_META[svc.status] || STATUS_META.completed;
                  return (
                    <div key={svc.id} style={s.historyItem}>
                      <div style={s.historyItemLeft}>
                        <div style={s.historyServiceTitle}>{svc.title}</div>
                        <div style={s.historyServiceMeta}>
                          📅 {formatDate(svc.service_date)} · 🕐 {formatTime(svc.service_time)}
                        </div>
                      </div>
                      <div style={s.historyItemRight}>
                        <span style={{ ...s.badge, background: meta.bg, color: meta.color }}>
                          {svc.status}
                        </span>
                        <div style={s.checkInTime}>
                          Checked in at {formatCheckedIn(record.checked_in_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Recent Services ───────────────────────────────── */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>📋 Recent Services</h2>
        <p style={s.sectionSub}>Click a service to view its full attendance sheet</p>

        {loadingServices ? (
          <div style={s.centerCell}>Loading...</div>
        ) : services.length === 0 ? (
          <div style={s.centerCell}>No services found.</div>
        ) : (
          <div style={s.serviceGrid}>
            {services.map(svc => {
              const meta     = STATUS_META[svc.status] || STATUS_META.draft;
              const attended = svc.ServiceAttendanceSummary?.total_attended ?? 0;
              const pct      = svc.capacity ? Math.round((attended / svc.capacity) * 100) : 0;

              return (
                <div
                  key={svc.id}
                  style={s.serviceCard}
                  onClick={() => navigate(`/services/${svc.id}/attendance`)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
                >
                  <div style={s.serviceCardTop}>
                    <div style={s.serviceCardTitle}>{svc.title}</div>
                    <span style={{ ...s.badge, background: meta.bg, color: meta.color }}>
                      {svc.status}
                    </span>
                  </div>
                  <div style={s.serviceCardMeta}>
                    📅 {formatDate(svc.service_date)} · 🕐 {formatTime(svc.service_time)}
                  </div>

                  {/* Attendance bar */}
                  <div style={s.barWrap}>
                    <div style={{ ...s.bar, width: `${Math.min(pct, 100)}%`,
                      background: pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a' }} />
                  </div>
                  <div style={s.serviceCardStats}>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{attended}</span>
                    <span style={{ color: '#94a3b8' }}> / {svc.capacity} &nbsp;({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page:               { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  title:              { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  subtitle:           { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  section:            { marginBottom: '40px' },
  sectionTitle:       { fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  sectionSub:         { fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' },
  searchInput:        { width: '100%', padding: '12px 16px', fontSize: '15px', border: '1.5px solid #d1d5db', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' },
  searchHint:         { fontSize: '13px', color: '#94a3b8', marginTop: '6px' },
  dropdown:           { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden', marginTop: '4px' },
  dropdownItem:       { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
  dropdownAvatar:     { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 },
  dropdownName:       { fontSize: '14px', fontWeight: '600', color: '#0f172a' },
  dropdownMeta:       { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  historyBox:         { marginTop: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  historyHeader:      { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' },
  historyAvatar:      { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', flexShrink: 0 },
  historyName:        { fontSize: '16px', fontWeight: '700', color: '#0f172a' },
  historySub:         { fontSize: '13px', color: '#64748b', marginTop: '2px' },
  emptyHistory:       { padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  historyList:        { display: 'flex', flexDirection: 'column', gap: '10px' },
  historyItem:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', flexWrap: 'wrap', gap: '8px' },
  historyItemLeft:    {},
  historyItemRight:   { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  historyServiceTitle:{ fontSize: '14px', fontWeight: '600', color: '#0f172a' },
  historyServiceMeta: { fontSize: '12px', color: '#64748b', marginTop: '3px' },
  checkInTime:        { fontSize: '12px', color: '#64748b' },
  badge:              { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  errorBox:           { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', margin: '12px 0' },
  centerCell:         { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  serviceGrid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  serviceCard:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  serviceCardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '8px' },
  serviceCardTitle:   { fontSize: '14px', fontWeight: '700', color: '#0f172a', flex: 1 },
  serviceCardMeta:    { fontSize: '12px', color: '#64748b', marginBottom: '12px' },
  barWrap:            { background: '#f1f5f9', borderRadius: '99px', height: '6px', overflow: 'hidden', marginBottom: '6px' },
  bar:                { height: '100%', borderRadius: '99px', transition: 'width 0.4s ease' },
  serviceCardStats:   { fontSize: '13px' },
};
