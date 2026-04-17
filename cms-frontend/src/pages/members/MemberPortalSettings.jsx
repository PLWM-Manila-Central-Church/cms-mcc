import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { LANGS, saveLangCode } from '../../utils/langUtils';

const BRAND   = 'linear-gradient(135deg,#003d70,#005599,#13B5EA)';
const API_IMG = (process.env.REACT_APP_API_URL || '').replace(/\/api$/, '');

const FONTS = [
  { name:'DM Sans',       google:true  },
  { name:'Inter',         google:true  },
  { name:'Open Sans',     google:true  },
  { name:'Lato',          google:true  },
  { name:'Roboto',        google:true  },
  { name:'Space Grotesk', google:true  },
  { name:'Figtree',       google:true  },
  { name:'Work Sans',     google:true  },
  { name:'Satoshi',       google:false, fontshare:true },
  { name:'Helvetica',     google:false, system:true    },
];

const RESOLUTIONS = [
  { value:0.5,  label:'50%'  },
  { value:0.75, label:'75%'  },
  { value:1,    label:'100%' },
  { value:1.25, label:'125%' },
  { value:1.5,  label:'150%' },
];

const getPrefs   = () => { try { return JSON.parse(localStorage.getItem('plwm_prefs')||'{}'); } catch { return {}; } };
const savePrefs  = (p) => {
  localStorage.setItem('plwm_prefs', JSON.stringify(p));
  // Notify App.js to re-apply font/zoom globally across all CMS pages
  window.dispatchEvent(new CustomEvent('plwm-prefs-change'));
};

const makeC = (dk) => ({
  bg:dk?'#0e1420':'#f0f4f8', surface:dk?'#1a2332':'#fff',
  surfaceAlt:dk?'#141d2b':'#f8fafc', border:dk?'#2d3a4e':'#e2e8f0',
  t1:dk?'#f1f5f9':'#0f172a', t2:dk?'#94a3b8':'#475569', t3:dk?'#64748b':'#94a3b8',
  success:'#16a34a', successL:dk?'#14532d':'#dcfce7', successB:dk?'#166534':'#bbf7d0',
  danger:'#dc2626', dangerL:dk?'#7f1d1d':'#fef2f2', dangerB:dk?'#991b1b':'#fecaca',
  accentL:dk?'#1e3a5f':'#eff6ff', accentT:dk?'#60a5fa':'#005599',
});

function EyeIcon({open}) {
  return open
    ? <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w;
}

