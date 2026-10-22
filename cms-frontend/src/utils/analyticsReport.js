const MEMBER_AND_ATTENDANCE_ROLES = new Set(['System Admin', 'Pastor', 'Registration Team']);
const FINANCE_ROLES = new Set(['System Admin', 'Pastor', 'Finance Team']);

const manilaDateParts = (date = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(date).map((part) => [part.type, part.value]));

export const getReportPeriodRange = (period, referenceDate = new Date()) => {
  const parts = manilaDateParts(referenceDate);
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const utcToday = new Date(`${today}T00:00:00Z`);
  if (period === 'week') {
    const start = new Date(utcToday);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    return { from: start.toISOString().slice(0, 10), to: today };
  }
  if (period === 'month') return { from: `${parts.year}-${parts.month}-01`, to: today };
  if (period === 'year') return { from: `${parts.year}-01-01`, to: today };
  return null;
};

export const formatReportBucket = (period, granularity) => {
  if (granularity === 'month') {
    return new Date(`${period}-01T00:00:00Z`).toLocaleDateString('en-PH', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  const label = new Date(`${period}T00:00:00Z`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return granularity === 'week' ? `Week of ${label}` : label;
};

export const getAnalyticsReportScope = (roleName) => {
  const canSeeMembersAndAttendance = MEMBER_AND_ATTENDANCE_ROLES.has(roleName);
  const canSeeFinance = FINANCE_ROLES.has(roleName);

  return {
    canSeeFinance,
    canSeeMembersAndAttendance,
    description: canSeeFinance && canSeeMembersAndAttendance
      ? 'Current member population and demographics, with growth, attendance, and finance for the selected period.'
      : canSeeFinance
        ? 'Finance summaries for the selected period.'
        : 'Current member population and demographics, with growth and attendance for the selected period.',
  };
};

export const buildAnalyticsCsvRows = (data, { canSeeMembersAndAttendance = false, canSeeFinance = false } = {}) => {
  const rows = [['Section', 'Measure', 'Value']];
  if (canSeeMembersAndAttendance && data?.members) {
    rows.push(
      ['Members', 'Total', data.members.total],
      ['Members', 'Active', data.members.active],
      ['Members', 'Inactive', data.members.inactive],
      ['Members', 'New in range', data.members.new_in_range],
    );
    for (const [key, title] of [['age_bands', 'Age'], ['gender', 'Gender'], ['cell_groups', 'Cell group'], ['groups', 'Group']]) {
      for (const item of data.demographics?.[key] || []) rows.push(['Demographics', `${title}: ${item.label}`, item.total]);
    }
    for (const item of data.member_growth || []) rows.push(['Member growth', item.period, item.total]);
  }
  if (canSeeMembersAndAttendance && data?.attendance) {
    rows.push(
      ['Attendance', 'Service check-ins', data.attendance.service_checkins],
      ['Attendance', 'Event check-ins', data.attendance.event_checkins],
    );
    for (const item of data.attendance.buckets || data.attendance.monthly || []) rows.push(['Attendance', item.period, `Services ${item.service}; events ${item.events}`]);
  }
  if (canSeeFinance && data?.finance) {
    rows.push(
      ['Finance', 'Received income', data.finance.income],
      ['Finance', 'Expenses', data.finance.expenses ?? 0],
      ['Finance', 'Net balance', data.finance.net ?? ((Number(data.finance.income) || 0) - (Number(data.finance.expenses) || 0))],
    );
    for (const item of data.finance.buckets || []) {
      rows.push(['Finance trend', item.period, `Received ${item.income}; expenses ${item.expenses}; net ${item.net}`]);
    }
  }
  return rows;
};
