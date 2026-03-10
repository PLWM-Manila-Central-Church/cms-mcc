import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
  draft:     { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  published: { bg: '#dcfce7', color: '#16a34a', label: 'Published' },
  completed: { bg: '#e8f4fd', color: '#0066b3', label: 'Completed' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
};

const STATUS_FLOW = {
  draft:     ['published', 'cancelled'],
  published: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function ServicesPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('services', 'create');

  const [services, setServices]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const [form, setForm] = useState({
    title: '', service_date: '', service_time: '',
    capacity: '', total_parking_slots: '', response_deadline: '', status: 'draft'
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const limit = 15;

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (statusFilter) params.append('status', statusFilter);
      const res = await axiosInstance.get(`/services?${params}`);
      const d   = res.data.data;
      setServices(d.services);
      setTotal(d.total);
      setTotalPages(d.total_pages);
    } catch {
      setError('Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form };
      if (!payload.response_deadline) delete payload.response_deadline;
      await axiosInstance.post('/services', payload);
      setShowForm(false);
      setForm({ title: '', service_date: '', service_time: '', capacity: '', total_parking_slots: '', response_deadline: '', status: 'draft' });
      fetchServices();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create service.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (serviceId, newStatus) => {
    setStatusUpdating(serviceId);
    try {
      await axiosInstance.patch(`/services/${serviceId}/status`, { status: newStatus });
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setStatusUpdating(null);
    }
  };

  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Services</h1>
          <p style={styles.subtitle}>{total} total services</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
            {showForm ? '✕ Cancel' : '+ New Service'}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>Create New Service</h3>
          {formError && <div style={styles.errorBox}>{formError}</div>}
          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Title *</label>
                <input name="title" value={form.title} onChange={handleFormChange}
                  placeholder="e.g. Sunday Service - March 9" required style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Status</label>
                <select name="status" value={form.status} onChange={handleFormChange} style={styles.select}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Date *</label>
                <input type="date" name="service_date" value={form.service_date} onChange={handleFormChange} required style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Time *</label>
                <input type="time" name="service_time" value={form.service_time} onChange={handleFormChange} required style={styles.input} />
              </div>
            </div>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Capacity *</label>
                <input type="number" name="capacity" value={form.capacity} onChange={handleFormChange}
                  min="1" placeholder="500" required style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Parking Slots *</label>
                <input type="number" name="total_parking_slots" value={form.total_parking_slots}
                  onChange={handleFormChange} min="0" placeholder="100" required style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Response Deadline</label>
                <input type="datetime-local" name="response_deadline" value={form.response_deadline}
                  onChange={handleFormChange} style={styles.input} />
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...styles.submitBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : 'Create Service'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Filter */}
      <div style={styles.filterBar}>
        {['', 'draft', 'published', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              ...styles.filterChip,
              background: statusFilter === s ? '#005599' : '#f1f5f9',
              color:      statusFilter === s ? '#fff'    : '#475569',
            }}>
            {s ? STATUS_META[s].label : 'All'}
          </button>
        ))}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Service</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Capacity</th>
              <th style={styles.th}>Attended</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={styles.centerCell}>Loading...</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan={7} style={styles.centerCell}>No services found.</td></tr>
            ) : services.map((s, i) => {
              const meta        = STATUS_META[s.status] || STATUS_META.draft;
              const nextStatuses = canCreate ? STATUS_FLOW[s.status] : [];
              const attended    = s.ServiceAttendanceSummary?.total_attended ?? 0;

              return (
                <tr key={s.id}
                  style={{ ...styles.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e8f4fd'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}
                >
                  <td style={{ ...styles.td, fontWeight: '600', color: '#0f172a' }}>{s.title}</td>
                  <td style={styles.td}>{formatDate(s.service_date)}</td>
                  <td style={styles.td}>{formatTime(s.service_time)}</td>
                  <td style={styles.td}>{s.capacity}</td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: '700', color: '#0066b3' }}>{attended}</span>
                    <span style={{ color: '#94a3b8' }}> / {s.capacity}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button onClick={() => navigate(`/services/${s.id}/attendance`)} style={styles.viewBtn}>
                        Attendance
                      </button>
                      {nextStatuses.map(ns => (
                        <button key={ns}
                          onClick={() => handleStatusChange(s.id, ns)}
                          disabled={statusUpdating === s.id}
                          style={{ ...styles.statusBtn, ...STATUS_ACTION_STYLE[ns] }}>
                          {STATUS_ACTION_LABEL[ns]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={styles.pageBtn}>← Prev</button>
          <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={styles.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}

const STATUS_ACTION_LABEL = {
  published: 'Publish',
  completed: 'Complete',
  cancelled:  'Cancel',
};
const STATUS_ACTION_STYLE = {
  published: { background: '#dcfce7', color: '#16a34a' },
  completed: { background: '#e8f4fd', color: '#0066b3' },
  cancelled:  { background: '#fef2f2', color: '#dc2626' },
};

const styles = {
  page:       { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title:      { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  subtitle:   { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  addBtn:     { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  formCard:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle:  { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0' },
  form:       { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow:    { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  field:      { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '160px' },
  label:      { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input:      { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', color: '#0f172a' },
  select:     { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#fff' },
  formActions:{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' },
  cancelBtn:  { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  submitBtn:  { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  filterBar:  { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  filterChip: { border: 'none', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  errorBox:   { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' },
  tableWrap:  { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  thead:      { background: '#f8fafc' },
  th:         { padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  row:        { transition: 'background 0.15s' },
  td:         { padding: '14px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  centerCell: { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  badge:      { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  actions:    { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  viewBtn:    { background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  statusBtn:  { border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px' },
  pageBtn:    { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' },
  pageInfo:   { fontSize: '14px', color: '#64748b' },
};
