// Navigation definitions — every route uses a unique MonoIcon key (zero repeating/missing icons).

export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    permissions: null,
  },
  {
    label: 'My Teams',
    path: '/leader/teams',
    icon: 'myTeams',
    permissions: null,
  },
  {
    label: 'Members',
    path: '/members',
    icon: 'members',
    permissions: { module: 'members', action: 'read' },
  },
  {
    label: 'Cell Groups',
    path: '/cell-groups',
    icon: 'cellgroups',
    permissions: { module: 'cell_groups', action: 'read' },
  },
  {
    label: 'Groups',
    path: '/groups',
    icon: 'ministry',
    permissions: { module: 'members', action: 'read' },
  },
  {
    label: 'Ministries',
    path: '/ministries',
    icon: 'groups',
    permissions: { module: 'ministry', action: 'read' },
  },
  {
    label: 'Service Assignments',
    path: '/ministry',
    icon: 'substitute',
    permissions: { module: 'ministry', action: 'read' },
  },
  {
    label: 'Ministry Schedules',
    path: '/ministry/schedules',
    icon: 'schedule',
    permissions: { module: 'ministry', action: 'read' },
    roles: ['System Admin', 'Pastor', 'Ministry Leader'],
  },
  {
    label: 'Users',
    path: '/users',
    icon: 'users',
    permissions: { module: 'users', action: 'read' },
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: 'attendance',
    permissions: { module: 'attendance', action: 'read' },
  },
  {
    label: 'QR Attendance',
    path: '/attendance/qr',
    icon: 'qr',
    permissions: { module: 'qr_attendance', action: 'read' },
  },
  {
    label: 'Notifications & Follow-ups',
    path: '/outreach',
    icon: 'outreach',
    permissions: { module: 'outreach', action: 'read' },
  },
  {
    label: 'Team Attendance Report',
    path: '/reports/team-attendance',
    icon: 'teamReport',
    permissions: { module: 'attendance', action: 'read' },
  },
  {
    label: 'Registration Analytics',
    path: '/reports/registration',
    icon: 'analytics',
    permissions: { module: 'attendance', action: 'read' },
    roles: ['System Admin', 'Pastor', 'Registration Team'],
  },
  {
    label: 'Bible Reading',
    path: '/bible-reading',
    icon: 'book',
    roles: ['Pastor', 'Registration Team'],
  },
  {
    label: 'Services',
    path: '/services',
    icon: 'services',
    permissions: { module: 'services', action: 'read' },
  },
  {
    label: 'Events',
    path: '/events',
    icon: 'events',
    permissions: { module: 'events', action: 'read' },
  },
  {
    label: 'Finance',
    path: '/finance',
    icon: 'finance',
    permissions: { module: 'finance', action: 'read' },
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: 'inventory',
    permissions: { module: 'inventory', action: 'read' },
  },
  {
    label: 'Archives',
    path: '/archives',
    icon: 'archive',
    permissions: { module: 'archives', action: 'read' },
  },
  {
    label: 'Audit Logs',
    path: '/audit-logs',
    icon: 'audit',
    permissions: { module: 'audit', action: 'read' },
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: 'settings',
    permissions: { module: 'settings', action: 'read' },
  },
];

// Backward-compatible export mapping nav keys -> MonoIcon names
export const NAV_ICONS = Object.fromEntries(NAV_ITEMS.map((item) => [item.icon, item.icon]));
