import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import OrgGroupsPage from './OrgGroupsPage';

vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/groups') {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, name: 'Choir & Music Team', code: 'CHOIR', category: 'Worship & Music', member_count: 12, position_count: 3, open_task_count: 1 },
            ],
          },
        });
      }
      if (url === '/groups/1') {
        return Promise.resolve({
          data: {
            data: {
              id: 1, name: 'Choir & Music Team', code: 'CHOIR', category: 'Worship & Music',
              positions: [{ id: 5, name: 'Soprano' }],
              member_positions: [{ id: 1, member: { id: 11, first_name: 'Ana', last_name: 'Cruz', status: 'Active' }, position: { id: 5, name: 'Soprano' } }],
              roster: [],
              activities: [{ id: 2, title: 'Saturday Rehearsal', activity_date: '2026-10-17', start_time: '14:00', location: 'Sanctuary' }],
              tasks: [{ id: 3, title: 'Print hymn sheets', status: 'pending', due_date: '2026-10-16' }],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: { members: [] } } });
    }),
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: 'System Admin' }, hasPermission: () => true }) }));
vi.mock('../../hooks/useIsMobile', () => ({ default: () => false }));

describe('OrgGroupsPage', () => {
  test('renders serving groups workspace with positions, roster, and tasks tab', async () => {
    render(<MemoryRouter><OrgGroupsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Cruz, Ana')).toBeInTheDocument());
    expect(screen.getAllByText('Soprano').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: /Tasks/i }));
    await waitFor(() => expect(screen.getByText('Print hymn sheets')).toBeInTheDocument());
  });
});
