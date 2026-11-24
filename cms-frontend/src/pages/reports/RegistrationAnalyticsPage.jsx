import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import ReportSection from '../../components/charts/ReportSection';
import MetricRail from '../../components/charts/MetricRail';
import LineTrend from '../../components/charts/LineTrend';
import RankedBars from '../../components/charts/RankedBars';
import PortalDialog from '../../components/portal/PortalDialog';
import './analyticsReport.css';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const shortDate = (value) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-PH', {
  month: 'short', day: 'numeric', timeZone: 'UTC',
});
const dateTime = (value) => new Date(value).toLocaleDateString('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const S = {
  row: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
  field: { display: 'grid', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--ar-muted)' },
  input: { minHeight: 38, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit', fontSize: 13, background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ar-muted)', borderBottom: '1px solid var(--ar-border)' },
  td: { padding: '9px 10px', borderBottom: '1px solid #f1f5f9' },
  bar: { display: 'inline-block', width: 90, height: 6, borderRadius: 99, background: '#f1f5f9', verticalAlign: 'middle', marginRight: 8 },
  fill: { display: 'block', height: '100%', borderRadius: 99, background: '#005599' },
  button: { minHeight: 34, padding: '6px 10px', border: '1px solid #c9dceb', borderRadius: 8, background: '#fff', color: '#005599', fontWeight: 650, fontSize: 12, cursor: 'pointer' },
  error: { margin: '12px 0', padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13 },
};

