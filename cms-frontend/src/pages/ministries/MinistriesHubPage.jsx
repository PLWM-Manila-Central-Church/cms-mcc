import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import useIsMobile from '../../hooks/useIsMobile';
import MonoIcon from '../../components/common/MonoIcon';
import IconActionButton from '../../components/common/IconActionButton';
import { blockInvalidIntegerKeys, sanitizeCode, sanitizeWholeNumber } from '../../utils/inputConstraints';
import MinistryEngagementTabs from '../../components/ministries/MinistryEngagementTabs';
import { displayMemberName } from '../../utils/displayIdentity';

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  age_min: '',
  age_max: '',
  status: 'Active',
};

export default function MinistriesHubPage() {
  const { hasPermission } = useAuth();
  const { confirm } = useConfirmation();
  const isMobile = useIsMobile();

  const canCreate = hasPermission('members', 'create');
  const canUpdate = hasPermission('members', 'update');
  const canArchive = hasPermission('members', 'delete');

  const [ministries, setMinistries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [detailTab, setDetailTab] = useState('roster');

  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadMinistries = useCallback(async (preferredId = null) => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/ministries');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setMinistries(rows);
      setSelectedId((prev) => {
        const target = preferredId ?? prev;
        if (target && rows.some((r) => Number(r.id) === Number(target))) return Number(target);
        return rows[0]?.id ?? null;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load groups.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await axiosInstance.get(`/ministries/${id}`);
      setDetail(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load group details.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMinistries();
  }, [loadMinistries]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const totals = useMemo(() => {
    const totalMembers = ministries.reduce((sum, m) => sum + Number(m.member_count || 0), 0);
    const activeMembers = ministries.reduce((sum, m) => sum + Number(m.active_member_count || 0), 0);
    const inactiveMembers = ministries.reduce((sum, m) => sum + Number(m.inactive_member_count || 0), 0);
    return {
      ministries: ministries.length,
      totalMembers,
      activeMembers,
      inactiveMembers,
    };
  }, [ministries]);

  const filteredMembers = useMemo(() => {
    const list = Array.isArray(detail?.members) ? detail.members : [];
    const q = search.trim().toLowerCase();
    return list.filter((m) => {
      if (statusFilter !== 'All' && m.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${m.first_name || ''} ${m.last_name || ''} ${m.email || ''} ${m.phone || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [detail, search, statusFilter]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalMode('create');
    setError('');
  };

  const openEdit = () => {
    if (!detail) return;
    setForm({
      name: detail.name || '',
      code: detail.code || '',
      description: detail.description || '',
      age_min: detail.age_min ?? '',
      age_max: detail.age_max ?? '',
      status: detail.status || 'Active',
    });
    setModalMode('edit');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      age_min: form.age_min === '' ? null : Number(form.age_min),
      age_max: form.age_max === '' ? null : Number(form.age_max),
      status: form.status || 'Active',
    };
    try {
      if (modalMode === 'create') {
        const res = await axiosInstance.post('/ministries', payload);
        const createdId = res.data?.data?.id || null;
        setNotice(`Group "${payload.name}" created.`);
        setModalMode(null);
        await loadMinistries(createdId);
      } else if (detail?.id) {
        await axiosInstance.put(`/ministries/${detail.id}`, payload);
        setNotice(`Group "${payload.name}" updated.`);
        setModalMode(null);
        await loadMinistries(detail.id);
        await loadDetail(detail.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save group.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!detail?.id) return;
    const ok = await confirm({
      title: `Archive ${detail.name}?`,
      message: 'Members remain intact in the church directory. The group will be archived from active lists.',
      confirmText: 'Archive Group',
    });
    if (!ok) return;
    try {
      await axiosInstance.post(`/ministries/${detail.id}/archive`);
      setNotice(`Group "${detail.name}" archived.`);
      await loadMinistries();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to archive group.');
    }
  };

  return (
    <div className="mcc-module mcc-module-ministries-hub" style={S.page}>
      <div style={S.header}>
        <div>
          <h1 className="workspace-page-title" style={S.title}>Groups</h1>
          <p style={S.subtitle}>
            Life-stage and fellowship groups (High School, Young Adults, Men&apos;s, Women&apos;s, Elementary, Preschool, Toddlers).
          </p>
        </div>
        <div style={S.headerActions}>
          <Link to="/ministries" style={S.secondaryLink}>
            <MonoIcon name="groups" size={15} />
            <span>Ministries</span>
          </Link>
          {canCreate && (
            <button type="button" onClick={openCreate} style={S.primaryBtn}>
              <MonoIcon name="plus" size={15} />
              <span>New Group</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ ...S.kpiGrid, gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))' }}>
        <KpiCard label="Active Groups" value={totals.ministries} accent="#005599" />
        <KpiCard label="Assigned Members" value={totals.totalMembers} accent="#003d70" />
        <KpiCard label="Active Members" value={totals.activeMembers} accent="#13b5ea" />
        <KpiCard label="Inactive Members" value={totals.inactiveMembers} accent="#52647a" />
      </div>

      {error && <div style={S.errorBox} role="alert">{error}</div>}
      {notice && <div style={S.noticeBox}>{notice}</div>}

      {/* Main Master-Detail Layout */}
      <div style={{
        ...S.workspaceGrid,
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(260px, 310px) minmax(0, 1fr)',
      }}>
        {/* Left: Ministry Directory */}
        <section style={S.card} aria-label="Groups directory">
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>Life-Stage Groups</h2>
            <span style={S.countPill}>{ministries.length}</span>
          </div>

          {loading ? (
            <p style={S.muted}>Loading groups…</p>
          ) : ministries.length === 0 ? (
            <p style={S.muted}>No groups found in your scope.</p>
          ) : (
            <div style={S.list}>
              {ministries.map((item) => {
                const active = Number(selectedId) === Number(item.id);
                const ageText = (item.age_min != null || item.age_max != null)
                  ? `Ages ${item.age_min ?? '0'}–${item.age_max ?? '+'}`
                  : null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      ...S.listItem,
                      ...(active ? S.listItemActive : {}),
                    }}
                  >
                    <div style={S.listItemTop}>
                      <span style={S.listItemName}>{item.name}</span>
                      <span style={active ? S.badgeActive : S.badge}>
                        {item.member_count || 0}
                      </span>
                    </div>
                    <div style={S.listItemMeta}>
                      <span>{item.active_member_count || 0} active</span>
                      {ageText && <span>· {ageText}</span>}
                      {item.leader?.email && <span>· {item.leader.email.split('@')[0]}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Ministry Roster & Overview */}
        <section style={S.card} aria-label="Group detail">
          {detailLoading ? (
            <p style={S.muted}>Loading group details…</p>
          ) : !detail ? (
            <p style={S.muted}>Select a group to review its roster and details.</p>
          ) : (
            <>
              <div style={S.detailHead}>
                <div>
                  <div style={S.detailTitleRow}>
                    <h2 style={S.detailTitle}>{detail.name}</h2>
                    {detail.code && <span style={S.codeTag}>{detail.code}</span>}
                    <span style={S.statusTag}>{detail.status || 'Active'}</span>
                  </div>
                  <p style={S.detailDesc}>
                    {detail.description || 'Fellowship and pastoral care group.'}
                  </p>
                  <div style={S.metaStrip}>
                    <span><strong>{detail.member_count || 0}</strong> members ({detail.active_member_count || 0} active)</span>
                    {(detail.age_min != null || detail.age_max != null) && (
                      <span>Age bracket: <strong>{detail.age_min ?? '0'}–{detail.age_max ?? '+'}</strong></span>
                    )}
                    {detail.leader?.email && (
                      <span>Leader: <strong>{detail.leader.email}</strong></span>
                    )}
                  </div>
                </div>
                <div className="mcc-icon-action-group">
                  {canUpdate && (
                    <IconActionButton icon="edit" label="Edit" title="Edit group" tone="neutral" onClick={openEdit} />
                  )}
                  {canArchive && (
                    <IconActionButton icon="archive" label="Archive" title="Archive group" tone="danger" onClick={handleArchive} />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }} role="tablist">
                {[
                  { id: 'roster', label: `Roster (${detail.member_count || 0})` },
                  { id: 'activities', label: 'Activities & RSVP' },
                  { id: 'comms', label: 'Announcements & Messages' },
                  { id: 'care', label: 'Prayer & Pastoral Care' },
                  { id: 'reports', label: 'Reports' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={detailTab === t.id}
                    onClick={() => setDetailTab(t.id)}
                    style={{
                      background: detailTab === t.id ? '#005599' : '#f8fafc',
                      color: detailTab === t.id ? '#fff' : '#334155',
                      border: `1px solid ${detailTab === t.id ? '#005599' : '#e2e8f0'}`,
                      borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {detailTab !== 'roster' ? (
                <MinistryEngagementTabs
                  ministryId={detail.id}
                  members={detail.members || []}
                  canManage={canUpdate}
                  activeTab={detailTab}
                />
              ) : (
                <>
              <div style={S.toolbar}>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter roster by name, email or phone…"
                  style={S.searchInput}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={S.selectInput}
                  aria-label="Filter roster by status"
                >
                  <option value="All">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Member</th>
                      <th style={S.th}>Contact</th>
                      <th style={S.th}>Join Date</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={S.emptyCell}>No members match the current filter.</td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
                        <tr key={m.id} style={S.tr}>
                          <td style={S.td}>
                            <Link to={`/members/${m.id}`} style={S.memberLink}>
                              {displayMemberName(m)}
                            </Link>
                          </td>
                          <td style={S.td}>
                            <div style={S.cellPrimary}>{m.phone || '—'}</div>
                            {m.email && <div style={S.cellSecondary}>{m.email}</div>}
                          </td>
                          <td style={S.td}>{m.join_date || '—'}</td>
                          <td style={S.td}>
                            <span style={m.status === 'Active' ? S.pillActive : S.pillMuted}>
                              {m.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div style={S.modalBackdrop} role="dialog" aria-modal="true" aria-label={modalMode === 'create' ? 'New Group' : 'Edit Group'}>
          <form onSubmit={handleSave} style={S.modal}>
            <div style={S.modalHead}>
              <h2 style={S.modalTitle}>{modalMode === 'create' ? 'New Group' : 'Edit Group'}</h2>
              <button type="button" onClick={() => setModalMode(null)} style={S.iconClose} aria-label="Close">
                <MonoIcon name="close" size={16} />
              </button>
            </div>
            <div style={S.formGrid}>
              <label style={S.field}>
                <span style={S.label}>Group Name *</span>
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Young Adults"
                  style={S.input}
                />
              </label>
              <label style={S.field}>
                <span style={S.label}>Short Code</span>
                <input
                  maxLength={16}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: sanitizeCode(e.target.value, 16) })}
                  placeholder="e.g. YA, HS, MEN"
                  style={S.input}
                />
              </label>
              <label style={S.field}>
                <span style={S.label}>Min Age</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.age_min}
                  onKeyDown={blockInvalidIntegerKeys}
                  onChange={(e) => setForm({ ...form, age_min: sanitizeWholeNumber(e.target.value, { max: 120, maxLength: 3 }) })}
                  style={S.input}
                />
              </label>
              <label style={S.field}>
                <span style={S.label}>Max Age</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.age_max}
                  onKeyDown={blockInvalidIntegerKeys}
                  onChange={(e) => setForm({ ...form, age_max: sanitizeWholeNumber(e.target.value, { max: 120, maxLength: 3 }) })}
                  style={S.input}
                />
              </label>
            </div>
            <label style={{ ...S.field, marginTop: 12 }}>
              <span style={S.label}>Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={S.textarea}
                placeholder="Purpose, fellowship focus, or age group notes"
              />
            </label>
            <div style={S.modalActions}>
              <button type="button" onClick={() => setModalMode(null)} style={S.ghostBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={S.primaryBtn}>
                {saving ? 'Saving…' : modalMode === 'create' ? 'Create Group' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent }) {
  return (
    <div style={{ ...S.kpiCard, borderTop: `3px solid ${accent}` }}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiValue}>{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' },
  subtitle: { margin: '4px 0 0', fontSize: 13.5, color: '#52647a' },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: '#005599', color: '#fff', border: 'none', borderRadius: 10,
    padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
  secondaryLink: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: '#fff', color: '#003d70', border: '1px solid #cbd5e1', borderRadius: 10,
    padding: '8px 14px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
  },
  kpiGrid: { display: 'grid', gap: 12 },
  kpiCard: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: '14px 16px', boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
  },
  kpiLabel: { fontSize: 12, fontWeight: 600, color: '#52647a', textTransform: 'uppercase', letterSpacing: '0.04em' },
  kpiValue: { fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4 },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  noticeBox: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  workspaceGrid: { display: 'grid', gap: 16, alignItems: 'start' },
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
    padding: 18, minWidth: 0, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
  },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: '#003d70' },
  countPill: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: {
    textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
  },
  listItemActive: { background: '#e8f4fd', border: '1px solid #005599' },
  listItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  listItemName: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  listItemMeta: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, fontSize: 12, color: '#52647a' },
  badge: { background: '#e2e8f0', color: '#334155', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  badgeActive: { background: '#005599', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  detailHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', paddingBottom: 14, borderBottom: '1px solid #e2e8f0' },
  detailTitleRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  detailTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' },
  codeTag: { background: '#f1f5f9', color: '#003d70', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6 },
  statusTag: { background: '#e8f4fd', color: '#005599', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6 },
  detailDesc: { margin: '6px 0 8px', fontSize: 13.5, color: '#52647a' },
  metaStrip: { display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#334155' },
  detailActions: { display: 'flex', gap: 8 },
  ghostBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#f8fafc', color: '#003d70', border: '1px solid #cbd5e1',
    borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  dangerGhostBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#fff', color: '#b91c1c', border: '1px solid #fecaca',
    borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  toolbar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, marginBottom: 12 },
  searchInput: {
    flex: '1 1 220px', minWidth: 0, padding: '9px 12px', border: '1px solid #cbd5e1',
    borderRadius: 9, fontSize: 13.5, color: '#0f172a',
  },
  selectInput: {
    padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 9,
    fontSize: 13.5, color: '#0f172a', background: '#fff',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 },
  th: {
    textAlign: 'left', padding: '10px 10px', fontSize: 11.5, fontWeight: 700,
    color: '#52647a', textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '10px 10px', color: '#0f172a', verticalAlign: 'middle' },
  emptyCell: { padding: 24, textAlign: 'center', color: '#64748b' },
  memberLink: { color: '#005599', fontWeight: 600, textDecoration: 'none' },
  cellPrimary: { color: '#0f172a', fontSize: 13 },
  cellSecondary: { color: '#64748b', fontSize: 12 },
  pillActive: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 600 },
  pillMuted: { background: '#f1f5f9', color: '#52647a', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 600 },
  muted: { color: '#64748b', fontSize: 13.5, margin: '8px 0' },
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
    display: 'grid', placeItems: 'center', padding: 16, zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: 520,
    boxShadow: '0 20px 40px rgba(15,23,42,0.2)',
  },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  iconClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#52647a', padding: 4 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#334155' },
  input: {
    width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '9px 11px',
    border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5,
  },
  textarea: {
    width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '9px 11px',
    border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, resize: 'vertical',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
};
