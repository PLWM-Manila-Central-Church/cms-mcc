import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';

const LOGO = process.env.PUBLIC_URL + '/logo.jpg';

export default function Sidebar({ collapsed, onToggle, isMobile = false }) {
  const { hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.permissions || hasPermission(item.permissions.module, item.permissions.action)
  );

  const showText = isMobile || !collapsed;

  return (
    <div style={{
      ...S.sidebar,
      width: isMobile ? '260px' : (collapsed ? '68px' : '244px'),
    }}>
      {/* Logo */}
      <div style={{
        ...S.logoWrap,
        justifyContent: showText ? 'flex-start' : 'center',
        padding:        showText ? '18px 16px'  : '20px 0',
      }}>
        <img src={LOGO} alt="PLWM-MCC" style={S.logoImg} />
        {showText && (
          <div style={S.logoTextWrap}>
            <span style={S.logoText}>PLWM-MCC</span>
            <span style={S.logoSub}>Church Management</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={S.nav}>
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={!showText ? item.label : undefined}
            onClick={isMobile ? onToggle : undefined}
            style={({ isActive }) => ({
              ...S.navItem,
              background:   isActive ? 'rgba(19,181,234,0.18)' : 'transparent',
              borderLeft:   isActive ? '3px solid #13B5EA'     : '3px solid transparent',
              color:        isActive ? '#fff'                   : 'rgba(255,255,255,0.72)',
              justifyContent: showText ? 'flex-start' : 'center',
              paddingLeft:    showText ? '20px'        : '0',
              fontSize:       isMobile ? '15px' : '14px',
              padding:        isMobile ? '13px 20px' : '11px 20px',
            })}
          >
            <span style={{ ...S.icon, margin: showText ? undefined : '0' }}>{item.icon}</span>
            {showText && <span style={S.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle button — hidden on mobile (swipe/tap backdrop to close) */}
      {!isMobile && (
        <button onClick={onToggle} style={S.toggleBtn} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▶' : '◀'}
        </button>
      )}
    </div>
  );
}

const S = {
  sidebar: {
    height: '100vh',
    background: 'linear-gradient(180deg, #00284a 0%, #003d70 40%, #005599 100%)',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
    overflowY: 'auto',
    boxShadow: '4px 0 24px rgba(0,0,0,0.28)',
    transition: 'width 0.25s ease',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    minHeight: '72px',
    flexShrink: 0,
  },
  logoImg: {
    width: '38px', height: '38px',
    objectFit: 'contain', flexShrink: 0,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    padding: '3px',
  },
  logoTextWrap: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  logoText: { color: '#fff', fontWeight: '800', fontSize: '15px', letterSpacing: '1.5px', whiteSpace: 'nowrap' },
  logoSub:  { color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: '500', whiteSpace: 'nowrap', letterSpacing: '0.5px', marginTop: '2px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '11px 20px',
    textDecoration: 'none', fontSize: '14px', fontWeight: '500',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  },
  icon:      { fontSize: '18px', flexShrink: 0, width: '24px', textAlign: 'center' },
  navLabel:  { overflow: 'hidden', letterSpacing: '0.2px' },
  toggleBtn: {
    background: 'rgba(0,0,0,0.2)', border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)', padding: '14px',
    cursor: 'pointer', fontSize: '12px', transition: 'background 0.15s',
    flexShrink: 0,
  },
};
