import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import RegistrationAnalyticsPage from './RegistrationAnalyticsPage';

const state = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get } }));

const overview = {
  range: { from: '2026-08-25', to: '2026-11-22' },
  events: [
    { id: 1, title: 'Youth Camp', category: 'Outreach', start_date: '2026-11-10', capacity: 100, registered: 80, seats: 60, parking: 10, fill_rate: 80 },
    { id: 2, title: 'Worship Night', category: 'Worship Night', start_date: '2026-11-15', capacity: null, registered: 40, seats: 0, parking: 0, fill_rate: null },
  ],
  totals: { events: 2, registrations: 120, capacity: 100, fill_rate: 100, seats: 60, parking: 10 },
  categories: [{ label: 'Outreach', total: 80 }, { label: 'Worship Night', total: 40 }],
  timeline: [
    { date: '2026-11-10', total: 10, cumulative: 10 },
    { date: '2026-11-11', total: 5, cumulative: 15 },
  ],
  attendance: {
    services_held: 1, check_ins: 95, average: 95,
    rows: [{ id: 3, title: 'Sunday Service', date: '2026-11-16', present: 95, capacity: 120, rate: 79.2 }],
  },
};

beforeEach(() => {
  state.get.mockReset();
  state.get.mockImplementation(async (path) => {
    if (path === '/reports/registration') return { data: { data: overview } };
    if (path === '/reports/registration/events/1') return { data: { data: {
      event: overview.events[0],
      timeline: [{ date: '2026-11-10', cumulative: 80 }],
      registrations: [{ id: 9, name: 'Ana Cruz', registered_at: '2026-11-02T09:00:00Z', seat_number: 12, parking_slot: null }],
    } } };
    return { data: { data: {} } };
  });
});

test('shows the registration totals, events and attendance summary', async () => {
  render(<RegistrationAnalyticsPage />);

  expect(await screen.findByText('Registration Analytics')).toBeInTheDocument();
  expect(await screen.findByText('Youth Camp')).toBeInTheDocument();
  expect(screen.getAllByText('120').length).toBeGreaterThan(0);
  expect(screen.getByText('Sunday Service')).toBeInTheDocument();
  expect(screen.getAllByText('95').length).toBeGreaterThan(0);
});

test('opens one event with its registrants in a centred dialog', async () => {
  render(<RegistrationAnalyticsPage />);
  fireEvent.click((await screen.findAllByRole('button', { name: 'Open' }))[0]);

  expect(await screen.findByRole('dialog', { name: 'Youth Camp' })).toBeInTheDocument();
  expect(await screen.findByText('Ana Cruz')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Close event detail' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
