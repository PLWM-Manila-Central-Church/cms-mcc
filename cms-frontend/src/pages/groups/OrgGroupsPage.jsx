import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import MonoIcon from '../../components/common/MonoIcon';
import { displayMemberName } from '../../utils/displayIdentity';
import { sanitizeCode } from '../../utils/inputConstraints';
import SearchableMemberPicker from '../../components/common/SearchableMemberPicker';

const GROUP_CATEGORIES = ['Service Team', 'Department', 'Committee', 'Worship & Music', 'Technical & Media', 'Education'];

export default function OrgGroupsPage() {
  const { hasPermission, user } = useAuth();
  const isMobile = useIsMobile();

  const canCreate = hasPermission('ministry', 'create');
  const isScopedMinistryLeader = user?.roleName === 'Ministry Leader' && Boolean(user?.leadsMinistryId);
  const canUpdate = hasPermission('ministry', 'update') || isScopedMinistryLeader;

  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('positions');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Create group modal
  const [showCreate, setShowCreate] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', code: '', category: 'Service Team', description: '' });

  // Inline sub-forms
  const [posForm, setPosForm] = useState({ name: '', responsibilities: '' });
  const [assignForm, setAssignForm] = useState({ member_id: '', position_id: '' });
  const [actForm, setActForm] = useState({ title: '', activity_date: '', start_time: '', location: '' });
  const [taskForm, setTaskForm] = useState({ title: '', assigned_member_id: '', due_date: '' });

  const loadGroups = useCallback(async (preferredId = null) => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/groups');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setGroups(rows);
      setSelectedId((prev) => {
        const target = preferredId ?? prev;
        if (target && rows.some((r) => Number(r.id) === Number(target))) return Number(target);
        return rows[0]?.id ?? null;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load ministries.');
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
      const res = await axiosInstance.get(`/groups/${id}`);
      setDetail(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load group details.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const searchAssignableMembers = useCallback(async (query) => {
    if (isScopedMinistryLeader) {
      const response = await axiosInstance.get('/ministry/members/search', { params: { q: query } });
      return response.data?.data || [];
    }
    const response = await axiosInstance.get('/members/options', { params: { search: query, limit: 20, status: 'Active' } });
    return response.data?.data || [];
  }, [isScopedMinistryLeader]);

  const teamMembers = useMemo(() => {
    const rows = [
      ...(detail?.member_positions || []).map((row) => row.member || row.Member),
      ...(detail?.roster || []).map((row) => row.member || row.Member),
    ];
    return [...new Map(rows.filter((member) => member?.id).map((member) => [Number(member.id), member])).values()];
  }, [detail]);
  const teamMemberIds = useMemo(() => teamMembers.map((member) => Number(member.id)), [teamMembers]);

  const totals = useMemo(() => ({
    groups: groups.length,
    volunteers: groups.reduce((s, g) => s + Number(g.member_count || 0), 0),
    positions: groups.reduce((s, g) => s + Number(g.position_count || 0), 0),
    openTasks: groups.reduce((s, g) => s + Number(g.open_task_count || 0), 0),
  }), [groups]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;
    try {
      const res = await axiosInstance.post('/groups', {
        name: groupForm.name.trim(),
        code: groupForm.code.trim() || null,
        category: groupForm.category,
        description: groupForm.description.trim() || null,
      });
      setShowCreate(false);
      setGroupForm({ name: '', code: '', category: 'Service Team', description: '' });
      setNotice(`Serving group "${res.data?.data?.name || groupForm.name}" created.`);
      await loadGroups(res.data?.data?.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create group.');
    }
  };

  const handleAddPosition = async (e) => {
    e.preventDefault();
    if (!detail?.id || !posForm.name.trim()) return;
    try {
      await axiosInstance.post(`/groups/${detail.id}/positions`, {
        name: posForm.name.trim(),
        responsibilities: posForm.responsibilities.trim() || null,
      });
      setPosForm({ name: '', responsibilities: '' });
      setNotice('Position added.');
      await loadDetail(detail.id);
      await loadGroups(detail.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add position.');
    }
  };

  const handleArchivePosition = async (posId) => {
    if (!detail?.id) return;
    try {
      await axiosInstance.post(`/groups/${detail.id}/positions/${posId}/archive`);
      setNotice('Position archived.');
      await loadDetail(detail.id);
      await loadGroups(detail.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to archive position.');
    }
  };

  const handleAssignMember = async (e) => {
    e.preventDefault();
    if (!detail?.id || !assignForm.member_id) return;
    try {
      await axiosInstance.post(`/groups/${detail.id}/member-positions`, {
        member_id: Number(assignForm.member_id),
        position_id: assignForm.position_id ? Number(assignForm.position_id) : null,
      });
      setAssignForm({ member_id: '', position_id: '' });
      setNotice('Member assigned to serving team.');
      await loadDetail(detail.id);
      await loadGroups(detail.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to assign member.');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!detail?.id || !actForm.title.trim()) return;
    try {
      await axiosInstance.post(`/groups/${detail.id}/activities`, {
        title: actForm.title.trim(),
        activity_date: actForm.activity_date || null,
        start_time: actForm.start_time || null,
        location: actForm.location.trim() || null,
      });
      setActForm({ title: '', activity_date: '', start_time: '', location: '' });
      setNotice('Activity scheduled.');
      await loadDetail(detail.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to schedule activity.');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!detail?.id || !taskForm.title.trim()) return;
    try {
      await axiosInstance.post(`/groups/${detail.id}/tasks`, {
        title: taskForm.title.trim(),
        assigned_member_id: taskForm.assigned_member_id ? Number(taskForm.assigned_member_id) : null,
        due_date: taskForm.due_date || null,
      });
      setTaskForm({ title: '', assigned_member_id: '', due_date: '' });
      setNotice('Task created.');
      await loadDetail(detail.id);
      await loadGroups(detail.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create task.');
    }
  };

  const handleTaskStatus = async (taskId, status) => {
    if (!detail?.id) return;
    try {
      await axiosInstance.patch(`/groups/${detail.id}/tasks/${taskId}/status`, { status });
      await loadDetail(detail.id);
      await loadGroups(detail.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update task status.');
    }
  };

  return (
    <div className="mcc-module mcc-module-org-groups" style={S.page}>
      <div style={S.header}>
        <div>
          <h1 className="workspace-page-title" style={S.title}>Ministries</h1>
          <p style={S.subtitle}>
            {isScopedMinistryLeader
              ? `Manage the roster, positions, tasks, and activities for ${user.leadsMinistryName || 'your assigned ministry'}.`
              : 'Service teams, departments, and committees (Choir, Ushers, Sound &amp; Media, Broadcast, Teachers, Event Committees). Members may serve in multiple teams.'}
          </p>
        </div>
        <div style={S.headerActions}>
          <Link to="/ministry/schedules" style={S.secondaryLink}>
            <MonoIcon name="schedule" size={15} />
            <span>Schedules</span>
          </Link>
          <Link to="/ministry" style={S.secondaryLink}>
            <MonoIcon name="substitute" size={15} />
            <span>Service Assignments</span>
          </Link>
          {canCreate && (
            <button type="button" onClick={() => setShowCreate(true)} style={S.primaryBtn}>
              <MonoIcon name="plus" size={15} />
              <span>New Ministry / Team</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ ...S.kpiGrid, gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))' }}>
        <KpiCard label="Ministries" value={totals.groups} accent="#005599" />
        <KpiCard label="Team Volunteers" value={totals.volunteers} accent="#003d70" />
        <KpiCard label="Defined Positions" value={totals.positions} accent="#13b5ea" />
        <KpiCard label="Open Tasks" value={totals.openTasks} accent="#52647a" />
      </div>

      {error && <div style={S.errorBox} role="alert">{error}</div>}
      {notice && <div style={S.noticeBox}>{notice}</div>}

      <div style={{
        ...S.workspaceGrid,
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(260px, 310px) minmax(0, 1fr)',
      }}>
        {/* Left: Groups Directory */}
        <section style={S.card} aria-label="Ministries directory">
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>Ministry Teams</h2>
            <span style={S.countPill}>{groups.length}</span>
          </div>
          {loading ? (
            <p style={S.muted}>Loading groups…</p>
          ) : groups.length === 0 ? (
            <p style={S.muted}>No ministries available.</p>
          ) : (
            <div style={S.list}>
              {groups.map((g) => {
                const active = Number(selectedId) === Number(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedId(g.id)}
                    style={{ ...S.listItem, ...(active ? S.listItemActive : {}) }}
                  >
                    <div style={S.listItemTop}>
                      <span style={S.listItemName}>{g.name}</span>
                      <span style={active ? S.badgeActive : S.badge}>{g.member_count || 0}</span>
                    </div>
                    <div style={S.listItemMeta}>
                      <span>{g.category || 'Service Team'}</span>
                      <span>· {g.position_count || 0} roles</span>
                      {g.open_task_count > 0 && <span>· {g.open_task_count} open</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Group Workspace */}
        <section style={S.card} aria-label="Serving group workspace">
          {detailLoading ? (
            <p style={S.muted}>Loading group workspace…</p>
          ) : !detail ? (
            <p style={S.muted}>Select a ministry to manage positions, volunteers, activities, and tasks.</p>
          ) : (
            <>
              <div style={S.detailHead}>
                <div>
                  <div style={S.titleRow}>
                    <h2 style={S.detailTitle}>{detail.name}</h2>
                    <span style={S.catTag}>{detail.category || 'Service Team'}</span>
                    {detail.code && <span style={S.codeTag}>{detail.code}</span>}
                  </div>
                  <p style={S.detailDesc}>{detail.description || 'Organizational ministry team supporting church services and events.'}</p>
                </div>
              </div>

              <div style={S.tabRow} role="tablist">
                {[
                  { id: 'positions', label: `Roster & Positions (${(detail.member_positions?.length || detail.roster?.length || 0)})` },
                  { id: 'tasks', label: `Tasks (${detail.tasks?.length || 0})` },
                  { id: 'activities', label: `Activities (${detail.activities?.length || 0})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{ ...S.tabBtn, ...(activeTab === t.id ? S.tabBtnActive : {}) }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'positions' && (
                <div style={S.stack}>
                  {/* Defined Positions */}
                  <div>
                    <h3 style={S.subTitle}>Defined Team Positions</h3>
                    <div style={S.chipWrap}>
                      {(detail.positions || []).length === 0 ? (
                        <span style={S.muted}>No specific positions defined yet (e.g., Head Usher, Sound Engineer, Soprano).</span>
                      ) : (
                        detail.positions.map((pos) => (
                          <span key={pos.id} style={S.posChip}>
                            <span>{pos.name}</span>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => handleArchivePosition(pos.id)}
                                style={S.chipClose}
                                title="Archive position"
                                aria-label={`Archive ${pos.name}`}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                    {canUpdate && (
                      <form onSubmit={handleAddPosition} style={S.inlineForm}>
                        <input
                          value={posForm.name}
                          onChange={(e) => setPosForm({ ...posForm, name: e.target.value })}
                          placeholder="New position (e.g. Sound Tech, Choir Alto)"
                          style={S.input}
                        />
                        <input
                          value={posForm.responsibilities}
                          onChange={(e) => setPosForm({ ...posForm, responsibilities: e.target.value })}
                          placeholder="Brief responsibilities (optional)"
                          style={S.input}
                        />
                        <button type="submit" style={S.smallPrimaryBtn}>Add Position</button>
                      </form>
                    )}
                  </div>

                  {/* Assign Volunteer */}
                  {canUpdate && (
                    <form onSubmit={handleAssignMember} style={S.inlineBoxForm}>
                      <div style={S.subTitle}>Assign Volunteer to Team</div>
                      <div style={S.inlineForm}>
                        <SearchableMemberPicker
                          value={assignForm.member_id}
                          onChange={(member_id) => setAssignForm((current) => ({ ...current, member_id }))}
                          searchMembers={searchAssignableMembers}
                          excludeIds={teamMemberIds}
                          placeholder="Search a church member…"
                          ariaLabel="Search a member to add to this ministry roster"
                          style={{ flex: '1 1 220px' }}
                        />
                        <select
                          value={assignForm.position_id}
                          onChange={(e) => setAssignForm({ ...assignForm, position_id: e.target.value })}
                          style={S.input}
                          aria-label="Select position"
                        >
                          <option value="">General Team Member</option>
                          {(detail.positions || []).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button type="submit" style={S.smallPrimaryBtn}>Assign</button>
                      </div>
                    </form>
                  )}

                  {/* Team Roster Table */}
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Volunteer</th>
                          <th style={S.th}>Position</th>
                          <th style={S.th}>Phone</th>
                          <th style={S.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.member_positions?.length > 0 ? detail.member_positions : detail.roster || []).length === 0 ? (
                          <tr><td colSpan={4} style={S.emptyCell}>No volunteers assigned to this team yet.</td></tr>
                        ) : (
                          (detail.member_positions?.length > 0 ? detail.member_positions : detail.roster).map((row) => {
                            const mem = row.member || row.Member;
                            return (
                              <tr key={`${row.id}-${mem?.id}`} style={S.tr}>
                                <td style={S.td}>
                                  {mem ? (
                                    <Link to={`/members/${mem.id}`} style={S.memberLink}>{displayMemberName(mem)}</Link>
                                  ) : '—'}
                                </td>
                                <td style={S.td}>{row.position?.name || 'Team Member'}</td>
                                <td style={S.td}>{mem?.phone || '—'}</td>
                                <td style={S.td}>
                                  <span style={S.pillActive}>{mem?.status || 'Active'}</span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div style={S.stack}>
                  {canUpdate && (
                    <form onSubmit={handleAddTask} style={S.inlineBoxForm}>
                      <div style={S.subTitle}>Add Team Task</div>
                      <div style={S.inlineForm}>
                        <input
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          placeholder="Task title (e.g. Soundcheck wireless mics)"
                          style={S.input}
                        />
                        <SearchableMemberPicker
                          members={teamMembers}
                          value={taskForm.assigned_member_id}
                          onChange={(assigned_member_id) => setTaskForm((current) => ({ ...current, assigned_member_id }))}
                          placeholder={teamMembers.length ? 'Search team members…' : 'Unassigned'}
                          ariaLabel="Assign task to a ministry team member"
                          style={{ flex: '1 1 220px' }}
                        />
                        <input
                          type="date"
                          value={taskForm.due_date}
                          onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                          style={S.input}
                        />
                        <button type="submit" style={S.smallPrimaryBtn}>Create Task</button>
                      </div>
                    </form>
                  )}

                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Task</th>
                          <th style={S.th}>Assigned To</th>
                          <th style={S.th}>Due Date</th>
                          <th style={S.th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.tasks || []).length === 0 ? (
                          <tr><td colSpan={4} style={S.emptyCell}>No tasks logged for this group yet.</td></tr>
                        ) : (
                          detail.tasks.map((task) => (
                            <tr key={task.id} style={S.tr}>
                              <td style={S.td}><strong>{task.title}</strong></td>
                              <td style={S.td}>{task.assignedMember ? displayMemberName(task.assignedMember) : 'Unassigned'}</td>
                              <td style={S.td}>{task.due_date || '—'}</td>
                              <td style={S.td}>
                                {canUpdate ? (
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleTaskStatus(task.id, e.target.value)}
                                    style={S.statusSelect}
                                    aria-label={`Status for ${task.title}`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                ) : (
                                  <span style={S.pillActive}>{task.status}</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'activities' && (
                <div style={S.stack}>
                  {canUpdate && (
                    <form onSubmit={handleAddActivity} style={S.inlineBoxForm}>
                      <div style={S.subTitle}>Schedule Group Activity / Rehearsal</div>
                      <div style={S.inlineForm}>
                        <input
                          value={actForm.title}
                          onChange={(e) => setActForm({ ...actForm, title: e.target.value })}
                          placeholder="Activity title (e.g. Choir Saturday Rehearsal)"
                          style={S.input}
                        />
                        <input
                          type="date"
                          value={actForm.activity_date}
                          onChange={(e) => setActForm({ ...actForm, activity_date: e.target.value })}
                          style={S.input}
                        />
                        <input
                          type="time"
                          value={actForm.start_time}
                          onChange={(e) => setActForm({ ...actForm, start_time: e.target.value })}
                          style={S.input}
                        />
                        <input
                          value={actForm.location}
                          onChange={(e) => setActForm({ ...actForm, location: e.target.value })}
                          placeholder="Venue / Room"
                          style={S.input}
                        />
                        <button type="submit" style={S.smallPrimaryBtn}>Schedule</button>
                      </div>
                    </form>
                  )}

                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Activity</th>
                          <th style={S.th}>Date</th>
                          <th style={S.th}>Time</th>
                          <th style={S.th}>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.activities || []).length === 0 ? (
                          <tr><td colSpan={4} style={S.emptyCell}>No scheduled group activities yet.</td></tr>
                        ) : (
                          detail.activities.map((a) => (
                            <tr key={a.id} style={S.tr}>
                              <td style={S.td}><strong>{a.title}</strong></td>
                              <td style={S.td}>{a.activity_date || '—'}</td>
                              <td style={S.td}>{a.start_time || '—'}</td>
                              <td style={S.td}>{a.location || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Create Ministry Modal */}
      {showCreate && (
        <div style={S.modalBackdrop} role="dialog" aria-modal="true" aria-label="Create Serving Group">
          <form onSubmit={handleCreateGroup} style={S.modal}>
            <div style={S.modalHead}>
              <h2 style={S.modalTitle}>New Serving Group / Team</h2>
              <button type="button" onClick={() => setShowCreate(false)} style={S.iconClose} aria-label="Close">
                <MonoIcon name="close" size={16} />
              </button>
            </div>
            <div style={S.formGrid}>
              <label style={S.field}>
                <span style={S.label}>Team Name *</span>
                <input
                  required
                  maxLength={100}
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="e.g. Sound & Media Team"
                  style={S.input}
                />
              </label>
              <label style={S.field}>
                <span style={S.label}>Category</span>
                <select
                  value={groupForm.category}
                  onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value })}
                  style={S.input}
                >
                  {GROUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label style={S.field}>
                <span style={S.label}>Short Code</span>
                <input
                  maxLength={16}
                  value={groupForm.code}
                  onChange={(e) => setGroupForm({ ...groupForm, code: sanitizeCode(e.target.value, 16) })}
                  placeholder="e.g. TECH, USHER"
                  style={S.input}
                />
              </label>
            </div>
            <label style={{ ...S.field, marginTop: 12 }}>
              <span style={S.label}>Description</span>
              <textarea
                rows={3}
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                style={S.textarea}
                placeholder="Team scope and service responsibilities"
              />
            </label>
            <div style={S.modalActions}>
              <button type="button" onClick={() => setShowCreate(false)} style={S.ghostBtn}>Cancel</button>
              <button type="submit" style={S.primaryBtn}>Create Ministry</button>
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
  subtitle: { margin: '4px 0 0', fontSize: 13.5, color: '#52647a', maxWidth: 720 },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: '#005599', color: '#fff', border: 'none', borderRadius: 10,
    padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
  smallPrimaryBtn: {
    background: '#005599', color: '#fff', border: 'none', borderRadius: 8,
    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  secondaryLink: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: '#fff', color: '#003d70', border: '1px solid #cbd5e1', borderRadius: 10,
    padding: '8px 14px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
  },
  kpiGrid: { display: 'grid', gap: 12 },
  kpiCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' },
  kpiLabel: { fontSize: 12, fontWeight: 600, color: '#52647a', textTransform: 'uppercase', letterSpacing: '0.04em' },
  kpiValue: { fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4 },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  noticeBox: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  workspaceGrid: { display: 'grid', gap: 16, alignItems: 'start' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, minWidth: 0 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: '#003d70' },
  countPill: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: {
    textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
  },
  listItemActive: { background: '#e8f4fd', border: '1px solid #005599' },
  listItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  listItemName: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  listItemMeta: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, fontSize: 12, color: '#52647a' },
  badge: { background: '#e2e8f0', color: '#334155', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  badgeActive: { background: '#005599', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  detailHead: { paddingBottom: 12, borderBottom: '1px solid #e2e8f0' },
  titleRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  detailTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' },
  catTag: { background: '#e8f4fd', color: '#005599', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6 },
  codeTag: { background: '#f1f5f9', color: '#003d70', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6 },
  detailDesc: { margin: '6px 0 0', fontSize: 13.5, color: '#52647a' },
  tabRow: { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0' },
  tabBtn: {
    background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0',
    borderRadius: 9, padding: '7px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  tabBtnActive: { background: '#005599', color: '#fff', border: '1px solid #005599' },
  stack: { display: 'flex', flexDirection: 'column', gap: 16 },
  subTitle: { margin: '0 0 8px', fontSize: 13.5, fontWeight: 700, color: '#003d70' },
  chipWrap: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  posChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#e8f4fd', color: '#003d70', borderRadius: 999,
    padding: '4px 10px', fontSize: 12.5, fontWeight: 600,
  },
  chipClose: { background: 'none', border: 'none', color: '#005599', cursor: 'pointer', fontWeight: 700, fontSize: 14, padding: 0 },
  inlineBoxForm: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
  inlineForm: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: {
    flex: '1 1 150px', minWidth: 0, boxSizing: 'border-box', padding: '8px 10px',
    border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff', color: '#0f172a',
  },
  statusSelect: {
    padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 7,
    fontSize: 12.5, background: '#fff', color: '#0f172a',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 },
  th: {
    textAlign: 'left', padding: '9px 10px', fontSize: 11.5, fontWeight: 700,
    color: '#52647a', textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '9px 10px', color: '#0f172a', verticalAlign: 'middle' },
  emptyCell: { padding: 20, textAlign: 'center', color: '#64748b' },
  memberLink: { color: '#005599', fontWeight: 600, textDecoration: 'none' },
  pillActive: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 600 },
  muted: { color: '#64748b', fontSize: 13.5, margin: '8px 0' },
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
    display: 'grid', placeItems: 'center', padding: 16, zIndex: 1000,
  },
  modal: { background: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: 520 },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  iconClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#52647a', padding: 4 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12.5, fontWeight: 600, color: '#334155' },
  textarea: { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5 },
  ghostBtn: {
    background: '#f8fafc', color: '#003d70', border: '1px solid #cbd5e1',
    borderRadius: 8, padding: '8px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
};
