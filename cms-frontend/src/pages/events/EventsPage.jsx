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

const STATUS_ACTION_LABEL = { published: 'Publish', completed: 'Complete', cancelled: 'Cancel' };
const STATUS_ACTION_STYLE = {
  published: { background: '#dcfce7', color: '#16a34a' },
  completed: { background: '#e8f4fd', color: '#0066b3' },
  cancelled:  { background: '#fef2f2', color: '#dc2626' },
};

export default function EventsPage() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const canCreate = hasPermission('events', 'create');
  const isMember  = user?.roleName === 'Member';

  const [events, setEvents]             = useState([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [editEvent, setEditEvent]   = useState(null);
  const [form, setForm] = useState({
    category_id: '', title: '', description: '', start_date: '',
    end_date: '', start_time: '', location: '', capacity: '',
    registration_deadline: '', status: 'draft',
  });
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const limit = 15;

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get('/events/categories');
      setCategories(res.data.data);
    } catch {}
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (statusFilter)   params.append('status',      statusFilter);
      if (search)         params.append('search',      search);
      if (categoryFilter) params.append('category_id', categoryFilter);
      const res = await axiosInstance.get(`/events?${params}`);
      const d   = res.data.data;
      setEvents(d.events); setTotal(d.total); setTotalPages(d.total_pages);
    } catch { setError('Failed to load events.'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search, categoryFilter]);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Debounced search — only fires after user stops typing
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const resetForm = () => {
    setForm({
      category_id: '', title: '', description: '', start_date: '',
      end_date: '', start_time: '', location: '', capacity: '',
      registration_deadline: '', status: 'draft',
    });
    setEditEvent(null); setFormError('');
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    setForm({
      category_id:           ev.category_id || '',
      title:                 ev.title || '',
      description:           ev.description || '',
      start_date:            ev.start_date || '',
      end_date:              ev.end_date || '',
      start_time:            ev.start_time || '',
      location:              ev.location || '',
      capacity:              ev.capacity || '',
      registration_deadline: ev.registration_deadline
        ? ev.registration_deadline.slice(0, 16) : '',
      status: ev.status || 'draft',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('');

    // Frontend date validation
    if (form.end_date && form.end_date < form.start_date) {
      setFormError('End date cannot be before start date.');
      setSaving(false); return;
    }

    try {
      const payload = { ...form };
      if (!payload.end_date)              delete payload.end_date;
      if (!payload.start_time)            delete payload.start_time;
      if (!payload.capacity)              delete payload.capacity;
      if (!payload.registration_deadline) delete payload.registration_deadline;
      if (!payload.description)           delete payload.description;
      if (!payload.location)              delete payload.location;
      if (!payload.category_id)           delete payload.category_id;

      if (editEvent) {
        await axiosInstance.put(`/events/${editEvent.id}`, payload);
      } else {
        await axiosInstance.post('/events', payload);
      }
      setShowForm(false); resetForm(); fetchEvents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save event.');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (eventId, newStatus) => {
    setStatusUpdating(eventId);
    try {
      await axiosInstance.patch(`/events/${eventId}/status`, { status: newStatus });
      fetchEvents();
    } catch (err) { setError(err.response?.data?.message || 'Failed to update status.'); }
    finally { setStatusUpdating(null); }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await axiosInstance.delete(`/events/${eventId}`);
      fetchEvents();
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete event.'); }
  };

  const formatDate = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
    }) : '—';

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return ` · ${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const filterOptions = isMember
    ? [{ key: '', label: 'All' }, { key: 'published', label: 'Published' }, { key: 'completed', label: 'Completed' }]
    : [
        { key: '', label: 'All' },
        { key: 'draft', label: 'Draft' },
        { key: 'published', label: 'Published' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
      ];

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Events</h1>
          <p style={s.subtitle}>{total} total events</p>
        </div>
        {canCreate && !isMember && (
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
            style={s.addBtn}
          >
            {showForm ? '✕ Cancel' : '+ New Event'}
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && !isMember && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>{editEvent ? 'Edit Event' : 'Create New Event'}</h3>
          {formError && <div style={s.errorBox}>{formError}</div>}
          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.formRow}>
              <div style={s.field}>
                <label style={s.label}>Category</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  style={s.select}
                >
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ ...s.field, flex: 2 }}>
                <label style={s.label}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Event title" required style={s.input}
                />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Optional description"
                style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={s.formRow}>
              <div style={s.field}>
                <label style={s.label}>Start Date *</label>
                <input
                  type="date" value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  required style={s.input}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>End Date</label>
                <input
                  type="date" value={form.end_date}
                  min={form.start_date || undefined}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  style={s.input}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Start Time</label>
                <input
                  type="time" value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  style={s.input}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={s.select}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div style={s.formRow}>
              <div style={{ ...s.field, flex: 2 }}>
                <label style={s.label}>Location</label>
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Venue / address" style={s.input}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Capacity</label>
                <input
                  type="number" min="1" value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="Optional" style={s.input}
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Reg. Deadline</label>
                <input
                  type="datetime-local" value={form.registration_deadline}
                  onChange={e => setForm(f => ({ ...f, registration_deadline: e.target.value }))}
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.formActions}>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                style={s.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit" disabled={saving}
                style={{ ...s.submitBtn, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : editEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + filters */}
      <div style={s.filtersBar}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search events..."
          style={s.searchInput}
        />
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          style={{ ...s.select, minWidth: 140 }}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={s.filterBar}>
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => { setStatusFilter(opt.key); setPage(1); }}
            style={{
              ...s.filterChip,
              background: statusFilter === opt.key ? '#005599' : '#f1f5f9',
              color:      statusFilter === opt.key ? '#fff'    : '#475569',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <div style={s.centerCell}>Loading...</div>
      ) : events.length === 0 ? (
        <div style={s.centerCell}>No events found.</div>
      ) : (
        <div style={s.grid}>
          {events.map(ev => {
            const meta         = STATUS_META[ev.status] || STATUS_META.draft;
            const nextStatuses = (canCreate && !isMember) ? STATUS_FLOW[ev.status] : [];
            const regCount     = ev.EventRegistrations?.length ?? 0;

            return (
              <div key={ev.id} style={s.card}>
                <div style={s.cardTop}>
                  <span style={{ ...s.badge, background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                  <span style={s.category}>{ev.EventCategory?.name}</span>
                </div>
                <div style={s.cardTitle}>{ev.title}</div>
                {ev.description && (
                  <div style={s.cardDesc}>
                    {ev.description.length > 100
                      ? ev.description.slice(0, 100) + '…'
                      : ev.description}
                  </div>
                )}
                <div style={s.cardMeta}>
                  📅 {formatDate(ev.start_date)}{formatTime(ev.start_time)}
                  {ev.end_date && ev.end_date !== ev.start_date
                    && ` – ${formatDate(ev.end_date)}`}
                </div>
                {ev.location && <div style={s.cardMeta}>📍 {ev.location}</div>}
                <div style={s.cardMeta}>
                  👥 {regCount} registered{ev.capacity ? ` / ${ev.capacity}` : ''}
                </div>
                {ev.registration_deadline && (
                  <div style={{
                    ...s.cardMeta,
                    color: new Date() > new Date(ev.registration_deadline)
                      ? '#dc2626' : '#64748b',
                  }}>
                    ⏰ Deadline: {new Date(ev.registration_deadline).toLocaleDateString(
                      'en-PH', { month: 'short', day: 'numeric', year: 'numeric' }
                    )}
                  </div>
                )}

                <div style={s.cardActions}>
                  <button onClick={() => navigate(`/events/${ev.id}`)} style={s.viewBtn}>
                    View
                  </button>
                  {canCreate && !isMember && (
                    <>
                      <button onClick={() => openEdit(ev)} style={s.editBtn}>Edit</button>
                      {nextStatuses.map(ns => (
                        <button
                          key={ns}
                          onClick={() => handleStatusChange(ev.id, ns)}
                          disabled={statusUpdating === ev.id}
                          style={{ ...s.statusBtn, ...STATUS_ACTION_STYLE[ns] }}
                        >
                          {STATUS_ACTION_LABEL[ns]}
                        </button>
                      ))}
                      {/* FIX BUG 4: was only 'draft'. Admins must also be able to
                          delete completed and cancelled events to clean up the list. */}
                      {['draft', 'completed', 'cancelled'].includes(ev.status) && (
                        <button onClick={() => handleDelete(ev.id)} style={s.deleteBtn}>
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1} style={s.pageBtn}
          >
            ← Prev
          </button>
          <span style={s.pageInfo}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages} style={s.pageBtn}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  page:        { fontFamily: "'Inter', sans-serif" },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title:       { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  subtitle:    { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  addBtn:      { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  formCard:    { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle:   { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0' },
  form:        { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow:     { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  field:       { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '160px' },
  label:       { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input:       { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:      { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#fff' },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn:   { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  submitBtn:   { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  filtersBar:  { display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' },
  searchInput: { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', flex: 1, minWidth: '200px' },
  filterBar:   { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  filterChip:  { border: 'none', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' },
  centerCell:  { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  card:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge:       { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  category:    { fontSize: '12px', color: '#94a3b8', fontWeight: '500' },
  cardTitle:   { fontSize: '16px', fontWeight: '700', color: '#0f172a' },
  cardDesc:    { fontSize: '13px', color: '#64748b', lineHeight: '1.5' },
  cardMeta:    { fontSize: '13px', color: '#64748b' },
  cardActions: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' },
  viewBtn:     { background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  editBtn:     { background: '#f8fafc', color: '#475569', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  statusBtn:   { border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn:   { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  pagination:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px' },
  pageBtn:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' },
  pageInfo:    { fontSize: '14px', color: '#64748b' },
};
