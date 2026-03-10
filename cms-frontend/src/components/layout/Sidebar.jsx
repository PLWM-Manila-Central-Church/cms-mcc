import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';

const LOGO = 'data:image/png;base64,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';

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
