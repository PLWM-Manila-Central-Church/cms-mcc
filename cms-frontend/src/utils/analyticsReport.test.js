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

    expect(rows).toContainEqual(['Demographics', 'Cell group: Other (49 cell groups)', 66, 'members', '']);
    expect(rows).toContainEqual(['Demographics', 'Group: Other (49 groups)', 64, 'members', '']);
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
