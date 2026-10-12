import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useConfirmation } from '../../context/ConfirmationContext';

const personName = (member, fallback) => {
  const name = [member?.first_name, member?.last_name].filter(Boolean).join(' ').trim();
  return name || fallback;
};

const serviceName = (request) => request.assignment?.Service?.title
  || `Service #${request.assignment?.service_id || '—'}`;

export default function SubstituteReviewQueue() {
  const { hasPermission } = useAuth();
  const { confirm } = useConfirmation();
  const canReview = Boolean(hasPermission('ministry', 'update'));
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resolvingId, setResolvingId] = useState(null);

  const loadRequests = useCallback(async () => {
    if (!canReview) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/services/substitutes');
      setRequests(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Substitute requests could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [canReview]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const resolveRequest = async (request, status) => {
    if (!canReview || resolvingId) return;
    const approving = status === 'approved';
    const service = serviceName(request);
    const replacement = personName(request.proposedSubstituteUser?.member, 'the proposed replacement');
    const message = approving
      ? request.proposed_substitute
        ? `Approve the substitute request for ${service} and assign ${replacement} to the ministry service?`
        : `Approve the substitute request for ${service}? The current assignee will remain unchanged.`
      : `Reject the substitute request for ${service}? The current assignment will remain unchanged.`;
    if (!(await confirm({
      title: approving ? 'Approve substitute request?' : 'Reject substitute request?',
      message,
      confirmLabel: approving ? 'Approve request' : 'Reject request',
      tone: 'warning',
    }))) return;

    setResolvingId(request.id);
    setError('');
    setNotice('');
    try {
      await axiosInstance.put(`/services/substitutes/${request.id}/resolve`, { status });
      setNotice(approving ? 'Substitute request approved.' : 'Substitute request rejected.');
      await loadRequests();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The substitute request could not be resolved.');
    } finally {
      setResolvingId(null);
    }
  };

  if (!canReview) return null;

  return (
    <section aria-label="Substitute request review" style={{ display: 'grid', gap: 14 }}>
      <div>
        <h2 style={{ margin: '0 0 5px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Substitute request review</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
          Review requests for services in your ministry scope. Approvals notify the requester and proposed replacement.
        </p>
      </div>
      {notice && <div role="status" style={{ padding: 12, borderRadius: 9, background: '#ecfdf5', color: '#047857' }}>{notice}</div>}
      {error && <div role="alert" style={{ padding: 12, borderRadius: 9, background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
      {loading ? (
        <div role="status" style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Loading substitute requests…</div>
      ) : requests.length === 0 ? (
        <div style={{ padding: 28, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', color: '#64748b' }}>
          No substitute requests are waiting for review.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                {['Requester', 'Service', 'Reason', 'Proposed replacement', 'Status', 'Actions'].map((heading) => (
                  <th key={heading} style={{ padding: 12, fontSize: 12, color: '#64748b' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const requester = request.requestedByUser;
                const proposer = request.proposedSubstituteUser?.member;
                const pending = request.status === 'pending';
                const busy = resolvingId === request.id;
                return (
                  <tr key={request.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 12, color: '#0f172a', fontWeight: 600 }}>
                      {personName(requester?.member, `Member #${requester?.member_id || request.requested_by}`)}
                    </td>
                    <td style={{ padding: 12, color: '#334155' }}>{serviceName(request)}</td>
                    <td style={{ padding: 12, color: '#334155', maxWidth: 260, whiteSpace: 'pre-wrap' }}>{request.reason}</td>
                    <td style={{ padding: 12, color: '#334155' }}>{personName(proposer, 'None proposed')}</td>
                    <td style={{ padding: 12, color: '#334155', textTransform: 'capitalize' }}>{request.status}</td>
                    <td style={{ padding: 12, whiteSpace: 'nowrap' }}>
                      {pending && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            aria-label={`Approve substitute request for ${serviceName(request)}`}
                            disabled={Boolean(resolvingId)}
                            onClick={() => resolveRequest(request, 'approved')}
                            style={{ padding: '7px 10px', border: 0, borderRadius: 7, background: '#047857', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}
                          >{busy ? 'Saving…' : 'Approve'}</button>
                          <button
                            type="button"
                            aria-label={`Reject substitute request for ${serviceName(request)}`}
                            disabled={Boolean(resolvingId)}
                            onClick={() => resolveRequest(request, 'rejected')}
                            style={{ padding: '7px 10px', border: 0, borderRadius: 7, background: '#dc2626', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}
                          >Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
