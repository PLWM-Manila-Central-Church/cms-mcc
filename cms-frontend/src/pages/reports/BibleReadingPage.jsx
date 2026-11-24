import { downloadReportCsv } from '../../utils/reportCsv';
import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import IconActionButton from '../../components/common/IconActionButton';
import { sanitizeScriptureRef } from '../../utils/inputConstraints';

const currentMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7);
const monthLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-PH', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
});
const dateLabel = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

const S = {
  page: { maxWidth: 1100, margin: '0 auto', color: 'var(--mcc-ink, #0f172a)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', paddingBottom: 14, borderBottom: '1px solid var(--mcc-border, #e2e8f0)' },
  title: { margin: 0, fontSize: 26, fontWeight: 650, letterSpacing: '-.02em', color: '#003d70' },
  sub: { margin: '4px 0 0', fontSize: 13, color: 'var(--mcc-secondary, #52647a)' },
  controls: { display: 'flex', gap: 8, alignItems: 'center' },
  button: { minHeight: 38, padding: '8px 12px', border: '1px solid #c9dceb', borderRadius: 8, background: '#fff', color: '#005599', fontWeight: 650, fontSize: 13, cursor: 'pointer' },
  primary: { minHeight: 38, padding: '8px 14px', border: '1px solid #005599', borderRadius: 8, background: '#005599', color: '#fff', fontWeight: 650, fontSize: 13, cursor: 'pointer' },
  panel: { marginTop: 18, border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 12, background: '#fff', padding: 16 },
  panelTitle: { margin: '0 0 10px', fontSize: 17, fontWeight: 650 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', color: 'var(--mcc-secondary, #52647a)', fontWeight: 650, borderBottom: '1px solid var(--mcc-border, #e2e8f0)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' },
  td: { padding: '9px 10px', borderBottom: '1px solid #f1f5f9' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 },
  field: { display: 'grid', gap: 4, fontSize: 12, color: 'var(--mcc-secondary, #52647a)', fontWeight: 600 },
  input: { minHeight: 38, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 7, font: 'inherit', fontSize: 13, color: 'var(--mcc-ink, #0f172a)', background: '#fff' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'end' },
  empty: { margin: 0, padding: '10px 0', color: 'var(--mcc-secondary, #52647a)', fontSize: 13 },
  error: { margin: '12px 0 0', padding: '10px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: 13 },
};

export default function BibleReadingPage() {
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState(null);
  const [verses, setVerses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ group_id: '', sunday_date: '', reference: '', verse_text: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const [summaryResponse, versesResponse, groupsResponse] = await Promise.all([
        axiosInstance.get('/bible-reading/summary', { params: { month } }),
        axiosInstance.get('/bible-reading/verses', { params: { month } }),
        axiosInstance.get('/members/dropdowns/groups'),
      ]);
      setSummary(summaryResponse.data.data);
      setVerses(versesResponse.data.data);
      setGroups(groupsResponse.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The reading monitor could not be loaded.');
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async (format = "csv") => {
    setError('');
    try {
      const [progress, memory] = await Promise.all([
        axiosInstance.get('/bible-reading/summary', { params: { month } }),
        axiosInstance.get('/bible-reading/verses', { params: { month } }),
      ]);
      const report = progress.data.data;
      if (report.members.length !== report.total) throw new Error('The report did not return all member progress records.');
      await downloadReportCsv(`plwm-mcc-bible-reading-${month}.csv`, 'Bible Reading', [['Report period', monthLabel(month)]], [
        { title: 'Summary', columns: ['Metric', 'Count'], records: [
          ['Members', report.total], ['Finished', report.finished], ['Target days', report.target],
        ] },
        { title: 'Member progress', columns: ['Member', 'Days completed', 'Status'],
          records: report.members.map((member) => [member.name, member.completed, member.finished ? 'Finished' : 'In progress']) },
        { title: 'Sunday memory verses', columns: ['Sunday', 'Group', 'Reference', 'Verse'],
          records: memory.data.data.map((verse) => [verse.sunday_date, verse.group, verse.reference, verse.verse_text]) },
      ], format);
    } catch (failure) {
      setError(failure.response?.data?.message || failure.message || 'The report could not be exported.');
    }
  };

  const saveVerse = async (event) => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await axiosInstance.post('/bible-reading/verses', form);
      setForm({ group_id: '', sunday_date: '', reference: '', verse_text: '' });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The memory verse could not be saved.');
    } finally { setSaving(false); }
  };

  const removeVerse = async (id) => {
    setError('');
    try {
      await axiosInstance.delete(`/bible-reading/verses/${id}`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The memory verse could not be removed.');
    }
  };

  return (
    <section className="mcc-module" style={S.page} aria-label="Bible reading monitor">
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Bible Reading</h1>
          <p style={S.sub}>Monthly reading progress and the memory verse each group carries on Sunday.</p>
        </div>
        <div style={{ ...S.controls, flexWrap: 'wrap' }}>
          <button type="button" style={S.button} onClick={() => exportCsv('xlsx')}>Download Excel</button>
          <button type="button" style={S.button} onClick={() => exportCsv('csv')}>Download CSV</button>
          <button type="button" style={S.button} onClick={() => setMonth((value) => {
            const [year, monthNumber] = value.split('-').map(Number);
            const date = new Date(Date.UTC(year, monthNumber - 2, 1));
            return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
          })} aria-label="Previous month">‹</button>
          <strong style={{ minWidth: 130, textAlign: 'center', fontSize: 13 }}>{monthLabel(month)}</strong>
          <button type="button" style={S.button} onClick={() => setMonth((value) => {
            const [year, monthNumber] = value.split('-').map(Number);
            const date = new Date(Date.UTC(year, monthNumber, 1));
            return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
          })} aria-label="Next month">›</button>
        </div>
      </header>

      {error && <div role="alert" style={S.error}>{error}</div>}

      <section style={S.panel} aria-label="Member progress">
        <h2 style={S.panelTitle}>Member progress</h2>
        {summary && (
          <p style={{ ...S.sub, marginBottom: 10 }}>
            {summary.finished} of {summary.total} members finished · target {summary.target} days
          </p>
        )}
        {!summary ? <p style={S.empty}>Loading…</p> : summary.target === 0 ? (
          <p style={S.empty}>The reading plan for this month has not been published yet.</p>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Member</th>
                <th style={S.th}>Days done</th>
                <th style={S.th}>Progress</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.members.map((member) => (
                <tr key={member.member_id}>
                  <td style={S.td}>{member.name}</td>
                  <td style={S.td}>{member.completed} / {member.target}</td>
                  <td style={S.td}>
                    <span style={{ display: 'inline-block', width: 120, height: 6, borderRadius: 99, background: '#f1f5f9', verticalAlign: 'middle', marginRight: 8 }}>
                      <span style={{ display: 'block', width: `${Math.min(100, member.percent)}%`, height: '100%', borderRadius: 99, background: '#005599' }} />
                    </span>
                    {member.percent}%
                  </td>
                  <td style={S.td}>
                    <span style={{ ...S.badge, background: member.finished ? '#dcfce7' : '#f1f5f9', color: member.finished ? '#166534' : '#52647a' }}>
                      {member.finished ? 'Finished' : 'In progress'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={S.panel} aria-label="Memory verses">
        <h2 style={S.panelTitle}>Memory verses</h2>
        {verses.length === 0 ? <p style={S.empty}>No verse assigned for this month yet.</p> : (
          <ul style={{ listStyle: 'none', margin: '0 0 14px', padding: 0 }}>
            {verses.map((verse) => (
              <li key={verse.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 13 }}>{verse.group || 'Group'}</strong>
                  <span style={{ fontSize: 12, color: '#52647a' }}> · {dateLabel(verse.sunday_date)} · {verse.reference}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#475569', marginTop: 2 }}>{verse.verse_text}</span>
                </span>
                <IconActionButton icon="archive" label="Remove" title="Remove memory verse" tone="danger" onClick={() => removeVerse(verse.id)} />
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={saveVerse} style={S.row}>
          <label style={S.field}>Group
            <select aria-label="Group" style={S.input} required value={form.group_id} onChange={(event) => setForm({ ...form, group_id: event.target.value })}>
              <option value="">Select group</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label style={S.field}>Sunday
            <input aria-label="Sunday" type="date" required style={S.input} value={form.sunday_date} onChange={(event) => setForm({ ...form, sunday_date: event.target.value })} />
          </label>
          <label style={S.field}>Reference
            <input aria-label="Reference" maxLength={80} required placeholder="Psalm 23:1-6" style={S.input} value={form.reference} onChange={(event) => setForm({ ...form, reference: sanitizeScriptureRef(event.target.value, 80) })} />
          </label>
          <label style={{ ...S.field, gridColumn: '1 / -1' }}>Verse text
            <textarea aria-label="Verse text" maxLength={1000} required rows={2} style={{ ...S.input, resize: 'vertical' }} value={form.verse_text} onChange={(event) => setForm({ ...form, verse_text: event.target.value })} />
          </label>
          <button type="submit" style={S.primary} disabled={saving}>{saving ? 'Saving…' : 'Assign verse'}</button>
        </form>
      </section>
    </section>
  );
}
