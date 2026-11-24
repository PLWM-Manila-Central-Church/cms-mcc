import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useConfirmation } from '../../context/ConfirmationContext';
import IconActionButton from '../common/IconActionButton';
import { displayMemberName } from '../../utils/displayIdentity';
import { blockInvalidIntegerKeys, sanitizePersonName, sanitizeWholeNumber } from '../../utils/inputConstraints';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GATHERING_TYPES = [
  { value: 'lords_day', label: "Lord's Day Service" },
  { value: 'wednesday_service', label: 'Wednesday Service' },
  { value: 'hs_ya_service', label: 'HS / YA Service' },
  { value: 'bible_seminar', label: 'Bible Seminar' },
  { value: 'prayer_meeting', label: 'Prayer Meeting' },
  { value: 'other', label: 'Other' },
];

export default function ServicePlannerPanel({
  services = [],
  canCreate = false,
  canUpdate = false,
  initialTab = 'program',
  initialServiceId = '',
  embedded = false,
  onServicesGenerated,
}) {
  const { confirm } = useConfirmation();
  const [tab, setTab] = useState(initialTab);
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId || services[0]?.id || '');
  const [rules, setRules] = useState([]);
  const [program, setProgram] = useState([]);
  const [servants, setServants] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [ruleForm, setRuleForm] = useState({ title: "Lord's Day Service", gathering_type: 'lords_day', day_of_week: '0', start_time: '09:00', venue: 'Main Sanctuary' });
  const [progForm, setProgForm] = useState({ segment_type: 'worship', title: '', start_time: '', duration_minutes: '15', assigned_person: '' });

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialServiceId) setSelectedServiceId(String(initialServiceId));
  }, [initialServiceId]);

  useEffect(() => {
    if (services.length === 0) return;
    const exists = services.some((s) => String(s.id) === String(selectedServiceId));
    if (!selectedServiceId || !exists) setSelectedServiceId(String(services[0].id));
  }, [services, selectedServiceId]);

  const loadRules = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/services/recurrence');
      setRules(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setRules([]);
      setError(apiErrorMessage(err, 'Failed to load recurring rules.'));
    }
  }, []);

  const loadServiceDetails = useCallback(async () => {
    if (!selectedServiceId) return;
    try {
      const [pRes, sRes] = await Promise.all([
        axiosInstance.get(`/services/${selectedServiceId}/program`),
        axiosInstance.get(`/services/${selectedServiceId}/servants`),
      ]);
      setProgram(Array.isArray(pRes.data?.data) ? pRes.data.data : []);
      setServants(sRes.data?.data || null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load service program and servants.'));
    }
  }, [selectedServiceId]);

  useEffect(() => { loadRules(); }, [loadRules]);
  useEffect(() => { loadServiceDetails(); }, [loadServiceDetails]);

  const createRule = async (e) => {
    e.preventDefault();
    if (!ruleForm.title.trim() || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await axiosInstance.post('/services/recurrence', { ...ruleForm, day_of_week: Number(ruleForm.day_of_week) });
      setNotice('Recurring service rule saved.');
      await loadRules();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save recurring rule.'));
    } finally { setSaving(false); }
  };

  const generateNext = async (ruleId) => {
    if (saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const res = await axiosInstance.post(`/services/recurrence/${ruleId}/generate`, { weeks: 4 });
      setNotice(`Generated ${res.data?.data?.generated_count || 0} upcoming draft services.`);
      onServicesGenerated?.();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to generate recurring services.'));
    } finally { setSaving(false); }
  };

  const addProgramItem = async (e) => {
    e.preventDefault();
    if (!selectedServiceId || !progForm.title.trim() || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await axiosInstance.post(`/services/${selectedServiceId}/program`, {
        ...progForm,
        duration_minutes: progForm.duration_minutes ? Number(progForm.duration_minutes) : null,
      });
      setProgForm({ segment_type: 'worship', title: '', start_time: '', duration_minutes: '15', assigned_person: '' });
      setNotice('Program segment added.');
      await loadServiceDetails();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add program segment.'));
    } finally { setSaving(false); }
  };

  const archiveProgramItem = async (item) => {
    if (!(await confirm({
      title: 'Archive program segment?',
      message: `Remove "${item.title}" from this service order of worship?`,
      confirmLabel: 'Archive',
    }))) return;
    setSaving(true); setError('');
    try {
      await axiosInstance.post(`/services/${selectedServiceId}/program/${item.id}/archive`);
      setNotice('Program segment archived.');
      await loadServiceDetails();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to archive segment.'));
    } finally { setSaving(false); }
  };

  return (
    <section style={embedded ? S.embeddedCard : S.card} aria-label="Service program builder and recurring schedules">
      {!embedded && (
        <div style={S.head}>
          <div>
            <h2 style={S.title}>Service Program Builder, Servants &amp; Recurrence</h2>
            <p style={S.subtitle}>Build order-of-worship programs, detect servant scheduling conflicts, and auto-generate recurring weekly services.</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'program', label: `Program (${program.length})` },
              { id: 'servants', label: `Servants & Conflicts (${servants?.summary?.total || 0})` },
              { id: 'recurrence', label: `Recurring Rules (${rules.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{ ...S.tabBtn, ...(tab === t.id ? S.tabBtnActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div style={S.errorBox} role="alert">{error}</div>}
      {notice && <div style={S.notice}>{notice}</div>}

      {tab !== 'recurrence' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Service</span>
            <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} style={S.select}>
              {services.map((s) => <option key={s.id} value={s.id}>{s.service_date} — {s.title}</option>)}
            </select>
          </label>
          {embedded && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setTab('program')} style={{ ...S.tabBtn, ...(tab === 'program' ? S.tabBtnActive : {}) }}>
                Program ({program.length})
              </button>
              <button type="button" onClick={() => setTab('servants')} style={{ ...S.tabBtn, ...(tab === 'servants' ? S.tabBtnActive : {}) }}>
                Servants &amp; Conflicts ({servants?.summary?.total || 0})
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'program' && (
        <div style={S.stack}>
          {canUpdate && selectedServiceId && (
            <form onSubmit={addProgramItem} style={S.box}>
              <div style={S.row}>
                <select value={progForm.segment_type} onChange={(e) => setProgForm({ ...progForm, segment_type: e.target.value })} style={{ ...S.input, maxWidth: 145 }}>
                  <option value="worship">Worship / Praise</option>
                  <option value="prayer">Prayer</option>
                  <option value="scripture">Scripture Reading</option>
                  <option value="sermon">Sermon / Message</option>
                  <option value="offering">Offering</option>
                  <option value="announcement">Announcements</option>
                  <option value="benediction">Benediction</option>
                </select>
                <input value={progForm.title} maxLength={120} onChange={(e) => setProgForm({ ...progForm, title: e.target.value })} placeholder="Segment title" style={S.input} required />
                <input type="time" value={progForm.start_time} onChange={(e) => setProgForm({ ...progForm, start_time: e.target.value })} style={{ ...S.input, maxWidth: 115 }} />
                <input type="number" min="1" max="240" value={progForm.duration_minutes} onKeyDown={blockInvalidIntegerKeys} onChange={(e) => setProgForm({ ...progForm, duration_minutes: sanitizeWholeNumber(e.target.value, { max: 240 }) })} placeholder="Mins" style={{ ...S.input, maxWidth: 78 }} aria-label="Duration minutes" />
                <input value={progForm.assigned_person} maxLength={80} onChange={(e) => setProgForm({ ...progForm, assigned_person: sanitizePersonName(e.target.value, 80) })} placeholder="Assigned minister / lead" style={S.input} />
                <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Saving...' : 'Add Segment'}</button>
              </div>
            </form>
          )}
          <div className="mcc-table-scroll">
            <table style={S.table}>
              <thead><tr><th style={S.th}>Time</th><th style={S.th}>Type</th><th style={S.th}>Segment</th><th style={S.th}>Mins</th><th style={S.th}>Lead</th>{canUpdate && <th style={S.th}>Action</th>}</tr></thead>
              <tbody>
                {program.length === 0 ? <tr><td colSpan={canUpdate ? 6 : 5} style={S.empty}>No program segments drafted for this service yet.</td></tr> : program.map((p) => (
                  <tr key={p.id} style={S.tr}>
                    <td style={S.td}>{p.start_time || '—'}</td>
                    <td style={S.td}><span style={S.pill}>{p.segment_type}</span></td>
                    <td style={S.td}><strong>{p.title}</strong></td>
                    <td style={S.td}>{p.duration_minutes || '—'}</td>
                    <td style={S.td}>{p.assigned_person || '—'}</td>
                    {canUpdate && (
                      <td style={S.td}>
                        <IconActionButton icon="archive" label="Archive" title="Archive segment" tone="danger" size="xs" disabled={saving} onClick={() => archiveProgramItem(p)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'servants' && (
        <div style={S.stack}>
          {servants?.conflict_member_ids?.length > 0 && (
            <div style={S.warnBox}>
              Conflict alert: {servants.conflict_member_ids.length} volunteer(s) are assigned to multiple roles in this same service.
            </div>
          )}
          <div className="mcc-table-scroll">
            <table style={S.table}>
              <thead><tr><th style={S.th}>Servant</th><th style={S.th}>Team / Role</th><th style={S.th}>Confirmation</th><th style={S.th}>Conflict Check</th></tr></thead>
              <tbody>
                {!(servants?.assignments?.length) ? <tr><td colSpan={4} style={S.empty}>No ministry servants assigned to this service yet.</td></tr> : servants.assignments.map((a) => (
                  <tr key={a.id} style={S.tr}>
                    <td style={S.td}><strong>{a.Member ? displayMemberName(a.Member) : `Member #${a.member_id}`}</strong></td>
                    <td style={S.td}>{a.MinistryRole?.name || '—'}</td>
                    <td style={S.td}><span style={S.pill}>{a.confirmation_status || (a.confirmed ? 'confirmed' : 'pending')}</span></td>
                    <td style={S.td}>{a.has_conflict ? <span style={S.pillWarn}>Double-booked</span> : 'Clear'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'recurrence' && (
        <div style={S.stack}>
          {canCreate && (
            <form onSubmit={createRule} style={S.box}>
              <div style={S.row}>
                <input value={ruleForm.title} onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })} placeholder="Service name (e.g. Wednesday Prayer)" style={S.input} required />
                <select value={ruleForm.gathering_type} onChange={(e) => setRuleForm({ ...ruleForm, gathering_type: e.target.value })} style={{ ...S.input, maxWidth: 165 }} aria-label="Gathering type">
                  {GATHERING_TYPES.map((gt) => <option key={gt.value} value={gt.value}>{gt.label}</option>)}
                </select>
                <select value={ruleForm.day_of_week} onChange={(e) => setRuleForm({ ...ruleForm, day_of_week: e.target.value })} style={{ ...S.input, maxWidth: 130 }}>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
                <input type="time" value={ruleForm.start_time} onChange={(e) => setRuleForm({ ...ruleForm, start_time: e.target.value })} style={{ ...S.input, maxWidth: 115 }} />
                <input value={ruleForm.venue} onChange={(e) => setRuleForm({ ...ruleForm, venue: e.target.value })} placeholder="Venue" style={S.input} />
                <button type="submit" disabled={saving} style={S.primaryBtn}>{saving ? 'Saving...' : 'Add Rule'}</button>
              </div>
            </form>
          )}
          <div className="mcc-table-scroll">
            <table style={S.table}>
              <thead><tr><th style={S.th}>Service Rule</th><th style={S.th}>Schedule</th><th style={S.th}>Venue</th><th style={S.th}>Generate</th></tr></thead>
              <tbody>
                {rules.length === 0 ? <tr><td colSpan={4} style={S.empty}>No recurring rules configured yet.</td></tr> : rules.map((r) => (
                  <tr key={r.id} style={S.tr}>
                    <td style={S.td}><strong>{r.title}</strong></td>
                    <td style={S.td}>Every {DAYS[r.day_of_week] || 'Sunday'} · {r.start_time || '09:00'}</td>
                    <td style={S.td}>{r.venue || 'Main Sanctuary'}</td>
                    <td style={S.td}>
                      {canCreate && <button type="button" disabled={saving} onClick={() => generateNext(r.id)} style={S.smallBtn}>Generate Next 4 Weeks</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

const S = {
  card: { background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 'var(--mcc-radius, 12px)', padding: 18, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 },
  embeddedCard: { background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 'var(--mcc-radius, 12px)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 16, fontWeight: 700, color: '#003d70' },
  subtitle: { margin: '3px 0 0', fontSize: 13, color: '#52647a' },
  tabBtn: { background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  tabBtnActive: { background: '#005599', color: '#fff', border: '1px solid #005599' },
  select: { padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff' },
  stack: { display: 'flex', flexDirection: 'column', gap: 12 },
  box: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { flex: '1 1 120px', minWidth: 0, boxSizing: 'border-box', padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 13, background: '#fff' },
  primaryBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  smallBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  notice: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
  warnBox: { background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 11.5, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '8px 10px', color: '#0f172a' },
  empty: { padding: 18, textAlign: 'center', color: '#64748b' },
  pill: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600, textTransform: 'capitalize' },
  pillWarn: { background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 700 },
};
