import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { displayMemberName } from '../../utils/displayIdentity';

const CARE_STAGES = [
  { id: 'needs_followup', label: 'Needs Follow-up' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'visitation_scheduled', label: 'Visitation Scheduled' },
  { id: 'completed', label: 'Completed' },
];

export default function MinistryEngagementTabs({ ministryId, members = [], canManage = false, activeTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [actForm, setActForm] = useState({ title: '', activity_type: 'fellowship', activity_date: '', start_time: '', location: '' });
  const [annForm, setAnnForm] = useState({ title: '', body: '', is_pinned: false });
  const [msgForm, setMsgForm] = useState({ member_id: '', subject: '', body: '' });
  const [visitForm, setVisitForm] = useState({ member_id: '', visit_date: new Date().toISOString().slice(0, 10), visit_type: 'follow_up', care_stage: 'contacted', notes: '' });

  const load = useCallback(async () => {
    if (!ministryId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/ministries/${ministryId}/engagement`);
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load ministry engagement.');
    } finally {
      setLoading(false);
    }
  }, [ministryId]);

  useEffect(() => { load(); }, [load]);

  const createActivity = async (e) => {
    e.preventDefault();
    if (!actForm.title.trim() || !actForm.activity_date) return;
    try {
      await axiosInstance.post(`/ministries/${ministryId}/activities`, actForm);
      setActForm({ title: '', activity_type: 'fellowship', activity_date: '', start_time: '', location: '' });
      setNotice('Ministry activity scheduled.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to schedule activity.');
    }
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();
    if (!annForm.title.trim() || !annForm.body.trim()) return;
    try {
      await axiosInstance.post(`/ministries/${ministryId}/announcements`, annForm);
      setAnnForm({ title: '', body: '', is_pinned: false });
      setNotice('Announcement published to ministry members.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to publish announcement.');
    }
  };

  const sendDirectMessage = async (e) => {
    e.preventDefault();
    if (!msgForm.member_id || !msgForm.body.trim()) return;
    try {
      await axiosInstance.post(`/ministries/${ministryId}/messages`, {
        member_id: Number(msgForm.member_id),
        subject: msgForm.subject.trim() || null,
        body: msgForm.body.trim(),
      });
      setMsgForm({ member_id: '', subject: '', body: '' });
      setNotice('Direct message sent to member.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send message.');
    }
  };

  const respondFeedback = async (feedbackId, status) => {
    const reply = window.prompt('Optional caring response to member:', '') ?? '';
    try {
      await axiosInstance.post(`/ministries/${ministryId}/feedback/${feedbackId}/respond`, {
        status,
        leader_response: reply.trim() || null,
      });
      setNotice('Prayer request / feedback updated.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update feedback.');
    }
  };

  const logVisitation = async (e) => {
    e.preventDefault();
    if (!visitForm.member_id) return;
    try {
      await axiosInstance.post(`/ministries/${ministryId}/visitations`, {
        ...visitForm,
        member_id: Number(visitForm.member_id),
      });
      setVisitForm({ member_id: '', visit_date: new Date().toISOString().slice(0, 10), visit_type: 'follow_up', care_stage: 'contacted', notes: '' });
      setNotice('Pastoral care / visitation logged.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to log visitation.');
    }
  };

  const changeVisitStage = async (visitId, care_stage) => {
    try {
      await axiosInstance.patch(`/ministries/${ministryId}/visitations/${visitId}/stage`, { care_stage });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update care stage.');
    }
  };

  if (loading && !data) return <p style={S.muted}>Loading engagement data…</p>;
  if (!data) return null;

  return (
    <div style={S.wrap}>
      {error && <div style={S.errorBox} role="alert">{error}</div>}
      {notice && <div style={S.noticeBox}>{notice}</div>}

      {activeTab === 'activities' && (
        <div style={S.stack}>
          {canManage && (
            <form onSubmit={createActivity} style={S.box}>
              <div style={S.subTitle}>Schedule Ministry Activity</div>
              <div style={S.row}>
                <input value={actForm.title} onChange={(e) => setActForm({ ...actForm, title: e.target.value })} placeholder="Activity title (e.g. Monthly Youth Fellowship)" style={S.input} required />
                <select value={actForm.activity_type} onChange={(e) => setActForm({ ...actForm, activity_type: e.target.value })} style={{ ...S.input, maxWidth: 140 }}>
                  <option value="fellowship">Fellowship</option>
                  <option value="bible_study">Bible Study</option>
                  <option value="outreach">Outreach</option>
                  <option value="camp">Camp / Retreat</option>
                  <option value="meeting">Meeting</option>
                </select>
                <input type="date" value={actForm.activity_date} onChange={(e) => setActForm({ ...actForm, activity_date: e.target.value })} style={{ ...S.input, maxWidth: 150 }} required />
                <input value={actForm.location} onChange={(e) => setActForm({ ...actForm, location: e.target.value })} placeholder="Venue" style={S.input} />
                <button type="submit" style={S.primaryBtn}>Add Activity</button>
              </div>
            </form>
          )}
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Activity</th>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>RSVP (Yes / Maybe / No)</th>
                  <th style={S.th}>Actual Check-ins</th>
                </tr>
              </thead>
              <tbody>
                {(data.activities || []).length === 0 ? (
                  <tr><td colSpan={4} style={S.empty}>No ministry activities scheduled yet.</td></tr>
                ) : data.activities.map((a) => (
                  <tr key={a.id} style={S.tr}>
                    <td style={S.td}><strong>{a.title}</strong><div style={S.sub}>{a.activity_type} · {a.location || 'TBD'}</div></td>
                    <td style={S.td}>{a.activity_date}</td>
                    <td style={S.td}>
                      <span style={S.pillYes}>{a.rsvp_yes || 0} Yes</span>{' '}
                      <span style={S.pillMuted}>{a.rsvp_maybe || 0} Maybe</span>{' '}
                      <span style={S.pillNo}>{a.rsvp_no || 0} No</span>
                    </td>
                    <td style={S.td}><strong>{a.actual_attended || 0}</strong> verified</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'comms' && (
        <div style={S.stack}>
          {canManage && (
            <form onSubmit={postAnnouncement} style={S.box}>
              <div style={S.subTitle}>Publish Ministry Announcement</div>
              <div style={S.row}>
                <input value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder="Announcement title" style={S.input} required />
                <input value={annForm.body} onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })} placeholder="Details for ministry members…" style={{ ...S.input, flex: '2 1 260px' }} required />
                <button type="submit" style={S.primaryBtn}>Publish</button>
              </div>
            </form>
          )}
          <div>
            <h3 style={S.subTitle}>Recent Announcements ({data.announcements?.length || 0})</h3>
            {(data.announcements || []).length === 0 ? <p style={S.muted}>No announcements posted yet.</p> : (
              <div style={S.stackSm}>
                {data.announcements.map((a) => (
                  <div key={a.id} style={S.itemCard}>
                    <div style={{ fontWeight: 700, color: '#003d70', fontSize: 13.5 }}>{a.title}</div>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#334155' }}>{a.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {canManage && (
            <form onSubmit={sendDirectMessage} style={S.box}>
              <div style={S.subTitle}>Send Direct Caring Message to Member</div>
              <div style={S.row}>
                <select value={msgForm.member_id} onChange={(e) => setMsgForm({ ...msgForm, member_id: e.target.value })} style={S.input} required>
                  <option value="">Select member…</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{displayMemberName(m)}</option>)}
                </select>
                <input value={msgForm.subject} onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })} placeholder="Subject (optional)" style={S.input} />
                <input value={msgForm.body} onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })} placeholder="Message…" style={{ ...S.input, flex: '2 1 220px' }} required />
                <button type="submit" style={S.primaryBtn}>Send</button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'care' && (
        <div style={S.stack}>
          <div>
            <h3 style={S.subTitle}>Member Prayer Requests &amp; Feedback ({data.feedback?.length || 0})</h3>
            {(data.feedback || []).length === 0 ? <p style={S.muted}>No prayer requests or feedback submitted yet.</p> : (
              <div style={S.stackSm}>
                {data.feedback.map((f) => (
                  <div key={f.id} style={S.itemCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <strong>{f.member ? displayMemberName(f.member) : 'Member'} · {f.category.replace('_', ' ')}</strong>
                      <span style={S.pillYes}>{f.status.replace('_', ' ')}</span>
                    </div>
                    <p style={{ margin: '6px 0', fontSize: 13, color: '#0f172a' }}>{f.message}</p>
                    {f.leader_response && <div style={{ fontSize: 12.5, color: '#005599' }}>Response: {f.leader_response}</div>}
                    {canManage && f.status !== 'resolved' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button type="button" onClick={() => respondFeedback(f.id, 'prayed_for')} style={S.smallBtn}>Mark Prayed For</button>
                        <button type="button" onClick={() => respondFeedback(f.id, 'resolved')} style={S.smallGhostBtn}>Resolve</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 style={S.subTitle}>5-Stage Pastoral Follow-up &amp; Visitations</h3>
            {canManage && (
              <form onSubmit={logVisitation} style={S.box}>
                <div style={S.row}>
                  <select value={visitForm.member_id} onChange={(e) => setVisitForm({ ...visitForm, member_id: e.target.value })} style={S.input} required>
                    <option value="">Select member…</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{displayMemberName(m)}</option>)}
                  </select>
                  <select value={visitForm.visit_type} onChange={(e) => setVisitForm({ ...visitForm, visit_type: e.target.value })} style={S.input}>
                    <option value="follow_up">Follow-up Call/Chat</option>
                    <option value="home_visit">Home Visit</option>
                    <option value="hospital_visit">Hospital Visit</option>
                    <option value="counseling">Pastoral Counseling</option>
                  </select>
                  <select value={visitForm.care_stage} onChange={(e) => setVisitForm({ ...visitForm, care_stage: e.target.value })} style={S.input}>
                    {CARE_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <input value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} placeholder="Care notes" style={S.input} />
                  <button type="submit" style={S.primaryBtn}>Log Care</button>
                </div>
              </form>
            )}
            <table style={S.table}>
              <thead><tr><th style={S.th}>Member</th><th style={S.th}>Date / Type</th><th style={S.th}>Notes</th><th style={S.th}>5-Stage Care Status</th></tr></thead>
              <tbody>
                {(data.visitations || []).length === 0 ? <tr><td colSpan={4} style={S.empty}>No visitation logs recorded yet.</td></tr> : data.visitations.map((v) => (
                  <tr key={v.id} style={S.tr}>
                    <td style={S.td}><strong>{v.member ? displayMemberName(v.member) : '—'}</strong></td>
                    <td style={S.td}>{v.visit_date} · {v.visit_type.replace('_', ' ')}</td>
                    <td style={S.td}>{v.notes || '—'}</td>
                    <td style={S.td}>
                      {canManage ? (
                        <select value={v.care_stage} onChange={(e) => changeVisitStage(v.id, e.target.value)} style={S.selectSm}>
                          {CARE_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      ) : v.care_stage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && data.reports && (
        <div style={S.stack}>
          <div style={S.kpiRow}>
            <Stat label="Participation Rate" value={`${data.reports.participation_rate_pct}%`} />
            <Stat label="RSVP Yes vs. Actual" value={`${data.reports.rsvp_yes_total} / ${data.reports.actual_attendance_total}`} />
            <Stat label="Active / Inactive" value={`${data.reports.active_members} / ${data.reports.inactive_members}`} />
            <Stat label="Open Prayer Requests" value={String(data.reports.open_prayer_requests)} />
          </div>
          {(data.reports.decline_reasons || []).length > 0 && (
            <div>
              <h3 style={S.subTitle}>Common RSVP Decline Reasons</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: '#334155' }}>
                {data.reports.decline_reasons.map((d) => <li key={d.reason}>{d.reason}: <strong>{d.count}</strong></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderTop: '3px solid #005599', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52647a', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{value}</div>
    </div>
  );
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 },
  stack: { display: 'flex', flexDirection: 'column', gap: 14 },
  stackSm: { display: 'flex', flexDirection: 'column', gap: 8 },
  box: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
  itemCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
  subTitle: { margin: '0 0 8px', fontSize: 13.5, fontWeight: 700, color: '#003d70' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { flex: '1 1 140px', minWidth: 0, boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff' },
  selectSm: { padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12.5, background: '#fff' },
  primaryBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  smallBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  smallGhostBtn: { background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 11.5, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '8px 10px', color: '#0f172a', verticalAlign: 'middle' },
  sub: { fontSize: 11.5, color: '#64748b' },
  empty: { padding: 18, textAlign: 'center', color: '#64748b' },
  pillYes: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 },
  pillMuted: { background: '#f1f5f9', color: '#52647a', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 },
  pillNo: { background: '#fee2e2', color: '#991b1b', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 },
  muted: { fontSize: 13, color: '#64748b', margin: '4px 0' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
  noticeBox: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
};
