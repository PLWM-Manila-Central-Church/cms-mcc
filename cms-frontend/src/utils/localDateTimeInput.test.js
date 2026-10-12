import { describe, expect, it } from 'vitest';
import { toLocalDateTimeInput } from './localDateTimeInput';

const toLocalParts = (value) => {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

describe('toLocalDateTimeInput', () => {
  it('converts an ISO timestamp to the same local wall time used by the UI', () => {
    const timestamp = '2026-11-01T15:59:00.000Z';

    expect(toLocalDateTimeInput(timestamp)).toBe(toLocalParts(timestamp));
  });

  it('returns an empty value for missing or invalid timestamps', () => {
    expect(toLocalDateTimeInput('')).toBe('');
    expect(toLocalDateTimeInput('not-a-date')).toBe('');
  });
});
