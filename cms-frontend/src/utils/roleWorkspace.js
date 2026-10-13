import { isAllowedForRolePath, isVisibleNavItem } from './roleAccess';
import { NAV_ITEMS } from './constants';

const profile = (key, title, purpose, lead, priorities, groups, note) => ({ key, title, purpose, lead, priorities, groups, note });
export const WORKSPACES = {
  admin: profile('admin', 'Administration', 'Keep church operations organized.', 'Control center', ['/users', '/members', '/audit-logs', '/settings'], ['Administration', 'Church records', 'Services & attendance', 'Resources'], 'Manage records and access. Review activity before making system-wide changes.'),
  pastor: profile('pastor', 'Pastoral oversight', 'See the people behind the numbers.', 'Church insights', ['/attendance', '/members', '/reports/analytics', '/archives'], ['Services & attendance', 'Church records', 'Resources', 'Administration'], 'Review church-wide trends, member records and documents awaiting a decision.'),
  registration: profile('registration', 'Registration desk', 'Welcome members. Record attendance clearly.', 'Check-in desk', ['/attendance/qr', '/services', '/events', '/members'], ['Services & attendance', 'Church records', 'Resources', 'Administration'], 'Choose a Service or Event session before scanning. Registration and physical check-in are separate.'),
  finance: profile('finance', 'Finance office', 'A clear record of church stewardship.', 'Giving & reconciliation', ['/finance', '/reports/analytics', '/archives'], ['Resources', 'Administration', 'Church records', 'Services & attendance'], 'Review transaction dates, giving categories and receipts before reconciling records.'),
  ministry: profile('ministry', 'Ministry coordination', 'Bring your people and plans together.', 'Ministry planner', ['/ministry', '/events', '/attendance', '/inventory'], ['Church records', 'Services & attendance', 'Resources', 'Administration'], 'Work with your assigned ministry roster, invitations, schedules and requests.'),
  cell: profile('cell', 'Cell leadership', 'Care for your cell, one gathering at a time.', 'Cell workspace', ['/cell-groups', '/attendance/qr', '/events'], ['Church records', 'Services & attendance', 'Resources', 'Administration'], 'Attendance drafts and submissions apply to the selected cell group only.'),
  group: profile('group', 'Group leadership', 'Keep your group connected and involved.', 'Group workspace', ['/members', '/services', '/attendance/qr', '/events'], ['Church records', 'Services & attendance', 'Resources', 'Administration'], 'Review your assigned group roster and upcoming gatherings before preparing attendance.'),
  leader: profile('leader', 'Team leadership', 'Choose your team. Keep each record in scope.', 'Team hub', ['/leader/teams', '/attendance/qr', '/events'], ['Church records', 'Services & attendance', 'Resources', 'Administration'], 'Select one team to make changes. The combined attendance view is read-only.'),
  member: profile('member', 'My church', 'Your personal space in the church community.', 'My church activity', ['/portal'], [], 'Show your QR when you arrive. Follow your events, attendance and giving here.'),
};

export function getRoleWorkspace(user) {
  const role = user?.roleName;
  const legacy = { 'System Admin': 'admin', Pastor: 'pastor', 'Registration Team': 'registration', 'Finance Team': 'finance', 'Ministry Leader': 'ministry', 'Cell Group Leader': 'cell', 'Group Leader': 'group', Member: 'member' };
  if (role !== 'Leader') return WORKSPACES[legacy[role]] || WORKSPACES.member;
  const assignments = user.leaderAssignments || [];
  const cell = assignments.some(a => (a.scopeType || a.scope_type) === 'cell_group');
  const group = assignments.some(a => ['group', 'member_group'].includes(a.scopeType || a.scope_type));
  return cell && !group ? WORKSPACES.cell : group && !cell ? WORKSPACES.group : WORKSPACES.leader;
}

const NAV_GROUPS = {
  '/dashboard': 'Overview', '/leader/teams': 'Church records', '/members': 'Church records', '/cell-groups': 'Church records', '/ministry': 'Church records',
  '/services': 'Services & attendance', '/attendance': 'Services & attendance', '/attendance/qr': 'Services & attendance', '/events': 'Services & attendance',
  '/finance': 'Resources', '/inventory': 'Resources', '/archives': 'Resources',
  '/users': 'Administration', '/audit-logs': 'Administration', '/settings': 'Administration', '/my-settings': 'Administration',
};

export function workspaceNavigation(items, workspace) {
  const order = ['Overview', ...workspace.groups];
  return order.map(title => ({ title, items: items.filter(item => (NAV_GROUPS[item.path] || 'Administration') === title)
    .sort((a, b) => {
      const aIndex = workspace.priorities.indexOf(a.path);
      const bIndex = workspace.priorities.indexOf(b.path);
      return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
    }) })).filter(group => group.items.length);
}

