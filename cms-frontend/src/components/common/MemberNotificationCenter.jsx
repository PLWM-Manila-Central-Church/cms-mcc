import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import useNotificationPolling from '../../hooks/useNotificationPolling';
import { timeAgo } from '../../utils/timeAgo';
import MonoIcon from './MonoIcon';

const COPY = {
  en: {
    title: 'Notifications', unread: (count) => `${count} unread`, markAll: 'Mark all read',
    clearAll: 'Clear all', empty: "You're all caught up!", emptyHint: 'No notifications yet.',
    markRead: 'Mark read', open: 'Open', dismiss: 'Dismiss', loadError: 'Notifications could not be loaded.',
  },
  tl: {
    title: 'Mga notification', unread: (count) => `${count} hindi pa nababasa`, markAll: 'Markahan lahat bilang nabasa',
    clearAll: 'Burahin lahat', empty: 'Wala ka nang bagong notification.', emptyHint: 'Wala pang mga notification.',
    markRead: 'Markahan na nabasa', open: 'Buksan', dismiss: 'Alisin', loadError: 'Hindi ma-load ang mga notification.',
  },
};

const isRead = (notification) => Boolean(Number(notification?.is_read));

export default function MemberNotificationCenter({ colors, isMobile = false, language = 'en' }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const bellRef = useRef(null);
  const panelId = useId();
  const [mobilePanelTop, setMobilePanelTop] = useState(112);
  const [notifications, setNotifications] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const text = COPY[language === 'tl' ? 'tl' : 'en'];
  const unreadCount = notifications.filter((notification) => !isRead(notification)).length;

  const handleNotifications = useCallback((items) => {
    setNotifications(items);
    setError('');
  }, []);
  const handleNotificationError = useCallback(() => setError(text.loadError), [text.loadError]);
  useNotificationPolling({ onNotifications: handleNotifications, onError: handleNotificationError });

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setPanelOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') { setPanelOpen(false); bellRef.current?.focus(); }
    };
    const placePanel = () => {
      if (isMobile) setMobilePanelTop(Math.max(8, Math.min(window.innerHeight - 180, (bellRef.current?.getBoundingClientRect().bottom || 104) + 8)));
    };
    placePanel();
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', placePanel);
    return () => { document.removeEventListener('keydown', closeOnEscape); window.removeEventListener('resize', placePanel); };
  }, [panelOpen, isMobile]);

  const markOne = async (notification) => {
    if (isRead(notification)) return;
    setLoading(true);
    setError('');
    try {
      await axiosInstance.patch(`/notifications/${notification.id}/read`);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: 1 } : item));
    } catch {
      setError(text.loadError);
    } finally {
      setLoading(false);
    }
  };

  const markAll = async () => {
    setLoading(true);
    setError('');
    try {
      await axiosInstance.patch('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, is_read: 1 })));
    } catch {
      setError(text.loadError);
    } finally {
      setLoading(false);
    }
  };

  const dismissOne = async (notification) => {
    setLoading(true);
    setError('');
    try {
      await axiosInstance.delete(`/notifications/${notification.id}`);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch {
      setError(text.loadError);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    setLoading(true);
    setError('');
    try {
      await axiosInstance.delete('/notifications/clear-all');
      setNotifications([]);
    } catch {
      setError(text.loadError);
    } finally {
      setLoading(false);
    }
  };

  const openReference = async (notification) => {
    await markOne(notification);
    if (['event', 'service', 'ministry_invite'].includes(notification.reference_type)) {
      navigate('/portal?tab=events');
    }
    setPanelOpen(false);
  };

  const theme = colors || {};
  const palette = {
    surface: theme.surface || '#fff',
    surfaceAlt: theme.surfaceAlt || '#f8fafc',
    border: theme.border || '#e2e8f0',
    text: theme.t1 || '#0f172a',
    muted: theme.t3 || '#64748b',
    accent: theme.accentT || theme.accent || '#005599',
    unread: theme.accentL || '#eff6ff',
    danger: theme.dk ? '#fca5a5' : theme.danger || '#dc2626',
  };

  return (
    <div ref={panelRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={bellRef}
        type="button"
        aria-label={text.title}
        aria-expanded={panelOpen}
        aria-controls={panelId}
        onClick={() => setPanelOpen((open) => !open)}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, padding: 0, borderRadius: 9, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.24)', color: '#fff',
          background: panelOpen ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)',
        }}
      >
        <MonoIcon name="bell" size={17} />
        {unreadCount > 0 && <span aria-label={text.unread(unreadCount)} style={{
          position: 'absolute', top: -4, right: -5, minWidth: 15, padding: '1px 4px',
          borderRadius: 10, background: '#ef4444', color: '#fff', fontSize: 9,
          fontWeight: 800, lineHeight: '12px', textAlign: 'center', border: '1px solid #fff',
        }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {panelOpen && <section id={panelId} role="region" aria-label={text.title} style={{
        position: isMobile ? 'fixed' : 'absolute', top: isMobile ? mobilePanelTop : 'calc(100% + 8px)', right: isMobile ? 12 : 0,
        width: isMobile ? 'calc(100vw - 24px)' : 380, maxHeight: isMobile ? `min(70dvh, ${Math.max(120, window.innerHeight - mobilePanelTop - 20)}px)` : 'min(70vh, 500px)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 500,
        color: palette.text, background: palette.surface, border: `1px solid ${palette.border}`,
        borderRadius: 14, boxShadow: '0 8px 32px rgba(15,23,42,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${palette.border}` }}>
          <div>
            <strong>{text.title}</strong>
            {unreadCount > 0 && <div style={{ color: palette.accent, fontSize: 11, marginTop: 3 }}>{text.unread(unreadCount)}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {unreadCount > 0 && <button type="button" onClick={markAll} disabled={loading} style={actionStyle(palette.accent)}>{text.markAll}</button>}
            {notifications.length > 0 && <button type="button" onClick={clearAll} disabled={loading} style={actionStyle(palette.danger)}>{text.clearAll}</button>}
          </div>
        </div>
        {error && <div role="alert" style={{ padding: '8px 14px', color: palette.danger, fontSize: 12 }}>{error}</div>}
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {notifications.length === 0 ? <div style={{ padding: 26, textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: 14 }}>{text.empty}</strong>
            <span style={{ display: 'block', marginTop: 4, color: palette.muted, fontSize: 12 }}>{text.emptyHint}</span>
          </div> : notifications.map((notification) => (
            <article key={notification.id} style={{ padding: '11px 13px', borderBottom: `1px solid ${palette.border}`, background: isRead(notification) ? palette.surface : palette.unread }}>
              <p style={{ margin: '0 0 5px', fontSize: 13, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{notification.message}</p>
              <time style={{ display: 'block', color: palette.muted, fontSize: 10, marginBottom: 8 }} dateTime={notification.created_at || notification.createdAt}>
                {timeAgo(notification.created_at || notification.createdAt)}
              </time>
              <div style={{ display: 'flex', gap: 10 }}>
                {!isRead(notification) && <button type="button" disabled={loading} onClick={() => markOne(notification)} style={actionStyle(palette.accent)}>{text.markRead}</button>}
                {notification.reference_type && <button type="button" disabled={loading} onClick={() => openReference(notification)} style={actionStyle(palette.accent)}>{text.open}</button>}
                <button type="button" disabled={loading} onClick={() => dismissOne(notification)} style={actionStyle(palette.muted)}>{text.dismiss}</button>
              </div>
            </article>
          ))}
        </div>
      </section>}
    </div>
  );
}

const actionStyle = (color) => ({
  border: 0, background: 'transparent', color, cursor: 'pointer',
  font: 'inherit', fontSize: 11, fontWeight: 700, padding: 0,
});
