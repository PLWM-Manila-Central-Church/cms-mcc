import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LOGO = process.env.PUBLIC_URL + '/logo.jpg';

const BG_URL = process.env.PUBLIC_URL + '/smr.jpg';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]         = useState({ email: '', password: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { forcePasswordChange } = await login(form.email, form.password);
      navigate(forcePasswordChange ? '/force-change-password' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      {/* ── Left panel — church photo with overlay ── */}
      <div style={S.left}>
        {/* Background photo */}
        <div style={{ ...S.bgPhoto, backgroundImage: `url(${BG_URL})` }} />
        {/* Gradient overlay */}
        <div style={S.overlay} />
        {/* Content */}
        <div style={S.leftContent}>
          <div style={S.logoBlock}>
            <img src={LOGO} alt="PLWM-MCC Logo" style={S.logoImg} />
            <div style={S.logoTextBlock}>
              <span style={S.logoName}>PLWM-MCC</span>
              <span style={S.logoSub}>Church Management System</span>
            </div>
          </div>

          <div style={S.dividerLine} />

          <blockquote style={S.quoteBlock}>
            <p style={S.quoteText}>
              "For where two or three gather in my name,<br/>
              there am I with them."
            </p>
            <cite style={S.quoteRef}>— Matthew 18:20</cite>
          </blockquote>
        </div>

        {/* Bottom tagline */}
        <div style={S.leftFooter}>
          <span style={S.leftFooterText}>Powered by faith. Built for community.</span>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div style={S.right}>
        <div style={S.card}>
          {/* Card top accent */}
          <div style={S.cardAccent} />

          <div style={S.cardBody}>
            {/* Small logo on form side */}
            <div style={S.formLogoRow}>
              <img src={LOGO} alt="Logo" style={S.formLogo} />
              <span style={S.formLogoLabel}>PLWM-MCC</span>
            </div>

            <h2 style={S.title}>Welcome back</h2>
            <p style={S.subtitle}>Sign in to your account to continue</p>

            {error && (
              <div style={S.errorBox}>
                <span style={S.errorIcon}>⚠</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={S.form}>
              {/* Email */}
              <div style={S.field}>
                <label style={S.label}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={S.fieldIcon}>✉</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    placeholder="you@church.org"
                    required
                    autoComplete="email"
                    style={{
                      ...S.input,
                      borderColor: focused === 'email' ? '#005599' : '#e2e8f0',
                      boxShadow: focused === 'email' ? '0 0 0 3px rgba(0,85,153,0.12)' : 'none',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={S.field}>
                <label style={S.label}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={S.fieldIcon}>🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      ...S.input,
                      paddingRight: '48px',
                      borderColor: focused === 'pass' ? '#005599' : '#e2e8f0',
                      boxShadow: focused === 'pass' ? '0 0 0 3px rgba(0,85,153,0.12)' : 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={S.eyeBtn}
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ ...S.submitBtn, opacity: loading ? 0.8 : 1, transform: loading ? 'scale(0.99)' : 'scale(1)' }}
              >
                {loading ? (
                  <span style={S.loadingRow}>
                    <span style={S.spinner} />
                    Signing in…
                  </span>
                ) : 'Sign In →'}
              </button>

              <div style={S.forgotRow}>
                <Link to="/forgot-password" style={S.forgotLink}>
                  Forgot your password?
                </Link>
              </div>
            </form>

            <p style={S.footer}>
              PLWM-MCC &copy; {new Date().getFullYear()} &nbsp;·&nbsp; All rights reserved
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const S = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    overflow: 'hidden',
  },

  /* ── Left panel ── */
  left: {
    flex: '0 0 48%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgPhoto: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
    transition: 'transform 0.6s ease',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(155deg, rgba(0,40,100,0.88) 0%, rgba(0,85,153,0.75) 50%, rgba(0,40,80,0.92) 100%)',
  },
  leftContent: {
    position: 'relative',
    zIndex: 2,
    padding: '0 52px',
    animation: 'fadeUp 0.8s ease both',
  },
  logoBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '40px',
  },
  logoImg: {
    width: '72px',
    height: '72px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    padding: '4px',
  },
  logoTextBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoName: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: '900',
    letterSpacing: '3px',
    lineHeight: 1,
    textShadow: '0 2px 12px rgba(0,0,0,0.3)',
  },
  logoSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '11px',
    fontWeight: '500',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    marginTop: '5px',
  },
  dividerLine: {
    width: '56px',
    height: '3px',
    background: 'linear-gradient(90deg, #13B5EA, rgba(255,255,255,0.3))',
    borderRadius: '2px',
    marginBottom: '32px',
  },
  quoteBlock: {
    margin: 0,
    padding: 0,
    borderLeft: '3px solid rgba(19,181,234,0.6)',
    paddingLeft: '20px',
  },
  quoteText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '17px',
    fontStyle: 'italic',
    lineHeight: '1.75',
    margin: '0 0 12px 0',
    fontWeight: '400',
    textShadow: '0 1px 6px rgba(0,0,0,0.2)',
  },
  quoteRef: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '13px',
    fontStyle: 'normal',
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
  leftFooter: {
    position: 'absolute',
    bottom: '28px',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 2,
  },
  leftFooterText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    fontWeight: '500',
  },

  /* ── Right panel ── */
  right: {
    flex: 1,
    background: '#f0f6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
    position: 'relative',
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 48px rgba(0,85,153,0.12), 0 2px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    animation: 'fadeUp 0.6s 0.1s ease both',
  },
  cardAccent: {
    height: '5px',
    background: 'linear-gradient(90deg, #003d70, #005599, #13B5EA)',
  },
  cardBody: {
    padding: '36px 40px 32px',
  },
  formLogoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  formLogo: {
    width: '36px',
    height: '36px',
    objectFit: 'contain',
    borderRadius: '50%',
    background: '#e8f4fd',
    padding: '3px',
  },
  formLogoLabel: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#005599',
    letterSpacing: '1.5px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 6px 0',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 28px 0',
    lineHeight: '1.5',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '13px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorIcon: {
    fontSize: '15px',
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#374151',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  fieldIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    opacity: 0.5,
    pointerEvents: 'none',
  },
  input: {
    padding: '12px 16px 12px 40px',
    fontSize: '14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    width: '100%',
    boxSizing: 'border-box',
    color: '#0f172a',
    background: '#fafbfc',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    padding: '4px',
    opacity: 0.6,
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #003d70 0%, #005599 50%, #13B5EA 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'opacity 0.2s, transform 0.15s',
    letterSpacing: '0.3px',
    width: '100%',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTop: '2.5px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '28px',
    marginBottom: 0,
    letterSpacing: '0.3px',
  },
  forgotRow: {
    textAlign: 'center',
    marginTop: '14px',
  },
  forgotLink: {
    color: '#005599',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    letterSpacing: '0.2px',
  },
};