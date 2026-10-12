export function getDateRangeError(from, to) {
  return from && to && from > to
    ? 'Start date must be on or before end date.'
    : '';
}
