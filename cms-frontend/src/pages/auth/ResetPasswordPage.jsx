import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const LOGO   = process.env.PUBLIC_URL + '/logo.jpg';
const BG_URL = process.env.PUBLIC_URL + '/smr.jpg';

const rules = [
  { label: 'At least 8 characters',       test: v => v.length >= 8 },
  { label: 'One uppercase letter (A–Z)',   test: v => /[A-Z]/.test(v) },
  { label: 'One lowercase letter (a–z)',   test: v => /[a-z]/.test(v) },
  { label: 'One number (0–9)',             test: v => /\d/.test(v) },
];

export default function ResetPasswordPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const token         = params.get('token') || '';

  const [form,     setForm]     = useState({ password: '', confirm: '' });
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused,  setFocused]  = useState(null);

  // Redirect if no token in URL
  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true });
  }, [token, navigate]);

  const strength = rules.filter(r => r.test(form.password)).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (strength < 2) {
      setError('Please choose a stronger password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/reset-password`,
        { token, new_password: form.password }
      );
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      {/* ── Left panel ── */}
      <div style={S.left}>
        <div style={{ ...S.bgPhoto, backgroundImage: `url(${BG_URL})` }} />
        <div style={S.overlay} />
        <div style={S.leftContent}>
          <div style={S.logoBlock}>
            <img src={LOGO} alt="PLWM-MCC" style={S.logoImg} />
            <div style={S.logoTextBlock}>
              <span style={S.logoName}>PLWM-MCC</span>
              <span style={S.logoSub}>Church Management System</span>
            </div>
          </div>
          <div style={S.dividerLine} />
          <blockquote style={S.quoteBlock}>
            <p style={S.quoteText}>
              "He restores my soul. He leads me in<br />
              paths of righteousness for his name's sake."
            </p>
            <cite style={S.quoteRef}>— Psalm 23:3</cite>
          </blockquote>
        </div>
        <div style={S.leftFooter}>
          <span style={S.leftFooterText}>Powered by faith. Built for community.</span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={S.right}>
        <div style={S.card}>
          <div style={S.cardAccent} />
          <div style={S.cardBody}>

            <div style={S.formLogoRow}>
              <img src={LOGO} alt="Logo" style={S.formLogo} />
              <span style={S.formLogoLabel}>PLWM-MCC</span>
            </div>

            {!done ? (
              <>
                <h2 style={S.title}>Set new password</h2>
                <p style={S.subtitle}>
                  Choose a strong password for your account.
                </p>

                {error && (
                  <div style={S.errorBox}>
                    <span style={S.errorIcon}>⚠</span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={S.form}>
                  {/* New password */}
                  <div style={S.field}>
                    <label style={S.label}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <span style={S.fieldIcon}>🔒</span>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                        onFocus={() => setFocused('pw')}
                        onBlur={() => setFocused(null)}
                        placeholder="••••••••"
                        required
                        autoFocus
                        style={{
                          ...S.input,
                          paddingRight: '48px',
                          borderColor: focused === 'pw' ? '#005599' : '#e2e8f0',
                          boxShadow:   focused === 'pw' ? '0 0 0 3px rgba(0,85,153,0.12)' : 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={S.eyeBtn}
                        tabIndex={-1}
                      >
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {form.password.length > 0 && (
                      <div style={S.strengthWrap}>
                        <div style={S.strengthTrack}>
                          {[1,2,3,4].map(n => (
                            <div
                              key={n}
                              style={{
                                ...S.strengthSeg,
                                background: n <= strength ? strengthColor : '#e2e8f0',
                              }}
                            />
                          ))}
                        </div>
                        <span style={{ ...S.strengthLabel, color: strengthColor }}>
                          {strengthLabel}
                        </span>
                      </div>
                    )}

                    {/* Rules checklist */}
                    {form.password.length > 0 && (
                      <div style={S.rulesList}>
                        {rules.map(r => (
                          <div key={r.label} style={S.ruleItem}>
                            <span style={{ ...S.ruleDot, color: r.test(form.password) ? '#22c55e' : '#cbd5e1' }}>
                              {r.test(form.password) ? '✓' : '○'}
                            </span>
                            <span style={{ ...S.ruleText, color: r.test(form.password) ? '#374151' : '#94a3b8' }}>
                              {r.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div style={S.field}>
                    <label style={S.label}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <span style={S.fieldIcon}>🔒</span>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={e => { setForm({ ...form, confirm: e.target.value }); setError(''); }}
                        onFocus={() => setFocused('cf')}
                        onBlur={() => setFocused(null)}
                        placeholder="••••••••"
                        required
                        style={{
                          ...S.input,
                          borderColor:
                            form.confirm.length > 0
                              ? form.confirm === form.password ? '#22c55e' : '#ef4444'
                              : focused === 'cf' ? '#005599' : '#e2e8f0',
                          boxShadow:
                            focused === 'cf' && form.confirm.length === 0
                              ? '0 0 0 3px rgba(0,85,153,0.12)'
                              : 'none',
                        }}
                      />
                      {form.confirm.length > 0 && (
                        <span style={S.matchIcon}>
                          {form.confirm === form.password ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ ...S.submitBtn, opacity: loading ? 0.8 : 1 }}
                  >
                    {loading ? (
                      <span style={S.loadingRow}>
                        <span style={S.spinner} />
                        Updating…
                      </span>
                    ) : 'Update Password →'}
                  </button>
                </form>
              </>
            ) : (
              /* ── Success state ── */
              <div style={S.successBox}>
                <div style={S.successIcon}>✓</div>
                <h3 style={S.successTitle}>Password updated!</h3>
                <p style={S.successText}>
                  Your password has been changed successfully.<br />
                  You can now sign in with your new password.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  style={S.submitBtn}
                >
                  Go to Sign In →
                </button>
              </div>
            )}

            <div style={S.backRow}>
              <button onClick={() => navigate('/login')} style={S.backLink}>
                ← Back to Sign In
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

const S = {
  page: { display:'flex', minHeight:'100vh', fontFamily:"'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif", overflow:'hidden' },

  left:        { flex:'0 0 48%', position:'relative', display:'flex', flexDirection:'column', justifyContent:'center', overflow:'hidden' },
  bgPhoto:     { position:'absolute', inset:0, backgroundSize:'cover', backgroundPosition:'center top', backgroundRepeat:'no-repeat' },
  overlay:     { position:'absolute', inset:0, background:'linear-gradient(155deg,rgba(0,40,100,0.88) 0%,rgba(0,85,153,0.75) 50%,rgba(0,40,80,0.92) 100%)' },
  leftContent: { position:'relative', zIndex:2, padding:'0 52px', animation:'fadeUp 0.8s ease both' },
  logoBlock:   { display:'flex', alignItems:'center', gap:'16px', marginBottom:'40px' },
  logoImg:     { width:'72px', height:'72px', objectFit:'contain', filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.4))', borderRadius:'50%', background:'rgba(255,255,255,0.08)', padding:'4px' },
  logoTextBlock: { display:'flex', flexDirection:'column' },
  logoName:    { color:'#fff', fontSize:'28px', fontWeight:'900', letterSpacing:'3px', lineHeight:1, textShadow:'0 2px 12px rgba(0,0,0,0.3)' },
  logoSub:     { color:'rgba(255,255,255,0.7)', fontSize:'11px', fontWeight:'500', letterSpacing:'2.5px', textTransform:'uppercase', marginTop:'5px' },
  dividerLine: { width:'56px', height:'3px', background:'linear-gradient(90deg,#13B5EA,rgba(255,255,255,0.3))', borderRadius:'2px', marginBottom:'32px' },
  quoteBlock:  { margin:0, padding:0, borderLeft:'3px solid rgba(19,181,234,0.6)', paddingLeft:'20px' },
  quoteText:   { color:'rgba(255,255,255,0.9)', fontSize:'17px', fontStyle:'italic', lineHeight:'1.75', margin:'0 0 12px 0', fontWeight:'400', textShadow:'0 1px 6px rgba(0,0,0,0.2)' },
  quoteRef:    { color:'rgba(255,255,255,0.55)', fontSize:'13px', fontStyle:'normal', fontWeight:'500', letterSpacing:'0.5px' },
  leftFooter:  { position:'absolute', bottom:'28px', left:0, right:0, textAlign:'center', zIndex:2 },
  leftFooterText: { color:'rgba(255,255,255,0.4)', fontSize:'11px', letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:'500' },

  right:       { flex:1, background:'#f0f6ff', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px' },
  card:        { background:'#fff', borderRadius:'20px', width:'100%', maxWidth:'420px', boxShadow:'0 8px 48px rgba(0,85,153,0.12),0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden', animation:'fadeUp 0.6s 0.1s ease both' },
  cardAccent:  { height:'5px', background:'linear-gradient(90deg,#003d70,#005599,#13B5EA)' },
  cardBody:    { padding:'36px 40px 32px' },
  formLogoRow: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'28px' },
  formLogo:    { width:'36px', height:'36px', objectFit:'contain', borderRadius:'50%', background:'#e8f4fd', padding:'3px' },
  formLogoLabel: { fontSize:'13px', fontWeight:'800', color:'#005599', letterSpacing:'1.5px' },

  title:       { fontSize:'24px', fontWeight:'800', color:'#0f172a', margin:'0 0 6px 0', letterSpacing:'-0.3px' },
  subtitle:    { fontSize:'14px', color:'#64748b', margin:'0 0 28px 0', lineHeight:'1.5' },

  errorBox:    { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:'10px', padding:'11px 14px', fontSize:'13px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px' },
  errorIcon:   { fontSize:'15px', flexShrink:0 },

  form:        { display:'flex', flexDirection:'column', gap:'18px' },
  field:       { display:'flex', flexDirection:'column', gap:'7px' },
  label:       { fontSize:'12px', fontWeight:'700', color:'#374151', letterSpacing:'0.4px', textTransform:'uppercase' },
  fieldIcon:   { position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', opacity:0.5, pointerEvents:'none' },
  input:       { padding:'12px 16px 12px 40px', fontSize:'14px', border:'1.5px solid #e2e8f0', borderRadius:'10px', outline:'none', transition:'border-color 0.2s,box-shadow 0.2s', width:'100%', boxSizing:'border-box', color:'#0f172a', background:'#fafbfc' },
  eyeBtn:      { position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'15px', padding:'4px', opacity:0.6 },
  matchIcon:   { position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'16px', fontWeight:'700', color:'inherit', pointerEvents:'none' },

  strengthWrap:  { display:'flex', alignItems:'center', gap:'10px', marginTop:'8px' },
  strengthTrack: { display:'flex', gap:'4px', flex:1 },
  strengthSeg:   { height:'4px', flex:1, borderRadius:'2px', transition:'background 0.2s' },
  strengthLabel: { fontSize:'11px', fontWeight:'700', letterSpacing:'0.5px', minWidth:'40px', textAlign:'right' },

  rulesList:   { display:'flex', flexDirection:'column', gap:'4px', marginTop:'10px', padding:'10px 12px', background:'#f8fafc', borderRadius:'8px' },
  ruleItem:    { display:'flex', alignItems:'center', gap:'8px' },
  ruleDot:     { fontSize:'13px', fontWeight:'700', width:'16px', flexShrink:0, textAlign:'center' },
  ruleText:    { fontSize:'12px', transition:'color 0.2s' },

  submitBtn:   { background:'linear-gradient(135deg,#003d70 0%,#005599 50%,#13B5EA 100%)', color:'#fff', border:'none', borderRadius:'10px', padding:'14px', fontSize:'15px', fontWeight:'700', cursor:'pointer', transition:'opacity 0.2s', letterSpacing:'0.3px', width:'100%' },
  loadingRow:  { display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' },
  spinner:     { display:'inline-block', width:'16px', height:'16px', border:'2.5px solid rgba(255,255,255,0.3)', borderTop:'2.5px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' },

  successBox:  { textAlign:'center', padding:'8px 0 20px', animation:'fadeUp 0.4s ease both' },
  successIcon: { width:'56px', height:'56px', borderRadius:'50%', background:'linear-gradient(135deg,#005599,#13B5EA)', color:'#fff', fontSize:'24px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' },
  successTitle:{ fontSize:'20px', fontWeight:'800', color:'#0f172a', margin:'0 0 12px' },
  successText: { fontSize:'14px', color:'#374151', lineHeight:'1.65', margin:'0 0 24px' },

  backRow:     { marginTop:'24px', textAlign:'center' },
  backLink:    { background:'none', border:'none', color:'#005599', fontSize:'13px', fontWeight:'600', cursor:'pointer', padding:0, letterSpacing:'0.2px' },
};
