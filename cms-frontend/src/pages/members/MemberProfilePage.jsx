import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  Active:   { bg: '#dcfce7', color: '#16a34a' },
  Inactive: { bg: '#f3f4f6', color: '#6b7280' },
  Visitor:  { bg: '#fef9c3', color: '#ca8a04' },
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#005599,#13B5EA)',
  'linear-gradient(135deg,#0891b2,#06b6d4)',
  'linear-gradient(135deg,#1d4ed8,#3b82f6)',
  'linear-gradient(135deg,#0369a1,#0ea5e9)',
  'linear-gradient(135deg,#075985,#38bdf8)',
];
const avatarGradient = (name) =>
  AVATAR_GRADIENTS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_GRADIENTS.length];

/* ── Reusable detail row ─────────────────────────────────────── */
function DetailRow({ label, value, icon }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      {icon && <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500, wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
}

/* ── Section card ────────────────────────────────────────────── */
function SectionCard({ title, icon, children, action }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8edf2', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: '4px 20px 16px' }}>
        {children}
      </div>
    </div>
  );
}

export default function MemberProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const isMember = user?.roleName === 'Member';
  const isOwnProfile = user?.memberId === parseInt(id) || user?.id === parseInt(id);

  const [member, setMember]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [deleting, setDeleting] = useState(false);

  const [ecForm, setEcForm]         = useState({ name: '', relationship: '', phone: '' });
  const [ecSaving, setEcSaving]     = useState(false);
  const [ecError, setEcError]       = useState('');
  const [showEcForm, setShowEcForm] = useState(false);

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
    setEcSaving(true); setEcError('');
    try {
      await axiosInstance.post(`/members/${id}/emergency-contacts`, ecForm);
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
      await axiosInstance.delete(`/members/${id}/emergency-contacts/${contactId}`);
      fetchMember();
    } catch {}
  };

  if (loading) return (
    <div style={{ padding: '64px 24px', textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
      <div style={{ fontSize: 14 }}>Loading…</div>
    </div>
  );
  if (error) return <div className="cms-error-box">{error}</div>;
  if (!member) return null;

  const fullName = `${member.first_name} ${member.last_name}`;
  const initials = `${member.first_name[0]}${member.last_name[0]}`;
  const grad     = avatarGradient(member.first_name + member.last_name);

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  /* ── MEMBER VIEW ─────────────────────────────────────────────── */
  if (isMember) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <style>{`
          @media (max-width: 768px) {
            .profile-two-col { grid-template-columns: 1fr !important; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .profile-animate { animation: fadeIn 0.28s ease both; }
        `}</style>

        {/* Back nav */}
        <button
          onClick={() => navigate('/members')}
          style={{ background: 'none', border: 'none', color: '#005599', fontSize: 14, cursor: 'pointer', fontWeight: 600, padding: '0 0 20px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Directory
        </button>

        {/* Hero profile card */}
        <div className="profile-animate" style={{
          background: grad,
          borderRadius: 20,
          padding: '32px 24px 28px',
          marginBottom: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle decorative circle */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, letterSpacing: '-1px',
            border: '3px solid rgba(255,255,255,0.35)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            marginBottom: 14, flexShrink: 0, position: 'relative', zIndex: 1,
          }}>
            {initials}
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.3px', position: 'relative', zIndex: 1 }}>
            {fullName}
          </h1>

          {/* Church tags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            {member.cellGroup?.name && (
              <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                📍 {member.cellGroup.name}
              </span>
            )}
            {member.group?.name && (
              <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                👥 {member.group.name}
              </span>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="profile-animate" style={{ animationDelay: '0.06s', marginBottom: 14 }}>
          <SectionCard title="Contact" icon="📬">
            <DetailRow label="Email"   icon="✉️" value={member.email} />
            <DetailRow label="Phone"   icon="📞" value={member.phone} />
            <DetailRow label="Address" icon="🏠" value={member.address} />
          </SectionCard>
        </div>

        {/* Personal */}
        <div className="profile-animate" style={{ animationDelay: '0.10s', marginBottom: 14 }}>
          <SectionCard title="Personal" icon="🙋">
            <DetailRow label="Gender"            icon="👤" value={member.gender} />
            <DetailRow label="Birthday"          icon="🎂" value={formatDate(member.birthdate)} />
            <DetailRow label="Spiritual Birthday" icon="✝️" value={formatDate(member.spiritual_birthday)} />
            <DetailRow label="Member Since"      icon="📅" value={formatDate(member.created_at)} />
          </SectionCard>
        </div>

        {/* Emergency contacts */}
        <div className="profile-animate" style={{ animationDelay: '0.14s', marginBottom: 24 }}>
          <SectionCard
            title="Emergency Contacts"
            icon="🚨"
            action={
              hasPermission('members', 'update') && (
                <button
                  onClick={() => setShowEcForm(!showEcForm)}
                  style={{ background: showEcForm ? '#fef2f2' : '#e8f4fd', color: showEcForm ? '#dc2626' : '#005599', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {showEcForm ? 'Cancel' : '+ Add'}
                </button>
              )
            }
          >
            {showEcForm && (
              <form onSubmit={handleEcSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0', borderBottom: '1px solid #f1f5f9', marginBottom: 8 }}>
                {ecError && <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{ecError}</div>}
                {['Full Name *', 'Relationship *', 'Phone Number *'].map((ph, i) => {
                  const keys = ['name', 'relationship', 'phone'];
                  return (
                    <input key={i}
                      placeholder={ph}
                      value={ecForm[keys[i]]}
                      onChange={e => setEcForm({ ...ecForm, [keys[i]]: e.target.value })}
                      required
                      style={{ padding: '10px 12px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 10, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                  );
                })}
                <button type="submit" disabled={ecSaving}
                  style={{ background: grad, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: ecSaving ? 0.7 : 1 }}>
                  {ecSaving ? 'Saving…' : 'Save Contact'}
                </button>
              </form>
            )}

            {!(member.emergencyContacts?.length) ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No emergency contacts added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                {member.emergencyContacts.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                      {c.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{c.relationship} · {c.phone}</div>
                    </div>
                    {hasPermission('members', 'update') && (
                      <button onClick={() => handleEcDelete(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: 4, opacity: 0.7 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    );
  }

  /* ── ADMIN / STAFF VIEW ──────────────────────────────────────── */
  return (
    <div>
      <style>{`
        @media (max-width: 900px) {
          .admin-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button onClick={() => navigate('/members')} style={{ background: 'none', border: 'none', color: '#005599', fontSize: 14, cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
          ← Back to Members
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          {hasPermission('members', 'update') && (
            <button onClick={() => navigate(`/members/${id}/edit`)} style={{ background: '#eff6ff', color: '#005599', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Edit Member
            </button>
          )}
          {hasPermission('members', 'delete') && (
            <button onClick={handleDelete} disabled={deleting} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Profile hero */}
      <div style={{
        background: `linear-gradient(135deg, #003d70 0%, #005599 60%, #13B5EA 100%)`,
        borderRadius: 16, padding: '28px 32px',
        display: 'flex', alignItems: 'center', gap: 22, marginBottom: 22,
      }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, flexShrink: 0, border: '3px solid rgba(255,255,255,0.3)' }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px' }}>{fullName}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: STATUS_COLORS[member.status]?.bg, color: STATUS_COLORS[member.status]?.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {member.status}
            </span>
            {member.barcode && (
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'monospace' }}>🔖 {member.barcode}</span>
            )}
          </div>
        </div>
      </div>

      <div className="admin-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SectionCard title="Personal Details" icon="👤">
            <DetailRow label="Email"             value={member.email} />
            <DetailRow label="Phone"             value={member.phone} />
            <DetailRow label="Gender"            value={member.gender} />
            <DetailRow label="Birthdate"         value={formatDate(member.birthdate)} />
            <DetailRow label="Spiritual Birthday" value={formatDate(member.spiritual_birthday)} />
            <DetailRow label="Address"           value={member.address} />
          </SectionCard>

          <SectionCard title="Church Information" icon="⛪">
            <DetailRow label="Cell Group"   value={member.cellGroup?.name} />
            <DetailRow label="Group"        value={member.group?.name} />
            <DetailRow label="Referred By"  value={member.referredByMember ? `${member.referredByMember.first_name} ${member.referredByMember.last_name}` : null} />
            <DetailRow label="Member Since" value={formatDate(member.created_at)} />
          </SectionCard>
        </div>

        {/* Right — Emergency contacts */}
        <div>
          <SectionCard
            title="Emergency Contacts"
            icon="🚨"
            action={
              hasPermission('members', 'update') && (
                <button onClick={() => setShowEcForm(!showEcForm)}
                  style={{ background: showEcForm ? '#fef2f2' : '#eff6ff', color: showEcForm ? '#dc2626' : '#005599', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {showEcForm ? 'Cancel' : '+ Add'}
                </button>
              )
            }
          >
            {showEcForm && (
              <form onSubmit={handleEcSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0 12px', borderBottom: '1px solid #f1f5f9', marginBottom: 8 }}>
                {ecError && <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>{ecError}</div>}
                {['Full Name *', 'Relationship *', 'Phone Number *'].map((ph, i) => {
                  const keys = ['name', 'relationship', 'phone'];
                  return (
                    <input key={i}
                      placeholder={ph}
                      value={ecForm[keys[i]]}
                      onChange={e => setEcForm({ ...ecForm, [keys[i]]: e.target.value })}
                      required
                      style={{ padding: '9px 12px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                  );
                })}
                <button type="submit" disabled={ecSaving}
                  style={{ background: 'linear-gradient(135deg,#005599,#13B5EA)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: ecSaving ? 0.7 : 1 }}>
                  {ecSaving ? 'Saving…' : 'Save Contact'}
                </button>
              </form>
            )}

            {!(member.emergencyContacts?.length) ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No emergency contacts added.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                {member.emergencyContacts.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {c.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{c.relationship} · {c.phone}</div>
                    </div>
                    {hasPermission('members', 'update') && (
                      <button onClick={() => handleEcDelete(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
