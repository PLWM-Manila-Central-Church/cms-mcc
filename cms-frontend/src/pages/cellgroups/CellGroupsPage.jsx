import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

const EMPTY_FORM = { name: '', area: '' };

export default function CellGroupsPage() {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const canCreate = hasPermission('cellgroups', 'create');
  const canUpdate = hasPermission('cellgroups', 'update');
  const canDelete = hasPermission('cellgroups', 'delete');

  const [groups,    setGroups]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  // Modal state
  const [modal,     setModal]     = useState(null); // null | 'add' | 'edit'
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm state
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [delError,  setDelError]  = useState('');

  // Toast
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/cellgroups');
      setGroups(res.data.data || []);
    } catch {
      showToast('Failed to load cell groups.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Modal helpers ────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal('add');
  };

  const openEdit = (g) => {
    setSelected(g);
    setForm({ name: g.name || '', area: g.area || '' });
    setFormError('');
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (modal === 'add') {
        await axiosInstance.post('/cellgroups', form);
        showToast('Cell group created.');
      } else {
        await axiosInstance.put(`/cellgroups/${selected.id}`, form);
        showToast('Cell group updated.');
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    setDelError('');
    try {
      await axiosInstance.delete(`/cellgroups/${delTarget.id}`);
      showToast('Cell group deleted.');
      setDelTarget(null);
      load();
    } catch (err) {
      setDelError(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtered list ────────────────────────────────────────────
  const filtered = groups.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.area?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ ...S.page, padding: isMobile ? '16px 12px' : '32px' }}>

      {/* ── Header ── */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Cell Groups</h1>
          <p style={S.pageSubtitle}>Manage church cell groups and their areas</p>
        </div>
        {canCreate && (
          <button onClick={openAdd} style={S.addBtn}>
            + New Cell Group
          </button>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div style={S.statsRow}>
        <div style={S.statCard}>
          <span style={S.statNum}>{groups.length}</span>
          <span style={S.statLabel}>Total Groups</span>
        </div>
        <div style={S.statCard}>
          <span style={S.statNum}>{[...new Set(groups.map(g => g.area).filter(Boolean))].length}</span>
          <span style={S.statLabel}>Areas</span>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={S.toolbar}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <span style={S.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search by name or area…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={S.search}
          />
          {search && (
            <button onClick={() => setSearch('')} style={S.clearSearch}>✕</button>
          )}
        </div>
        <span style={S.resultCount}>
          {filtered.length} of {groups.length} groups
        </span>
      </div>

      {/* ── Table ── */}
      <div style={S.tableWrap}>
        {loading ? (
          <div style={S.empty}>
            <div style={S.spinner} />
            <p>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={S.emptyIcon}>🏘️</div>
            <p style={S.emptyTitle}>{search ? 'No results found' : 'No cell groups yet'}</p>
            <p style={S.emptyHint}>
              {search ? 'Try a different search term.' : canCreate ? 'Click "+ New Cell Group" to add the first one.' : 'No cell groups have been created.'}
            </p>
          </div>
        ) : (
          <div style={S.tableScroll}><table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={S.th}>Name</th>
                <th style={S.th}>Area</th>
                <th style={S.th}>Members</th>
                {(canUpdate || canDelete) && <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => (
                <tr key={g.id} style={S.tr}>
                  <td style={S.td}><span style={S.rowNum}>{i + 1}</span></td>
                  <td style={S.td}>
                    <div style={S.groupNameRow}>
                      <div style={S.groupAvatar}>
                        {g.name?.charAt(0).toUpperCase()}
                      </div>
                      <span style={S.groupName}>{g.name}</span>
                    </div>
                  </td>
                  <td style={S.td}>
                    {g.area
                      ? <span style={S.areaBadge}>{g.area}</span>
                      : <span style={S.noArea}>—</span>
                    }
                  </td>
                  <td style={S.td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                      {g.memberCount ?? 0}
                    </span>
                  </td>
                  {(canUpdate || canDelete) && (
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <div style={S.actionsRow}>
                        {canUpdate && (
                          <button onClick={() => openEdit(g)} style={S.editBtn}>
                            ✏️ Edit
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => { setDelTarget(g); setDelError(''); }} style={S.deleteBtn}>
                            🗑 Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>
                {modal === 'add' ? '+ New Cell Group' : 'Edit Cell Group'}
              </h2>
              <button onClick={closeModal} style={S.closeBtn}>✕</button>
            </div>

            {formError && (
              <div style={S.errorBox}>⚠ {formError}</div>
            )}

            <form onSubmit={handleSubmit} style={S.modalForm}>
              <div style={S.field}>
                <label style={S.label}>Group Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setFormError(''); }}
                  placeholder="e.g. Victory Cell Group"
                  required
                  autoFocus
                  style={S.input}
                />
              </div>

              <div style={S.field}>
                <label style={S.label}>Area <span style={S.optional}>(optional)</span></label>
                <input
                  type="text"
                  value={form.area}
                  onChange={e => setForm({ ...form, area: e.target.value })}
                  placeholder="e.g. Parañaque, BGC, Alabang"
                  style={S.input}
                />
              </div>

              <div style={S.modalFooter}>
                <button type="button" onClick={closeModal} style={S.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.8 : 1 }}>
                  {saving
                    ? <><span style={S.btnSpinner} /> Saving…</>
                    : modal === 'add' ? 'Create Group' : 'Save Changes'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {delTarget && (
        <div style={S.overlay} onClick={() => !deleting && setDelTarget(null)}>
          <div style={{ ...S.modal, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={{ ...S.modalTitle, color: '#dc2626' }}>Delete Cell Group</h2>
              <button onClick={() => setDelTarget(null)} style={S.closeBtn} disabled={deleting}>✕</button>
            </div>

            <div style={S.delBody}>
              <div style={S.delIcon}>🗑</div>
              <p style={S.delText}>
                Are you sure you want to delete <strong>"{delTarget.name}"</strong>?
              </p>
              <p style={S.delHint}>
                This cannot be undone. Groups with assigned members cannot be deleted.
              </p>
              {delError && <div style={S.errorBox}>⚠ {delError}</div>}
            </div>

            <div style={S.modalFooter}>
              <button onClick={() => setDelTarget(null)} style={S.cancelBtn} disabled={deleting}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ ...S.saveBtn, background: '#dc2626' }}>
                {deleting ? <><span style={S.btnSpinner} /> Deleting…</> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type === 'error' ? '#dc2626' : '#005599' }}>
          {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        table tr:hover td { background: #f0f6ff !important; }
        table { width: 100%; border-collapse: collapse; }
        @media (max-width: 768px) {
          table td, table th { font-size: 12px !important; padding: 8px 10px !important; white-space: nowrap; }
        }
        @media (max-width: 480px) {
          table td, table th { font-size: 11px !important; padding: 6px 8px !important; }
        }
      `}</style>
    </div>
  );
}

const S = {
  page:        { padding: '32px', fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif" },

  pageHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  pageTitle:   { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.3px' },
  pageSubtitle:{ fontSize: '14px', color: '#64748b', margin: 0 },

  addBtn:      { background: 'linear-gradient(135deg,#003d70,#005599,#13B5EA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.2px' },

  statsRow:    { display: 'flex', gap: '16px', marginBottom: '24px' },
  statCard:    { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' },
  statNum:     { fontSize: '28px', fontWeight: '800', color: '#005599', lineHeight: 1 },
  statLabel:   { fontSize: '12px', color: '#64748b', fontWeight: '600', letterSpacing: '0.4px', textTransform: 'uppercase' },

  toolbar:     { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchIcon:  { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.5, pointerEvents: 'none' },
  search:      { padding: '10px 36px 10px 36px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', width: '100%', minWidth: 0, color: '#0f172a', background: '#fafbfc' },
  clearSearch: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', color: '#94a3b8', padding: '2px 4px' },
  resultCount: { fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' },

  tableWrap:   { background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
  tableScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.6px', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr:          { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
  td:          { padding: '16px 20px', fontSize: '14px', color: '#374151', verticalAlign: 'middle' },

  rowNum:      { fontSize: '12px', color: '#94a3b8', fontWeight: '600' },
  groupNameRow:{ display: 'flex', alignItems: 'center', gap: '12px' },
  groupAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#005599,#13B5EA)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', flexShrink: 0 },
  groupName:   { fontWeight: '600', color: '#0f172a' },
  areaBadge:   { background: '#e8f4fd', color: '#005599', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: '600' },
  noArea:      { color: '#cbd5e1', fontSize: '13px' },
  dateText:    { fontSize: '13px', color: '#64748b' },

  actionsRow:  { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  editBtn:     { background: '#e8f4fd', color: '#005599', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn:   { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },

  empty:       { padding: '64px 32px', textAlign: 'center', color: '#94a3b8' },
  emptyIcon:   { fontSize: '40px', marginBottom: '12px' },
  emptyTitle:  { fontSize: '16px', fontWeight: '700', color: '#374151', margin: '0 0 6px' },
  emptyHint:   { fontSize: '14px', margin: 0 },
  spinner:     { width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #005599', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },

  // Modal
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal:       { background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', animation: 'slideIn 0.2s ease both', overflow: 'hidden' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 0' },
  modalTitle:  { fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 },
  closeBtn:    { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8', padding: '4px', lineHeight: 1 },
  modalForm:   { padding: '24px 28px 0' },
  modalFooter: { display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '20px 28px 24px', borderTop: '1px solid #f1f5f9', marginTop: '24px' },

  field:       { display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' },
  label:       { fontSize: '12px', fontWeight: '700', color: '#374151', letterSpacing: '0.4px', textTransform: 'uppercase' },
  optional:    { fontSize: '11px', color: '#94a3b8', fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input:       { padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', color: '#0f172a', background: '#fafbfc', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' },

  cancelBtn:   { background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '9px', padding: '11px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  saveBtn:     { background: 'linear-gradient(135deg,#003d70,#005599)', color: '#fff', border: 'none', borderRadius: '9px', padding: '11px 22px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  btnSpinner:  { display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', margin: '0 28px', marginTop: '12px' },

  // Delete modal
  delBody:     { padding: '20px 28px', textAlign: 'center' },
  delIcon:     { fontSize: '36px', marginBottom: '12px' },
  delText:     { fontSize: '15px', color: '#0f172a', margin: '0 0 8px', lineHeight: '1.5' },
  delHint:     { fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' },

  toast:       { position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom, 0px) + 8px)', right: '16px', color: '#fff', borderRadius: '10px', padding: '13px 20px', fontSize: '14px', fontWeight: '600', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', animation: 'slideIn 0.25s ease both', display: 'flex', alignItems: 'center', gap: '8px' },
};
