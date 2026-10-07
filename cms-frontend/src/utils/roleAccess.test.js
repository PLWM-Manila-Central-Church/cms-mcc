import { describe, expect, it } from 'vitest';
import { isAllowedForRolePath, isVisibleNavItem } from './roleAccess';

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
