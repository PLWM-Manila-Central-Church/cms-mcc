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

  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', role_id: '' });
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    axiosInstance.get('/roles/list')
      .then(res => setRoles(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    axiosInstance.get(`/users/${id}`)
      .then(res => {
        const u = res.data.data;
        setForm({ email: u.email || '', password: '', first_name: u.member?.first_name || '', last_name: u.member?.last_name || '', role_id: u.role_id || '' });
      })
      .catch(() => setError('Failed to load user.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('First and last name are required.'); return; }
    setSaving(true); setError('');
    const payload = { email: form.email, role_id: parseInt(form.role_id), first_name: form.first_name.trim(), last_name: form.last_name.trim() };
    if (!isEdit) payload.password = form.password;
    try {
      if (isEdit) { await axiosInstance.put(`/users/${id}`, payload); }
      else        { await axiosInstance.post('/users', payload); }
      navigate('/users');
    } catch (err) { setError(err.response?.data?.message || 'Failed to save user.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={S.loading}>Loading...</div>;

  return (
    <div style={S.page}>
      <button onClick={() => navigate('/users')} style={S.backBtn}>← Back to Users</button>
      <h1 style={S.title}>{isEdit ? 'Edit User' : 'Add New User'}</h1>
      <p style={S.subtitle}>{isEdit ? 'Update user details or role.' : 'New users must change their password and complete their profile on first login.'}</p>

      {error && <div style={S.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={S.form}>
        <div style={S.card}>
          <h2 style={S.cardTitle}>Account Details</h2>

          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>First Name *</label>
              <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required style={S.input} placeholder="Juan" onFocus={e=>e.target.style.borderColor='#0066b3'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Last Name *</label>
              <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required style={S.input} placeholder="dela Cruz" onFocus={e=>e.target.style.borderColor='#0066b3'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
            </div>
          </div>

          <div style={{...S.field, marginTop:16}}>
            <label style={S.label}>Email Address *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required style={S.input} placeholder="user@plwmmcc.com" onFocus={e=>e.target.style.borderColor='#0066b3'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
          </div>

          {!isEdit && (
            <div style={{...S.field, marginTop:16}}>
              <label style={S.label}>Password *</label>
              <div style={{position:'relative'}}>
                <input type={showPassword?'text':'password'} name="password" value={form.password} onChange={handleChange} required style={{...S.input,paddingRight:44}} placeholder="Min. 8 characters" onFocus={e=>e.target.style.borderColor='#0066b3'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
                <button type="button" onClick={()=>setShowPassword(v=>!v)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',display:'flex',alignItems:'center',padding:2}}><EyeIcon open={showPassword}/></button>
              </div>
              <p style={S.hint}>User must change this on first login.</p>
            </div>
          )}

          <div style={{...S.field, marginTop:16}}>
            <label style={S.label}>Role *</label>
            <select name="role_id" value={form.role_id} onChange={handleChange} required style={S.select}>
              <option value="">— Select Role —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
            </select>
            {roles.length === 0 && <p style={{...S.hint,color:'#d97706'}}>Loading roles…</p>}
          </div>
        </div>

        <div style={S.actions}>
          <button type="button" onClick={()=>navigate('/users')} style={S.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={{...S.saveBtn,opacity:saving?0.7:1}}>{saving?'Saving...':isEdit?'Update User':'Create User'}</button>
        </div>
      </form>
    </div>
  );
}

const S = {
  page:      { fontFamily:"'Segoe UI',sans-serif" },
  loading:   { padding:'48px',textAlign:'center',color:'#94a3b8' },
  backBtn:   { background:'none',border:'none',color:'#0066b3',fontSize:'14px',cursor:'pointer',padding:'0 0 8px 0',fontWeight:'500',display:'block' },
  title:     { fontSize:'24px',fontWeight:'700',color:'#0f172a',margin:'0 0 4px 0' },
  subtitle:  { fontSize:'14px',color:'#64748b',margin:'0 0 24px 0' },
  errorBox:  { background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:'8px',padding:'12px 16px',marginBottom:'20px',fontSize:'14px' },
  form:      { display:'flex',flexDirection:'column',gap:'24px' },
  card:      { background:'#fff',borderRadius:'12px',padding:'24px',boxShadow:'0 1px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize:'15px',fontWeight:'700',color:'#005599',margin:'0 0 20px 0',paddingBottom:'12px',borderBottom:'1px solid #f1f5f9' },
  row:       { display:'flex',gap:'16px',flexWrap:'wrap' },
  field:     { display:'flex',flexDirection:'column',gap:'6px',flex:1,minWidth:160 },
  label:     { fontSize:'13px',fontWeight:'600',color:'#374151' },
  hint:      { fontSize:'12px',color:'#94a3b8',margin:'4px 0 0 0' },
  input:     { padding:'10px 14px',fontSize:'14px',border:'1.5px solid #e2e8f0',borderRadius:'8px',outline:'none',transition:'border-color 0.2s',color:'#0f172a',width:'100%',boxSizing:'border-box' },
  select:    { padding:'10px 14px',fontSize:'14px',border:'1.5px solid #e2e8f0',borderRadius:'8px',outline:'none',background:'#fff',color:'#0f172a',width:'100%',boxSizing:'border-box' },
  actions:   { display:'flex',gap:'12px',justifyContent:'flex-end' },
  cancelBtn: { background:'#f1f5f9',color:'#475569',border:'none',borderRadius:'8px',padding:'12px 24px',fontSize:'14px',fontWeight:'600',cursor:'pointer' },
  saveBtn:   { background:'linear-gradient(135deg,#005599,#13B5EA)',color:'#fff',border:'none',borderRadius:'8px',padding:'12px 24px',fontSize:'14px',fontWeight:'600',cursor:'pointer' },
};
