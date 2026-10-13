import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import MonoIcon from '../../components/common/MonoIcon';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

export default function ForceChangePassword() {
  const { user, logout, clearForcePasswordChange } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (form.new_password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.put('/auth/change-password', form);
      clearForcePasswordChange();
      navigate(user?.roleName === 'Member' ? '/portal' : '/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to change password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mcc-auth" style={styles.page}>
      <div style={styles.card}>
        <img src="/logo.jpg" alt="PLWM-MCC" style={{ width: 44, height: 44, borderRadius: '50%', marginBottom: 16 }} />
        <h2 style={styles.title}>Change Your Password</h2>
        <p style={styles.subtitle}>
          You must set a new password before continuing.
        </p>

        {error && <div id="password-error" role="alert" style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form} aria-busy={loading} aria-describedby={error ? 'password-error' : undefined}>
          <div style={styles.field}>
            <label htmlFor="current-password" style={styles.label}>Current Password</label>
            <input
              type="password"
              name="current_password"
              id="current-password"
              autoComplete="current-password"
              value={form.current_password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#0066b3'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="new-password" style={styles.label}>New Password</label>
            <input
              type="password"
              name="new_password"
              id="new-password"
              autoComplete="new-password"
              minLength={8}
              value={form.new_password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              required
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#0066b3'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="confirm-password" style={styles.label}>Confirm New Password</label>
            <input
              type="password"
              name="confirm_password"
              id="confirm-password"
              autoComplete="new-password"
              minLength={8}
              value={form.confirm_password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#0066b3'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>

          <button
            type="button"
            onClick={logout}
            style={styles.logoutBtn}
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--mcc-canvas)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '24px'
  },
  card: {
    background: 'var(--mcc-surface, #fff)',
    border: '1px solid var(--mcc-border, #e2e8f0)',
    borderRadius: 'var(--mcc-radius, 16px)',
    padding: 'clamp(24px, 5vw, 48px)',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center'
  },
  iconWrap: {
    fontSize: '40px',
    marginBottom: '16px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--mcc-ink, #0f172a)',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--mcc-secondary, #52647a)',
    margin: '0 0 32px 0',
    lineHeight: '1.6'
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    marginBottom: '24px',
    textAlign: 'left'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    textAlign: 'left'
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
    fontSize: '16px',
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
    color: 'var(--mcc-ink, #0f172a)',
    minHeight: '48px',
  },
  submitBtn: {
    background: '#005599',
    color: 'var(--mcc-surface, #fff)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    minHeight: '52px',
    width: '100%',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#52647a',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '0'
  }
};
