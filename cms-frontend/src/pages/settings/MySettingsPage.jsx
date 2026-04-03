import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { LANGS, saveLangCode } from '../../utils/langUtils';

// ── Constants ─────────────────────────────────────────────────
const FONTS = [
  { name: 'DM Sans',       google: true  },
  { name: 'Inter',         google: true  },
  { name: 'Open Sans',     google: true  },
  { name: 'Lato',          google: true  },
  { name: 'Roboto',        google: true  },
  { name: 'Space Grotesk', google: true  },
  { name: 'Figtree',       google: true  },
  { name: 'Work Sans',     google: true  },
  { name: 'Satoshi',       google: false, fontshare: true },
  { name: 'Helvetica',     google: false, system: true    },
];

const RESOLUTIONS = [
  { value: 0.75, label: '75%'  },
  { value: 1,    label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5,  label: '150%' },
];

const API_IMG = (process.env.REACT_APP_API_URL || '').replace(/\/api$/, '');

const getPrefs  = () => { try { return JSON.parse(localStorage.getItem('plwm_prefs') || '{}'); } catch { return {}; } };
const savePrefs = (p) => {
  localStorage.setItem('plwm_prefs', JSON.stringify(p));
  // Notify App.js and all other tabs to re-apply font/zoom
  window.dispatchEvent(new CustomEvent('plwm-prefs-change'));
};

function EyeIcon({ open }) {
  return open
    ? <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}

