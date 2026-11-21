import { describe, expect, it } from 'vitest';
import {
  averagePerBucket,
  buildAnalyticsCsvRows,
  expenseRatio,
  getAnalyticsReportScope,
  getReportPeriodRange,
  netMargin,
  shareOf,
} from './analyticsReport';
import { toCsv } from './csv';

describe('analytics report role scope', () => {
  it('describes and exports only member and attendance data for Registration Team', () => {
    const scope = getAnalyticsReportScope('Registration Team');
    const rows = buildAnalyticsCsvRows({
      members: { total: 12, active: 10, inactive: 2, new_in_range: 3 },
      attendance: { service_checkins: 5, event_checkins: 4, monthly: [] },
      finance: { income: 900, expenses: 250, net: 650 },
    }, scope);

    expect(scope.description).toBe('Current member population and demographics, with growth and attendance for the selected period.');
    expect(scope.canSeeFinance).toBe(false);
    expect(rows.filter(([section]) => section === 'Finance')).toEqual([]);
    expect(rows.some(([section]) => section === 'Attendance')).toBe(true);
  });

  it('describes and exports finance totals for Finance Team without member or attendance totals', () => {
    const scope = getAnalyticsReportScope('Finance Team');
    const rows = buildAnalyticsCsvRows({
      members: { total: 12, active: 10, inactive: 2, new_in_range: 3 },
      attendance: { service_checkins: 5, event_checkins: 4, monthly: [] },
      finance: { income: 900, expenses: 250, net: 650 },
    }, scope);

    expect(scope.description).toBe('Finance summaries for the selected period.');
    expect(rows.filter(([section]) => section === 'Members' || section === 'Attendance')).toEqual([]);
    expect(rows.filter(([section]) => section === 'Finance')).toEqual([
      ['Finance', 'Received income', 900, 'PHP', ''],
      ['Finance', 'Expenses', 250, 'PHP', ''],
      ['Finance', 'Net balance', 650, 'PHP', ''],
    ]);
  });

  it('describes the complete report for System Admin and Pastor', () => {
    const expected = 'Current member population and demographics, with growth, attendance, and finance for the selected period.';
    expect(getAnalyticsReportScope('System Admin')).toMatchObject({ canSeeFinance: true, description: expected });
    expect(getAnalyticsReportScope('Pastor')).toMatchObject({ canSeeFinance: true, description: expected });
  });

  it('exports the Other group aggregates so demographic CSV totals remain complete', () => {
    const scope = getAnalyticsReportScope('Registration Team');
    const rows = buildAnalyticsCsvRows({
      members: { total: 164, active: 164, inactive: 0, new_in_range: 12 },
      demographics: {
        age_bands: [{ label: 'Unknown', total: 164 }],
        gender: [{ label: 'Unspecified', total: 164 }],
        cell_groups: [{ id: null, label: 'Other (49 cell groups)', total: 66 }],
        groups: [{ id: null, label: 'Other (49 groups)', total: 64 }],
      },
      attendance: { service_checkins: 0, event_checkins: 0, monthly: [] },
    }, scope);

    expect(rows).toContainEqual(['Demographics', 'Cell group: Other (49 cell groups)', 66, 'members', '40.2% of 164 members']);
    expect(rows).toContainEqual(['Demographics', 'Group: Other (49 groups)', 64, 'members', '39% of 164 members']);
  });

  it('keeps every exported row in a rectangular five-column Excel layout', () => {
    const scope = getAnalyticsReportScope('System Admin');
    const rows = buildAnalyticsCsvRows({
      range: { from: '2026-01-01', to: '2026-10-20' },
      period: { preset: 'year', bucket: 'month' },
      members: { total: 10, active: 9, inactive: 1, new_in_range: 2 },
      demographics: {
        age_bands: [{ label: 'Unknown', total: 10 }],
        gender: [],
        cell_groups: [],
        groups: [],
      },
      member_growth: [{ period: '2026-10', total: 2 }],
      attendance: {
        service_checkins: 4,
        event_checkins: 2,
        buckets: [{ period: '2026-10', service: 4, events: 2 }],
      },
      finance: {
        income: 900,
        expenses: 250,
        net: 650,
        buckets: [{ period: '2026-10', income: 900, expenses: 250, net: 650 }],
      },
    }, { ...scope, generatedAt: new Date('2026-10-20T04:00:00.000Z') });

    expect(rows.every((row) => row.length === 5)).toBe(true);
    expect(rows[0]).toEqual(['PLWM - MANILA CENTRAL CHURCH', '', '', '', '']);
    expect(rows).toContainEqual(['Section', 'Measure / period', 'Value', 'Unit', 'Notes']);
    expect(rows).toContainEqual(['Attendance trend', '2026-10 total', 6, 'check-ins', '']);
    expect(rows).toContainEqual(['Finance trend', '2026-10 net balance', 650, 'PHP', '']);
  });

  it('uses Sunday-start week and Asia/Manila calendar dates for report presets', () => {
    const reference = new Date('2026-10-19T18:00:00.000Z'); // Oct 20 in Manila
    expect(getReportPeriodRange('week', reference)).toEqual({ from: '2026-10-18', to: '2026-10-20' });
    expect(getReportPeriodRange('month', reference)).toEqual({ from: '2026-10-01', to: '2026-10-20' });
    expect(getReportPeriodRange('year', reference)).toEqual({ from: '2026-01-01', to: '2026-10-20' });
    expect(getReportPeriodRange('custom', reference)).toBeNull();
  });
});

