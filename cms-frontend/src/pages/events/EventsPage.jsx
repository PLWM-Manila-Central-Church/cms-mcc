import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import MonoIcon from '../../components/common/MonoIcon';
import IconActionButton from '../../components/common/IconActionButton';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import CollectionToolbar from '../../components/common/CollectionToolbar';
import CompactPagination from '../../components/common/CompactPagination';
import ModalDialog from '../../components/common/ModalDialog';
import { blockInvalidIntegerKeys, sanitizeWholeNumber } from '../../utils/inputConstraints';
import { normalizeEventStatus } from '../../utils/eventStatus';
import { eventImageSrc } from '../../utils/eventImage';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { toLocalDateTimeInput } from '../../utils/localDateTimeInput';

const STATUS_META = {
  Upcoming:  { bg: '#dcfce7', color: '#15803d', label: 'Upcoming' },
  Ongoing:   { bg: '#e8f4fd', color: '#005599', label: 'Ongoing' },
  Completed: { bg: '#f1f5f9', color: '#475569', label: 'Completed' },
  Cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
};

const STATUS_FLOW = {
  Upcoming:  ['Ongoing', 'Completed', 'Cancelled'],
  Ongoing:   ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

const STATUS_ACTION_LABEL = { Ongoing: 'Start', Completed: 'Complete', Cancelled: 'Cancel' };

const blankForm = () => ({
  category_id: '', title: '', description: '', start_date: '',
  end_date: '', start_time: '', location: '', capacity: '', total_parking_slots: '',
  registration_deadline: '', status: 'Upcoming',
});

export default function EventsPage() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const { confirm } = useConfirmation();
  const canCreate = hasPermission('events', 'create');
  const canUpdate = hasPermission('events', 'update');
  const canDelete = hasPermission('events', 'delete');
  const isMember  = user?.roleName === 'Member';

  const [events, setEvents]             = useState([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [statusCounts, setStatusCounts] = useState(null);
  const [page, setPage]                 = useState(1);
  const [limit, setLimit]               = useState(20);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [timeframe, setTimeframe]       = useState('');
  const [sort, setSort]                 = useState('upcoming_first');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [editEvent, setEditEvent]   = useState(null);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);

  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return undefined; }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  useEffect(() => {
    axiosInstance.get('/events/categories')
      .then((res) => setCategories(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => setCategories([]));
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit, sort });
      if (statusFilter)   params.append('status',      statusFilter);
      if (search)         params.append('search',      search);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (timeframe)      params.append('timeframe',   timeframe);
      const res = await axiosInstance.get(`/events?${params}`);
      const d   = res.data.data;
      if (!d || !Array.isArray(d.events)) {
        setEvents([]); setTotal(0); setTotalPages(1);
        setError('Failed to load events.');
        return;
      }
      setEvents(d.events);
      setTotal(Number(d.total) || d.events.length);
      setTotalPages(Number(d.total_pages) || 1);
      if (d.status_counts) setStatusCounts(d.status_counts);
    } catch { setEvents([]); setError('Failed to load events.'); }
    finally { setLoading(false); }
  }, [page, limit, sort, statusFilter, search, categoryFilter, timeframe]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const resetForm = () => {
    setForm(blankForm());
    setEditEvent(null); setFormError('');
    setImageFile(null); setRemoveImage(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    setImageFile(null); setRemoveImage(false);
    setForm({
      category_id:           ev.category_id || '',
      title:                 ev.title || '',
      description:           ev.description || '',
      start_date:            ev.start_date || '',
      end_date:              ev.end_date || '',
      start_time:            ev.start_time || '',
      location:              ev.location || '',
      capacity:              ev.capacity || '',
      total_parking_slots:   ev.total_parking_slots == null ? '' : String(ev.total_parking_slots),
      registration_deadline: toLocalDateTimeInput(ev.registration_deadline),
      status: normalizeEventStatus(ev.status),
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('');
    if ((editEvent && !canUpdate) || (!editEvent && !canCreate)) {
      setFormError('You only have read access to events.');
      setSaving(false);
      return;
    }

    if (form.end_date && form.end_date < form.start_date) {
      setFormError('End date cannot be before start date.');
      setSaving(false); return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        start_date: form.start_date,
        status: form.status,
        category_id: form.category_id ? Number(form.category_id) : null,
        description: form.description.trim() || null,
        end_date: form.end_date || null,
        start_time: form.start_time || null,
        location: form.location.trim() || null,
        capacity: form.capacity === '' ? null : Number(form.capacity),
        total_parking_slots: form.total_parking_slots === '' ? null : Number(form.total_parking_slots),
        registration_deadline: form.registration_deadline || null,
      };
      if (!editEvent) {
        // Strip null optional fields on initial create so strict validators stay happy
        Object.keys(payload).forEach((k) => {
          if (k !== 'total_parking_slots' && payload[k] === null) delete payload[k];
        });
      }

      const savedResponse = editEvent
        ? await axiosInstance.put(`/events/${editEvent.id}`, payload)
        : await axiosInstance.post('/events', payload);
      const savedEvent = savedResponse.data.data;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        try {
          await axiosInstance.post(`/events/${savedEvent.id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (imageError) {
          // Preserve saved event reference so retrying updates rather than duplicating
          setEditEvent(savedEvent);
          setFormError(apiErrorMessage(imageError, 'Event details were saved, but the image could not be uploaded. Retry saving or close the dialog.'));
          fetchEvents();
          return;
        }
      } else if (removeImage && editEvent?.image_key) {
        await axiosInstance.patch(`/events/${savedEvent.id}/image/archive`);
      }
      setShowForm(false); resetForm(); fetchEvents();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Failed to save event.'));
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (eventId, newStatus) => {
    setStatusUpdating(eventId); setError('');
    try {
      await axiosInstance.patch(`/events/${eventId}/status`, { status: newStatus });
      fetchEvents();
    } catch (err) { setError(apiErrorMessage(err, 'Failed to update status.')); }
    finally { setStatusUpdating(null); }
  };

  const handleDelete = async (eventId) => {
    if (!(await confirm({
      title: 'Archive event?',
      message: 'The completed or cancelled event will leave active event lists. Registrations, attendance, images, and event history are retained and can be restored from Archives.',
      confirmLabel: 'Archive event',
    }))) return;
    try {
      await axiosInstance.patch(`/events/${eventId}/archive`);
      fetchEvents();
    } catch (err) { setError(apiErrorMessage(err, 'Failed to archive event.')); }
  };

  const formatDate = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
    }) : '—';

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const statusTabs = useMemo(() => {
    const base = isMember
      ? [{ key: '', label: 'All' }, { key: 'Upcoming', label: 'Upcoming' }, { key: 'Ongoing', label: 'Ongoing' }, { key: 'Completed', label: 'Completed' }]
      : [
          { key: '', label: 'All' },
          { key: 'Upcoming', label: 'Upcoming' },
          { key: 'Ongoing', label: 'Ongoing' },
          { key: 'Completed', label: 'Completed' },
          { key: 'Cancelled', label: 'Cancelled' },
        ];
    return base.map((item) => ({
      ...item,
      count: statusCounts ? statusCounts[item.key || 'All'] : undefined,
    }));
  }, [isMember, statusCounts]);

  const groupedEvents = useMemo(() => {
    if (!groupByCategory) return null;
    const map = new Map();
    for (const ev of events) {
      const cat = ev.EventCategory?.name || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(ev);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [events, groupByCategory]);

  const renderEventRow = (ev) => {
    const status = normalizeEventStatus(ev.status);
    const meta = STATUS_META[status] || STATUS_META.Upcoming;
    const canEditRow = canUpdate && !isMember && !['Completed', 'Cancelled'].includes(status);
    const nextStatuses = (canUpdate && !isMember) ? (STATUS_FLOW[status] ?? []) : [];
    const regCount = Number(ev.registration_count ?? ev.EventRegistrations?.length ?? 0);
    const cap = Number(ev.capacity) || 0;
    const fillPct = cap > 0 ? Math.min(100, Math.round((regCount / cap) * 100)) : null;

    return (
      <tr key={ev.id} style={s.tr}>
        <td data-label="Event" style={s.td}>
          <div style={s.eventCell}>
            {ev.image_url ? (
              <img src={eventImageSrc(ev)} alt="" loading="lazy" style={s.thumb} />
            ) : (
              <div style={s.thumbFallback} aria-hidden="true">
                <MonoIcon name="events" size={15} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <button
                type="button"
                onClick={() => navigate(`/events/${ev.id}`)}
                style={s.titleLink}
              >
                {ev.title}
              </button>
              <div style={s.metaLine}>
                <span style={s.catPill}>{ev.EventCategory?.name || 'General'}</span>
                {ev.registration_deadline && (
                  <span style={{ color: new Date() > new Date(ev.registration_deadline) ? '#dc2626' : '#64748b' }}>
                    Reg. due {new Date(ev.registration_deadline).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td data-label="Schedule" style={s.td}>
          <div style={s.primaryText}>
            {formatDate(ev.start_date)}
            {ev.end_date && ev.end_date !== ev.start_date ? ` – ${formatDate(ev.end_date)}` : ''}
          </div>
          {ev.start_time && <div style={s.secondaryText}>{formatTime(ev.start_time)}</div>}
        </td>
        <td data-label="Location" style={s.td}>
          <span style={s.secondaryText}>{ev.location || '—'}</span>
        </td>
        <td data-label="Registrations" style={s.td}>
          <div style={s.regCell}>
            <span style={s.primaryText}>
              {regCount}{cap > 0 ? ` / ${cap}` : ''}
            </span>
            {fillPct !== null && (
              <div style={s.barTrack} aria-hidden="true">
                <div style={{ ...s.barFill, width: `${fillPct}%`, background: fillPct >= 95 ? '#dc2626' : '#005599' }} />
              </div>
            )}
            {(Number(ev.seat_reserved_count) > 0 || Number(ev.parking_reserved_count) > 0) && (
              <div style={s.microMeta}>
                {Number(ev.seat_reserved_count) > 0 ? `${ev.seat_reserved_count} seats` : ''}
                {Number(ev.seat_reserved_count) > 0 && Number(ev.parking_reserved_count) > 0 ? ' · ' : ''}
                {Number(ev.parking_reserved_count) > 0 ? `${ev.parking_reserved_count} parking` : ''}
              </div>
            )}
          </div>
        </td>
        <td data-label="Status" style={s.td}>
          <span style={{ ...s.badge, background: meta.bg, color: meta.color }}>{meta.label}</span>
        </td>
        <td data-label="Actions" style={s.td}>
          <div className="mcc-icon-action-group">
            <IconActionButton icon="eye" label="View" title="Open event workspace" tone="primary" onClick={() => navigate(`/events/${ev.id}`)} />
            {canEditRow && (
              <IconActionButton icon="edit" label="Edit" title="Edit event" tone="neutral" onClick={() => openEdit(ev)} />
            )}
            {nextStatuses.map((ns) => {
              const iconName = ns === 'Ongoing' ? 'play' : ns === 'Completed' ? 'check' : 'close';
              const tone = ns === 'Ongoing' ? 'primary' : ns === 'Completed' ? 'success' : 'danger';
              return (
                <IconActionButton
                  key={ns}
                  icon={iconName}
                  label={STATUS_ACTION_LABEL[ns]}
                  title={`${STATUS_ACTION_LABEL[ns]} event`}
                  tone={tone}
                  disabled={statusUpdating === ev.id}
                  onClick={() => handleStatusChange(ev.id, ns)}
                />
              );
            })}
            {canDelete && !isMember && ['Completed', 'Cancelled'].includes(status) && (
              <IconActionButton icon="archive" label="Archive" title="Archive event" tone="danger" onClick={() => handleDelete(ev.id)} />
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="mcc-module mcc-module-events-page" style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 className="workspace-page-title" style={s.title}>Events</h1>
          <p style={s.subtitle}>{total} {total === 1 ? 'event' : 'events'} matching filters</p>
        </div>
        {canCreate && !isMember && (
          <button type="button" onClick={openCreate} className="mcc-btn-primary">
            + New Event
          </button>
        )}
      </div>

      <CollectionToolbar
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search events by title, location, or notes..."
        filters={[
          {
            key: 'category',
            label: 'Category',
            value: categoryFilter,
            onChange: (val) => { setCategoryFilter(val); setPage(1); },
            minWidth: 150,
            options: [{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))],
          },
          {
            key: 'timeframe',
            label: 'Timeframe',
            value: timeframe,
            onChange: (val) => { setTimeframe(val); setPage(1); },
            minWidth: 135,
            options: [
              { value: '', label: 'All dates' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'this_month', label: 'This month' },
              { value: 'this_year', label: 'This year' },
              { value: 'past', label: 'Past dates' },
            ],
          },
          {
            key: 'sort',
            label: 'Sort order',
            value: sort,
            onChange: (val) => { setSort(val); setPage(1); },
            minWidth: 155,
            options: [
              { value: 'upcoming_first', label: 'Active & Upcoming' },
              { value: 'date_desc', label: 'Newest first' },
              { value: 'date_asc', label: 'Oldest first' },
              { value: 'title_asc', label: 'Title A–Z' },
            ],
          },
        ]}
        actions={
          <button
            type="button"
            className="mcc-btn-secondary"
            onClick={() => setGroupByCategory((g) => !g)}
            aria-pressed={groupByCategory}
            style={groupByCategory ? { background: '#e8f4fd', borderColor: '#bae6fd', color: '#005599' } : undefined}
          >
            <MonoIcon name="layers" size={14} /> {groupByCategory ? 'Grouped by Category' : 'Group by Category'}
          </button>
        }
        tabs={statusTabs}
        activeTab={statusFilter}
        onTabChange={(val) => { setStatusFilter(val); setPage(1); }}
      />

      {error && <div style={s.errorBox} role="alert">{error}</div>}

      <div style={s.tableWrap}>
        <div className="mcc-table-scroll">
          <ResponsiveTable style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Event</th>
                <th style={s.th}>Schedule</th>
                <th style={s.th}>Venue</th>
                <th style={s.th}>Registrations</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={s.centerCell}>Loading events...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={6} style={s.centerCell}>No events match the current filters.</td></tr>
              ) : groupedEvents ? (
                groupedEvents.map(([catName, catEvents]) => {
                  const collapsed = !!collapsedCategories[catName];
                  return (
                    <FragmentGroup
                      key={catName}
                      categoryName={catName}
                      count={catEvents.length}
                      collapsed={collapsed}
                      onToggle={() => setCollapsedCategories((prev) => ({ ...prev, [catName]: !prev[catName] }))}
                    >
                      {!collapsed && catEvents.map(renderEventRow)}
                    </FragmentGroup>
                  );
                })
              ) : (
                events.map(renderEventRow)
              )}
            </tbody>
          </ResponsiveTable>
        </div>
      </div>

      <CompactPagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(next) => { setLimit(next); setPage(1); }}
        pageSizes={[15, 20, 35, 50]}
        itemLabel="events"
      />

      <ModalDialog
        open={showForm && !isMember && (canCreate || canUpdate)}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={editEvent ? 'Edit Event' : 'Create New Event'}
        subtitle="Configure schedule, venue, capacity, and registration deadline."
        maxWidth={720}
      >
        {formError && <div style={s.errorBox} role="alert">{formError}</div>}
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

          <div style={s.field}>
            <label htmlFor="event-photo-upload" style={s.label}>Event Photo</label>
            <input id="event-photo-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { setImageFile(e.target.files?.[0] || null); setRemoveImage(false); }} style={s.input} />
            <small style={{ color: 'var(--mcc-secondary, #52647a)', fontSize: 12 }}>JPG, PNG, or WebP. Maximum 5 MB.</small>
            {(imageFile || (editEvent?.image_url && !removeImage)) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                {(imageFile ? imagePreview : eventImageSrc(editEvent)) && <img src={imageFile ? imagePreview : eventImageSrc(editEvent)} alt="Event preview" style={{ width: 96, height: 60, objectFit: 'cover', borderRadius: 8 }} />}
                {editEvent?.image_url && <button type="button" onClick={() => { setImageFile(null); setRemoveImage(true); }} className="mcc-btn-secondary">Archive current photo</button>}
              </div>
            )}
          </div>

          <div style={s.formRow}>
            <div style={s.field}>
              <label style={s.label}>Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>End Date</label>
              <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={s.select}>
                <option value="Upcoming">Upcoming</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div style={s.formRow}>
            <div style={{ ...s.field, flex: 2 }}>
              <label style={s.label}>Location</label>
              <input value={form.location} maxLength={150} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue / address" style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Registration / seat capacity</label>
              <input
                type="number" min="1" value={form.capacity}
                onKeyDown={blockInvalidIntegerKeys}
                onChange={e => setForm(f => ({ ...f, capacity: sanitizeWholeNumber(e.target.value, { maxLength: 6 }) }))}
                placeholder="Optional" style={s.input}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Parking slots (optional)</label>
              <input
                type="number" min="0" step="1" value={form.total_parking_slots}
                onKeyDown={blockInvalidIntegerKeys}
                onChange={e => setForm(f => ({ ...f, total_parking_slots: sanitizeWholeNumber(e.target.value, { maxLength: 5 }) }))}
                placeholder="Not specified" style={s.input}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Reg. Deadline</label>
              <input type="datetime-local" value={form.registration_deadline} onChange={e => setForm(f => ({ ...f, registration_deadline: e.target.value }))} style={s.input} />
            </div>
          </div>

          <div style={s.formActions}>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="mcc-btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="mcc-btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : editEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

function FragmentGroup({ categoryName, count, collapsed, onToggle, children }) {
  return (
    <>
      <tr style={s.groupRow}>
        <td colSpan={6} style={s.groupTd}>
          <button type="button" onClick={onToggle} style={s.groupToggle}>
            <MonoIcon name={collapsed ? 'chevronRight' : 'chevronDown'} size={14} />
            <span>{categoryName}</span>
            <span style={s.groupCount}>{count}</span>
          </button>
        </td>
      </tr>
      {children}
    </>
  );
}

const s = {
  page:          { fontFamily: 'inherit' },
  pageHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  title:         { margin: 0, color: 'var(--mcc-ink, #0f172a)' },
  subtitle:      { fontSize: 13.5, color: 'var(--mcc-secondary, #52647a)', margin: '3px 0 0' },
  errorBox:      { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 9, padding: '10px 14px', fontSize: 13.5, marginBottom: 14 },
  tableWrap:     { background: 'var(--mcc-surface, #fff)', borderRadius: 'var(--mcc-radius, 12px)', border: '1px solid var(--mcc-border, #e2e8f0)', overflow: 'hidden' },
  table:         { width: '100%', borderCollapse: 'collapse' },
  thead:         { background: '#f8fafc' },
  th:            { textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' },
  tr:            { borderBottom: '1px solid #f1f5f9' },
  td:            { verticalAlign: 'middle', fontSize: 13.5, color: '#334155' },
  centerCell:    { padding: '44px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  eventCell:     { display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 },
  thumb:         { width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' },
  thumbFallback: { width: 38, height: 38, borderRadius: 8, background: '#f1f5f9', color: '#005599', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleLink:     { background: 'none', border: 0, padding: 0, textAlign: 'left', fontSize: 14, fontWeight: 700, color: '#0f172a', cursor: 'pointer', display: 'block' },
  metaLine:      { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 3, fontSize: 11.5 },
  catPill:       { background: '#f1f5f9', color: '#475569', padding: '1px 7px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  primaryText:   { fontWeight: 600, color: '#0f172a', fontSize: 13.5 },
  secondaryText: { fontSize: 12.5, color: '#64748b' },
  regCell:       { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 105 },
  barTrack:      { width: 96, height: 5, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 999, transition: 'width 0.2s' },
  microMeta:     { fontSize: 11, color: '#64748b' },
  badge:         { display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  groupRow:      { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  groupTd:       { padding: '8px 14px' },
  groupToggle:   { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 0, padding: 0, fontSize: 12.5, fontWeight: 700, color: '#003d70', cursor: 'pointer' },
  groupCount:    { background: '#e8f4fd', color: '#005599', padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 700 },
  form:          { display: 'flex', flexDirection: 'column', gap: 14 },
  formRow:       { display: 'flex', gap: 12, flexWrap: 'wrap' },
  field:         { display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 150 },
  label:         { fontSize: 12.5, fontWeight: 600, color: '#374151' },
  input:         { padding: '8px 11px', fontSize: 13.5, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:        { padding: '8px 11px', fontSize: 13.5, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', background: '#fff' },
  formActions:   { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
};