export default function MySettingsPage() {
  const navigate = useNavigate();

  const [prefs, setPrefs]   = useState(getPrefs);
  const [toast, setToast]   = useState(null);

  const fontFamily = prefs.fontFamily || 'DM Sans';
  const fontSize   = prefs.fontSize   || 16;

  const [fontSizeInput, setFontSizeInput] = useState(String(prefs.fontSize || 16));

  // Profile photo (only if member-portal profile linked)
  const [photoPreview,   setPhotoPreview]   = useState(null);
  const [currentPhoto,   setCurrentPhoto]   = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg,       setPhotoMsg]       = useState('');
  const [profile,        setProfile]        = useState(null);
  const fileRef = useRef();

  // Password
  const [pwForm,   setPwForm]   = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [show,     setShow]     = useState({ cur: false, nw: false, cf: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess,setPwSuccess]= useState('');
  const [pwError,  setPwError]  = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Try to fetch member profile (optional — some CMS users may not have one)
  useEffect(() => {
    axiosInstance.get('/member-portal/profile')
      .then(res => {
        const p = res.data.data;
        setProfile(p);
        if (p?.profile_photo_url) setCurrentPhoto(`${API_IMG}/uploads${p.profile_photo_url}`);
      })
      .catch(() => {}); // silently ignore if no member profile linked
  }, []);

  // Load font link whenever fontFamily changes
  useEffect(() => {
    const font = FONTS.find(f => f.name === fontFamily);
    if (!font) return;
    const id = 'plwm-mysettings-font';
    let el = document.getElementById(id);
    if (font.google) {
      if (!el) { el = document.createElement('link'); el.id = id; el.rel = 'stylesheet'; document.head.appendChild(el); }
      el.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;700&display=swap`;
    } else if (font.fontshare) {
      if (!el) { el = document.createElement('link'); el.id = id; el.rel = 'stylesheet'; document.head.appendChild(el); }
      el.href = `https://api.fontshare.com/v2/css?f[]=${fontFamily.toLowerCase()}@400,500,700&display=swap`;
    }
  }, [fontFamily]);

  const updatePref = useCallback((key, val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    savePrefs(updated);
    if (key === 'language') {
      saveLangCode(val);
      // Reload so googtrans cookie takes effect — same as PublicLayout behaviour
      setTimeout(() => window.location.reload(), 80);
    }
  }, [prefs]);

  const handleFontSizeBlur = () => {
    const v = Math.min(40, Math.max(12, parseInt(fontSizeInput) || 16));
    setFontSizeInput(String(v));
    updatePref('fontSize', v);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setPhotoMsg('File must be under 2MB.'); return; }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoMsg('Only JPG, PNG, or WebP.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setPhotoUploading(true); setPhotoMsg('');
    const fd = new FormData(); fd.append('photo', file);
    try {
      const res = await axiosInstance.post('/member-portal/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrl = res.data.data?.profile_photo_url;
      if (newUrl) setCurrentPhoto(`${API_IMG}/uploads${newUrl}`);
      showToast('Profile photo updated!');
    } catch (err) {
      setPhotoMsg(err.response?.data?.message || 'Upload failed.');
      setPhotoPreview(null);
    } finally { setPhotoUploading(false); }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault(); setPwError(''); setPwSuccess('');
    if (pwForm.new_password.length < 8)                        { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.new_password !== pwForm.confirm_password)        { setPwError('New passwords do not match.'); return; }
    if (pwForm.new_password === pwForm.current_password)        { setPwError('New password must differ from current.'); return; }
    setPwSaving(true);
    try {
      // CMS users use /auth/change-password (PUT), not the member-portal endpoint
      await axiosInstance.put('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess('Password changed successfully.');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('Password changed!');
    } catch (err) { setPwError(err.response?.data?.message || 'Failed to change password.'); }
    finally { setPwSaving(false); }
  };

  // ── Compute initials for avatar placeholder ────────────────
  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : null;
  const photoUrl = photoPreview || currentPhoto;

  // ── Styles ──────────────────────────────────────────────────
  const card     = { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 22px', marginBottom: 14 };
  const secTitle = { fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4, marginTop: 0 };
  const secSub   = { fontSize: 13, color: '#94a3b8', marginBottom: 16, marginTop: 0 };
  const lbl      = { fontSize: 12, color: '#374151', fontWeight: 600, display: 'block', marginBottom: 6 };
  const inp      = { width: '100%', padding: '10px 13px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#fafbfc', boxSizing: 'border-box', minHeight: 42, fontFamily: 'inherit' };

  const ChipBtn = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 8, fontSize: 13,
      fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
      border: `1.5px solid ${active ? '#005599' : '#e2e8f0'}`,
      background: active ? '#e8f4fd' : 'transparent',
      color: active ? '#005599' : '#374151',
      transition: 'all 0.15s', minHeight: 38,
    }}>
      {children}
    </button>
  );

  return (
    <div style={{ fontFamily: `'${fontFamily}', Inter, system-ui, sans-serif`, fontSize: `${fontSize}px` }}>
      <style>{`* { box-sizing: border-box; } @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} } @keyframes spin { to{transform:rotate(360deg)} }`}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>My Settings</h1>
      </div>

      <div style={{ maxWidth: 600 }}>

        {/* ── Profile Photo (only if member profile linked) ── */}
        {(profile || currentPhoto) && (
          <div style={card}>
            <p style={secTitle}>Profile Photo</p>
            <p style={secSub}>Max 2MB · JPG, PNG, or WebP.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {photoUrl
                  ? <img src={photoUrl} alt="preview" style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                  : <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg,#005599,#13B5EA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                      {initials || '?'}
                    </div>
                }
                {photoUploading && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={photoUploading}
                  style={{ padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#e8f4fd', color: '#005599', border: '1px solid #e2e8f0', fontFamily: 'inherit', minHeight: 40 }}
                >
                  {photoUploading ? 'Uploading…' : '📷 Choose Photo'}
                </button>
                {photoMsg && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{photoMsg}</div>}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoChange} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        {/* ── Appearance ── */}
        <div style={card}>
          <p style={secTitle}>Appearance</p>
          <p style={secSub}>Personalise how the CMS looks and feels across all pages.</p>

          {/* Font family */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Font</label>
            <select value={fontFamily} onChange={e => updatePref('fontFamily', e.target.value)}
              style={{ ...inp, width: 'auto', minWidth: 200, cursor: 'pointer' }}>
              {FONTS.map(fn => <option key={fn.name} value={fn.name}>{fn.name}{fn.system ? ' (system)' : ''}</option>)}
            </select>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
              Preview: <span style={{ fontFamily: `'${fontFamily}', system-ui, sans-serif`, fontWeight: 500 }}>The quick brown fox</span>
            </div>
          </div>

          {/* Font size */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Font Size (12–40 px)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number" min={12} max={40} value={fontSizeInput}
                onChange={e => setFontSizeInput(e.target.value)}
                onBlur={handleFontSizeBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                style={{ ...inp, width: 84, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: '#94a3b8' }}>current: <strong>{fontSize}px</strong></span>
            </div>
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: `${fontSize}px`, fontFamily: `'${fontFamily}', system-ui`, color: '#0f172a' }}>Sample text at {fontSize}px</span>
            </div>
          </div>

          {/* Display scale */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Display Scale</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RESOLUTIONS.map(r => (
                <ChipBtn key={r.value} active={(prefs.resolution || 1) === r.value} onClick={() => updatePref('resolution', r.value)}>
                  {r.label}
                </ChipBtn>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Scales the entire interface.</div>
          </div>

          {/* Language */}
          <div>
            <label style={lbl}>Language</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {LANGS.map(lang => (
                <ChipBtn
                  key={lang.code}
                  active={(localStorage.getItem('plwm_lang') || prefs.language || 'en') === lang.code}
                  onClick={() => updatePref('language', lang.code)}
                >
                  {lang.flag} {lang.label}
                </ChipBtn>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: '10px 13px', background: '#eff6ff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#005599' }}>
              Selecting a language reloads the page to apply translation fully.
            </div>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div style={card}>
          <p style={secTitle}>Change Password</p>
          <p style={secSub}>Keep your account secure with a strong, unique password.</p>

          {pwSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '10px 13px', marginBottom: 14, fontSize: 13, fontWeight: 500 }}>{pwSuccess}</div>}
          {pwError   && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 13px', marginBottom: 14, fontSize: 13 }}>{pwError}</div>}

          <form onSubmit={handlePwSubmit}>
            {[
              { label: 'Current Password',    key: 'current_password', showKey: 'cur' },
              { label: 'New Password',         key: 'new_password',    showKey: 'nw', hint: 'Minimum 8 characters' },
              { label: 'Confirm New Password', key: 'confirm_password',showKey: 'cf' },
            ].map(({ label: l2, key, showKey, hint }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={lbl}>{l2}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={show[showKey] ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={e => { setPwForm({ ...pwForm, [key]: e.target.value }); setPwError(''); setPwSuccess(''); }}
                    style={{ ...inp, paddingRight: 44 }}
                    placeholder={hint || ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, [showKey]: !show[showKey] })}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center', minHeight: 40, minWidth: 36, justifyContent: 'center' }}
                  >
                    <EyeIcon open={show[showKey]} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="submit" disabled={pwSaving}
              style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#005599,#13B5EA)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: pwSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: pwSaving ? 0.7 : 1, marginTop: 4, minHeight: 48 }}
            >
              {pwSaving ? 'Changing Password…' : 'Change Password'}
            </button>
          </form>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', right: 16, left: 16, background: toast.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', padding: '12px 16px', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500, animation: 'slideUp 0.3s ease' }}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>{toast.msg}
        </div>
      )}
    </div>
  );
}
