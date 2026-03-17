import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  Active:   { bg: '#dcfce7', color: '#16a34a' },
  Inactive: { bg: '#f3f4f6', color: '#6b7280' },
  Visitor:  { bg: '#fef9c3', color: '#ca8a04' },
};

export default function MemberProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [member, setMember]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [deleting, setDeleting] = useState(false);

  // Emergency contact form
  const [ecForm, setEcForm]     = useState({ name: '', relationship: '', phone: '' });
  const [ecSaving, setEcSaving] = useState(false);
  const [ecError, setEcError]   = useState('');
  const [showEcForm, setShowEcForm] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchMember = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/members/${id}`);
      setMember(res.data.data);
    } catch {
      setError('Failed to load member.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMember(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/members/${id}`);
      navigate('/members');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete member.');
      setDeleting(false);
    }
  };

  const handleEcSubmit = async (e) => {
    e.preventDefault();
    setEcSaving(true);
    setEcError('');
    try {
      await axiosInstance.post(`/members/emergency-contacts/${id}`, ecForm);
      setEcForm({ name: '', relationship: '', phone: '' });
      setShowEcForm(false);
      fetchMember();
    } catch (err) {
      setEcError(err.response?.data?.message || 'Failed to add contact.');
    } finally {
      setEcSaving(false);
    }
  };

  const handleEcDelete = async (contactId) => {
    if (!window.confirm('Remove this emergency contact?')) return;
    try {
      await axiosInstance.delete(`/members/emergency-contacts/${contactId}`);
      fetchMember();
    } catch {}
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (error)   return <div style={styles.errorBox}>{error}</div>;
  if (!member) return null;

  const fullName = `${member.first_name} ${member.last_name}`;
  const initials = `${member.first_name[0]}${member.last_name[0]}`;

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <button onClick={() => navigate('/members')} style={styles.backBtn}>
          ← Back to Members
        </button>
        <div style={styles.topActions}>
          {hasPermission('members', 'update') && (
            <button onClick={() => navigate(`/members/${id}/edit`)} style={styles.editBtn}>
              Edit Member
            </button>
          )}
          {hasPermission('members', 'delete') && (
            <button onClick={handleDelete} disabled={deleting} style={styles.deleteBtn}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <div style={styles.profileCard}>
        <div style={styles.avatarLg}>{initials}</div>
        <div style={styles.profileInfo}>
          <h1 style={styles.profileName}>{fullName}</h1>
          <div style={styles.profileMeta}>
            <span style={{
              ...styles.badge,
              background: STATUS_COLORS[member.status]?.bg,
              color:      STATUS_COLORS[member.status]?.color,
            }}>
              {member.status}
            </span>
            {member.barcode && (
              <span style={styles.barcode}>🔖 {member.barcode}</span>
            )}
          </div>
        </div>
      </div>

      <div style={styles.twoCol}>
        {/* Left Column */}
        <div style={styles.colLeft}>

          {/* Personal Details */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Personal Details</h2>
            <div style={styles.detailGrid}>
              <DetailRow label="Email"    value={member.email} />
              <DetailRow label="Phone"    value={member.phone} />
              <DetailRow label="Gender"   value={member.gender} />
              <DetailRow label="Birthdate" value={member.birthdate} />
              <DetailRow label="Spiritual Birthday" value={member.spiritual_birthday} />
              <DetailRow label="Address"  value={member.address} />
            </div>
          </div>

          {/* Church Info */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Church Information</h2>
            <div style={styles.detailGrid}>
              <DetailRow label="Cell Group"  value={member.cellGroup?.name} />
              <DetailRow label="Group"       value={member.group?.name} />
              <DetailRow label="Referred By" value={
                member.referredByMember
                  ? `${member.referredByMember.first_name} ${member.referredByMember.last_name}`
                  : null
              } />
              <DetailRow label="Member Since" value={
                new Date(member.created_at).toLocaleDateString('en-PH', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })
              } />
            </div>
          </div>
        </div>

        {/* Right Column — Emergency Contacts */}
        <div style={styles.colRight}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Emergency Contacts</h2>
              {hasPermission('members', 'update') && (
                <button
                  onClick={() => setShowEcForm(!showEcForm)}
                  style={styles.addEcBtn}
                >
                  {showEcForm ? 'Cancel' : '+ Add'}
                </button>
              )}
            </div>

            {/* Add Emergency Contact Form */}
            {showEcForm && (
              <form onSubmit={handleEcSubmit} style={styles.ecForm}>
                {ecError && <div style={styles.ecError}>{ecError}</div>}
                <input
                  placeholder="Full Name *"
                  value={ecForm.name}
                  onChange={e => setEcForm({ ...ecForm, name: e.target.value })}
                  required
                  style={styles.ecInput}
                />
                <input
                  placeholder="Relationship *"
                  value={ecForm.relationship}
                  onChange={e => setEcForm({ ...ecForm, relationship: e.target.value })}
                  required
                  style={styles.ecInput}
                />
                <input
                  placeholder="Phone Number *"
                  value={ecForm.phone}
                  onChange={e => setEcForm({ ...ecForm, phone: e.target.value })}
                  required
                  style={styles.ecInput}
                />
                <button
                  type="submit"
                  disabled={ecSaving}
                  style={{ ...styles.ecSaveBtn, opacity: ecSaving ? 0.7 : 1 }}
                >
                  {ecSaving ? 'Saving...' : 'Save Contact'}
                </button>
              </form>
            )}

            {/* Contacts List */}
            {!(member.emergencyContacts?.length) ? (
              <p style={styles.emptyText}>No emergency contacts added.</p>
            ) : (
              <div style={styles.ecList}>
                {(member.emergencyContacts || []).map(c => (
                  <div key={c.id} style={styles.ecItem}>
                    <div style={styles.ecAvatar}>
                      {c.name[0]}
                    </div>
                    <div style={styles.ecInfo}>
                      <div style={styles.ecName}>{c.name}</div>
                      <div style={styles.ecMeta}>{c.relationship} · {c.phone}</div>
                    </div>
                    {hasPermission('members', 'update') && (
                      <button
                        onClick={() => handleEcDelete(c.id)}
                        style={styles.ecDeleteBtn}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value || '—'}</span>
      <style>{`
        @media (max-width: 768px) {
          [style*="gridTemplateColumns: '1fr 1fr'"],
          [style*="grid-template-columns: '1fr 1fr'"],
          [style*="twoCol"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page:    { fontFamily: "'Segoe UI', sans-serif" },
  loading: { padding: '48px', textAlign: 'center', color: '#94a3b8' },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#dc2626', borderRadius: '8px', padding: '16px'
  },
  topBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '24px'
  },
  backBtn: {
    background: 'none', border: 'none', color: '#005599',
    fontSize: '14px', cursor: 'pointer', fontWeight: '500', padding: 0
  },
  topActions: { display: 'flex', gap: '10px' },
  editBtn: {
    background: '#eff6ff', color: '#005599', border: 'none',
    borderRadius: '8px', padding: '8px 18px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer'
  },
  deleteBtn: {
    background: '#fef2f2', color: '#dc2626', border: 'none',
    borderRadius: '8px', padding: '8px 18px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer'
  },
  profileCard: {
    background: 'linear-gradient(135deg, #003d70 0%, #005599 60%, #13B5EA 100%)',
    borderRadius: '16px', padding: '32px', display: 'flex',
    alignItems: 'center', gap: '24px', marginBottom: '24px'
  },
  avatarLg: {
    width: '72px', height: '72px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '24px', fontWeight: '800', flexShrink: 0,
    border: '3px solid rgba(255,255,255,0.3)'
  },
  profileInfo:  {},
  profileName:  { fontSize: '26px', fontWeight: '800', color: '#fff', margin: '0 0 8px 0' },
  profileMeta:  { display: 'flex', gap: '12px', alignItems: 'center' },
  badge: {
    padding: '4px 12px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '700'
  },
  barcode: { color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontFamily: 'monospace' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  colLeft:  { display: 'flex', flexDirection: 'column', gap: '20px' },
  colRight: {},
  card: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '16px'
  },
  cardTitle: {
    fontSize: '15px', fontWeight: '700', color: '#005599',
    margin: '0 0 16px 0'
  },
  detailGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  detailRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailLabel:{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', flexShrink: 0, marginRight: '16px' },
  detailValue:{ fontSize: '14px', color: '#0f172a', fontWeight: '500', textAlign: 'right' },
  addEcBtn: {
    background: '#eff6ff', color: '#005599', border: 'none',
    borderRadius: '6px', padding: '5px 12px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer', marginBottom: '0'
  },
  ecForm: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' },
  ecError: {
    background: '#fef2f2', color: '#dc2626', borderRadius: '6px',
    padding: '8px 12px', fontSize: '13px'
  },
  ecInput: {
    padding: '9px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box'
  },
  ecSaveBtn: {
    background: 'linear-gradient(135deg, #005599, #13B5EA)',
    color: '#fff', border: 'none', borderRadius: '8px',
    padding: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
  },
  emptyText: { color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '24px 0' },
  ecList:    { display: 'flex', flexDirection: 'column', gap: '10px' },
  ecItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px', background: '#f8fafc', borderRadius: '8px'
  },
  ecAvatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: '700', flexShrink: 0
  },
  ecInfo:     { flex: 1 },
  ecName:     { fontSize: '14px', fontWeight: '600', color: '#0f172a' },
  ecMeta:     { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  ecDeleteBtn:{
    background: 'none', border: 'none', color: '#dc2626',
    cursor: 'pointer', fontSize: '14px', padding: '4px'
  },
};