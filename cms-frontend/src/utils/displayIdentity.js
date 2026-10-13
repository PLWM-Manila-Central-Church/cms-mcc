export function displayMemberName(member, fallback = 'Member record') {
  const parts = [member?.last_name?.trim(), member?.first_name?.trim()].filter(Boolean);
  return parts.join(', ') || fallback;
}

export function displayAccount(email, fallback = 'Staff account') {
  if (!email) return fallback;
  return /@accounts\.invalid$/i.test(email) ? 'Former staff account' : email;
}
