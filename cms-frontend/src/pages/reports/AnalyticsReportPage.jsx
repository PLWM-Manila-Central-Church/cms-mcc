import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import useIsMobile from '../../hooks/useIsMobile';

const manilaDate = () => {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const today = manilaDate;
const yearStart = () => `${manilaDate().slice(0, 4)}-01-01`;
const number = (value) => Number(value || 0).toLocaleString('en-PH');
const money = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function BarList({ title, rows = [], color = '#0f6aa3' }) {
  const max = Math.max(1, ...rows.map((item) => Number(item.total || 0)));
  return (
    <section style={S.panel}>
      <h2 style={S.panelTitle}>{title}</h2>
      {rows.length === 0 ? <p style={S.muted}>No records for this period.</p> : rows.map((item) => (
        <div key={`${item.id || ''}-${item.label}`} style={S.barRow}>
          <div style={S.barLabel}><span>{item.label}</span><strong>{number(item.total)}</strong></div>
          <div style={S.track}><div style={{ ...S.bar, width: `${Math.max(3, (Number(item.total || 0) / max) * 100)}%`, background: color }} /></div>
        </div>
      ))}
    </section>
  );
}

function TrendBars({ title, rows = [], firstKey, secondKey, firstLabel, secondLabel }) {
  const max = Math.max(1, ...rows.flatMap((row) => [Number(row[firstKey] || 0), Number(row[secondKey] || 0)]));
  return (
    <section style={S.panel}>
      <h2 style={S.panelTitle}>{title}</h2>
      <div style={S.legend}><span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#0f6aa3' }} />{firstLabel}</span><span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#13b5ea' }} />{secondLabel}</span></div>
      {rows.length === 0 ? <p style={S.muted}>No records for this period.</p> : (
        <div style={S.trend}>
          {rows.map((row) => (
            <div key={row.period} title={`${row.period} · ${firstLabel}: ${row[firstKey]} · ${secondLabel}: ${row[secondKey]}`} style={S.monthColumn}>
              <div style={S.barPair}>
                <div style={{ ...S.trendBar, height: `${Math.max(2, Number(row[firstKey] || 0) / max * 100)}%`, background: '#0f6aa3' }} />
                <div style={{ ...S.trendBar, height: `${Math.max(2, Number(row[secondKey] || 0) / max * 100)}%`, background: '#13b5ea' }} />
              </div>
              <span>{row.period.slice(2)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AnalyticsReportPage() {
  const isMobile = useIsMobile();
  const [dateFrom, setDateFrom] = useState(yearStart());
  const [dateTo, setDateTo] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    if (dateFrom > dateTo) { setError('Start date must be on or before end date.'); return; }
    setLoading(true); setError('');
    try {
      const response = await axiosInstance.get('/reports/analytics', { params: { date_from: dateFrom, date_to: dateTo } });
      setData(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load the consolidated report.');
    } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const downloadCsv = () => {
    if (!data) return;
    const rows = [['Section', 'Measure', 'Value']];
    if (data.members) {
      rows.push(['Members', 'Total', data.members.total], ['Members', 'Active', data.members.active], ['Members', 'Inactive', data.members.inactive], ['Members', 'New in range', data.members.new_in_range]);
      for (const [key, title] of [['age_bands', 'Age'], ['gender', 'Gender'], ['cell_groups', 'Cell group'], ['groups', 'Group']]) {
        for (const item of data.demographics?.[key] || []) rows.push(['Demographics', `${title}: ${item.label}`, item.total]);
      }
      for (const item of data.member_growth || []) rows.push(['Member growth', item.period, item.total]);
    }
    if (data.attendance) {
      rows.push(['Attendance', 'Service check-ins', data.attendance.service_checkins], ['Attendance', 'Event check-ins', data.attendance.event_checkins]);
      for (const item of data.attendance.monthly || []) rows.push(['Attendance', item.period, `Services ${item.service}; events ${item.events}`]);
    }
    if (data.finance) rows.push(['Finance', 'Income', data.finance.income], ['Finance', 'Expenses', data.finance.expenses], ['Finance', 'Net', data.finance.net]);
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `plwm-mcc-analytics-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };

  const maxGrowth = Math.max(1, ...(data?.member_growth || []).map((row) => Number(row.total || 0)));
  return (
    <main style={{ ...S.page, padding: isMobile ? 14 : 28 }}>
      <header style={S.header}>
        <div><h1 style={S.title}>Consolidated Analytics</h1><p style={S.subtitle}>Member population, attendance, and finance summaries for the selected period.</p></div>
        <button type="button" onClick={downloadCsv} disabled={!data || loading} style={{ ...S.download, opacity: !data || loading ? 0.6 : 1 }}>Download CSV</button>
      </header>
      <section style={{ ...S.filters, flexDirection: isMobile ? 'column' : 'row' }}>
        <label style={S.filterLabel}>From <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={S.dateInput} /></label>
        <label style={S.filterLabel}>To <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={S.dateInput} /></label>
        <button type="button" onClick={loadReport} disabled={loading || dateFrom > dateTo} style={{ ...S.refresh, opacity: loading ? 0.7 : 1 }}>{loading ? 'Updating…' : 'Refresh report'}</button>
        {data?.range && <span style={S.muted}>{data.range.from} to {data.range.to}</span>}
      </section>
      {error && <div role="alert" style={S.error}>{error}</div>}
      {loading && !data ? <div style={S.state}>Loading report…</div> : data && (
        <>
          {data.members && <>
            <section style={S.metricGrid}>
              {[
                ['Members', data.members.total], ['Active', data.members.active], ['Inactive', data.members.inactive], ['Joined in range', data.members.new_in_range],
              ].map(([label, value]) => <article key={label} style={S.metric}><span>{label}</span><strong>{number(value)}</strong></article>)}
            </section>
            <section style={S.twoCols}>
              <BarList title="Age distribution" rows={data.demographics?.age_bands} />
              <BarList title="Gender distribution" rows={data.demographics?.gender} color="#7c3aed" />
            </section>
            <section style={S.twoCols}>
              <BarList title="Cell group population" rows={data.demographics?.cell_groups} color="#0f7a55" />
              <BarList title="Group population" rows={data.demographics?.groups} color="#b76b16" />
            </section>
            <section style={S.panel}>
              <h2 style={S.panelTitle}>Member growth by month</h2>
              <div style={S.growth}>{(data.member_growth || []).map((row) => <div key={row.period} style={S.growthCol} title={`${row.period}: ${row.total}`}><span style={{ ...S.growthBar, height: `${Math.max(2, Number(row.total || 0) / maxGrowth * 100)}%` }} /><small>{row.period.slice(2)}</small></div>)}</div>
            </section>
          </>}
          {data.attendance && <>
            <section style={S.metricGrid}>
              <article style={S.metric}><span>Service check-ins</span><strong>{number(data.attendance.service_checkins)}</strong></article>
              <article style={S.metric}><span>Event check-ins</span><strong>{number(data.attendance.event_checkins)}</strong></article>
            </section>
            <TrendBars title="Attendance by month" rows={data.attendance.monthly} firstKey="service" secondKey="events" firstLabel="Services" secondLabel="Events" />
          </>}
          {data.finance && <section style={S.metricGrid}>
            <article style={S.metric}><span>Income</span><strong>{money(data.finance.income)}</strong></article>
            <article style={S.metric}><span>Expenses</span><strong>{money(data.finance.expenses)}</strong></article>
            <article style={S.metric}><span>Net</span><strong>{money(data.finance.net)}</strong></article>
          </section>}
          <p style={S.footnote}>This report shows aggregate totals. Member names and individual giving records are not included.</p>
        </>
      )}
    </main>
  );
}

const S = {
  page: { maxWidth: 1240, margin: '0 auto', fontFamily: "'Inter', sans-serif", color: '#0f172a' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 20 },
  title: { fontSize: 26, margin: 0, fontWeight: 800 },
  subtitle: { color: '#64748b', fontSize: 14, margin: '5px 0 0' },
  download: { border: 0, borderRadius: 8, background: '#0f6aa3', color: '#fff', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' },
  filters: { display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 18, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 },
  filterLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontWeight: 600, fontSize: 13 },
  dateInput: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 7, color: '#0f172a', fontFamily: 'inherit' },
  refresh: { border: 0, borderRadius: 7, background: '#0f6aa3', color: '#fff', padding: '9px 14px', fontWeight: 700, cursor: 'pointer' },
  muted: { color: '#64748b', fontSize: 13 },
  error: { padding: 12, marginBottom: 16, borderRadius: 8, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' },
  state: { padding: 48, textAlign: 'center', color: '#64748b' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 16 },
  metric: { display: 'flex', flexDirection: 'column', gap: 8, padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff' },
  metricLabel: { color: '#64748b', fontSize: 13 },
  twoCols: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 14 },
  panel: { padding: 18, marginBottom: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 },
  panelTitle: { margin: '0 0 16px', fontSize: 16 },
  barRow: { marginBottom: 12 },
  barLabel: { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5, color: '#475569', fontSize: 13 },
  track: { height: 8, borderRadius: 8, background: '#f1f5f9', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 8 },
  legend: { display: 'flex', gap: 14, color: '#64748b', fontSize: 12, marginBottom: 8 },
  legendItem: { display: 'inline-flex', gap: 5 },
  trend: { display: 'flex', alignItems: 'stretch', gap: 8, height: 190, overflowX: 'auto', paddingTop: 8 },
  monthColumn: { display: 'flex', flex: '1 0 34px', minWidth: 34, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 7, color: '#64748b', fontSize: 10 },
  barPair: { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', height: '100%', gap: 3 },
  trendBar: { width: 10, minHeight: 2, borderRadius: '3px 3px 0 0' },
  growth: { display: 'flex', gap: 8, alignItems: 'stretch', height: 130, overflowX: 'auto' },
  growthCol: { display: 'flex', flex: '1 0 34px', minWidth: 34, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6, color: '#64748b' },
  growthBar: { width: '65%', minHeight: 2, background: '#0f7a55', borderRadius: '3px 3px 0 0' },
  footnote: { color: '#64748b', fontSize: 12, margin: '4px 0 0' },
};
