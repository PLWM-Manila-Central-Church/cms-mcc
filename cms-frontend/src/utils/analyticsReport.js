import { CHURCH_REPORT_NAME, CHURCH_REPORT_SHORT_NAME } from './reportBranding';

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

export const formatReportDate = (value) => {
  if (!value) return 'Not specified';
  const dateValue = String(value).slice(0, 10);
  const date = new Date(dateValue + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

export const formatReportGeneratedAt = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date);
};

export const getReportPeriodLabel = (period) => ({
  week: 'Weekly to date',
  month: 'Monthly to date',
  year: 'Annual to date',
  custom: 'Custom date range',
}[period] || 'Custom date range');

export const formatReportRange = (range = {}) => {
  const from = formatReportDate(range.from);
  const to = formatReportDate(range.to);
  if (from === 'Not specified' && to === 'Not specified') return 'All available dates';
  return from + ' – ' + to;
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

const analyticsSectionsForScope = ({ canSeeMembersAndAttendance, canSeeFinance }) => [
  ...(canSeeMembersAndAttendance
    ? ['Member population, demographics, member growth, and service/event attendance']
    : []),
  ...(canSeeFinance
    ? ['Aggregate recorded income, expenses, and net balance']
    : []),
].join('; ') || 'No report sections are available for this role.';

const generatedAtLabel = (generatedAt) => formatReportGeneratedAt(generatedAt) || 'Not available';

const ANALYTICS_CSV_HEADER = ['Section', 'Measure / period', 'Value', 'Unit', 'Notes'];
const analyticsCsvRow = (section, measure = '', value = '', unit = '', notes = '') => (
  [section, measure, value, unit, notes]
);
const analyticsCsvBlankRow = () => ['', '', '', '', ''];

export const buildAnalyticsCsvRows = (data, {
  canSeeMembersAndAttendance = false,
  canSeeFinance = false,
  dateFrom = data?.range?.from,
  dateTo = data?.range?.to,
  reportPeriod = data?.period?.preset || 'custom',
  generatedAt = new Date(),
} = {}) => {
  const periodNote = canSeeMembersAndAttendance && canSeeFinance
    ? 'The selected date range applies to member growth, attendance, and finance summaries.'
    : canSeeMembersAndAttendance
      ? 'The selected date range applies to member growth and attendance summaries.'
      : canSeeFinance
        ? 'The selected date range applies to finance summaries.'
        : 'No date-filtered summaries are available for this role.';
  const bucketLabel = {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
  }[data?.period?.bucket] || 'Not available';
  const dateRangeIso = (dateFrom || 'Not specified') + ' to ' + (dateTo || 'Not specified');
  const rows = [
    analyticsCsvRow(CHURCH_REPORT_NAME),
    analyticsCsvRow('CONSOLIDATED ANALYTICS REPORT'),
    analyticsCsvRow('Report information', 'Report type', 'Church operations analytics'),
    analyticsCsvRow('Report information', 'Reporting period', formatReportRange({ from: dateFrom, to: dateTo }), '', dateRangeIso),
    analyticsCsvRow('Report information', 'Preset', getReportPeriodLabel(reportPeriod)),
    analyticsCsvRow('Report information', 'Trend interval', bucketLabel),
    analyticsCsvRow('Report scope', 'Data included', analyticsSectionsForScope({ canSeeMembersAndAttendance, canSeeFinance })),
    analyticsCsvRow('Report scope', 'Currency', canSeeFinance ? 'PHP' : 'Not included for this role'),
    analyticsCsvRow('Report information', 'Generated', generatedAtLabel(generatedAt), 'Asia/Manila'),
    analyticsCsvRow('Report information', 'Generated by', CHURCH_REPORT_SHORT_NAME + ' Church Management System'),
    analyticsCsvBlankRow(),
    analyticsCsvRow('EXECUTIVE SUMMARY'),
    ANALYTICS_CSV_HEADER,
  ];

  if (canSeeMembersAndAttendance && data?.members) {
    rows.push(
      analyticsCsvRow('Members', 'Total', data.members.total, 'members', 'Current non-deleted roster'),
      analyticsCsvRow('Members', 'Active', data.members.active, 'members', 'Current roster'),
      analyticsCsvRow('Members', 'Inactive', data.members.inactive, 'members', 'Current roster'),
      analyticsCsvRow('Members', 'New in range', data.members.new_in_range, 'members', 'Created within the selected date range'),
    );
    rows.push(analyticsCsvBlankRow(), analyticsCsvRow('MEMBER DEMOGRAPHICS'), ANALYTICS_CSV_HEADER);
    for (const [key, title] of [['age_bands', 'Age'], ['gender', 'Gender'], ['cell_groups', 'Cell group'], ['groups', 'Group']]) {
      for (const item of data.demographics?.[key] || []) {
        rows.push(analyticsCsvRow('Demographics', title + ': ' + item.label, item.total, 'members'));
      }
    }
    rows.push(analyticsCsvBlankRow(), analyticsCsvRow('MEMBER GROWTH'), ANALYTICS_CSV_HEADER);
    for (const item of data.member_growth || []) {
      rows.push(analyticsCsvRow('Member growth', item.period, item.total, 'members', 'New members per report interval'));
    }
  }
  if (canSeeMembersAndAttendance && data?.attendance) {
    rows.push(
      analyticsCsvRow('Attendance', 'Service check-ins', data.attendance.service_checkins, 'check-ins'),
      analyticsCsvRow('Attendance', 'Event check-ins', data.attendance.event_checkins, 'check-ins'),
    );
    rows.push(
      analyticsCsvBlankRow(),
      analyticsCsvRow('ATTENDANCE TREND'),
      ANALYTICS_CSV_HEADER,
    );
    for (const item of data.attendance.buckets || data.attendance.monthly || []) {
      const service = Number(item.service) || 0;
      const events = Number(item.events) || 0;
      rows.push(
        analyticsCsvRow('Attendance trend', item.period + ' service', service, 'check-ins'),
        analyticsCsvRow('Attendance trend', item.period + ' event', events, 'check-ins'),
        analyticsCsvRow('Attendance trend', item.period + ' total', service + events, 'check-ins'),
      );
    }
  }
  if (canSeeFinance && data?.finance) {
    rows.push(
      analyticsCsvRow('Finance', 'Received income', data.finance.income, 'PHP'),
      analyticsCsvRow('Finance', 'Expenses', data.finance.expenses ?? 0, 'PHP'),
      analyticsCsvRow('Finance', 'Net balance', data.finance.net ?? ((Number(data.finance.income) || 0) - (Number(data.finance.expenses) || 0)), 'PHP'),
    );
    rows.push(
      analyticsCsvBlankRow(),
      analyticsCsvRow('FINANCE TREND'),
      ANALYTICS_CSV_HEADER,
    );
    for (const item of data.finance.buckets || []) {
      const income = Number(item.income) || 0;
      const expenses = Number(item.expenses) || 0;
      const net = Number(item.net ?? (income - expenses)) || 0;
      rows.push(
        analyticsCsvRow('Finance trend', item.period + ' received income', income, 'PHP'),
        analyticsCsvRow('Finance trend', item.period + ' expenses', expenses, 'PHP'),
        analyticsCsvRow('Finance trend', item.period + ' net balance', net, 'PHP'),
      );
    }
  }
  rows.push(analyticsCsvBlankRow(), analyticsCsvRow('REPORT NOTES'), ANALYTICS_CSV_HEADER);
  if (canSeeMembersAndAttendance) {
    rows.push(analyticsCsvRow('Roster note', 'Members', 'Totals, status counts, and demographics reflect the current non-deleted roster.'));
  }
  if (canSeeFinance) {
    rows.push(analyticsCsvRow('Finance note', 'Finance records', 'Income and expense totals include active, non-archived records.'));
  }
  rows.push(
    analyticsCsvRow('Period note', 'Date range', periodNote),
    analyticsCsvRow('Privacy', 'Included data', 'Aggregate totals only; member names and individual giving records are not included.'),
  );
  return rows.map((row) => Array.from({ length: ANALYTICS_CSV_HEADER.length }, (_, index) => row[index] ?? ''));
};
