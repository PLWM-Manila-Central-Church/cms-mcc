import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import useQrDialogFocus from './useQrDialogFocus';
import './qrAttendance.css';

const messageFrom = (error) => error.response?.data?.message || 'Member QR could not be loaded. Check that QR attendance is enabled.';

export default function OperationalMemberQrPanel({ memberId, memberName }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qrState, setQrState] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const imageRef = useRef('');

  const setImage = (url) => {
    if (imageRef.current) URL.revokeObjectURL(imageRef.current);
    imageRef.current = url;
    setImageUrl(url);
  };

  const refresh = async () => {
    const response = await axiosInstance.get(`/qr-attendance/members/${memberId}/qr`);
    const data = response.data.data;
    setQrState(data);
    if (data.available) {
      const image = await axiosInstance.get(`/qr-attendance/members/${memberId}/qr/image.png`, { responseType: 'blob' });
      setImage(URL.createObjectURL(image.data));
    } else setImage('');
  };

  const openPanel = async () => {
    setOpen(true); setLoading(true); setError('');
    try { await refresh(); } catch (requestError) { setError(messageFrom(requestError)); }
    finally { setLoading(false); }
  };

  const issue = async () => {
    setBusy(true); setError('');
    try { await axiosInstance.post(`/qr-attendance/members/${memberId}/qr`, {}); await refresh(); }
    catch (requestError) { setError(messageFrom(requestError)); }
    finally { setBusy(false); }
  };

  const reissue = async () => {
    if (reason.trim().length < 5) { setError('Enter a reason of at least 5 characters.'); return; }
    setBusy(true); setError('');
    try {
      await axiosInstance.post(`/qr-attendance/members/${memberId}/qr/reissue`, { reason: reason.trim() });
      setReason('');
      await refresh();
    } catch (requestError) { setError(messageFrom(requestError)); }
    finally { setBusy(false); }
  };

  const close = () => { setOpen(false); setQrState(null); setReason(''); setError(''); setImage(''); };
  const { dialogRef, closeButtonRef } = useQrDialogFocus(open, close);

  useEffect(() => () => { if (imageRef.current) URL.revokeObjectURL(imageRef.current); }, []);

  return (
    <>
      <button type="button" className="qr-secondary-button" onClick={openPanel}>Member Attendance QR</button>
      {open && <div className="qr-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
        <section ref={dialogRef} className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="operational-qr-title">
          <header className="qr-modal-header">
            <div><h2 id="operational-qr-title">Member Attendance QR</h2><p>{memberName}</p></div>
            <button ref={closeButtonRef} type="button" className="qr-icon-button" onClick={close} aria-label="Close">×</button>
          </header>
          {loading ? <div className="qr-muted-box" role="status">Loading member QR…</div> : <>
            {error && <div className="qr-inline-error" role="alert">{error}</div>}
            {qrState?.available && imageUrl ? <>
              <div className="qr-print-area"><img className="qr-member-qr" src={imageUrl} alt={`${memberName} attendance QR`} /></div>
              <p className="qr-scanner-footnote">QR version {qrState.version} · issued {qrState.issued_at ? new Date(qrState.issued_at).toLocaleDateString() : '—'}</p>
              <div className="qr-action-row">
                <a className="qr-secondary-button" href={imageUrl} download={`mcc-member-${memberId}-qr.png`}>Download PNG</a>
                <button className="qr-secondary-button" type="button" onClick={() => window.print()}>Print QR</button>
              </div>
              <label className="qr-form-field qr-section">Reason to reissue
                <textarea className="qr-reason-input" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} placeholder="For example, previous QR was shared or lost" />
              </label>
              <button type="button" className="qr-danger-button qr-section" disabled={busy || reason.trim().length < 5} onClick={reissue}>{busy ? 'Saving…' : 'Reissue and Revoke Previous QR'}</button>
            </> : <div className="qr-muted-box">
              <p>No active QR exists for this member.</p>
              <button type="button" className="qr-primary-button" disabled={busy} onClick={issue}>{busy ? 'Creating…' : 'Issue Member QR'}</button>
            </div>}
          </>}
        </section>
      </div>}
    </>
  );
}
