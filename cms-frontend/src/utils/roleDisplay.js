export const SCOPED_LEADER_ROLES = ['Ministry Leader', 'Cell Group Leader', 'Group Leader'];

export const isScopedLeaderRole = (roleName) => SCOPED_LEADER_ROLES.includes(roleName);

export const compactGroupName = (name = '') => {
  const value = String(name || '').trim();
  if (!value) return 'Group';
  if (/young adult|young adults|\bya\b/i.test(value)) return 'YA';
  if (/women/i.test(value)) return 'WOMENS';
  if (/\bmen\b|men's/i.test(value)) return 'MENS';
  return value.replace(/\s*group$/i, '').trim() || value;
};

export const compactCellGroupName = (name = '') => {
  const value = String(name || '').trim();
  if (!value) return 'CG';
  const match = value.match(/cell\s*group\s*(\d+)/i);
  if (match) return `CG ${match[1]}`;
  return value;
};

export const cellGroupPageTitle = (name = '') => {
  const value = String(name || '').trim();
  const match = value.match(/cell\s*group\s*(\d+)/i);
  if (match) return `Cell Group ${match[1]}`;
  return value || 'Cell Group';
};

export const groupMembersTitle = (user = {}) => `${compactGroupName(user.leadsGroupName)} Members`;

export const greetingTarget = (user = {}) => {
  const role = user.roleName;
  if (role === 'System Admin') return 'Admin';
  if (role === 'Registration Team') return 'Registration team';
  if (role === 'Finance Team') return 'Finance team';
  if (role === 'Pastor') return 'Pastor';
  if (role === 'Ministry Leader') return 'Ministry Leader';
  if (role === 'Cell Group Leader') return `${compactCellGroupName(user.leadsCellGroupName)} Leader`;
  if (role === 'Group Leader') return `${compactGroupName(user.leadsGroupName)} Leader`;
  return role || 'there';
};
