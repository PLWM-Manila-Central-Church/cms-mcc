import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import {
  averagePerBucket,
  buildAnalyticsCsvRows,
  formatReportBucket,
  formatReportGeneratedAt,
  formatReportRange,
  getAnalyticsReportScope,
  getReportPeriodRange,
  shareOf,
} from '../../utils/analyticsReport';
import { CHURCH_REPORT_BANNER } from '../../utils/reportBranding';
import { toCsv } from '../../utils/csv';
import ReportSection from '../../components/charts/ReportSection';
import MetricRail from '../../components/charts/MetricRail';
import LineTrend from '../../components/charts/LineTrend';
import DonutBreakdown from '../../components/charts/DonutBreakdown';
import RankedBars from '../../components/charts/RankedBars';
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
const compactMoney = (value) => {
  const amount = Number(value || 0);
  const trimmed = (size) => (Number.isInteger(amount / size) ? String(amount / size) : (amount / size).toFixed(1));
  if (Math.abs(amount) >= 1000000) return `PHP ${trimmed(1000000)}M`;
  if (Math.abs(amount) >= 1000) return `PHP ${trimmed(1000)}k`;
  return `PHP ${Math.round(amount)}`;
};
const bucketLabel = (period, bucket) => formatReportBucket(period, bucket).replace('Week of ', '');

