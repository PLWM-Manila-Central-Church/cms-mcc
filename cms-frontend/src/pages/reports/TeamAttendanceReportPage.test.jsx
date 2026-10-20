import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamAttendanceReportPage from './TeamAttendanceReportPage';

const state = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: 'Cell Group Leader' } }) }));

describe('TeamAttendanceReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.get.mockResolvedValue({ data: { data: {
      range: { from: '2026-10-01', to: '2026-10-20' },
      period: { preset: 'year', bucket: 'month' },
      scope: 'Assigned team members only.',
      attendance: { service_checkins: 4, event_checkins: 2, buckets: [{ period: '2026-10', service: 4, events: 2 }] },
    } } });
  });

  it('loads an assigned-team-only annual report and offers a monthly period', async () => {
    render(<TeamAttendanceReportPage />);
    expect(await screen.findByText('Assigned team members only.')).toBeInTheDocument();
    expect(screen.getByText('Service check-ins')).toBeInTheDocument();
    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
    expect(state.get).toHaveBeenCalledWith('/reports/team-attendance', expect.objectContaining({
      params: expect.objectContaining({ period: 'year' }),
    }));

    fireEvent.change(screen.getByLabelText('Report period'), { target: { value: 'month' } });
    await waitFor(() => expect(state.get).toHaveBeenLastCalledWith('/reports/team-attendance', expect.objectContaining({
      params: expect.objectContaining({ period: 'month' }),
    })));
  });
});
