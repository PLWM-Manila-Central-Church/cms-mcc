import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

const BRAND = 'linear-gradient(135deg,#003d70,#005599,#13B5EA)';

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function PasswordField({ label, name, value, onChange, show, onToggle, placeholder }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder || ''}
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 44px 11px 14px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}
          onFocus={e => e.target.style.borderColor = '#005599'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
        <button type="button" onClick={onToggle}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2 }}>
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function MemberPortalSettings() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [show, setShow] = useState({ current: false, newp: false, confirm: false });
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.'); return;
    }
    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match.'); return;
    }
    if (form.new_password === form.current_password) {
      setError('New password must be different from your current password.'); return;
    }

    setSaving(true);
    try {
      await axiosInstance.post('/member-portal/change-password', {
        current_password: form.current_password,
        new_password:     form.new_password,
      });
      setSuccess('Password changed successfully.');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: BRAND, padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/portal')}
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Back
        </button>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Settings</div>
      </div>

      <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 20px' }}>
        {/* Change Password Card */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '28px 32px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Change Password</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
            Keep your account secure by using a strong, unique password.
          </div>

          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '11px 14px', marginBottom: 18, fontSize: 13, fontWeight: 500 }}>
              {success}
            </div>
          )}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '11px 14px', marginBottom: 18, fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <PasswordField
              label="Current Password"
              name="current_password"
              value={form.current_password}
              onChange={handleChange}
              show={show.current}
              onToggle={() => setShow({ ...show, current: !show.current })}
              placeholder="Enter your current password"
            />
            <PasswordField
              label="New Password"
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              show={show.newp}
              onToggle={() => setShow({ ...show, newp: !show.newp })}
              placeholder="Minimum 8 characters"
            />
            <PasswordField
              label="Confirm New Password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              show={show.confirm}
              onToggle={() => setShow({ ...show, confirm: !show.confirm })}
              placeholder="Re-enter new password"
            />

            <button type="submit" disabled={saving}
              style={{ width: '100%', padding: '12px', background: BRAND, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, marginTop: 4 }}>
              {saving ? 'Changing Password…' : 'Change Password'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
          If you forgot your password, log out and use the "Forgot Password" link on the login page.
        </div>
      </div>
    </div>
  );
}
