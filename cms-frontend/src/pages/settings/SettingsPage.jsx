import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axiosInstance';

// Convert snake_case / camelCase keys to "Title Case With Spaces"
const prettifyKey = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Guess a reasonable group from the key name
const guessGroup = (key) => {
  const k = key.toLowerCase();
  if (k.includes('church') || k.includes('org') || k.includes('timezone') || k.includes('locale'))
    return 'General';
  if (k.includes('finance') || k.includes('currency') || k.includes('fiscal') || k.includes('payment'))
    return 'Finance';
  if (k.includes('member') || k.includes('register') || k.includes('approval') || k.includes('barcode'))
    return 'Members';
  if (k.includes('service') || k.includes('attendance') || k.includes('capacity'))
    return 'Services';
  if (k.includes('event') || k.includes('visibility'))
    return 'Events';
  if (k.includes('notif') || k.includes('email') || k.includes('sms') || k.includes('alert'))
    return 'Notifications';
  if (k.includes('file') || k.includes('upload') || k.includes('storage'))
    return 'Files & Storage';
  return 'General';
};

// Guess input type from key name and value
const guessType = (key, value) => {
  const k = key.toLowerCase();
  const v = String(value || '').toLowerCase();
  if (v === 'true' || v === 'false') return 'boolean';
  if (k.includes('email')) return 'email';
  if (k.includes('password')) return 'password';
  if (k.includes('number') || k.includes('count') || k.includes('limit') ||
      k.includes('max') || k.includes('min') || k.includes('cap') ||
      (k.includes('mode') && !isNaN(Number(value)))) return 'number';
  return 'text';
};

