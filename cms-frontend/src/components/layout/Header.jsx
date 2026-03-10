import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ sidebarWidth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColors = {
    'System Admin':      '#dc2626',
    'Pastor':            '#7c3aed',
    'Registration Team': '#2563eb',
    'Finance Team':      '#059669',
    'Cell Group Leader': '#d97706',
    'Group Leader':      '#0891b2',
    'Member':            '#64748b'
  };

  const roleColor = roleColors[user?.roleName] || '#64748b';

  return (
    <div style={{ ...styles.header, left: sidebarWidth }}>
      <div style={styles.left}>
        <h2 style={styles.pageTitle}>Church Management System</h2>
      </div>
      <div style={styles.right}>
        <div style={styles.roleTag}>
          <span style={{ ...styles.roleDot, background: roleColor }} />
          <span style={styles.roleText}>{user?.roleName}</span>
        </div>
        <div style={styles.divider} />
        <span style={styles.email}>{user?.email}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '64px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 99,
    transition: 'left 0.25s ease',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
  },
  left: {
    display: 'flex',
    alignItems: 'center'
  },
  pageTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  roleTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '4px 12px'
  },
  roleDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0
  },
  roleText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151'
  },
  divider: {
    width: '1px',
    height: '20px',
    background: '#e2e8f0'
  },
  email: {
    fontSize: '13px',
    color: '#64748b'
  },
  logoutBtn: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};