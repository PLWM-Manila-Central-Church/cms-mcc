import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';

const LOGO = process.env.PUBLIC_URL + '/logo.jpg';

export default function Sidebar({ collapsed, onToggle }) {
  const { hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.permissions || hasPermission(item.permissions.module, item.permissions.action)
  );

  return (
    <div style={{ ...styles.sidebar, width: collapsed ? '68px' : '244px' }}>
      {/* Logo */}
      <div style={{ ...styles.logoWrap, justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '20px 0' : '18px 16px' }}>
        <img
          src={LOGO}
          alt="PLWM-MCC"
          style={styles.logoImg}
        />
        {!collapsed && (
          <div style={styles.logoTextWrap}>
            <span style={styles.logoText}>PLWM-MCC</span>
            <span style={styles.logoSub}>Church Management</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            style={({ isActive }) => ({
              ...styles.navItem,
              background: isActive ? 'rgba(19,181,234,0.18)' : 'transparent',
              borderLeft: isActive ? '3px solid #13B5EA' : '3px solid transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
              justifyContent: collapsed ? 'center' : 'flex-start',
              paddingLeft: collapsed ? '0' : '20px',
            })}
          >
            <span style={{ ...styles.icon, margin: collapsed ? '0' : undefined }}>{item.icon}</span>
            {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={styles.toggleBtn}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? '▶' : '◀'}
      </button>
    </div>
  );
}

const styles = {
  sidebar: {
    height: '100vh',
    background: 'linear-gradient(180deg, #00284a 0%, #003d70 40%, #005599 100%)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
    overflowX: 'hidden',
    boxShadow: '4px 0 24px rgba(0,0,0,0.28)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    minHeight: '72px',
  },
  logoImg: {
    width: '38px',
    height: '38px',
    objectFit: 'contain',
    flexShrink: 0,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    padding: '3px',
  },
  logoTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  logoText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: '15px',
    letterSpacing: '1.5px',
    whiteSpace: 'nowrap',
  },
  logoSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '10px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
    marginTop: '2px',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 0',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 20px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  icon: {
    fontSize: '18px',
    flexShrink: 0,
    width: '24px',
    textAlign: 'center',
  },
  navLabel: {
    overflow: 'hidden',
    letterSpacing: '0.2px',
  },
  toggleBtn: {
    background: 'rgba(0,0,0,0.2)',
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)',
    padding: '14px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.15s',
  },
};
