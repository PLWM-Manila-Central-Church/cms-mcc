import { describe, expect, it } from 'vitest';
import { getDateRangeError } from './dateRange';

describe('getDateRangeError', () => {
  it('accepts open-ended and inclusive date ranges', () => {
    expect(getDateRangeError('', '2026-10-10')).toBe('');
    expect(getDateRangeError('2026-10-10', '')).toBe('');
    expect(getDateRangeError('2026-10-10', '2026-10-10')).toBe('');
    expect(getDateRangeError('2026-10-01', '2026-10-10')).toBe('');
  });

  it('reports a reversed range', () => {
    expect(getDateRangeError('2026-10-12', '2026-10-10'))
      .toBe('Start date must be on or before end date.');
  });
});
