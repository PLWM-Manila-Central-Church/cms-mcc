import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
  draft:     { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  published: { bg: '#dcfce7', color: '#16a34a', label: 'Published' },
  completed: { bg: '#e8f4fd', color: '#0066b3', label: 'Completed' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
};

export default function EventDetailPage() {
  const { id }            = useParams();
  const navigate          = useNavigate();
  const { user, hasPermission } = useAuth();
  const canCreate         = hasPermission('events', 'create');

  const [event, setEvent]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regMessage, setRegMessage] = useState('');
  const [regError, setRegError]     = useState('');

  const fetchEvent = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await axiosInstance.get(`/events/${id}`);
      setEvent(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const isRegistered = event?.EventRegistrations?.some(r => r.member_id === user?.memberId);
  const regCount     = event?.EventRegistrations?.length ?? 0;
  const isFull       = event?.capacity && regCount >= event.capacity;
  const deadlinePassed = event?.registration_deadline && new Date() > new Date(event.registration_deadline);
  const canRegister  = event?.status === 'published' && !deadlinePassed && !isFull;

  const handleRegister = async () => {
    setRegLoading(true); setRegMessage(''); setRegError('');
    try {
      if (isRegistered) {
        await axiosInstance.delete(`/events/${id}/registrations`);
        setRegMessage('Your registration has been cancelled.');
      } else {
        await axiosInstance.post(`/events/${id}/registrations`);
        setRegMessage('You have successfully registered for this event!');
      }
      fetchEvent();
    } catch (err) {
      setRegError(err.response?.data?.message || 'Action failed.');
    } finally { setRegLoading(false); }
  };

  const handleRemoveReg = async (memberId, name) => {
    if (!window.confirm(`Remove registration for ${name}?`)) return;
    try {
      await axiosInstance.delete(`/events/${id}/registrations/${memberId}`);
      fetchEvent();
    } catch (err) { setError(err.response?.data?.message || 'Failed to remove registration.'); }
  };

  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) return <div style={s.loading}>Loading event...</div>;
  if (error)   return <div style={s.errorBox}>{error}</div>;
  if (!event)  return null;

  const meta = STATUS_META[event.status] || STATUS_META.draft;

  return (
    <div style={s.page}>
      <button onClick={() => navigate('/events')} style={s.backBtn}>← Back to Events</button>

      {/* Header card */}
      <div style={s.headerCard}>
        <div style={s.headerTop}>
          <div>
            <span style={{ ...s.badge, background: meta.bg, color: meta.color }}>{meta.label}</span>
            <span style={s.categoryTag}>{event.EventCategory?.name}</span>
          </div>
        </div>
        <h1 style={s.eventTitle}>{event.title}</h1>
        {event.description && <p style={s.eventDesc}>{event.description}</p>}

        <div style={s.detailsRow}>
          <div style={s.detailItem}>
            <span style={s.detailIcon}>📅</span>
            <div>
              <div style={s.detailLabel}>Date</div>
              <div style={s.detailValue}>
                {formatDate(event.start_date)}
                {event.end_date && event.end_date !== event.start_date && ` – ${formatDate(event.end_date)}`}
              </div>
            </div>
          </div>
          {event.start_time && (
            <div style={s.detailItem}>
              <span style={s.detailIcon}>🕐</span>
              <div>
                <div style={s.detailLabel}>Time</div>
                <div style={s.detailValue}>{formatTime(event.start_time)}</div>
              </div>
            </div>
          )}
          {event.location && (
            <div style={s.detailItem}>
              <span style={s.detailIcon}>📍</span>
              <div>
                <div style={s.detailLabel}>Location</div>
                <div style={s.detailValue}>{event.location}</div>
              </div>
            </div>
          )}
          <div style={s.detailItem}>
            <span style={s.detailIcon}>👥</span>
            <div>
              <div style={s.detailLabel}>Registered</div>
              <div style={s.detailValue}>{regCount}{event.capacity ? ` / ${event.capacity}` : ''}</div>
            </div>
          </div>
          {event.registration_deadline && (
            <div style={s.detailItem}>
              <span style={s.detailIcon}>⏰</span>
              <div>
                <div style={s.detailLabel}>Registration Deadline</div>
                <div style={{ ...s.detailValue, color: deadlinePassed ? '#dc2626' : '#0f172a' }}>
                  {new Date(event.registration_deadline).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {deadlinePassed && ' (Closed)'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Member register/unregister button */}
        {user?.memberId && event.status === 'published' && (
          <div style={{ marginTop: '20px' }}>
            {regMessage && <div style={s.successBox}>{regMessage}</div>}
            {regError   && <div style={s.errorBox}>{regError}</div>}

            {isRegistered ? (
              <div style={s.regRow}>
                <span style={s.regConfirmed}>✅ You are registered for this event</span>
                <button onClick={handleRegister} disabled={regLoading} style={s.cancelRegBtn}>
                  {regLoading ? '...' : 'Cancel Registration'}
                </button>
              </div>
            ) : canRegister ? (
              <button onClick={handleRegister} disabled={regLoading} style={s.registerBtn}>
                {regLoading ? 'Registering...' : '+ Register for this Event'}
              </button>
            ) : (
              <div style={s.closedBox}>
                {isFull ? '⚠️ This event is full.' : deadlinePassed ? '⚠️ Registration is closed.' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Registrations list — visible to admins/creators */}
      {canCreate && (
        <div style={s.regSection}>
          <h2 style={s.regTitle}>Registrations ({regCount})</h2>
          {event.EventRegistrations?.length === 0 ? (
            <div style={s.emptyReg}>No registrations yet.</div>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Member</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Barcode</th>
                    <th style={s.th}>Registered At</th>
                    <th style={s.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {event.EventRegistrations.map((r, i) => (
                    <tr key={r.id}
                      style={{ ...s.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...s.td, color: '#94a3b8' }}>{i + 1}</td>
                      <td style={s.td}>
                        <div style={s.memberCell}>
                          <div style={s.avatar}>{r.Member?.first_name?.[0]}{r.Member?.last_name?.[0]}</div>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>
                            {r.Member?.last_name}, {r.Member?.first_name}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...s.td, color: '#64748b' }}>{r.Member?.email || '—'}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{r.Member?.barcode || '—'}</td>
                      <td style={{ ...s.td, color: '#64748b' }}>
                        {new Date(r.registered_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={s.td}>
                        <button
                          onClick={() => handleRemoveReg(r.member_id, `${r.Member?.first_name} ${r.Member?.last_name}`)}
                          style={s.removeBtn}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  page:         { fontFamily: "'Segoe UI', sans-serif" },
  loading:      { padding: '48px', textAlign: 'center', color: '#94a3b8' },
  backBtn:      { background: 'none', border: 'none', color: '#0066b3', fontSize: '14px', cursor: 'pointer', fontWeight: '500', padding: '0 0 20px 0', display: 'block' },
  headerCard:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px 32px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  headerTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  badge:        { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', marginRight: '8px' },
  categoryTag:  { fontSize: '13px', color: '#94a3b8', fontWeight: '500' },
  eventTitle:   { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' },
  eventDesc:    { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px 0' },
  detailsRow:   { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  detailItem:   { display: 'flex', gap: '10px', alignItems: 'flex-start' },
  detailIcon:   { fontSize: '18px', marginTop: '2px' },
  detailLabel:  { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' },
  detailValue:  { fontSize: '14px', color: '#0f172a', fontWeight: '500', marginTop: '2px' },
  regRow:       { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  regConfirmed: { fontSize: '14px', color: '#16a34a', fontWeight: '600' },
  registerBtn:  { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  cancelRegBtn: { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  closedBox:    { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', display: 'inline-block' },
  successBox:   { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', marginBottom: '12px' },
  errorBox:     { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '12px' },
  regSection:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  regTitle:     { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0' },
  emptyReg:     { padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  tableWrap:    { borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  thead:        { background: '#f8fafc' },
  th:           { padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  row:          {},
  td:           { padding: '12px 14px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  memberCell:   { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar:       { width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  removeBtn:    { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
};
