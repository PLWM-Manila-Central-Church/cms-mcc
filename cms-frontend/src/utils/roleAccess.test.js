import { describe, expect, it } from 'vitest';
import { isAllowedForRolePath, isVisibleNavItem, ROLE_TAB_SETS } from './roleAccess';
import { NAV_ITEMS } from './constants';

const assignments = [
  { scopeType: 'cell_group', scopeId: 8, scopeKey: 'cell_group:8' },
  { scopeType: 'group', scopeId: 3, scopeKey: 'member_group:3' },
];

describe('unified Leader route access', () => {
  it('limits team pages to the currently selected assignment type', () => {
    expect(isAllowedForRolePath('Leader', '/cell-groups', assignments, 'member_group:3')).toBe(false);
    expect(isAllowedForRolePath('Leader', '/members', assignments, 'cell_group:8')).toBe(false);
    expect(isAllowedForRolePath('Leader', '/cell-groups', assignments, 'cell_group:8')).toBe(true);
    expect(isAllowedForRolePath('Leader', '/members', assignments, 'member_group:3')).toBe(true);
  });

  it('allows combined team reads while preserving the assignment page', () => {
    expect(isAllowedForRolePath('Leader', '/attendance/qr', assignments, 'all')).toBe(true);
    expect(isAllowedForRolePath('Leader', '/cell-groups', assignments, 'all')).toBe(true);
    expect(isVisibleNavItem({ path: '/cell-groups' }, { roleName: 'Leader', leaderAssignments: assignments, activeLeaderScopeKey: 'all' }, () => true)).toBe(true);
  });

  it('keeps the assignment page available when no team has been assigned', () => {
    expect(isAllowedForRolePath('Leader', '/leader/teams', [], 'all')).toBe(true);
    expect(isAllowedForRolePath('Leader', '/cell-groups', [], 'all')).toBe(false);
  });
});

describe('Finance analytics route access', () => {
  it('allows the Finance dashboard analytics button while retaining finance-only page scope', () => {
    expect(isAllowedForRolePath('Finance Team', '/reports/analytics')).toBe(true);
    expect(isAllowedForRolePath('Finance Team', '/members')).toBe(false);
    expect(isAllowedForRolePath('Finance Team', '/attendance')).toBe(false);
  });
});

describe('Registration Team attendance navigation', () => {
  const registration = { roleName: 'Registration Team' };
  const granted = (module, action) => (
    (module === 'attendance' && action === 'read')
    || (module === 'events' && action === 'read')
    || (module === 'qr_attendance' && action === 'read')
  );

  it('shows the overview and QR tools only with their corresponding read grants', () => {
    const attendance = NAV_ITEMS.find((item) => item.path === '/attendance');
    const qrAttendance = NAV_ITEMS.find((item) => item.path === '/attendance/qr');

    expect(isVisibleNavItem(attendance, registration, granted)).toBe(true);
    expect(isVisibleNavItem(qrAttendance, registration, granted)).toBe(true);
    expect(isVisibleNavItem(attendance, registration, () => false)).toBe(false);
    expect(isVisibleNavItem(qrAttendance, registration, () => false)).toBe(false);
  });

  it('keeps the mobile tab set to four accessible modules', () => {
    const tabs = ROLE_TAB_SETS['Registration Team']
      .filter((item) => isVisibleNavItem(item, registration, granted));

    expect(tabs.map((item) => item.label)).toEqual(['Home', 'Attendance', 'Events', 'QR Attendance']);
  });
});