export default function MemberPortalSettings() {
  const navigate = useNavigate();
  const width    = useWindowWidth();
  const isMobile = width <= 768;

  const [prefs, setPrefs]         = useState(getPrefs());
  const c = makeC(prefs.theme==='dark');

  const [pwForm, setPwForm]       = useState({current_password:'',new_password:'',confirm_password:''});
  const [show, setShow]           = useState({cur:false,nw:false,cf:false});
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError,   setPwError]   = useState('');

  const [photoPreview, setPhotoPreview]     = useState(null);
  const [currentPhoto, setCurrentPhoto]     = useState(null);
  const [photoUploading,setPhotoUploading]  = useState(false);
  const [photoMsg, setPhotoMsg]             = useState('');
  const [profile,  setProfile]              = useState(null);

  const [fontSizeInput, setFontSizeInput]   = useState(String(prefs.fontSize||16));

  const [toast, setToast] = useState(null);
  const fileRef = useRef();
  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(()=>{
    axiosInstance.get('/member-portal/profile')
      .then(res=>{
        const p = res.data.data;
        setProfile(p);
        if(p?.profile_photo_url) setCurrentPhoto(`${API_IMG}/uploads${p.profile_photo_url}`);
      })
      .catch(()=>{});
  },[]);

  useEffect(()=>{
    const font = FONTS.find(f=>f.name===(prefs.fontFamily||'DM Sans'));
    if(!font) return;
    if(font.google) {
      const id='plwm-s-font'; let el=document.getElementById(id);
      if(!el){el=document.createElement('link');el.id=id;el.rel='stylesheet';document.head.appendChild(el);}
      el.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}:wght@400;500;700&display=swap`;
    } else if(font.fontshare) {
      const id='plwm-s-fontshare'; let el=document.getElementById(id);
      if(!el){el=document.createElement('link');el.id=id;el.rel='stylesheet';document.head.appendChild(el);}
      el.href=`https://api.fontshare.com/v2/css?f[]=${font.name.toLowerCase()}@400,500,700&display=swap`;
    }
  },[prefs.fontFamily]);

  const updatePref = (key, val) => {
    const updated = {...prefs,[key]:val};
    setPrefs(updated);
    savePrefs(updated);
    if (key === 'language') {
      saveLangCode(val);
      // Reload so googtrans cookie takes effect cleanly — same as PublicLayout behaviour
      setTimeout(() => window.location.reload(), 80);
    }
  };

  const handleFontSizeBlur = () => {
    const v = Math.min(40, Math.max(12, parseInt(fontSizeInput)||16));
    setFontSizeInput(String(v));
    updatePref('fontSize', v);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    if(file.size>2*1024*1024){setPhotoMsg('File must be under 2MB.');return;}
    if(!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)){setPhotoMsg('Only JPG, PNG, or WebP.');return;}
    const reader=new FileReader(); reader.onload=ev=>setPhotoPreview(ev.target.result); reader.readAsDataURL(file);
    setPhotoUploading(true); setPhotoMsg('');
    const fd=new FormData(); fd.append('photo',file);
    try {
      const res = await axiosInstance.post('/member-portal/profile/photo',fd,{headers:{'Content-Type':'multipart/form-data'}});
      const newUrl=res.data.data?.profile_photo_url;
      if(newUrl) setCurrentPhoto(`${API_IMG}/uploads${newUrl}`);
      showToast('Profile photo updated!');
    } catch(err){setPhotoMsg(err.response?.data?.message||'Upload failed.');setPhotoPreview(null);}
    finally{setPhotoUploading(false);}
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault(); setPwError(''); setPwSuccess('');
    if(pwForm.new_password.length<8){setPwError('New password must be at least 8 characters.');return;}
    if(pwForm.new_password!==pwForm.confirm_password){setPwError('New passwords do not match.');return;}
    if(pwForm.new_password===pwForm.current_password){setPwError('New password must differ from current.');return;}
    setPwSaving(true);
    try {
      await axiosInstance.post('/member-portal/change-password',{current_password:pwForm.current_password,new_password:pwForm.new_password});
      setPwSuccess('Password changed successfully.');
      setPwForm({current_password:'',new_password:'',confirm_password:''});
      showToast('Password changed!');
    } catch(err){setPwError(err.response?.data?.message||'Failed.');}
    finally{setPwSaving(false);}
  };

  const photoUrl   = photoPreview || currentPhoto;
  const initials   = profile
    ? `${profile.first_name?.[0]||''}${profile.last_name?.[0]||''}`.toUpperCase() || '?'
    : '?';
  const fontFamily = prefs.fontFamily||'DM Sans';
  const fontSize   = prefs.fontSize||16;

  const card    = {background:c.surface,borderRadius:14,border:`1px solid ${c.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',padding:isMobile?'18px 16px':'24px 28px',marginBottom:14};
  const secTitle = {fontSize:isMobile?15:17,fontWeight:700,color:c.t1,marginBottom:4};
  const secSub   = {fontSize:13,color:c.t3,marginBottom:16};
  const lbl      = {fontSize:12,color:c.t2,fontWeight:600,display:'block',marginBottom:6};
  const inp      = {width:'100%',padding:'11px 14px',fontSize:16,border:`1.5px solid ${c.border}`,borderRadius:8,outline:'none',fontFamily:'inherit',color:c.t1,background:c.surfaceAlt,boxSizing:'border-box',minHeight:44};

  const ChipBtn = ({active,onClick,children}) => (
    <button onClick={onClick} style={{padding:'9px 16px',borderRadius:8,fontSize:13,fontWeight:active?700:500,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${active?'#005599':c.border}`,background:active?c.accentL:'transparent',color:active?c.accentT:c.t2,transition:'all 0.15s',minHeight:40}}>
      {children}
    </button>
  );

  return (
    <div style={{minHeight:'100vh',background:c.bg,fontFamily:`'${fontFamily}',system-ui,sans-serif`,fontSize:`${fontSize}px`}}>
      <style>{`*{box-sizing:border-box}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{background:BRAND,padding:isMobile?'10px 16px':'12px 24px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>navigate('/portal')} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.28)',color:'#fff',borderRadius:8,padding:'8px 14px',fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:500,minHeight:40}}>← Back</button>
        <div style={{color:'#fff',fontWeight:800,fontSize:16}}>Settings</div>
      </div>

      <div style={{maxWidth:isMobile?'100%':600,margin:isMobile?0:'24px auto',padding:isMobile?'14px 12px 80px':'0 20px 60px'}}>

        {/* ── Profile Photo ── */}
        <div style={card}>
          <div style={secTitle}>Profile Photo</div>
          <div style={secSub}>Shown in the portal header. Max 2MB, JPG/PNG/WebP.</div>
          <div style={{display:'flex',alignItems:'center',gap:isMobile?16:20,flexWrap:isMobile?'wrap':'nowrap'}}>
            <div style={{position:'relative',flexShrink:0}}>
              {photoUrl
                ? <img src={photoUrl} alt="preview" style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',border:`2px solid ${c.border}`}}/>
                : <div style={{width:72,height:72,borderRadius:'50%',background:BRAND,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:'#fff'}}>{initials}</div>}
              {photoUploading&&<div style={{position:'absolute',inset:0,borderRadius:'50%',background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:20,height:20,border:'3px solid rgba(255,255,255,0.3)',borderTop:'3px solid #fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>}
            </div>
            <div style={{flex:1}}>
              {/* Tap the whole area on mobile */}
              <button
                onClick={()=>fileRef.current?.click()}
                disabled={photoUploading}
                style={{
                  width:isMobile?'100%':'auto',
                  padding:'11px 20px',borderRadius:8,fontSize:14,fontWeight:600,
                  cursor:'pointer',background:c.accentL,color:c.accentT,
                  border:`1px solid ${c.border}`,fontFamily:'inherit',
                  minHeight:44,display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                }}>
                {photoUploading?'Uploading…':'📷 Choose Photo'}
              </button>
              <div style={{fontSize:11,color:c.t3,marginTop:6}}>Max 2MB · JPG, PNG, or WebP</div>
              {photoMsg&&<div style={{fontSize:12,color:c.danger,marginTop:6}}>{photoMsg}</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" capture="environment" onChange={handlePhotoChange} style={{display:'none'}}/>
          </div>
        </div>

        {/* ── Appearance ── */}
        <div style={card}>
          <div style={secTitle}>Appearance</div>
          <div style={secSub}>Customize how your portal looks and feels.</div>

          <div style={{marginBottom:20}}>
            <label style={lbl}>Theme</label>
            <div style={{display:'flex',gap:10}}>
              <ChipBtn active={!prefs.theme||prefs.theme==='light'} onClick={()=>updatePref('theme','light')}>☀️ Light</ChipBtn>
              <ChipBtn active={prefs.theme==='dark'} onClick={()=>updatePref('theme','dark')}>🌙 Dark</ChipBtn>
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={lbl}>Font</label>
            <select value={fontFamily} onChange={e=>updatePref('fontFamily',e.target.value)}
              style={{...inp,width:'auto',minWidth:200,cursor:'pointer',paddingRight:32}}>
              {FONTS.map(fn=>(
                <option key={fn.name} value={fn.name}>{fn.name}{fn.system?' (system)':''}</option>
              ))}
            </select>
            <div style={{fontSize:11,color:c.t3,marginTop:6}}>Preview: <span style={{fontFamily:`'${fontFamily}',system-ui,sans-serif`,fontWeight:500}}>The quick brown fox</span></div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={lbl}>Font Size (12–40 px)</label>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <input type="number" min={12} max={40} value={fontSizeInput}
                onChange={e=>setFontSizeInput(e.target.value)}
                onBlur={handleFontSizeBlur}
                onKeyDown={e=>{ if(e.key==='Enter') { e.target.blur(); } }}
                style={{...inp,width:90,textAlign:'center'}}/>
              <span style={{fontSize:13,color:c.t3}}>current: <strong>{fontSize}px</strong></span>
            </div>
            <div style={{marginTop:10,padding:'10px 14px',background:c.surfaceAlt,borderRadius:8,border:`1px solid ${c.border}`}}>
              <span style={{fontSize:`${fontSize}px`,fontFamily:`'${fontFamily}',system-ui`,color:c.t1}}>Sample text at {fontSize}px</span>
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={lbl}>Display Scale</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {RESOLUTIONS.map(r=>(
                <ChipBtn key={r.value} active={(prefs.resolution||1)===r.value} onClick={()=>updatePref('resolution',r.value)}>{r.label}</ChipBtn>
              ))}
            </div>
            <div style={{fontSize:11,color:c.t3,marginTop:6}}>Scales the entire portal.</div>
          </div>

          <div>
            <label style={lbl}>Language</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {LANGS.map(lang=>(
                <ChipBtn key={lang.code} active={(localStorage.getItem('plwm_lang')||prefs.language||'en')===lang.code} onClick={()=>updatePref('language',lang.code)}>
                  {lang.flag} {lang.label}
                </ChipBtn>
              ))}
            </div>
            <div style={{marginTop:12,padding:'10px 14px',background:c.accentL,borderRadius:8,border:`1px solid ${c.border}`,fontSize:12,color:c.accentT}}>
              Selecting a language reloads the page to apply translation fully.
            </div>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div style={card}>
          <div style={secTitle}>Change Password</div>
          <div style={secSub}>Keep your account secure with a strong, unique password.</div>

          {pwSuccess&&<div style={{background:c.successL,border:`1px solid ${c.successB}`,color:c.success,borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13,fontWeight:500}}>{pwSuccess}</div>}
          {pwError&&  <div style={{background:c.dangerL, border:`1px solid ${c.dangerB}`, color:c.danger, borderRadius:8,padding:'11px 14px',marginBottom:16,fontSize:13}}>{pwError}</div>}

          <form onSubmit={handlePwSubmit}>
            {[
              {label:'Current Password',    key:'current_password',showKey:'cur'},
              {label:'New Password',         key:'new_password',    showKey:'nw', hint:'Minimum 8 characters'},
              {label:'Confirm New Password', key:'confirm_password',showKey:'cf'},
            ].map(({label:lbl2,key,showKey,hint})=>(
              <div key={key} style={{marginBottom:16}}>
                <label style={lbl}>{lbl2}</label>
                <div style={{position:'relative'}}>
                  <input type={show[showKey]?'text':'password'} value={pwForm[key]}
                    onChange={e=>{setPwForm({...pwForm,[key]:e.target.value});setPwError('');setPwSuccess('');}}
                    style={{...inp,paddingRight:48}} placeholder={hint||''}
                    onFocus={e=>e.target.style.borderColor='#005599'} onBlur={e=>e.target.style.borderColor=c.border}/>
                  <button type="button" onClick={()=>setShow({...show,[showKey]:!show[showKey]})}
                    style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:c.t3,display:'flex',alignItems:'center',padding:4,minHeight:44,minWidth:44,justifyContent:'center'}}>
                    <EyeIcon open={show[showKey]}/>
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={pwSaving}
              style={{width:'100%',padding:'14px',background:BRAND,color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:pwSaving?'not-allowed':'pointer',fontFamily:'inherit',opacity:pwSaving?0.7:1,marginTop:4,minHeight:52}}>
              {pwSaving?'Changing Password…':'Change Password'}
            </button>
          </form>
          <div style={{textAlign:'center',marginTop:16,fontSize:12,color:c.t3}}>Forgot your password? Log out and use the "Forgot Password" link on the login page.</div>
        </div>
      </div>

      {toast&&(
        <div style={{position:'fixed',bottom:isMobile?24:28,right:isMobile?12:28,left:isMobile?12:'auto',background:toast.type==='success'?'#16a34a':'#dc2626',color:'#fff',padding:'12px 18px',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.2)',zIndex:9999,display:'flex',alignItems:'center',gap:10,fontSize:14,fontWeight:500,animation:'slideUp 0.3s ease'}}>
          <span>{toast.type==='success'?'✓':'✕'}</span>{toast.msg}
        </div>
      )}
    </div>
  );
}
