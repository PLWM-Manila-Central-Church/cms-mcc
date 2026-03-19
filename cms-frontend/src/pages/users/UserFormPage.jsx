import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

function EyeIcon({ open }) {
  return open ? (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    email: '', password: '', role_id: '', member_id: ''
  });
  const [roles,   setRoles]   = useState([]);   // fetched from API
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Load roles from API — never rely on hardcoded IDs
  useEffect(() => {
    axiosInstance.get('/roles')
      .then(res => setRoles(res.data.data || []))
      .catch(() => {}); // roles list failure is non-critical; user sees empty dropdown
  }, []);

  useEffect(() => {
    axiosInstance.get('/members?limit=200')
      .then(res => setMembers(res.data.data?.members || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const loadUser = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/users/${id}`);
        const u   = res.data.data;
        setForm({
          email:     u.email     || '',
          password:  '',
          role_id:   u.role_id   || '',
          member_id: u.member_id || '',
        });
      } catch {
        setError('Failed to load user.');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [id, isEdit]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      email:     form.email,
      role_id:   parseInt(form.role_id),
      member_id: form.member_id ? parseInt(form.member_id) : null,
    };
    if (!isEdit) payload.password = form.password;

    try {
      if (isEdit) {
        await axiosInstance.put(`/users/${id}`, payload);
      } else {
        await axiosInstance.post('/users', payload);
      }
      navigate('/users');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/users')} style={styles.backBtn}>
          ← Back to Users
        </button>
        <h1 style={styles.title}>{isEdit ? 'Edit User' : 'Add New User'}</h1>
        <p style={styles.subtitle}>
          {isEdit
            ? 'Update user role or linked member.'
            : 'New users will be required to change their password on first login.'
          }
        </p>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Account Details</h2>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>Email Address *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="user@plwmmcc.com"
              onFocus={e => e.target.style.borderColor = '#0066b3'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {!isEdit && (
            <div style={{ ...styles.fieldWrap, marginTop: '16px' }}>
              <label style={styles.label}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{ ...styles.input, paddingRight: '44px' }}
                  placeholder="Min. 8 characters"
                  onFocus={e => e.target.style.borderColor = '#0066b3'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2 }}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <p style={styles.hint}>
                User will be required to change this on first login.
              </p>
            </div>
          )}

          <div style={{ ...styles.fieldWrap, marginTop: '16px' }}>
            <label style={styles.label}>Role *</label>
            <select
              name="role_id"
              value={form.role_id}
              onChange={handleChange}
              required
              style={styles.select}
            >
              <option value="">— Select Role —</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.role_name}</option>
              ))}
            </select>
            {roles.length === 0 && (
              <p style={{ ...styles.hint, color: '#d97706' }}>Loading roles…</p>
            )}
          </div>

          <div style={{ ...styles.fieldWrap, marginTop: '16px' }}>
            <label style={styles.label}>Link to Member <span style={styles.optional}>(optional)</span></label>
            <select
              name="member_id"
              value={form.member_id}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="">— No Member Linked —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.last_name}, {m.first_name} — {m.email || 'no email'}
                </option>
              ))}
            </select>
            <p style={styles.hint}>
              Linking a member connects this user account to a member profile.
            </p>
          </div>
        </div>

        <div style={styles.formActions}>
          <button type="button" onClick={() => navigate('/users')} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page:    { fontFamily: "'Segoe UI', sans-serif", maxWidth: '600px' },
  loading: { padding: '48px', textAlign: 'center', color: '#94a3b8' },
  header:  { marginBottom: '24px' },
  backBtn: {
    background: 'none', border: 'none', color: '#0066b3',
    fontSize: '14px', cursor: 'pointer', padding: '0 0 8px 0', fontWeight: '500'
  },
  title:    { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
    borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px'
  },
  form:     { display: 'flex', flexDirection: 'column', gap: '24px' },
  card: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
  },
  cardTitle: {
    fontSize: '15px', fontWeight: '700', color: '#005599',
    margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9'
  },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:     { fontSize: '13px', fontWeight: '600', color: '#374151' },
  optional:  { fontWeight: '400', color: '#94a3b8' },
  hint:      { fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' },
  input: {
    padding: '10px 14px', fontSize: '14px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s',
    color: '#0f172a', width: '100%', boxSizing: 'border-box'
  },
  select: {
    padding: '10px 14px', fontSize: '14px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', outline: 'none', background: '#fff',
    color: '#0f172a', width: '100%', boxSizing: 'border-box'
  },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: {
    background: '#f1f5f9', color: '#475569', border: 'none',
    borderRadius: '8px', padding: '12px 24px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer'
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #005599, #13B5EA)',
    color: '#fff', border: 'none', borderRadius: '8px',
    padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
  },
};
