import { describe, expect, it } from 'vitest';
import { dashboardStatsQueryKey } from './useDashboardStats';

describe('dashboard stats query identity', () => {
  it('uses separate cache keys for different accounts and roles', () => {
    const adminKey = dashboardStatsQueryKey({ id: 1, roleName: 'System Admin' }, null);
    const leaderKey = dashboardStatsQueryKey({ id: 2, roleName: 'Cell Group Leader', leadsCellGroupId: 8 }, null);

    expect(adminKey).not.toEqual(leaderKey);
  });

  it('separates query data when a unified Leader switches assigned scopes', () => {
    const leader = {
      id: 3,
      roleName: 'Leader',
      leaderAssignments: [
        { scopeType: 'cell_group', scopeId: 8 },
        { scopeType: 'member_group', scopeId: 5 },
      ],
    };

    expect(dashboardStatsQueryKey(leader, 'cell_group:8'))
      .not.toEqual(dashboardStatsQueryKey(leader, 'member_group:5'));
  });
});
