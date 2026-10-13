import { expect, test } from 'vitest';
import { currentNavPath } from './navigationState';

test('only the most specific visible route is current', () => {
  const items = [{ path: '/attendance' }, { path: '/attendance/qr' }, { path: '__more__' }];
  expect(currentNavPath(items, '/attendance/qr')).toBe('/attendance/qr');
  expect(currentNavPath(items, '/attendance/qr/session')).toBe('/attendance/qr');
  expect(currentNavPath(items, '/attendance')).toBe('/attendance');
  expect(currentNavPath(items, '/attendance-other')).toBe('');
  expect(currentNavPath([{ path: '/attendance' }], '/attendance/qr')).toBe('/attendance');
});
