import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.permissions || hasPermission(item.permissions.module, item.permissions.action)
  );

  return (
    <div style={{ ...styles.sidebar, width: collapsed ? '64px' : '240px' }}>
      <div style={styles.logoWrap}>
        <span style={styles.cross}>✛</span>
        {!collapsed && <span style={styles.logoText}>PLWM-MCC</span>}
      </div>

      <nav style={styles.nav}>
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navItem,
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              borderLeft: isActive ? '3px solid #fff' : '3px solid transparent'
            })}
          >
            <span style={styles.icon}>{item.icon}</span>
            {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button onClick={onToggle} style={styles.toggleBtn}>
        {collapsed ? '→' : '←'}
      </button>
    </div>
  );
}

const styles = {
  sidebar: {
    height: '100vh',
    background: 'linear-gradient(180deg, #1e3a5f 0%, #1e4080 100%)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
    overflowX: 'hidden'
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  cross: {
    fontSize: '22px',
    color: '#fff',
    flexShrink: 0
  },
  logoText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: '15px',
    letterSpacing: '2px',
    whiteSpace: 'nowrap'
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 0',
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap'
  },
  icon: {
    fontSize: '18px',
    flexShrink: 0,
    width: '24px',
    textAlign: 'center'
  },
  navLabel: {
    overflow: 'hidden'
  },
  toggleBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    padding: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  }
};