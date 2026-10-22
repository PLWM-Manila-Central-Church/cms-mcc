import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsReportPage from './AnalyticsReportPage';

const state = vi.hoisted(() => ({ get: vi.fn(), roleName: 'Registration Team' }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: state.roleName } }) }));
vi.mock('../../hooks/useIsMobile', () => ({ default: () => false }));

describe('AnalyticsReportPage period controls and role visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.roleName = 'Registration Team';
    state.get.mockResolvedValue({ data: { data: {
      range: { from: '2026-01-01', to: '2026-10-20' },
      period: { preset: 'year', bucket: 'month' },
      members: { total: 10, active: 9, inactive: 1, new_in_range: 2 },
      demographics: { age_bands: [], gender: [], cell_groups: [], groups: [] },
      member_growth: [{ period: '2026-10', total: 2 }],
      attendance: { service_checkins: 4, event_checkins: 2, buckets: [{ period: '2026-10', service: 4, events: 2 }] },
      finance: null,
    } } });
  });

  it('requests the selected report period and keeps Registration finance data hidden', async () => {
    render(<AnalyticsReportPage />);
    expect(await screen.findByText('Consolidated Analytics')).toBeInTheDocument();
    expect(screen.getByText('Service check-ins')).toBeInTheDocument();
    expect(screen.queryByText('Finance trend')).not.toBeInTheDocument();
    expect(state.get).toHaveBeenCalledWith('/reports/analytics', expect.objectContaining({
      params: expect.objectContaining({ period: 'year' }),
    }));

    fireEvent.change(screen.getByLabelText('Report period'), { target: { value: 'week' } });
    await waitFor(() => expect(state.get).toHaveBeenLastCalledWith('/reports/analytics', expect.objectContaining({
      params: expect.objectContaining({ period: 'week' }),
    })));
  });

  it('shows income, expense and net totals to the Finance Team', async () => {
    state.roleName = 'Finance Team';
    state.get.mockResolvedValue({ data: { data: {
      range: { from: '2026-10-01', to: '2026-10-22' },
      period: { preset: 'month', bucket: 'week' },
      members: null,
      attendance: null,
      finance: {
        income: 1200,
        expenses: 450,
        net: 750,
        buckets: [{ period: '2026-10-18', income: 1200, expenses: 450, net: 750 }],
      },
    } } });

    render(<AnalyticsReportPage />);

    expect(await screen.findAllByText('Received income')).toHaveLength(2);
    expect(screen.getAllByText('Expenses')).toHaveLength(2);
    expect(screen.getByText('Net balance')).toBeInTheDocument();
    expect(screen.getByText('Finance trend')).toBeInTheDocument();
  });
});
