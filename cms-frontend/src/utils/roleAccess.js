export const ROLE_ALLOWED_PATHS = {
  // Members use self-scoped APIs through the standalone portal only.
  Member: ['/portal'],
  'Finance Team': ['/dashboard', '/finance', '/archives', '/my-settings', '/reports/analytics'],
  'Ministry Leader': ['/dashboard', '/ministry', '/events', '/attendance', '/reports/team-attendance', '/inventory', '/archives', '/my-settings'],
  'Cell Group Leader': ['/dashboard', '/cell-groups', '/attendance', '/reports/team-attendance', '/events', '/inventory', '/archives', '/my-settings'],
  'Group Leader': ['/dashboard', '/members', '/attendance', '/reports/team-attendance', '/events', '/services', '/inventory', '/archives', '/my-settings'],
  Leader: ['/dashboard', '/leader/teams', '/cell-groups', '/members', '/attendance', '/reports/team-attendance', '/events', '/services', '/inventory', '/archives', '/my-settings'],
};

export const ROLE_TAB_SETS = {
  'System Admin': [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Members', path: '/members', icon: 'members' },
    { label: 'Events', path: '/events', icon: 'events' },
    { label: 'Finance', path: '/finance', icon: 'finance' },
  ],
  Pastor: [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Members', path: '/members', icon: 'members' },
    { label: 'Attendance', path: '/attendance', icon: 'attendance' },
    { label: 'Events', path: '/events', icon: 'events' },
  ],
  'Registration Team': [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Attendance', path: '/attendance', icon: 'attendance', permissions: { module: 'attendance', action: 'read' } },
    { label: 'Events', path: '/events', icon: 'events', permissions: { module: 'events', action: 'read' } },
    { label: 'QR Attendance', path: '/attendance/qr', icon: 'attendance', permissions: { module: 'qr_attendance', action: 'read' } },
  ],
  'Finance Team': [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Finance', path: '/finance', icon: 'finance' },
    { label: 'Archives', path: '/archives', icon: 'archives' },
  ],
  'Cell Group Leader': [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Cell Group', path: '/cell-groups', icon: 'cellgroups' },
    { label: 'Attendance', path: '/attendance', icon: 'attendance' },
    { label: 'Events', path: '/events', icon: 'events' },
  ],
  'Group Leader': [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Members', path: '/members', icon: 'members' },
    { label: 'Attendance', path: '/attendance', icon: 'attendance' },
    { label: 'Events', path: '/events', icon: 'events' },
  ],
  'Ministry Leader': [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Ministry', path: '/ministry', icon: 'ministry' },
    { label: 'Events', path: '/events', icon: 'events' },
    { label: 'Attendance', path: '/attendance', icon: 'attendance' },
  ],
  Leader: [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'My Teams', path: '/leader/teams', icon: 'cellgroups' },
    { label: 'Attendance', path: '/attendance', icon: 'attendance', permissions: { module: 'attendance', action: 'read' } },
    { label: 'Events', path: '/events', icon: 'events', permissions: { module: 'events', action: 'read' } },
  ],
};

export const DEFAULT_TABS = [
  { label: 'Home', path: '/dashboard', icon: 'dashboard' },
  { label: 'Members', path: '/members', icon: 'members' },
  { label: 'Events', path: '/events', icon: 'events' },
  { label: 'Finance', path: '/finance', icon: 'finance' },
];

export const isAllowedForRolePath = (roleName, pathname, leaderAssignments = [], leaderScopeKey = null) => {
  if (pathname === '/outreach' || pathname.startsWith('/outreach/')) {
    if (!['System Admin', 'Pastor', 'Registration Team', 'Leader', 'Cell Group Leader', 'Group Leader', 'Ministry Leader'].includes(roleName)) return false;
    if (roleName === 'Leader') return leaderAssignments.some((assignment) => ['cell_group', 'member_group', 'group'].includes(assignment.scopeType || assignment.scope_type));
    return true;
  }
  const allowed = ROLE_ALLOWED_PATHS[roleName];
  if (!allowed) return true;
  if (pathname === '/force-change-password' || pathname === '/unauthorized') return true;
  if (roleName === 'Member') return pathname === '/portal' || pathname.startsWith('/portal/');
  if (roleName === 'Leader') {
    const hasCell = leaderAssignments.some((assignment) => (assignment.scopeType || assignment.scope_type) === 'cell_group');
    const hasGroup = leaderAssignments.some((assignment) => ['group', 'member_group'].includes(assignment.scopeType || assignment.scope_type));
    const selectedType = leaderScopeKey === 'all' ? 'all' : String(leaderScopeKey || '').split(':')[0];
    if (pathname.startsWith('/cell-groups')) return selectedType === 'all' ? hasCell : selectedType === 'cell_group' && hasCell;
    if (pathname.startsWith('/members')) return selectedType === 'all'
      ? hasGroup
      : ['member_group', 'group'].includes(selectedType) && hasGroup;
    if (!hasCell && !hasGroup && pathname !== '/dashboard' && pathname !== '/my-settings' && pathname !== '/leader/teams') return false;
    return allowed.some(path => pathname === path || pathname.startsWith(path + '/'));
  }
  if (roleName === 'Ministry Leader' && pathname.startsWith('/services/')) return true;
  if (roleName === 'Cell Group Leader' && /^\/services\/[^/]+\/attendance$/.test(pathname)) return true;
  return allowed.some(path => pathname === path || pathname.startsWith(`${path}/`));
};

export const isVisibleNavItem = (item, user, hasPermission) => {
  if (item.path === '/outreach') return isAllowedForRolePath(user?.roleName, item.path, user?.leaderAssignments, user?.activeLeaderScopeKey) && hasPermission('outreach', 'read');
  if (item.path === '/reports/team-attendance' && !['Leader', 'Cell Group Leader', 'Group Leader', 'Ministry Leader'].includes(user?.roleName)) return false;
  if (item.path === '/leader/teams') return user?.roleName === 'Leader';
  if (user?.roleName === 'Leader' && item.path === '/cell-groups') {
    const selectedType = user.activeLeaderScopeKey === 'all' ? 'all' : String(user.activeLeaderScopeKey || '').split(':')[0];
    const assigned = selectedType === 'all'
      ? user.leaderAssignments?.some((assignment) => (assignment.scopeType || assignment.scope_type) === 'cell_group') || false
      : selectedType === 'cell_group';
    return Boolean(assigned && (!item.permissions || hasPermission(item.permissions.module, item.permissions.action)));
  }
  if (user?.roleName === 'Leader' && item.path === '/members') {
    const selectedType = user.activeLeaderScopeKey === 'all' ? 'all' : String(user.activeLeaderScopeKey || '').split(':')[0];
    const assigned = selectedType === 'all'
      ? user.leaderAssignments?.some((assignment) => ['group', 'member_group'].includes(assignment.scopeType || assignment.scope_type)) || false
      : ['group', 'member_group'].includes(selectedType);
    return Boolean(assigned && (!item.permissions || hasPermission(item.permissions.module, item.permissions.action)));
  }
  const rolePaths = ROLE_ALLOWED_PATHS[user?.roleName];
  if (rolePaths) {
    if (!rolePaths.includes(item.path)) return false;
    if (user?.roleName === 'Leader' && item.permissions) {
      return hasPermission(item.permissions.module, item.permissions.action);
    }
    return true;
  }
  return !item.permissions || hasPermission(item.permissions.module, item.permissions.action);
};