export default function AnalyticsReportPage() {
  const { user } = useAuth();
  const reportScope = getAnalyticsReportScope(user?.roleName);
  const { canSeeFinance, canSeeMembersAndAttendance, description: reportDescription } = reportScope;
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
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setError('Choose a valid date range with the start date on or before the end date.');
      return;
    }
    setLoading(true); setError('');
    try {
      const response = await axiosInstance.get('/reports/analytics', {
        params: { date_from: dateFrom, date_to: dateTo, period: reportPeriod },
      });
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

  const bucket = data?.period?.bucket || 'month';
  const growthRows = data?.member_growth || [];
  const growthPoints = growthRows.map((row) => ({
    label: bucketLabel(row.period, bucket),
    values: { total: Number(row.total) || 0 },
  }));
  const peakGrowth = growthRows.reduce(
    (best, row) => (Number(row.total) > Number(best?.total || -1) ? row : best),
    null,
  );

  const attendanceBuckets = data?.attendance?.buckets || data?.attendance?.monthly || [];
  const attendancePoints = attendanceBuckets.map((row) => ({
    label: bucketLabel(row.period, bucket),
    values: { service: Number(row.service) || 0, events: Number(row.events) || 0 },
  }));
  const attendanceTotal = (Number(data?.attendance?.service_checkins) || 0)
    + (Number(data?.attendance?.event_checkins) || 0);

  const financeBuckets = data?.finance?.buckets || [];
  const financePoints = financeBuckets.map((row) => ({
    label: bucketLabel(row.period, bucket),
    values: { income: Number(row.income) || 0, expenses: Number(row.expenses) || 0 },
  }));

  const genderRows = data?.demographics?.gender || [];
  const ageRows = data?.demographics?.age_bands || [];
  const cellGroupRows = data?.demographics?.cell_groups || [];
  const ministryGroupRows = data?.demographics?.groups || [];

  const hasGroups = cellGroupRows.length > 0 || ministryGroupRows.length > 0;
  const reportRangeLabel = data?.range ? formatReportRange(data.range) : 'Waiting for report data';
  const generatedAtLabel = reportGeneratedAt ? formatReportGeneratedAt(reportGeneratedAt) : '';
  const memberTotal = Number(data?.members?.total) || 0;

  return (
    <section className="mcc-module mcc-module-analytics-report analytics-report" aria-label="Analytics report">
      <header className="ar-header">
        <div className="ar-brand">
          <img className="ar-banner" src={CHURCH_REPORT_BANNER} alt="Philippine Life Word Mission - Manila Central Church" />
          <div className="ar-brand-copy">
            <h1 className="ar-title">Consolidated Analytics</h1>
            <p className="ar-subtitle">{reportDescription}</p>
            <div className="ar-meta">
              <span><strong>Report period</strong>{reportRangeLabel}</span>
              {generatedAtLabel && <span><strong>Generated</strong>{generatedAtLabel} (Asia/Manila)</span>}
            </div>
          </div>
        </div>
        <div className="ar-actions">
          <button type="button" className="ar-button ar-button--ghost" onClick={downloadCsv} disabled={!data || loading}>Download CSV</button>
          <button type="button" className="ar-button" onClick={() => window.print()} disabled={!data || loading}>Print / Save PDF</button>
          {downloadNotice && <span className="ar-notice" role="status" aria-live="polite">{downloadNotice}</span>}
        </div>
      </header>

      <section className="ar-filters" style={{ flexDirection: isMobile ? 'column' : 'row' }} aria-label="Report filters">
        <label className="ar-field" htmlFor="analytics-period">Report period
          <select id="analytics-period" value={reportPeriod} onChange={(event) => selectPeriod(event.target.value)}>
            <option value="week">Weekly to date</option>
            <option value="month">Monthly to date</option>
            <option value="year">Annual to date</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        <label className="ar-field" htmlFor="analytics-from">From
          <input id="analytics-from" type="date" value={dateFrom} onChange={(event) => { setReportPeriod('custom'); setDateFrom(event.target.value); }} />
        </label>
        <label className="ar-field" htmlFor="analytics-to">To
          <input id="analytics-to" type="date" value={dateTo} onChange={(event) => { setReportPeriod('custom'); setDateTo(event.target.value); }} />
        </label>
        <button type="button" className="ar-button ar-button--ghost" onClick={loadReport} disabled={loading || !dateFrom || !dateTo || dateFrom > dateTo}>
          {loading ? 'Updating…' : 'Refresh report'}
        </button>
      </section>

      <p className="ar-footnote">{canSeeMembersAndAttendance && canSeeFinance
        ? 'Member totals and demographics use the current non-deleted roster; the selected range applies to member growth, attendance and finance.'
        : canSeeMembersAndAttendance
          ? 'Member totals and demographics use the current non-deleted roster; the selected range applies to member growth and attendance.'
          : canSeeFinance
            ? 'The selected date range applies to finance summaries. Member and attendance sections are not available to this role.'
            : 'No report sections are available for this role.'}</p>

      {error && <div role="alert" className="ar-error">{error}</div>}
      {loading && !data ? <p className="ar-state">Loading report…</p> : data && (
        <>
          {canSeeMembersAndAttendance && data.members && (
            <ReportSection title="Roster" hint="Current non-deleted members">
              <MetricRail
                orientation="horizontal"
                items={[
                  { label: 'Members', value: number(memberTotal) },
                  { label: 'Active', value: number(data.members.active), hint: `${shareOf(data.members.active, memberTotal)}% of roster` },
                  { label: 'Inactive', value: number(data.members.inactive), hint: `${shareOf(data.members.inactive, memberTotal)}% of roster` },
                  { label: 'New in range', value: number(data.members.new_in_range) },
                ]}
              />
            </ReportSection>
          )}

          <div className="ar-grid">
            {canSeeMembersAndAttendance && data.members && (
              <ReportSection
                title="Member growth"
                hint="New members per report interval"
                className="ar-span-8 ar-chart-section"
                data-empty={growthPoints.length === 0}
              >
                <div className="ar-chart-row">
                  <MetricRail
                    items={[
                      { label: 'New in range', value: number(data.members.new_in_range) },
                      { label: 'Peak interval', value: peakGrowth ? number(peakGrowth.total) : '0', hint: peakGrowth ? bucketLabel(peakGrowth.period, bucket) : '' },
                      { label: 'Intervals', value: number(growthPoints.length) },
                    ]}
                  />
                  <LineTrend
                    ariaLabel="Member growth by interval"
                    points={growthPoints}
                    series={[{ key: 'total', label: 'New members', color: '#005599' }]}
                  />
                </div>
              </ReportSection>
            )}

            {canSeeMembersAndAttendance && data.members && (
              <ReportSection
                title="Gender"
                hint="Share of the current roster"
                className="ar-span-4"
                data-empty={genderRows.length === 0}
              >
                <DonutBreakdown
                  ariaLabel="Gender distribution"
                  rows={genderRows}
                  total={memberTotal}
                  centerLabel="members"
                />
              </ReportSection>
            )}

            {canSeeMembersAndAttendance && data.attendance && (
              <ReportSection
                title="Attendance"
                hint="Service and event check-ins per interval"
                className="ar-span-8 ar-chart-section"
                data-empty={attendancePoints.length === 0}
              >
                <div className="ar-chart-row">
                  <MetricRail
                    items={[
                      { label: 'Service check-ins', value: number(data.attendance.service_checkins) },
                      { label: 'Event check-ins', value: number(data.attendance.event_checkins) },
                      { label: 'Average per interval', value: number(averagePerBucket(attendanceTotal, attendanceBuckets.length)), hint: `${attendanceBuckets.length} intervals` },
                    ]}
                  />
                  <LineTrend
                    ariaLabel="Attendance by interval"
                    points={attendancePoints}
                    series={[
                      { key: 'service', label: 'Services', color: '#005599' },
                      { key: 'events', label: 'Events', color: '#13b5ea' },
                    ]}
                  />
                </div>
              </ReportSection>
            )}

            {canSeeMembersAndAttendance && data.members && (
              <ReportSection
                title="Age"
                hint="Share of the current roster"
                className="ar-span-4"
                data-empty={ageRows.length === 0}
              >
                <DonutBreakdown
                  ariaLabel="Age distribution"
                  rows={ageRows}
                  total={memberTotal}
                  centerLabel="members"
                />
              </ReportSection>
            )}

            {canSeeFinance && data.finance && (
              <ReportSection
                title="Finance"
                hint="Recorded income and expenses per interval"
                className="ar-span-12 ar-chart-section"
                data-empty={financePoints.length === 0}
              >
                <div className="ar-chart-row">
                  <MetricRail
                    items={[
                      { label: 'Received income', value: compactMoney(data.finance.income), title: money(data.finance.income) },
                      { label: 'Expenses', value: compactMoney(data.finance.expenses), title: money(data.finance.expenses) },
                      { label: 'Net balance', value: compactMoney(data.finance.net), title: money(data.finance.net) },
                    ]}
                  />
                  <LineTrend
                    ariaLabel="Finance by interval"
                    points={financePoints}
                    series={[
                      { key: 'income', label: 'Received income', color: '#005599' },
                      { key: 'expenses', label: 'Expenses', color: '#5c9dc4' },
                    ]}
                    valueFormat={compactMoney}
                  />
                </div>
              </ReportSection>
            )}

            {canSeeMembersAndAttendance && hasGroups && (
              <ReportSection
                title="Groups"
                hint="Largest cell groups and ministry groups by membership"
                className="ar-span-12"
              >
                <div className="ar-groups">
                  <div className="ar-groups-col">
                    <h3 className="ar-subhead">Cell groups</h3>
                    <RankedBars rows={cellGroupRows} limit={8} emptyLabel="No cell groups recorded." />
                  </div>
                  <div className="ar-groups-col">
                    <h3 className="ar-subhead">Ministry groups</h3>
                    <RankedBars rows={ministryGroupRows} limit={8} color="#5c9dc4" emptyLabel="No ministry groups recorded." />
                  </div>
                </div>
              </ReportSection>
            )}
          </div>

          <div className="ar-print-tables">
          {canSeeMembersAndAttendance && data.demographics && (
            <table className="ar-table ar-print-only">
              <caption>Member demographics</caption>
              <thead>
                <tr>
                  <th scope="col">Dimension</th>
                  <th scope="col">Category</th>
                  <th scope="col">Members</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Gender', genderRows],
                  ['Age band', ageRows],
                  ['Cell group', cellGroupRows],
                  ['Ministry group', ministryGroupRows],
                ].flatMap(([dimension, rows]) => rows.map((row) => (
                  <tr key={`${dimension}-${row.id ?? row.label}`}>
                    <th scope="row">{dimension}</th>
                    <td>{row.label}</td>
                    <td>{number(row.total)}</td>
                    <td>{shareOf(row.total, memberTotal)}%</td>
                  </tr>
                )))}
              </tbody>
            </table>
          )}

          {canSeeMembersAndAttendance && attendanceBuckets.length > 0 && (
            <table className="ar-table ar-print-only">
              <caption>Attendance by interval</caption>
              <thead>
                <tr>
                  <th scope="col">Interval</th>
                  <th scope="col">Services</th>
                  <th scope="col">Events</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {attendanceBuckets.map((row) => (
                  <tr key={`attendance-${row.period}`}>
                    <th scope="row">{bucketLabel(row.period, bucket)}</th>
                    <td>{number(row.service)}</td>
                    <td>{number(row.events)}</td>
                    <td>{number((Number(row.service) || 0) + (Number(row.events) || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {canSeeFinance && data.finance && financeBuckets.length > 0 && (
            <table className="ar-table ar-print-only">
              <caption>Finance by interval</caption>
              <thead>
                <tr>
                  <th scope="col">Interval</th>
                  <th scope="col">Received income</th>
                  <th scope="col">Expenses</th>
                  <th scope="col">Net balance</th>
                </tr>
              </thead>
              <tbody>
                {financeBuckets.map((row) => (
                  <tr key={`finance-${row.period}`}>
                    <th scope="row">{bucketLabel(row.period, bucket)}</th>
                    <td>{money(row.income)}</td>
                    <td>{money(row.expenses)}</td>
                    <td>{money(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>

          <p className="ar-footnote">This report shows aggregate totals. Member names and individual giving records are not included. Generated by PLWM-MCC Church Management System. Switch off browser headers and footers in the print dialog for a clean sheet.</p>
        </>
      )}
    </section>
  );
}
