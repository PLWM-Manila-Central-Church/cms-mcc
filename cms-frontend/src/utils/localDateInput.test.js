import { afterEach, describe, expect, it } from 'vitest';
import { localDateInputValue } from './localDateInput';

const originalTimeZone = process.env.TZ;

afterEach(() => {
  if (originalTimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimeZone;
});

describe('local date input values', () => {
  it('keeps the Manila calendar date at midnight instead of shifting to the prior UTC day', () => {
    process.env.TZ = 'Asia/Manila';
    const manilaMidnight = new Date('2026-10-09T16:00:00.000Z');

    expect(manilaMidnight.toISOString().slice(0, 10)).toBe('2026-10-09');
    expect(localDateInputValue(manilaMidnight)).toBe('2026-10-10');
  });

  it('returns an empty value for an invalid date', () => {
    expect(localDateInputValue(new Date('invalid'))).toBe('');
  });
});
