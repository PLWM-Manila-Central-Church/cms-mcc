const fmtDay = (date) => (date ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PH', {
  month: 'short', day: 'numeric', timeZone: 'UTC',
}) : '—');

const fmtTime = (time) => {
  if (!time) return '';
  const [hour, minute] = String(time).split(':');
  const value = new Date();
  value.setHours(Number(hour), Number(minute || 0), 0, 0);
  return value.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
};

function Row({ c, f, day, title, meta, trailing }) {
  return (
    <li style={{ display: 'grid', gridTemplateColumns: '58px minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: `1px solid ${c.borderL}` }}>
      <span style={{ fontSize: f.xs, fontWeight: 700, color: c.t2 }}>{fmtDay(day)}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: f.sm, fontWeight: 600, color: c.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {meta && <span style={{ display: 'block', fontSize: f.xs, color: c.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</span>}
      </span>
      {trailing ? <span style={{ fontSize: f.xs, color: c.t3 }}>{trailing}</span> : null}
    </li>
  );
}

function Group({ c, f, title, rows, empty }) {
  return (
    <section style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 16px 14px' }}>
      <h3 style={{ margin: 0, fontSize: f.sm, fontWeight: 700, color: c.t1 }}>{title}</h3>
      {rows.length === 0
        ? <p style={{ margin: '6px 0 0', fontSize: f.xs, color: c.t3 }}>{empty}</p>
        : <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>{rows}</ul>}
    </section>
  );
}

export default function MinistrySchedulePanel({ c, f, data, labels = {} }) {
  const t = labels;
  const assignments = data?.assignments || [];
  const schedules = data?.schedules || [];
  const invites = data?.invites || [];
  const byKind = (kind) => schedules.filter((entry) => entry.kind === kind);
  const empty = t.noSchedule || 'Nothing scheduled yet.';
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const upcomingAssignments = assignments
    .filter((assignment) => !assignment.Service?.service_date || assignment.Service.service_date >= todayIso)
    .sort((left, right) => String(left.Service?.service_date || '').localeCompare(String(right.Service?.service_date || '')));

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Group
        c={c}
        f={f}
        title={t.scheduledService || 'Serving schedule'}
        empty={empty}
        rows={upcomingAssignments.slice(0, 6).map((assignment) => (
          <Row
            key={assignment.id}
            c={c}
            f={f}
            day={assignment.Service?.service_date}
            title={assignment.Service?.title || assignment.ministryRole?.name || t.ministry || 'Ministry'}
            meta={[assignment.ministryRole?.name, fmtTime(assignment.Service?.service_time)].filter(Boolean).join(' · ')}
            trailing={assignment.confirmed ? (t.confirmed || 'Confirmed') : ''}
          />
        ))}
      />

      <Group
        c={c}
        f={f}
        title={t.practices || 'Practices'}
        empty={empty}
        rows={byKind('practice').slice(0, 6).map((entry) => (
          <Row
            key={entry.id}
            c={c}
            f={f}
            day={entry.date}
            title={entry.title}
            meta={[entry.ministry, [entry.startTime, entry.endTime].filter(Boolean).map(fmtTime).join('–'), entry.location].filter(Boolean).join(' · ')}
          />
        ))}
      />

      <Group
        c={c}
        f={f}
        title={t.cleaning || 'Cleaning duty'}
        empty={empty}
        rows={byKind('cleaning').slice(0, 6).map((entry) => (
          <Row
            key={entry.id}
            c={c}
            f={f}
            day={entry.date}
            title={entry.title}
            meta={[entry.ministry, fmtTime(entry.startTime), entry.location].filter(Boolean).join(' · ')}
          />
        ))}
      />

      <Group
        c={c}
        f={f}
        title={t.ministryEvents || 'Ministry events'}
        empty={empty}
        rows={invites.slice(0, 6).map((invite) => (
          <Row
            key={invite.id}
            c={c}
            f={f}
            day={invite.Event?.start_date}
            title={invite.Event?.title || t.event || 'Event'}
            meta={[invite.ministryRole?.name, invite.Event?.location].filter(Boolean).join(' · ')}
          />
        ))}
      />
    </div>
  );
}
