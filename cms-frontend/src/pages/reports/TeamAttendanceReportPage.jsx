import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { formatReportBucket, getReportPeriodRange } from '../../utils/analyticsReport';
import { toCsv } from '../../utils/csv';

const number = (value) => Number(value || 0).toLocaleString('en-PH');
const buttonStyle = { border: 0, borderRadius: 8, background: '#0f6aa3', color: '#fff', padding: '10px 14px', fontWeight: 700, cursor: 'pointer', minHeight: 40 };

export default function TeamAttendanceReportPage() {
  const { user } = useAuth();
  const initialRange = getReportPeriodRange('year');
  const [period, setPeriod] = useState('year');
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setError('Start date must be on or before end date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/reports/team-attendance', {
        params: { date_from: dateFrom, date_to: dateTo, period },
      });
      setData(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load your team attendance report.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, period]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const selectPeriod = (nextPeriod) => {
    setPeriod(nextPeriod);
    const range = getReportPeriodRange(nextPeriod);
    if (range) {
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  };

  const downloadCsv = () => {
    if (!data) return;
    const rows = [
      ['Section', 'Period', 'Service check-ins', 'Event check-ins'],
      ...data.attendance.buckets.map((row) => ['Attendance', row.period, row.service, row.events]),
    ];
    const blobUrl = URL.createObjectURL(new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `plwm-mcc-team-attendance-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const buckets = data?.attendance?.buckets || [];
  const max = Math.max(1, ...buckets.flatMap((row) => [Number(row.service || 0), Number(row.events || 0)]));
  const bucket = data?.period?.bucket || 'month';

  return (
    <section className="mcc-module mcc-module-team-attendance-report" aria-label="Team attendance report" style={{ maxWidth: 1240, margin: '0 auto', color: 'var(--mcc-ink, #0f172a)' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 className="workspace-page-title" style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Team attendance report</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--mcc-secondary, #52647a)', fontSize: 14 }}>Service and Event attendance for your active assigned team. Weeks start Sunday; dates use Asia/Manila.</p>
        </div>
        <button type="button" onClick={downloadCsv} disabled={!data || loading} style={{ ...buttonStyle, opacity: !data || loading ? 0.6 : 1 }}>Download CSV</button>
      </header>

      <section aria-label="Report filters" style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', padding: 14, marginBottom: 16, background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 12 }}>
        <label style={S.field}>Report period
          <select aria-label="Report period" value={period} onChange={(event) => selectPeriod(event.target.value)} style={S.input}>
            <option value="week">Weekly to date</option><option value="month">Monthly to date</option><option value="year">Annual to date</option><option value="custom">Custom range</option>
          </select>
        </label>
        <label style={S.field}>From<input aria-label="From" type="date" value={dateFrom} onChange={(event) => { setPeriod('custom'); setDateFrom(event.target.value); }} style={S.input} /></label>
        <label style={S.field}>To<input aria-label="To" type="date" value={dateTo} onChange={(event) => { setPeriod('custom'); setDateTo(event.target.value); }} style={S.input} /></label>
        <button type="button" onClick={loadReport} disabled={loading || dateFrom > dateTo} style={{ ...buttonStyle, opacity: loading || dateFrom > dateTo ? 0.6 : 1 }}>{loading ? 'Updating…' : 'Refresh report'}</button>
        {data?.range && <span style={{ color: 'var(--mcc-secondary, #52647a)', fontSize: 13 }}>{data.range.from} to {data.range.to}</span>}
      </section>

      <p style={{ color: 'var(--mcc-secondary, #52647a)', fontSize: 13, margin: '0 0 14px' }}>{data?.scope || 'Only attendance for members currently assigned to your active team scope is included.'}</p>
      {error && <div role="alert" style={{ padding: 12, marginBottom: 14, borderRadius: 8, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' }}>{error}</div>}
      {loading && !data ? <div role="status" style={{ padding: 40, textAlign: 'center', color: 'var(--mcc-secondary, #52647a)' }}>Loading attendance report…</div> : data && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
            <article style={S.metric}><span>Service check-ins</span><strong>{number(data.attendance.service_checkins)}</strong></article>
            <article style={S.metric}><span>Event check-ins</span><strong>{number(data.attendance.event_checkins)}</strong></article>
          </section>
          <section style={{ padding: 18, background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 12 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Attendance trend</h2>
            <div role="img" aria-label="Service and Event attendance trend chart. Exact period values are listed below." style={{ display: 'flex', alignItems: 'stretch', gap: 10, height: 220, overflowX: 'auto', padding: '10px 2px 0' }}>
              {buckets.map((row) => (
                <div key={row.period} title={`${formatReportBucket(row.period, bucket)} · Services ${row.service} · Events ${row.events}`} style={{ display: 'flex', flex: '1 0 58px', minWidth: 58, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 7, fontSize: 10, color: 'var(--mcc-secondary, #52647a)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, width: '100%', height: '100%' }}>
                    <span style={{ width: 14, height: Number(row.service || 0) > 0 ? `${Math.max(2, Number(row.service) / max * 100)}%` : 0, minHeight: Number(row.service || 0) > 0 ? 2 : 0, borderRadius: '4px 4px 0 0', background: '#0f6aa3' }} />
                    <span style={{ width: 14, height: Number(row.events || 0) > 0 ? `${Math.max(2, Number(row.events) / max * 100)}%` : 0, minHeight: Number(row.events || 0) > 0 ? 2 : 0, borderRadius: '4px 4px 0 0', background: '#13b5ea' }} />
                  </div>
                  <span>{formatReportBucket(row.period, bucket).replace('Week of ', '')}</span>
                </div>
              ))}
              {buckets.length === 0 && <p style={{ color: 'var(--mcc-secondary, #52647a)' }}>No attendance in this period.</p>}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, color: 'var(--mcc-secondary, #52647a)', fontSize: 12 }}><span><i style={S.serviceDot} />Services</span><span><i style={S.eventDot} />Events</span></div>
            <div style={{ overflowX: 'auto', marginTop: 14 }}>
              <table aria-label="Attendance values by period" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360, textAlign: 'left', fontSize: 13 }}>
                <thead><tr>{['Period', 'Services', 'Events', 'Total'].map((label) => <th key={label} scope="col" style={S.tableCell}>{label}</th>)}</tr></thead>
                <tbody>{buckets.map((row) => <tr key={`table-${row.period}`}>
                  <th scope="row" style={S.tableCell}>{formatReportBucket(row.period, bucket)}</th>
                  <td style={S.tableCell}>{number(row.service)}</td>
                  <td style={S.tableCell}>{number(row.events)}</td>
                  <td style={S.tableCell}>{number(Number(row.service || 0) + Number(row.events || 0))}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

const S = {
  field: { display: 'grid', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--mcc-secondary, #52647a)' },
  input: { minWidth: 150, minHeight: 40, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 8, color: 'var(--mcc-ink, #0f172a)', background: 'var(--mcc-surface, #fff)', font: 'inherit' },
  metric: { display: 'flex', flexDirection: 'column', gap: 8, padding: 18, borderRadius: 12, border: '1px solid var(--mcc-border, #e2e8f0)', background: 'var(--mcc-surface, #fff)' },
  serviceDot: { display: 'inline-block', width: 9, height: 9, marginRight: 6, borderRadius: 2, background: '#0f6aa3' },
  eventDot: { display: 'inline-block', width: 9, height: 9, marginRight: 6, borderRadius: 2, background: '#13b5ea' },
  tableCell: { padding: '9px 10px', borderBottom: '1px solid var(--mcc-border, #e2e8f0)' },
};
