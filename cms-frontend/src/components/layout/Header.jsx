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
    'System Admin':      { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
    'Pastor':            { bg: '#f5f3ff', color: '#7c3aed', dot: '#7c3aed' },
    'Registration Team': { bg: '#eff6ff', color: '#005599', dot: '#13B5EA' },
    'Finance Team':      { bg: '#f0fdf4', color: '#059669', dot: '#059669' },
    'Cell Group Leader': { bg: '#fffbeb', color: '#d97706', dot: '#d97706' },
    'Group Leader':      { bg: '#ecfeff', color: '#0891b2', dot: '#0891b2' },
    'Member':            { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' },
  };

  const rc = roleColors[user?.roleName] || roleColors['Member'];

  return (
    <div style={{ ...styles.header, left: sidebarWidth }}>
      <div style={styles.left}>
        <span style={styles.plwmBadge}>PLWM-MCC</span>
        <div style={styles.divider} />
        <h2 style={styles.pageTitle}>Church Management System</h2>
      </div>
      <div style={styles.right}>
        <div style={{ ...styles.roleTag, background: rc.bg }}>
          <span style={{ ...styles.roleDot, background: rc.dot }} />
          <span style={{ ...styles.roleText, color: rc.color }}>{user?.roleName}</span>
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
    borderBottom: '2px solid #e8f4fd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    zIndex: 99,
    transition: 'left 0.25s ease',
    boxShadow: '0 2px 12px rgba(0,85,153,0.08)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  plwmBadge: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#005599',
    letterSpacing: '1.5px',
    background: '#e8f4fd',
    padding: '3px 10px',
    borderRadius: '6px',
  },
  divider: {
    width: '1px',
    height: '20px',
    background: '#e2e8f0',
  },
  pageTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#374151',
    margin: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  roleTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '5px 13px',
  },
  roleDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  roleText: {
    fontSize: '12px',
    fontWeight: '700',
  },
  email: {
    fontSize: '13px',
    color: '#64748b',
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'linear-gradient(135deg, #005599, #13B5EA)',
    border: 'none',
    color: '#fff',
    borderRadius: '8px',
    padding: '7px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    letterSpacing: '0.2px',
    transition: 'opacity 0.15s',
  },
};
