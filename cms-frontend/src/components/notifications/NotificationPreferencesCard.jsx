import { useEffect, useId, useState } from 'react';
import api from '../../api/axiosInstance';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import '../../pages/notifications/outreach.css';

export default function NotificationPreferencesCard({ memberId, onSaved, theme = 'light' }) {
  const id = useId();
  const [data, setData] = useState(null);
  const [initial, setInitial] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const endpoint = memberId ? '/outreach/members/' + memberId + '/preferences' : '/outreach/me/preferences';
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setNotice(''); setConfirmed(false);
    Promise.all([api.get('/outreach/availability', { signal: controller.signal }), api.get(endpoint, { signal: controller.signal })])
      .then(([state, response]) => { if (!controller.signal.aborted) { setAvailability(state.data.data); setData(response.data.data); setInitial(response.data.data); } })
      .catch((requestError) => { if (!controller.signal.aborted) setError(apiErrorMessage(requestError, 'Could not load notification preferences.')); });
    return () => controller.abort();
  }, [endpoint]);
  const save = async (event) => {
    event.preventDefault();
    setError(''); setNotice('');
    if (data.sms_enabled && (!initial.sms_effective || data.phone !== initial.phone) && !confirmed) {
      setError('Confirm permission to send SMS to this number.'); return;
    }
    setBusy(true);
    try {
      const response = await api.put(endpoint, {
        phone: data.phone, sms_enabled: data.sms_enabled, activity_reminders: data.activity_reminders,
        attendance_followups: data.attendance_followups, consent_confirmed: confirmed, ...(memberId ? { consent_note: note } : {}),
      });
      setData(response.data.data); setInitial(response.data.data); setConfirmed(false);
      setNotice('Notification preferences saved.'); onSaved?.();
    } catch (requestError) { setError(apiErrorMessage(requestError, 'Could not save notification preferences.')); }
    finally { setBusy(false); }
  };
  return <section className="outreach-card outreach-preferences" data-theme={theme === 'dark' ? 'dark' : 'light'} aria-label="Notification preferences">
    <h2>Notification preferences</h2>
    <p>Choose whether PLWM-MCC may send activity reminders and caring attendance follow-ups to your mobile number. You can opt out at any time.</p>
    {error && <div className="outreach-error" role="alert">{error}</div>}
    {notice && <div className="outreach-success" role="status">{notice}</div>}
    {!data && !error && <p role="status">Loading notification preferences…</p>}
    {data && <form onSubmit={save}>
      {memberId && <p><strong>{data.member_name}</strong></p>}
      <label htmlFor={id + '-phone'}>Mobile number
        <input id={id + '-phone'} type="tel" autoComplete="tel" inputMode="tel" maxLength={30} value={data.phone}
          onChange={(event) => { setData({ ...data, phone: event.target.value }); setConfirmed(false); }} placeholder="09XXXXXXXXX or +639XXXXXXXXX" />
      </label>
      <label className="outreach-check"><input type="checkbox" checked={data.sms_enabled}
        onChange={(event) => { setData({ ...data, sms_enabled: event.target.checked }); setConfirmed(false); }} />Allow SMS notifications</label>
      <label className="outreach-check"><input type="checkbox" checked={data.activity_reminders}
        onChange={(event) => setData({ ...data, activity_reminders: event.target.checked })} />Activity reminders</label>
      <label className="outreach-check"><input type="checkbox" checked={data.attendance_followups}
        onChange={(event) => setData({ ...data, attendance_followups: event.target.checked })} />Attendance follow-up notifications</label>
      {data.sms_enabled && (!initial.sms_effective || data.phone !== initial.phone) && <label className="outreach-check">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        {memberId ? 'The member explicitly agreed to SMS notifications at this number.' : 'I agree to receive these SMS notifications at the number above.'}
      </label>}
      {memberId && <label htmlFor={id + '-evidence'}>Consent or opt-out record
        <textarea id={id + '-evidence'} value={note} onChange={(event) => setNote(event.target.value)} required minLength={5} maxLength={500}
          placeholder="Record when and how the member gave or withdrew permission." />
      </label>}
      {data.needs_reconsent && <p className="outreach-warning">Your phone number changed. Confirm permission for the current number before SMS can resume.</p>}
      <p className="outreach-muted">{availability?.mode === 'simulation' ? 'Simulation is active. No SMS is sent.' : !availability?.sms_delivery_enabled || availability?.mode === 'disabled' ? 'SMS sending is currently off. Saving consent does not send a message.' : 'SMS is enabled for eligible, opted-in recipients.'}</p>
      {data.consent_at && <p className="outreach-muted">Consent recorded: {new Date(data.consent_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>}
      <button type="submit" className="outreach-primary" disabled={busy}>{busy ? 'Saving…' : 'Save notification preferences'}</button>
    </form>}
  </section>;
}
