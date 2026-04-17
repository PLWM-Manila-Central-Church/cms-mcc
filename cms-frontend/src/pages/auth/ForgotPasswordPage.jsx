import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LOGO   = process.env.PUBLIC_URL + '/logo.jpg';
const BG_URL = process.env.PUBLIC_URL + '/smr.jpg';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/forgot-password`,
        { email }
      );
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      {/* ── Left panel ── */}
      <div style={S.left} className="forgot-left">
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
              "Call to me and I will answer you,<br />
              and tell you great and unsearchable<br />
              things you do not know."
            </p>
            <cite style={S.quoteRef}>— Jeremiah 33:3</cite>
          </blockquote>
        </div>
        <div style={S.leftFooter}>
          <span style={S.leftFooterText}>Powered by faith. Built for community.</span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={S.right} className="forgot-right">
        <div style={S.card}>
          <div style={S.cardAccent} />
          <div style={S.cardBody}>

            {/* Logo row */}
            <div style={S.formLogoRow}>
              <img src={LOGO} alt="Logo" style={S.formLogo} />
              <span style={S.formLogoLabel}>PLWM-MCC</span>
            </div>

            {!sent ? (
              <>
                <h2 style={S.title}>Forgot password?</h2>
                <p style={S.subtitle}>
                  Enter your account email and we'll send you a reset link.
                </p>

                {error && (
                  <div style={S.errorBox}>
                    <span style={S.errorIcon}>⚠</span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={S.form}>
                  <div style={S.field}>
                    <label style={S.label}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <span style={S.fieldIcon}>✉</span>
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="you@church.org"
                        required
                        autoComplete="email"
                        autoFocus
                        style={{
                          ...S.input,
                          borderColor: focused ? '#005599' : '#e2e8f0',
                          boxShadow:   focused ? '0 0 0 3px rgba(0,85,153,0.12)' : 'none',
                        }}
                      />
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
                        Sending…
                      </span>
                    ) : 'Send Reset Link →'}
                  </button>
                </form>
              </>
            ) : (
              /* ── Success state ── */
              <div style={S.successBox}>
                <div style={S.successIcon}>✓</div>
                <h3 style={S.successTitle}>Check your email</h3>
                <p style={S.successText}>
                  If <strong>{email}</strong> is registered, you'll receive a
                  password reset link shortly. The link expires in <strong>1 hour</strong>.
                </p>
                <p style={S.successHint}>
                  Didn't get it? Check your spam folder, or{' '}
                  <button
                    onClick={() => { setSent(false); setEmail(''); }}
                    style={S.retryLink}
                  >
                    try again
                  </button>.
                </p>
              </div>
            )}

            {/* Back to login */}
            <div style={S.backRow}>
              <button onClick={() => navigate('/login')} style={S.backLink}>
                ← Back to Sign In
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width: 768px) {
          .forgot-left { display: none !important; }
          .forgot-right { flex: 1 !important; padding: 24px 16px !important; }
        }
      `}</style>
    </div>
  );
}

const S = {
  page: { display:'flex', minHeight:'100vh', fontFamily:"'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif", overflow:'hidden' },

  /* Left */
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

  /* Right */
  right:       { flex:1, background:'#f0f6ff', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px' },
  card:        { background:'#fff', borderRadius:'20px', width:'100%', maxWidth:'400px', boxShadow:'0 8px 48px rgba(0,85,153,0.12),0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden', animation:'fadeUp 0.6s 0.1s ease both' },
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
  input:       { padding:'12px 16px 12px 40px', fontSize:'16px', border:'1.5px solid #e2e8f0', borderRadius:'10px', outline:'none', transition:'border-color 0.2s,box-shadow 0.2s', width:'100%', boxSizing:'border-box', color:'#0f172a', background:'#fafbfc' },
  submitBtn:   { background:'linear-gradient(135deg,#003d70 0%,#005599 50%,#13B5EA 100%)', color:'#fff', border:'none', borderRadius:'10px', padding:'14px', fontSize:'15px', fontWeight:'700', cursor:'pointer', transition:'opacity 0.2s', letterSpacing:'0.3px', width:'100%', minHeight:'52px' },
  loadingRow:  { display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' },
  spinner:     { display:'inline-block', width:'16px', height:'16px', border:'2.5px solid rgba(255,255,255,0.3)', borderTop:'2.5px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' },

  /* Success */
  successBox:  { textAlign:'center', padding:'8px 0 12px', animation:'fadeUp 0.4s ease both' },
  successIcon: { width:'56px', height:'56px', borderRadius:'50%', background:'linear-gradient(135deg,#005599,#13B5EA)', color:'#fff', fontSize:'24px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' },
  successTitle:{ fontSize:'20px', fontWeight:'800', color:'#0f172a', margin:'0 0 12px' },
  successText: { fontSize:'14px', color:'#374151', lineHeight:'1.65', margin:'0 0 12px' },
  successHint: { fontSize:'13px', color:'#94a3b8', margin:0 },
  retryLink:   { background:'none', border:'none', color:'#005599', fontSize:'13px', fontWeight:'600', cursor:'pointer', padding:0, textDecoration:'underline' },

  /* Footer nav */
  backRow:     { marginTop:'28px', textAlign:'center' },
  backLink:    { background:'none', border:'none', color:'#005599', fontSize:'13px', fontWeight:'600', cursor:'pointer', padding:0, letterSpacing:'0.2px' },
};
