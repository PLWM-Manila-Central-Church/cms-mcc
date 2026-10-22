import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationProvider } from '../../context/ConfirmationContext';

const fixture = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: fixture }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, roleName: 'System Admin' }, hasPermission: () => true }),
}));

import ServicesPage from './ServicesPage';

describe('calendar-derived service creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.get.mockImplementation(async (url) => {
      if (url.startsWith('/services?')) return { data: { data: { services: [], total: 0, total_pages: 1 } } };
      if (url.startsWith('/events?')) return { data: { data: { events: [{ id: 17, title: 'Bible Retreat', status: 'Upcoming' }] } } };
      throw new Error(`Unexpected GET ${url}`);
    });
    fixture.post.mockResolvedValue({ data: { data: { id: 55 } } });
  });

  it('saves unknown time and capacity as unknown, and links the service to its event', async () => {
    render(<MemoryRouter><ConfirmationProvider><ServicesPage /></ConfirmationProvider></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /New Service/ }));

    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Bible Retreat' } });
    fireEvent.change(screen.getByLabelText('Date *'), { target: { value: '2026-10-31' } });
    fireEvent.change(screen.getByLabelText('Linked event (optional)'), { target: { value: '17' } });
    expect(screen.getByLabelText('Time (optional)')).not.toBeRequired();
    expect(screen.getByLabelText('Capacity (optional)')).not.toBeRequired();

    fireEvent.click(screen.getByRole('button', { name: 'Create Service' }));
    await waitFor(() => expect(fixture.post).toHaveBeenCalledWith('/services', expect.objectContaining({
      title: 'Bible Retreat',
      service_date: '2026-10-31',
      event_id: 17,
      service_time: null,
      capacity: null,
      total_parking_slots: null,
      status: 'draft',
    })));
  });
});