describe('analytics report derived detail', () => {
  const scope = getAnalyticsReportScope('System Admin');
  const data = {
    range: { from: '2026-01-01', to: '2026-10-20' },
    period: { preset: 'year', bucket: 'month' },
    members: { total: 12, active: 10, inactive: 2, new_in_range: 3 },
    demographics: {
      age_bands: [{ label: '18-29', total: 8 }, { label: '30-49', total: 4 }],
      gender: [{ label: 'Female', total: 7 }, { label: 'Male', total: 5 }],
      cell_groups: [{ id: 1, label: 'Alpha', total: 6 }],
      groups: [{ id: 1, label: 'Worship', total: 9 }],
    },
    member_growth: [{ period: '2026-10', total: 3 }],
    attendance: {
      service_checkins: 9,
      event_checkins: 3,
      buckets: [
        { period: '2026-09', service: 4, events: 1 },
        { period: '2026-10', service: 5, events: 2 },
      ],
    },
    finance: {
      income: 900,
      expenses: 250,
      net: 650,
      buckets: [{ period: '2026-10', income: 900, expenses: 250, net: 650 }],
    },
  };

  it('exports member mix shares without touching the documented finance rows', () => {
    const rows = buildAnalyticsCsvRows(data, scope);

    expect(rows.filter(([section]) => section === 'Finance')).toEqual([
      ['Finance', 'Received income', 900, 'PHP', ''],
      ['Finance', 'Expenses', 250, 'PHP', ''],
      ['Finance', 'Net balance', 650, 'PHP', ''],
    ]);
    expect(rows).toContainEqual(['Member mix', 'Female', 7, 'members', '58.3% of 12 members']);
    expect(rows).toContainEqual(['Member mix', '18-29', 8, 'members', '66.7% of 12 members']);
  });

  it('exports interval averages and finance ratios', () => {
    const rows = buildAnalyticsCsvRows(data, scope);

    expect(rows).toContainEqual(['Attendance summary', 'Average per interval: services', 4.5, 'check-ins', '9 check-ins over 2 intervals']);
    expect(rows).toContainEqual(['Finance ratios', 'Expense ratio', 27.8, '%', 'Expenses divided by received income']);
    expect(rows).toContainEqual(['Finance ratios', 'Net margin', 72.2, '%', 'Net balance divided by received income']);
  });

  it('carries roster shares, demographic notes and every group dimension into the member mix', () => {
    const rows = buildAnalyticsCsvRows(data, scope);

    expect(rows).toContainEqual(['Members', 'Active share', 83.3, '%', 'of 12 members']);
    expect(rows).toContainEqual(['Members', 'Inactive share', 16.7, '%', 'of 12 members']);
    expect(rows).toContainEqual(['Demographics', 'Gender: Female', 7, 'members', '58.3% of 12 members']);
    expect(rows).toContainEqual(['Member mix', 'Alpha', 6, 'members', '50% of 12 members']);
    expect(rows).toContainEqual(['Member mix', 'Worship', 9, 'members', '75% of 12 members']);
  });

  it('keeps five columns when a group label looks like a formula', () => {
    const rows = buildAnalyticsCsvRows(
      { ...data, demographics: { ...data.demographics, gender: [{ label: '=SUM(A1:A9)', total: 3 }] } },
      scope,
    );

    expect(rows.every((row) => row.length === 5)).toBe(true);
    expect(toCsv(rows)).toContain('"\'=SUM(A1:A9)"');
  });

  it('computes ratios without dividing by zero', () => {
    expect(shareOf(7, 0)).toBe(0);
    expect(averagePerBucket(9, 0)).toBe(0);
    expect(expenseRatio(250, 0)).toBe(0);
    expect(netMargin(650, 900)).toBe(72.2);
  });
});
