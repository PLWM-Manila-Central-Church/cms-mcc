import { downloadReportCsv } from '../../utils/reportCsv';
import { fetchAllPages } from '../../api/fetchAllPages';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import MonoIcon from '../../components/common/MonoIcon';
import IconActionButton from '../../components/common/IconActionButton';
import CollectionToolbar from '../../components/common/CollectionToolbar';
import CompactPagination from '../../components/common/CompactPagination';
import ModalDialog from '../../components/common/ModalDialog';
import ServicePlannerPanel from '../../components/services/ServicePlannerPanel';
import { blockInvalidIntegerKeys, sanitizeWholeNumber } from '../../utils/inputConstraints';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { toLocalDateTimeInput } from '../../utils/localDateTimeInput';

const STATUS_META = {
  draft:     { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  published: { bg: '#dcfce7', color: '#15803d', label: 'Published' },
  completed: { bg: '#e8f4fd', color: '#005599', label: 'Completed' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
};

const STATUS_FLOW = {
  draft:     ['published', 'cancelled'],
  published: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STATUS_ACTION_LABEL = { published: 'Publish', completed: 'Complete', cancelled: 'Cancel' };

const RESPONSE_META = {
  ATTENDING:     { bg: '#dcfce7', color: '#15803d', label: 'Attending' },
  NOT_ATTENDING: { bg: '#fef2f2', color: '#dc2626', label: 'Not Attending' },
  UNDECIDED:     { bg: '#fffbeb', color: '#b45309', label: 'Undecided' },
};

const GATHERING_TYPES = [
  { value: 'lords_day', label: "Lord's Day Service" },
  { value: 'wednesday_service', label: 'Wednesday Service' },
  { value: 'hs_ya_service', label: 'HS / YA Service' },
  { value: 'bible_seminar', label: 'Bible Seminar' },
  { value: 'prayer_meeting', label: 'Prayer Meeting' },
  { value: 'other', label: 'Other' },
];

const GATHERING_LABEL = Object.fromEntries(GATHERING_TYPES.map((g) => [g.value, g.label]));

const blankServiceForm = () => ({
  title: '',
  gathering_type: 'lords_day',
  service_date: '',
  service_time: '',
  duration_minutes: '90',
  event_id: '',
  capacity: '',
  total_parking_slots: '',
  response_deadline: '',
  status: 'draft',
});

export default function ServicesPage() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const { confirm } = useConfirmation();
  const canCreate = hasPermission('services', 'create');
  const canUpdate = hasPermission('services', 'update');
  const canDelete = hasPermission('services', 'delete');
  const isMember  = user?.roleName === 'Member';

  const [activeTab, setActiveTab]       = useState('schedule'); // 'schedule' | 'program' | 'recurring'
  const [plannerServiceId, setPlannerServiceId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [services, setServices]         = useState([]);
  const [eventOptions, setEventOptions] = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [limit, setLimit]               = useState(15);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [sortOrder, setSortOrder]       = useState('date_desc');
  const [showForm, setShowForm]         = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const [form, setForm] = useState(() => blankServiceForm());
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Member Pre-registration
  const [preRegTarget, setPreRegTarget]   = useState(null);
  const [preRegForm, setPreRegForm]       = useState({ attendance_status: 'ATTENDING', seat_number: '', parking_slot: '' });
  const [preRegSaving, setPreRegSaving]   = useState(false);
  const [preRegError, setPreRegError]     = useState('');
  const [preRegSuccess, setPreRegSuccess] = useState('');
  const [myResponses, setMyResponses]     = useState({});

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit, sort: sortOrder });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('gathering_type', typeFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      const res = await axiosInstance.get(`/services?${params}`);
      const d   = res.data.data || {};
      setServices(d.services || []);
      setTotal(Number(d.total || 0));
      setTotalPages(Number(d.total_pages || 1));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load services.'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter, debouncedSearch, sortOrder]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  useEffect(() => {
    if (isMember || !canCreate) return;
    axiosInstance.get('/events?limit=100&timeframe=upcoming&sort=upcoming_first')
      .then((res) => setEventOptions((res.data.data?.events || []).filter((ev) => ['Upcoming', 'Ongoing'].includes(ev.status))))
      .catch(() => setEventOptions([]));
  }, [isMember, canCreate]);

  useEffect(() => {
    if (!isMember || services.length === 0) return;
    const fetchResponses = async () => {
      const results = {};
      await Promise.allSettled(services.map(async (sv) => {
        try {
          const res = await axiosInstance.get(`/services/${sv.id}/responses`);
          const myRes = (res.data.data?.responses || []).find((r) => r.member_id === user?.memberId);
          if (myRes) results[sv.id] = myRes;
        } catch {}
      }));
      setMyResponses(results);
    };
    fetchResponses();
  }, [services, isMember, user?.memberId]);

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const openCreateForm = () => {
    setEditingService(null);
    setForm(blankServiceForm());
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (service) => {
    setEditingService(service);
    setForm({
      title: service.title || '',
      gathering_type: service.gathering_type || 'lords_day',
      service_date: String(service.service_date || '').slice(0, 10),
      service_time: String(service.service_time || '').slice(0, 5),
      duration_minutes: service.duration_minutes != null ? String(service.duration_minutes) : '90',
      event_id: service.event_id ? String(service.event_id) : '',
      capacity: String(service.capacity ?? ''),
      total_parking_slots: String(service.total_parking_slots ?? ''),
      response_deadline: toLocalDateTimeInput(service.response_deadline),
      status: service.status || 'draft',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingService(null);
    setForm(blankServiceForm());
    setFormError('');
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        title: form.title.trim(),
        gathering_type: form.gathering_type || 'lords_day',
        service_date: form.service_date,
        service_time: form.service_time || null,
        duration_minutes: form.duration_minutes === '' ? null : Number(form.duration_minutes),
        event_id: form.event_id ? Number(form.event_id) : null,
        capacity: form.capacity === '' ? null : Number(form.capacity),
        total_parking_slots: form.total_parking_slots === '' ? null : Number(form.total_parking_slots),
        response_deadline: form.response_deadline || null,
      };
      if (editingService) {
        await axiosInstance.put(`/services/${editingService.id}`, payload);
      } else {
        payload.status = form.status;
        if (!payload.response_deadline) delete payload.response_deadline;
        await axiosInstance.post('/services', payload);
      }
      setShowForm(false);
      setEditingService(null);
      setForm(blankServiceForm());
      await fetchServices();
    } catch (err) {
      setFormError(apiErrorMessage(err, `Failed to ${editingService ? 'update' : 'create'} service.`));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (serviceId, newStatus) => {
    setStatusUpdating(serviceId);
    setError('');
    try {
      await axiosInstance.patch(`/services/${serviceId}/status`, { status: newStatus });
      await fetchServices();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update status.'));
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleArchiveService = async (service) => {
    if (!(await confirm({
      title: 'Archive service?',
      message: `Archive "${service.title}"? Attendance, QR sessions, roster responses, summaries, and follow-up history remain intact and restorable from Archives.`,
      confirmLabel: 'Archive service',
    }))) return;
    try {
      await axiosInstance.patch(`/services/${service.id}/archive`);
      await fetchServices();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to archive service.'));
    }
  };

  const openPreReg = (service) => {
    const existing = myResponses[service.id];
    setPreRegForm({
      attendance_status: String(existing?.attendance_status || 'ATTENDING').toUpperCase(),
      seat_number:       existing?.seat_number  ?? '',
      parking_slot:      existing?.parking_slot ?? '',
    });
    setPreRegError('');
    setPreRegSuccess('');
    setPreRegTarget(service);
  };

  const handlePreRegSubmit = async (e) => {
    e.preventDefault();
    setPreRegSaving(true);
    setPreRegError('');
    setPreRegSuccess('');
    try {
      const payload = {
        member_id:         user?.memberId,
        attendance_status: preRegForm.attendance_status,
        ...(preRegForm.seat_number  !== '' && { seat_number:  parseInt(preRegForm.seat_number, 10) }),
        ...(preRegForm.parking_slot !== '' && { parking_slot: parseInt(preRegForm.parking_slot, 10) }),
      };
      await axiosInstance.post(`/services/${preRegTarget.id}/responses`, payload);
      setPreRegSuccess('Your pre-registration has been saved!');
      const res = await axiosInstance.get(`/services/${preRegTarget.id}/responses`);
      const myRes = (res.data.data?.responses || []).find((r) => r.member_id === user?.memberId);
      if (myRes) setMyResponses((prev) => ({ ...prev, [preRegTarget.id]: myRes }));
      setTimeout(() => setPreRegTarget(null), 1200);
    } catch (err) {
      setPreRegError(apiErrorMessage(err, 'Failed to save response.'));
    } finally {
      setPreRegSaving(false);
    }
  };

  const formatDate = (d) => d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = String(t).split(':');
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const statusChips = isMember
    ? [{ value: '', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'completed', label: 'Completed' }]
    : [{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }];

  const exportSchedule = async (format = "csv") => {
    setExporting(true);
    try {
      const params = { sort: sortOrder, ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        ...(statusFilter && { status: statusFilter }), ...(typeFilter && { gathering_type: typeFilter }) };
      const rows = await fetchAllPages('/services', 'services', params);
      await downloadReportCsv('plwm-mcc-service-schedule.csv', 'Service Schedule',
        [['Search', params.search || 'All'], ['Status', statusFilter || 'All'], ['Gathering type', typeFilter || 'All']], [
          { title: 'Summary', columns: ['Metric', 'Count'], records: [['Matching services', rows.length]] },
          { title: 'Services', columns: ['Service', 'Date', 'Time (Manila)', 'Gathering type', 'Status', 'Capacity', 'Parking slots'],
            records: rows.map((row) => [row.title, row.service_date, row.service_time, row.gathering_type,
              row.status, row.capacity, row.total_parking_slots]) },
        ], format);
    } catch (failure) {
      setError(failure.response?.data?.message || failure.message || 'The service schedule could not be exported.');
    } finally { setExporting(false); }
  };

  return (
    <div className="mcc-module mcc-module-services-page">
      <div style={styles.pageHeader}>
        <div>
          <h1 className="workspace-page-title" style={styles.title}>Services</h1>
          <p style={styles.subtitle}>
            {total} {total === 1 ? 'service' : 'services'} scheduled
          </p>
        </div>
        {!isMember && (activeTab === 'schedule' || canCreate) && (
          <div className="mcc-header-actions">
            {activeTab === 'schedule' && (
              <>
                <button type="button" className="mcc-btn-secondary" disabled={exporting} onClick={() => exportSchedule('xlsx')}>Download Excel</button>
                <button type="button" className="mcc-btn-secondary" disabled={exporting} onClick={() => exportSchedule('csv')}>Download CSV</button>
              </>
            )}
            {canCreate && (
              <button type="button" onClick={openCreateForm} className="mcc-btn-primary">+ New Service</button>
            )}
          </div>
        )}
      </div>
      {exporting && <p role="status" style={styles.subtitle}>Preparing service schedule…</p>}

      {/* Unified single-level top tab bar for staff */}
      {!isMember && (
        <div className="mcc-tablist" role="tablist" aria-label="Services views">
          {[
            { id: 'schedule', label: 'Schedule' },
            { id: 'program', label: 'Program & Servants' },
            { id: 'recurring', label: 'Recurring Rules' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              className="mcc-tab"
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {isMember && !user?.memberId && (
        <div style={styles.warnBox}>
          <MonoIcon name="warning" size={16} /> Your account is not linked to a member profile. Contact your admin to enable service pre-registration.
        </div>
      )}
      {isMember && (
        <div style={styles.memberHint}>
          <MonoIcon name="church" size={16} /> Click <strong>Pre-Register</strong> on any published service to set your attendance.
        </div>
      )}

      {(isMember || activeTab === 'schedule') && (
        <>
          <CollectionToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search service title or venue..."
            tabs={statusChips.map((c) => ({ key: c.value, label: c.label }))}
            activeTab={statusFilter}
            onTabChange={(val) => { setStatusFilter(val); setPage(1); }}
            filters={[
              {
                key: 'type',
                label: 'Filter by gathering type',
                value: typeFilter,
                onChange: (v) => { setTypeFilter(v); setPage(1); },
                options: [{ value: '', label: 'All gathering types' }, ...GATHERING_TYPES],
              },
              {
                key: 'sort',
                label: 'Sort services',
                value: sortOrder,
                onChange: (v) => { setSortOrder(v); setPage(1); },
                options: [
                  { value: 'date_desc', label: 'Newest first' },
                  { value: 'date_asc', label: 'Oldest first' },
                  { value: 'title_asc', label: 'Title (A–Z)' },
                ],
              },
            ]}
          />

          {error && <div role="alert" style={styles.errorBox}>{error}</div>}

          <div style={styles.tableWrap}>
            <div className="mcc-table-scroll">
              <ResponsiveTable style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Service</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Date &amp; Time</th>
                    <th style={styles.th}>Attended / Cap</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={styles.centerCell}>Loading services…</td></tr>
                  ) : services.length === 0 ? (
                    <tr><td colSpan={6} style={styles.centerCell}>No services found.</td></tr>
                  ) : services.map((s, i) => {
                    const meta         = STATUS_META[s.status] || STATUS_META.draft;
                    const nextStatuses = (canUpdate && !isMember) ? (STATUS_FLOW[s.status] || []) : [];
                    const myResponse   = myResponses[s.id];
                    const responseKey  = String(myResponse?.attendance_status || '').toUpperCase();
                    const responseMeta = RESPONSE_META[responseKey];
                    const canPreReg    = isMember && s.status === 'published' && !!user?.memberId;
                    const checked      = s.ServiceAttendanceSummary?.total_attended ?? 0;
                    const preReg       = s.pre_registered_count ?? 0;
                    const display      = checked > 0 ? checked : preReg;
                    const isPreReg     = checked === 0 && preReg > 0;

                    return (
                      <tr key={s.id} style={{ background: i % 2 === 0 ? 'var(--mcc-surface, #fff)' : '#f8fafc' }}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600, color: 'var(--mcc-ink, #0f172a)' }}>{s.title}</div>
                          {s.event?.title && <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Linked event: {s.event.title}</div>}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.typePill}>{GATHERING_LABEL[s.gathering_type] || 'Service'}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 500, color: 'var(--mcc-ink, #0f172a)' }}>{formatDate(s.service_date)}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {formatTime(s.service_time)}
                            {s.duration_minutes ? ` · ${s.duration_minutes}m` : ''}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontWeight: 700, color: isPreReg ? '#b45309' : '#005599' }}>{display}</span>
                          {s.capacity != null && <span style={{ color: '#64748b' }}> / {s.capacity}</span>}
                          {isPreReg && <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600, marginLeft: 4 }}>pre-reg</span>}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: meta.bg, color: meta.color }}>{meta.label}</span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <div style={{ ...styles.actions, justifyContent: 'flex-end' }}>
                            {!isMember && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/services/${s.id}/attendance`)}
                                  style={styles.viewBtn}
                                >
                                  <MonoIcon name="attendance" size={14} /> Attendance
                                </button>
                                <IconActionButton
                                  icon="clipboard"
                                  label="Program"
                                  title="Open Program & Servants"
                                  tone="neutral"
                                  onClick={() => { setPlannerServiceId(String(s.id)); setActiveTab('program'); }}
                                />
                              </>
                            )}
                            {canUpdate && !isMember && !['completed', 'cancelled'].includes(s.status) && (
                              <IconActionButton icon="edit" label="Edit" title="Edit service" tone="neutral" onClick={() => openEditForm(s)} />
                            )}
                            {nextStatuses.map((ns) => {
                              const iconName = ns === 'published' ? 'checkCircle' : ns === 'completed' ? 'check' : 'close';
                              const tone = ns === 'published' ? 'primary' : ns === 'completed' ? 'success' : 'danger';
                              return (
                                <IconActionButton
                                  key={ns}
                                  icon={iconName}
                                  label={STATUS_ACTION_LABEL[ns]}
                                  title={`${STATUS_ACTION_LABEL[ns]} service`}
                                  tone={tone}
                                  disabled={statusUpdating === s.id}
                                  onClick={() => handleStatusChange(s.id, ns)}
                                />
                              );
                            })}
                            {canDelete && !isMember && ['completed', 'cancelled'].includes(s.status) && (
                              <IconActionButton icon="archive" label="Archive" title="Archive service" tone="danger" onClick={() => handleArchiveService(s)} />
                            )}
                            {canPreReg && (
                              <button type="button" onClick={() => openPreReg(s)} style={styles.preRegBtn}>
                                {myResponse ? <><MonoIcon name="edit" size={14} /> Update RSVP</> : <><MonoIcon name="clipboard" size={14} /> Pre-Register</>}
                              </button>
                            )}
                            {isMember && myResponse && (
                              <span style={{ ...styles.badge, background: responseMeta?.bg || '#f1f5f9', color: responseMeta?.color || '#475569' }}>
                                {responseMeta?.label || myResponse.attendance_status}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ResponsiveTable>
            </div>
          </div>

          <CompactPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            pageSizes={[15, 25, 50]}
            onPageChange={setPage}
            onLimitChange={(next) => { setLimit(next); setPage(1); }}
          />
        </>
      )}

      {!isMember && activeTab === 'program' && (
        <ServicePlannerPanel
          services={services}
          canCreate={canCreate}
          canUpdate={canUpdate}
          initialTab="program"
          initialServiceId={plannerServiceId}
          embedded
          onServicesGenerated={fetchServices}
        />
      )}

      {!isMember && activeTab === 'recurring' && (
        <ServicePlannerPanel
          services={services}
          canCreate={canCreate}
          canUpdate={canUpdate}
          initialTab="recurring"
          embedded
          onServicesGenerated={fetchServices}
        />
      )}

      {/* Create / Edit Service Modal */}
      <ModalDialog
        open={showForm}
        onClose={closeForm}
        title={editingService ? 'Edit Service' : 'Create New Service'}
        subtitle={editingService ? `Updating "${editingService.title}"` : 'Schedule a church service or gathering.'}
        maxWidth={680}
        footer={(
          <>
            <button type="button" className="mcc-btn-secondary" onClick={closeForm} disabled={saving}>Cancel</button>
            <button type="submit" form="mcc-service-form" className="mcc-btn-primary" disabled={saving}>
              {saving ? (editingService ? 'Saving…' : 'Creating…') : (editingService ? 'Save Changes' : 'Create Service')}
            </button>
          </>
        )}
      >
        {formError && <div role="alert" style={styles.errorBox}>{formError}</div>}
        <form id="mcc-service-form" onSubmit={handleSaveService} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-title">Title *</label>
              <input id="servicespage-title" name="title" value={form.title} onChange={handleFormChange} maxLength={150}
                placeholder="e.g. Sunday Service — March 9" required style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-gathering_type">Gathering Type</label>
              <select id="servicespage-gathering_type" name="gathering_type" value={form.gathering_type} onChange={handleFormChange} style={styles.select}>
                {GATHERING_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            {!editingService && (
              <div style={styles.field}>
                <label style={styles.label} htmlFor="servicespage-status">Initial Status</label>
                <select id="servicespage-status" name="status" value={form.status} onChange={handleFormChange} style={styles.select}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            )}
          </div>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-service_date">Date *</label>
              <input id="servicespage-service_date" type="date" name="service_date" value={form.service_date} onChange={handleFormChange} required style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-service_time">Time (optional)</label>
              <input id="servicespage-service_time" type="time" name="service_time" value={form.service_time} onChange={handleFormChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-duration_minutes">Duration (mins)</label>
              <input id="servicespage-duration_minutes" type="number" min="15" max="480" name="duration_minutes" value={form.duration_minutes}
                onKeyDown={blockInvalidIntegerKeys}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: sanitizeWholeNumber(e.target.value, { maxLength: 3 }) }))}
                placeholder="90" style={styles.input} />
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-capacity">Capacity (optional)</label>
              <input id="servicespage-capacity" type="number" name="capacity" value={form.capacity}
                onKeyDown={blockInvalidIntegerKeys}
                onChange={(e) => setForm((f) => ({ ...f, capacity: sanitizeWholeNumber(e.target.value, { maxLength: 6 }) }))}
                min="1" placeholder="Not specified" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-total_parking_slots">Parking Slots (optional)</label>
              <input id="servicespage-total_parking_slots" type="number" name="total_parking_slots" value={form.total_parking_slots}
                onKeyDown={blockInvalidIntegerKeys}
                onChange={(e) => setForm((f) => ({ ...f, total_parking_slots: sanitizeWholeNumber(e.target.value, { maxLength: 5 }) }))}
                min="0" placeholder="Not specified" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-response_deadline">Response Deadline</label>
              <input id="servicespage-response_deadline" type="datetime-local" name="response_deadline" value={form.response_deadline}
                onChange={handleFormChange} style={styles.input} />
            </div>
          </div>
          {!editingService && (
            <div style={styles.field}>
              <label style={styles.label} htmlFor="servicespage-event_id">Linked Event (optional)</label>
              <select id="servicespage-event_id" name="event_id" value={form.event_id} onChange={handleFormChange} style={styles.select}>
                <option value="">No linked event</option>
                {eventOptions.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
              <small style={styles.helperText}>A linked event can have one attendance service.</small>
            </div>
          )}
        </form>
      </ModalDialog>

      {/* Member Pre-Registration Modal */}
      <ModalDialog
        open={Boolean(preRegTarget)}
        onClose={() => { if (!preRegSaving) setPreRegTarget(null); }}
        title="Pre-Register for Service"
        subtitle={preRegTarget ? `${preRegTarget.title} · ${formatDate(preRegTarget.service_date)} at ${formatTime(preRegTarget.service_time)}` : ''}
        maxWidth={500}
        footer={!preRegSuccess ? (
          <>
            <button type="button" className="mcc-btn-secondary" onClick={() => setPreRegTarget(null)} disabled={preRegSaving}>Cancel</button>
            <button type="submit" form="mcc-prereg-form" className="mcc-btn-primary" disabled={preRegSaving}>
              {preRegSaving ? 'Saving…' : 'Save Response'}
            </button>
          </>
        ) : null}
      >
        {preRegSuccess ? (
          <div style={styles.successBox}>{preRegSuccess}</div>
        ) : preRegTarget ? (
          <form id="mcc-prereg-form" onSubmit={handlePreRegSubmit} style={styles.form}>
            {preRegError && <div role="alert" style={styles.errorBox}>{preRegError}</div>}
            <div style={styles.field}>
              <label style={styles.label}>Attendance *</label>
              <div style={styles.radioGroup}>
                {[
                  { value: 'ATTENDING',     label: 'Attending',     color: '#15803d', bg: '#dcfce7' },
                  { value: 'NOT_ATTENDING', label: 'Not Attending', color: '#dc2626', bg: '#fef2f2' },
                  { value: 'UNDECIDED',     label: 'Undecided',     color: '#b45309', bg: '#fffbeb' },
                ].map((opt) => (
                  <label key={opt.value} style={{
                    ...styles.radioOption,
                    background:  preRegForm.attendance_status === opt.value ? opt.bg : '#f8fafc',
                    borderColor: preRegForm.attendance_status === opt.value ? opt.color : '#e2e8f0',
                    color:       preRegForm.attendance_status === opt.value ? opt.color : '#374151',
                  }}>
                    <input
                      type="radio"
                      name="attendance_status"
                      value={opt.value}
                      checked={preRegForm.attendance_status === opt.value}
                      onChange={(e) => setPreRegForm((prev) => ({ ...prev, attendance_status: e.target.value }))}
                      style={{ display: 'none' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>Preferred Seat # (optional)</label>
                <input
                  type="number" min="1" max={preRegTarget.capacity || undefined} step="1"
                  value={preRegForm.seat_number}
                  onKeyDown={blockInvalidIntegerKeys}
                  onChange={(e) => setPreRegForm((prev) => ({ ...prev, seat_number: sanitizeWholeNumber(e.target.value, { maxLength: 5 }) }))}
                  placeholder="e.g. 12"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Parking Slot # (optional)</label>
                <input
                  type="number" min="1" max={preRegTarget.total_parking_slots || undefined} step="1"
                  value={preRegForm.parking_slot}
                  onKeyDown={blockInvalidIntegerKeys}
                  onChange={(e) => setPreRegForm((prev) => ({ ...prev, parking_slot: sanitizeWholeNumber(e.target.value, { maxLength: 4 }) }))}
                  placeholder="e.g. 5"
                  style={styles.input}
                />
              </div>
            </div>
          </form>
        ) : null}
      </ModalDialog>
    </div>
  );
}

const styles = {
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  title:       { fontSize: '24px', fontWeight: '700', color: 'var(--mcc-ink, #0f172a)', margin: 0 },
  subtitle:    { fontSize: '13.5px', color: 'var(--mcc-secondary, #52647a)', margin: '4px 0 0 0' },
  warnBox:     { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '13.5px', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '8px' },
  memberHint:  { background: '#e8f4fd', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13.5px', color: '#005599', display: 'flex', alignItems: 'center', gap: '8px' },
  form:        { display: 'flex', flexDirection: 'column', gap: '14px' },
  formRow:     { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  field:       { display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 160px', minWidth: 0 },
  helperText:  { fontSize: '11.5px', color: '#64748b' },
  label:       { fontSize: '12.5px', fontWeight: '600', color: '#334155' },
  input:       { padding: '9px 11px', fontSize: '13.5px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', color: 'var(--mcc-ink, #0f172a)', background: 'var(--mcc-surface, #fff)' },
  select:      { padding: '9px 11px', fontSize: '13.5px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: 'var(--mcc-surface, #fff)', color: 'var(--mcc-ink, #0f172a)' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '13.5px', marginBottom: '12px' },
  successBox:  { background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: '8px', padding: '14px', fontSize: '14px', textAlign: 'center' },
  tableWrap:   { background: 'var(--mcc-surface, #fff)', borderRadius: '12px', border: '1px solid var(--mcc-border, #e2e8f0)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  thead:       { background: '#f8fafc' },
  th:          { padding: '10px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--mcc-secondary, #52647a)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--mcc-border, #e2e8f0)', whiteSpace: 'nowrap' },
  td:          { padding: '10px 12px', fontSize: '13.5px', color: '#374151', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  centerCell:  { padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '14px' },
  typePill:    { display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '11.5px', fontWeight: '600', background: '#f1f5f9', color: '#334155', whiteSpace: 'nowrap' },
  badge:       { display: 'inline-block', padding: '3px 9px', borderRadius: '999px', fontSize: '11.5px', fontWeight: '600', whiteSpace: 'nowrap' },
  actions:     { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
  viewBtn:     { background: '#e8f4fd', color: '#005599', border: '1px solid #bae6fd', borderRadius: '7px', padding: '5px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' },
  preRegBtn:   { background: 'linear-gradient(135deg, #005599,#13B5EA)', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 11px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' },
  radioGroup:  { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  radioOption: { flex: 1, minWidth: '110px', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid', cursor: 'pointer', fontSize: '13px', fontWeight: '600', textAlign: 'center' },
};
