export const normalizeEventStatus = (status) => {
  const key = String(status || '').trim().toLowerCase();

  if (key === 'draft' || key === 'published' || key === 'upcoming') return 'Upcoming';
  if (key === 'ongoing') return 'Ongoing';
  if (key === 'completed') return 'Completed';
  if (key === 'cancelled' || key === 'canceled') return 'Cancelled';

  return 'Upcoming';
};
