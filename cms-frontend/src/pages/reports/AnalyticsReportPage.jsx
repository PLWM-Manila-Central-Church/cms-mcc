import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import {
  buildAnalyticsCsvRows,
  formatReportBucket,
  formatReportGeneratedAt,
  formatReportRange,
  getAnalyticsReportScope,
  getReportPeriodRange,
} from '../../utils/analyticsReport';
import { CHURCH_REPORT_LOGO, CHURCH_REPORT_NAME } from '../../utils/reportBranding';
import { toCsv } from '../../utils/csv';
import './analyticsReport.css';

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

function TrendBars({ title, rows = [], firstKey, secondKey, firstLabel, secondLabel, bucket = 'month' }) {
  const max = Math.max(1, ...rows.flatMap((row) => [Number(row[firstKey] || 0), Number(row[secondKey] || 0)]));
  const heightFor = (value) => Number(value || 0) > 0 ? `${Math.max(2, Number(value) / max * 100)}%` : 0;
  return (
    <section style={S.panel}>
      <h2 style={S.panelTitle}>{title}</h2>
      <div style={S.legend}><span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#0f6aa3' }} />{firstLabel}</span>{secondKey && <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#13b5ea' }} />{secondLabel}</span>}</div>
      {rows.length === 0 ? <p style={S.muted}>No records for this period.</p> : (
        <div style={S.trend}>
          {rows.map((row) => (
            <div key={row.period} title={`${formatReportBucket(row.period, bucket)} · ${firstLabel}: ${row[firstKey]}${secondKey ? ` · ${secondLabel}: ${row[secondKey]}` : ''}`} style={S.monthColumn}>
              <div style={S.barPair}>
                <div style={{ ...S.trendBar, height: heightFor(row[firstKey]), minHeight: Number(row[firstKey] || 0) > 0 ? 2 : 0, background: '#0f6aa3' }} />
                {secondKey && <div style={{ ...S.trendBar, height: heightFor(row[secondKey]), minHeight: Number(row[secondKey] || 0) > 0 ? 2 : 0, background: '#13b5ea' }} />}
              </div>
              <span>{formatReportBucket(row.period, bucket).replace('Week of ', '')}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AnalyticsReportPage() {
  const { user } = useAuth();
  const reportScope = getAnalyticsReportScope(user?.roleName);
  const { canSeeFinance, canSeeMembersAndAttendance, description: reportDescription } = reportScope;
  const dateFilteredSections = canSeeFinance
    ? 'member growth, attendance, and finance summaries'
    : 'member growth and attendance summaries';
  const demographicDateNote = `Member totals and demographics use the current non-deleted roster; the selected date range applies to ${dateFilteredSections}.`;
  const isMobile = useIsMobile();
  const [dateFrom, setDateFrom] = useState(yearStart());
  const [dateTo, setDateTo] = useState(today());
  const [reportPeriod, setReportPeriod] = useState('year');
  const [data, setData] = useState(null);
  const [reportGeneratedAt, setReportGeneratedAt] = useState(null);
  const [downloadNotice, setDownloadNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) { setError('Choose a valid date range with the start date on or before the end date.'); return; }
    setLoading(true); setError('');
    try {
      const response = await axiosInstance.get('/reports/analytics', { params: { date_from: dateFrom, date_to: dateTo, period: reportPeriod } });
      setData(response.data.data);
      setReportGeneratedAt(new Date());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load the consolidated report.');
    } finally { setLoading(false); }
  }, [dateFrom, dateTo, reportPeriod]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const downloadCsv = () => {
    if (!data) return;
    const csv = toCsv(buildAnalyticsCsvRows(data, {
      ...reportScope,
      dateFrom: data.range?.from || dateFrom,
      dateTo: data.range?.to || dateTo,
      reportPeriod: data.period?.preset || reportPeriod,
      generatedAt: new Date(),
    }));
    const link = document.createElement('a');
    const blobUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.href = blobUrl;
    link.download = `plwm-mcc-analytics-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownloadNotice('Analytics CSV download requested.');
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const selectPeriod = (period) => {
    setReportPeriod(period);
    const nextRange = getReportPeriodRange(period);
    if (nextRange) {
      setDateFrom(nextRange.from);
      setDateTo(nextRange.to);
    }
  };

  const maxGrowth = Math.max(1, ...(data?.member_growth || []).map((row) => Number(row.total || 0)));
  const reportRangeLabel = data?.range ? formatReportRange(data.range) : 'Waiting for report data';
  const generatedAtLabel = reportGeneratedAt ? formatReportGeneratedAt(reportGeneratedAt) : '';
  return (
    <section className="mcc-module mcc-module-analytics-report" aria-label="Analytics report" style={{ ...S.page, padding: 0 }}>
      <header className="analytics-report-header" style={S.header}>
        <div className="analytics-report-brand">
          <img className="analytics-report-logo" src={CHURCH_REPORT_LOGO} alt="" />
          <div className="analytics-report-brand-copy">
            <p className="analytics-report-church-name">{CHURCH_REPORT_NAME}</p>
            <h1 className="workspace-page-title" style={S.title}>Consolidated Analytics</h1>
            <p style={S.subtitle}>{reportDescription}</p>
            <div className="analytics-report-meta">
              <span><strong>Report period</strong>{reportRangeLabel}</span>
              {generatedAtLabel && <span><strong>Generated</strong>{generatedAtLabel} (Asia/Manila)</span>}
            </div>
          </div>
          <span className="analytics-report-tag">ANALYTICS REPORT</span>
        </div>
        <div className="analytics-report-actions">
          <button type="button" onClick={downloadCsv} disabled={!data || loading} style={{ ...S.download, opacity: !data || loading ? 0.6 : 1 }}>Download CSV</button>
          <button className="analytics-report-print-button" type="button" onClick={() => window.print()} disabled={!data || loading}>Print / Save PDF</button>
          <small className="analytics-report-export-note">Excel-friendly five-column CSV with clear units and notes. Print / Save PDF preserves the logo and color theme.</small>
          {downloadNotice && <span className="analytics-report-download-notice" role="status" aria-live="polite">{downloadNotice}</span>}
        </div>
      </header>
      <section className="analytics-report-filters" style={{ ...S.filters, flexDirection: isMobile ? 'column' : 'row' }}>
        <label style={S.filterLabel}>Report period
          <select aria-label="Report period" value={reportPeriod} onChange={(event) => selectPeriod(event.target.value)} style={S.dateInput}>
            <option value="week">Weekly to date</option>
            <option value="month">Monthly to date</option>
            <option value="year">Annual to date</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        <label style={S.filterLabel}>From <input type="date" value={dateFrom} onChange={(event) => { setReportPeriod('custom'); setDateFrom(event.target.value); }} style={S.dateInput} /></label>
        <label style={S.filterLabel}>To <input type="date" value={dateTo} onChange={(event) => { setReportPeriod('custom'); setDateTo(event.target.value); }} style={S.dateInput} /></label>
        <button type="button" onClick={loadReport} disabled={loading || !dateFrom || !dateTo || dateFrom > dateTo} style={{ ...S.refresh, opacity: loading ? 0.7 : 1 }}>{loading ? 'Updating…' : 'Refresh report'}</button>
        {data?.range && <span style={S.muted}>{data.range.from} to {data.range.to}</span>}
      </section>
      <p style={S.footnote}>Preset dates use Asia/Manila and end today; weeks start on Sunday. Choose Custom range to enter another period.</p>
      {canSeeMembersAndAttendance && <p style={S.footnote}>{demographicDateNote}</p>}
      {error && <div role="alert" style={S.error}>{error}</div>}
      {loading && !data ? <div style={S.state}>Loading report…</div> : data && (
        <>
          {canSeeMembersAndAttendance && data.members && <>
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
            <p style={S.footnote}>Group charts show the 20 largest categories and combine the remaining categories in an Other total.</p>
            <section style={S.panel}>
              <h2 style={S.panelTitle}>Member growth</h2>
              <div style={S.growth}>{(data.member_growth || []).map((row) => <div key={row.period} style={S.growthCol} title={`${formatReportBucket(row.period, data.period?.bucket || 'month')}: ${row.total}`}><span style={{ ...S.growthBar, height: Number(row.total || 0) > 0 ? `${Math.max(2, Number(row.total) / maxGrowth * 100)}%` : 0, minHeight: Number(row.total || 0) > 0 ? 2 : 0 }} /><small>{formatReportBucket(row.period, data.period?.bucket || 'month').replace('Week of ', '')}</small></div>)}</div>
            </section>
          </>}
          {canSeeMembersAndAttendance && data.attendance && <>
            <section style={S.metricGrid}>
              <article style={S.metric}><span>Service check-ins</span><strong>{number(data.attendance.service_checkins)}</strong></article>
              <article style={S.metric}><span>Event check-ins</span><strong>{number(data.attendance.event_checkins)}</strong></article>
            </section>
            <TrendBars title="Attendance trend" rows={data.attendance.buckets || data.attendance.monthly} firstKey="service" secondKey="events" firstLabel="Services" secondLabel="Events" bucket={data.period?.bucket || 'month'} />
          </>}
          {canSeeFinance && data.finance && <section style={S.metricGrid}>
            <article style={S.metric}><span>Received income</span><strong>{money(data.finance.income)}</strong></article>
            <article style={S.metric}><span>Expenses</span><strong>{money(data.finance.expenses)}</strong></article>
            <article style={S.metric}><span>Net balance</span><strong>{money(data.finance.net)}</strong></article>
          </section>}
          {canSeeFinance && data.finance?.buckets && <TrendBars title="Finance trend" rows={data.finance.buckets} firstKey="income" secondKey="expenses" firstLabel="Received income" secondLabel="Expenses" bucket={data.period?.bucket || 'month'} />}
          <p style={S.footnote}>This report shows aggregate totals. Member names and individual giving records are not included.</p>
        </>
      )}
    </section>
  );
}

const S = {
  page: { maxWidth: 1240, margin: '0 auto', fontFamily: "'Inter', sans-serif", color: 'var(--mcc-ink, #0f172a)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 20 },
  title: { fontSize: 26, margin: 0, fontWeight: 800 },
  subtitle: { color: 'var(--mcc-secondary, #52647a)', fontSize: 14, margin: '5px 0 0' },
  download: { border: 0, borderRadius: 8, background: '#0f6aa3', color: 'var(--mcc-surface, #fff)', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' },
  filters: { display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 18, background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 10 },
  filterLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontWeight: 600, fontSize: 13 },
  dateInput: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 7, color: 'var(--mcc-ink, #0f172a)', fontFamily: 'inherit' },
  refresh: { border: 0, borderRadius: 7, background: '#0f6aa3', color: 'var(--mcc-surface, #fff)', padding: '9px 14px', fontWeight: 700, cursor: 'pointer' },
  muted: { color: 'var(--mcc-secondary, #52647a)', fontSize: 13 },
  error: { padding: 12, marginBottom: 16, borderRadius: 8, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' },
  state: { padding: 48, textAlign: 'center', color: 'var(--mcc-secondary, #52647a)' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 16 },
  metric: { display: 'flex', flexDirection: 'column', gap: 8, padding: 18, borderRadius: 10, border: '1px solid var(--mcc-border, #e2e8f0)', background: 'var(--mcc-surface, #fff)' },
  metricLabel: { color: 'var(--mcc-secondary, #52647a)', fontSize: 13 },
  twoCols: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 14 },
  panel: { padding: 18, marginBottom: 14, background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 10 },
  panelTitle: { margin: '0 0 16px', fontSize: 16 },
  barRow: { marginBottom: 12 },
  barLabel: { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5, color: '#475569', fontSize: 13 },
  track: { height: 8, borderRadius: 8, background: '#f1f5f9', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 8 },
  legend: { display: 'flex', gap: 14, color: 'var(--mcc-secondary, #52647a)', fontSize: 12, marginBottom: 8 },
  legendItem: { display: 'inline-flex', gap: 5 },
  trend: { display: 'flex', alignItems: 'stretch', gap: 8, height: 190, overflowX: 'auto', paddingTop: 8 },
  monthColumn: { display: 'flex', flex: '1 0 34px', minWidth: 34, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 7, color: 'var(--mcc-secondary, #52647a)', fontSize: 10 },
  barPair: { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', height: '100%', gap: 3 },
  trendBar: { width: 10, minHeight: 2, borderRadius: '3px 3px 0 0' },
  growth: { display: 'flex', gap: 8, alignItems: 'stretch', height: 130, overflowX: 'auto' },
  growthCol: { display: 'flex', flex: '1 0 34px', minWidth: 34, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6, color: 'var(--mcc-secondary, #52647a)' },
  growthBar: { width: '65%', minHeight: 2, background: '#0f7a55', borderRadius: '3px 3px 0 0' },
  footnote: { color: 'var(--mcc-secondary, #52647a)', fontSize: 12, margin: '4px 0 0' },
};
