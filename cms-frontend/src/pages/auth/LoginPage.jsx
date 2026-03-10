import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

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
      if (forcePasswordChange) {
        navigate('/force-change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.brand}>
          <div style={styles.cross}>✛</div>
          <h1 style={styles.churchName}>PLWM-MCC</h1>
          <p style={styles.churchSub}>Church Management System</p>
        </div>
        <p style={styles.quote}>
          "For where two or three gather in my name, there am I with them."
        </p>
        <p style={styles.quoteRef}>Matthew 18:20</p>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <h2 style={styles.title}>Welcome back</h2>
          <p style={styles.subtitle}>Sign in to your account</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@church.org"
                required
                style={styles.input}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.passWrap}>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  style={{ ...styles.input, paddingRight: '48px' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={styles.footer}>
            PLWM-MCC &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', sans-serif"
  },
  left: {
    flex: 1,
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
    color: '#fff'
  },
  brand: {
    textAlign: 'center',
    marginBottom: '48px'
  },
  cross: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.9
  },
  churchName: {
    fontSize: '36px',
    fontWeight: '800',
    letterSpacing: '4px',
    margin: '0 0 8px 0'
  },
  churchSub: {
    fontSize: '14px',
    opacity: 0.75,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    margin: 0
  },
  quote: {
    fontSize: '16px',
    fontStyle: 'italic',
    opacity: 0.85,
    textAlign: 'center',
    maxWidth: '320px',
    lineHeight: '1.7',
    margin: '0 0 8px 0'
  },
  quoteRef: {
    fontSize: '13px',
    opacity: 0.6,
    margin: 0
  },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: '48px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 32px 0'
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    marginBottom: '24px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
    color: '#0f172a'
  },
  passWrap: {
    position: 'relative'
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0'
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.2s'
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '32px',
    marginBottom: 0
  }
};