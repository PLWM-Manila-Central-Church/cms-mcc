import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    email: '', password: '', role_id: '', member_id: '',
    leads_ministry_id: ''
  });
  const [roles,   setRoles]   = useState([]);
  const [members, setMembers] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [cellGroups, setCellGroups] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const isCellGroupLeader = parseInt(form.role_id) === 5;
  const isGroupLeader = parseInt(form.role_id) === 6;
  const isMinistryLeader = parseInt(form.role_id) === 8;
  const showLeaderSection = isCellGroupLeader || isGroupLeader || isMinistryLeader;

  useEffect(() => {
    axiosInstance.get('/roles')
      .then(res => setRoles(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axiosInstance.get('/members?limit=200')
      .then(res => setMembers(res.data.data?.members || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axiosInstance.get('/ministry/roles')
      .then(res => setMinistries(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axiosInstance.get('/cellgroups')
      .then(res => setCellGroups(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axiosInstance.get('/members/dropdowns/groups')
      .then(res => setGroups(res.data.data || []))
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
          leads_cell_group_id: u.leads_cell_group_id || '',
          leads_group_id:      u.leads_group_id      || '',
          leads_ministry_id:   u.leads_ministry_id   || '',
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
    const { name, value } = e.target;
    if (name === 'role_id') {
      setForm({ 
        ...form, 
        role_id: value,
        leads_cell_group_id: '',
        leads_group_id: '',
        leads_ministry_id: '',
      });
    } else {
      setForm({ ...form, [name]: value });
    }
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

    if (isCellGroupLeader && form.leads_cell_group_id) {
      payload.leads_cell_group_id = parseInt(form.leads_cell_group_id);
    }
    if (isGroupLeader && form.leads_group_id) {
      payload.leads_group_id = parseInt(form.leads_group_id);
    }
    if (isMinistryLeader && form.leads_ministry_id) {
      payload.leads_ministry_id = parseInt(form.leads_ministry_id);
    }

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
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="Min. 8 characters"
                onFocus={e => e.target.style.borderColor = '#0066b3'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
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

        {showLeaderSection && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Leader Assignment</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0' }}>
              Assign which cell group, group, or ministry this user leads.
            </p>

            {isCellGroupLeader && (
              <div style={styles.field}>
                <label style={styles.label}>Leads Cell Group</label>
                <select
                  name="leads_cell_group_id"
                  value={form.leads_cell_group_id}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">— None —</option>
                  {cellGroups.map(cg => (
                    <option key={cg.id} value={cg.id}>
                      {cg.name}{cg.area ? ` (${cg.area})` : ''}
                    </option>
                  ))}
                </select>
                <p style={styles.hint}>The cell group this user is responsible for leading.</p>
              </div>
            )}

            {isGroupLeader && (
              <div style={styles.field}>
                <label style={styles.label}>Leads Group</label>
                <select
                  name="leads_group_id"
                  value={form.leads_group_id}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">— None —</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p style={styles.hint}>The group this user is responsible for leading.</p>
              </div>
            )}

            {isMinistryLeader && (
              <div style={styles.field}>
                <label style={styles.label}>Leads Ministry</label>
                <select
                  name="leads_ministry_id"
                  value={form.leads_ministry_id}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">— Select Ministry —</option>
                  {ministries.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p style={styles.hint}>The ministry this user leads.</p>
              </div>
            )}
          </div>
        )}

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
