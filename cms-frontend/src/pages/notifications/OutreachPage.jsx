import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useDialogFocus from '../../components/attendance/useQrDialogFocus';
import NotificationPreferencesCard from '../../components/notifications/NotificationPreferencesCard';
import { toCsv } from '../../utils/csv';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import './outreach.css';

const errorText = (error) => apiErrorMessage(error, 'The request could not be completed. Please try again.');
const when = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fullName = (member) => member ? member.first_name + ' ' + member.last_name : 'Member unavailable';
const channelName = (channel) => channel === 'in_app' ? 'In-app' : channel === 'sms' ? 'SMS' : channel;
const kindName = (kind) => kind === 'absence_followup' ? 'Attendance follow-up' : kind === 'activity_reminder' ? 'Activity reminder' : String(kind || '').replaceAll('_', ' ');
const Badge = ({ value }) => <span className={'outreach-badge ' + value}>{String(value || '').replaceAll('_', ' ')}</span>;
function useCollection(path, params, refreshKey = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const serialized = JSON.stringify(params);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api.get(path, { params: JSON.parse(serialized), signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setData(response.data.data); })
      .catch((requestError) => { if (!controller.signal.aborted) setError(errorText(requestError)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, serialized, version, refreshKey]);
  return { data, error, loading, reload: () => setVersion((value) => value + 1) };
}
function Feedback({ error, notice, loading }) {
  return <>{error && <div className="outreach-error" role="alert">{error}</div>}
    {notice && <div className="outreach-success" role="status">{notice}</div>}
    {loading && <p role="status">Loading…</p>}</>;
}
function Modal({ title, onClose, children, busy = false }) {
  const close = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  const { dialogRef, closeButtonRef } = useDialogFocus(true, close);
  return <div className="outreach-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className="outreach-dialog">
      <header><h2>{title}</h2><button type="button" ref={closeButtonRef} onClick={close} disabled={busy} aria-label="Close dialog">Close</button></header>
      {children}
    </section>
  </div>;
}
function Pagination({ data, query, setQuery, disabled }) {
  if (!data) return null;
  return <nav className="outreach-pagination" aria-label="Results pages">
    <span>{data.total} records · Page {query.page} of {Math.max(1, Math.ceil(data.total / query.limit))}</span>
    <button type="button" disabled={disabled || query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</button>
    <button type="button" disabled={disabled || query.page * query.limit >= data.total} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</button>
  </nav>;
}
function Search({ query, setQuery, children }) {
  const [search, setSearch] = useState(query.search || '');
  return <form className="outreach-toolbar" onSubmit={(event) => { event.preventDefault(); setQuery({ ...query, search, page: 1 }); }}>
    <label className="outreach-search">Search members<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} placeholder="First or last name" /></label>
    {children}<button type="submit">Search</button>
  </form>;
}
function CaseDetail({ id, onClose, canResolve, readOnly, onUpdated }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api.get('/outreach/follow-ups/' + id, { signal: controller.signal }), api.get('/outreach/follow-ups/' + id + '/assignees', { signal: controller.signal })])
      .then(([detail, workers]) => {
        if (controller.signal.aborted) return;
        setData(detail.data.data); setCandidates(workers.data.data);
        setAssignee(String(detail.data.data.followup.assigned_to || workers.data.data.find((row) => Number(row.id) === Number(user.id || user.userId))?.id || workers.data.data[0]?.id || ''));
      }).catch((requestError) => { if (!controller.signal.aborted) setError(errorText(requestError)); });
    return () => controller.abort();
  }, [id, user.id, user.userId, version]);
  const act = async (action) => {
    setError(''); setNotice('');
    if (note.trim().length < 5) { setError('Enter a note with at least 5 characters.'); return; }
    setBusy(true);
    try {
      await api.post('/outreach/follow-ups/' + id + '/' + action, {
        expected_revision: data.followup.revision, note: note.trim(), ...(action === 'assign' ? { assigned_to: Number(assignee) } : {}),
      });
      setNotice(action === 'assign' ? 'Follow-up assignment saved.' : 'Follow-up resolved. Pending messages were cancelled.');
      setNote(''); setVersion((value) => value + 1); onUpdated();
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(false); }
  };
  const open = data && ['open', 'assigned'].includes(data.followup.status);
  const assignedElsewhere = data?.followup.assigned_to && Number(data.followup.assigned_to) !== Number(user.id || user.userId)
    && !['System Admin', 'Pastor', 'Registration Team'].includes(user.roleName);
  return <Modal title="Attendance follow-up" onClose={onClose} busy={busy}>
    <Feedback error={error} notice={notice} loading={!data && !error} />
    {data && <>
      <div className="outreach-card"><h3>{fullName(data.member)}</h3><Badge value={data.followup.status} />
        <p>{data.followup.absence_count} finalized consecutive absences · Series: {data.followup.series_key}</p>
        <p>Assigned to: {data.assignee?.email || 'Unassigned'}{data.assignee && (!data.assignee.is_active || data.assignee.is_deleted) ? ' (account unavailable; reassign)' : ''}</p>
        <p>Contact: {data.member?.phone || 'No mobile number recorded'}</p>
        {data.followup.resolution_note && <p>Resolution: {data.followup.resolution_note}</p>}
        {data.followup.cancel_reason && <p>Cancellation: {data.followup.cancel_reason}</p>}
      </div>
      {readOnly && <p className="outreach-warning">The combined team view is read-only. Select one assigned team to claim or resolve this follow-up.</p>}
      {assignedElsewhere && open && <p className="outreach-muted">This case is assigned to another worker. Church staff can reassign it when necessary.</p>}
      {canResolve && !readOnly && !assignedElsewhere && open && <section className="outreach-card">
        <h3>Personal follow-up</h3>
        <label>Assigned worker<select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
          <option value="">Choose a worker</option>{candidates.map((row) => <option key={row.id} value={row.id}>{row.email} · {row.role}</option>)}
        </select></label>
        <label>Assignment or resolution note<textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={5} maxLength={1000} /></label>
        <div className="outreach-actions">
          <button type="button" disabled={busy || !assignee} onClick={() => act('assign')}>Save assignment / claim</button>
          <button type="button" className="outreach-primary" disabled={busy} onClick={() => act('resolve')}>Resolve follow-up</button>
        </div>
      </section>}
      <h3>Eligible attendance timeline</h3>
      <p className="outreach-muted">Only expected gatherings in this series are included. Unfinalized attendance and pending review do not count as absences.</p>
      <div className="outreach-table-wrap"><table className="outreach-table"><thead><tr><th>Gathering</th><th>Start · Asia/Manila</th><th>Outcome</th></tr></thead>
        <tbody>{data.timeline.map((row) => <tr key={row.session_id}><td>{row.title}</td><td>{when(row.starts_at)}</td><td><Badge value={row.outcome} /></td></tr>)}</tbody>
      </table></div>
      <h3 style={{ marginTop: 20 }}>Delivery history</h3>
      {data.deliveries.length === 0 ? <p>No messages were queued for this follow-up. SMS consent is optional.</p> :
        <div className="outreach-table-wrap"><table className="outreach-table"><thead><tr><th>Channel</th><th>Result</th><th>Message</th></tr></thead>
          <tbody>{data.deliveries.map((row) => <tr key={row.id}><td>{channelName(row.channel)}</td><td><Badge value={row.status} />{row.last_error_code && <p>{row.last_error_code}</p>}</td><td className="outreach-message">{row.message}</td></tr>)}</tbody>
        </table></div>}
      {data.attempts.length > 0 && <details style={{ marginTop: 16 }}><summary>Processing attempts ({data.attempts.length})</summary>
        {data.attempts.map((row) => <p key={row.id}>Delivery #{row.delivery_id} · Attempt {row.attempt_number} · {row.mode} · {row.status} · {when(row.started_at)}{row.error_code ? ' · ' + row.error_code : ''}</p>)}
      </details>}
    </>}
  </Modal>;
}
function FollowUps({ refreshKey, canResolve, readOnly, onUpdated }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState({ page: 1, limit: 25, search: '', status: '' });
  const [caseId, setCaseId] = useState(Number(params.get('case')) || null);
  const result = useCollection('/outreach/follow-ups', query, refreshKey);
  useEffect(() => { const requested = Number(params.get('case')); if (requested) setCaseId(requested); }, [params]);
  const close = () => { setCaseId(null); const next = new URLSearchParams(params); next.delete('case'); setParams(next, { replace: true }); };
  return <>
    <Search query={query} setQuery={setQuery}><label>Follow-up status<select value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value, page: 1 })}>
      <option value="">All statuses</option>{['open', 'assigned', 'resolved', 'cancelled'].map((value) => <option key={value}>{value}</option>)}</select></label></Search>
    <Feedback error={result.error} loading={result.loading} />
    {result.data && <><div className="outreach-table-wrap"><table className="outreach-table"><thead><tr><th>Member / series</th><th>Consecutive absences</th><th>Worker</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{result.data.items.map((row) => <tr key={row.id}><td><strong>{fullName(row.member)}</strong><p>{row.series_key}</p></td><td>{row.absence_count}</td>
        <td>{row.assignee?.email || 'Unassigned'}</td><td><Badge value={row.status} /></td><td><button type="button" onClick={() => setCaseId(row.id)}>Open follow-up</button></td></tr>)}
        {!result.data.items.length && <tr><td colSpan={5} className="outreach-empty">No follow-ups match this view. Cases appear after two finalized eligible absences.</td></tr>}</tbody>
    </table></div><Pagination data={result.data} query={query} setQuery={setQuery} disabled={result.loading} /></>}
    {caseId && <CaseDetail id={caseId} onClose={close} canResolve={canResolve} readOnly={readOnly} onUpdated={() => { result.reload(); onUpdated(); }} />}
  </>;
}
function PolicyDialog({ session, onClose, onSaved }) {
  const [form, setForm] = useState({ reminders_enabled: Boolean(session.policy?.reminders_enabled), followups_enabled: Boolean(session.policy?.followups_enabled),
    series_key: session.policy?.series_key || 'church_gatherings', expected_revision: session.policy?.revision || 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await api.put('/outreach/sessions/' + session.id + '/policy', form); onSaved(); }
    catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(false); }
  };
  return <Modal title="Activity reminder and follow-up rules" onClose={onClose} busy={busy}>
    <h3>{session.title}</h3><p>{when(session.starts_at)} · Expected roster: {session.expected_basis.replaceAll('_', ' ')}</p>
    <Feedback error={error} />
    <form onSubmit={save}>
      <label className="outreach-check"><input type="checkbox" checked={form.reminders_enabled} onChange={(event) => setForm({ ...form, reminders_enabled: event.target.checked })} />Enable activity reminders</label>
      <p className="outreach-muted">Uses the configured reminder days and Asia/Manila time. Enabling a policy does not send reminders whose scheduled time has already passed.</p>
      <label className="outreach-check"><input type="checkbox" checked={form.followups_enabled} onChange={(event) => setForm({ ...form, followups_enabled: event.target.checked })} />Include this gathering in absence follow-ups</label>
      <label>Follow-up series<input value={form.series_key} onChange={(event) => setForm({ ...form, series_key: event.target.value })} required pattern="[a-z0-9_-]{1,80}" maxLength={80} /></label>
      <p className="outreach-muted">Use the same series for gatherings that belong together, such as weekly_worship. Optional unrelated events should have separate series or follow-ups switched off.</p>
      <button type="submit" className="outreach-primary" disabled={busy}>{busy ? 'Saving…' : 'Save activity rules'}</button>
    </form>
  </Modal>;
}
function RosterDialog({ sessionId, canManage, onClose, onUpdated }) {
  const [query, setQuery] = useState({ page: 1, limit: 25, search: '' });
  const result = useCollection('/outreach/sessions/' + sessionId + '/roster', query);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('pending');
  const [reason, setReason] = useState('');
  const [finalizeReason, setFinalizeReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const session = result.data?.session;
  const saveException = async (event) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      await api.put('/outreach/sessions/' + sessionId + '/members/' + selected.id + '/exception', { status, reason });
      setNotice('Attendance review saved. Finalize the roster again before absence follow-ups can use it.');
      setSelected(null); setReason(''); result.reload(); onUpdated();
    } catch (requestError) { setError(errorText(requestError)); } finally { setBusy(false); }
  };
  const finalize = async (event) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      await api.post('/qr-attendance/sessions/' + sessionId + '/finalize', { expected_activity_revision: session.activity_revision, reason: finalizeReason });
      setNotice('Attendance finalized. Eligible follow-up cases will be evaluated.'); setFinalizeReason(''); result.reload(); onUpdated();
    } catch (requestError) { setError(errorText(requestError)); } finally { setBusy(false); }
  };
  return <Modal title="Expected attendance review" onClose={onClose} busy={busy}>
    <Feedback error={error || result.error} notice={notice} loading={result.loading} />
    {session && <>
      <h3>{session.title}</h3><p>{when(session.starts_at)} · {session.finalized_at && Number(session.finalized_revision) === Number(session.activity_revision) ? 'Finalized' : 'Not finalized'}</p>
      <Link className="outreach-link" to={'/attendance/qr?session_id=' + sessionId + '&target_type=' + session.target_type + '&target_id=' + (session.service_id || session.event_id)}>Open attendance workspace</Link>
      <Search query={query} setQuery={setQuery} />
      <div className="outreach-table-wrap"><table className="outreach-table"><thead><tr><th>Expected member</th><th>Outcome</th><th>Review note</th>{canManage && <th>Action</th>}</tr></thead>
        <tbody>{result.data.items.map((row) => <tr key={row.id}><td>{fullName(row)}</td><td><Badge value={row.outcome} />{row.recorded_present && row.outcome === 'pending' && <p>Check-in recorded; awaiting finalization</p>}</td><td>{row.exception?.reason || '—'}</td>
          {canManage && <td><button type="button" disabled={busy} onClick={() => { setSelected(row); setStatus(row.exception?.status || 'pending'); setReason(row.exception?.reason || ''); }}>Review outcome</button></td>}</tr>)}
          {!result.data.items.length && <tr><td colSpan={canManage ? 4 : 3} className="outreach-empty">No expected members match this view.</td></tr>}</tbody>
      </table></div>
      <Pagination data={result.data} query={query} setQuery={setQuery} disabled={result.loading || busy} />
      {selected && <form onSubmit={saveException} className="outreach-card" style={{ marginTop: 16 }}>
        <h3>Review {fullName(selected)}</h3>
        <label>Attendance review status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="pending">Pending review</option><option value="excused">Excused</option><option value="cleared">Clear exception</option></select></label>
        <label>Reason for attendance review<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={5} maxLength={500} /></label>
        <div className="outreach-actions"><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel review</button><button type="submit" disabled={busy} className="outreach-primary">Save attendance review</button></div>
      </form>}
      {canManage && session.status === 'closed' && !(session.finalized_at && Number(session.finalized_revision) === Number(session.activity_revision)) && <form onSubmit={finalize} className="outreach-card" style={{ marginTop: 16 }}>
        <h3>Finalize reviewed attendance</h3><p>Resolve all saved leader batches first. Members marked pending review are not counted as absent.</p>
        <label>Finalization reason<textarea value={finalizeReason} onChange={(event) => setFinalizeReason(event.target.value)} required minLength={5} maxLength={500} /></label>
        <button type="submit" className="outreach-primary" disabled={busy}>Finalize attendance</button>
      </form>}
    </>}
  </Modal>;
}
function Sessions({ refreshKey, canManage, onUpdated }) {
  const [query, setQuery] = useState({ page: 1, limit: 25, search: '' });
  const result = useCollection('/outreach/sessions', query, refreshKey);
  const [policy, setPolicy] = useState(null);
  const [roster, setRoster] = useState(null);
  return <>
    <p>These are existing Service and Event sessions with expected rosters. Create or adjust their rosters in QR Attendance.</p>
    <form className="outreach-toolbar" onSubmit={(event) => event.preventDefault()}><label>Search session title<input value={query.search} maxLength={80} onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })} /></label></form>
    <Feedback error={result.error} loading={result.loading} />
    {result.data && <><div className="outreach-table-wrap"><table className="outreach-table"><thead><tr><th>Gathering</th><th>Attendance</th><th>Reminders</th><th>Follow-ups</th><th>Actions</th></tr></thead>
      <tbody>{result.data.items.map((row) => <tr key={row.id}><td><strong>{row.title}</strong><p>{when(row.starts_at)}</p></td><td><Badge value={row.status} /><p>{row.is_finalized ? 'Finalized' : 'Not finalized'}</p></td>
        <td>{row.policy?.reminders_enabled ? 'Enabled' : 'Off'}</td><td>{row.policy?.followups_enabled ? row.policy.series_key : 'Off'}</td>
        <td><div className="outreach-actions"><button type="button" onClick={() => setRoster(row.id)}>Review roster</button>{canManage && row.status !== 'cancelled' && <button type="button" onClick={() => setPolicy(row)}>Edit rules</button>}</div></td></tr>)}
        {!result.data.items.length && <tr><td colSpan={5} className="outreach-empty">No sessions with expected rosters yet. Add an expected roster in QR Attendance first.</td></tr>}</tbody>
    </table></div><Pagination data={result.data} query={query} setQuery={setQuery} disabled={result.loading} /></>}
    {policy && <PolicyDialog session={policy} onClose={() => setPolicy(null)} onSaved={() => { setPolicy(null); result.reload(); onUpdated(); }} />}
    {roster && <RosterDialog sessionId={roster} canManage={canManage} onClose={() => setRoster(null)} onUpdated={() => { result.reload(); onUpdated(); }} />}
  </>;
}
function DeliveryHistory({ refreshKey, canManage, onUpdated }) {
  const [query, setQuery] = useState({ page: 1, limit: 25, search: '', status: '', channel: '' });
  const result = useCollection('/outreach/deliveries', query, refreshKey);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const retry = async (id) => {
    setError(''); setBusy(true);
    try { await api.post('/outreach/deliveries/' + id + '/retry', {}); result.reload(); onUpdated(); }
    catch (requestError) { setError(errorText(requestError)); } finally { setBusy(false); }
  };
  const exportPage = () => {
    const rows = [['Member', 'Channel', 'Type', 'Status', 'Mode', 'Scheduled at', 'Message', 'Error code'], ...result.data.items.map((row) => [fullName(row.member), row.channel, row.kind, row.status, row.delivery_mode || '', when(row.scheduled_at), row.message, row.last_error_code || ''])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'plwm-mcc-notifications-page-' + query.page + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <>
    <p>Simulated SMS never leaves this system. For SMS, “Sent” means provider acceptance; it does not confirm reading. In-app “Sent” means the notification is available in the member’s notification menu.</p>
    <Search query={query} setQuery={setQuery}>
      <label>Channel<select value={query.channel} onChange={(event) => setQuery({ ...query, channel: event.target.value, page: 1 })}><option value="">All channels</option><option value="in_app">In-app</option><option value="sms">SMS</option></select></label>
      <label>Delivery status<select value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value, page: 1 })}><option value="">All statuses</option>{['queued', 'processing', 'simulated', 'sent', 'delivered', 'failed', 'unknown', 'cancelled'].map((value) => <option key={value}>{value}</option>)}</select></label>
    </Search>
    <Feedback error={error || result.error} loading={result.loading} />
    <button type="button" disabled={!result.data?.items.length || result.loading} onClick={exportPage} style={{ marginBottom: 12 }}>Export this page</button>
    {result.data && <><div className="outreach-table-wrap"><table className="outreach-table"><thead><tr><th>Member</th><th>Channel / type</th><th>Status</th><th>Message</th><th>Time · Asia/Manila</th>{canManage && <th>Action</th>}</tr></thead>
      <tbody>{result.data.items.map((row) => <tr key={row.id}><td>{fullName(row.member)}<p>{row.recipient_phone || ''}</p></td><td>{channelName(row.channel)}<p>{kindName(row.kind)}</p></td><td><Badge value={row.status} /><p>Mode: {row.delivery_mode === 'in_app' ? 'In-app' : row.delivery_mode || 'Not processed'}</p><p>Attempts: {row.attempt_count}</p>{row.last_error_code && <p>{row.last_error_code}</p>}</td>
        <td className="outreach-message">{row.message}</td><td>{when(row.scheduled_at)}{row.sent_at && <p>Sent: {when(row.sent_at)}</p>}{row.delivered_at && <p>Delivery report: {when(row.delivered_at)}</p>}</td>
        {canManage && <td>{row.status === 'failed' ? <button type="button" disabled={busy} onClick={() => retry(row.id)}>Queue retry</button> : row.status === 'unknown' ? 'Provider review required' : '—'}</td>}</tr>)}
        {!result.data.items.length && <tr><td colSpan={canManage ? 6 : 5} className="outreach-empty">No notifications match this view.</td></tr>}</tbody>
    </table></div><Pagination data={result.data} query={query} setQuery={setQuery} disabled={result.loading} /></>}
  </>;
}
function Consent() {
  const [query, setQuery] = useState({ page: 1, limit: 25, search: '' });
  const result = useCollection('/outreach/members', query);
  const [memberId, setMemberId] = useState(null);
  return <>
    <p>Record explicit permission before enabling SMS. Members can change their own preferences in Portal settings.</p>
    <Search query={query} setQuery={setQuery} /><Feedback error={result.error} loading={result.loading} />
    {result.data && <><div className="outreach-table-wrap"><table className="outreach-table"><thead><tr><th>Member</th><th>Mobile</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{result.data.items.map((row) => <tr key={row.id}><td>{fullName(row)}</td><td>{row.phone || 'Not recorded'}</td><td>{row.status}</td><td><button type="button" onClick={() => setMemberId(row.id)}>Manage preferences</button></td></tr>)}
        {!result.data.items.length && <tr><td colSpan={4} className="outreach-empty">No members match this search.</td></tr>}</tbody>
    </table></div><Pagination data={result.data} query={query} setQuery={setQuery} disabled={result.loading} /></>}
    {memberId && <Modal title="Member notification consent" onClose={() => setMemberId(null)}><NotificationPreferencesCard memberId={memberId} onSaved={result.reload} /></Modal>}
  </>;
}
function Configuration({ availability, onUpdated }) {
  const [form, setForm] = useState(null);
  const [days, setDays] = useState('3,1');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/outreach/configuration', { signal: controller.signal }).then((response) => { setForm(response.data.data); setDays(response.data.data.reminder_days.join(',')); })
      .catch((requestError) => { if (!controller.signal.aborted) setError(errorText(requestError)); });
    return () => controller.abort();
  }, []);
  const save = async (event) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      const response = await api.put('/outreach/configuration', { ...form, reminder_days: days.split(',').map((value) => Number(value.trim())) });
      setForm(response.data.data); setNotice('Notification configuration saved.'); onUpdated();
    } catch (requestError) { setError(errorText(requestError)); } finally { setBusy(false); }
  };
  const liveReady = availability.sms_delivery_enabled && availability.provider_configured && availability.recipient_restriction_configured;
  return <section className="outreach-card"><h2>Notification configuration</h2>
    <Feedback error={error} notice={notice} loading={!form && !error} />
    {form && <form onSubmit={save}>
      <label className="outreach-check"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />Enable reminders and attendance follow-up evaluation</label>
      <div className="outreach-grid">
        <label>SMS mode<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
          <option value="disabled">Disabled — no SMS processing</option><option value="simulation">Simulation — no SMS sent</option><option value="live" disabled={!liveReady}>Live SMS{!liveReady ? ' — server setup required' : ''}</option>
        </select></label>
        <label>Reminder days before gathering<input value={days} onChange={(event) => setDays(event.target.value)} required placeholder="3,1" /></label>
        <label>Reminder hour · Asia/Manila<input type="number" min={0} max={23} value={form.reminder_hour} onChange={(event) => setForm({ ...form, reminder_hour: Number(event.target.value) })} required /></label>
        <label>Maximum live SMS attempts per day<input type="number" min={1} max={100} value={form.daily_sms_cap} onChange={(event) => setForm({ ...form, daily_sms_cap: Number(event.target.value) })} required /></label>
      </div>
      <label>Activity reminder template<textarea value={form.reminder_template} onChange={(event) => setForm({ ...form, reminder_template: event.target.value })} minLength={10} maxLength={480} required /></label>
      <label>Attendance follow-up template<textarea value={form.followup_template} onChange={(event) => setForm({ ...form, followup_template: event.target.value })} minLength={10} maxLength={480} required /></label>
      <p className="outreach-muted">Available placeholders: {'{{first_name}}, {{activity}}, {{date}}, {{time}}, {{venue}}'}. Longer messages may use multiple SMS parts. Live sending has a separate server limit.</p>
      <button type="submit" className="outreach-primary" disabled={busy}>{busy ? 'Saving…' : 'Save configuration'}</button>
    </form>}
  </section>;
}
export default function OutreachPage() {
  const { user, hasPermission, activeLeaderScopeKey } = useAuth();
  const [availability, setAvailability] = useState(null);
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState('followups');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const currentRequest = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++currentRequest.current;
    try {
      const response = await api.get('/outreach/availability');
      if (request !== currentRequest.current) return;
      setAvailability(response.data.data);
      if (response.data.data.schema_ready) {
        const counts = await api.get('/outreach/overview');
        if (request === currentRequest.current) setOverview(counts.data.data);
      }
    } catch (requestError) { if (request === currentRequest.current) setError(errorText(requestError)); }
  }, []);
  useEffect(() => { setTab('followups'); setError(''); refresh(); return () => { currentRequest.current++; }; }, [refresh, activeLeaderScopeKey]);
  const updated = () => { setRefreshKey((value) => value + 1); refresh(); };
  const process = async (action) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'evaluate') {
        let cursor = 0, created = 0, cancelled = 0;
        do {
          const response = await api.post('/outreach/evaluate', { cursor });
          created += response.data.data.created_cases || 0; cancelled += response.data.data.cancelled_cases || 0;
          cursor = response.data.data.next_cursor || 0;
        } while (cursor);
        setNotice('Evaluation complete. New follow-ups: ' + created + '. Cancelled after review: ' + cancelled + '.');
      } else {
        const response = await api.post('/outreach/process', { limit: 50 });
        setNotice('Queue processing complete: ' + response.data.data.processed + ' records. SMS mode: ' + response.data.data.mode + '.');
      }
      updated();
    } catch (requestError) { setError(errorText(requestError)); } finally { setBusy(false); }
  };
  const caps = availability?.capabilities || {};
  const readOnly = user.roleName === 'Leader' && (!activeLeaderScopeKey || activeLeaderScopeKey === 'all');
  const tabs = [['followups', 'Follow-ups'], ...(caps.global ? [['sessions', 'Activity rules']] : []),
    ['deliveries', 'Delivery history'], ...(caps.manage ? [['consent', 'Member consent']] : []), ...(caps.configure ? [['configuration', 'Configuration']] : [])];
  const selectTab = (value) => { setTab(value); setError(''); setNotice(''); };
  const navigateTabs = (event, value) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex(([key]) => key === value);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[next][0]);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  return <section className="outreach-page" aria-label="Notification management">
    <header className="outreach-header"><div><h1>Notifications & follow-ups</h1>
      <p>Activity reminders and caring follow-ups after two finalized eligible absences. Your role and active team determine which records you can see.</p></div>
      <div className="outreach-actions"><button type="button" disabled={busy || !availability} onClick={() => { setError(''); updated(); }}>Refresh view</button>
        {caps.process && <><button type="button" disabled={busy || !availability?.enabled} onClick={() => process('evaluate')}>Evaluate due work</button>
        <button type="button" className="outreach-primary" disabled={busy || !availability?.enabled} onClick={() => process('process')}>Process due queue</button></>}
      </div>
    </header>
    <Feedback error={error} notice={notice} loading={!availability && !error} />
    {availability && !availability.schema_ready && <div className="outreach-warning">Notification management needs its database migration before it can be used.</div>}
    {availability?.schema_ready && <>
      <div className="outreach-banner"><strong>{!availability.enabled ? 'Automatic reminders and follow-ups are off.' : availability.mode === 'simulation' ? 'Simulation mode — no SMS is sent.' : !availability.sms_delivery_enabled || availability.mode === 'disabled' ? 'SMS sending is off.' : 'Live SMS mode is active.'}</strong>
        <div>{availability.enabled ? 'In-app notifications and follow-up records remain available. All times use Asia/Manila.' : 'An administrator can enable the workflow in Configuration.'}</div>
        {!availability.scheduler_enabled && <div>Automatic background checks are off on this server. Staff can evaluate due work manually.</div>}
      </div>
      {overview && <div className="outreach-metrics">{[
        ['Open follow-ups', (overview.followups.open || 0) + (overview.followups.assigned || 0)], ['Resolved', overview.followups.resolved || 0],
        ['Queued', overview.deliveries.queued || 0], ['Simulated', overview.deliveries.simulated || 0], ['Failed / review', (overview.deliveries.failed || 0) + (overview.deliveries.unknown || 0)],
      ].map(([label, value]) => <article className="outreach-metric" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}
      <div className="outreach-tabs" role="tablist" aria-label="Notification workspace sections">{tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value}
        id={'outreach-tab-' + value} aria-controls="outreach-panel" tabIndex={tab === value ? 0 : -1}
        onKeyDown={(event) => navigateTabs(event, value)} onClick={() => selectTab(value)}>{label}</button>)}</div>
      <div role="tabpanel" id="outreach-panel" aria-labelledby={'outreach-tab-' + tab} key={activeLeaderScopeKey || 'global'}>
        {tab === 'followups' && <FollowUps refreshKey={refreshKey} canResolve={caps.resolve && hasPermission('outreach', 'resolve')} readOnly={readOnly} onUpdated={updated} />}
        {tab === 'sessions' && caps.global && <Sessions refreshKey={refreshKey} canManage={caps.manage} onUpdated={updated} />}
        {tab === 'deliveries' && <DeliveryHistory refreshKey={refreshKey} canManage={caps.manage} onUpdated={updated} />}
        {tab === 'consent' && caps.manage && <Consent />}
        {tab === 'configuration' && caps.configure && <Configuration availability={availability} onUpdated={updated} />}
      </div>
    </>}
  </section>;
}
