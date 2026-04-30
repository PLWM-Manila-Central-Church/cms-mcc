export const ROLE_ALLOWED_PATHS = {
  'Finance Team': ['/dashboard', '/members', '/finance', '/archives', '/my-settings'],
  'Ministry Leader': ['/dashboard', '/ministry', '/events', '/attendance', '/inventory', '/archives', '/my-settings'],
  'Cell Group Leader': ['/dashboard', '/cell-groups', '/attendance', '/events', '/inventory', '/archives', '/my-settings'],
  'Group Leader': ['/dashboard', '/members', '/attendance', '/events', '/services', '/inventory', '/archives', '/my-settings'],
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
    { label: 'Events', path: '/events', icon: 'events' },
    { label: 'Archives', path: '/archives', icon: 'archives' },
  ],
  'Registration Team': [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Members', path: '/members', icon: 'members' },
    { label: 'Events', path: '/events', icon: 'events' },
    { label: 'Services', path: '/services', icon: 'services' },
  ],
  'Finance Team': [
    { label: 'Home', path: '/dashboard', icon: 'dashboard' },
    { label: 'Finance', path: '/finance', icon: 'finance' },
    { label: 'Members', path: '/members', icon: 'members' },
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
};

export const DEFAULT_TABS = [
  { label: 'Home', path: '/dashboard', icon: 'dashboard' },
  { label: 'Members', path: '/members', icon: 'members' },
  { label: 'Events', path: '/events', icon: 'events' },
  { label: 'Finance', path: '/finance', icon: 'finance' },
];

export const isAllowedForRolePath = (roleName, pathname) => {
  const allowed = ROLE_ALLOWED_PATHS[roleName];
  if (!allowed) return true;
  if (pathname === '/force-change-password' || pathname === '/unauthorized') return true;
  if (roleName === 'Ministry Leader' && pathname.startsWith('/services/')) return true;
  if (roleName === 'Cell Group Leader' && /^\/services\/[^/]+\/attendance$/.test(pathname)) return true;
  return allowed.some(path => pathname === path || pathname.startsWith(`${path}/`));
};

export const isVisibleNavItem = (item, user, hasPermission) => {
  const rolePaths = ROLE_ALLOWED_PATHS[user?.roleName];
  if (rolePaths) return rolePaths.includes(item.path);
  return !item.permissions || hasPermission(item.permissions.module, item.permissions.action);
};
