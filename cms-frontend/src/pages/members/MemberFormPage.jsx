import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function MemberFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    birthdate: '', spiritual_birthday: '', address: '',
    gender: '', status: 'Active',
    cell_group_id: '', group_id: '', referred_by: '',
  });

  const [cellGroups, setCellGroups] = useState([]);
  const [groups, setGroups]         = useState([]);
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [cgRes, grRes, memRes] = await Promise.all([
          axiosInstance.get('/members/dropdowns/cell-groups'),
          axiosInstance.get('/members/dropdowns/groups'),
          axiosInstance.get('/members?limit=500&page=1'),
        ]);
        setCellGroups(cgRes.data.data || []);
        setGroups(grRes.data.data || []);
        setMembers(memRes.data.data.members || []);
      } catch {}
    };
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const loadMember = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/members/${id}`);
        const m   = res.data.data;
        setForm({
          first_name:         m.first_name         || '',
          last_name:          m.last_name          || '',
          email:              m.email              || '',
          phone:              m.phone              || '',
          birthdate:          m.birthdate          || '',
          spiritual_birthday: m.spiritual_birthday || '',
          address:            m.address            || '',
          gender:             m.gender             || '',
          status:             m.status             || 'Active',
          cell_group_id:      m.cell_group_id      || '',
          group_id:           m.group_id           || '',
          referred_by:        m.referred_by        || '',
        });
      } catch {
        setError('Failed to load member.');
      } finally {
        setLoading(false);
      }
    };
    loadMember();
  }, [id, isEdit]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
    );

    try {
      if (isEdit) {
        await axiosInstance.put(`/members/${id}`, payload);
        navigate(`/members/${id}`);
      } else {
        const res = await axiosInstance.post('/members', payload);
        navigate(`/members/${res.data.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save member.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/members')} style={styles.backBtn}>
          ← Back to Members
        </button>
        <h1 style={styles.title}>{isEdit ? 'Edit Member' : 'Add New Member'}</h1>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>

        {/* Personal Info */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Personal Information</h2>
          <div style={styles.grid2}>
            <Field label="First Name *" name="first_name" value={form.first_name} onChange={handleChange} required />
            <Field label="Last Name *"  name="last_name"  value={form.last_name}  onChange={handleChange} required />
            <Field label="Email"        name="email"      value={form.email}       onChange={handleChange} type="email" />
            <Field label="Phone"        name="phone"      value={form.phone}       onChange={handleChange} />
            <Field label="Birthdate"    name="birthdate"  value={form.birthdate}   onChange={handleChange} type="date" />
            <Field label="Spiritual Birthday" name="spiritual_birthday" value={form.spiritual_birthday} onChange={handleChange} type="date" />
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={styles.label}>Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={3}
              style={styles.textarea}
              placeholder="Full address"
            />
          </div>
        </div>

        {/* Classification */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Classification</h2>
          <div style={styles.grid2}>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} style={styles.select}>
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} style={styles.select}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Visitor">Visitor</option>
              </select>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Cell Group</label>
              <select name="cell_group_id" value={form.cell_group_id} onChange={handleChange} style={styles.select}>
                <option value="">— Select —</option>
                {cellGroups.map(cg => (
                  <option key={cg.id} value={cg.id}>{cg.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Group</label>
              <select name="group_id" value={form.group_id} onChange={handleChange} style={styles.select}>
                <option value="">— Select —</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Referred By</label>
              <select name="referred_by" value={form.referred_by} onChange={handleChange} style={styles.select}>
                <option value="">— None —</option>
                {members
                  .filter(m => String(m.id) !== String(id))
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.last_name}, {m.first_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.formActions}>
          <button type="button" onClick={() => navigate('/members')} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isEdit ? 'Update Member' : 'Create Member'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required }) {
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={styles.input}
        onFocus={e => e.target.style.borderColor = '#0066b3'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />
      <style>{`
        @media (max-width: 768px) {
          [style*="gridTemplateColumns: '1fr 1fr'"],
          [style*="grid-template-columns: '1fr 1fr'"] { grid-template-columns: 1fr !important; }
          [style*="padding: '32px'"] { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page:    { fontFamily: "'Segoe UI', sans-serif", maxWidth: '860px' },
  loading: { padding: '48px', textAlign: 'center', color: '#94a3b8' },
  header:  { marginBottom: '24px' },
  backBtn: {
    background: 'none', border: 'none', color: '#0066b3',
    fontSize: '14px', cursor: 'pointer', padding: '0 0 8px 0', fontWeight: '500'
  },
  title:   { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
    borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px'
  },
  form:    { display: 'flex', flexDirection: 'column', gap: '24px' },
  section: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
  },
  sectionTitle: {
    fontSize: '15px', fontWeight: '700', color: '#005599',
    margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9'
  },
  grid2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  fieldWrap:{ display: 'flex', flexDirection: 'column', gap: '6px' },
  label:    { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: {
    padding: '10px 14px', fontSize: '14px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s',
    color: '#0f172a', width: '100%', boxSizing: 'border-box'
  },
  textarea: {
    padding: '10px 14px', fontSize: '14px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', outline: 'none', width: '100%',
    boxSizing: 'border-box', resize: 'vertical', color: '#0f172a'
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