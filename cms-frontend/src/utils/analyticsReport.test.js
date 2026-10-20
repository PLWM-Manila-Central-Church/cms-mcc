import { describe, expect, it } from 'vitest';
import { buildAnalyticsCsvRows, getAnalyticsReportScope, getReportPeriodRange } from './analyticsReport';

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
      ['Finance', 'Income', 900],
      ['Finance', 'Expenses', 250],
      ['Finance', 'Net', 650],
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

    expect(rows).toContainEqual(['Demographics', 'Cell group: Other (49 cell groups)', 66]);
    expect(rows).toContainEqual(['Demographics', 'Group: Other (49 groups)', 64]);
  });

  it('uses Sunday-start week and Asia/Manila calendar dates for report presets', () => {
    const reference = new Date('2026-10-19T18:00:00.000Z'); // Oct 20 in Manila
    expect(getReportPeriodRange('week', reference)).toEqual({ from: '2026-10-18', to: '2026-10-20' });
    expect(getReportPeriodRange('month', reference)).toEqual({ from: '2026-10-01', to: '2026-10-20' });
    expect(getReportPeriodRange('year', reference)).toEqual({ from: '2026-01-01', to: '2026-10-20' });
    expect(getReportPeriodRange('custom', reference)).toBeNull();
  });
});
