import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import useIsMobile from '../../hooks/useIsMobile';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MinistryPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isMember = user?.roleName === 'Member';

  // Ministry Leader = Registration Team user with a ministry sub-role assigned.
  // They see ONLY the "My Members" roster tab — no Assignments, Roles, or Substitutes.
  const isMinistryLeader = user?.roleName === 'Registration Team' && !!user?.ministryRoleId;

  // Tab list differs by role:
  // Ministry Leader → only "My Members"
  // Member          → only "Substitute Requests"
  // Everyone else   → Assignments + Roles + Substitute Requests
  const tabs = isMinistryLeader
    ? [{ key: 'roster', label: '👥 My Members' }]
    : isMember
      ? [{ key: 'substitutes', label: '🔄 Substitute Requests' }]
      : [
          { key: 'assignments', label: '📋 Assignments' },
          { key: 'roles',       label: '🎭 Roles' },
          { key: 'substitutes', label: '🔄 Substitute Requests' },
        ];

  const defaultTab = isMinistryLeader ? 'roster' : isMember ? 'substitutes' : 'assignments';
  const [tab, setTab] = useState(defaultTab);

  return (
    <div style={{ ...S.page, padding: isMobile ? '16px 12px' : '28px 32px' }}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Ministry</h1>
          <p style={S.subtitle}>
            {isMinistryLeader
              ? 'Manage your ministry roster and event invites'
              : isMember
                ? 'Submit substitute requests for your ministry assignments'
                : 'Manage ministry roles and service assignments'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {tabs.map(t => (
          <button
            key={t.key}
            style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'assignments' && <AssignmentsTab />}
      {tab === 'roles'       && <RolesTab />}
      {tab === 'roster'      && <RosterTab ministryRoleId={user?.ministryRoleId} />}
      {tab === 'substitutes' && <SubstituteRequestsTab />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }
        table { width: 100%; border-collapse: collapse; }
        @media (max-width: 768px) {
          table td, table th { font-size: 11px !important; padding: 7px 8px !important; white-space: nowrap; }
        }
        @media (max-width: 480px) {
          table td, table th { font-size: 10.5px !important; padding: 6px !important; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Roster Tab (Ministry Leader only)
───────────────────────────────────────────────────────────── */
function RosterTab({ ministryRoleId }) {
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [addSearch,  setAddSearch]  = useState('');
  const [addResults, setAddResults] = useState([]);
  const [adding,     setAdding]     = useState(false);
  const [removing,   setRemoving]   = useState(null);
  const [actionErr,  setActionErr]  = useState('');
  const searchTimeout = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await axiosInstance.get('/ministry/members');
      setMembers(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load roster.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddSearch = (val) => {
    setAddSearch(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setAddResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(`/ministry/members/search?q=${encodeURIComponent(val)}`);
        const found = res.data.data || [];
        const existingIds = new Set(members.map(m => m.member?.id || m.member_id));
        setAddResults(found.filter(m => !existingIds.has(m.id)));
      } catch {}
    }, 300);
  };

  const handleAdd = async (member) => {
    setAdding(true); setActionErr('');
    try {
      await axiosInstance.post('/ministry/members', { member_id: member.id });
      setAddSearch(''); setAddResults([]);
      load();
    } catch (e) {
      setActionErr(e.response?.data?.message || 'Failed to add member.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!window.confirm('Remove this member from the roster?')) return;
    setRemoving(memberId); setActionErr('');
    try {
      await axiosInstance.delete(`/ministry/members/${memberId}`);
      load();
    } catch (e) {
      setActionErr(e.response?.data?.message || 'Failed to remove member.');
    } finally {
      setRemoving(null);
    }
  };

  const filtered = members.filter(m => {
    const name = `${m.member?.first_name || ''} ${m.member?.last_name || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <>
      {/* Add member search */}
      <div style={{ ...S.tableCard, padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#005599', marginBottom: '12px' }}>Add Member to Roster</div>
        <div style={{ position: 'relative' }}>
          <input
            value={addSearch}
            onChange={e => handleAddSearch(e.target.value)}
            placeholder="Search by name to add a member…"
            style={{ ...S.searchInput, paddingLeft: '14px', width: '100%', boxSizing: 'border-box' }}
          />
          {addResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20 }}>
              {addResults.map(m => (
                <div
                  key={m.id}
                  onClick={() => !adding && handleAdd(m)}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <span>{m.last_name}, {m.first_name}</span>
                  <span style={{ fontSize: '11px', color: '#0066b3', fontWeight: '600' }}>+ Add</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {actionErr && <div style={{ marginTop: 8, color: '#dc2626', fontSize: '13px' }}>⚠ {actionErr}</div>}
      </div>

      <div style={S.toolbar}>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roster…" style={S.searchInput} />
          {search && <button style={S.clearBtn} onClick={() => setSearch('')}>✕</button>}
        </div>
        <div style={S.countBadge}>{filtered.length} member{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      {error && <div style={S.errBanner}><span>⚠ {error}</span><button onClick={load} style={S.retryBtn}>Retry</button></div>}

      <div style={S.tableCard}>
        {loading ? (
          <div style={S.centerMsg}><div style={S.spinner} /><span style={{ color: '#64748b', marginTop: '12px' }}>Loading…</span></div>
        ) : filtered.length === 0 ? (
          <div style={S.centerMsg}>
            <span style={S.emptyIcon}>👥</span>
            <span style={S.emptyTitle}>{search ? 'No matches found' : 'No members in roster yet'}</span>
            <span style={S.emptyHint}>{search ? `No results for "${search}"` : 'Use the search above to add members.'}</span>
          </div>
        ) : (
          <div style={S.tableScroll}><table style={S.table}>
            <thead>
              <tr style={S.thead}>
                <th style={S.th}>#</th>
                <th style={S.th}>Member</th>
                <th style={S.th}>Email</th>
                <th style={S.th}>Phone</th>
                <th style={S.th}>Status</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const m = row.member || {};
                const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || '—';
                return (
                  <tr key={row.id} style={S.row}>
                    <td style={{ ...S.td, color: '#94a3b8', fontWeight: 500 }}>{i + 1}</td>
                    <td style={S.td}>
                      <div style={S.nameCell}>
                        <div style={S.avatar}>{name[0]?.toUpperCase() || '?'}</div>
                        <span style={S.nameTxt}>{name}</span>
                      </div>
                    </td>
                    <td style={{ ...S.td, color: '#64748b' }}>{m.email || '—'}</td>
                    <td style={{ ...S.td, color: '#64748b' }}>{m.phone || '—'}</td>
                    <td style={S.td}>
                      <span style={{ ...S.pill, ...(m.status === 'Active' ? S.pillGreen : S.pillGray) }}>
                        {m.status || '—'}
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <button
                        style={{ ...S.deleteBtn, opacity: removing === m.id ? 0.6 : 1 }}
                        onClick={() => handleRemove(m.id)}
                        disabled={removing === m.id}
                      >
                        {removing === m.id ? '…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Assignments Tab
───────────────────────────────────────────────────────────── */
function AssignmentsTab() {
  const { hasPermission } = useAuth();
  const canAdd    = hasPermission('ministry', 'create');
  const canEdit   = hasPermission('ministry', 'update');
  const canRemove = hasPermission('ministry', 'delete');
  const [assignments, setAssignments] = useState([]);
  const [roles,       setRoles]       = useState([]);
  const [members,     setMembers]     = useState([]);
  const [services,    setServices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [modal,   setModal]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState({ service_id: '', member_id: '', ministry_role_id: '' });
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [delErr,    setDelErr]    = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [aRes, rRes, mRes, sRes] = await Promise.all([
        axiosInstance.get('/ministry/assignments'),
        axiosInstance.get('/ministry/roles'),
        axiosInstance.get('/members?limit=500'),
        axiosInstance.get('/services?limit=500'),
      ]);
      setAssignments(aRes.data.data || []);
      setRoles(rRes.data.data || []);
      setMembers(mRes.data.data?.members || []);
      setServices(sRes.data.data?.services || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load assignments.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm({ service_id: '', member_id: '', ministry_role_id: '' }); setFormErr(''); setEditing(null); setModal('add'); };
  const openEdit = (a) => {
    setForm({ service_id: a.service_id || a.Service?.id || '', member_id: a.member_id || a.Member?.id || '', ministry_role_id: a.ministry_role_id || a.ministryRole?.id || '', confirmed: a.confirmed || 0, substitute_requested: a.substitute_requested || 0 });
    setFormErr(''); setEditing(a); setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditing(null); setFormErr(''); };

  const handleSave = async () => {
    if (!form.service_id || !form.member_id || !form.ministry_role_id) { setFormErr('Service, member, and role are all required.'); return; }
    setSaving(true); setFormErr('');
    try {
      if (modal === 'add') {
        await axiosInstance.post('/ministry/assignments', { service_id: Number(form.service_id), member_id: Number(form.member_id), ministry_role_id: Number(form.ministry_role_id) });
      } else {
        await axiosInstance.put(`/ministry/assignments/${editing.id}`, { ministry_role_id: Number(form.ministry_role_id), confirmed: Number(form.confirmed), substitute_requested: Number(form.substitute_requested) });
      }
      closeModal(); load();
    } catch (e) { setFormErr(e.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true); setDelErr('');
    try { await axiosInstance.delete(`/ministry/assignments/${delTarget.id}`); setDelTarget(null); load(); }
    catch (e) { setDelErr(e.response?.data?.message || 'Delete failed.'); }
    finally { setDeleting(false); }
  };

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    const name = `${a.Member?.first_name || ''} ${a.Member?.last_name || ''}`.toLowerCase();
    return name.includes(q) || a.ministryRole?.name?.toLowerCase().includes(q) || a.Service?.title?.toLowerCase().includes(q);
  });

  return (
    <>
      <div style={S.toolbar}>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member, role, or service…" style={S.searchInput} />
          {search && <button style={S.clearBtn} onClick={() => setSearch('')}>✕</button>}
        </div>
        <div style={S.countBadge}>{filtered.length} assignment{filtered.length !== 1 ? 's' : ''}</div>
        {canAdd && <button style={S.addBtn} onClick={openAdd}>+ New Assignment</button>}
      </div>
      {error && <div style={S.errBanner}><span>⚠ {error}</span><button onClick={load} style={S.retryBtn}>Retry</button></div>}
      <div style={S.tableCard}>
        {loading ? (
          <div style={S.centerMsg}><div style={S.spinner} /><span style={{ color:'#64748b', marginTop:'12px' }}>Loading…</span></div>
        ) : filtered.length === 0 ? (
          <div style={S.centerMsg}><span style={S.emptyIcon}>📋</span><span style={S.emptyTitle}>{search ? 'No matches found' : 'No assignments yet'}</span><span style={S.emptyHint}>{search ? `No results for "${search}"` : 'Click "+ New Assignment" to get started.'}</span></div>
        ) : (
          <div style={S.tableScroll}><table style={S.table}>
            <thead><tr style={S.thead}><th style={S.th}>#</th><th style={S.th}>Member</th><th style={S.th}>Ministry Role</th><th style={S.th}>Service</th><th style={S.th}>Date</th><th style={S.th}>Status</th><th style={{ ...S.th, textAlign:'right' }}>Actions</th></tr></thead>
            <tbody>
              {filtered.map((a, i) => {
                const memberName = a.Member ? `${a.Member.first_name} ${a.Member.last_name}` : '—';
                return (
                  <tr key={a.id} style={S.row}>
                    <td style={{ ...S.td, color:'#94a3b8', fontWeight:500 }}>{i + 1}</td>
                    <td style={S.td}><div style={S.nameCell}><div style={S.avatar}>{memberName[0]?.toUpperCase() || '?'}</div><span style={S.nameTxt}>{memberName}</span></div></td>
                    <td style={S.td}><span style={S.rolePill}>{a.ministryRole?.name || '—'}</span></td>
                    <td style={{ ...S.td, maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.Service?.title || '—'}</td>
                    <td style={S.td}>{fmtDate(a.Service?.service_date)}</td>
                    <td style={S.td}><div style={S.statusCol}><span style={{ ...S.pill, ...(a.confirmed ? S.pillGreen : S.pillGray) }}>{a.confirmed ? 'Confirmed' : 'Pending'}</span>{a.substitute_requested ? <span style={{ ...S.pill, ...S.pillOrange }}>Sub Requested</span> : null}</div></td>
                    <td style={{ ...S.td, textAlign:'right' }}>{canEdit && <button style={S.editBtn} onClick={() => openEdit(a)}>Edit</button>}{canRemove && <button style={S.deleteBtn} onClick={() => { setDelTarget(a); setDelErr(''); }}>Remove</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
      {modal && (
        <div style={S.backdrop} onClick={closeModal}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalAccent} />
            <div style={S.modalBody}>
              <h3 style={S.modalTitle}>{modal === 'add' ? '+ New Assignment' : 'Edit Assignment'}</h3>
              <p style={S.modalSub}>{modal === 'add' ? 'Assign a member to a ministry role for a service.' : 'Update role or confirmation status.'}</p>
              {formErr && <div style={S.formErr}>⚠ {formErr}</div>}
              {modal === 'add' && (<>
                <div style={S.fieldGroup}><label style={S.label}>Service <span style={{ color:'#ef4444' }}>*</span></label><select value={form.service_id} onChange={e => { setForm({ ...form, service_id: e.target.value }); setFormErr(''); }} style={S.select}><option value="">— Select a service —</option>{services.map(s => <option key={s.id} value={s.id}>{s.title} ({fmtDate(s.service_date)})</option>)}</select></div>
                <div style={S.fieldGroup}><label style={S.label}>Member <span style={{ color:'#ef4444' }}>*</span></label><select value={form.member_id} onChange={e => { setForm({ ...form, member_id: e.target.value }); setFormErr(''); }} style={S.select}><option value="">— Select a member —</option>{members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}</select></div>
              </>)}
              <div style={S.fieldGroup}><label style={S.label}>Ministry Role <span style={{ color:'#ef4444' }}>*</span></label><select value={form.ministry_role_id} onChange={e => { setForm({ ...form, ministry_role_id: e.target.value }); setFormErr(''); }} style={S.select}><option value="">— Select a role —</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              {modal === 'edit' && (<div style={{ display:'flex', gap:'20px', marginBottom:'4px' }}><label style={S.checkLabel}><input type="checkbox" checked={!!form.confirmed} onChange={e => setForm({ ...form, confirmed: e.target.checked ? 1 : 0 })} style={{ marginRight:'8px', accentColor:'#005599' }} />Confirmed</label><label style={S.checkLabel}><input type="checkbox" checked={!!form.substitute_requested} onChange={e => setForm({ ...form, substitute_requested: e.target.checked ? 1 : 0 })} style={{ marginRight:'8px', accentColor:'#f59e0b' }} />Substitute Requested</label></div>)}
              <div style={S.modalActions}>
                <button style={S.cancelBtn} onClick={closeModal} disabled={saving}>Cancel</button>
                <button style={{ ...S.saveBtn, opacity: saving ? 0.8 : 1 }} onClick={handleSave} disabled={saving}>{saving ? <span style={S.loadRow}><span style={S.miniSpinner} />{modal === 'add' ? 'Assigning…' : 'Saving…'}</span> : modal === 'add' ? 'Create Assignment' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {delTarget && (
        <div style={S.backdrop} onClick={() => setDelTarget(null)}>
          <div style={{ ...S.modalBox, maxWidth:'420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ ...S.modalAccent, background:'#ef4444' }} />
            <div style={S.modalBody}>
              <div style={S.delIcon}>🗑️</div>
              <h3 style={S.modalTitle}>Remove Assignment?</h3>
              <p style={S.modalSub}>Remove <strong>{delTarget.Member?.first_name} {delTarget.Member?.last_name}</strong> as <strong>{delTarget.ministryRole?.name}</strong> from <strong>{delTarget.Service?.title}</strong>?</p>
              {delErr && <div style={{ ...S.formErr, marginBottom:'12px' }}>⚠ {delErr}</div>}
              <div style={S.modalActions}>
                <button style={S.cancelBtn} onClick={() => setDelTarget(null)} disabled={deleting}>Cancel</button>
                <button style={{ ...S.saveBtn, background:'#ef4444', opacity: deleting ? 0.8 : 1 }} onClick={handleDelete} disabled={deleting}>{deleting ? <span style={S.loadRow}><span style={S.miniSpinner} />Removing…</span> : 'Yes, Remove'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Roles Tab — shows member_count badge per role
───────────────────────────────────────────────────────────── */
function RolesTab() {
  const { hasPermission } = useAuth();
  const canAdd    = hasPermission('ministry', 'create');
  const canEdit   = hasPermission('ministry', 'update');
  const canRemove = hasPermission('ministry', 'delete');
  const [roles,   setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [name,    setName]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [delErr,    setDelErr]    = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await axiosInstance.get('/ministry/roles'); setRoles(res.data.data || []); }
    catch (e) { setError(e.response?.data?.message || 'Failed to load roles.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setName(''); setFormErr(''); setEditing(null); setModal('add'); };
  const openEdit = (r) => { setName(r.name); setFormErr(''); setEditing(r); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditing(null); setFormErr(''); };

  const handleSave = async () => {
    if (!name.trim()) { setFormErr('Role name is required.'); return; }
    setSaving(true); setFormErr('');
    try {
      if (modal === 'add') { await axiosInstance.post('/ministry/roles', { name: name.trim() }); }
      else { await axiosInstance.put(`/ministry/roles/${editing.id}`, { name: name.trim() }); }
      closeModal(); load();
    } catch (e) { setFormErr(e.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true); setDelErr('');
    try { await axiosInstance.delete(`/ministry/roles/${delTarget.id}`); setDelTarget(null); load(); }
    catch (e) { setDelErr(e.response?.data?.message || 'Delete failed.'); }
    finally { setDeleting(false); }
  };

  const filtered = roles.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div style={S.toolbar}>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles…" style={S.searchInput} />
          {search && <button style={S.clearBtn} onClick={() => setSearch('')}>✕</button>}
        </div>
        <div style={S.countBadge}>{filtered.length} role{filtered.length !== 1 ? 's' : ''}</div>
        {canAdd && <button style={S.addBtn} onClick={openAdd}>+ New Role</button>}
      </div>
      {error && <div style={S.errBanner}><span>⚠ {error}</span><button onClick={load} style={S.retryBtn}>Retry</button></div>}
      <div style={S.tableCard}>
        {loading
          ? <div style={S.centerMsg}><div style={S.spinner} /></div>
          : filtered.length === 0
            ? <div style={S.centerMsg}><span style={S.emptyIcon}>🎭</span><span style={S.emptyTitle}>{search ? 'No matches found' : 'No roles yet'}</span><span style={S.emptyHint}>{search ? `No results for "${search}"` : 'Click "+ New Role" to create the first ministry role.'}</span></div>
            : <div style={S.tableScroll}><table style={S.table}>
                <thead>
                  <tr style={S.thead}>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Role Name</th>
                    <th style={S.th}>Members</th>
                    <th style={{ ...S.th, textAlign:'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={S.row}>
                      <td style={{ ...S.td, color:'#94a3b8', fontWeight:500, width:'48px' }}>{i + 1}</td>
                      <td style={S.td}>
                        <div style={S.nameCell}>
                          <div style={{ ...S.avatar, background:'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>{r.name?.[0]?.toUpperCase() || '?'}</div>
                          <span style={S.nameTxt}>{r.name}</span>
                        </div>
                      </td>
                      <td style={S.td}>
                        {/* Member count badge */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: r.member_count > 0 ? '#eff6ff' : '#f8fafc',
                          color: r.member_count > 0 ? '#1d4ed8' : '#94a3b8',
                          fontSize: '12px', fontWeight: '700',
                          padding: '3px 10px', borderRadius: '20px',
                        }}>
                          👥 {r.member_count || 0}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign:'right' }}>
                        {canEdit   && <button style={S.editBtn}   onClick={() => openEdit(r)}>Edit</button>}
                        {canRemove && <button style={S.deleteBtn} onClick={() => { setDelTarget(r); setDelErr(''); }}>Delete</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
        }
      </div>
      {modal && (<div style={S.backdrop} onClick={closeModal}><div style={{ ...S.modalBox, maxWidth:'440px' }} onClick={e => e.stopPropagation()}><div style={S.modalAccent} /><div style={S.modalBody}><h3 style={S.modalTitle}>{modal === 'add' ? '+ New Ministry Role' : 'Edit Role'}</h3><p style={S.modalSub}>{modal === 'add' ? 'Add a new ministry team (e.g. Choir, Media Team, Ushers…)' : `Editing: ${editing?.name}`}</p>{formErr && <div style={S.formErr}>⚠ {formErr}</div>}<div style={S.fieldGroup}><label style={S.label}>Role Name <span style={{ color:'#ef4444' }}>*</span></label><input value={name} onChange={e => { setName(e.target.value); setFormErr(''); }} placeholder="e.g. Worship Leader" autoFocus style={S.input} /></div><div style={S.modalActions}><button style={S.cancelBtn} onClick={closeModal} disabled={saving}>Cancel</button><button style={{ ...S.saveBtn, opacity: saving ? 0.8 : 1 }} onClick={handleSave} disabled={saving}>{saving ? <span style={S.loadRow}><span style={S.miniSpinner} />{modal === 'add' ? 'Creating…' : 'Saving…'}</span> : modal === 'add' ? 'Create Role' : 'Save Changes'}</button></div></div></div></div>)}
      {delTarget && (<div style={S.backdrop} onClick={() => setDelTarget(null)}><div style={{ ...S.modalBox, maxWidth:'420px' }} onClick={e => e.stopPropagation()}><div style={{ ...S.modalAccent, background:'#ef4444' }} /><div style={S.modalBody}><div style={S.delIcon}>🗑️</div><h3 style={S.modalTitle}>Delete Role?</h3><p style={S.modalSub}>Delete <strong>"{delTarget.name}"</strong>? This cannot be undone. Roles with active assignments or roster members cannot be deleted.</p>{delErr && <div style={{ ...S.formErr, marginBottom:'12px' }}>⚠ {delErr}</div>}<div style={S.modalActions}><button style={S.cancelBtn} onClick={() => setDelTarget(null)} disabled={deleting}>Cancel</button><button style={{ ...S.saveBtn, background:'#ef4444', opacity: deleting ? 0.8 : 1 }} onClick={handleDelete} disabled={deleting}>{deleting ? <span style={S.loadRow}><span style={S.miniSpinner} />Deleting…</span> : 'Yes, Delete'}</button></div></div></div></div>)}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Substitute Requests Tab
───────────────────────────────────────────────────────────── */
function SubstituteRequestsTab() {
  const [requests, setRequests]   = useState([]);
  const [services, setServices]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [formError,setFormError]  = useState('');
  const [form,     setForm]       = useState({ service_id: '', reason: '', proposed_member_id: '' });
  const [memberSearch,  setMemberSearch]  = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const searchTimeout = useRef(null);

  const STATUS_META = {
    pending:  { bg: '#fffbeb', color: '#d97706', label: 'Pending' },
    approved: { bg: '#dcfce7', color: '#16a34a', label: 'Approved' },
    rejected: { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, svcRes] = await Promise.all([
        axiosInstance.get('/services/substitutes/mine'),
        axiosInstance.get('/services?limit=100'),
      ]);
      const all = subRes.data.data || [];
      setRequests(Array.isArray(all) ? all : []);
      setServices(svcRes.data.data?.services || []);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMemberSearch = (val) => {
    setMemberSearch(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setMemberResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try { const res = await axiosInstance.get(`/members?search=${encodeURIComponent(val)}&limit=5`); setMemberResults(res.data.data?.members || []); } catch {}
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.service_id || !form.reason.trim()) { setFormError('Please select a service and provide a reason.'); return; }
    setSaving(true); setFormError('');
    try {
      await axiosInstance.post('/services/substitutes', { service_id: Number(form.service_id), reason: form.reason, ...(form.proposed_member_id && { proposed_member_id: Number(form.proposed_member_id) }) });
      setShowForm(false); setForm({ service_id: '', reason: '', proposed_member_id: '' }); setMemberSearch(''); fetchData();
    } catch (err) { setFormError(err.response?.data?.message || 'Failed to submit request.'); }
    finally { setSaving(false); }
  };

  const publishedServices = services.filter(s => s.status === 'published');

  return (
    <>
      <div style={S.toolbar}><button onClick={() => { setShowForm(!showForm); setFormError(''); }} style={S.addBtn}>{showForm ? '✕ Cancel' : '+ New Request'}</button></div>
      {showForm && (
        <div style={{ ...S.tableCard, padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px' }}>Submit Substitute Request</h3>
          {formError && <div style={S.formErr}>{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div style={S.fieldGroup}><label style={S.label}>Service *</label><select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} style={S.select} required><option value="">— Select a service —</option>{publishedServices.map(s => <option key={s.id} value={s.id}>{s.title} — {fmtDate(s.service_date)}</option>)}</select></div>
            <div style={S.fieldGroup}><label style={S.label}>Reason *</label><textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Explain why you cannot attend this service..." rows={3} style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit' }} required /></div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Proposed Replacement (optional)</label>
              <div style={{ position: 'relative' }}>
                <input type="text" value={memberSearch} onChange={e => handleMemberSearch(e.target.value)} placeholder="Search member by name..." style={S.input} />
                {memberResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10 }}>
                    {memberResults.map(m => <div key={m.id} onClick={() => { setForm({ ...form, proposed_member_id: m.id }); setMemberSearch(`${m.last_name}, ${m.first_name}`); setMemberResults([]); }} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#f0f6ff'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>{m.last_name}, {m.first_name}</div>)}
                  </div>
                )}
              </div>
              {form.proposed_member_id && <p style={{ fontSize: '12px', color: '#16a34a', margin: '4px 0 0' }}>✓ Replacement selected</p>}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button type="button" onClick={() => setShowForm(false)} style={S.cancelBtn}>Cancel</button><button type="submit" disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }}>{saving ? 'Submitting...' : 'Submit Request'}</button></div>
          </form>
        </div>
      )}
      {error && <div style={S.errBanner}>{error}</div>}
      {loading ? <div style={S.centerMsg}><div style={S.spinner} /></div>
      : requests.length === 0 ? <div style={S.centerMsg}><div style={S.emptyIcon}>🔄</div><div style={S.emptyTitle}>No substitute requests yet</div><div style={S.emptyHint}>Click "+ New Request" to submit one.</div></div>
      : <div style={S.tableCard}><div style={S.tableScroll}><table style={S.table}><thead><tr style={S.thead}><th style={S.th}>Service</th><th style={S.th}>Reason</th><th style={S.th}>Proposed Replacement</th><th style={S.th}>Status</th><th style={S.th}>Submitted</th></tr></thead><tbody>{requests.map(r => { const meta = STATUS_META[r.status] || STATUS_META.pending; const serviceTitle = r.assignment?.Service?.title || `Service #${r.assignment?.service_id || '—'}`; const proposed = r.proposedSubstituteUser?.member; return (<tr key={r.id} style={S.row}><td style={{ ...S.td, fontWeight: '600', color: '#0f172a' }}>{serviceTitle}</td><td style={{ ...S.td, maxWidth: '220px', color: '#374151' }}>{r.reason}</td><td style={S.td}>{proposed ? `${proposed.last_name}, ${proposed.first_name}` : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>}</td><td style={S.td}><span style={{ ...S.pill, background: meta.bg, color: meta.color }}>{meta.label}</span></td><td style={{ ...S.td, color: '#64748b' }}>{fmtDate(r.created_at)}</td></tr>); })}</tbody></table></div></div>}
    </>
  );
}

const S = {
  page:       { padding:'28px 32px', fontFamily:"'Inter',-apple-system,sans-serif" },
  header:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px' },
  title:      { fontSize:'24px', fontWeight:'800', color:'#0f172a', margin:'0 0 4px', letterSpacing:'-0.3px' },
  subtitle:   { fontSize:'14px', color:'#64748b', margin:0 },
  tabs:       { display:'flex', gap:'4px', marginBottom:'24px', background:'#f1f5f9', padding:'4px', borderRadius:'10px', width:'fit-content', flexWrap:'wrap' },
  tab:        { background:'transparent', border:'none', borderRadius:'8px', padding:'8px 20px', fontSize:'13px', fontWeight:'600', color:'#64748b', cursor:'pointer', transition:'all 0.15s' },
  tabActive:  { background:'#fff', color:'#005599', boxShadow:'0 1px 4px rgba(0,0,0,0.1)' },
  toolbar:    { display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', flexWrap:'wrap' },
  searchWrap: { position:'relative', flex:1, minWidth: 0 },
  searchIcon: { position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', opacity:0.45, pointerEvents:'none' },
  searchInput:{ width:'100%', padding:'10px 36px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', outline:'none', boxSizing:'border-box', background:'#fff', color:'#0f172a' },
  clearBtn:   { position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#94a3b8', padding:'2px 4px' },
  countBadge: { fontSize:'13px', color:'#64748b', fontWeight:'600', background:'#f1f5f9', padding:'6px 14px', borderRadius:'20px' },
  addBtn:     { background:'linear-gradient(135deg,#003d70,#005599)', color:'#fff', border:'none', borderRadius:'10px', padding:'11px 20px', fontSize:'14px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap' },
  errBanner:  { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  retryBtn:   { background:'none', border:'1px solid #dc2626', borderRadius:'6px', color:'#dc2626', fontSize:'12px', fontWeight:'600', cursor:'pointer', padding:'4px 10px' },
  tableCard:  { background:'#fff', borderRadius:'16px', border:'1px solid #e8f0fe', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,85,153,0.06)' },
  tableScroll:{ overflowX:'auto', WebkitOverflowScrolling:'touch' },
  table:      { width:'100%', borderCollapse:'collapse' },
  thead:      { background:'linear-gradient(90deg,#f8faff,#f0f6ff)' },
  th:         { padding:'13px 16px', fontSize:'11px', fontWeight:'700', color:'#64748b', textAlign:'left', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #e8f0fe' },
  row:        { borderBottom:'1px solid #f1f5f9' },
  td:         { padding:'14px 16px', fontSize:'14px', color:'#1e293b', background:'#fff', transition:'background 0.15s' },
  nameCell:   { display:'flex', alignItems:'center', gap:'10px' },
  avatar:     { width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#005599,#13B5EA)', color:'#fff', fontSize:'13px', fontWeight:'800', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  nameTxt:    { fontWeight:'600', color:'#0f172a' },
  rolePill:   { background:'#f5f3ff', color:'#7c3aed', fontSize:'12px', fontWeight:'600', padding:'3px 10px', borderRadius:'20px' },
  statusCol:  { display:'flex', flexDirection:'column', gap:'4px' },
  pill:       { fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'20px', display:'inline-block' },
  pillGreen:  { background:'#f0fdf4', color:'#16a34a' },
  pillGray:   { background:'#f1f5f9', color:'#64748b' },
  pillOrange: { background:'#fffbeb', color:'#d97706' },
  editBtn:    { background:'#e8f4fd', color:'#005599', border:'none', borderRadius:'7px', padding:'6px 14px', fontSize:'12px', fontWeight:'700', cursor:'pointer', marginRight:'6px' },
  deleteBtn:  { background:'#fef2f2', color:'#ef4444', border:'none', borderRadius:'7px', padding:'6px 14px', fontSize:'12px', fontWeight:'700', cursor:'pointer' },
  centerMsg:  { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'64px 24px', gap:'8px' },
  spinner:    { width:'32px', height:'32px', border:'3px solid #e2e8f0', borderTop:'3px solid #005599', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  emptyIcon:  { fontSize:'48px', lineHeight:1, marginBottom:'4px' },
  emptyTitle: { fontSize:'16px', fontWeight:'700', color:'#374151' },
  emptyHint:  { fontSize:'13px', color:'#94a3b8' },
  backdrop:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'24px' },
  modalBox:   { background:'#fff', borderRadius:'20px', width:'100%', maxWidth:'520px', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  modalAccent:{ height:'5px', background:'linear-gradient(90deg,#003d70,#005599,#13B5EA)' },
  modalBody:  { padding:'32px 36px 28px' },
  modalTitle: { fontSize:'20px', fontWeight:'800', color:'#0f172a', margin:'0 0 6px', letterSpacing:'-0.2px' },
  modalSub:   { fontSize:'13px', color:'#64748b', margin:'0 0 24px', lineHeight:'1.5' },
  formErr:    { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', marginBottom:'20px' },
  fieldGroup: { display:'flex', flexDirection:'column', gap:'6px', marginBottom:'20px' },
  label:      { fontSize:'12px', fontWeight:'700', color:'#374151', textTransform:'uppercase', letterSpacing:'0.4px' },
  input:      { padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', outline:'none', color:'#0f172a', background:'#fafbfc' },
  select:     { padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', outline:'none', color:'#0f172a', background:'#fafbfc', cursor:'pointer' },
  checkLabel: { display:'flex', alignItems:'center', fontSize:'14px', color:'#374151', fontWeight:'500', cursor:'pointer', marginBottom:'20px' },
  modalActions:{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'8px' },
  cancelBtn:  { background:'#f1f5f9', color:'#374151', border:'none', borderRadius:'10px', padding:'11px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  saveBtn:    { background:'linear-gradient(135deg,#003d70,#005599)', color:'#fff', border:'none', borderRadius:'10px', padding:'11px 22px', fontSize:'14px', fontWeight:'700', cursor:'pointer' },
  loadRow:    { display:'flex', alignItems:'center', gap:'8px' },
  miniSpinner:{ display:'inline-block', width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  delIcon:    { fontSize:'36px', marginBottom:'12px' },
};
