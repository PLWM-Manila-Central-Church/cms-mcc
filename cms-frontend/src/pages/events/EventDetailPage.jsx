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
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canCreate    = hasPermission('events', 'create');
  const canDelete    = hasPermission('events', 'delete');
  // Self-registration requires events:create; self-unregister requires events:delete
  const canSelfRegister   = hasPermission('events', 'create');
  const canSelfUnregister = hasPermission('events', 'delete');

  const [event, setEvent]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regMessage, setRegMessage] = useState('');
  const [regError, setRegError]     = useState('');

  const [removingId, setRemovingId] = useState(null);
  const [removeMsg, setRemoveMsg]   = useState('');

  // ── Ministry Invite Panel (Ministry Leaders only) ────────────
  const [invites,         setInvites]         = useState([]);
  const [inviteLoading,   setInviteLoading]   = useState(false);
  const [inviteError,     setInviteError]     = useState('');
  const [inviteSuccess,   setInviteSuccess]   = useState('');
  const [ministryMembers, setMinistryMembers] = useState([]);
  const [selectedIds,     setSelectedIds]     = useState(new Set());
  const [inviteDeadline,  setInviteDeadline]  = useState('');
  const [sendingInvites,  setSendingInvites]  = useState(false);

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

  // Fetch invites + ministry roster when the user is a Ministry Leader
  useEffect(() => {
    if (!user?.ministryRoleId || !id) return;
    setInviteLoading(true);
    Promise.all([
      axiosInstance.get(`/events/${id}/invites`),
      axiosInstance.get('/ministry/members'),
    ])
      .then(([invRes, memRes]) => {
        setInvites(invRes.data.data || []);
        // Normalize: /ministry/members may return MinistryMembership rows (with .member nested)
        // OR flat Member objects. Flatten to a consistent array of plain member objects.
        const raw = memRes.data.data || [];
        const normalized = raw.map(item => item.member ?? item).filter(m => m && m.id);
        setMinistryMembers(normalized);
      })
      .catch(() => setInviteError('Failed to load invite data.'))
      .finally(() => setInviteLoading(false));
  }, [id, user?.ministryRoleId]);

  const isRegistered   = event?.EventRegistrations?.some(r => r.member_id === user?.memberId);
  const regCount       = event?.EventRegistrations?.length ?? 0;
  const isFull         = event?.capacity && regCount >= event.capacity;
  const deadlinePassed = event?.registration_deadline && new Date() > new Date(event.registration_deadline);
  const canRegister    = event?.status === 'published' && !deadlinePassed && !isFull;

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
    setRemovingId(memberId); setRemoveMsg('');
    try {
      await axiosInstance.delete(`/events/${id}/registrations/${memberId}`);
      setRemoveMsg(`Registration for ${name} has been removed.`);
      fetchEvent();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove registration.');
    } finally { setRemovingId(null); }
  };

  const toggleMember = (memberId) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });

  const handleSendInvites = async () => {
    if (selectedIds.size === 0) return;
    setSendingInvites(true); setInviteError(''); setInviteSuccess('');
    try {
      const res = await axiosInstance.post(`/events/${id}/invites`, {
        ministry_role_id:  user.ministryRoleId,
        member_ids:        [...selectedIds],
        response_deadline: inviteDeadline || null,
      });
      const { created, skipped } = res.data.data;
      setInviteSuccess(
        `${created.length} invite${created.length !== 1 ? 's' : ''} sent` +
        (skipped.length ? `, ${skipped.length} already invited` : '') + '.'
      );
      setSelectedIds(new Set());
      // Refresh invite list
      const invRes = await axiosInstance.get(`/events/${id}/invites`);
      setInvites(invRes.data.data || []);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to send invites.');
    } finally { setSendingInvites(false); }
  };

  const formatDate = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }) : '—';

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
                {event.end_date && event.end_date !== event.start_date
                  && ` – ${formatDate(event.end_date)}`}
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
                  {new Date(event.registration_deadline).toLocaleDateString('en-PH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {deadlinePassed && ' (Closed)'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Member self-register / self-unregister
            Only shown when the user has a member profile AND the correct permissions */}
        {user?.memberId && event.status === 'published' && (
          <div style={{ marginTop: '20px' }}>
            {regMessage && <div style={s.successBox}>{regMessage}</div>}
            {regError   && <div style={s.errorBox}>{regError}</div>}

            {isRegistered ? (
              <div style={s.regRow}>
                <span style={s.regConfirmed}>✅ You are registered for this event</span>
                {canSelfUnregister && (
                  <button onClick={handleRegister} disabled={regLoading} style={s.cancelRegBtn}>
                    {regLoading ? '...' : 'Cancel Registration'}
                  </button>
                )}
              </div>
            ) : canRegister && canSelfRegister ? (
              <button onClick={handleRegister} disabled={regLoading} style={s.registerBtn}>
                {regLoading ? 'Registering...' : '+ Register for this Event'}
              </button>
            ) : canRegister && !canSelfRegister ? (
              <div style={s.closedBox}>Registration available — contact the office to register.</div>
            ) : (
              <div style={s.closedBox}>
                {isFull ? '⚠️ This event is full.' : deadlinePassed ? '⚠️ Registration is closed.' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin registrations list */}
      {canCreate && (
        <div style={s.regSection}>
          <h2 style={s.regTitle}>Registrations ({regCount})</h2>

          {removeMsg && <div style={s.successBox}>{removeMsg}</div>}

          {event.EventRegistrations?.length === 0 ? (
            <div style={s.emptyReg}>No registrations yet.</div>
          ) : (
            <div style={s.tableWrap}>
              <div style={s.tableScroll}><table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Member</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Phone</th>
                    <th style={s.th}>Barcode</th>
                    <th style={s.th}>Registered At</th>
                    {canDelete && <th style={s.th}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {event.EventRegistrations.map((r, i) => (
                    <tr key={r.id} style={{ ...s.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...s.td, color: '#94a3b8' }}>{i + 1}</td>
                      <td style={s.td}>
                        <div style={s.memberCell}>
                          <div style={s.avatar}>
                            {r.member?.first_name?.[0]}{r.member?.last_name?.[0]}
                          </div>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>
                            {r.member?.last_name}, {r.member?.first_name}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...s.td, color: '#64748b' }}>{r.member?.email || '—'}</td>
                      <td style={{ ...s.td, color: '#64748b' }}>{r.member?.phone || '—'}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                        {r.member?.barcode || '—'}
                      </td>
                      <td style={{ ...s.td, color: '#64748b' }}>
                        {r.registered_at
                          ? new Date(r.registered_at).toLocaleDateString('en-PH', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      {canDelete && (
                        <td style={s.td}>
                          <button
                            onClick={() => handleRemoveReg(
                              r.member_id,
                              `${r.member?.first_name} ${r.member?.last_name}`
                            )}
                            disabled={removingId === r.member_id}
                            style={{
                              ...s.removeBtn,
                              opacity: removingId === r.member_id ? 0.6 : 1,
                              cursor: removingId === r.member_id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {removingId === r.member_id ? '...' : 'Remove'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}
        </div>
      )}
      {/* ── Ministry Invite Panel (Ministry Leaders only) ── */}
      {user?.ministryRoleId && (
        <div style={{ ...s.regSection, marginTop: 24 }}>
          <h2 style={s.regTitle}>⚡ Ministry Invites</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
            Invite members of your ministry to participate in this event.
          </p>

          {inviteError   && <div style={s.errorBox}>{inviteError}</div>}
          {inviteSuccess && <div style={s.successBox}>{inviteSuccess}</div>}

          {/* Multi-select member list */}
          {inviteLoading ? (
            <div style={{ padding: '16px', color: '#94a3b8', fontSize: 14 }}>Loading ministry members…</div>
          ) : ministryMembers.length === 0 ? (
            <div style={{ padding: '16px', color: '#94a3b8', fontSize: 14 }}>No members in your ministry roster yet.</div>
          ) : (
            <>
              <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Response Deadline</label>
                <input
                  type="datetime-local"
                  value={inviteDeadline}
                  onChange={e => setInviteDeadline(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 7, outline: 'none', fontFamily: 'inherit' }}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>(optional)</span>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                {ministryMembers.map((mem, i) => {
                  const checked = selectedIds.has(mem.id);
                  // Check if already invited
                  const existing = invites.find(inv => inv.member_id === mem.id);
                  return (
                    <div
                      key={mem.id}
                      onClick={() => !existing && toggleMember(mem.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        background: checked ? '#e8f4fd' : i % 2 === 0 ? '#fff' : '#f8fafc',
                        borderBottom: i < ministryMembers.length - 1 ? '1px solid #f1f5f9' : 'none',
                        cursor: existing ? 'default' : 'pointer',
                        opacity: existing ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox" checked={checked} readOnly
                        disabled={!!existing}
                        style={{ cursor: existing ? 'default' : 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#005599,#13B5EA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {mem.first_name?.[0]}{mem.last_name?.[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                          {mem.first_name} {mem.last_name}
                        </div>
                        {mem.email && <div style={{ fontSize: 12, color: '#94a3b8' }}>{mem.email}</div>}
                      </div>
                      {existing && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: existing.response_status === 'attending'     ? '#dcfce7' :
                                      existing.response_status === 'not_attending' ? '#fef2f2' : '#f1f5f9',
                          color:      existing.response_status === 'attending'     ? '#16a34a' :
                                      existing.response_status === 'not_attending' ? '#dc2626' : '#64748b',
                        }}>
                          {existing.response_status === 'attending'     ? '✅ Attending' :
                           existing.response_status === 'not_attending' ? '❌ Not Attending' : '⏳ Pending'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={handleSendInvites}
                  disabled={sendingInvites || selectedIds.size === 0}
                  style={{
                    background: selectedIds.size === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#9333ea)',
                    color: selectedIds.size === 0 ? '#94a3b8' : '#fff',
                    border: 'none', borderRadius: 8, padding: '10px 20px',
                    fontSize: 14, fontWeight: 700, cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                    opacity: sendingInvites ? 0.7 : 1,
                  }}
                >
                  {sendingInvites ? 'Sending…' : `Send Invites (${selectedIds.size})`}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </>
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
  headerCard:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: 'clamp(16px,4vw,32px)', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
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
  tableScroll:  { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  thead:        { background: '#f8fafc' },
  th:           { padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  row:          {},
  td:           { padding: '12px 14px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  memberCell:   { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar:       { width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  removeBtn:    { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: '600' },
};
