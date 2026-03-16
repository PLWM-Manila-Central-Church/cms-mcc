import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

// ── Responsive breakpoints ──────────────────────────────────────
const BP_TABLET  = 1024;
const BP_MOBILE  = 768;

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return width;
}

export default function MainLayout({ children }) {
  const width        = useWindowWidth();
  const isMobile     = width <= BP_MOBILE;
  const isTablet     = width > BP_MOBILE && width <= BP_TABLET;

  // Desktop: collapsible sidebar; Tablet: auto-collapsed; Mobile: drawer (hidden by default)
  const [collapsed,    setCollapsed]    = useState(isTablet);
  const [drawerOpen,   setDrawerOpen]   = useState(false);

  // Re-evaluate when screen size changes
  useEffect(() => {
    if (isMobile)  { setCollapsed(true);  setDrawerOpen(false); }
    if (isTablet)  { setCollapsed(true);  }
    if (!isMobile && !isTablet) { setCollapsed(false); }
  }, [isMobile, isTablet]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = (isMobile && drawerOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, drawerOpen]);

  const sidebarWidth = isMobile ? '0px' : (collapsed ? '68px' : '244px');
  const mainPadLeft  = isMobile ? '0px' : sidebarWidth;

  return (
    <div style={S.root}>
      {/* ── Mobile overlay backdrop ── */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={S.backdrop}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        ...S.sidebarWrapper,
        width:     isMobile ? '260px' : sidebarWidth,
        transform: isMobile ? (drawerOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform 0.28s ease, width 0.25s ease',
        zIndex:    isMobile ? 300 : 100,
        position:  'fixed',
        left: 0, top: 0,
      }}>
        <Sidebar
          collapsed={!isMobile && collapsed}
          onToggle={() => {
            if (isMobile) setDrawerOpen(false);
            else setCollapsed(c => !c);
          }}
          isMobile={isMobile}
        />
      </div>

      {/* ── Header ── */}
      <Header
        sidebarWidth={mainPadLeft}
        isMobile={isMobile}
        onHamburger={() => setDrawerOpen(o => !o)}
        drawerOpen={drawerOpen}
      />

      {/* ── Main content ── */}
      <main style={{
        ...S.main,
        marginLeft: mainPadLeft,
        padding:    isMobile ? '12px' : (isTablet ? '20px' : '28px'),
        paddingTop: isMobile ? '76px' : '80px',
      }}>
        {children}
      </main>
    </div>
  );
}

const S = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f0f6ff',
    fontFamily: "'DM Sans', 'Segoe UI', -apple-system, sans-serif",
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
