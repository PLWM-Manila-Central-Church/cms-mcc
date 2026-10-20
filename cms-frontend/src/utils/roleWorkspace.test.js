import { describe, expect, test } from 'vitest';
import { getRoleWorkspace, getWorkspaceModule, workspaceActions, workspaceNavigation, WORKSPACES } from './roleWorkspace';
import { NAV_ITEMS } from './constants';
describe('role-specific workspaces', () => {
  test.each([['System Admin','admin'],['Pastor','pastor'],['Registration Team','registration'],['Finance Team','finance'],['Ministry Leader','ministry'],['Cell Group Leader','cell'],['Group Leader','group'],['Member','member']])('%s has a purpose-specific identity', (roleName,key) => {
    expect(getRoleWorkspace({roleName}).key).toBe(key);
    expect(getRoleWorkspace({roleName}).purpose).toBeTruthy();
  });
  test('unified Leader distinguishes cell-only, group-only and combined assignments', () => {
    const cell={scopeType:'cell_group',scopeKey:'cell_group:1'};
    const group={scopeType:'group',scopeKey:'group:1'};
    expect(getRoleWorkspace({roleName:'Leader',leaderAssignments:[cell]}).key).toBe('cell');
    expect(getRoleWorkspace({roleName:'Leader',leaderAssignments:[group]}).key).toBe('group');
    expect(getRoleWorkspace({roleName:'Leader',leaderAssignments:[cell,group]}).key).toBe('leader');
    expect(new Set(Object.values(WORKSPACES).map(w=>w.lead)).size).toBe(9);
  });
  test('navigation is reordered without adding or duplicating destinations', () => {
    const groups=workspaceNavigation(NAV_ITEMS,WORKSPACES.admin);
    expect(groups[1].title).toBe('Administration');
    expect(groups[1].items[0].path).toBe('/users');
    expect(groups.flatMap(g=>g.items).length).toBe(NAV_ITEMS.length);
    const registration=workspaceNavigation(NAV_ITEMS,WORKSPACES.registration);
    expect(registration[1].items[0].path).toBe('/attendance/qr');
  });
  test('shortcuts retain permissions and Leader path restrictions', () => {
    const finance={roleName:'Finance Team'};
    const actions=workspaceActions(finance,(module,action)=>module==='finance'&&action==='read');
    expect(actions.map(item=>item.path)).toEqual(['/finance']);
    const leader={roleName:'Leader',activeLeaderScopeKey:'cell_group:1',leaderAssignments:[{scopeType:'cell_group'}]};
    expect(workspaceActions(leader,()=>false).map(item=>item.path)).not.toContain('/attendance/qr');
    expect(workspaceActions(leader,()=>true).map(item=>item.path)).toContain('/attendance/qr');
    expect(workspaceActions(leader,()=>true).map(item=>item.path)).not.toContain('/members');
  });
  test('nested page context uses the most specific module', () => {
    expect(getWorkspaceModule('/attendance/qr').key).toBe('attendance-qr');
    expect(getWorkspaceModule('/finance/expenses').label).not.toBe('Expenses');
    expect(getWorkspaceModule('/members/1/edit').label).toBe('Member records');
    expect(getWorkspaceModule('/dashboard')).toBeNull();
  });
});
