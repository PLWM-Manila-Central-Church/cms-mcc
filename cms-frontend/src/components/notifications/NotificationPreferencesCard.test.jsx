import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import NotificationPreferencesCard from './NotificationPreferencesCard';
const calls = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: calls }));
const preference = { member_id: 1, member_name: 'QA Member', phone: '09123456789', sms_enabled: false, sms_effective: false,
  activity_reminders: true, attendance_followups: true, needs_reconsent: false, consent_at: null };
it('inherits the Member portal dark theme without changing notification data', async () => {
  render(<NotificationPreferencesCard theme="dark" />);
  expect(screen.getByRole('region', { name: 'Notification preferences' })).toHaveAttribute('data-theme', 'dark');
  await screen.findByLabelText('Mobile number');
  expect(calls.put).not.toHaveBeenCalled();
});
beforeEach(() => {
  vi.clearAllMocks();
  calls.get.mockImplementation(async (url) => ({ data: { data: url.endsWith('availability') ? { mode: 'disabled', sms_delivery_enabled: false } : { ...preference } } }));
  calls.put.mockImplementation(async (_url, data) => ({ data: { data: { ...preference, ...data, sms_effective: data.sms_enabled } } }));
});
it('requires explicit consent before enabling a number and clearly shows sending is off', async () => {
  render(<NotificationPreferencesCard />);
  expect(await screen.findByLabelText('Mobile number')).toHaveValue(preference.phone);
  expect(screen.getByText(/SMS sending is currently off/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Allow SMS notifications'));
  fireEvent.click(screen.getByRole('button', { name: 'Save notification preferences' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Confirm permission');
  expect(calls.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText(/I agree to receive/));
  fireEvent.click(screen.getByRole('button', { name: 'Save notification preferences' }));
  await waitFor(() => expect(calls.put).toHaveBeenCalledWith('/outreach/me/preferences', expect.objectContaining({ sms_enabled: true, consent_confirmed: true })));
  expect(await screen.findByRole('status')).toHaveTextContent('preferences saved');
});
it('shows a save failure without reporting success', async () => {
  calls.put.mockRejectedValue({ response: { data: { error: { code: 'INVALID_MOBILE', message: 'Enter a valid Philippine mobile number' } } } });
  render(<NotificationPreferencesCard />);
  await screen.findByLabelText('Mobile number');
  fireEvent.click(screen.getByRole('button', { name: 'Save notification preferences' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid Philippine mobile number');
  expect(screen.queryByText('Notification preferences saved.')).not.toBeInTheDocument();
});
it('records staff consent evidence through the selected member endpoint', async () => {
  render(<NotificationPreferencesCard memberId={44} />);
  await screen.findByLabelText('Mobile number');
  fireEvent.change(screen.getByLabelText('Consent or opt-out record'), { target: { value: 'Member asked staff to keep SMS off' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save notification preferences' }));
  await waitFor(() => expect(calls.put).toHaveBeenCalledWith('/outreach/members/44/preferences', expect.objectContaining({ sms_enabled: false, consent_note: 'Member asked staff to keep SMS off' })));
});
