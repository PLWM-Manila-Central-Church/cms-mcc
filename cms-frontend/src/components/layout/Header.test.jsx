import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
const state = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: 'System Admin', email: 'admin@example.com' }, logout: vi.fn() }) }));
vi.mock('../../api/axiosInstance', () => ({ default: { patch: state.patch } }));
vi.mock('../../hooks/useNotificationPolling', () => ({ default: ({ onNotifications }) => {
  useEffect(() => { onNotifications([{ id: 1, message: 'Sample service update', type: 'info', is_read: 0 }]); }, [onNotifications]);
} }));
import Header from './Header';
beforeEach(() => { vi.clearAllMocks(); state.patch.mockResolvedValue({}); });
test('language and notification popovers are exclusive and Escape restores the trigger', () => {
  render(<MemoryRouter><Header sidebarWidth="244px" isNarrowDesktop /></MemoryRouter>);
  const language = screen.getByRole('button', { name: 'Language: English' });
  const notifications = screen.getByRole('button', { name: 'Notifications' });
  expect(language).toHaveTextContent(/^EN$/);
  fireEvent.click(language);
  expect(language).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(notifications);
  expect(language).toHaveAttribute('aria-expanded', 'false');
  expect(notifications).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: /^Sample service update/ })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(notifications).toHaveFocus();
  expect(notifications).toHaveAttribute('aria-expanded', 'false');
});
