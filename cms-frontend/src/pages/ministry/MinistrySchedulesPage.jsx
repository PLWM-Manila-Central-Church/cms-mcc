import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

const dateLabel = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PH', {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
const timeLabel = (time) => {
  if (!time) return '';
  const [hour, minute] = String(time).split(':');
  const value = new Date();
  value.setHours(Number(hour), Number(minute || 0), 0, 0);
  return value.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
};

const S = {
  page: { maxWidth: 1000, margin: '0 auto', color: 'var(--mcc-ink, #0f172a)' },
  header: { paddingBottom: 14, borderBottom: '1px solid var(--mcc-border, #e2e8f0)' },
  title: { margin: 0, fontSize: 26, fontWeight: 650, letterSpacing: '-.02em', color: '#003d70' },
  sub: { margin: '4px 0 0', fontSize: 13, color: 'var(--mcc-secondary, #52647a)' },
  panel: { marginTop: 18, border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 12, background: '#fff', padding: 16 },
  panelTitle: { margin: '0 0 10px', fontSize: 17, fontWeight: 650 },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' },
  field: { display: 'grid', gap: 4, fontSize: 12, color: 'var(--mcc-secondary, #52647a)', fontWeight: 600 },
  input: { minHeight: 38, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 7, font: 'inherit', fontSize: 13, color: 'var(--mcc-ink, #0f172a)', background: '#fff' },
  primary: { minHeight: 38, padding: '8px 14px', border: '1px solid #005599', borderRadius: 8, background: '#005599', color: '#fff', fontWeight: 650, fontSize: 13, cursor: 'pointer' },
  button: { minHeight: 34, padding: '6px 10px', border: '1px solid #c9dceb', borderRadius: 8, background: '#fff', color: '#005599', fontWeight: 650, fontSize: 12, cursor: 'pointer' },
  empty: { margin: 0, padding: '8px 0', color: 'var(--mcc-secondary, #52647a)', fontSize: 13 },
  error: { margin: '12px 0 0', padding: '10px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: 13 },
};

const KIND_LABEL = { practice: 'Practice', cleaning: 'Cleaning', service: 'Service' };

export default function MinistrySchedulesPage() {
  const [ministries, setMinistries] = useState([]);
  const [ministryId, setMinistryId] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ kind: 'practice', title: '', date: '', start_time: '', end_time: '', location: '', notes: '' });

  useEffect(() => {
    axiosInstance.get('/ministry/roles')
      .then((response) => {
        const list = (response.data.data || []).filter((role) => !role.is_deleted);
        setMinistries(list);
        if (list.length && !ministryId) setMinistryId(String(list[0].id));
      })
      .catch(() => setError('Ministries could not be loaded.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!ministryId) return;
    setError('');
    try {
      const response = await axiosInstance.get('/ministry/schedules', { params: { ministryRoleId: ministryId } });
      setSchedules(response.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Schedules could not be loaded.');
    }
  }, [ministryId]);

  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    if (!ministryId) return;
    setSaving(true); setError('');
    try {
      await axiosInstance.post('/ministry/schedules', { ...form, ministry_role_id: ministryId });
      setForm({ kind: 'practice', title: '', date: '', start_time: '', end_time: '', location: '', notes: '' });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The schedule could not be saved.');
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    setError('');
    try {
      await axiosInstance.delete(`/ministry/schedules/${id}`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The schedule could not be removed.');
    }
  };

  return (
    <section className="mcc-module" style={S.page} aria-label="Ministry schedules">
      <header style={S.header}>
        <h1 style={S.title}>Ministry Schedules</h1>
        <p style={S.sub}>Practices, cleaning duty and serving dates members see in their portal.</p>
      </header>

      {error && <div role="alert" style={S.error}>{error}</div>}

      <section style={S.panel}>
        <label style={{ ...S.field, maxWidth: 320, marginBottom: 14 }}>Ministry
          <select aria-label="Ministry" style={S.input} value={ministryId} onChange={(event) => setMinistryId(event.target.value)}>
            {ministries.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </label>

        {schedules.length === 0 ? <p style={S.empty}>No schedule entries for this ministry yet.</p> : (
          <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0 }}>
            {schedules.map((entry) => (
              <li key={entry.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, background: '#eff6ff', color: '#005599', fontSize: 11, fontWeight: 700, marginRight: 8 }}>
                    {KIND_LABEL[entry.kind] || entry.kind}
                  </span>
                  <strong style={{ fontSize: 13 }}>{entry.title}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: '#52647a', marginTop: 2 }}>
                    {[dateLabel(entry.date), [entry.startTime, entry.endTime].filter(Boolean).map(timeLabel).join('–'), entry.location].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <button type="button" style={S.button} onClick={() => remove(entry.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={S.panel}>
        <h2 style={S.panelTitle}>Add a schedule entry</h2>
        <form onSubmit={save} style={S.row}>
          <label style={S.field}>Kind
            <select aria-label="Kind" style={S.input} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
              <option value="practice">Practice</option>
              <option value="cleaning">Cleaning</option>
              <option value="service">Service</option>
            </select>
          </label>
          <label style={S.field}>Title
            <input aria-label="Title" required style={S.input} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label style={S.field}>Date
            <input aria-label="Date" type="date" required style={S.input} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </label>
          <label style={S.field}>Start
            <input aria-label="Start time" type="time" style={S.input} value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
          </label>
          <label style={S.field}>End
            <input aria-label="End time" type="time" style={S.input} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
          </label>
          <label style={S.field}>Location
            <input aria-label="Location" style={S.input} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          </label>
          <button type="submit" style={S.primary} disabled={saving || !ministryId}>{saving ? 'Saving…' : 'Add schedule'}</button>
        </form>
      </section>
    </section>
  );
}
