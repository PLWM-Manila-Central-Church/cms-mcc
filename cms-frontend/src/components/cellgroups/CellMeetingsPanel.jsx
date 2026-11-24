import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { blockInvalidIntegerKeys, sanitizeScriptureRef, sanitizeWholeNumber } from '../../utils/inputConstraints';

export default function CellMeetingsPanel({ groups = [], canUpdate = false }) {
  const [alerts, setAlerts] = useState(null);
  const [selectedCellId, setSelectedCellId] = useState(groups[0]?.id || '');
  const [meetings, setMeetings] = useState([]);
  const [form, setForm] = useState({
    meeting_date: new Date().toISOString().slice(0, 10),
    lesson_topic: '',
    scripture_reference: '',
    attendees_count: '',
    visitors_count: '0',
    prayer_notes: '',
  });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!selectedCellId && groups[0]?.id) setSelectedCellId(groups[0].id);
  }, [groups, selectedCellId]);

  useEffect(() => {
    axiosInstance.get('/cellgroups/health-alerts')
      .then((res) => setAlerts(res.data?.data || null))
      .catch(() => setAlerts(null));
  }, []);

  const loadMeetings = useCallback(async () => {
    if (!selectedCellId) return;
    try {
      const res = await axiosInstance.get(`/cellgroups/${selectedCellId}/meetings`);
      setMeetings(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setMeetings([]);
    }
  }, [selectedCellId]);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  const handleLogMeeting = async (e) => {
    e.preventDefault();
    if (!selectedCellId || !form.meeting_date) return;
    try {
      await axiosInstance.post(`/cellgroups/${selectedCellId}/meetings`, {
        ...form,
        attendees_count: Number(form.attendees_count || 0),
        visitors_count: Number(form.visitors_count || 0),
      });
      setForm({ meeting_date: new Date().toISOString().slice(0, 10), lesson_topic: '', scripture_reference: '', attendees_count: '', visitors_count: '0', prayer_notes: '' });
      setNotice('Cell group meeting logged.');
      await loadMeetings();
    } catch {}
  };

  return (
    <section style={S.card} aria-label="Cell group health alerts and meeting logs">
      <div style={S.head}>
        <div>
          <h2 style={S.title}>Cell Group Health &amp; Weekly Meetings</h2>
          <p style={S.subtitle}>Monitor leaderless or quiet cell groups (30d without a logged meeting) and track weekly lessons &amp; attendance.</p>
        </div>
        {alerts && (
          <div style={S.alertStrip}>
            <span style={S.pillBlue}>{alerts.total_cell_groups} Total Cells</span>
            {alerts.leaderless_count > 0 && <span style={S.pillWarn}>{alerts.leaderless_count} Without Leader</span>}
            {alerts.quiet_30d_count > 0 && <span style={S.pillMuted}>{alerts.quiet_30d_count} Quiet (30d)</span>}
          </div>
        )}
      </div>

      {notice && <div style={S.notice}>{notice}</div>}

      <div style={S.bar}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
          Cell Group:{' '}
          <select value={selectedCellId} onChange={(e) => setSelectedCellId(e.target.value)} style={S.select}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.area ? ` (${g.area})` : ''}</option>)}
          </select>
        </label>
      </div>

      {canUpdate && selectedCellId && (
        <form onSubmit={handleLogMeeting} style={S.box}>
          <div style={S.row}>
            <input type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} style={{ ...S.input, maxWidth: 150 }} required />
            <input value={form.lesson_topic} maxLength={150} onChange={(e) => setForm({ ...form, lesson_topic: e.target.value })} placeholder="Lesson / Bible topic" style={S.input} />
            <input value={form.scripture_reference} maxLength={80} onChange={(e) => setForm({ ...form, scripture_reference: sanitizeScriptureRef(e.target.value, 80) })} placeholder="Scripture (e.g. John 15)" style={{ ...S.input, maxWidth: 160 }} />
            <input type="number" min="0" value={form.attendees_count} onKeyDown={blockInvalidIntegerKeys} onChange={(e) => setForm({ ...form, attendees_count: sanitizeWholeNumber(e.target.value, { maxLength: 4 }) })} placeholder="Attendees" style={{ ...S.input, maxWidth: 110 }} />
            <input type="number" min="0" value={form.visitors_count} onKeyDown={blockInvalidIntegerKeys} onChange={(e) => setForm({ ...form, visitors_count: sanitizeWholeNumber(e.target.value, { maxLength: 4 }) })} placeholder="Visitors" style={{ ...S.input, maxWidth: 100 }} />
            <button type="submit" style={S.primaryBtn}>Log Meeting</button>
          </div>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Lesson &amp; Scripture</th>
              <th style={S.th}>Attendees</th>
              <th style={S.th}>Visitors</th>
              <th style={S.th}>Prayer Notes</th>
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr><td colSpan={5} style={S.empty}>No meetings logged yet for this cell group.</td></tr>
            ) : meetings.map((m) => (
              <tr key={m.id} style={S.tr}>
                <td style={S.td}><strong>{m.meeting_date}</strong></td>
                <td style={S.td}>{m.lesson_topic || 'Weekly Fellowship'}{m.scripture_reference ? ` · ${m.scripture_reference}` : ''}</td>
                <td style={S.td}>{m.attendees_count || 0}</td>
                <td style={S.td}>{m.visitors_count || 0}</td>
                <td style={S.td}>{m.prayer_notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const S = {
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 17, fontWeight: 700, color: '#003d70' },
  subtitle: { margin: '3px 0 0', fontSize: 13, color: '#52647a' },
  alertStrip: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  pillBlue: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 },
  pillWarn: { background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 },
  pillMuted: { background: '#f1f5f9', color: '#475569', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 },
  bar: { display: 'flex', alignItems: 'center', gap: 10 },
  select: { padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff' },
  box: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { flex: '1 1 130px', minWidth: 0, boxSizing: 'border-box', padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 13, background: '#fff' },
  primaryBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  notice: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 11.5, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '8px 10px', color: '#0f172a' },
  empty: { padding: 18, textAlign: 'center', color: '#64748b' },
};
