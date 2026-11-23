import { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import useDialogFocus from '../../components/attendance/useQrDialogFocus';

const errorText = (error) => apiErrorMessage(error, 'The notification could not be loaded.');
const money = (value) => `₱${Number(value || 0).toFixed(2)}`;
const label = (value) => String(value || '').replaceAll('_', ' ');
const when = (value) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';
const audienceLabel = (type) => type === 'all_members' ? 'All members' : type === 'event' ? 'Event attendees' : type === 'ministry' ? 'Ministry members' : 'Cell group';

export default function CampaignDetail({ campaignId, user, caps, onClose, onUpdated }) {
  const { dialogRef, closeButtonRef } = useDialogFocus(true, onClose);
  const [campaign, setCampaign] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    setError('');
    Promise.all([
      api.get(`/outreach/campaigns/${campaignId}`),
      api.get(`/outreach/campaigns/${campaignId}/deliveries`, { params: { page: 1, limit: 50 } }),
    ]).then(([detail, rows]) => {
      setCampaign(detail.data.data.campaign);
      setDeliveries(rows.data.data.items || []);
    }).catch((requestError) => setError(errorText(requestError)));
  };
  useEffect(() => { load(); }, [campaignId]);

  const act = async (action) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const body = action === 'reject' ? { reason } : { note: reason };
      await api.post(`/outreach/campaigns/${campaignId}/${action}`, body);
      setNotice(action === 'approve' ? 'Approved.' : action === 'reject' ? 'Rejected.' : 'Cancelled.');
      load(); onUpdated?.();
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(false); }
  };

  const canApprove = caps.approve && campaign?.status === 'pending_approval' && Number(campaign.created_by) !== Number(user?.userId);
  const canCancel = campaign && !['completed', 'cancelled', 'rejected'].includes(campaign.status)
    && (Number(campaign.created_by) === Number(user?.userId) || ['System Admin', 'Pastor'].includes(user?.roleName));

  return <div className="outreach-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Notification detail" className="outreach-dialog campaign-detail">
      <header><h2>{campaign?.title || 'Notification'}</h2><button type="button" ref={closeButtonRef} onClick={onClose} aria-label="Close dialog">Close</button></header>
      {error && <div className="outreach-error" role="alert">{error}</div>}
      {notice && <div className="outreach-success" role="status">{notice}</div>}
      {!campaign && !error && <p role="status">Loading notification…</p>}
      {campaign && <>
        <div className="campaign-detail-grid">
          <div><span>Status</span><strong className={'outreach-badge ' + campaign.status}>{label(campaign.status)}</strong></div>
          <div><span>Audience</span><strong>{audienceLabel(campaign.audience_type)}</strong></div>
          <div><span>Send at</span><strong>{when(campaign.scheduled_at)}</strong></div>
          <div><span>Recipients</span><strong>{campaign.recipient_count}</strong></div>
          <div><span>Estimated cost</span><strong>{money(campaign.estimated_cost_php)}</strong></div>
          <div><span>Actual cost</span><strong>{money(campaign.actual_cost_php)}</strong></div>
        </div>
        <section className="campaign-message"><h3>Message</h3><p>{campaign.message}</p></section>
        {campaign.approval_required && <p className="outreach-muted">Approval required · {campaign.approved_by ? 'approved' : 'waiting for a second person'}{campaign.rejection_reason ? ` · ${campaign.rejection_reason}` : ''}</p>}
        {campaign.status === 'pending_approval' && (caps.approve
          ? <label>Approval or rejection note<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Optional for approval; required to reject" /></label>
          : <p className="outreach-warning">A Pastor or System Admin must review this notification.</p>)}
        <div className="outreach-actions">
          {canApprove && <><button type="button" className="outreach-primary" disabled={busy} onClick={() => act('approve')}>Approve</button>
            <button type="button" disabled={busy || reason.trim().length < 5} onClick={() => act('reject')}>Reject</button></>}
          {canCancel && <button type="button" disabled={busy} onClick={() => act('cancel')}>Cancel notification</button>}
        </div>
        <section><h3>Recipients</h3>
          {!deliveries.length ? <p className="outreach-muted">Deliveries appear here after the notification is queued.</p> :
            <div className="outreach-table-wrap"><table className="outreach-table"><thead><tr><th>Member</th><th>Phone</th><th>Status</th></tr></thead>
              <tbody>{deliveries.map((row) => <tr key={row.id}><td>{row.member_id}</td><td>{row.recipient_phone ? row.recipient_phone.replace(/(\\+63\\d{2})\\d{3}(\\d{4})/, '$1***$2') : '—'}</td><td>{label(row.status)}</td></tr>)}</tbody>
            </table></div>}
        </section>
      </>}
    </section>
  </div>;
}
