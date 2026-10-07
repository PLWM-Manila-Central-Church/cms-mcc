import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const labelFor = (assignment) => assignment.teamName
  || `${assignment.scopeType === 'cell_group' ? 'Cell group' : 'Group'} #${assignment.scopeId}`;

export default function LeaderTeamsPage() {
  const { user, activeLeaderScopeKey, selectLeaderScope } = useAuth();
  const navigate = useNavigate();

  if (user?.roleName !== 'Leader') return <Navigate to="/dashboard" replace />;

  const assignments = user.leaderAssignments || [];
  const open = (scopeKey, path) => {
    if (scopeKey) selectLeaderScope(scopeKey);
    navigate(path);
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>LEADERSHIP</p>
          <h1 style={styles.title}>My Teams</h1>
          <p style={styles.subtitle}>Choose the team you are working with. Changes and attendance submissions always use one selected team.</p>
        </div>
        {assignments.length > 1 && (
          <button
            type="button"
            onClick={() => open('all', '/attendance/qr')}
            style={styles.secondaryButton}
          >
            View combined attendance
          </button>
        )}
      </header>

      {assignments.length === 0 ? (
        <section style={styles.empty}>
          <div style={styles.emptyIcon} aria-hidden="true">◎</div>
          <h2 style={styles.cardTitle}>No active team assignment</h2>
          <p style={styles.subtitle}>Your account can sign in, but team rosters and attendance stay unavailable until a System Admin assigns a cell group or group.</p>
        </section>
      ) : (
        <section style={styles.grid} aria-label="Assigned teams">
          {assignments.map((assignment) => {
            const isCellGroup = assignment.scopeType === 'cell_group';
            const targetPath = isCellGroup ? '/cell-groups' : '/members';
            const isCurrent = activeLeaderScopeKey === assignment.scopeKey;
            const permissions = assignment.permissions || [];
            const canViewAttendance = permissions.includes('qr_attendance:read');

            return (
              <article key={assignment.scopeKey} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={{ ...styles.pill, ...(isCellGroup ? styles.cellPill : styles.groupPill) }}>
                    {isCellGroup ? 'CELL GROUP' : 'GROUP'}
                  </span>
                  {isCurrent && <span style={styles.current}>Current team</span>}
                </div>
                <h2 style={styles.cardTitle}>{labelFor(assignment)}</h2>
                <p style={styles.cardCopy}>
                  {isCellGroup
                    ? 'Open the assigned cell group roster and leader tools.'
                    : 'Open the assigned group member roster and leader tools.'}
                </p>
                <div style={styles.actions}>
                  <button type="button" onClick={() => open(assignment.scopeKey, targetPath)} style={styles.primaryButton}>
                    {isCellGroup ? 'Open cell group' : 'Open group roster'}
                  </button>
                  {canViewAttendance && (
                    <button type="button" onClick={() => open(assignment.scopeKey, '/attendance/qr')} style={styles.secondaryButton}>
                      Attendance QR
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {assignments.length > 1 && (
        <aside style={styles.readOnlyNotice}>
          <strong>Combined view is read-only.</strong> Select an individual team before recording, editing, submitting, or correcting attendance.
        </aside>
      )}
    </main>
  );
}

const styles = {
  page: { maxWidth: 1180, margin: '0 auto', color: '#0f172a' },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 },
  eyebrow: { margin: '0 0 6px', color: '#0b66a3', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em' },
  title: { margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', letterSpacing: '-0.03em' },
  subtitle: { maxWidth: 660, margin: '8px 0 0', color: '#64748b', lineHeight: 1.55, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 },
  card: { border: '1px solid #dce7f1', borderRadius: 16, background: '#fff', padding: 20, boxShadow: '0 8px 24px rgba(15, 60, 90, 0.05)', minWidth: 0 },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pill: { display: 'inline-flex', padding: '5px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' },
  cellPill: { background: '#eaf5ff', color: '#075985' },
  groupPill: { background: '#eefcf8', color: '#047857' },
  current: { fontSize: 11, fontWeight: 700, color: '#15803d' },
  cardTitle: { margin: '18px 0 6px', fontSize: 19, lineHeight: 1.3 },
  cardCopy: { minHeight: 42, margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.55 },
  actions: { display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 18 },
  primaryButton: { border: 0, borderRadius: 9, padding: '10px 13px', background: '#075985', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 12px', background: '#fff', color: '#334155', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  empty: { background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '36px 22px', textAlign: 'center' },
  emptyIcon: { margin: '0 auto', width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', fontSize: 26 },
  readOnlyNotice: { marginTop: 18, padding: '13px 16px', border: '1px solid #bfdbfe', borderRadius: 12, background: '#eff6ff', color: '#1e3a8a', fontSize: 13, lineHeight: 1.5 },
};
