import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate';

describe('date formatting for records', () => {
  it('formats valid date strings and Date objects', () => {
    expect(formatDate('2026-10-09T12:00:00.000Z', { locale: 'en-US', dateOptions: { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' } }))
      .toBe('Oct 9, 2026');
    expect(formatDate(new Date('2026-10-09T12:00:00.000Z'), { locale: 'en-US', dateOptions: { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' } }))
      .toBe('Oct 9, 2026');
  });

  it('returns a stable fallback for missing and invalid timestamps', () => {
    expect(formatDate(undefined)).toBe('Date unavailable');
    expect(formatDate(null)).toBe('Date unavailable');
    expect(formatDate('not-a-date')).toBe('Date unavailable');
  });
});
