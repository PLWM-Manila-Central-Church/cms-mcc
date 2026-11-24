import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

export default function PortalEngagementPanel({ colors }) {
  const C = colors || {
    surface: '#fff', surfaceAlt: '#f8fafc', border: '#e2e8f0',
    t1: '#0f172a', t2: '#475569', t3: '#64748b', accent: '#005599', accentL: '#e8f4fd',
  };

  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');
  const [fbForm, setFbForm] = useState({ category: 'prayer_request', subject: '', message: '' });
  const [msgBody, setMsgBody] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/member-portal/engagement');
      setData(res.data?.data || null);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitRsvp = async (activityId, response) => {
    let decline_reason = null;
    if (response === 'no') {
      decline_reason = window.prompt('Optional reason (helps your leader care for you):', '') || null;
    }
    try {
      await axiosInstance.post(`/member-portal/activities/${activityId}/rsvp`, { response, decline_reason });
      setNotice('Your RSVP has been saved. Remember to scan your QR at the venue for physical attendance.');
      await load();
    } catch {}
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!fbForm.message.trim()) return;
    try {
      await axiosInstance.post('/member-portal/feedback', fbForm);
      setFbForm({ category: 'prayer_request', subject: '', message: '' });
      setNotice('Your prayer request / note has been shared confidentially with your ministry leader.');
      await load();
    } catch {}
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!msgBody.trim()) return;
    try {
      await axiosInstance.post('/member-portal/messages', {
        ministry_group_id: data?.ministry?.id || null,
        body: msgBody.trim(),
      });
      setMsgBody('');
      setNotice('Message sent to your ministry leader.');
      await load();
    } catch {}
  };

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      {notice && (
        <div role="status" style={{ background: C.accentL, border: '1px solid #bae6fd', color: '#003d70', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
          {notice}
        </div>
      )}

      {/* Ministry Activities RSVP */}
      <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15.5, fontWeight: 700, color: C.t1 }}>
          {data.ministry?.name ? `${data.ministry.name} Activities & RSVP` : 'Ministry Activities & RSVP'}
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: C.t3 }}>
          Let your leader know if you plan to attend. RSVPs help with preparation and stay separate from actual venue check-in.
        </p>
        {(data.activities || []).length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: C.t3 }}>No upcoming ministry activities right now.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.activities.map((a) => (
              <div key={a.id} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.t1 }}>{a.title}</div>
                  <div style={{ fontSize: 12.5, color: C.t2 }}>{a.activity_date}{a.start_time ? ` · ${a.start_time}` : ''}{a.location ? ` · ${a.location}` : ''}</div>
                  {a.my_decline_reason && <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>Note: {a.my_decline_reason}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['yes', 'maybe', 'no'].map((opt) => {
                    const selected = a.my_response === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => submitRsvp(a.id, opt)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${selected ? '#005599' : '#cbd5e1'}`,
                          background: selected ? '#005599' : '#fff',
                          color: selected ? '#fff' : '#334155',
                          textTransform: 'capitalize',
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Announcements & Messages */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
        <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: C.t1 }}>Ministry Announcements</h3>
          {(data.announcements || []).length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: C.t3 }}>No announcements yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.announcements.map((a) => (
                <div key={a.id} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 9, padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#003d70' }}>{a.title}</div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: C.t2 }}>{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: C.t1 }}>Messages with Your Leader</h3>
          {(data.messages || []).length === 0 ? (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: C.t3 }}>No direct messages yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
              {data.messages.map((m) => (
                <div key={m.id} style={{ background: m.direction === 'leader_to_member' ? C.accentL : C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 9, padding: 9 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#005599' }}>
                    {m.direction === 'leader_to_member' ? 'Ministry Leader' : 'You'}
                  </div>
                  <div style={{ fontSize: 13, color: C.t1, marginTop: 2 }}>{m.body}</div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={sendReply} style={{ display: 'flex', gap: 8 }}>
            <input
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Send a note to your leader…"
              style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
            />
            <button type="submit" style={{ background: '#005599', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Send
            </button>
          </form>
        </section>
      </div>

      {/* Confidential Prayer Requests & Pastoral Care */}
      <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: C.t1 }}>Prayer Requests &amp; Pastoral Care</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: C.t3 }}>
          Shared privately with your ministry leader and pastors.
        </p>
        <form onSubmit={submitFeedback} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <select
            value={fbForm.category}
            onChange={(e) => setFbForm({ ...fbForm, category: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff' }}
            aria-label="Request type"
          >
            <option value="prayer_request">Prayer Request</option>
            <option value="care_needed">Pastoral Care / Visit</option>
            <option value="question">Question</option>
            <option value="suggestion">Suggestion</option>
          </select>
          <input
            value={fbForm.message}
            onChange={(e) => setFbForm({ ...fbForm, message: e.target.value })}
            placeholder="Share a prayer request or note…"
            style={{ flex: '1 1 240px', minWidth: 0, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
            required
          />
          <button type="submit" style={{ background: '#005599', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Share Request
          </button>
        </form>
        {(data.feedback || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.feedback.map((f) => (
              <div key={f.id} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 9, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#005599', fontWeight: 700 }}>
                  <span>{f.category.replace('_', ' ')}</span>
                  <span>{f.status.replace('_', ' ')}</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: C.t1 }}>{f.message}</p>
                {f.leader_response && <div style={{ marginTop: 4, fontSize: 12.5, color: '#005599' }}>Leader reply: {f.leader_response}</div>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
