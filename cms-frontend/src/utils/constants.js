export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: '🏠',
    permissions: null
  },
  {
    label: 'Members',
    path: '/members',
    icon: '👥',
    permissions: { module: 'members', action: 'read' }
  },
  {
    label: 'Cell Groups',
    path: '/cell-groups',
    icon: '🏘️',
    permissions: { module: 'cellgroups', action: 'read' }
  },
  {
    label: 'Ministry',
    path: '/ministry',
    icon: '🎭',
    permissions: { module: 'ministry', action: 'read' }
  },
  {
    label: 'Users',
    path: '/users',
    icon: '🔑',
    permissions: { module: 'users', action: 'create' }
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: '✅',
    permissions: { module: 'attendance', action: 'read' }
  },
  {
    label: 'Services',
    path: '/services',
    icon: '⛪',
    permissions: { module: 'services', action: 'read' }
  },
  {
    label: 'Finance',
    path: '/finance',
    icon: '💰',
    permissions: { module: 'finance', action: 'read' }
  },
  {
    label: 'Events',
    path: '/events',
    icon: '📅',
    permissions: { module: 'events', action: 'read' }
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: '📦',
    permissions: { module: 'inventory', action: 'read' }
  },
  {
    label: 'Archives',
    path: '/archives',
    icon: '🗂️',
    permissions: { module: 'archives', action: 'read' }
  },
{
  label: 'Audit Logs',
  path: '/audit-logs',
  icon: '📋',
  permissions: { module: 'audit_logs', action: 'read' }
},
  {
    label: 'Settings',
    path: '/settings',
    icon: '⚙️',
    permissions: { module: 'settings', action: 'read' }
  }
];