const GROUP_ICONS = {
  'General':         '🏛️',
  'Finance':         '💰',
  'Members':         '👥',
  'Services':        '⛪',
  'Events':          '📅',
  'Notifications':   '🔔',
  'Files & Storage': '📁',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [changes,  setChanges]  = useState({});
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');
  const [activeGroup, setActiveGroup] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      const raw = res.data.data;
      // Enrich each entry with auto-detected label/group/type if missing
      const enriched = {};
      for (const [key, entry] of Object.entries(raw)) {
        enriched[key] = {
          ...entry,
          label: (entry.label && entry.label !== key) ? entry.label : prettifyKey(key),
          group: entry.group || guessGroup(key),
          type:  entry.type  || guessType(key, entry.value),
        };
      }
      setSettings(enriched);
    } catch {
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Set first group as active once settings load
  useEffect(() => {
    if (!activeGroup && Object.keys(settings).length > 0) {
      const groups = [...new Set(Object.values(settings).map(s => s.group))].sort();
      setActiveGroup(groups[0]);
    }
  }, [settings, activeGroup]);

  const getValue = (key) =>
    key in changes ? changes[key] : (settings[key]?.value ?? '');

  const handleChange = (key, value) => {
    setChanges(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!Object.keys(changes).length) return;
    try {
      setSaving(true);
      setError('');
      const res = await api.put('/settings', changes);
      const raw = res.data.data;
      const enriched = {};
      for (const [key, entry] of Object.entries(raw)) {
        enriched[key] = {
          ...entry,
          label: (entry.label && entry.label !== key) ? entry.label : prettifyKey(key),
          group: entry.group || guessGroup(key),
          type:  entry.type  || guessType(key, entry.value),
        };
      }
      setSettings(enriched);
      setChanges({});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(Object.values(settings).map(s => s.group))].sort();
  const hasChanges = Object.keys(changes).length > 0;
  const visibleKeys = Object.entries(settings)
    .filter(([, s]) => s.group === activeGroup)
    .sort(([, a], [, b]) => a.label.localeCompare(b.label));

  const renderInput = (key, setting) => {
    const value = getValue(key);
    const type  = setting.type;

    if (type === 'boolean') {
      const isOn = value === 'true' || value === true;
      return (
        <div style={s.toggleRow}>
          <button
            onClick={() => handleChange(key, isOn ? 'false' : 'true')}
            style={{ ...s.toggle, background: isOn ? '#005599' : '#d1d5db' }}
            aria-label={`Toggle ${setting.label}`}
          >
            <span style={{ ...s.toggleThumb, transform: isOn ? 'translateX(22px)' : 'translateX(2px)' }} />
          </button>
          <span style={{ ...s.toggleLabel, color: isOn ? '#005599' : '#6b7280' }}>
            {isOn ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      );
    }

    if (type === 'select' && setting.options) {
      return (
        <select style={s.input} value={value} onChange={e => handleChange(key, e.target.value)}>
          {setting.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    return (
      <input
        type={type === 'number' ? 'number' : type === 'email' ? 'email' : type === 'password' ? 'password' : 'text'}
        style={s.input}
        value={value}
        onChange={e => handleChange(key, e.target.value)}
        placeholder={`Enter ${setting.label.toLowerCase()}…`}
      />
    );
  };

  if (loading) return (
    <div style={s.centered}>
      <div style={s.spinner} />
      <p style={{ color: '#6b7280', marginTop: '12px' }}>Loading settings…</p>
    </div>
  );

  return (
    <div style={s.page}>
      {/* ── Page header ──────────────────────────────────── */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Settings</h1>
          <p style={s.subtitle}>System configuration — Admin only</p>
        </div>
        <div style={s.headerRight}>
          {saved && <span style={s.savedBadge}>✓ Saved</span>}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{ ...s.saveBtn, opacity: (!hasChanges || saving) ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}
      {hasChanges && (
        <div style={s.changesBanner}>
          ✏️ You have <strong>{Object.keys(changes).length}</strong> unsaved change{Object.keys(changes).length !== 1 ? 's' : ''}.
        </div>
      )}

      <div style={s.layout}>
        {/* ── Sidebar nav ──────────────────────────────────── */}
        <nav style={s.sidebar}>
          {groups.map(group => {
            const count = Object.values(settings).filter(s => s.group === group).length;
            const isActive = group === activeGroup;
            return (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                style={{ ...s.navItem, ...(isActive ? s.navItemActive : {}) }}
              >
                <span style={s.navIcon}>{GROUP_ICONS[group] || '⚙️'}</span>
                <span style={s.navLabel}>{group}</span>
                <span style={{ ...s.navCount, background: isActive ? '#bde3f5' : '#f3f4f6', color: isActive ? '#005599' : '#6b7280' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ── Settings panel ───────────────────────────────── */}
        <div style={s.panel}>
          {activeGroup && (
            <>
              <div style={s.panelHeader}>
                <span style={s.panelIcon}>{GROUP_ICONS[activeGroup] || '⚙️'}</span>
                <div>
                  <h2 style={s.panelTitle}>{activeGroup}</h2>
                  <p style={s.panelSub}>{visibleKeys.length} setting{visibleKeys.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div style={s.settingsList}>
                {visibleKeys.map(([key, setting]) => {
                  const isDirty = key in changes;
                  return (
                    <div key={key} style={{ ...s.settingRow, ...(isDirty ? s.settingRowDirty : {}) }}>
                      <div style={s.settingLeft}>
                        <label style={s.settingLabel}>{setting.label}</label>
                        <code style={s.settingKey}>{key}</code>
                      </div>
                      <div style={s.settingRight}>
                        {renderInput(key, setting)}
                        {isDirty && (
                          <button
                            onClick={() => {
                              const next = { ...changes };
                              delete next[key];
                              setChanges(next);
                            }}
                            style={s.revertBtn}
                            title="Revert change"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        /* Settings responsive */
        @media (max-width: 768px) {
          /* Stack sidebar above content */
          [style*="display: 'flex', gap: '24px'"] { flex-direction: column !important; }
          /* Full-width sidebar nav on mobile */
        }
        @media (max-width: 600px) {
          [style*="width: '200px'"] { width: 100% !important; position: static !important; }
          [style*="width: 'clamp(140px"] { width: 100% !important; }
          [style*="display: 'flex', alignItems: 'center', gap: '16px'"] { flex-direction: column !important; align-items: flex-start !important; }
        }
        @media (max-width: 400px) {
          [style*="padding: '16px 24px'"] { padding: 12px 14px !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  page:        { fontFamily: "'Inter', sans-serif", maxWidth: '1100px' },
  centered:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px' },
  spinner:     { width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTop: '3px solid #1e4080', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  title:       { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0 },
  subtitle:    { fontSize: '14px', color: '#64748b', marginTop: '4px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  savedBadge:  { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '600' },
  saveBtn:     { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' },
  changesBanner: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', marginBottom: '16px' },
  layout:      { display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' },
  // Sidebar
  sidebar:     { width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '24px', minWidth: 0 },
  navItem:     { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.12s' },
  navItemActive: { background: '#e8f4fd' },
  navIcon:     { fontSize: '18px', lineHeight: 1 },
  navLabel:    { flex: 1, fontSize: '14px', fontWeight: '600', color: '#1e293b' },
  navCount:    { fontSize: '11px', fontWeight: '700', padding: '2px 7px', borderRadius: '10px' },
  // Panel
  panel:       { flex: 1, minWidth: 0 },
  panelHeader: { display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px 14px 0 0', borderBottom: '2px solid #eff6ff' },
  panelIcon:   { fontSize: '28px' },
  panelTitle:  { fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 },
  panelSub:    { fontSize: '13px', color: '#64748b', margin: '2px 0 0' },
  settingsList:{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' },
  settingRow:  { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' },
  settingRowDirty: { background: '#fefce8' },
  settingLeft: { width: 'clamp(140px, 30%, 220px)', flexShrink: 0 },
  settingLabel:{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '3px' },
  settingKey:  { fontSize: '11px', color: '#94a3b8', fontFamily: "'Fira Code', 'Courier New', monospace", background: '#f8fafc', padding: '1px 6px', borderRadius: '4px' },
  settingRight:{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' },
  input:       { flex: 1, padding: '9px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none', background: '#fff', fontFamily: 'inherit', transition: 'border-color 0.15s' },
  revertBtn:   { background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', color: '#64748b', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  toggleRow:   { display: 'flex', alignItems: 'center', gap: '10px' },
  toggle:      { width: '46px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: '3px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s' },
  toggleLabel: { fontSize: '13px', fontWeight: '600' },
};
