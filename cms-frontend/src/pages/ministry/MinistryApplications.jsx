import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

const statusColor = {
  pending: { color: '#a16207', background: '#fef3c7' },
  approved: { color: '#15803d', background: '#dcfce7' },
  rejected: { color: '#b91c1c', background: '#fee2e2' },
  withdrawn: { color: '#475569', background: '#f1f5f9' },
};

export function MemberMinistryApplications({ c, f, showToast }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [messages, setMessages] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await axiosInstance.get('/ministry-applications/opportunities');
      setOpportunities(response.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load ministry opportunities.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const apply = async (ministryRoleId) => {
    setSavingId(ministryRoleId); setError('');
    try {
      await axiosInstance.post('/ministry-applications', {
        ministry_role_id: ministryRoleId,
        message: messages[ministryRoleId] || '',
      });
      showToast?.('Your ministry application was submitted.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit the application.');
    } finally { setSavingId(null); }
  };

  const withdraw = async (application) => {
    if (!window.confirm('Withdraw this pending ministry application?')) return;
    setSavingId(application.ministry_role_id); setError('');
    try {
      await axiosInstance.delete(`/ministry-applications/${application.id}`);
      showToast?.('Your application was withdrawn.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not withdraw the application.');
    } finally { setSavingId(null); }
  };

  return (
    <section style={{ color: c?.t1 || '#0f172a' }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: '0 0 5px', fontSize: f?.lg || 18, fontWeight: 800 }}>Ministry opportunities</h2>
        <p style={{ margin: 0, color: c?.t3 || '#64748b', fontSize: f?.sm || 13 }}>Apply to serve in a ministry and follow each application here.</p>
      </div>
      {error && <div role="alert" style={{ padding: 10, marginBottom: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: f?.sm || 13 }}>{error}</div>}
      {loading ? <p style={{ color: c?.t3 || '#64748b' }}>Loading ministries…</p> : opportunities.length === 0 ? <p style={{ color: c?.t3 || '#64748b' }}>There are no ministry opportunities yet.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 12 }}>
          {opportunities.map((ministry) => {
            const application = ministry.application;
            const status = application?.status;
            const badge = statusColor[status] || statusColor.withdrawn;
            return (
              <article key={ministry.id} style={{ padding: 16, borderRadius: 10, border: `1px solid ${c?.border || '#e2e8f0'}`, background: c?.surface || '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: f?.base || 14 }}>{ministry.name}</strong>
                  {ministry.is_member ? <span style={{ ...S.badge, color: '#15803d', background: '#dcfce7' }}>Joined</span>
                    : status && <span style={{ ...S.badge, color: badge.color, background: badge.background }}>{status}</span>}
                </div>
                {!ministry.is_member && status !== 'pending' && status !== 'approved' && (
                  <textarea aria-label={`Message for ${ministry.name}`} value={messages[ministry.id] || ''} onChange={(event) => setMessages((current) => ({ ...current, [ministry.id]: event.target.value }))} placeholder="Optional message to the ministry leader" rows={2} style={{ ...S.textarea, background: c?.surfaceAlt || '#f8fafc', color: c?.t1 || '#0f172a', borderColor: c?.border || '#cbd5e1' }} />
                )}
                {application?.review_note && <p style={{ color: c?.t3 || '#64748b', fontSize: f?.xs || 12, margin: '10px 0 0' }}>Review note: {application.review_note}</p>}
                <div style={{ marginTop: 12 }}>
                  {ministry.is_member || status === 'approved' ? <span style={{ color: '#15803d', fontSize: f?.sm || 13 }}>You are already serving in this ministry.</span>
                    : status === 'pending' ? <button type="button" disabled={savingId === ministry.id} onClick={() => withdraw(application)} style={S.secondary}>{savingId === ministry.id ? 'Working…' : 'Withdraw application'}</button>
                      : <button type="button" disabled={savingId === ministry.id} onClick={() => apply(ministry.id)} style={S.primary}>{savingId === ministry.id ? 'Submitting…' : status === 'rejected' || status === 'withdrawn' ? 'Apply again' : 'Apply'}</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function MinistryApplicationQueue() {
  const [status, setStatus] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await axiosInstance.get('/ministry-applications', { params: { status, page: 1, limit: 100 } });
      setApplications(response.data.data?.applications || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load ministry applications.');
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const review = async (application, decision) => {
    const review_note = notes[application.id] || '';
    if (decision === 'rejected' && review_note.trim().length < 5) {
      setError('Enter a reason of at least five characters before rejecting an application.');
      return;
    }
    setSavingId(application.id); setError('');
    try {
      await axiosInstance.patch(`/ministry-applications/${application.id}/review`, { status: decision, ...(decision === 'rejected' && { review_note }) });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this application.');
    } finally { setSavingId(null); }
  };

  return (
    <section style={S.queue}>
      <div style={S.queueHeader}>
        <div><h2 style={{ margin: 0 }}>Ministry applications</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>Review applications for your ministry scope.</p></div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} style={S.select} aria-label="Application status">
          {['pending', 'approved', 'rejected', 'withdrawn'].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
        </select>
      </div>
      {error && <div role="alert" style={S.error}>{error}</div>}
      {loading ? <p style={{ color: '#64748b' }}>Loading applications…</p> : applications.length === 0 ? <p style={{ color: '#64748b' }}>No {status} applications.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {applications.map((application) => {
            const badge = statusColor[application.status] || statusColor.pending;
            return (
              <article key={application.id} style={S.application}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div><strong>{application.member?.first_name} {application.member?.last_name}</strong><div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>{application.ministryRole?.name} ministry · {new Date(application.created_at).toLocaleDateString()}</div></div>
                  <span style={{ ...S.badge, color: badge.color, background: badge.background }}>{application.status}</span>
                </div>
                {application.message && <p style={{ color: '#334155', fontSize: 13, whiteSpace: 'pre-wrap' }}>{application.message}</p>}
                {application.status === 'pending' && <>
                  <textarea aria-label={`Rejection reason for ${application.member?.first_name}`} rows={2} maxLength={1000} value={notes[application.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Reason required for rejection (at least 5 characters)" style={S.textarea} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 9 }}>
                    <button type="button" disabled={savingId === application.id} onClick={() => review(application, 'rejected')} style={S.reject}>{savingId === application.id ? 'Saving…' : 'Reject'}</button>
                    <button type="button" disabled={savingId === application.id} onClick={() => review(application, 'approved')} style={S.primary}>{savingId === application.id ? 'Saving…' : 'Approve and add to roster'}</button>
                  </div>
                </>}
                {application.review_note && <p style={{ color: '#64748b', fontSize: 12, marginBottom: 0 }}>Review note: {application.review_note}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const S = {
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  primary: { border: 0, borderRadius: 7, background: '#0f6aa3', color: '#fff', padding: '9px 13px', fontWeight: 700, cursor: 'pointer' },
  secondary: { border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#475569', padding: '8px 12px', fontWeight: 600, cursor: 'pointer' },
  textarea: { boxSizing: 'border-box', width: '100%', marginTop: 12, padding: 10, border: '1px solid #cbd5e1', borderRadius: 7, resize: 'vertical', font: 'inherit', fontSize: 13 },
  queue: { marginTop: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 },
  queueHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
  select: { padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', font: 'inherit' },
  error: { padding: 10, marginBottom: 12, borderRadius: 7, color: '#b91c1c', background: '#fef2f2', fontSize: 13 },
  reject: { border: '1px solid #fecaca', borderRadius: 7, background: '#fff', color: '#b91c1c', padding: '8px 13px', fontWeight: 700, cursor: 'pointer' },
  application: { border: '1px solid #e2e8f0', borderRadius: 9, padding: 14 },
};
