import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const ROLE_COLORS = {
  'System Admin':      { bg: '#fef2f2', color: '#dc2626' },
  'Pastor':            { bg: '#f5f3ff', color: '#7c3aed' },
  'Registration Team': { bg: '#e8f4fd', color: '#0066b3' },
  'Finance Team':      { bg: '#f0fdf4', color: '#16a34a' },
  'Cell Group Leader': { bg: '#fffbeb', color: '#d97706' },
  'Group Leader':      { bg: '#ecfeff', color: '#0891b2' },
  'Member':            { bg: '#f8fafc', color: '#64748b' },
};

export default function UsersPage() {
  const navigate = useNavigate();
  const { hasPermission, user: currentUser } = useAuth();

  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/users');
      setUsers(res.data.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleActive = async (user) => {
    setActionLoading(user.id);
    try {
      const endpoint = user.is_active
        ? `/users/${user.id}/deactivate`
        : `/users/${user.id}/activate`;
      await axiosInstance.put(endpoint);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await axiosInstance.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Users</h1>
          <p style={styles.pageSubtitle}>{users.length} total users</p>
        </div>
        {hasPermission('users', 'create') && (
          <button onClick={() => navigate('/users/new')} style={styles.addBtn}>
            + Add User
          </button>
        )}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Linked Member</th>
              <th style={styles.th}>Last Login</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={styles.centerCell}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={styles.centerCell}>No users found.</td></tr>
            ) : users.map((u, i) => (
              <tr
                key={u.id}
                style={{ ...styles.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e8f4fd'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}
              >
                <td style={styles.td}>
                  <div style={styles.userCell}>
                    <div style={styles.avatar}>{u.email[0].toUpperCase()}</div>
                    <div>
                      <div style={styles.email}>{u.email}</div>
                      <div style={styles.userId}>ID #{u.id}</div>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    background: ROLE_COLORS[u.role?.role_name]?.bg || '#f8fafc',
                    color:      ROLE_COLORS[u.role?.role_name]?.color || '#64748b',
                  }}>
                    {u.role?.role_name || '—'}
                  </span>
                </td>
                <td style={styles.td}>
                  {u.member
                    ? `${u.member.first_name} ${u.member.last_name}`
                    : <span style={styles.noMember}>No member linked</span>
                  }
                </td>
                <td style={styles.td}>
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })
                    : '—'
                  }
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    background: u.is_active ? '#dcfce7' : '#f3f4f6',
                    color:      u.is_active ? '#16a34a' : '#6b7280',
                  }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    {hasPermission('users', 'update') && (
                      <button
                        onClick={() => navigate(`/users/${u.id}/edit`)}
                        style={styles.editBtn}
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission('users', 'update') && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={actionLoading === u.id}
                        style={{
                          ...styles.toggleBtn,
                          background: u.is_active ? '#fef2f2' : '#f0fdf4',
                          color:      u.is_active ? '#dc2626' : '#16a34a',
                          opacity:    actionLoading === u.id ? 0.6 : 1,
                        }}
                      >
                        {actionLoading === u.id
                          ? '...'
                          : u.is_active ? 'Deactivate' : 'Activate'
                        }
                      </button>
                    )}
                    {hasPermission('users', 'delete') && u.id !== currentUser?.id && (
                      <button
                        onClick={() => { setDeleteTarget(u); setDeleteError(''); }}
                        style={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>🗑️</div>
            <h3 style={styles.modalTitle}>Permanently Delete User?</h3>
            <p style={styles.modalBody}>
              You are about to permanently delete{' '}
              <strong>{deleteTarget.email}</strong>. This action cannot be undone.
              Their audit log history will be preserved.
            </p>
            {deleteError && <div style={styles.errorBox}>{deleteError}</div>}
            <div style={styles.modalActions}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{ ...styles.confirmDeleteBtn, opacity: deleteLoading ? 0.7 : 1 }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:        { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  pageTitle:   { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  pageSubtitle:{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  addBtn:      { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px' },
  tableWrap:   { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  thead:       { background: '#f8fafc' },
  th:          { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' },
  row:         { transition: 'background 0.15s' },
  td:          { padding: '14px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  centerCell:  { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  userCell:    { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar:      { width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  email:       { fontWeight: '600', color: '#0f172a', fontSize: '14px' },
  userId:      { fontSize: '12px', color: '#94a3b8' },
  noMember:    { color: '#94a3b8', fontStyle: 'italic' },
  badge:       { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  actions:     { display: 'flex', gap: '6px' },
  editBtn:     { background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  toggleBtn:   { border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn:   { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  // Modal
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: '#fff', borderRadius: '16px', padding: '36px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' },
  modalIcon:   { fontSize: '40px', marginBottom: '12px' },
  modalTitle:  { fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px' },
  modalBody:   { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' },
  modalActions:{ display: 'flex', gap: '12px', justifyContent: 'center' },
  cancelBtn:   { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  confirmDeleteBtn: { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
};
