import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axiosInstance';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { blockInvalidDecimalKeys, sanitizeCurrency } from '../../utils/inputConstraints';
import useDialogFocus from '../../components/attendance/useQrDialogFocus';

const errorText = (error) => apiErrorMessage(error, 'The notification could not be saved.');
const money = (value) => `₱${Number(value || 0).toFixed(2)}`;
const reasons = {
  inactive: 'Member is inactive',
  no_phone: 'No valid mobile number',
  no_consent: 'SMS consent is missing or does not match the current number',
  opted_out: 'Opted out of SMS',
  preference_disabled: 'Campaign notifications are off or unset',
  minor_without_guardian: 'Valid guardian number and consent required',
  duplicate: 'Shares a number with another eligible recipient',
  frequency_cap: 'SMS frequency limit reached',
  recipient_restricted: 'Number is outside the live SMS allowlist',
  not_found: 'Member record is unavailable',
};

const localInput = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function CampaignComposer({ user, caps, onClose, onCreated }) {
  const { dialogRef, closeButtonRef } = useDialogFocus(true, onClose);
  const [title, setTitle] = useState('Church update');
  const [audienceType, setAudienceType] = useState('selected_members');
  const [timingMode, setTimingMode] = useState('send_now');
  const [members, setMembers] = useState([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberPage, setMemberPage] = useState(1);
  const [memberPages, setMemberPages] = useState(1);
  const submissionKey = useRef(null);
  const submitting = useRef(false);
  const reviewHeading = useRef(null);
  useEffect(() => {
    if (audienceType !== 'selected_members') return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api.get('/outreach/campaigns/member-options', {
        params: { search: memberQuery, page: memberPage }, signal: controller.signal,
      }).then(({ data }) => {
        if (controller.signal.aborted) return;
        setMemberResults(data.data.items);
        setMemberPages(data.data.total_pages);
      }).catch((failure) => { if (!controller.signal.aborted) setError(errorText(failure)); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [audienceType, memberQuery, memberPage]);
  const [eventId, setEventId] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [cellGroupId, setCellGroupId] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const date = new Date(Date.now() + 24 * 3600000);
    date.setHours(9, 0, 0, 0);
    return localInput(date);
  });
  const [budgetCap, setBudgetCap] = useState('');
  const [preview, setPreview] = useState(null);
  useEffect(() => { if (preview) reviewHeading.current?.focus(); }, [preview]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
      const cellRows = Array.isArray(cellGroups.data.data) ? cellGroups.data.data : cellGroups.data.data?.cellGroups || cellGroups.data.data?.cellgroups || cellGroups.data.data?.items || [];
      setOptions({ events: eventRows, ministries: ministryRows, cellGroups: cellRows });
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  const audienceOptions = useMemo(() => {
    const values = [{ value: 'selected_members', label: 'Selected members' }, { value: 'event', label: 'Event attendees' }];
    if (caps.broadcast) values.push({ value: 'all_members', label: 'All eligible members' });
    if (caps.broadcast || user?.roleName === 'Ministry Leader') values.push({ value: 'ministry', label: 'Ministry members' });
    if (caps.broadcast || String(user?.roleName || '').includes('Leader')) values.push({ value: 'cell_group', label: 'Cell group members' });
    return values;
  }, [caps.broadcast, user?.roleName]);

  const payload = () => ({
    title, audience_type: audienceType, message,
    event_id: audienceType === 'event' ? Number(eventId) || null : null,
    ministry_id: audienceType === 'ministry' ? Number(ministryId) || null : null,
    cell_group_id: audienceType === 'cell_group' ? Number(cellGroupId) || null : null,
    timing_mode: timingMode,
    ...(audienceType === 'selected_members' ? { member_ids: members.map((member) => member.id) } : {}),
    ...(timingMode === 'scheduled' && scheduledAt ? { scheduled_at: new Date(scheduledAt + ':00+08:00').toISOString() } : {}),
    budget_cap_php: budgetCap === '' ? null : Number(budgetCap),
  });

  const previewPayload = () => {
    const { title, budget_cap_php, ...input } = payload();
    return input;
  };

  const runPreview = async (event) => {
    event.preventDefault();
    if (audienceType === 'selected_members' && members.length === 0) {
      setError('Choose at least one member.');
      return;
    }
    setError(''); setBusy(true);
    try {
      const response = await api.post('/outreach/campaigns/preview', previewPayload());
      submissionKey.current = crypto.randomUUID();
      setPreview(response.data.data);
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || submitting.current || !canConfirm) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const created = await api.post('/outreach/campaigns', { ...payload(), submission_key: submissionKey.current });
      const campaign = created.data.data;
      const submitted = await api.post(`/outreach/campaigns/${campaign.id}/submit`);
      onCreated?.(submitted.data.data);
    } catch (requestError) { submitting.current = false; setError(errorText(requestError)); }
    finally { setBusy(false); }
  };

  const charCount = message.length;
  const recipientStatus = new Map((preview?.recipient_status || []).map((entry) => [Number(entry.member_id), entry]));
  const budgetIssue = preview && (preview.estimated_cost_php > preview.monthly_remaining_php
    ? 'Estimated cost exceeds the remaining monthly SMS budget.'
    : budgetCap !== '' && preview.estimated_cost_php > Number(budgetCap)
      ? 'Estimated cost exceeds this notification’s budget cap.' : '');
  const canConfirm = Boolean(preview?.recipient_count) && preview.sending_available !== false && !budgetIssue;
  return <div className="outreach-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="New notification" className="outreach-dialog campaign-composer">
      <header><h2 ref={reviewHeading} tabIndex={-1}>{preview ? 'Review SMS' : 'New notification'}</h2><button type="button" ref={closeButtonRef} onClick={onClose} disabled={busy} aria-label="Close dialog">Close</button></header>
      <form onSubmit={preview ? submit : runPreview}>
        {error && <div className="outreach-error" role="alert">{error}</div>}
        {!preview && <>
        <label>Audience<select value={audienceType} onChange={(event) => { setAudienceType(event.target.value); setPreview(null); }}>
          {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        {audienceType === 'selected_members' && <fieldset className="sms-recipients" disabled={busy}>
          <legend>Recipients ({members.length} selected)</legend>
          <label>Search members<input type="search" value={memberQuery} onChange={(event) => {
            setMemberQuery(event.target.value); setMemberPage(1);
          }} /></label>
          <div className="sms-selection">{members.map((member) => <button type="button" key={member.id} onClick={() => {
            setMembers((previous) => previous.filter((item) => item.id !== member.id)); setPreview(null);
          }} aria-label={'Remove ' + member.label}>{member.label} ×</button>)}</div>
          <div className="sms-results">{memberResults.filter((member) => !members.some((item) => item.id === member.id)).map((member) => (
            <button type="button" key={member.id} onClick={() => {
              setMembers((previous) => [...previous, member]); setPreview(null);
            }}>Add {member.label}</button>
          ))}</div>
          {memberPages > 1 && <div>
            <button type="button" disabled={memberPage <= 1} onClick={() => setMemberPage(memberPage - 1)}>Previous members</button>
            <button type="button" disabled={memberPage >= memberPages} onClick={() => setMemberPage(memberPage + 1)}>Next members</button>
          </div>}
        </fieldset>}
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
          <small className="outreach-muted">{charCount} / 480 characters · minimum 10</small>
        </label>
        <div className="outreach-grid">
          <label>Timing<select value={timingMode} onChange={(event) => { setTimingMode(event.target.value); setPreview(null); }}>
            <option value="send_now">Send now</option><option value="scheduled">Schedule</option>
          </select></label>
          {timingMode === 'scheduled' && <label>Send at · Asia/Manila<input type="datetime-local" value={scheduledAt} onChange={(event) => { setScheduledAt(event.target.value); setPreview(null); }} required /></label>}
        </div>
        <details className="sms-options"><summary>More options</summary>
          <label>Internal title<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={150} required /></label>
          <label>Budget cap · optional<input type="number" min="0" step="0.01" value={budgetCap} onKeyDown={blockInvalidDecimalKeys} onChange={(event) => setBudgetCap(sanitizeCurrency(event.target.value))} placeholder="Auto" /></label>
        <div className="campaign-placeholders">
          {['{{first_name}}', '{{activity}}', '{{date}}', '{{time}}', '{{venue}}'].map((token) => (
            <button key={token} type="button" onClick={() => setMessage((value) => (value + ' ' + token).trimStart().slice(0, 480))}>{token}</button>
          ))}
        </div>
        </details>
        </>}
        {preview && <section className="campaign-preview" aria-label="Audience preview">
          <p className="sms-review-message">{message}</p>
          <p>{audienceOptions.find((option) => option.value === audienceType)?.label} · {timingMode === 'send_now' ? 'Send now' : scheduledAt.replace('T', ' ') + ' Manila time'}</p>
          <h3>{preview.recipient_count} eligible recipient{preview.recipient_count === 1 ? '' : 's'}</h3>
          {audienceType === 'selected_members' && <ul aria-label="Selected recipient eligibility">
            {members.map((member) => {
              const status = recipientStatus.get(Number(member.id));
              const eligible = status ? status.reason === null
                : (preview.recipients || []).some((row) => Number(row.member_id) === Number(member.id));
              return <li key={member.id}><strong>{member.label}</strong> — {eligible
                ? 'Eligible at review'
                : 'Will be skipped: ' + (reasons[status?.reason] || 'Does not meet SMS eligibility requirements')}</li>;
            })}
          </ul>}
          {!preview.recipient_count && <p role="alert">No eligible recipients. Go back to change the audience.</p>}
          {budgetIssue && <p role="alert">{budgetIssue}</p>}
          <p>{preview.total_segments} SMS segment{preview.total_segments === 1 ? '' : 's'} · estimated <strong>{money(preview.estimated_cost_php)}</strong> · monthly remaining {money(preview.monthly_remaining_php)}</p>
          {preview.warning && <p className="outreach-warning">{preview.warning}</p>}
          {preview.mode === 'simulation' && <p>Simulation mode. No SMS will be sent.</p>}
          {preview.sending_available === false && <p role="alert">SMS processing is disabled or the provider is unavailable.</p>}
          <details><summary>Who is excluded</summary><ul>
            {Object.entries(preview.excluded || {}).filter(([, count]) => count > 0).map(([reason, count]) => <li key={reason}>{reasons[reason] || reason}: {count}</li>)}
          </ul></details>
          {preview.approval_required && <p className="outreach-warning">This notification needs approval before it can send.</p>}
        </section>}
        <div className="outreach-actions sms-footer">
          {preview ? <>
            <button type="button" disabled={busy} onClick={() => { setPreview(null); setError(''); }}>Back to edit</button>
            <button type="submit" className="outreach-primary" disabled={busy || !canConfirm}>{busy ? 'Saving…' : preview.approval_required ? 'Submit for approval' : preview.mode === 'simulation' ? 'Simulate SMS' : timingMode === 'send_now' ? 'Send SMS' : 'Schedule SMS'}</button>
          </> : <button type="submit" className="outreach-primary" disabled={busy}>{busy ? 'Checking…' : 'Review SMS'}</button>}
        </div>
      </form>
    </section>
  </div>;
}
