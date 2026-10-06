import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import useQrDialogFocus from './useQrDialogFocus';
import './qrAttendance.css';

const copy = {
  en: {
    button: 'My Attendance QR', title: 'My Member QR', description: 'Show this fixed QR to Registration Team for a Service or Event check-in.',
    create: 'Create My QR', download: 'Download PNG', print: 'Print QR', loading: 'Loading your QR…',
    noQr: 'You do not have a member QR yet. Create one once, then use the same code for future check-ins.',
    unavailable: 'QR attendance is currently unavailable. Please contact the church office.',
    close: 'Close', issued: 'Issued',
  },
  tl: {
    button: 'Aking Attendance QR', title: 'Aking Member QR', description: 'Ipakita ang nakapirming QR na ito sa Registration Team para sa pag-check in sa serbisyo o event.',
    create: 'Gumawa ng QR', download: 'I-download ang PNG', print: 'I-print ang QR', loading: 'Kinukuha ang iyong QR…',
    noQr: 'Wala ka pang member QR. Gumawa nito nang isang beses para gamitin sa mga susunod na check-in.',
    unavailable: 'Hindi available ang QR attendance ngayon. Makipag-ugnayan sa opisina ng simbahan.',
    close: 'Isara', issued: 'Inisyu',
  },
};

export default function MemberQrPanel({ language = 'en', buttonStyle }) {
  const text = copy[language] || copy.en;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [state, setState] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const imageUrlRef = useRef('');

  const replaceImageUrl = (url) => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    imageUrlRef.current = url;
    setImageUrl(url);
  };

  const loadImage = async () => {
    const response = await axiosInstance.get('/member-portal/attendance-qr/image.png', { responseType: 'blob' });
    replaceImageUrl(URL.createObjectURL(response.data));
  };

  const openPanel = async () => {
    setOpen(true);
    setError('');
    setLoading(true);
    try {
      const response = await axiosInstance.get('/member-portal/attendance-qr');
      const qrState = response.data.data;
      setState(qrState);
      if (qrState.available) await loadImage();
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.unavailable);
    } finally {
      setLoading(false);
    }
  };

  const issueQr = async () => {
    setIssuing(true);
    setError('');
    try {
      const response = await axiosInstance.post('/member-portal/attendance-qr', {});
      setState(response.data.data);
      await loadImage();
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.unavailable);
    } finally {
      setIssuing(false);
    }
  };

  const close = () => {
    setOpen(false);
    setError('');
    setState(null);
    replaceImageUrl('');
  };

  const { dialogRef, closeButtonRef } = useQrDialogFocus(open, close);

  useEffect(() => () => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
  }, []);

  return (
    <>
      <button type="button" className="qr-primary-button" style={buttonStyle} onClick={openPanel}>{text.button}</button>
      {open && (
        <div className="qr-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section ref={dialogRef} className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="member-qr-title">
            <header className="qr-modal-header">
              <div>
                <h2 id="member-qr-title">{text.title}</h2>
                <p>{text.description}</p>
              </div>
              <button ref={closeButtonRef} type="button" className="qr-icon-button" onClick={close} aria-label={text.close}>×</button>
            </header>
            {loading ? <div className="qr-muted-box" role="status">{text.loading}</div> : (
              <>
                {error && <div className="qr-inline-error" role="alert">{error}</div>}
                {!state?.available && !error && (
                  <div className="qr-muted-box">
                    <p>{text.noQr}</p>
                    <button type="button" className="qr-primary-button" onClick={issueQr} disabled={issuing}>
                      {issuing ? text.loading : text.create}
                    </button>
                  </div>
                )}
                {state?.available && imageUrl && (
                  <>
                    <div className="qr-print-area">
                      <img className="qr-member-qr" src={imageUrl} alt="Your fixed member attendance QR code" />
                    </div>
                    {state.issued_at && <p className="qr-scanner-footnote">{text.issued}: {new Date(state.issued_at).toLocaleDateString()}</p>}
                    <div className="qr-action-row">
                      <a className="qr-secondary-button" href={imageUrl} download="mcc-member-qr.png">{text.download}</a>
                      <button type="button" className="qr-secondary-button" onClick={() => window.print()}>{text.print}</button>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
