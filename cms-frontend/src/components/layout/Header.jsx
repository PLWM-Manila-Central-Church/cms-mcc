import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';

const POLL_INTERVAL = 30000;

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICON = {
  info:    { icon: 'ℹ️', bg: '#eff6ff', dot: '#3b82f6' },
  warning: { icon: '⚠️', bg: '#fffbeb', dot: '#f59e0b' },
  success: { icon: '✅', bg: '#f0fdf4', dot: '#22c55e' },
  error:   { icon: '❌', bg: '#fef2f2', dot: '#ef4444' },
};
const defaultType = TYPE_ICON.info;

export default function Header({ sidebarWidth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const panelRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/notifications');
      const data = res.data.data || [];
      setNotifs(data);
      setUnread(data.filter(n => !n.is_read).length);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const timer = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchNotifs]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markOne = async (id) => {
    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const markAll = async () => {
    setLoading(true);
    try {
      await axiosInstance.patch('/notifications/read-all');
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch (_) {}
    setLoading(false);
  };

  const deleteOne = async (e, id) => {
    e.stopPropagation();
    try {
      await axiosInstance.delete(`/notifications/${id}`);
      setNotifs(prev => {
        const next = prev.filter(n => n.id !== id);
        setUnread(next.filter(n => !n.is_read).length);
        return next;
      });
    } catch (_) {}
  };

  const clearAll = async () => {
    setLoading(true);
    try {
      await axiosInstance.delete('/notifications/clear-all');
      setNotifs([]);
      setUnread(0);
    } catch (_) {}
    setLoading(false);
  };

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

        <div ref={panelRef} style={styles.bellWrap}>
          <button
            style={{ ...styles.bellBtn, background: panelOpen ? '#e8f4fd' : 'transparent' }}
            onClick={() => setPanelOpen(p => !p)}
            title="Notifications"
          >
            <span style={styles.bellIcon}>🔔</span>
            {unread > 0 && (
              <span style={styles.badge}>{unread > 99 ? '99+' : unread}</span>
            )}
          </button>

          {panelOpen && (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={styles.panelTitle}>Notifications</span>
                  {unread > 0 && <span style={styles.unreadPill}>{unread} unread</span>}
                </div>
                <div style={styles.panelActions}>
                  {unread > 0 && (
                    <button style={styles.actionLink} onClick={markAll} disabled={loading}>
                      Mark all read
                    </button>
                  )}
                  {notifs.length > 0 && (
                    <button style={{ ...styles.actionLink, color: '#ef4444' }} onClick={clearAll} disabled={loading}>
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div style={styles.panelList}>
                {notifs.length === 0 ? (
                  <div style={styles.emptyPanel}>
                    <span style={styles.emptyBell}>🔕</span>
                    <span style={styles.emptyText}>You're all caught up!</span>
                    <span style={styles.emptyHint}>No notifications yet.</span>
                  </div>
                ) : (
                  notifs.map(n => {
                    const t = TYPE_ICON[n.type] || defaultType;
                    return (
                      <div
                        key={n.id}
                        style={{
                          ...styles.notifRow,
                          background: n.is_read ? '#fff' : '#f0f6ff',
                          borderLeft: `3px solid ${n.is_read ? 'transparent' : t.dot}`,
                        }}
                        onClick={() => !n.is_read && markOne(n.id)}
                      >
                        <div style={{ ...styles.notifIconWrap, background: t.bg }}>
                          <span style={styles.notifIcon}>{t.icon}</span>
                        </div>
                        <div style={styles.notifContent}>
                          <p style={styles.notifMsg}>{n.message}</p>
                          <span style={styles.notifTime}>{timeAgo(n.created_at)}</span>
                        </div>
                        <button
                          style={styles.deleteNotif}
                          onClick={(e) => deleteOne(e, n.id)}
                          title="Dismiss"
                        >✕</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
      </div>

      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

const styles = {
  header:      { position:'fixed', top:0, right:0, height:'64px', background:'#fff', borderBottom:'2px solid #e8f4fd', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', zIndex:99, transition:'left 0.25s ease', boxShadow:'0 2px 12px rgba(0,85,153,0.08)' },
  left:        { display:'flex', alignItems:'center', gap:'14px' },
  plwmBadge:   { fontSize:'11px', fontWeight:'800', color:'#005599', letterSpacing:'1.5px', background:'#e8f4fd', padding:'3px 10px', borderRadius:'6px' },
  divider:     { width:'1px', height:'20px', background:'#e2e8f0' },
  pageTitle:   { fontSize:'15px', fontWeight:'600', color:'#374151', margin:0 },
  right:       { display:'flex', alignItems:'center', gap:'14px' },
  roleTag:     { display:'flex', alignItems:'center', gap:'6px', border:'1px solid #e2e8f0', borderRadius:'20px', padding:'5px 13px' },
  roleDot:     { width:'7px', height:'7px', borderRadius:'50%', flexShrink:0 },
  roleText:    { fontSize:'12px', fontWeight:'700' },
  email:       { fontSize:'13px', color:'#64748b', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn:   { background:'linear-gradient(135deg,#005599,#13B5EA)', border:'none', color:'#fff', borderRadius:'8px', padding:'7px 16px', fontSize:'13px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.2px' },

  bellWrap:    { position:'relative' },
  bellBtn:     { position:'relative', border:'none', borderRadius:'8px', width:'38px', height:'38px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' },
  bellIcon:    { fontSize:'18px', lineHeight:1 },
  badge:       { position:'absolute', top:'4px', right:'4px', background:'#ef4444', color:'#fff', fontSize:'9px', fontWeight:'800', borderRadius:'10px', padding:'1px 4px', minWidth:'14px', textAlign:'center', lineHeight:'12px', border:'1.5px solid #fff' },

  panel:       { position:'absolute', top:'calc(100% + 10px)', right:0, width:'360px', background:'#fff', borderRadius:'16px', boxShadow:'0 8px 40px rgba(0,0,0,0.14)', border:'1px solid #e8f0fe', overflow:'hidden', zIndex:200, animation:'slideDown 0.2s ease' },
  panelHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 18px 12px', borderBottom:'1px solid #f1f5f9' },
  panelTitle:  { fontSize:'15px', fontWeight:'800', color:'#0f172a' },
  unreadPill:  { background:'#e8f4fd', color:'#005599', fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'20px' },
  panelActions:{ display:'flex', gap:'10px' },
  actionLink:  { background:'none', border:'none', fontSize:'12px', fontWeight:'600', color:'#005599', cursor:'pointer', padding:0 },

  panelList:   { maxHeight:'380px', overflowY:'auto' },
  notifRow:    { display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 16px', cursor:'pointer', transition:'background 0.15s', borderBottom:'1px solid #f8fafc' },
  notifIconWrap:{ width:'34px', height:'34px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'2px' },
  notifIcon:   { fontSize:'16px' },
  notifContent:{ flex:1, minWidth:0 },
  notifMsg:    { fontSize:'13px', color:'#1e293b', margin:'0 0 4px', lineHeight:'1.45', fontWeight:'500' },
  notifTime:   { fontSize:'11px', color:'#94a3b8', fontWeight:'500' },
  deleteNotif: { background:'none', border:'none', color:'#cbd5e1', cursor:'pointer', fontSize:'11px', padding:'2px 4px', flexShrink:0, lineHeight:1, marginTop:'2px', borderRadius:'4px' },

  emptyPanel:  { display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 24px', gap:'6px' },
  emptyBell:   { fontSize:'36px', marginBottom:'4px' },
  emptyText:   { fontSize:'14px', fontWeight:'700', color:'#374151' },
  emptyHint:   { fontSize:'12px', color:'#94a3b8' },
};
