import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';

const BP_TABLET = 1024;
const BP_MOBILE = 768;

function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return width;
}

/* ── Mobile bottom tab bar ─────────────────────────────────── */
const BOTTOM_TABS = [
  { label: 'Home',    path: '/dashboard',  icon: '🏠' },
  { label: 'Members', path: '/members',    icon: '👥', permissions: { module: 'members',  action: 'read' } },
  { label: 'Events',  path: '/events',     icon: '📅', permissions: { module: 'events',   action: 'read' } },
  { label: 'Finance', path: '/finance',    icon: '💰', permissions: { module: 'finance',  action: 'read' } },
  { label: 'More',    path: '__more__',    icon: '☰' },
];

function BottomTabBar({ onMoreOpen }) {
  const { hasPermission } = useAuth();
  const location = useLocation();

  const visibleTabs = BOTTOM_TABS.filter(t =>
    !t.permissions || hasPermission(t.permissions.module, t.permissions.action)
  );

  // Always show max 5 tabs; last one is always "More"
  const tabs = visibleTabs.slice(0, 4);
  tabs.push({ label: 'More', path: '__more__', icon: '☰' });

  const isActive = (path) => path !== '__more__' && location.pathname.startsWith(path);

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 60,
      background: '#fff',
      borderTop: '1px solid #e8edf2',
      display: 'flex',
      zIndex: 200,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
    }}>
      {tabs.map(tab => {
        const active = isActive(tab.path);
        return tab.path === '__more__' ? (
          <button
            key="more"
            onClick={onMoreOpen}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2, border: 'none', background: 'none',
              cursor: 'pointer', padding: '6px 4px',
              color: '#94a3b8', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 20 }}>☰</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.2px' }}>More</span>
          </button>
        ) : (
          <NavLink
            key={tab.path}
            to={tab.path}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2, textDecoration: 'none', padding: '6px 4px',
              color: active ? '#005599' : '#94a3b8',
              position: 'relative',
            }}
          >
            {active && (
              <span style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 32, height: 3, background: '#005599',
                borderRadius: '0 0 3px 3px',
              }} />
            )}
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 600, letterSpacing: '0.2px' }}>
              {tab.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ── Mobile "More" drawer (full nav sheet) ─────────────────── */
function MobileMoreDrawer({ open, onClose }) {
  const { hasPermission, user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.permissions || hasPermission(item.permissions.module, item.permissions.action)
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(11,36,71,0.45)',
          backdropFilter: 'blur(2px)', zIndex: 398,
        }}
      />
      {/* Sheet from bottom */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        zIndex: 399, maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        paddingBottom: 24,
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 2 }} />
        </div>

        {/* User info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 20px 16px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg,#005599,#13B5EA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              {user?.email?.split('@')[0] || 'User'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.roleName}</div>
          </div>
        </div>

        {/* Nav items grid */}
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {visibleItems.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 12,
                  textDecoration: 'none',
                  background: active ? '#e8f4fd' : '#f8fafc',
                  border: `1.5px solid ${active ? 'rgba(0,85,153,0.25)' : '#f1f5f9'}`,
                  color: active ? '#005599' : '#374151',
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Logout */}
        <div style={{ padding: '8px 16px 0' }}>
          <button
            onClick={async () => { onClose(); await logout(); }}
            style={{
              width: '100%', padding: '13px', borderRadius: 12,
              border: '1.5px solid #fecaca', background: '#fef2f2',
              color: '#dc2626', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

export default function MainLayout({ children }) {
  const width     = useWindowWidth();
  const isMobile  = width <= BP_MOBILE;
  const isTablet  = width > BP_MOBILE && width <= BP_TABLET;

  const [collapsed,   setCollapsed]   = useState(isTablet);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [moreOpen,    setMoreOpen]    = useState(false);

  useEffect(() => {
    if (isMobile)               { setCollapsed(true); setDrawerOpen(false); }
    if (isTablet)               { setCollapsed(true); }
    if (!isMobile && !isTablet) { setCollapsed(false); }
  }, [isMobile, isTablet]);

  useEffect(() => {
    document.body.style.overflow = (isMobile && drawerOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, drawerOpen]);

  const sidebarWidth = isMobile ? '0px' : (collapsed ? '68px' : '244px');
  const mainPadLeft  = isMobile ? '0px' : sidebarWidth;

  return (
    <div style={S.root}>
      {/* Desktop/tablet: sidebar + backdrop */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={S.backdrop} aria-hidden="true" />
      )}

      {!isMobile && (
        <div style={{
          ...S.sidebarWrapper,
          width: sidebarWidth,
          transform: 'none',
          transition: 'width 0.25s ease',
          zIndex: 100,
          position: 'fixed',
          left: 0, top: 0,
        }}>
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed(c => !c)}
            isMobile={false}
          />
        </div>
      )}

      {/* Header */}
      <Header
        sidebarWidth={mainPadLeft}
        isMobile={isMobile}
        onHamburger={() => setDrawerOpen(o => !o)}
        drawerOpen={drawerOpen}
      />

      {/* Main content */}
      <main style={{
        ...S.main,
        marginLeft: mainPadLeft,
        padding: isMobile ? '12px 12px 0' : (isTablet ? '20px' : '28px'),
        paddingTop: isMobile ? '72px' : '80px',
        paddingBottom: isMobile ? '68px' : (isTablet ? '20px' : '28px'),
      }}>
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      {isMobile && <BottomTabBar onMoreOpen={() => setMoreOpen(true)} />}

      {/* Mobile "More" sheet */}
      <MobileMoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

const S = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f0f6ff',
    fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
    position: 'relative',
  },
  sidebarWrapper: {
    height: '100vh',
    flexShrink: 0,
    overflowX: 'hidden',
  },
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(11,36,71,0.5)',
    backdropFilter: 'blur(2px)',
    zIndex: 299,
  },
  main: {
    flex: 1,
    minHeight: '100vh',
    transition: 'margin-left 0.25s ease, padding 0.25s ease',
    overflowX: 'hidden',
  },
};
