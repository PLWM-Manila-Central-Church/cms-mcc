import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const BRAND = 'linear-gradient(135deg,#003d70,#005599,#13B5EA)';
const API_IMG = (process.env.REACT_APP_API_URL || '').replace(/\/api$/, '');

const getPrefs = () => { try { return JSON.parse(localStorage.getItem('plwm_prefs')||'{}'); } catch { return {}; } };
const savePrefs = (p) => localStorage.setItem('plwm_prefs', JSON.stringify(p));

const makeC = (dk) => ({
  bg:dk?'#0e1420':'#f0f4f8', surface:dk?'#1a2332':'#fff',
  surfaceAlt:dk?'#141d2b':'#f8fafc', border:dk?'#2d3a4e':'#e2e8f0',
  t1:dk?'#f1f5f9':'#0f172a', t2:dk?'#94a3b8':'#475569', t3:dk?'#64748b':'#94a3b8',
  success:'#16a34a', successL:dk?'#14532d':'#dcfce7', successB:dk?'#166534':'#bbf7d0',
  danger:'#dc2626', dangerL:dk?'#7f1d1d':'#fef2f2', dangerB:dk?'#991b1b':'#fecaca',
  accentL:dk?'#1e3a5f':'#eff6ff', accentT:dk?'#60a5fa':'#005599',
});

function EyeIcon({ open }) {
  return open
    ? <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}

