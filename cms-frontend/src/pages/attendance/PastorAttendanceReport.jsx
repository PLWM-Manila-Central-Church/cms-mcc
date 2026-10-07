import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

const manilaDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const daysBefore = (date, days) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() - days);
  return result.toISOString().slice(0, 10);
};

const formatNumber = (value) => value == null ? '—' : new Intl.NumberFormat('en-PH').format(Number(value));
const formatWhen = (value) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const parseFilters = (queryString) => {
  const query = new URLSearchParams(queryString);
  const today = manilaDate();
  return {
    from: query.get('from') || daysBefore(today, 29),
    to: query.get('to') || today,
    activity_type: query.get('activity_type') || 'all',
    activity_id: query.get('activity_id') || '',
    session_id: query.get('session_id') || '',
    mode: query.get('mode') || 'all',
    page: Number(query.get('page')) || 1,
    limit: 20,
  };
};

const makeReportQuery = (filters, includePage = true) => Object.fromEntries(
  Object.entries(filters).filter(([key, value]) => (
    !['limit'].includes(key)
    && value !== ''
    && (includePage || key !== 'page')
  )),
);

const detailPathFor = (session) => session.session_id
  ? `/attendance/qr?target_type=${session.target_type}&target_id=${session.target_id}&session_id=${session.session_id}`
  : session.target_type === 'service'
    ? `/services/${session.target_id}/attendance`
    : `/events/${session.target_id}`;

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 24, fontWeight: 750 },
  subtitle: { margin: '6px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.5 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, alignItems: 'end' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, color: '#475569', fontSize: 12, fontWeight: 700 },
  input: { minHeight: 40, width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: '#fff', color: '#0f172a', font: 'inherit', fontSize: 14 },
  button: { minHeight: 40, border: 0, borderRadius: 8, padding: '9px 14px', background: '#005599', color: '#fff', fontWeight: 700, cursor: 'pointer', font: 'inherit' },
  secondaryButton: { minHeight: 36, border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 11px', background: '#fff', color: '#334155', fontWeight: 650, cursor: 'pointer', font: 'inherit', fontSize: 13 },
  sectionTitle: { margin: '0 0 12px', fontSize: 16, fontWeight: 750 },
  muted: { color: '#64748b', fontSize: 13, lineHeight: 1.5 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 },
  summaryCard: { minHeight: 92, border: '1px solid #e2e8f0', borderRadius: 12, padding: '13px 14px', background: '#fff' },
  summaryValue: { display: 'block', fontSize: 25, fontWeight: 800, color: '#0f172a' },
  summaryLabel: { display: 'block', marginTop: 4, fontSize: 12, color: '#64748b', fontWeight: 650 },
  summaryDetail: { display: 'block', marginTop: 4, fontSize: 11, color: '#94a3b8' },
  twoColumns: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: 16 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  tableWrap: { overflowX: 'auto', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: 13 },
  th: { padding: '10px 9px', textAlign: 'left', color: '#64748b', background: '#f8fafc', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' },
  td: { padding: '11px 9px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  link: { color: '#005599', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' },
  status: { display: 'inline-block', borderRadius: 999, padding: '4px 8px', background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' },
  error: { border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#991b1b', padding: 13, fontSize: 13 },
  empty: { borderRadius: 10, background: '#f8fafc', padding: 20, color: '#64748b', textAlign: 'center', fontSize: 13 },
  pager: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 },
};

const SummaryCard = ({ label, value, detail }) => (
  <div style={styles.summaryCard}>
    <span style={styles.summaryValue}>{typeof value === 'string' ? value : formatNumber(value)}</span>
    <span style={styles.summaryLabel}>{label}</span>
    {detail && <span style={styles.summaryDetail}>{detail}</span>}
  </div>
);

const Breakdown = ({ title, rows, teamType }) => (
  <section style={styles.panel} aria-label={title}>
    <h2 style={styles.sectionTitle}>{title}</h2>
    {rows.length === 0 ? (
      <div style={styles.empty}>No attendance was attributed to a {teamType} in this period.</div>
    ) : (
      <div style={styles.list}>
        {rows.map((row) => (
          <div key={row.id} style={styles.listRow}>
            <div style={{ minWidth: 0 }}>
              <strong>{row.name}</strong>
              {row.area && <span style={{ ...styles.muted, display: 'block' }}>{row.area}</span>}
              {row.current_membership_fallback_visits > 0 && (
                <span style={{ ...styles.muted, display: 'block', fontSize: 11 }}>
                  {formatNumber(row.current_membership_fallback_visits)} legacy records use current membership attribution
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <strong>{formatNumber(row.unique_members)}</strong>
              <span style={{ ...styles.muted, display: 'block' }}>
                unique · {formatNumber(row.visits)} visits
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default function PastorAttendanceReport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const activeFilters = useMemo(() => parseFilters(queryString), [queryString]);
  const [draft, setDraft] = useState(activeFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const memberSearchRequestId = useRef(0);
  const memberHistoryRequestId = useRef(0);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberHistory, setMemberHistory] = useState([]);
  const [memberHistoryPage, setMemberHistoryPage] = useState(1);
  const [memberHistoryTotal, setMemberHistoryTotal] = useState(0);
  const [memberHistoryLoading, setMemberHistoryLoading] = useState(false);
  const [memberHistoryError, setMemberHistoryError] = useState('');

  useEffect(() => setDraft(activeFilters), [activeFilters]);

  useEffect(() => {
    const currentId = ++memberSearchRequestId.current;
    const search = memberSearch.trim();
    if (search.length < 2) {
      setMemberResults([]);
      setMemberSearchLoading(false);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setMemberSearchLoading(true);
      try {
        const response = await axiosInstance.get('/attendance/pastor-report/members', { params: { search, limit: 10 } });
        if (currentId === memberSearchRequestId.current) setMemberResults(response.data.data || []);
      } catch (requestError) {
        if (currentId === memberSearchRequestId.current) {
          setMemberResults([]);
          setMemberHistoryError(requestError.response?.data?.message || 'Member search is unavailable.');
        }
      } finally {
        if (currentId === memberSearchRequestId.current) setMemberSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const loadMemberHistory = useCallback(async (page = 1) => {
    if (!selectedMember) return;
    const currentId = ++memberHistoryRequestId.current;
    setMemberHistoryLoading(true);
    setMemberHistoryError('');
    try {
      const response = await axiosInstance.get(
        `/attendance/pastor-report/members/${selectedMember.id}/history`,
        { params: {
          from: activeFilters.from,
          to: activeFilters.to,
          activity_type: activeFilters.activity_type,
          mode: 'all',
          page,
          limit: 25,
        } },
      );
      if (currentId !== memberHistoryRequestId.current) return;
      const data = response.data.data;
      setMemberHistory(data.records || []);
      setMemberHistoryPage(Number(data.pagination?.page) || page);
      setMemberHistoryTotal(Number(data.pagination?.total) || 0);
    } catch (requestError) {
      if (currentId === memberHistoryRequestId.current) {
        setMemberHistory([]);
        setMemberHistoryError(requestError.response?.data?.message || 'Member attendance history is unavailable.');
      }
    } finally {
      if (currentId === memberHistoryRequestId.current) setMemberHistoryLoading(false);
    }
  }, [activeFilters.activity_type, activeFilters.from, activeFilters.to, selectedMember]);

  useEffect(() => {
    if (selectedMember) loadMemberHistory(1);
  }, [loadMemberHistory, selectedMember]);

  useEffect(() => {
    const currentId = ++requestId.current;
    setLoading(true);
    setError('');
    axiosInstance.get('/attendance/pastor-report', { params: makeReportQuery(activeFilters) })
      .then((response) => {
        if (currentId === requestId.current) setReport(response.data.data);
      })
      .catch((requestError) => {
        if (currentId === requestId.current) {
          setError(requestError.response?.data?.message || 'The attendance report could not be loaded.');
        }
      })
      .finally(() => {
        if (currentId === requestId.current) setLoading(false);
      });
    return () => { requestId.current += 1; };
  }, [activeFilters]);

  const applyFilters = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const filters = { ...draft, page: 1 };
    for (const [key, value] of Object.entries(makeReportQuery(filters))) {
      if (value !== '' && value != null) params.set(key, String(value));
    }
    setSearchParams(params);
  };

  const setPreset = (days) => {
    const today = manilaDate();
    setDraft((current) => ({ ...current, from: days ? daysBefore(today, days - 1) : today, to: today, session_id: '', page: 1 }));
  };

  const changePage = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    setMemberSearch('');
    setMemberResults([]);
    setMemberHistoryPage(1);
  };

  const filterToSession = (session) => {
    const params = new URLSearchParams(searchParams);
    params.set('activity_type', session.target_type);
    params.set('activity_id', String(session.target_id));
    params.set('session_id', String(session.session_id));
    params.set('page', '1');
    setSearchParams(params);
  };

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const response = await axiosInstance.get('/attendance/pastor-report/export.csv', {
        params: makeReportQuery(activeFilters, false),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pastor-attendance-${activeFilters.from}-to-${activeFilters.to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Let the browser start consuming the Blob URL before revoking it.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The attendance export could not be generated.');
    } finally { setExporting(false); }
  };

  const sessionOptions = (report?.sessions || []).filter((session) => session.session_id).map((session) => (
    <option key={session.session_id} value={session.session_id}>
      {session.activity_title} · {session.session_title} · {session.activity_date || 'No date'}
    </option>
  ));
  const activityOptions = (report?.activity_options || [])
    .filter((activity) => draft.activity_type === 'all' || activity.type === draft.activity_type);
  const maxTrendVisits = Math.max(
    1,
    ...(report?.trends || []).map((point) => point.service_visits + point.event_visits),
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Pastor Attendance Report</h1>
          <p style={styles.subtitle}>Church-wide Service and Event attendance. Use the activity and session filters to drill into the records; this view is read-only.</p>
        </div>
        <button type="button" style={styles.secondaryButton} disabled={exporting || !report?.sessions?.length} onClick={exportCsv}>
          {exporting ? 'Preparing CSV…' : 'Export filtered report'}
        </button>
      </header>

      <form style={styles.panel} onSubmit={applyFilters}>
        <div style={styles.filterGrid}>
          <label style={styles.field}>Period start
            <input style={styles.input} type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value, page: 1 })} />
          </label>
          <label style={styles.field}>Period end
            <input style={styles.input} type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value, page: 1 })} />
          </label>
          <label style={styles.field}>Activity type
            <select style={styles.input} value={draft.activity_type} onChange={(event) => setDraft({ ...draft, activity_type: event.target.value, activity_id: '', session_id: '', page: 1 })}>
              <option value="all">Services and Events</option>
              <option value="service">Services</option>
              <option value="event">Events</option>
            </select>
          </label>
          <label style={styles.field}>Activity
            <select
              style={styles.input}
              value={draft.activity_id ? `${draft.activity_type}:${draft.activity_id}` : ''}
              onChange={(event) => {
                if (!event.target.value) {
                  setDraft({ ...draft, activity_id: '', session_id: '', page: 1 });
                  return;
                }
                const [activityType, activityId] = event.target.value.split(':');
                setDraft({ ...draft, activity_type: activityType, activity_id: activityId, session_id: '', page: 1 });
              }}
            >
              <option value="">All activities</option>
              {activityOptions.map((activity) => (
                <option key={`${activity.type}:${activity.id}`} value={`${activity.type}:${activity.id}`}>
                  {activity.type === 'service' ? 'Service' : 'Event'} · {activity.title} · {activity.date || 'No date'}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.field}>Session
            <select style={styles.input} value={draft.session_id} onChange={(event) => setDraft({ ...draft, session_id: event.target.value, page: 1 })}>
              <option value="">All sessions</option>
              {sessionOptions}
            </select>
          </label>
          <label style={styles.field}>Session mode
            <select style={styles.input} value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value, session_id: '', page: 1 })}>
              <option value="all">All states</option>
              <option value="active">Active and draft</option>
              <option value="history">Closed history</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={styles.secondaryButton} onClick={() => setPreset(1)}>Today</button>
            <button type="button" style={styles.secondaryButton} onClick={() => setPreset(30)}>30 days</button>
            <button type="submit" style={styles.button}>Apply filters</button>
          </div>
        </div>
        <p style={{ ...styles.muted, marginBottom: 0 }}>Dates use {report?.filters.time_zone || 'Asia/Manila'}. Unique people and session visits are shown separately; team dimensions are not added together.</p>
      </form>

      {error && <div role="alert" style={styles.error}>{error}</div>}
      {loading && <div role="status" style={styles.empty}>Loading the filtered attendance report…</div>}
      {!loading && !error && report && (
        <>
          <section style={styles.summaryGrid} aria-label="Attendance overview totals">
            <SummaryCard label="Confirmed visits" value={report.summary.confirmed_visits} detail={`${formatNumber(report.summary.service_visits)} Service · ${formatNumber(report.summary.event_session_visits)} Event-session visits`} />
            <SummaryCard label="Unique attendees" value={report.summary.unique_attendees} detail="Distinct people across the selected period" />
            <SummaryCard label="Expected attendance" value={report.summary.expected_sessions ? report.summary.expected_visits : null} detail={`${formatNumber(report.summary.expected_sessions)} sessions have a frozen expected roster`} />
            <SummaryCard label="Awaiting review" value={report.summary.awaiting_review} detail={`${formatNumber(report.review_health.submitted_batches)} submitted batches`} />
            <SummaryCard label="Provisional missing" value={report.summary.provisional_missing} detail={`${formatNumber(report.summary.provisional_sessions)} closed sessions need reconciliation`} />
            <SummaryCard label="Final absent" value={report.summary.final_absent} detail={`${formatNumber(report.summary.finalized_sessions)} sessions are finalized`} />
            <SummaryCard label="Unique Event attendees" value={report.summary.event_unique_participants} detail="Distinct across selected Events; per-Event totals below" />
          </section>

          <section style={styles.panel} aria-label="Attendance trends">
            <h2 style={styles.sectionTitle}>Attendance trends</h2>
            <p style={styles.muted}>Each date separates Service and Event visits from distinct people.</p>
            {report.trends.length === 0 ? <div style={styles.empty}>No attendance records exist for this period.</div> : (
              <>
                <div style={{ ...styles.list, marginBottom: 16 }} role="list" aria-label="Daily Service and Event attendance visits">
                  {report.trends.map((point) => {
                    const serviceWidth = Math.max(0, Math.round((point.service_visits / maxTrendVisits) * 100));
                    const eventWidth = Math.max(0, Math.round((point.event_visits / maxTrendVisits) * 100));
                    return (
                      <div key={`bar-${point.date}`} style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', alignItems: 'center', gap: 8 }} role="listitem">
                        <time style={{ ...styles.muted, fontSize: 11 }}>{point.date}</time>
                        <div aria-label={`${point.date}: ${point.service_visits} Service visits and ${point.event_visits} Event visits`} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ height: 6, width: `${serviceWidth}%`, minWidth: point.service_visits ? 3 : 0, borderRadius: 999, background: '#005599' }} />
                          <div style={{ height: 6, width: `${eventWidth}%`, minWidth: point.event_visits ? 3 : 0, borderRadius: 999, background: '#7c3aed' }} />
                        </div>
                        <span style={{ ...styles.muted, fontSize: 11, gridColumn: '2 / 3', textAlign: 'left' }}>
                          Service {formatNumber(point.service_visits)} visits / {formatNumber(point.service_unique_members)} unique · Event {formatNumber(point.event_visits)} / {formatNumber(point.event_unique_members)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={styles.tableWrap}>
                  <table style={{ ...styles.table, minWidth: 650 }}>
                    <thead><tr>
                      <th style={styles.th}>Date</th><th style={styles.th}>Service visits</th><th style={styles.th}>Service unique</th>
                      <th style={styles.th}>Event visits</th><th style={styles.th}>Event unique</th>
                    </tr></thead>
                    <tbody>{report.trends.map((point) => (
                      <tr key={point.date}>
                        <td style={styles.td}>{point.date}</td>
                        <td style={styles.td}>{formatNumber(point.service_visits)}</td>
                        <td style={styles.td}>{formatNumber(point.service_unique_members)}</td>
                        <td style={styles.td}>{formatNumber(point.event_visits)}</td>
                        <td style={styles.td}>{formatNumber(point.event_unique_members)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section style={styles.panel} aria-label="Event-wide unique attendance and session visits">
            <h2 style={styles.sectionTitle}>Event participation</h2>
            <p style={styles.muted}>Unique participants are counted once per Event; session visits count a member again when they attend another session.</p>
            {report.event_activity_summary.length === 0 ? <div style={styles.empty}>No Events match the selected period and filters.</div> : (
              <div style={styles.tableWrap}>
                <table style={{ ...styles.table, minWidth: 650 }}>
                  <thead><tr>
                    <th style={styles.th}>Event</th><th style={styles.th}>Date</th><th style={styles.th}>QR sessions</th>
                    <th style={styles.th}>Unique participants</th><th style={styles.th}>Session visits</th><th style={styles.th}>Registered</th>
                  </tr></thead>
                  <tbody>{report.event_activity_summary.map((event) => (
                    <tr key={event.event_id}>
                      <td style={styles.td}>{event.title}</td>
                      <td style={styles.td}>{event.start_date || '—'}</td>
                      <td style={styles.td}>{formatNumber(event.qr_session_count)}</td>
                      <td style={styles.td}>{formatNumber(event.unique_participants)}</td>
                      <td style={styles.td}>{formatNumber(event.session_visits)}</td>
                      <td style={styles.td}>{formatNumber(event.registered_count)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>

          <section style={styles.panel} aria-label="Pastor member attendance drilldown">
            <h2 style={styles.sectionTitle}>Member attendance history</h2>
            <p style={styles.muted}>Search by member name. This view returns attendance status and provenance without email, phone or barcode fields.</p>
            <div style={{ position: 'relative', maxWidth: 540 }}>
              <input
                style={styles.input}
                value={memberSearch}
                onChange={(event) => { setMemberSearch(event.target.value); setMemberHistoryError(''); }}
                placeholder="Search a member by first or last name"
                aria-label="Search member attendance history"
                autoComplete="off"
              />
              {memberSearchLoading && <div role="status" style={styles.muted}>Searching…</div>}
              {memberSearch.trim().length > 0 && memberSearch.trim().length < 2 && <div style={styles.muted}>Enter at least two characters.</div>}
              {memberSearch.length >= 2 && !memberSearchLoading && memberResults.length === 0 && !memberHistoryError && <div style={styles.muted}>No matching members.</div>}
              {memberResults.length > 0 && (
                <div role="listbox" aria-label="Matching members" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 9, boxShadow: '0 8px 22px rgba(15,23,42,.14)', maxHeight: 260, overflowY: 'auto' }}>
                  {memberResults.map((member) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      key={member.id}
                      onClick={() => selectMember(member)}
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 12, padding: '10px 12px', border: 0, borderBottom: '1px solid #f1f5f9', background: '#fff', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
                    >
                      <span>{member.last_name}, {member.first_name}</span>
                      <span style={styles.muted}>{member.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {memberHistoryError && <div role="alert" style={{ ...styles.error, marginTop: 12 }}>{memberHistoryError}</div>}
            {selectedMember && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <strong>{selectedMember.last_name}, {selectedMember.first_name} · {selectedMember.status}</strong>
                  <button type="button" style={styles.secondaryButton} onClick={() => { setSelectedMember(null); setMemberHistory([]); setMemberHistoryTotal(0); }}>
                    Clear member
                  </button>
                </div>
                {memberHistoryLoading ? <div role="status" style={styles.empty}>Loading this member’s attendance…</div>
                  : memberHistory.length === 0 ? <div style={styles.empty}>No attendance records match the selected period.</div>
                    : <div style={styles.tableWrap}>
                      <table style={{ ...styles.table, minWidth: 740 }}>
                        <thead><tr>
                          <th style={styles.th}>Activity</th><th style={styles.th}>Session</th><th style={styles.th}>Checked in</th>
                          <th style={styles.th}>Source / method</th><th style={styles.th}>Status</th>
                        </tr></thead>
                        <tbody>{memberHistory.map((record) => (
                          <tr key={`${record.activity_type}:${record.attendance_id}`}>
                            <td style={styles.td}>{record.activity_title}<span style={{ ...styles.muted, display: 'block' }}>{record.activity_type} · {record.activity_date || 'No date'}</span></td>
                            <td style={styles.td}>{record.session_title || 'Legacy attendance'}</td>
                            <td style={styles.td}>{formatWhen(record.checked_in_at)}</td>
                            <td style={styles.td}>{record.entry_source || 'legacy'} · {record.check_in_method}</td>
                            <td style={styles.td}>{record.status}{record.void_reason ? <span style={{ ...styles.muted, display: 'block' }}>{record.void_reason}</span> : null}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                      <div style={styles.pager}>
                        <span style={styles.muted}>Page {memberHistoryPage} · {formatNumber(memberHistoryTotal)} records</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" style={styles.secondaryButton} disabled={memberHistoryLoading || memberHistoryPage <= 1} onClick={() => loadMemberHistory(memberHistoryPage - 1)}>Previous</button>
                          <button type="button" style={styles.secondaryButton} disabled={memberHistoryLoading || memberHistoryPage * 25 >= memberHistoryTotal} onClick={() => loadMemberHistory(memberHistoryPage + 1)}>Next</button>
                        </div>
                      </div>
                    </div>}
              </div>
            )}
          </section>

          <div style={styles.twoColumns}>
            <Breakdown title="Cell-group breakdown" rows={report.team_breakdown.cell_groups} teamType="cell group" />
            <Breakdown title="Group breakdown" rows={report.team_breakdown.groups} teamType="group" />
          </div>

          <section style={styles.panel} aria-label="Attendance review health">
            <h2 style={styles.sectionTitle}>Review and reconciliation health</h2>
            <div style={styles.summaryGrid}>
              <SummaryCard label="Submitted batches" value={report.review_health.submitted_batches} />
              <SummaryCard label="Unique entries awaiting approval" value={report.review_health.awaiting_review} />
              <SummaryCard label="Oldest awaiting review" value={formatWhen(report.review_health.oldest_pending_at)} />
              <SummaryCard label="Sessions awaiting finalization" value={report.review_health.sessions_requiring_finalization} />
            </div>
          </section>

          <section style={styles.panel} aria-label="Service and Event attendance sessions">
            <h2 style={styles.sectionTitle}>Service and Event sessions</h2>
            <p style={styles.muted}>Open a row to inspect scoped session records. Pastor actions remain read-only.</p>
            {report.sessions.length === 0 ? <div style={styles.empty}>No attendance sessions match these filters. Unsessioned legacy Services remain available in Recent Services below.</div> : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead><tr>
                    <th style={styles.th}>Activity / session</th><th style={styles.th}>State</th><th style={styles.th}>Confirmed</th>
                    <th style={styles.th}>Expected / present</th><th style={styles.th}>Awaiting review</th>
                    <th style={styles.th}>Reconciliation</th><th style={styles.th}>Open</th>
                  </tr></thead>
                  <tbody>{report.sessions.map((session) => (
                    <tr key={session.session_id || `${session.target_type}:${session.target_id}:legacy`}>
                      <td style={styles.td}>
                        <strong>{session.activity_title}</strong>
                        <span style={{ ...styles.muted, display: 'block' }}>{session.session_title} · {session.activity_date || 'No activity date'}</span>
                      </td>
                      <td style={styles.td}><span style={styles.status}>{session.session_status}</span></td>
                      <td style={styles.td}>{formatNumber(session.confirmed_visits)} visits<br /><span style={styles.muted}>{formatNumber(session.unique_attendees)} unique</span></td>
                      <td style={styles.td}>{session.expected_count == null ? '—' : `${formatNumber(session.expected_present_count)} / ${formatNumber(session.expected_count)}`}</td>
                      <td style={styles.td}>{formatNumber(session.awaiting_review)}</td>
                      <td style={styles.td}>
                        {session.finalization_status === 'finalized'
                          ? `${formatNumber(session.final_absent)} final absent`
                          : session.finalization_status === 'provisional'
                            ? `${formatNumber(session.provisional_missing)} provisional missing`
                          : session.finalization_status === 'no_session' ? 'No QR session'
                            : session.expected_count == null ? 'No expected roster' : 'In progress'}
                      </td>
                      <td style={styles.td}>
                        <a style={styles.link} href={detailPathFor(session)} onClick={(event) => { event.preventDefault(); navigate(detailPathFor(session)); }}>
                          Read details
                        </a>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div style={styles.pager}>
              <span style={styles.muted}>Page {report.pagination.page} of {Math.max(report.pagination.total_pages, 1)} · {formatNumber(report.pagination.total)} activities / sessions</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={styles.secondaryButton} disabled={loading || report.pagination.page <= 1} onClick={() => changePage(report.pagination.page - 1)}>Previous</button>
                <button type="button" style={styles.secondaryButton} disabled={loading || report.pagination.page >= report.pagination.total_pages} onClick={() => changePage(report.pagination.page + 1)}>Next</button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
