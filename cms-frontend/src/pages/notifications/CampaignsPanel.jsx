import { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import CollectionToolbar from '../../components/common/CollectionToolbar';
import CompactPagination from '../../components/common/CompactPagination';
import CampaignComposer from './CampaignComposer';
import CampaignDetail from './CampaignDetail';

const errorText = (error) => apiErrorMessage(error, 'Notifications could not be loaded.');
const money = (value) => `₱${Number(value || 0).toFixed(2)}`;
const label = (value) => String(value || '').replaceAll('_', ' ');
const when = (value) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';
const audienceLabel = (type) => type === 'all_members' ? 'All members' : type === 'event' ? 'Event attendees' : type === 'ministry' ? 'Ministry members' : type === 'selected_members' ? 'Selected members' : 'Cell group';

export default function CampaignsPanel({ user, caps, refreshKey = 0, onUpdated, approvalsOnly = false }) {
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState(approvalsOnly ? 'pending_approval' : '');
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    api.get('/outreach/campaigns', { params: { page, limit, ...(status ? { status } : {}), ...(search ? { search } : {}) }, signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) { const d = response.data.data || {}; setItems(d.items || []); setTotal(Number(d.total || 0)); setTotalPages(Number(d.total_pages || 1)); } })
      .catch((requestError) => { if (!controller.signal.aborted) setError(errorText(requestError)); });
    return () => controller.abort();
  }, [status, version, refreshKey, page, limit, search]);

  const reload = () => { setVersion((value) => value + 1); onUpdated?.(); };

  return <section className="campaigns-panel">
    <div className="campaigns-toolbar">
      <div><h2>{approvalsOnly ? 'Awaiting approval' : 'Notifications'}</h2>
        <p className="outreach-muted">Custom messages for events, ministries or all members. Consent, frequency and budget are checked before sending.</p></div>
      <div className="outreach-actions">
        {!approvalsOnly && caps.campaign_write && <button type="button" className="outreach-primary" onClick={() => setComposerOpen(true)}>New notification</button>}
        <button type="button" onClick={reload}>Refresh</button>
      </div>
    </div>
    {error && <div className="outreach-error" role="alert">{error}</div>}
    {!approvalsOnly && <CollectionToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search notifications..." tabs={[{ key: '', label: 'All' }, { key: 'draft', label: 'Draft' }, { key: 'pending_approval', label: 'Awaiting approval' }, { key: 'approved', label: 'Approved' }, { key: 'sending', label: 'Sending' }, { key: 'completed', label: 'Completed' }, { key: 'cancelled', label: 'Cancelled' }, { key: 'rejected', label: 'Rejected' }]} activeTab={status} onTabChange={(v) => { setStatus(v); setPage(1); }} />}
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
    {items && total > 0 && <CompactPagination page={page} totalPages={totalPages} total={total} limit={limit} pageSizes={[15, 25, 50]} onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} itemLabel="notifications" />}
    {composerOpen && <CampaignComposer user={user} caps={caps} onClose={() => setComposerOpen(false)}
      onCreated={(campaign) => { setComposerOpen(false); setSelected(campaign.id); reload(); }} />}
    {selected && <CampaignDetail campaignId={selected} user={user} caps={caps} onClose={() => setSelected(null)} onUpdated={reload} />}
  </section>;
}
