import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
  pending:  { bg: '#fffbeb', color: '#d97706', label: 'Pending' },
  approved: { bg: '#f0fdf4', color: '#16a34a', label: 'Approved' },
  deleted:  { bg: '#f1f5f9', color: '#64748b', label: 'Deleted' },
};

const VISIBILITY_META = {
  public:       { bg: '#eff6ff', color: '#2563eb',  label: 'Public' },
  restricted:   { bg: '#fffbeb', color: '#d97706',  label: 'Restricted' },
  confidential: { bg: '#fef2f2', color: '#dc2626',  label: 'Confidential' },
};

const FILE_ICONS = {
  pdf: '📄', docx: '📝', xlsx: '📊', jpg: '🖼️', png: '🖼️', mp4: '🎬', mp3: '🎵'
};

const APPROVER_ROLES = [1, 2]; // Admin, Pastor

export default function ArchivesPage() {
  const { user, hasPermission } = useAuth();
  const canUpload  = hasPermission('archives', 'upload');
  const canApprove = hasPermission('archives', 'approve');
  const canManage  = hasPermission('archives', 'manage');
  const isApprover = APPROVER_ROLES.includes(user?.roleId);

  const [records, setRecords]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [categories, setCategories] = useState([]);
  const [filterCat, setFilterCat]   = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterVisible, setFilterVisible]   = useState('');
  const [search, setSearch]                 = useState('');

  const [showForm, setShowForm]     = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState({ category_id: '', title: '', description: '', document_date: '', visibility: 'public' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const [detailRecord, setDetailRecord] = useState(null);
  const [accessLogs, setAccessLogs]     = useState([]);
  const [logsLoading, setLogsLoading]   = useState(false);

  const limit = 15;

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/archives/categories');
      setCategories(res.data.data);
    } catch {}
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (filterCat)     params.append('category_id', filterCat);
      if (filterStatus)  params.append('status',      filterStatus);
      if (filterVisible) params.append('visibility',  filterVisible);
      if (search)        params.append('search',      search);
      const res = await axiosInstance.get(`/archives?${params}`);
      const d   = res.data.data;
      setRecords(d.records); setTotal(d.total); setTotalPages(d.total_pages);
    } catch { setError('Failed to load archive records.'); }
    finally { setLoading(false); }
  }, [page, filterCat, filterStatus, filterVisible, search]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const resetForm = () => {
    setForm({ category_id: '', title: '', description: '', document_date: '', visibility: 'public' });
    setSelectedFile(null); setEditRecord(null); setFormError('');
  };

  const openEdit = (record) => {
    setEditRecord(record);
    setForm({
      category_id:   record.category_id || '',
      title:         record.title || '',
      description:   record.description || '',
      document_date: record.document_date || '',
      visibility:    record.visibility || 'public'
    });
    setSelectedFile(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (selectedFile) formData.append('file', selectedFile);

      if (editRecord) {
        await axiosInstance.put(`/archives/${editRecord.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        if (!selectedFile) { setFormError('Please select a file to upload.'); setSaving(false); return; }
        await axiosInstance.post('/archives', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setShowForm(false); resetForm(); fetchRecords();
    } catch (err) { setFormError(err.response?.data?.message || 'Failed to save record.'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      await axiosInstance.patch(`/archives/${id}/approve`);
      fetchRecords();
      if (detailRecord?.id === id) setDetailRecord(prev => ({ ...prev, status: 'approved' }));
    } catch (err) { setError(err.response?.data?.message || 'Failed to approve.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this archive record?')) return;
    try {
      await axiosInstance.delete(`/archives/${id}`);
      fetchRecords();
      if (detailRecord?.id === id) setDetailRecord(null);
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete.'); }
  };

  const openDetail = async (record) => {
    try {
      const res = await axiosInstance.get(`/archives/${record.id}`);
      setDetailRecord(res.data.data);
      // Fetch access logs for approvers
      if (isApprover) {
        setLogsLoading(true);
        try {
          const logRes = await axiosInstance.get(`/archives/${record.id}/access-logs`);
          setAccessLogs(logRes.data.data);
        } catch {} finally { setLogsLoading(false); }
      }
    } catch (err) { setError(err.response?.data?.message || 'Failed to load record.'); }
  };

  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div style={s.page}>
      <div style={s.layout}>
        {/* ── LEFT PANEL ────────────────────────────────── */}
        <div style={s.leftPanel}>
          <div style={s.pageHeader}>
            <div>
              <h1 style={s.title}>Archives</h1>
              <p style={s.subtitle}>{total} records</p>
            </div>
            {canUpload && (
              <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} style={s.addBtn}>
                {showForm ? '✕ Cancel' : '+ Upload'}
              </button>
            )}
          </div>

          {/* Upload / Edit form */}
          {showForm && (
            <div style={s.formCard}>
              <h3 style={s.formTitle}>{editRecord ? 'Edit Record' : 'Upload Archive Record'}</h3>
              {formError && <div style={s.errorBox}>{formError}</div>}
              <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.formRow}>
                  <div style={{ ...s.field, flex: 2 }}>
                    <label style={s.label}>Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Record title" required style={s.input} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Category *</label>
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required style={s.select}>
                      <option value="">— Select —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={s.formRow}>
                  <div style={s.field}>
                    <label style={s.label}>Document Date</label>
                    <input type="date" value={form.document_date} onChange={e => setForm(f => ({ ...f, document_date: e.target.value }))} style={s.input} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Visibility</label>
                    <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))} style={s.select}>
                      <option value="public">Public</option>
                      <option value="restricted">Restricted</option>
                      <option value="confidential">Confidential</option>
                    </select>
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} placeholder="Optional description..." style={{ ...s.input, resize: 'vertical' }} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>File {editRecord ? '(leave blank to keep current)' : '*'}</label>
                  <input type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.mp4,.mp3"
                    onChange={e => setSelectedFile(e.target.files[0])} style={s.fileInput} />
                  {selectedFile && <span style={s.fileName}>📎 {selectedFile.name}</span>}
                </div>
                <div style={s.formActions}>
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={s.cancelBtn}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ ...s.submitBtn, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Uploading...' : editRecord ? 'Update Record' : 'Upload Record'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div style={s.filterBar}>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search records..." style={s.filterInput} />
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }} style={s.filterSelect}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {isApprover && (
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={s.filterSelect}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
            )}
            <select value={filterVisible} onChange={e => { setFilterVisible(e.target.value); setPage(1); }} style={s.filterSelect}>
              <option value="">All Visibility</option>
              <option value="public">Public</option>
              <option value="restricted">Restricted</option>
              {isApprover && <option value="confidential">Confidential</option>}
            </select>
          </div>

          {error && <div style={s.errorBox}>{error}</div>}

          {/* Records list */}
          {loading ? (
            <div style={s.centerCell}>Loading...</div>
          ) : records.length === 0 ? (
            <div style={s.centerCell}>No records found.</div>
          ) : (
            <div style={s.recordList}>
              {records.map(record => {
                const stMeta  = STATUS_META[record.status]     || STATUS_META.pending;
                const visMeta = VISIBILITY_META[record.visibility] || VISIBILITY_META.public;
                const icon    = FILE_ICONS[record.file_type] || '📄';
                const isSelected = detailRecord?.id === record.id;

                return (
                  <div key={record.id}
                    onClick={() => openDetail(record)}
                    style={{ ...s.recordCard, background: isSelected ? '#eff6ff' : '#fff', borderColor: isSelected ? '#2563eb' : '#e2e8f0', cursor: 'pointer' }}>
                    <div style={s.recordTop}>
                      <span style={s.fileIcon}>{icon}</span>
                      <div style={s.recordMeta}>
                        <span style={{ ...s.badge, background: stMeta.bg, color: stMeta.color }}>{stMeta.label}</span>
                        <span style={{ ...s.badge, background: visMeta.bg, color: visMeta.color }}>{visMeta.label}</span>
                      </div>
                    </div>
                    <div style={s.recordTitle}>{record.title}</div>
                    <div style={s.recordSub}>{record.category?.name} · {formatDate(record.document_date)}</div>
                    <div style={s.recordSub}>Uploaded by {record.uploadedByUser?.email}</div>

                    {/* Pending banner for approvers */}
                    {record.status === 'pending' && isApprover && (
                      <div style={s.pendingActions} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleApprove(record.id)} style={s.approveBtn}>✓ Approve</button>
                        <button onClick={() => handleDelete(record.id)} style={s.rejectBtn}>✕ Delete</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div style={s.pagination}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={s.pageBtn}>← Prev</button>
              <span style={s.pageInfo}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={s.pageBtn}>Next →</button>
            </div>
          )}
        </div>

        {/* ── RIGHT DETAIL PANEL ────────────────────────── */}
        {detailRecord && (
          <div style={s.detailPanel}>
            <div style={s.detailHeader}>
              <h2 style={s.detailTitle}>{FILE_ICONS[detailRecord.file_type]} {detailRecord.title}</h2>
              <button onClick={() => setDetailRecord(null)} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.detailBody}>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Category</span>
                <span style={s.detailValue}>{detailRecord.category?.name}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Document Date</span>
                <span style={s.detailValue}>{formatDate(detailRecord.document_date)}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>File Type</span>
                <span style={s.detailValue}>{detailRecord.file_type?.toUpperCase()}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Visibility</span>
                <span style={{ ...s.badge, ...(() => { const vm = VISIBILITY_META[detailRecord.visibility]; return { background: vm?.bg, color: vm?.color }; })() }}>
                  {VISIBILITY_META[detailRecord.visibility]?.label}
                </span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Status</span>
                <span style={{ ...s.badge, ...(() => { const sm = STATUS_META[detailRecord.status]; return { background: sm?.bg, color: sm?.color }; })() }}>
                  {STATUS_META[detailRecord.status]?.label}
                </span>
              </div>
              {detailRecord.description && (
                <div style={s.detailDesc}>{detailRecord.description}</div>
              )}
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Uploaded by</span>
                <span style={s.detailValue}>{detailRecord.uploadedByUser?.email}</span>
              </div>
              {detailRecord.approvedByUser && (
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>Approved by</span>
                  <span style={s.detailValue}>{detailRecord.approvedByUser?.email}</span>
                </div>
              )}

              {/* File download */}
              <a href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${detailRecord.file_url}`}
                target="_blank" rel="noreferrer" style={s.downloadBtn}>
                ⬇ Download File
              </a>

              {/* Versions */}
              {detailRecord.ArchiveVersions?.length > 0 && (
                <div style={s.versionsSection}>
                  <div style={s.sectionTitle}>Version History ({detailRecord.ArchiveVersions.length})</div>
                  {detailRecord.ArchiveVersions.map(v => (
                    <div key={v.id} style={s.versionRow}>
                      <span style={s.versionNum}>v{v.version_number}</span>
                      <span style={s.versionMeta}>{v.file_type?.toUpperCase()} · {v.uploadedByUser?.email}</span>
                      <a href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${v.file_url}`}
                        target="_blank" rel="noreferrer" style={s.versionLink}>Download</a>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={s.detailActions}>
                {canUpload && (detailRecord.uploaded_by === user?.userId || isApprover) && (
                  <button onClick={() => openEdit(detailRecord)} style={s.editBtn}>Edit</button>
                )}
                {detailRecord.status === 'pending' && canApprove && (
                  <button onClick={() => handleApprove(detailRecord.id)} style={s.approveBtn}>✓ Approve</button>
                )}
                {(detailRecord.uploaded_by === user?.userId || isApprover) && (
                  <button onClick={() => handleDelete(detailRecord.id)} style={s.deleteBtn}>Delete</button>
                )}
              </div>

              {/* Access logs for approvers */}
              {isApprover && (
                <div style={s.versionsSection}>
                  <div style={s.sectionTitle}>Access Log</div>
                  {logsLoading ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>Loading logs...</div>
                  ) : accessLogs.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>No access logs yet.</div>
                  ) : accessLogs.map(log => (
                    <div key={log.id} style={s.logRow}>
                      <span style={s.logUser}>{log.accessedByUser?.email}</span>
                      <span style={s.logTime}>{new Date(log.accessed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page:           { fontFamily: "'Segoe UI', sans-serif" },
  layout:         { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  leftPanel:      { flex: 1, minWidth: 0 },
  detailPanel:    { width: '360px', flexShrink: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', position: 'sticky', top: '24px' },
  pageHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title:          { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  subtitle:       { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  addBtn:         { background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  formCard:       { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle:      { fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' },
  form:           { display: 'flex', flexDirection: 'column', gap: '14px' },
  formRow:        { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  field:          { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '140px' },
  label:          { fontSize: '12px', fontWeight: '600', color: '#374151' },
  input:          { padding: '9px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:         { padding: '9px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#fff' },
  fileInput:      { fontSize: '13px', color: '#475569' },
  fileName:       { fontSize: '12px', color: '#2563eb', fontWeight: '500' },
  formActions:    { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  cancelBtn:      { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  submitBtn:      { background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 22px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  filterBar:      { display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  filterInput:    { padding: '8px 12px', fontSize: '13px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none', flex: 1, minWidth: '140px' },
  filterSelect:   { padding: '8px 12px', fontSize: '13px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none', background: '#fff' },
  errorBox:       { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' },
  centerCell:     { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  recordList:     { display: 'flex', flexDirection: 'column', gap: '10px' },
  recordCard:     { border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px', transition: 'border-color 0.15s, background 0.15s' },
  recordTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  fileIcon:       { fontSize: '22px' },
  recordMeta:     { display: 'flex', gap: '6px' },
  badge:          { padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  recordTitle:    { fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' },
  recordSub:      { fontSize: '12px', color: '#64748b' },
  pendingActions: { display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' },
  approveBtn:     { background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  rejectBtn:      { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  pagination:     { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '20px' },
  pageBtn:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' },
  pageInfo:       { fontSize: '13px', color: '#64748b' },
  // Detail panel
  detailHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 20px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' },
  detailTitle:    { fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, flex: 1, paddingRight: '10px', wordBreak: 'break-word' },
  closeBtn:       { background: 'none', border: 'none', fontSize: '16px', color: '#94a3b8', cursor: 'pointer', flexShrink: 0 },
  detailBody:     { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  detailRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel:    { fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailValue:    { fontSize: '13px', color: '#0f172a', fontWeight: '500' },
  detailDesc:     { fontSize: '13px', color: '#475569', lineHeight: '1.5', background: '#f8fafc', borderRadius: '8px', padding: '10px' },
  downloadBtn:    { display: 'block', textAlign: 'center', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', textDecoration: 'none', marginTop: '4px' },
  versionsSection:{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '4px' },
  sectionTitle:   { fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
  versionRow:     { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f8fafc' },
  versionNum:     { fontSize: '12px', fontWeight: '700', color: '#2563eb', minWidth: '24px' },
  versionMeta:    { fontSize: '12px', color: '#64748b', flex: 1 },
  versionLink:    { fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' },
  detailActions:  { display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' },
  editBtn:        { background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn:      { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  logRow:         { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8fafc' },
  logUser:        { fontSize: '12px', color: '#374151', fontWeight: '500' },
  logTime:        { fontSize: '11px', color: '#94a3b8' },
};
