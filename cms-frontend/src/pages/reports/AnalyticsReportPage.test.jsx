import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsReportPage from './AnalyticsReportPage';

const state = vi.hoisted(() => ({ get: vi.fn(), roleName: 'Registration Team' }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: state.roleName } }) }));
vi.mock('../../hooks/useIsMobile', () => ({ default: () => false }));

const memberFixture = {
  range: { from: '2026-01-01', to: '2026-10-20' },
  period: { preset: 'year', bucket: 'month' },
  members: { total: 12, active: 10, inactive: 2, new_in_range: 3 },
  demographics: {
    age_bands: [
      { label: '18-29', total: 6 },
      { label: '30-49', total: 4 },
      { label: '50+', total: 1 },
      { label: 'Unknown', total: 1 },
    ],
    gender: [
      { label: 'Female', total: 7 },
      { label: 'Male', total: 4 },
      { label: 'Unspecified', total: 1 },
    ],
    cell_groups: [
      { id: 1, label: 'Alpha', total: 5 },
      { id: 2, label: 'Bethany', total: 4 },
      { id: null, label: 'Other (3 cell groups)', total: 3 },
    ],
    groups: [
      { id: 1, label: 'Worship', total: 6 },
      { id: 2, label: 'Ushering', total: 4 },
      { id: null, label: 'Other (2 groups)', total: 2 },
    ],
  },
  member_growth: [
    { period: '2026-08', total: 1 },
    { period: '2026-09', total: 0 },
    { period: '2026-10', total: 2 },
  ],
  attendance: {
    service_checkins: 42,
    event_checkins: 12,
    buckets: [
      { period: '2026-09', service: 18, events: 5 },
      { period: '2026-10', service: 24, events: 7 },
    ],
  },
  finance: null,
};

const financeOnlyFixture = {
  range: { from: '2026-10-01', to: '2026-10-22' },
  period: { preset: 'month', bucket: 'week' },
  members: null,
  demographics: null,
  member_growth: null,
  attendance: null,
  finance: {
    income: 1200,
    expenses: 450,
    net: 750,
    buckets: [{ period: '2026-10-18', income: 1200, expenses: 450, net: 750 }],
  },
};

describe('AnalyticsReportPage composition and role visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.roleName = 'Registration Team';
    state.get.mockResolvedValue({ data: { data: memberFixture } });
  });

  it('requests the selected period and keeps Registration finance hidden', async () => {
    render(<AnalyticsReportPage />);

    expect(await screen.findByRole('heading', { name: 'Consolidated Analytics' })).toBeInTheDocument();
    expect(state.get).toHaveBeenCalledWith('/reports/analytics', expect.objectContaining({
      params: expect.objectContaining({ period: 'year' }),
    }));

    expect(screen.getByRole('heading', { name: 'Member growth' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gender' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Finance' })).not.toBeInTheDocument();
    expect(screen.queryByText('Received income')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Report period'), { target: { value: 'week' } });
    await waitFor(() => expect(state.get).toHaveBeenLastCalledWith('/reports/analytics', expect.objectContaining({
      params: expect.objectContaining({ period: 'week' }),
    })));
  });

  it('pairs charts with a number rail and uses one section chrome', async () => {
    render(<AnalyticsReportPage />);

    await screen.findByRole('heading', { name: 'Member growth' });
    expect(screen.getByRole('heading', { name: 'Attendance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Age' })).toBeInTheDocument();
    expect(screen.getAllByRole('term').length).toBeGreaterThanOrEqual(6);
    expect(document.querySelectorAll('.ar-section').length).toBeGreaterThanOrEqual(6);
    expect(document.querySelectorAll('.ar-donut-slice').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.ar-line').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.ar-ranked-row').length).toBeGreaterThan(0);
  });

  it('shows finance totals and no member sections to the Finance Team', async () => {
    state.roleName = 'Finance Team';
    state.get.mockResolvedValue({ data: { data: financeOnlyFixture } });

    render(<AnalyticsReportPage />);

    expect(await screen.findByRole('heading', { name: 'Finance' })).toBeInTheDocument();
    expect(screen.getAllByText('Received income').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Net balance').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Member growth' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.ar-section[data-empty="true"]')).toHaveLength(0);
    expect(screen.queryByText(/non-deleted roster/i)).not.toBeInTheDocument();
    expect(screen.getByText(/applies to finance summaries/i)).toBeInTheDocument();
  });
});
