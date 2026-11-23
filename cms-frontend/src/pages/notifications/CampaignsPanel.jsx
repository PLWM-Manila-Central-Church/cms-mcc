import { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import CampaignComposer from './CampaignComposer';
import CampaignDetail from './CampaignDetail';

const errorText = (error) => apiErrorMessage(error, 'Notifications could not be loaded.');
const money = (value) => `₱${Number(value || 0).toFixed(2)}`;
const label = (value) => String(value || '').replaceAll('_', ' ');
const when = (value) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';
const audienceLabel = (type) => type === 'all_members' ? 'All members' : type === 'event' ? 'Event attendees' : type === 'ministry' ? 'Ministry members' : 'Cell group';

export default function CampaignsPanel({ user, caps, refreshKey = 0, onUpdated, approvalsOnly = false }) {
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState(approvalsOnly ? 'pending_approval' : '');
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    api.get('/outreach/campaigns', { params: { page: 1, limit: 50, ...(status ? { status } : {}) }, signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setItems(response.data.data.items || []); })
      .catch((requestError) => { if (!controller.signal.aborted) setError(errorText(requestError)); });
    return () => controller.abort();
  }, [status, version, refreshKey]);

  const reload = () => { setVersion((value) => value + 1); onUpdated?.(); };

  return <section className="campaigns-panel">
    <div className="campaigns-toolbar">
      <div><h2>{approvalsOnly ? 'Awaiting approval' : 'Notifications'}</h2>
        <p className="outreach-muted">Custom messages for events, ministries or all members. Consent, frequency and budget are checked before sending.</p></div>
      <div className="outreach-actions">
        {!approvalsOnly && caps.campaigns && <button type="button" className="outreach-primary" onClick={() => setComposerOpen(true)}>New notification</button>}
        <button type="button" onClick={reload}>Refresh</button>
      </div>
    </div>
    {error && <div className="outreach-error" role="alert">{error}</div>}
    {!approvalsOnly && <label className="campaign-filter">Show status<select value={status} onChange={(event) => setStatus(event.target.value)}>
      <option value="">All</option><option value="draft">Draft</option><option value="pending_approval">Awaiting approval</option>
      <option value="approved">Approved</option><option value="sending">Sending</option><option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option><option value="rejected">Rejected</option>
    </select></label>}
    {!items && !error && <p role="status">Loading notifications…</p>}
    {items && !items.length && <div className="outreach-card"><h3>No notifications yet</h3><p className="outreach-muted">{approvalsOnly ? 'Nothing is waiting for approval.' : 'Create a notification for an event, ministry or all members.'}</p></div>}
    {items && items.length > 0 && <div className="outreach-table-wrap"><table className="outreach-table campaigns-table">
      <thead><tr><th>Notification</th><th>Audience</th><th>Send at</th><th>Recipients</th><th>Est. cost</th><th>Status</th><th /></tr></thead>
      <tbody>{items.map((campaign) => <tr key={campaign.id}>
        <td><strong>{campaign.title}</strong><p className="outreach-muted">{campaign.message?.slice(0, 72)}…</p></td>
        <td>{audienceLabel(campaign.audience_type)}</td>
        <td>{when(campaign.scheduled_at)}</td>
        <td>{campaign.recipient_count}</td>
        <td>{money(campaign.estimated_cost_php)}</td>
        <td><span className={'outreach-badge ' + campaign.status}>{label(campaign.status)}</span>{campaign.approval_required && <p className="outreach-muted">Approval required</p>}</td>
        <td><button type="button" onClick={() => setSelected(campaign.id)}>Open</button></td>
      </tr>)}</tbody>
    </table></div>}
    {composerOpen && <CampaignComposer user={user} caps={caps} onClose={() => setComposerOpen(false)}
      onCreated={() => { setComposerOpen(false); reload(); }} />}
    {selected && <CampaignDetail campaignId={selected} user={user} caps={caps} onClose={() => setSelected(null)} onUpdated={reload} />}
  </section>;
}
