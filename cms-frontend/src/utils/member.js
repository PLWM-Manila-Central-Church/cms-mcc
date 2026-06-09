// Shared member utilities — avoid duplicating these in every page.

export const ageFromDate = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDelta = now.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

export const fullName = (member = {}) => {
  return `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Member';
};

export const ageLabel = (dateValue) => {
  const age = ageFromDate(dateValue);
  return age === null ? '-' : `${age}`;
};

export const dateWithAge = (dateValue) => {
  const age = ageFromDate(dateValue);
  const date = dateValue ? fmtDate(dateValue) : '-';
  return age === null ? date : `${age} yrs - ${date}`;
};

export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};
