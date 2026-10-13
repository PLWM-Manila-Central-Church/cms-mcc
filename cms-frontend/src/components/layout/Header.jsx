import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import useNotificationPolling from '../../hooks/useNotificationPolling';
import { LANGS, getLangCode, saveLangCode } from '../../utils/langUtils';
import { timeAgo } from '../../utils/timeAgo';
import MonoIcon from '../common/MonoIcon';

const TYPE_ICON = {
  info:    { icon: 'file', bg: '#eff6ff', dot: '#3b82f6' },
  warning: { icon: 'warning', bg: '#fffbeb', dot: '#f59e0b' },
  success: { icon: 'check', bg: '#f0fdf4', dot: '#22c55e' },
  error:   { icon: 'error', bg: '#fef2f2', dot: '#ef4444' },
};
const defaultType = TYPE_ICON.info;

export default function Header({ sidebarWidth, isMobile = false, isTablet = false, isNarrowDesktop = false }) {
  const { user, logout, activeLeaderScopeKey, selectLeaderScope } = useAuth();
  const navigate = useNavigate();

  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [actionError, setActionError] = useState('');
  const panelRef = useRef(null);

  // Language state
  const [langOpen,    setLangOpen]    = useState(false);
  const [currentLang, setCurrentLang] = useState(() => {
    const saved = LANGS.find(l => l.code === getLangCode());
    return saved ? saved.label : 'English';
  });
  const langRef = useRef(null);
  useEffect(() => {
    const handleEscape = event => {
      if (event.key !== 'Escape') return;
      if (panelOpen) { setPanelOpen(false); panelRef.current?.querySelector('button')?.focus(); }
      if (langOpen) { setLangOpen(false); langRef.current?.querySelector('button')?.focus(); }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [panelOpen, langOpen]);

  // Close lang dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keep in sync with portal/landing page language changes
  useEffect(() => {
    const handler = (e) => {
      const lang = LANGS.find(l => l.code === (e.detail?.code || getLangCode()));
      if (lang) setCurrentLang(lang.label);
    };
    window.addEventListener('plwm-lang-change', handler);
    return () => window.removeEventListener('plwm-lang-change', handler);
  }, []);

  const switchLang = (lang) => {
    setCurrentLang(lang.label);
    setLangOpen(false);
    saveLangCode(lang.code);
    // Reload so the googtrans cookie takes effect cleanly — matches PublicLayout behaviour
    window.location.reload();
  };

  const handleNotifications = useCallback((data) => {
    setNotifs(data);
    setUnread(data.filter((notification) => !notification.is_read).length);
  }, []);
  useNotificationPolling({ onNotifications: handleNotifications });

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markOne = async (id) => {
    setActionError('');
    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (_) { setActionError('Could not mark the notification as read. Try again.'); }
  };

  const markAll = async () => {
    setActionError('');
    setLoading(true);
    try {
      await axiosInstance.patch('/notifications/read-all');
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch (_) { setActionError('Could not mark notifications as read. Try again.'); }
    setLoading(false);
  };

  const deleteOne = async (e, id) => {
    e.stopPropagation();
    setActionError('');
    try {
      await axiosInstance.delete(`/notifications/${id}`);
      setNotifs(prev => {
        const next = prev.filter(n => n.id !== id);
        setUnread(next.filter(n => !n.is_read).length);
        return next;
      });
    } catch (_) { setActionError('Could not dismiss the notification. Try again.'); }
  };

  const clearAll = async () => {
    setActionError('');
    setLoading(true);
    try {
      await axiosInstance.delete('/notifications/clear-all');
      setNotifs([]); setUnread(0);
    } catch (_) { setActionError('Could not clear notifications. Try again.'); }
    setLoading(false);
  };

  // Task 4.6 — deep-link navigation on notification click
  const handleNotifClick = (n) => {
    if (!n.is_read) markOne(n.id);
    if (!n.reference_id || !n.reference_type) return;
    setPanelOpen(false);
    switch (n.reference_type) {
      case 'service':
        if (user?.roleName === 'Member') {
          navigate('/portal?tab=events');
        } else {
          navigate('/services');
        }
        break;
      case 'event':
        if (user?.roleName === 'Member') {
          navigate('/portal?tab=events');
        } else {
          navigate(`/events/${n.reference_id}`);
        }
        break;
      case 'ministry_invite':
        if (user?.roleName === 'Member') {
          navigate('/portal?tab=events');
        } else {
          navigate(`/events/${n.reference_id}`);
        }
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const isMinistryLeader = user?.roleName === 'Ministry Leader' && !!user?.leadsMinistryId;

  const roleColors = {
    'System Admin':      { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
    'Pastor':            { bg: '#f5f3ff', color: '#7c3aed', dot: '#7c3aed' },
    'Registration Team': { bg: '#eff6ff', color: '#005599', dot: '#13B5EA' },
    'Ministry Leader':   { bg: '#e0f2fe', color: '#0369a1', dot: '#0284c7' },
    'Finance Team':      { bg: '#f0fdf4', color: '#059669', dot: '#059669' },
    'Cell Group Leader': { bg: '#fffbeb', color: '#d97706', dot: '#d97706' },
    'Group Leader':      { bg: '#ecfeff', color: '#0891b2', dot: '#0891b2' },
    'Leader':             { bg: '#e0f2fe', color: '#075985', dot: '#0284c7' },
    'Member':            { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' },
  };
  const displayRole = isMinistryLeader ? 'Ministry Leader' : (user?.roleName || 'Member');
  const rc = roleColors[displayRole] || roleColors['Member'];
  const leaderAssignments = user?.roleName === 'Leader' ? (user.leaderAssignments || []) : [];
  const currentLeaderScope = activeLeaderScopeKey || user?.activeLeaderScopeKey || '';

  const panelWidth = isMobile ? 'calc(100vw - 24px)' : '360px';

  return (
    <header className="mcc-header" data-has-scopes={leaderAssignments.length > 0} style={{ ...S.header, left: sidebarWidth, padding: isNarrowDesktop ? '0 12px' : '0 16px' }}>
      <div style={{ ...S.left, minWidth: 0, flex: '1 1 auto', gap: isNarrowDesktop ? 8 : 10 }}>
        {/* NO hamburger on mobile — navigation is via bottom tab bar + More drawer */}
        <span className="mcc-header-brand" style={S.plwmBadge}>PLWM-MCC</span>
        {!isMobile && (
          <>
            <div style={S.divider} />
            <h2 className="mcc-header-title" style={{
              ...S.pageTitle,
              maxWidth: isTablet ? 140 : isNarrowDesktop ? 240 : 300,
              minWidth: 0,
              flex: '1 1 auto',
            }}>Church Management System</h2>
          </>
        )}
      </div>

      <div style={{ ...S.right, minWidth: 0, flexShrink: 0, gap: isNarrowDesktop ? 8 : 10 }}>
        {leaderAssignments.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
              {!isMobile && 'Team'}
            </span>
            <select
              aria-label="Active leadership team"
              value={currentLeaderScope}
              onChange={(event) => selectLeaderScope(event.target.value, { reload: true })}
              style={{
                maxWidth: isMobile || isTablet ? 138 : isNarrowDesktop ? 180 : 230,
                minWidth: 0,
                minHeight: 34,
                border: '1px solid #dbe4ee',
                borderRadius: 8,
                background: '#fff',
                color: '#1e293b',
                padding: '5px 8px',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              {leaderAssignments.length > 1 && <option value="all">All assigned teams · read only</option>}
              {leaderAssignments.map((assignment) => (
                <option key={assignment.scopeKey} value={assignment.scopeKey}>
                  {assignment.teamName || `${assignment.scopeType === 'cell_group' ? 'Cell group' : 'Group'} #${assignment.scopeId}`}
                </option>
              ))}
            </select>
          </label>
        )}

        {!isMobile && (
          <div style={{ ...S.roleTag, background: rc.bg }}>
            <span style={{ ...S.roleDot, background: rc.dot }} />
            <span style={{ ...S.roleText, color: rc.color }}>{displayRole}</span>
          </div>
        )}

        {!isMobile && !isTablet && (
          <>
            <div style={S.divider} />
            <span className="mcc-header-email" title={user?.email} style={{ ...S.email, maxWidth: isNarrowDesktop ? 120 : 200, minWidth: 0 }}>{user?.email}</span>
          </>
        )}

        {/* Language picker */}
        <div ref={langRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setLangOpen(p => !p); setPanelOpen(false); }}
            aria-label={`Language: ${currentLang}`}
            aria-expanded={langOpen}
            aria-controls="mcc-language-options"
            style={{ background: langOpen ? '#e8f4fd' : 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', color: '#374151', fontFamily: 'inherit', fontWeight: 500 }}
            title="Change language"
          >
            <span style={{ fontSize: 11, fontWeight: 800 }}>{LANGS.find(l => l.label === currentLang)?.code.toUpperCase() || 'EN'}</span>
            {!isMobile && !isNarrowDesktop && <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{currentLang}</span>}
          </button>

          {langOpen && (
            <div id="mcc-language-options" aria-label="Languages" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', zIndex: 300, minWidth: 200, overflow: 'hidden', animation: 'slideDown 0.18s ease' }}>
              <div style={{ padding: '8px 14px 6px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Language</div>
              {[{ groupLabel: 'International', langs: LANGS.slice(0, 2) }, { groupLabel: 'Filipino Languages', langs: LANGS.slice(2) }].map(group => (
                <div key={group.groupLabel}>
                  <div style={{ padding: '4px 14px 2px', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{group.groupLabel}</div>
                  {group.langs.map(lang => (
                    <button key={lang.code} onClick={() => switchLang(lang)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', fontSize: 13, fontWeight: currentLang === lang.label ? 700 : 400, color: currentLang === lang.label ? '#005599' : '#374151', background: currentLang === lang.label ? '#eff6ff' : 'transparent', border: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = currentLang === lang.label ? '#eff6ff' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = currentLang === lang.label ? '#eff6ff' : 'transparent'}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, minWidth: 28, color: '#64748b' }}>{lang.code.toUpperCase()}</span>
                      <span>{lang.label}</span>
                      {currentLang === lang.label && <MonoIcon name="check" size={12} style={{ marginLeft: 'auto', color: '#005599' }} />}
                    </button>
                  ))}
                </div>
              ))}
              <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                Powered by Google Translate
              </div>
            </div>
          )}
        </div>

        {/* Notifications bell */}
        <div ref={panelRef} style={S.bellWrap}>
          <button
            style={{ ...S.bellBtn, background: panelOpen ? '#e8f4fd' : 'transparent' }}
            onClick={() => { setPanelOpen(p => !p); setLangOpen(false); }}
            aria-label="Notifications"
            aria-expanded={panelOpen}
            aria-controls="mcc-notification-panel"
            title="Notifications"
          >
            <MonoIcon name="bell" size={17} style={S.bellIcon} />
            {unread > 0 && <span style={S.badge}>{unread > 99 ? '99+' : unread}</span>}
          </button>

          {panelOpen && (
            <section id="mcc-notification-panel" aria-label="Notifications" style={{ ...S.panel, width: panelWidth, ...(isMobile ? { position: 'fixed', top: 72, right: 12 } : { right: 0 }) }}>
              <div style={S.panelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={S.panelTitle}>Notifications</span>
                  {unread > 0 && <span style={S.unreadPill}>{unread} unread</span>}
                </div>
                <div style={S.panelActions}>
                  {unread > 0 && <button style={S.actionLink} onClick={markAll} disabled={loading}>Mark all read</button>}
                  {notifs.length > 0 && <button style={{ ...S.actionLink, color: '#ef4444' }} onClick={clearAll} disabled={loading}>Clear all</button>}
                </div>
              </div>
              {actionError && <p role="alert" style={{ margin: 0, padding: '12px 16px', color: '#b91c1c', background: '#fef2f2', fontSize: 13 }}>{actionError}</p>}

              <div style={S.panelList}>
                {notifs.length === 0 ? (
                  <div style={S.emptyPanel}>
                    <span style={S.emptyBell}><MonoIcon name="bellOff" size={22} /></span>
                    <span style={S.emptyText}>You&apos;re all caught up!</span>
                    <span style={S.emptyHint}>No notifications yet.</span>
                  </div>
                ) : (
                  notifs.map(n => {
                    const t = TYPE_ICON[n.type] || defaultType;
                    return (
                      <div key={n.id}
                        style={{ ...S.notifRow, background: n.is_read ? '#fff' : '#f0f6ff', borderLeft: `3px solid ${n.is_read ? 'transparent' : t.dot}` }}
                      >
                        <div style={{ ...S.notifIconWrap, background: t.bg }}>
                          <MonoIcon name={t.icon} size={15} style={S.notifIcon} />
                        </div>
                        <button type="button" onClick={() => handleNotifClick(n)} style={{ ...S.notifContent, border: 0, background: 'transparent', padding: 0, textAlign: 'left', font: 'inherit', cursor: 'pointer' }}>
                          <span style={{ ...S.notifMsg, display: 'block' }}>{n.message}</span>
                          <span style={S.notifTime}>{timeAgo(n.created_at ?? n.createdAt)}</span>
                        </button>
                        <button type="button" style={S.deleteNotif} onClick={(e) => deleteOne(e, n.id)} aria-label={`Dismiss notification: ${n.message}`} title="Dismiss"><MonoIcon name="close" size={12} /></button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>

        <button aria-label="Sign Out" title="Sign Out" onClick={handleLogout} style={{ ...S.logoutBtn, padding: isMobile ? '7px 10px' : '7px 16px', fontSize: isMobile ? '12px' : '13px' }}>
          {isMobile ? '↩' : 'Sign Out'}
        </button>
      </div>

      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </header>
  );
}

const S = {
  header:      { position: 'fixed', top: 0, right: 0, height: '64px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 99, transition: 'left 0.25s ease' },
  left:        { display: 'flex', alignItems: 'center', gap: '10px' },
  plwmBadge:   { fontSize: '11px', fontWeight: '800', color: '#005599', letterSpacing: '1.5px', background: '#e8f4fd', padding: '3px 10px', borderRadius: '6px', whiteSpace: 'nowrap' },
  divider:     { width: '1px', height: '20px', background: '#e2e8f0', flexShrink: 0 },
  pageTitle:   { fontSize: '15px', fontWeight: '600', color: '#374151', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' },
  right:       { display: 'flex', alignItems: 'center', gap: '10px' },
  roleTag:     { display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '5px 13px', whiteSpace: 'nowrap' },
  roleDot:     { width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0 },
  roleText:    { fontSize: '12px', fontWeight: '700' },
  email:       { fontSize: '13px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logoutBtn:   { background: '#fff', border: '1px solid #dbe4ee', color: '#334155', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.2px', whiteSpace: 'nowrap' },
  bellWrap:    { position: 'relative' },
  bellBtn:     { position: 'relative', border: 'none', borderRadius: '8px', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' },
  bellIcon:    { fontSize: '18px', lineHeight: 1 },
  badge:       { position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: '800', borderRadius: '10px', padding: '1px 4px', minWidth: '14px', textAlign: 'center', lineHeight: '12px', border: '1.5px solid #fff' },
  panel:       { position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: '#fff', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.14)', border: '1px solid #e8f0fe', overflow: 'hidden', zIndex: 200, animation: 'slideDown 0.2s ease' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 12px', borderBottom: '1px solid #f1f5f9' },
  panelTitle:  { fontSize: '15px', fontWeight: '800', color: '#0f172a' },
  unreadPill:  { background: '#e8f4fd', color: '#005599', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' },
  panelActions:{ display: 'flex', gap: '10px' },
  actionLink:  { background: 'none', border: 'none', fontSize: '12px', fontWeight: '600', color: '#005599', cursor: 'pointer', padding: 0 },
  panelList:   { maxHeight: '360px', overflowY: 'auto' },
  notifRow:    { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #f8fafc' },
  notifIconWrap:{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' },
  notifIcon:   { fontSize: '16px' },
  notifContent:{ flex: 1, minWidth: 0 },
  notifMsg:    { fontSize: '13px', color: '#1e293b', margin: '0 0 4px', lineHeight: '1.45', fontWeight: '500' },
  notifTime:   { fontSize: '11px', color: '#94a3b8', fontWeight: '500' },
  deleteNotif: { background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '11px', padding: '2px 4px', flexShrink: 0, lineHeight: 1, marginTop: '2px', borderRadius: '4px' },
  emptyPanel:  { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', gap: '6px' },
  emptyBell:   { fontSize: '36px', marginBottom: '4px' },
  emptyText:   { fontSize: '14px', fontWeight: '700', color: '#374151' },
  emptyHint:   { fontSize: '12px', color: '#94a3b8' },
};
