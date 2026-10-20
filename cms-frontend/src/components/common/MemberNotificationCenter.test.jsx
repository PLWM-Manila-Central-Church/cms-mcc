import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: api }));

import MemberNotificationCenter from './MemberNotificationCenter';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}{location.search}</span>;
}

const colors = {
  surface: '#fff', surfaceAlt: '#f8fafc', border: '#e2e8f0',
  t1: '#0f172a', t3: '#64748b', accent: '#005599', accentL: '#eff6ff', danger: '#dc2626',
};

describe('MemberNotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [] } });
    api.patch.mockResolvedValue({ data: { success: true } });
    api.delete.mockResolvedValue({ data: { success: true } });
  });

  it('keeps the mobile panel inside the viewport and restores bell focus on Escape', async () => {
    render(<MemoryRouter><MemberNotificationCenter colors={colors} isMobile /></MemoryRouter>);
    const bell = screen.getByRole('button', { name: 'Notifications' });
    fireEvent.click(bell);
    const panel = screen.getByRole('region', { name: 'Notifications' });
    expect(panel).toHaveStyle({ position: 'fixed', right: '12px' });
    expect(panel.style.width).toBe('calc(100vw - 24px)');
    expect(bell).toHaveAttribute('aria-controls', panel.id);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });

  it('uses readable portal action colors in dark mode', async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 41, message: 'Activity reminder', is_read: 0, reference_type: 'event', reference_id: 1 }] } });
    render(<MemoryRouter><MemberNotificationCenter colors={{ ...colors, dk: true, accentT: '#60a5fa' }} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(await screen.findByRole('button', { name: 'Open' })).toHaveStyle({ color: '#60a5fa' });
    expect(screen.getByRole('button', { name: 'Clear all' })).toHaveStyle({ color: '#fca5a5' });
  });

  it('shows and marks a self-registration notice read before opening Events', async () => {
    const message = 'You have been successfully registered for "QA Community Gathering".';
    api.get.mockResolvedValue({ data: { data: [{
      id: 14,
      type: 'event_registered',
      message,
      is_read: 0,
      reference_id: 27,
      reference_type: 'event',
      created_at: '2026-10-10T00:00:00.000Z',
    }] } });

    render(
      <MemoryRouter initialEntries={['/portal']}>
        <MemberNotificationCenter colors={colors} />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications', { timeout: 15000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/notifications/14/read'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/portal?tab=events'));
  });

  it('marks all notifications read and clears them through the scoped APIs', async () => {
    api.get.mockResolvedValue({ data: { data: [
      { id: 21, type: 'event_registered', message: 'Event update', is_read: 0, reference_id: 27, reference_type: 'event' },
      { id: 22, type: 'attendance_service_recorded', message: 'Service check-in', is_read: 1, reference_id: 5, reference_type: 'service' },
    ] } });

    render(<MemoryRouter><MemberNotificationCenter colors={colors} /></MemoryRouter>);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications', { timeout: 15000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Mark all read' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/notifications/read-all'));
    await waitFor(() => expect(screen.queryByText('1 unread')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/notifications/clear-all'));
    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
  });
});