export function workspaceActions(user, hasPermission) {
  const workspace = getRoleWorkspace(user);
  return workspace.priorities.map(path => NAV_ITEMS.find(item => item.path === path)
    || (path === '/reports/analytics' ? { label: 'Analytics', path, permissions: { module: 'dashboard', action: 'read' } } : null))
    .filter(item => item && isAllowedForRolePath(user?.roleName, item.path, user?.leaderAssignments, user?.activeLeaderScopeKey)
      && (isVisibleNavItem(item, user, hasPermission) || item.path === '/attendance/qr')
      && (!item.permissions || hasPermission(item.permissions.module, item.permissions.action)));
}

export const MODULES = [
  ['/finance/expenses', 'Expenses', 'Track expenditure with categories, dates and supporting records.'],
  ['/finance/my-giving', 'Giving', 'Review recorded contributions and receipts.'],
  ['/reports/analytics', 'Analytics', 'Filter the period, review the result and export the report you need.'],
  ['/attendance/qr', 'QR attendance', 'Choose a session, then scan members or review submitted batches.'],
  ['/leader/teams', 'My teams', 'Open an assigned team before changing its roster or attendance.'],
  ['/members', 'Member records', 'Search and filter the roster before opening an individual record.'],
  ['/cell-groups', 'Cell groups', 'Keep cell membership and leadership assignments easy to find.'],
  ['/ministry', 'Ministry', 'Coordinate people, service assignments and requests in one place.'],
  ['/users', 'User access', 'Keep login accounts and role assignments organized.'],
  ['/attendance', 'Attendance', 'Separate attendance results from registrations and pending reviews.'],
  ['/services', 'Services', 'Find a gathering and open its schedule or attendance tools.'],
  ['/events', 'Events', 'Review dates, registration status and event attendance.'],
  ['/finance', 'Giving records', 'Review contributions, dates, categories and receipts.'],
  ['/inventory', 'Inventory', 'Track available items, requests, usage and stock reports.'],
  ['/archives', 'Archives', 'Find a document, check its visibility and review its status.'],
  ['/audit-logs', 'Activity log', 'Use filters to trace a specific action and its recorded history.'],
  ['/my-settings', 'My settings', 'Adjust your personal preferences and account settings.'],
  ['/settings', 'System settings', 'Review configuration values before saving changes.'],
];
export function getWorkspaceModule(pathname) {
  const entry = MODULES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return entry ? { path: entry[0], label: entry[1], description: entry[2], key: entry[0].slice(1).replaceAll('/', '-') } : null;
}

export const DASHBOARD_LAYOUTS = {
  admin: { primary: '1.4fr .6fr', secondary: '1.4fr .6fr', tasks: 'Manage operations', watch: 'Review queue', guide: 'A clear next step', steps: ['Review activity and outstanding requests.', 'Open the relevant record before changing it.', 'Confirm access and ownership when assigning staff.'] },
  pastor: { primary: '.8fr 1.2fr', secondary: '1.2fr .8fr', tasks: 'Pastoral review', watch: 'Church at a glance', guide: 'From insight to care', steps: ['Review attendance for a specific period.', 'Open member or team details for context.', 'Review documents and decisions awaiting approval.'] },
  registration: { primary: '1fr', secondary: '1fr', tasks: 'Check-in tools', watch: 'Session overview', guide: 'Check-in sequence', steps: ['Choose the Service or Event session.', 'Scan an individual QR or review a leader batch.', 'Confirm the result before the next scan.'] },
  finance: { primary: '1fr', secondary: '1.5fr .5fr', tasks: 'Finance desk', watch: 'Reconciliation checks', guide: 'Before recording', steps: ['Choose the contributor and giving category.', 'Confirm amount, transaction date and receipt.', 'Review totals for the selected reporting period.'] },
  ministry: { primary: '1.3fr .7fr', secondary: '.9fr 1.1fr', tasks: 'Coordinate your ministry', watch: 'Requests & resources', guide: 'Ministry planning', steps: ['Review your ministry roster and pending requests.', 'Match people to upcoming service needs.', 'Check invitation and substitute responses.'] },
  cell: { primary: '1fr', secondary: '.8fr 1.2fr', tasks: 'Your cell group', watch: 'Gatherings & resources', guide: 'Prepare your cell attendance', steps: ['Open the selected cell roster.', 'Record attending members in the draft.', 'Submit the batch and follow its review status.'] },
  group: { primary: '1.35fr .65fr', secondary: '1fr 1fr', tasks: 'Your group roster', watch: 'Group participation', guide: 'Keep your group connected', steps: ['Review group membership and upcoming gatherings.', 'Open the correct attendance session.', 'Submit records for this group only.'] },
  leader: { primary: '1fr 1fr', secondary: '1fr', tasks: 'Choose your working team', watch: 'Shared resources', guide: 'One team at a time', steps: ['Choose a cell group or group in My Teams.', 'Make changes in that individual team workspace.', 'Use the combined view to review, never to submit.'] },
  member: { primary: '1fr', secondary: '1fr', tasks: 'My activity', watch: 'Upcoming', guide: 'Stay connected', steps: ['Show your attendance QR when you arrive.', 'Follow upcoming events and your registrations.', 'Review your personal attendance and giving.'] },
};
