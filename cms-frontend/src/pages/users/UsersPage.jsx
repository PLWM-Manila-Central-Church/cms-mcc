import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

const ROLE_COLORS = {
  'System Admin':      { bg: '#fef2f2', color: '#dc2626' },
  'Pastor':            { bg: '#f5f3ff', color: '#7c3aed' },
  'Registration Team': { bg: '#e8f4fd', color: '#0066b3' },
  'Finance Team':      { bg: '#f0fdf4', color: '#16a34a' },
  'Cell Group Leader': { bg: '#fffbeb', color: '#d97706' },
  'Group Leader':      { bg: '#ecfeff', color: '#0891b2' },
  'Ministry Leader':   { bg: '#fdf4ff', color: '#c026d3' },
  'Member':            { bg: '#f8fafc', color: '#64748b' },
};

export default function UsersPage() {
  const navigate = useNavigate();
  const { hasPermission, user: currentUser } = useAuth();
  const isMobile = useIsMobile();

  const [users, setUsers]             = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]   = useState('');

  // Bulk delete
  const [selected, setSelected]         = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/users');
      setUsers(res.data.data);
      setFiltered(res.data.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.role?.role_name?.toLowerCase().includes(q) ||
      (u.member && `${u.member.first_name} ${u.member.last_name}`.toLowerCase().includes(q))
    ));
  }, [users, search]);

  const toggleSelect  = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll     = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(u => u.id)));
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected user${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => axiosInstance.delete(`/users/${id}`)));
      setSelected(new Set());
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Some deletes failed.');
    } finally { setBulkDeleting(false); }
  };

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
          <p style={styles.pageSubtitle}>{filtered.length} of {users.length} users</p>
        </div>
        {hasPermission('users', 'create') && (
          <button onClick={() => navigate('/users/new')} style={styles.addBtn}>
            + Add User
          </button>
        )}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Search bar */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email, role, or name…"
          style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 9, outline: 'none', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = '#0066b3'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Clear
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, marginBottom:12 }}>
          <span style={{ fontSize:13, color:'#dc2626', fontWeight:600 }}>{selected.size} user{selected.size > 1 ? 's' : ''} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'6px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:bulkDeleting ? 0.6 : 1 }}>
            {bulkDeleting ? 'Deleting…' : '🗑 Delete Selected'}
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 12px', fontSize:13, color:'#94a3b8', cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
        </div>
      )}

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {loading ? (
            <div style={styles.centerCell}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={styles.centerCell}>{search ? 'No users match your search.' : 'No users found.'}</div>
          ) : filtered.map((u, i) => {
            const rc = ROLE_COLORS[u.role?.role_name] || ROLE_COLORS['Member'];
            return (
              <div key={u.id} style={{ background: selected.has(u.id) ? '#fef2f2' : '#fff', borderBottom: '1px solid #f1f5f9', padding: '14px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} style={{ marginTop: 4, cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#005599,#13B5EA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{u.email[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>ID #{u.id}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: rc.bg, color: rc.color }}>{u.role?.role_name || '—'}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: u.is_active ? '#dcfce7' : '#f3f4f6', color: u.is_active ? '#16a34a' : '#6b7280' }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  {u.member && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>👤 {u.member.first_name} {u.member.last_name}</div>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {hasPermission('users', 'update') && (
                      <button onClick={() => navigate(`/users/${u.id}/edit`)} style={{ background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    )}
                    {hasPermission('users', 'update') && (
                      <button onClick={() => handleToggleActive(u)} disabled={actionLoading === u.id}
                        style={{ border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: u.is_active ? '#fef2f2' : '#f0fdf4', color: u.is_active ? '#dc2626' : '#16a34a', opacity: actionLoading === u.id ? 0.6 : 1 }}>
                        {actionLoading === u.id ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {hasPermission('users', 'delete') && u.id !== currentUser?.id && (
                      <button onClick={() => { setDeleteTarget(u); setDeleteError(''); }} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div style={styles.tableWrap}>
        <div style={styles.tableScroll}><table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={{ ...styles.th, width:36 }}>
                <input type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  style={{ cursor:'pointer', width:15, height:15 }} />
              </th>
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
              <tr><td colSpan={7} style={styles.centerCell}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={styles.centerCell}>{search ? 'No users match your search.' : 'No users found.'}</td></tr>
            ) : filtered.map((u, i) => (
              <tr
                key={u.id}
                style={{ ...styles.row, background: selected.has(u.id) ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#f8fafc' }}
                onMouseEnter={e => e.currentTarget.style.background = selected.has(u.id) ? '#fee2e2' : '#e8f4fd'}
                onMouseLeave={e => e.currentTarget.style.background = selected.has(u.id) ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#f8fafc'}
              >
                <td style={{ ...styles.td, width:36 }} onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)}
                    style={{ cursor:'pointer', width:15, height:15 }} />
                </td>
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
        </table></div>
      </div>
      )}

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
  page:        { fontFamily: "'Inter', sans-serif" },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  pageTitle:   { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  pageSubtitle:{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  addBtn:      { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px' },
  tableWrap:   { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  tableScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
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
