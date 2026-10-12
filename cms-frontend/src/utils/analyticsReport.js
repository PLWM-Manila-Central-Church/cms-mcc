const MEMBER_AND_ATTENDANCE_ROLES = new Set(['System Admin', 'Pastor', 'Registration Team']);
const FINANCE_ROLES = new Set(['System Admin', 'Pastor', 'Finance Team']);

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
    for (const item of data.attendance.monthly || []) rows.push(['Attendance', item.period, `Services ${item.service}; events ${item.events}`]);
  }
  if (canSeeFinance && data?.finance) {
    rows.push(
      ['Finance', 'Income', data.finance.income],
      ['Finance', 'Expenses', data.finance.expenses],
      ['Finance', 'Net', data.finance.net],
    );
  }
  return rows;
};
