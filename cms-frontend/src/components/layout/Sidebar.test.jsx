import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { NAV_ITEMS } from '../../utils/constants';
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: 'System Admin' }, hasPermission: () => true }) }));
import Sidebar from './Sidebar';
test('QR attendance has one current destination and collapsed icons retain names', () => {
  render(<MemoryRouter initialEntries={['/attendance/qr']}><Sidebar collapsed onToggle={() => {}} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'QR Attendance' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Attendance', exact: true })).not.toHaveAttribute('aria-current');
  expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false');
});
test('every navigation item has a unique icon key with no duplicates', () => {
  const icons = NAV_ITEMS.map((item) => item.icon);
  expect(new Set(icons).size).toBe(icons.length);
});
