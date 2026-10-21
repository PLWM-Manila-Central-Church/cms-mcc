import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationProvider } from '../../context/ConfirmationContext';

const fixture = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  user: { roleName: 'Registration Team' },
  permissions: new Set(),
}));

vi.mock('../../api/axiosInstance', () => ({ default: { get: fixture.get, post: vi.fn(), patch: fixture.patch, delete: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: fixture.user,
    activeLeaderScopeKey: null,
    hasPermission: (moduleName, action) => fixture.permissions.has(`${moduleName}:${action}`),
  }),
}));

import AttendancePage from './AttendancePage';

const service = {
  id: 44330002,
  title: 'QA service',
  service_date: '2026-10-11',
  service_time: '10:00:00',
  status: 'published',
  capacity: 4,
};

const preregRecord = (id) => ({
  id,
  service_id: service.id,
  member_id: 100 + id,
  check_in_method: 'pre-reg',
  checked_in_at: null,
  is_pre_reg: true,
  is_voided: false,
  entry_source: 'legacy',
  Member: { first_name: 'QA', last_name: `Member ${id}`, barcode: null },
});

function renderPage(records) {
  fixture.get.mockResolvedValue({ data: { data: { service, records, summary: {} } } });
  return render(
    <ConfirmationProvider>
      <MemoryRouter initialEntries={[`/services/${service.id}/attendance`]}>
        <Routes>
          <Route path="/services/:id/attendance" element={<AttendancePage />} />
        </Routes>
      </MemoryRouter>
    </ConfirmationProvider>,
  );
}

describe('service attendance check-in counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.permissions = new Set();
  });

  it('does not count RSVP-only pre-registration rows as checked in', async () => {
    renderPage([preregRecord(1), preregRecord(2), preregRecord(3)]);

    expect(await screen.findByText('0 checked in')).toBeInTheDocument();
    expect(screen.getByText('Pre-registered')).toBeInTheDocument();
    expect(screen.getAllByText('Pre-registered — not yet checked in')).toHaveLength(3);
    expect(screen.queryByText('3 checked in')).not.toBeInTheDocument();
  });

  it('counts only active physical check-ins and excludes voided rows', async () => {
    renderPage([
      preregRecord(1),
      { ...preregRecord(2), is_pre_reg: false, check_in_method: 'barcode', checked_in_at: '2026-10-11T02:00:00.000Z' },
      { ...preregRecord(3), is_pre_reg: false, is_voided: true, check_in_method: 'manual', checked_in_at: '2026-10-11T02:05:00.000Z' },
    ]);

    expect(await screen.findByText('1 checked in')).toBeInTheDocument();
    expect(screen.queryByText('3 checked in')).not.toBeInTheDocument();
  });

  it('archives a legacy check-in through the reversible correction route', async () => {
    fixture.permissions = new Set(['attendance:delete']);
    fixture.patch.mockResolvedValue({ data: { success: true } });
    const memberId = 155;
    renderPage([{
      id: 55,
      service_id: service.id,
      member_id: memberId,
      check_in_method: 'manual',
      checked_in_at: '2026-10-11T02:05:00.000Z',
      is_pre_reg: false,
      is_voided: false,
      entry_source: 'legacy',
      Member: { first_name: 'QA', last_name: `Member ${memberId}`, barcode: null },
    }]);

    fireEvent.click(await screen.findByRole('button', { name: `Archive check-in for QA Member ${memberId}` }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Archive check-in?');
    fireEvent.click(screen.getByRole('button', { name: 'Archive check-in', exact: true }));

    await waitFor(() => expect(fixture.patch).toHaveBeenCalledWith(
      `/services/${service.id}/attendance/${memberId}/archive`,
      { reason: 'Legacy check-in corrected by staff' },
    ));
  });
});
