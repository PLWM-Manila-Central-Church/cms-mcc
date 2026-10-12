import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

const STATUS_STYLES = {
  pending: { background: '#fffbeb', color: '#b45309', label: 'Pending' },
  approved: { background: '#dcfce7', color: '#15803d', label: 'Approved' },
  rejected: { background: '#fef2f2', color: '#b91c1c', label: 'Rejected' },
};

const DEFAULT_THEME = {
  surface: '#ffffff',
  border: '#e2e8f0',
  borderL: '#f1f5f9',
  t1: '#0f172a',
  t2: '#475569',
  t3: '#64748b',
  accent: '#005599',
  accentL: '#eff6ff',
  danger: '#b91c1c',
  dangerL: '#fef2f2',
  success: '#15803d',
  successL: '#dcfce7',
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function MemberSubstituteRequests({ c, isMobile = false }) {
  const theme = { ...DEFAULT_THEME, ...(c || {}) };
  const [requests, setRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ service_id: '', reason: '', proposed_member_id: '' });
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberSearchComplete, setMemberSearchComplete] = useState(false);
  const searchTimeout = useRef(null);

  const fetchData = useCallback(async ({ preserveSuccess = false } = {}) => {
    setLoading(true);
    setError('');
    if (!preserveSuccess) setSuccess('');
    try {
      const [requestResponse, serviceResponse] = await Promise.all([
        axiosInstance.get('/services/substitutes/mine'),
        axiosInstance.get('/services/substitutes/eligible-services'),
      ]);
      const requestRows = requestResponse.data.data;
      const serviceRows = serviceResponse.data.data;
      setRequests(Array.isArray(requestRows) ? requestRows : []);
      setServices(Array.isArray(serviceRows) ? serviceRows : []);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, 'Could not load your substitute requests. Try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => clearTimeout(searchTimeout.current);
  }, [fetchData]);

  const resetForm = () => {
    clearTimeout(searchTimeout.current);
    setForm({ service_id: '', reason: '', proposed_member_id: '' });
    setMemberSearch('');
    setMemberResults([]);
    setMemberSearchLoading(false);
    setMemberSearchComplete(false);
    setFormError('');
  };

  const handleMemberSearch = (value) => {
    setMemberSearch(value);
    clearTimeout(searchTimeout.current);
    setMemberResults([]);
    setMemberSearchComplete(false);
    if (!value.trim() || !form.service_id) {
      setMemberSearchLoading(false);
      return;
    }

    setMemberSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await axiosInstance.get('/services/substitutes/replacements', {
          params: { service_id: Number(form.service_id), q: value.trim() },
        });
        const rows = response.data.data;
        setMemberResults(Array.isArray(rows) ? rows : []);
      } catch {
        setMemberResults([]);
      } finally {
        setMemberSearchLoading(false);
        setMemberSearchComplete(true);
      }
    }, 300);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const reason = form.reason.trim();
    if (!form.service_id || reason.length < 5 || reason.length > 500) {
      setFormError('Choose an assigned service and enter a reason between 5 and 500 characters.');
      return;
    }

    setSaving(true);
    setFormError('');
    setError('');
    setSuccess('');
    try {
      await axiosInstance.post('/services/substitutes', {
        service_id: Number(form.service_id),
        reason,
        ...(form.proposed_member_id && { proposed_member_id: Number(form.proposed_member_id) }),
      });
      setShowForm(false);
      resetForm();
      await fetchData({ preserveSuccess: true });
      setSuccess('Substitute request submitted. You can follow its status below.');
    } catch (submitError) {
      setFormError(apiErrorMessage(submitError, 'Failed to submit your substitute request.'));
    } finally {
      setSaving(false);
    }
  };

  const publishedServices = services.filter((service) => service.status === 'published');
  const fieldStyle = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 42,
    padding: '10px 12px',
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    background: theme.surface,
    color: theme.t1,
    font: 'inherit',
    fontSize: 14,
  };
  const statusStyle = (status) => {
    const meta = STATUS_STYLES[status] || STATUS_STYLES.pending;
    return { display: 'inline-flex', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, background: meta.background, color: meta.color };
  };

  return (
    <section
      aria-labelledby="member-substitute-requests-title"
      aria-busy={loading}
      style={{
        marginBottom: 24,
        padding: isMobile ? 14 : 20,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        background: theme.surface,
        color: theme.t1,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 id="member-substitute-requests-title" style={{ margin: 0, color: theme.t1, fontSize: isMobile ? 18 : 20, fontWeight: 800 }}>My substitute requests</h2>
          <p style={{ margin: '6px 0 0', color: theme.t2, fontSize: 13, lineHeight: 1.5 }}>Request a substitute for a published service where you are assigned. Your ministry reviewer will decide the request.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={fetchData} disabled={loading} aria-label="Refresh substitute requests" style={{ padding: '9px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, color: theme.t2, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (showForm) resetForm();
              setShowForm((current) => !current);
              setSuccess('');
            }}
            disabled={!showForm && publishedServices.length === 0}
            style={{ padding: '9px 14px', border: 0, borderRadius: 8, background: theme.accent, color: '#fff', fontWeight: 700, cursor: !showForm && publishedServices.length === 0 ? 'not-allowed' : 'pointer', opacity: !showForm && publishedServices.length === 0 ? 0.55 : 1 }}
          >
            {showForm ? 'Cancel request' : 'New request'}
          </button>
        </div>
      </div>

      {success && <div role="status" style={{ marginBottom: 12, padding: 11, borderRadius: 8, background: theme.successL, color: theme.success, fontSize: 13 }}>{success}</div>}
      {error && (
        <div role="alert" style={{ marginBottom: 12, padding: 11, borderRadius: 8, background: theme.dangerL, color: theme.danger, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>{error}</span>
          <button type="button" onClick={fetchData} style={{ border: 0, background: 'transparent', color: theme.danger, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, padding: isMobile ? 12 : 16, marginBottom: 16, border: `1px solid ${theme.borderL}`, borderRadius: 10, background: theme.accentL }}>
          <h3 style={{ margin: 0, color: theme.t1, fontSize: 16 }}>Submit a substitute request</h3>
          {formError && <div role="alert" style={{ padding: 10, borderRadius: 8, background: theme.dangerL, color: theme.danger, fontSize: 13 }}>{formError}</div>}
          {publishedServices.length === 0 && <p role="status" style={{ margin: 0, color: theme.t2 }}>No published ministry assignments are available for a substitute request.</p>}
          <div>
            <label htmlFor="member-substitute-service" style={{ display: 'block', marginBottom: 6, color: theme.t1, fontWeight: 700, fontSize: 13 }}>Service <span aria-hidden="true">*</span></label>
            <select
              id="member-substitute-service"
              value={form.service_id}
              onChange={(event) => {
                clearTimeout(searchTimeout.current);
                setForm((current) => ({ ...current, service_id: event.target.value, proposed_member_id: '' }));
                setMemberSearch('');
                setMemberResults([]);
                setMemberSearchLoading(false);
                setMemberSearchComplete(false);
              }}
              required
              disabled={!publishedServices.length}
              style={fieldStyle}
            >
              <option value="">Select an assigned service</option>
              {publishedServices.map((service) => <option key={service.id} value={service.id}>{service.title} — {formatDate(service.service_date)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="member-substitute-reason" style={{ display: 'block', marginBottom: 6, color: theme.t1, fontWeight: 700, fontSize: 13 }}>Reason <span aria-hidden="true">*</span></label>
            <textarea
              id="member-substitute-reason"
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Explain why you cannot attend this service."
              rows={3}
              minLength={5}
              maxLength={500}
              required
              style={{ ...fieldStyle, height: 'auto', resize: 'vertical' }}
            />
            <div style={{ marginTop: 4, textAlign: 'right', color: theme.t3, fontSize: 12 }}>{form.reason.length}/500</div>
          </div>
          <div>
            <label htmlFor="member-substitute-replacement" style={{ display: 'block', marginBottom: 6, color: theme.t1, fontWeight: 700, fontSize: 13 }}>Proposed replacement <span style={{ color: theme.t3, fontWeight: 400 }}>(optional)</span></label>
            <div style={{ position: 'relative' }}>
              <input
                id="member-substitute-replacement"
                type="search"
                value={memberSearch}
                onChange={(event) => handleMemberSearch(event.target.value)}
                placeholder={form.service_id ? 'Search your ministry roster…' : 'Select a service first'}
                disabled={!form.service_id}
                autoComplete="off"
                style={fieldStyle}
              />
              {memberResults.length > 0 && (
                <ul role="listbox" aria-label="Eligible ministry replacements" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, margin: 0, padding: 0, listStyle: 'none', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                  {memberResults.map((member) => (
                    <li key={member.id}>
                      <button type="button" role="option" aria-selected={Number(form.proposed_member_id) === Number(member.id)} onClick={() => { clearTimeout(searchTimeout.current); setForm((current) => ({ ...current, proposed_member_id: member.id })); setMemberSearch(`${member.last_name}, ${member.first_name}`); setMemberResults([]); setMemberSearchLoading(false); setMemberSearchComplete(false); }} style={{ width: '100%', padding: '10px 12px', border: 0, borderBottom: `1px solid ${theme.borderL}`, background: 'transparent', color: theme.t1, textAlign: 'left', font: 'inherit', cursor: 'pointer' }}>{member.last_name}, {member.first_name}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {memberSearch.trim() && <p role="status" style={{ minHeight: 18, margin: '5px 0 0', color: theme.t3, fontSize: 12 }}>{memberSearchLoading ? 'Searching your ministry roster…' : memberSearchComplete && memberResults.length === 0 && !form.proposed_member_id ? 'No active replacement matched in your ministry roster.' : form.proposed_member_id ? 'Replacement selected.' : ''}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }} disabled={saving} style={{ padding: '9px 13px', border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, color: theme.t2, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving || !publishedServices.length} style={{ padding: '9px 14px', border: 0, borderRadius: 8, background: theme.accent, color: '#fff', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving || !publishedServices.length ? 0.65 : 1 }}>{saving ? 'Submitting…' : 'Submit request'}</button>
          </div>
        </form>
      )}

      {loading ? <p role="status" style={{ margin: 0, padding: 18, color: theme.t3, textAlign: 'center' }}>Loading substitute requests…</p>
        : requests.length === 0 ? <p style={{ margin: 0, padding: 18, color: theme.t3, textAlign: 'center' }}>{publishedServices.length ? 'No substitute requests yet.' : 'No published ministry service assignments are available for a request.'}</p>
          : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 590, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: theme.accentL, color: theme.t2, textAlign: 'left' }}>
                <th scope="col" style={{ padding: '10px 12px' }}>Service</th><th scope="col" style={{ padding: '10px 12px' }}>Reason</th><th scope="col" style={{ padding: '10px 12px' }}>Proposed replacement</th><th scope="col" style={{ padding: '10px 12px' }}>Status</th><th scope="col" style={{ padding: '10px 12px' }}>Submitted</th>
              </tr></thead>
              <tbody>
                {requests.map((request) => {
                  const status = STATUS_STYLES[request.status] || STATUS_STYLES.pending;
                  const serviceTitle = request.assignment?.Service?.title || `Service #${request.assignment?.service_id || '—'}`;
                  const proposed = request.proposedSubstituteUser?.member;
                  return (
                    <tr key={request.id} style={{ borderBottom: `1px solid ${theme.borderL}` }}>
                      <td style={{ padding: '11px 12px', color: theme.t1, fontWeight: 700 }}>{serviceTitle}</td>
                      <td style={{ padding: '11px 12px', color: theme.t2, maxWidth: 240, whiteSpace: 'pre-wrap' }}>{request.reason}</td>
                      <td style={{ padding: '11px 12px', color: theme.t2 }}>{proposed ? `${proposed.last_name}, ${proposed.first_name}` : 'None'}</td>
                      <td style={{ padding: '11px 12px' }}><span style={statusStyle(request.status)}>{status.label}</span></td>
                      <td style={{ padding: '11px 12px', color: theme.t3, whiteSpace: 'nowrap' }}>{formatDate(request.created_at || request.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>}
    </section>
  );
}
