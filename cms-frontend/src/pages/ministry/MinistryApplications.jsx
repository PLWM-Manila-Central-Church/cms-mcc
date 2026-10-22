import { useCallback, useEffect, useRef, useState } from 'react';
import useDialogFocus from '../../hooks/useDialogFocus';
import axiosInstance from '../../api/axiosInstance';
import { useConfirmation } from '../../context/ConfirmationContext';

const statusColor = {
  pending: { color: '#a16207', background: '#fef3c7' },
  approved: { color: '#15803d', background: '#dcfce7' },
  rejected: { color: '#b91c1c', background: '#fee2e2' },
  withdrawn: { color: '#475569', background: '#f1f5f9' },
};

const formatApplicationDate = (application) => {
  const value = application.created_at || application.createdAt;
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

export function MemberMinistryApplications({ c, f, showToast }) {
  const { confirm } = useConfirmation();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [messages, setMessages] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const applicationRef = useRef(null);
  useDialogFocus(Boolean(selected), applicationRef, () => { if (!savingId) setSelected(null); });
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
      setSelected(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit the application.');
    } finally { setSavingId(null); }
  };

  const withdraw = async (application) => {
    if (!(await confirm({
      title: 'Withdraw ministry application?',
      message: 'This pending ministry application will be withdrawn.',
      confirmLabel: 'Withdraw application',
      tone: 'warning',
    }))) return;
    setSavingId(application.ministry_role_id); setError('');
    try {
      await axiosInstance.post(`/ministry-applications/${application.id}/withdraw`);
      showToast?.('Your application was withdrawn.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not withdraw the application.');
    } finally { setSavingId(null); }
  };

  const visibleOpportunities = opportunities.filter(ministry => ministry.name.toLowerCase().includes(search.trim().toLowerCase()) && (filter === 'all' || filter === 'joined' && (ministry.is_member || ministry.application?.status === 'approved') || filter === 'pending' && ministry.application?.status === 'pending' || filter === 'available' && !ministry.is_member && !['pending', 'approved'].includes(ministry.application?.status)));

  return (
    <section style={{ color: c?.t1 || 'var(--mcc-ink, #0f172a)' }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: '0 0 5px', fontSize: f?.lg || 18, fontWeight: 800 }}>Ministry opportunities</h2>
        <p style={{ margin: 0, color: c?.t3 || 'var(--mcc-secondary, #52647a)', fontSize: f?.sm || 13 }}>Apply to serve in a ministry and follow each application here.</p>
      </div>
      {error && <div role="alert" style={{ padding: 10, marginBottom: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: f?.sm || 13 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input aria-label="Search ministries" placeholder="Find a ministry…" value={search} onChange={event => setSearch(event.target.value)} style={{ ...S.textarea, flex: '1 1 220px', margin: 0, color: c?.t1, background: c?.surface, borderColor: c?.border }} />
        <select aria-label="Filter ministry opportunities" value={filter} onChange={event => setFilter(event.target.value)} style={{ ...S.select, background: c?.surface, color: c?.t1 }}>
          <option value="all">All ministries</option><option value="available">Available to join</option><option value="pending">My pending applications</option><option value="joined">My ministries</option>
        </select>
      </div>
      {!loading && opportunities.length > 0 && visibleOpportunities.length === 0 && <p role="status">No ministries match these filters.</p>}
      {loading ? <p style={{ color: c?.t3 || 'var(--mcc-secondary, #52647a)' }}>Loading ministries…</p> : opportunities.length === 0 ? <p style={{ color: c?.t3 || 'var(--mcc-secondary, #52647a)' }}>There are no ministry opportunities yet.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 12 }}>
          {visibleOpportunities.map((ministry) => {
            const application = ministry.application;
            const status = application?.status;
            const badge = statusColor[status] || statusColor.withdrawn;
            return (
              <article key={ministry.id} style={{ padding: 16, borderRadius: 10, border: `1px solid ${c?.border || '#e2e8f0'}`, background: c?.surface || 'var(--mcc-surface, #fff)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: f?.base || 14 }}>{ministry.name}</strong>
                  {ministry.is_member ? <span style={{ ...S.badge, color: '#15803d', background: '#dcfce7' }}>Joined</span>
                    : status && <span style={{ ...S.badge, color: badge.color, background: badge.background }}>{status}</span>}
                </div>
                {application?.review_note && <p style={{ color: c?.t3 || 'var(--mcc-secondary, #52647a)', fontSize: f?.xs || 12, margin: '10px 0 0' }}>Review note: {application.review_note}</p>}
                <div style={{ marginTop: 12 }}>
                  {ministry.is_member || status === 'approved' ? <span style={{ color: '#15803d', fontSize: f?.sm || 13 }}>You are already serving in this ministry.</span>
                    : status === 'pending' ? <button type="button" disabled={savingId === ministry.id} onClick={() => withdraw(application)} style={S.secondary}>{savingId === ministry.id ? 'Working…' : 'Withdraw application'}</button>
                      : <button type="button" disabled={savingId === ministry.id} onClick={() => { setError(''); setSelected(ministry); }} style={S.primary}>{status === 'rejected' || status === 'withdrawn' ? 'Apply again' : 'Apply'}</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected && <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: '#0f172a80', display: 'grid', placeItems: 'center', padding: 20 }}>
        <section ref={applicationRef} role="dialog" aria-modal="true" aria-labelledby="ministry-application-title" tabIndex={-1} style={{ background: c?.surface || '#fff', color: c?.t1, borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
          <h2 id="ministry-application-title" style={{ marginTop: 0 }}>Apply to {selected.name}</h2>
          <p style={{ color: c?.t3 }}>Your ministry leader will review this application.</p>
          <form onSubmit={event => { event.preventDefault(); apply(selected.id); }}>
            <label htmlFor="ministry-application-message">Message (optional)</label>
            <textarea id="ministry-application-message" value={messages[selected.id] || ''} onChange={event => setMessages(current => ({ ...current, [selected.id]: event.target.value }))} rows={4} maxLength={2000} style={{ ...S.textarea, color: c?.t1, background: c?.surfaceAlt, borderColor: c?.border }} />
            {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" disabled={Boolean(savingId)} onClick={() => setSelected(null)} style={S.secondary}>Cancel</button>
              <button type="submit" disabled={Boolean(savingId)} style={S.primary}>{savingId ? 'Submitting…' : 'Submit application'}</button>
            </div>
          </form>
        </section>
      </div>}
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
        <div><h2 style={{ margin: 0 }}>Ministry applications</h2><p style={{ margin: '5px 0 0', color: 'var(--mcc-secondary, #52647a)', fontSize: 13 }}>Review applications for your ministry scope.</p></div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} style={S.select} aria-label="Application status">
          {['pending', 'approved', 'rejected', 'withdrawn'].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
        </select>
      </div>
      {error && <div role="alert" style={S.error}>{error}</div>}
      {loading ? <p style={{ color: 'var(--mcc-secondary, #52647a)' }}>Loading applications…</p> : applications.length === 0 ? <p style={{ color: 'var(--mcc-secondary, #52647a)' }}>No {status} applications.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {applications.map((application) => {
            const badge = statusColor[application.status] || statusColor.pending;
            return (
              <article key={application.id} style={S.application}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div><strong>{application.member?.first_name} {application.member?.last_name}</strong><div style={{ marginTop: 4, color: 'var(--mcc-secondary, #52647a)', fontSize: 13 }}>{application.ministryRole?.name} ministry · {formatApplicationDate(application)}</div></div>
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
                {application.review_note && <p style={{ color: 'var(--mcc-secondary, #52647a)', fontSize: 12, marginBottom: 0 }}>Review note: {application.review_note}</p>}
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
  primary: { border: 0, borderRadius: 7, background: '#0f6aa3', color: 'var(--mcc-surface, #fff)', padding: '9px 13px', fontWeight: 700, cursor: 'pointer' },
  secondary: { border: '1px solid #cbd5e1', borderRadius: 7, background: 'var(--mcc-surface, #fff)', color: '#475569', padding: '8px 12px', fontWeight: 600, cursor: 'pointer' },
  textarea: { boxSizing: 'border-box', width: '100%', marginTop: 12, padding: 10, border: '1px solid #cbd5e1', borderRadius: 7, resize: 'vertical', font: 'inherit', fontSize: 13 },
  queue: { marginTop: 22, background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 'var(--mcc-radius, 16px)', padding: 20 },
  queueHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
  select: { padding: '8px 10px', borderRadius: 7, border: '1px solid #cbd5e1', background: 'var(--mcc-surface, #fff)', font: 'inherit' },
  error: { padding: 10, marginBottom: 12, borderRadius: 7, color: '#b91c1c', background: '#fef2f2', fontSize: 13 },
  reject: { border: '1px solid #fecaca', borderRadius: 7, background: 'var(--mcc-surface, #fff)', color: '#b91c1c', padding: '8px 13px', fontWeight: 700, cursor: 'pointer' },
  application: { border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 9, padding: 14 },
};