export default function MemberPortalSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef  = useRef();

  const [prefs, setPrefs]       = useState(getPrefs());
  const c = makeC(prefs.theme === 'dark');

  const [pwForm, setPwForm]     = useState({ current_password:'', new_password:'', confirm_password:'' });
  const [show, setShow]         = useState({ cur:false, nw:false, cf:false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess]= useState('');
  const [pwError, setPwError]   = useState('');

  const [photoPreview, setPhotoPreview] = useState(null);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState('');

  // Load current profile photo on mount
  useEffect(() => {
    axiosInstance.get('/member-portal/profile')
      .then(res => {
        const url = res.data.data?.profile_photo_url;
        if (url) setCurrentPhoto(`${API_IMG}/uploads${url}`);
      })
      .catch(() => {});
  }, []);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const updatePref = (key, val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    savePrefs(updated);
  };

  // Photo upload
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setPhotoMsg('File must be under 2MB.'); return; }
    const allowedTypes = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (!allowedTypes.includes(file.type)) { setPhotoMsg('Only JPG, PNG, or WebP images are allowed.'); return; }

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload
    setPhotoUploading(true); setPhotoMsg('');
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await axiosInstance.post('/member-portal/profile/photo', fd, { headers:{'Content-Type':'multipart/form-data'} });
      const newUrl = res.data.data?.profile_photo_url;
      if (newUrl) setCurrentPhoto(`${API_IMG}/uploads${newUrl}`);
      setPhotoMsg('');
      showToast('Profile photo updated!');
    } catch (err) {
      setPhotoMsg(err.response?.data?.message || 'Upload failed.');
      setPhotoPreview(null);
    } finally { setPhotoUploading(false); }
  };

  // Password change
  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pwForm.new_password.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('New passwords do not match.'); return; }
    if (pwForm.new_password === pwForm.current_password) { setPwError('New password must differ from current.'); return; }
    setPwSaving(true);
    try {
      await axiosInstance.post('/member-portal/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwSuccess('Password changed successfully.');
      setPwForm({ current_password:'', new_password:'', confirm_password:'' });
      showToast('Password changed!');
    } catch (err) { setPwError(err.response?.data?.message || 'Failed to change password.'); }
    finally { setPwSaving(false); }
  };

  const card = { background:c.surface, borderRadius:14, border:`1px solid ${c.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', padding:'24px 28px', marginBottom:16 };
  const sectionTitle = { fontSize:16, fontWeight:700, color:c.t1, marginBottom:4 };
  const sectionSub   = { fontSize:13, color:c.t3, marginBottom:20 };
  const label        = { fontSize:12, color:c.t2, fontWeight:600, display:'block', marginBottom:6 };
  const inputStyle   = { width:'100%', padding:'10px 14px', fontSize:14, border:`1.5px solid ${c.border}`, borderRadius:8, outline:'none', fontFamily:'inherit', color:c.t1, background:c.surfaceAlt };

  // Option buttons (for theme/font/language selects)
  const OptionBtn = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{
      padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:active?700:500,
      cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${active?'#005599':c.border}`,
      background:active?c.accentL:'transparent', color:active?c.accentT:c.t2, transition:'all 0.15s'
    }}>{children}</button>
  );

  const photoUrl = photoPreview || currentPhoto;

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`*{box-sizing:border-box}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background:BRAND, padding:'12px 24px', display:'flex', alignItems:'center', gap:14 }}>
        <button onClick={()=>navigate('/portal')} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.28)', color:'#fff', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
          ← Back
        </button>
        <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>Settings</div>
      </div>

      <div style={{ maxWidth:580, margin:'32px auto', padding:'0 20px 60px' }}>

        {/* ── Profile Photo ── */}
        <div style={card}>
          <div style={sectionTitle}>Profile Photo</div>
          <div style={{...sectionSub}}>Shown in the portal header. Max 2MB, JPG/PNG/WebP.</div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ position:'relative' }}>
              {photoUrl
                ? <img src={photoUrl} alt="preview" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:`2px solid ${c.border}` }}/>
                : <div style={{ width:72, height:72, borderRadius:'50%', background:BRAND, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'#fff' }}>
                    {user?.email?.[0]?.toUpperCase()||'?'}
                  </div>
              }
              {photoUploading && (
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:20, height:20, border:'3px solid rgba(255,255,255,0.3)', borderTop:'3px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                </div>
              )}
            </div>
            <div>
              <button onClick={()=>fileRef.current?.click()} disabled={photoUploading}
                style={{ padding:'9px 20px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', background:c.accentL, color:c.accentT, border:`1px solid ${c.border}`, fontFamily:'inherit' }}>
                {photoUploading ? 'Uploading…' : 'Choose Photo'}
              </button>
              <div style={{ fontSize:11, color:c.t3, marginTop:6 }}>Click to upload or drag an image here</div>
              {photoMsg && <div style={{ fontSize:12, color:c.danger, marginTop:6 }}>{photoMsg}</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoChange} style={{ display:'none' }}/>
          </div>
        </div>

        {/* ── Appearance ── */}
        <div style={card}>
          <div style={sectionTitle}>Appearance</div>
          <div style={sectionSub}>Customize how your portal looks and feels.</div>

          {/* Theme */}
          <div style={{ marginBottom:20 }}>
            <label style={label}>Theme</label>
            <div style={{ display:'flex', gap:10 }}>
              <OptionBtn active={!prefs.theme||prefs.theme==='light'} onClick={()=>updatePref('theme','light')}>☀️ Light</OptionBtn>
              <OptionBtn active={prefs.theme==='dark'} onClick={()=>updatePref('theme','dark')}>🌙 Dark</OptionBtn>
            </div>
          </div>

          {/* Font size */}
          <div style={{ marginBottom:20 }}>
            <label style={label}>Font Size</label>
            <div style={{ display:'flex', gap:10 }}>
              {[{key:'sm',label:'Small'},{key:'md',label:'Medium'},{key:'lg',label:'Large'}].map(({key,label:lbl})=>(
                <OptionBtn key={key} active={(!prefs.fontSize&&key==='md')||prefs.fontSize===key} onClick={()=>updatePref('fontSize',key)}>{lbl}</OptionBtn>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label style={label}>Language</label>
            <div style={{ display:'flex', gap:10 }}>
              <OptionBtn active={!prefs.language||prefs.language==='en'} onClick={()=>updatePref('language','en')}>🇺🇸 English</OptionBtn>
              <OptionBtn active={prefs.language==='tl'} onClick={()=>updatePref('language','tl')}>🇵🇭 Filipino</OptionBtn>
            </div>
          </div>

          <div style={{ marginTop:16, padding:'12px 14px', background:c.accentL, borderRadius:8, border:`1px solid ${c.border}`, fontSize:12, color:c.accentT }}>
            Changes apply immediately when you return to the portal.
          </div>
        </div>

        {/* ── Change Password ── */}
        <div style={card}>
          <div style={sectionTitle}>Change Password</div>
          <div style={sectionSub}>Keep your account secure with a strong, unique password.</div>

          {pwSuccess && <div style={{ background:c.successL, border:`1px solid ${c.successB}`, color:c.success, borderRadius:8, padding:'11px 14px', marginBottom:16, fontSize:13, fontWeight:500 }}>{pwSuccess}</div>}
          {pwError   && <div style={{ background:c.dangerL,  border:`1px solid ${c.dangerB}`,  color:c.danger,  borderRadius:8, padding:'11px 14px', marginBottom:16, fontSize:13 }}>{pwError}</div>}

          <form onSubmit={handlePwSubmit}>
            {[
              { label:'Current Password',   key:'current_password', showKey:'cur' },
              { label:'New Password',        key:'new_password',     showKey:'nw', hint:'Minimum 8 characters' },
              { label:'Confirm New Password',key:'confirm_password', showKey:'cf' },
            ].map(({label:lbl,key,showKey,hint})=>(
              <div key={key} style={{ marginBottom:16 }}>
                <label style={label}>{lbl}</label>
                <div style={{ position:'relative' }}>
                  <input type={show[showKey]?'text':'password'} value={pwForm[key]} onChange={e=>{setPwForm({...pwForm,[key]:e.target.value});setPwError('');setPwSuccess('');}}
                    style={{...inputStyle, paddingRight:44}}
                    onFocus={e=>e.target.style.borderColor='#005599'}
                    onBlur={e=>e.target.style.borderColor=c.border}
                    placeholder={hint||''}/>
                  <button type="button" onClick={()=>setShow({...show,[showKey]:!show[showKey]})}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:c.t3, display:'flex', alignItems:'center', padding:2 }}>
                    <EyeIcon open={show[showKey]}/>
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={pwSaving}
              style={{ width:'100%', padding:'12px', background:BRAND, color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:pwSaving?'not-allowed':'pointer', fontFamily:'inherit', opacity:pwSaving?0.7:1, marginTop:4 }}>
              {pwSaving ? 'Changing Password…' : 'Change Password'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:c.t3 }}>
            Forgot your password? Log out and use the "Forgot Password" link on the login page.
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:28, right:28, background:toast.type==='success'?'#16a34a':'#dc2626', color:'#fff', padding:'12px 20px', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,0.2)', zIndex:9999, display:'flex', alignItems:'center', gap:10, fontSize:14, fontWeight:500, animation:'slideUp 0.3s ease' }}>
          <span>{toast.type==='success'?'✓':'✕'}</span>{toast.msg}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
