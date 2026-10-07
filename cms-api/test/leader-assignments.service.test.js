const { LEADER_ROLE, assignmentProjections, targetsForRole } = require('../src/services/leaderAssignments.service');

describe('unified Leader assignment targets', () => {
  it('defines the account role name used by user creation and runtime scopes', () => {
    expect(LEADER_ROLE).toBe('Leader');
  });

  it('keeps cell-group and group assignments independent on account creation', async () => {
    const desired = await targetsForRole(LEADER_ROLE, {
      leader_assignments: { cell_group_id: '8', group_id: '3' },
    }, [], true);

    expect([...desired.entries()]).toEqual([
      ['cell_group', 8],
      ['member_group', 3],
    ]);
    expect(assignmentProjections(LEADER_ROLE, desired)).toEqual({
      leads_cell_group_id: 8,
      leads_group_id: 3,
      leads_ministry_id: null,
    });
  });

  it('supports cell-group-only and group-only Leaders without synthesizing the other scope', async () => {
    const cellOnly = await targetsForRole(LEADER_ROLE, {
      leader_assignments: { cell_group_id: 8, group_id: null },
    }, [], true);
    const groupOnly = await targetsForRole(LEADER_ROLE, {
      leader_assignments: { cell_group_id: null, group_id: 3 },
    }, [], true);

    expect([...cellOnly.entries()]).toEqual([['cell_group', 8], ['member_group', null]]);
    expect([...groupOnly.entries()]).toEqual([['cell_group', null], ['member_group', 3]]);
  });

  it('rejects a Leader account with no assigned team', async () => {
    await expect(targetsForRole(LEADER_ROLE, { leader_assignments: {} }, [], true))
      .rejects.toMatchObject({ code: 'LEADER_ASSIGNMENTS_REQUIRED', status: 400 });
  });

  it('preserves existing independent assignments when an update omits them', async () => {
    const desired = await targetsForRole(LEADER_ROLE, {}, [
      { scope_type: 'cell_group', scope_id: 8, is_active: 1 },
      { scope_type: 'member_group', scope_id: 3, is_active: 1 },
      { scope_type: 'cell_group', scope_id: 4, is_active: 0 },
    ], false);

    expect([...desired.entries()]).toEqual([
      ['cell_group', 8],
      ['member_group', 3],
    ]);
  });
});
