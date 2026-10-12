import { describe, expect, it } from 'vitest';
import { timeAgo } from './timeAgo';

describe('notification time labels', () => {
  const now = Date.parse('2026-10-09T20:00:00.000Z');

  it('formats recent notifications in seconds, minutes, hours, and days', () => {
    expect(timeAgo(now - 30_000, now)).toBe('Just now');
    expect(timeAgo(now - 120_000, now)).toBe('2m ago');
    expect(timeAgo(now - 3_600_000, now)).toBe('1h ago');
    expect(timeAgo(now - 172_800_000, now)).toBe('2d ago');
  });

  it('handles Date objects and future timestamps without negative labels', () => {
    expect(timeAgo(new Date(now - 60_000), now)).toBe('1m ago');
    expect(timeAgo(now + 60_000, now)).toBe('Just now');
  });

  it('shows a useful fallback for missing or invalid values', () => {
    expect(timeAgo(undefined, now)).toBe('Time unavailable');
    expect(timeAgo(null, now)).toBe('Time unavailable');
    expect(timeAgo('not-a-date', now)).toBe('Time unavailable');
  });
});
