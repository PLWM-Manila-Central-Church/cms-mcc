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

const EMPTY_FORM = {
  email: '', password: '', role_id: '',
  // Member fields
  first_name: '', last_name: '',
  phone: '', gender: '',
  birthdate: '', spiritual_birthday: '',
  address: '',
  cell_group_id: '', group_id: '',
  // Leader fields
  leads_cell_group_id: '', leads_group_id: '', leads_ministry_id: '',
};

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form,       setForm]       = useState(EMPTY_FORM);
  const [roles,      setRoles]      = useState([]);
  const [cellGroups, setCellGroups] = useState([]);
  const [groups,     setGroups]     = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isCellGroupLeader = parseInt(form.role_id) === 5;
  const isGroupLeader = parseInt(form.role_id) === 6;
  const isMinistryLeader = parseInt(form.role_id) === 8;
  const showLeaderSection = isCellGroupLeader || isGroupLeader || isMinistryLeader;

  // Fetch roles, cell groups and groups for dropdowns
  useEffect(() => {
    axiosInstance.get('/roles/list')
      .then(res => setRoles(res.data.data || []))
      .catch(() => {});

    axiosInstance.get('/members/dropdowns/cell-groups')
      .then(res => setCellGroups(res.data.data || []))
      .catch(() => {});

    axiosInstance.get('/members/dropdowns/groups')
      .then(res => setGroups(res.data.data || []))
      .catch(() => {});

    axiosInstance.get('/ministry/roles')
      .then(res => setMinistries(res.data.data || []))
      .catch(() => {});
  }, []);

  // Load existing user data when editing
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    axiosInstance.get(`/users/${id}`)
      .then(res => {
        const u = res.data.data;
        setForm({
          email:              u.email               || '',
          password:           '',
          role_id:            u.role_id             || '',
          first_name:         u.member?.first_name  || '',
          last_name:          u.member?.last_name   || '',
          phone:              u.member?.phone       || '',
          gender:             u.member?.gender      || '',
          birthdate:          u.member?.birthdate   || '',
          spiritual_birthday: u.member?.spiritual_birthday || '',
          address:            u.member?.address     || '',
          cell_group_id:      u.member?.cell_group_id || '',
          group_id:           u.member?.group_id   || '',
          leads_cell_group_id: u.leads_cell_group_id || '',
          leads_group_id:      u.leads_group_id      || '',
          leads_ministry_id:   u.leads_ministry_id   || '',
        });
      })
      .catch(() => setError('Failed to load user.'))
      .finally(() => setLoading(false));
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
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      email:              form.email,
      role_id:            parseInt(form.role_id),
      first_name:         form.first_name.trim(),
      last_name:          form.last_name.trim(),
      phone:              form.phone              || null,
      gender:             form.gender             || null,
      birthdate:          form.birthdate          || null,
      spiritual_birthday: form.spiritual_birthday || null,
      address:            form.address            || null,
      cell_group_id:      form.cell_group_id      ? parseInt(form.cell_group_id) : null,
      group_id:           form.group_id           ? parseInt(form.group_id)      : null,
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
      if (isEdit) { await axiosInstance.put(`/users/${id}`, payload); }
      else        { await axiosInstance.post('/users', payload); }
      navigate('/users');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    padding: '10px 14px', fontSize: '14px',
    border: '1.5px solid #e2e8f0', borderRadius: '8px',
    outline: 'none', color: '#0f172a',
    width: '100%', boxSizing: 'border-box',
    background: '#fff', transition: 'border-color 0.2s',
    minHeight: 42,
  };
  const selectStyle = { ...inputStyle, background: '#fff', cursor: 'pointer' };
  const onFocus = e => e.target.style.borderColor = '#0066b3';
  const onBlur  = e => e.target.style.borderColor = '#e2e8f0';

  if (loading) return <div style={S.loading}>Loading...</div>;

  return (
    <div style={S.page}>
      <button onClick={() => navigate('/users')} style={S.backBtn}>← Back to Users</button>
      <h1 style={S.title}>{isEdit ? 'Edit User' : 'Add New User'}</h1>
      <p style={S.subtitle}>
        {isEdit
          ? 'Update user account details, role, and member profile.'
          : 'New users must change their password on first login. Fill in as much member info as possible.'}
      </p>

      {error && <div style={S.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={S.form}>

        {/* ── Account Details ── */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Account Details</h2>

          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>First Name *</label>
              <input
                type="text" name="first_name" value={form.first_name}
                onChange={handleChange} required style={inputStyle}
                placeholder="Juan" onFocus={onFocus} onBlur={onBlur}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Last Name *</label>
              <input
                type="text" name="last_name" value={form.last_name}
                onChange={handleChange} required style={inputStyle}
                placeholder="dela Cruz" onFocus={onFocus} onBlur={onBlur}
              />
            </div>
          </div>

          <div style={{ ...S.field, marginTop: 16 }}>
            <label style={S.label}>Email Address *</label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} required style={inputStyle}
              placeholder="user@plwmmcc.com" onFocus={onFocus} onBlur={onBlur}
            />
          </div>

          {!isEdit && (
            <div style={{ ...S.field, marginTop: 16 }}>
              <label style={S.label}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange} required
                  style={{ ...inputStyle, paddingRight: 44 }}
                  placeholder="Min. 8 characters" onFocus={onFocus} onBlur={onBlur}
                />
                <button
                  type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2 }}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <p style={S.hint}>User must change this on first login.</p>
            </div>
          )}

          <div style={{ ...S.field, marginTop: 16 }}>
            <label style={S.label}>Role *</label>
            <select name="role_id" value={form.role_id} onChange={handleChange} required style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
              <option value="">— Select Role —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
            </select>
            {roles.length === 0 && <p style={{ ...S.hint, color: '#d97706' }}>Loading roles…</p>}
          </div>
        </div>

        {/* ── Member Profile ── */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Member Profile</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0' }}>
            This information appears in the member's personal portal.
          </p>

          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Phone / Contact No</label>
              <input
                type="tel" name="phone" value={form.phone}
                onChange={handleChange} style={inputStyle}
                placeholder="+63 9XX XXX XXXX" onFocus={onFocus} onBlur={onBlur}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div style={{ ...S.row, marginTop: 16 }}>
            <div style={S.field}>
              <label style={S.label}>Birthdate (Flesh Birthday)</label>
              <input
                type="date" name="birthdate" value={form.birthdate}
                onChange={handleChange} style={inputStyle}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Spiritual Birthday</label>
              <input
                type="date" name="spiritual_birthday" value={form.spiritual_birthday}
                onChange={handleChange} style={inputStyle}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>
          </div>

          <div style={{ ...S.row, marginTop: 16 }}>
            <div style={S.field}>
              <label style={S.label}>Cell Group</label>
              <select name="cell_group_id" value={form.cell_group_id} onChange={handleChange} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— None —</option>
                {cellGroups.map(cg => (
                  <option key={cg.id} value={cg.id}>
                    {cg.name}{cg.area ? ` (${cg.area})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Group</label>
              <select name="group_id" value={form.group_id} onChange={handleChange} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— None —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ ...S.field, marginTop: 16 }}>
            <label style={S.label}>Address</label>
            <textarea
              name="address" value={form.address}
              onChange={handleChange} rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              placeholder="Full home address"
              onFocus={onFocus} onBlur={onBlur}
            />
          </div>
        </div>

        {showLeaderSection && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>Leader Assignment</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0' }}>
              Assign which cell group, group, or ministry this user leads.
            </p>

            {isCellGroupLeader && (
              <div style={S.field}>
                <label style={S.label}>Leads Cell Group</label>
                <select name="leads_cell_group_id" value={form.leads_cell_group_id} onChange={handleChange} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">— None —</option>
                  {cellGroups.map(cg => (
                    <option key={cg.id} value={cg.id}>{cg.name}{cg.area ? ` (${cg.area})` : ''}</option>
                  ))}
                </select>
                <p style={S.hint}>The cell group this user is responsible for leading.</p>
              </div>
            )}

            {isGroupLeader && (
              <div style={S.field}>
                <label style={S.label}>Leads Group</label>
                <select name="leads_group_id" value={form.leads_group_id} onChange={handleChange} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">— None —</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p style={S.hint}>The group this user is responsible for leading.</p>
              </div>
            )}

            {isMinistryLeader && (
              <div style={S.field}>
                <label style={S.label}>Leads Ministry</label>
                <select name="leads_ministry_id" value={form.leads_ministry_id} onChange={handleChange} style={selectStyle} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">— Select Ministry —</option>
                  {ministries.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p style={S.hint}>The ministry this user leads.</p>
              </div>
            )}
          </div>
        )}

        <div style={S.actions}>
          <button type="button" onClick={() => navigate('/users')} style={S.cancelBtn}>Cancel</button>
          <button
            type="submit" disabled={saving}
            style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}

const S = {
  page:      { fontFamily: "'Segoe UI',sans-serif", maxWidth: 760, margin: '0 auto' },
  loading:   { padding: '48px', textAlign: 'center', color: '#94a3b8' },
  backBtn:   { background: 'none', border: 'none', color: '#0066b3', fontSize: '14px', cursor: 'pointer', padding: '0 0 8px 0', fontWeight: '500', display: 'block' },
  title:     { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle:  { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  errorBox:  { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px' },
  form:      { display: 'flex', flexDirection: 'column', gap: '24px' },
  card:      { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: '#005599', margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' },
  row:       { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  field:     { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 160 },
  label:     { fontSize: '13px', fontWeight: '600', color: '#374151' },
  hint:      { fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' },
  actions:   { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  saveBtn:   { background: 'linear-gradient(135deg,#005599,#13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
};