export default function RegistrationAnalyticsPage() {
  const [range, setRange] = useState({ from: daysAgo(89), to: today() });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await axiosInstance.get('/reports/registration', { params: range });
      setData(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Registration analytics could not be loaded.');
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const openEvent = async (id) => {
    setDetailLoading(true);
    setDetail({ id, loading: true });
    try {
      const response = await axiosInstance.get(`/reports/registration/events/${id}`);
      setDetail(response.data.data);
    } catch (requestError) {
      setDetail(null);
      setError(requestError.response?.data?.message || 'That event could not be opened.');
    } finally { setDetailLoading(false); }
  };

  const totals = data?.totals;
  const rail = useMemo(() => (totals ? [
    { label: 'Events in range', value: totals.events },
    { label: 'Registrations', value: totals.registrations },
    { label: 'Capacity fill', value: totals.fill_rate == null ? '—' : `${totals.fill_rate}%`, hint: totals.capacity ? `${totals.capacity} seats` : 'No capacity set' },
    { label: 'Seats reserved', value: totals.seats },
    { label: 'Parking reserved', value: totals.parking },
  ] : []), [totals]);

  const trendPoints = useMemo(() => (data?.timeline || []).map((point) => ({
    label: point.date, values: { cumulative: point.cumulative },
  })), [data]);

  return (
    <section className="analytics-report" aria-label="Registration analytics">
      <header className="ar-header">
        <div className="ar-brand-copy">
          <h1 className="ar-title">Registration Analytics</h1>
          <p className="ar-subtitle">Attendance and registration performance for every event and service.</p>
        </div>
        <div style={S.row}>
          <label style={S.field}>From
            <input style={S.input} type="date" aria-label="From date" value={range.from} max={range.to}
              onChange={(event) => setRange((value) => ({ ...value, from: event.target.value }))} />
          </label>
          <label style={S.field}>To
            <input style={S.input} type="date" aria-label="To date" value={range.to} min={range.from} max={today()}
              onChange={(event) => setRange((value) => ({ ...value, to: event.target.value }))} />
          </label>
        </div>
      </header>

      {error && <p role="alert" style={S.error}>{error}</p>}

      {!data ? <p className="ar-state">Loading registration analytics…</p> : (
        <>
          <div style={{ padding: '16px 0 12px', borderBottom: '1px solid var(--ar-rule)' }}>
            <MetricRail items={rail} orientation="horizontal" />
          </div>

          <div className="ar-grid">
            <ReportSection className="ar-span-8" title="Registration trend" hint="Cumulative registrations in the selected range">
              <LineTrend
                points={trendPoints}
                series={[{ key: 'cumulative', label: 'Registrations', color: '#005599' }]}
                height={200}
                valueFormat={(value) => String(value)}
                ariaLabel="Cumulative registrations"
              />
            </ReportSection>

            <ReportSection className="ar-span-4" title="Category mix" hint="Registrations by event category">
              <RankedBars rows={data.categories} limit={8} color="#005599" emptyLabel="No registrations in this range." />
            </ReportSection>

            <ReportSection className="ar-span-12" title="Events" hint="Open an event for its registration detail">
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Event</th>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Registered</th>
                    <th style={S.th}>Fill</th>
                    <th style={S.th}>Seats</th>
                    <th style={S.th} />
                  </tr>
                </thead>
                <tbody>
                  {data.events.length === 0 ? (
                    <tr><td style={S.td} colSpan={6}>No events in this range.</td></tr>
                  ) : data.events.map((event) => (
                    <tr key={event.id}>
                      <td style={S.td}>
                        <strong style={{ fontWeight: 650 }}>{event.title}</strong>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--ar-muted)' }}>{event.category}</span>
                      </td>
                      <td style={S.td}>{shortDate(event.start_date)}</td>
                      <td style={S.td}>{event.registered}{event.capacity ? ` / ${event.capacity}` : ''}</td>
                      <td style={S.td}>
                        {event.fill_rate == null ? '—' : (
                          <>
                            <span style={S.bar}><span style={{ ...S.fill, width: `${event.fill_rate}%` }} /></span>
                            {event.fill_rate}%
                          </>
                        )}
                      </td>
                      <td style={S.td}>{event.seats}</td>
                      <td style={S.td}>
                        <button type="button" style={S.button} onClick={() => openEvent(event.id)}>Open</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>

            <ReportSection className="ar-span-12" title="Attendance summary" hint="Check-ins for services in the selected range">
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 10, fontSize: 13 }}>
                <span><strong>{data.attendance.services_held}</strong> services</span>
                <span><strong>{data.attendance.check_ins}</strong> check-ins</span>
                <span><strong>{data.attendance.average}</strong> average per service</span>
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Service</th>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Present</th>
                    <th style={S.th}>Capacity</th>
                    <th style={S.th}>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attendance.rows.length === 0 ? (
                    <tr><td style={S.td} colSpan={5}>No services in this range.</td></tr>
                  ) : data.attendance.rows.map((service) => (
                    <tr key={service.id}>
                      <td style={S.td}>{service.title}</td>
                      <td style={S.td}>{shortDate(service.date)}</td>
                      <td style={S.td}>{service.present}</td>
                      <td style={S.td}>{service.capacity ?? '—'}</td>
                      <td style={S.td}>{service.rate == null ? '—' : `${service.rate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>
          </div>
        </>
      )}

      {detail && (
        <PortalDialog onClose={() => setDetail(null)} label={detail.event?.title || 'Event registration detail'} width={640}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, padding: '18px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--ar-muted)' }}>Event registration</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{detail.event?.title || 'Loading event…'}</div>
              {detail.event && <div style={{ fontSize: 12, color: 'var(--ar-muted)', marginTop: 2 }}>{shortDate(detail.event.start_date)} · {detail.event.category}</div>}
            </div>
            <button type="button" onClick={() => setDetail(null)} aria-label="Close event detail" style={{ width: 34, height: 34, borderRadius: '50%', border: 0, background: '#f1f5f9', color: '#475569', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '14px 20px 18px', display: 'grid', gap: 14 }}>
            {detailLoading && !detail.event ? <p style={{ margin: 0, color: 'var(--ar-muted)' }}>Loading…</p> : detail.event && (
              <>
                <MetricRail orientation="horizontal" items={[
                  { label: 'Registered', value: detail.event.registered },
                  { label: 'Capacity', value: detail.event.capacity ?? '—' },
                  { label: 'Fill', value: detail.event.fill_rate == null ? '—' : `${detail.event.fill_rate}%` },
                  { label: 'Seats', value: detail.event.seats },
                  { label: 'Parking', value: detail.event.parking },
                ]} />
                <LineTrend
                  points={(detail.timeline || []).map((point) => ({ label: point.date, values: { cumulative: point.cumulative } }))}
                  series={[{ key: 'cumulative', label: 'Cumulative registrations', color: '#005599' }]}
                  height={180}
                  valueFormat={(value) => String(value)}
                  ariaLabel="Cumulative registrations for this event"
                />
                <table style={S.table}>
                  <thead>
                    <tr><th style={S.th}>Registrant</th><th style={S.th}>Registered</th><th style={S.th}>Seat</th><th style={S.th}>Parking</th></tr>
                  </thead>
                  <tbody>
                    {detail.registrations.length === 0 ? (
                      <tr><td style={S.td} colSpan={4}>No registrations yet.</td></tr>
                    ) : detail.registrations.map((row) => (
                      <tr key={row.id}>
                        <td style={S.td}>{row.name}</td>
                        <td style={S.td}>{dateTime(row.registered_at)}</td>
                        <td style={S.td}>{row.seat_number ?? '—'}</td>
                        <td style={S.td}>{row.parking_slot ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </PortalDialog>
      )}
    </section>
  );
}
