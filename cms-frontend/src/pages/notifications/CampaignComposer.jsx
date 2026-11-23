import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axiosInstance';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import useDialogFocus from '../../components/attendance/useQrDialogFocus';

const errorText = (error) => apiErrorMessage(error, 'The notification could not be saved.');
const money = (value) => `₱${Number(value || 0).toFixed(2)}`;
const statusLabel = (value) => String(value || '').replaceAll('_', ' ');
const audienceLabel = (campaign) => campaign.audience_type === 'all_members' ? 'All members'
  : campaign.audience_type === 'event' ? 'Event attendees'
    : campaign.audience_type === 'ministry' ? 'Ministry members' : 'Cell group';

const localInput = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function CampaignComposer({ user, caps, onClose, onCreated }) {
  const { dialogRef, closeButtonRef } = useDialogFocus(true, onClose);
  const [title, setTitle] = useState('Church update');
  const [audienceType, setAudienceType] = useState(caps.broadcast ? 'all_members' : 'event');
  const [eventId, setEventId] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [cellGroupId, setCellGroupId] = useState('');
  const [message, setMessage] = useState('Hi {{first_name}}, {{activity}} is on {{date}} at {{time}}. See you there! PLWM-MCC');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const date = new Date(Date.now() + 24 * 3600000);
    date.setHours(9, 0, 0, 0);
    return localInput(date);
  });
  const [budgetCap, setBudgetCap] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [options, setOptions] = useState({ events: [], ministries: [], cellGroups: [] });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get('/events', { params: { page: 1, limit: 100 }, signal: controller.signal }).catch(() => ({ data: { data: {} } })),
      api.get('/ministry/roles', { signal: controller.signal }).catch(() => ({ data: { data: [] } })),
      api.get('/cellgroups', { params: { page: 1, limit: 100 }, signal: controller.signal }).catch(() => ({ data: { data: {} } })),
    ]).then(([events, ministries, cellGroups]) => {
      if (controller.signal.aborted) return;
      const eventRows = events.data.data?.events || events.data.data?.items || [];
      const ministryRows = Array.isArray(ministries.data.data) ? ministries.data.data : ministries.data.data?.items || [];
      const cellRows = cellGroups.data.data?.cellGroups || cellGroups.data.data?.cellgroups || cellGroups.data.data?.items || [];
      setOptions({ events: eventRows, ministries: ministryRows, cellGroups: cellRows });
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  const audienceOptions = useMemo(() => {
    const values = [{ value: 'event', label: 'Event attendees' }];
    if (caps.broadcast) values.push({ value: 'all_members', label: 'All members' });
    if (caps.broadcast || user?.roleName === 'Ministry Leader') values.push({ value: 'ministry', label: 'Ministry members' });
    if (caps.broadcast || String(user?.roleName || '').includes('Leader')) values.push({ value: 'cell_group', label: 'Cell group members' });
    return values;
  }, [caps.broadcast, user?.roleName]);

  const payload = () => ({
    title, audience_type: audienceType, message,
    event_id: audienceType === 'event' ? Number(eventId) || null : null,
    ministry_id: audienceType === 'ministry' ? Number(ministryId) || null : null,
    cell_group_id: audienceType === 'cell_group' ? Number(cellGroupId) || null : null,
    scheduled_at: new Date(scheduledAt).toISOString(),
    budget_cap_php: budgetCap === '' ? null : Number(budgetCap),
  });

  const runPreview = async () => {
    setError(''); setNotice(''); setBusy(true);
    try {
      const response = await api.post('/outreach/campaigns/preview', payload());
      setPreview(response.data.data);
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!preview) { setError('Preview the audience and cost before continuing.'); return; }
    if (!window.confirm(`Queue this notification for ${preview.recipient_count} recipients at an estimated ${money(preview.estimated_cost_php)}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const created = await api.post('/outreach/campaigns', payload());
      const campaign = created.data.data;
      const submitted = await api.post(`/outreach/campaigns/${campaign.id}/submit`);
      onCreated?.(submitted.data.data);
      setNotice(submitted.data.data.status === 'pending_approval'
        ? 'Submitted for approval. A Pastor or System Admin must approve it.' : 'Notification approved and scheduled.');
      setTimeout(onClose, 900);
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(false); }
  };

  const charCount = message.length;
  const segments = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
  const unitCost = preview?.unit_cost_php || 0.463;
  return <div className="outreach-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="New notification" className="outreach-dialog campaign-composer">
      <header><h2>New notification</h2><button type="button" ref={closeButtonRef} onClick={onClose} disabled={busy} aria-label="Close dialog">Close</button></header>
      <form onSubmit={submit}>
        {error && <div className="outreach-error" role="alert">{error}</div>}
        {notice && <div className="outreach-success" role="status">{notice}</div>}
        <label>Notification title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} required /></label>
        <label>Audience<select value={audienceType} onChange={(event) => { setAudienceType(event.target.value); setPreview(null); }}>
          {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        {audienceType === 'event' && <label>Event<select value={eventId} onChange={(event) => { setEventId(event.target.value); setPreview(null); }} required>
          <option value="">Choose an event</option>
          {options.events.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.start_date || event.event_date || ''}</option>)}
        </select></label>}
        {audienceType === 'ministry' && <label>Ministry<select value={ministryId} onChange={(event) => { setMinistryId(event.target.value); setPreview(null); }} required>
          <option value="">Choose a ministry</option>
          {options.ministries.map((ministry) => <option key={ministry.id} value={ministry.id}>{ministry.name}</option>)}
        </select></label>}
        {audienceType === 'cell_group' && <label>Cell group<select value={cellGroupId} onChange={(event) => { setCellGroupId(event.target.value); setPreview(null); }} required>
          <option value="">Choose a cell group</option>
          {options.cellGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select></label>}
        <label>Message<textarea value={message} onChange={(event) => { setMessage(event.target.value); setPreview(null); }} maxLength={480} minLength={10} required />
          <small className="outreach-muted">{charCount} characters · about {segments} SMS segment{segments === 1 ? '' : 's'} · {money(segments * unitCost)} each</small>
        </label>
        <div className="campaign-placeholders">
          {['{{first_name}}', '{{activity}}', '{{date}}', '{{time}}', '{{venue}}'].map((token) => (
            <button key={token} type="button" onClick={() => setMessage((value) => value + ' ' + token)}>{token}</button>
          ))}
        </div>
        <div className="outreach-grid">
          <label>Send at · Asia/Manila<input type="datetime-local" value={scheduledAt} onChange={(event) => { setScheduledAt(event.target.value); setPreview(null); }} required /></label>
          <label>Budget cap · optional<input type="number" min="0" step="0.01" value={budgetCap} onChange={(event) => setBudgetCap(event.target.value)} placeholder="Auto" /></label>
        </div>
        <p className="outreach-muted">Sends only between 08:00 and 20:00 Asia/Manila. All-member messages need a second approver. Frequency caps and consent are checked again at send time.</p>
        {preview && <section className="campaign-preview" aria-label="Audience preview">
          <h3>{preview.recipient_count} eligible recipient{preview.recipient_count === 1 ? '' : 's'}</h3>
          <p>{preview.total_segments} SMS segment{preview.total_segments === 1 ? '' : 's'} · estimated <strong>{money(preview.estimated_cost_php)}</strong> · monthly remaining {money(preview.monthly_remaining_php)}</p>
          {preview.warning && <p className="outreach-warning">{preview.warning}</p>}
          <details><summary>Who is excluded</summary><ul>
            {Object.entries(preview.excluded || {}).filter(([, count]) => count > 0).map(([reason, count]) => <li key={reason}>{statusLabel(reason)}: {count}</li>)}
          </ul></details>
          {preview.approval_required && <p className="outreach-warning">This notification needs approval before it can send.</p>}
        </section>}
        <div className="outreach-actions">
          <button type="button" onClick={runPreview} disabled={busy}>{busy ? 'Checking…' : 'Preview audience & cost'}</button>
          <button type="submit" className="outreach-primary" disabled={busy || !preview}>{busy ? 'Saving…' : 'Submit notification'}</button>
        </div>
      </form>
    </section>
  </div>;
}
