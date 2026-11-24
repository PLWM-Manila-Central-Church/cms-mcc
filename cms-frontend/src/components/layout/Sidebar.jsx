import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';
import { isVisibleNavItem } from '../../utils/roleAccess';
import MonoIcon from '../common/MonoIcon';
import { currentNavPath } from '../../utils/navigationState';
import { getRoleWorkspace, workspaceNavigation } from '../../utils/roleWorkspace';

const LOGO = process.env.PUBLIC_URL + '/logo.jpg';

function NavIcon({ name, size = 18 }) {
  return <MonoIcon name={name || 'file'} size={size} strokeWidth={1.75} />;
}

export default function Sidebar({ collapsed, onToggle, isMobile = false }) {
  const { user, hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => isVisibleNavItem(item, user, hasPermission)
    && (!item.roles || item.roles.includes(user?.roleName)));
  const location = useLocation();
  const activePath = currentNavPath(visibleItems, location.pathname);
  const workspace = getRoleWorkspace(user);
  const groups = workspaceNavigation(visibleItems, workspace);

  const showText = isMobile || !collapsed;

  return (
    <aside className="mcc-sidebar" aria-label="Church workspace" style={{ ...S.sidebar, width: isMobile ? '260px' : '100%' }}>
      {/* Logo */}
      <div style={{ ...S.logoWrap, justifyContent: showText ? 'flex-start' : 'center', padding: showText ? '18px 16px' : '20px 0' }}>
        <img src={LOGO} alt="PLWM-MCC" style={S.logoImg} />
        {showText && (
          <div style={S.logoTextWrap}>
            <span style={S.logoText}>PLWM-MCC</span>
            <span style={S.logoSub}>{workspace.title}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={S.nav} aria-label="Main navigation">
        {groups.map(group => <div className="workspace-nav-group" key={group.title}>
          {showText && group.title !== 'Overview' && <div className="workspace-nav-heading">{group.title}</div>}
          {group.items.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={activePath !== item.path}
            aria-current={activePath === item.path ? 'page' : undefined}
            aria-label={item.label}
            className={`mcc-nav-link${activePath === item.path ? ' mcc-nav-current' : ''}`}
            title={!showText ? item.label : undefined}
            onClick={isMobile ? onToggle : undefined}
            style={() => ({
              ...S.navItem,
              background:     activePath === item.path ? 'rgba(19,181,234,0.16)' : 'transparent',
              borderLeft:     activePath === item.path ? '3px solid #13B5EA' : '3px solid transparent',
              color:          activePath === item.path ? '#fff' : '#c5d9eb',
              justifyContent: showText ? 'flex-start'             : 'center',
              padding:        isMobile ? '12px 16px' : showText ? '9px 14px' : '10px 0',
            })}
          >
            <NavIcon name={item.icon} size={18} />
            {showText && <span style={S.navLabel}>{item.label}</span>}
          </NavLink>
          ))}
        </div>)}
      </nav>

      {!isMobile && (
        <button onClick={onToggle} style={S.toggleBtn} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
          </svg>
        </button>
      )}
    </aside>
  );
}

const S = {
  sidebar: {
    height: '100vh',
    position: 'sticky',
    top: 0,
    background: '#00284a',
    display: 'flex', flexDirection: 'column',
    overflowX: 'hidden', overflowY: 'auto',
    borderRight: '1px solid rgba(255,255,255,0.08)',
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: '11px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    minHeight: '64px', flexShrink: 0,
  },
  logoImg:      { width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', padding: '3px' },
  logoTextWrap: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  logoText:     { color: '#fff', fontWeight: '800', fontSize: '15px', letterSpacing: '1.2px', whiteSpace: 'nowrap' },
  logoSub:      { color: 'rgba(255,255,255,0.62)', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap', marginTop: '1px' },
  nav:          { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 8px', overflowY: 'auto', overflowX: 'hidden' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '11px',
    padding: '9px 14px', textDecoration: 'none',
    fontSize: '13.5px', fontWeight: '500', minHeight: 40, borderRadius: 8,
    transition: 'background-color 0.15s, color 0.15s', whiteSpace: 'nowrap',
  },
  navLabel:  { overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.1px' },
  toggleBtn: {
    background: 'rgba(0,0,0,0.2)', border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)', padding: '12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
    flexShrink: 0,
  },
};
