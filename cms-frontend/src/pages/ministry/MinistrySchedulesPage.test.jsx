import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import MinistrySchedulesPage from './MinistrySchedulesPage';

const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get, post: state.post, delete: state.delete } }));

beforeEach(() => {
  state.get.mockReset(); state.post.mockReset(); state.delete.mockReset();
  state.get.mockImplementation(async (path) => {
    if (path === '/ministry/roles') return { data: { data: [
      { id: 2, name: 'Choir' }, { id: 3, name: 'Ushering' },
    ] } };
    if (path === '/ministry/schedules') return { data: { data: [
      { id: 11, kind: 'practice', title: 'Choir practice', date: '2026-03-06', startTime: '18:00:00', endTime: '20:00:00', location: 'Sanctuary' },
      { id: 12, kind: 'cleaning', title: 'Sanctuary cleaning', date: '2026-03-07' },
    ] } };
    return { data: { data: [] } };
  });
  state.post.mockResolvedValue({ data: { data: { id: 13 } } });
  state.delete.mockResolvedValue({ data: { success: true } });
});

test('lists the selected ministry schedules and deletes one', async () => {
  render(<MinistrySchedulesPage />);
  expect(await screen.findByText('Choir practice')).toBeInTheDocument();
  expect(screen.getByText('Sanctuary cleaning')).toBeInTheDocument();
  expect(screen.getAllByText('Practice').length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
  await waitFor(() => expect(state.post).toHaveBeenCalledWith('/ministry/schedules/11/archive'));
});

test('adds a schedule entry for the selected ministry', async () => {
  render(<MinistrySchedulesPage />);
  await screen.findByText('Choir practice');

  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Sectional practice' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-10' } });
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '19:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add schedule' }));

  await waitFor(() => expect(state.post).toHaveBeenCalledWith('/ministry/schedules', expect.objectContaining({
    ministry_role_id: '2', title: 'Sectional practice', date: '2026-03-10', kind: 'practice',
  })));
});
