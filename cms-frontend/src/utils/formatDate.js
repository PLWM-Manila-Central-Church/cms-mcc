const DEFAULT_DATE_OPTIONS = { month: 'short', day: 'numeric', year: 'numeric' };

export const formatDate = (value, {
  locale = 'en-PH',
  dateOptions = DEFAULT_DATE_OPTIONS,
  fallback = 'Date unavailable',
} = {}) => {
  if (value == null || value === '') return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;

  return date.toLocaleDateString(locale, dateOptions);
};
