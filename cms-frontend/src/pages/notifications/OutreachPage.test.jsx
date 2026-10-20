import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import OutreachPage from './OutreachPage';
const state = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), role: 'System Admin', scope: null, status: 'assigned' }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get, put: state.put, post: state.post } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, roleName: state.role }, activeLeaderScopeKey: state.scope, hasPermission: () => true }) }));
const member = { id: 5, first_name: 'QA', last_name: 'Member', phone: '09123456789' };
const policySession = { id: 9, title: 'QA weekly gathering', status: 'closed', starts_at: '2026-10-20T02:00:00Z', expected_basis: 'explicit_roster', is_finalized: true, policy: null };
const collection = (items) => ({ items, total: items.length, page: 1, limit: 25 });
beforeEach(() => {
  vi.clearAllMocks(); state.role = 'System Admin'; state.scope = null; state.status = 'assigned';
  state.get.mockImplementation(async (url) => {
    const global = ['System Admin', 'Pastor', 'Registration Team'].includes(state.role);
    let data;
    if (url === '/outreach/availability') data = { schema_ready: true, enabled: true, mode: 'disabled', sms_delivery_enabled: false, provider_configured: false, scheduler_enabled: false,
      capabilities: { global, configure: state.role === 'System Admin', manage: state.role === 'System Admin', process: state.role === 'System Admin', resolve: true } };
    else if (url === '/outreach/overview') data = { followups: { assigned: 1 }, deliveries: { queued: 1 } };
    else if (url === '/outreach/follow-ups') data = collection([{ id: 7, member, series_key: 'weekly', absence_count: 2, status: state.status, assignee: { email: 'qa.worker@example.com' } }]);
    else if (url === '/outreach/follow-ups/7/assignees') data = [{ id: 1, email: 'qa.worker@example.com', role: 'System Admin' }];
    else if (url === '/outreach/follow-ups/7') data = { followup: { id: 7, status: state.status, revision: 1, assigned_to: 1, absence_count: 2, series_key: 'weekly' }, member, assignee: { id: 1, email: 'qa.worker@example.com', is_active: true }, timeline: [{ session_id: 9, title: 'QA gathering', starts_at: '2026-10-20', outcome: 'absent' }], deliveries: [], attempts: [] };
    else if (url === '/outreach/sessions') data = collection([policySession]);
    else if (url === '/outreach/configuration') data = { enabled: true, mode: 'disabled', reminder_days: [3, 1], reminder_hour: 9, daily_sms_cap: 10, reminder_template: 'Hi {{first_name}}, gathering reminder.', followup_template: 'Hi {{first_name}}, checking in.' };
    else if (url === '/outreach/deliveries') data = collection([]);
    else throw new Error('Unexpected endpoint: ' + url);
    return { data: { data } };
  });
  state.put.mockResolvedValue({ data: { data: {} } });
  state.post.mockImplementation(async (url) => {
    if (url.endsWith('/resolve')) state.status = 'resolved';
    return { data: { data: { next_cursor: null, created_cases: 0, cancelled_cases: 0, mode: 'disabled', processed: 1 } } };
  });
});
const show = () => render(<MemoryRouter><OutreachPage /></MemoryRouter>);
it('supports arrow and endpoint keyboard navigation with one tab stop', async () => {
  show(); const first = await screen.findByRole('tab', { name: 'Follow-ups' });
  first.focus(); fireEvent.keyDown(first, { key: 'ArrowRight' });
  const next = screen.getByRole('tab', { name: 'Activity rules' });
  expect(next).toHaveAttribute('aria-selected', 'true'); expect(next).toHaveFocus();
  expect(first).toHaveAttribute('tabindex', '-1');
  fireEvent.keyDown(next, { key: 'End' });
  expect(screen.getByRole('tab', { name: 'Configuration' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Configuration' }), { key: 'Home' });
  expect(first).toHaveFocus();
});
it('shows sending disabled and saves session rules against existing attendance sessions', async () => {
  show(); expect(await screen.findByText('SMS sending is off.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Activity rules' }));
  await screen.findByText('QA weekly gathering');
  fireEvent.click(screen.getByRole('button', { name: 'Edit rules' }));
  fireEvent.click(screen.getByLabelText('Enable activity reminders'));
  fireEvent.click(screen.getByLabelText('Include this gathering in absence follow-ups'));
  fireEvent.change(screen.getByLabelText('Follow-up series'), { target: { value: 'weekly_worship' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save activity rules' }));
  await waitFor(() => expect(state.put).toHaveBeenCalledWith('/outreach/sessions/9/policy', expect.objectContaining({ reminders_enabled: true, followups_enabled: true, series_key: 'weekly_worship', expected_revision: 0 })));
});
it('requires a note and submits a revision when resolving a case', async () => {
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Open follow-up' }));
  await screen.findByRole('dialog', { name: 'Attendance follow-up' });
  fireEvent.click(await screen.findByRole('button', { name: 'Resolve follow-up' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('at least 5 characters');
  expect(state.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Assignment or resolution note'), { target: { value: 'QA personal care completed' } });
  fireEvent.click(screen.getByRole('button', { name: 'Resolve follow-up' }));
  await waitFor(() => expect(state.post).toHaveBeenCalledWith('/outreach/follow-ups/7/resolve', { expected_revision: 1, note: 'QA personal care completed' }));
  expect(await screen.findByText(/Follow-up resolved/)).toBeInTheDocument();
});
it('keeps combined Leader context read-only and hides staff configuration and consent tabs', async () => {
  state.role = 'Leader'; state.scope = 'all'; show();
  fireEvent.click(await screen.findByRole('button', { name: 'Open follow-up' }));
  expect(await screen.findByText(/combined team view is read-only/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Resolve follow-up' })).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Configuration' })).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Member consent' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Process due queue' })).not.toBeInTheDocument();
});
it('keeps Live SMS unavailable when the server gate is off', async () => {
  show(); fireEvent.click(await screen.findByRole('tab', { name: 'Configuration' }));
  expect(await screen.findByRole('option', { name: /Live SMS/ })).toBeDisabled();
  expect(state.post).not.toHaveBeenCalled();
});
