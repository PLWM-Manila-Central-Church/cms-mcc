import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? '64px' : '240px';

  return (
    <div style={styles.root}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header sidebarWidth={sidebarWidth} />
      <main style={{ ...styles.main, marginLeft: sidebarWidth }}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Segoe UI', sans-serif"
  },
  main: {
    flex: 1,
    marginTop: '64px',
    padding: '32px',
    transition: 'margin-left 0.25s ease',
    minHeight: 'calc(100vh - 64px)'
  }
};