import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import MinistriesHubPage from './MinistriesHubPage';

vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/ministries') {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, name: 'Young Adults', code: 'YA', age_min: 18, age_max: 29, status: 'Active', member_count: 10, active_member_count: 9, inactive_member_count: 1 },
            ],
          },
        });
      }
      if (url === '/ministries/1') {
        return Promise.resolve({
          data: {
            data: {
              id: 1, name: 'Young Adults', code: 'YA', age_min: 18, age_max: 29, status: 'Active',
              member_count: 1, active_member_count: 1,
              members: [{ id: 11, first_name: 'Maria', last_name: 'Santos', status: 'Active', phone: '09171234567', join_date: '2026-03-15' }],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: 'System Admin' }, hasPermission: () => true }) }));
vi.mock('../../context/ConfirmationContext', () => ({ useConfirmation: () => ({ confirm: vi.fn().mockResolvedValue(true) }) }));
vi.mock('../../hooks/useIsMobile', () => ({ default: () => false }));

describe('MinistriesHubPage', () => {
  test('renders life-stage ministries directory and member roster', async () => {
    render(<MemoryRouter><MinistriesHubPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Santos, Maria')).toBeInTheDocument());
    expect(screen.getAllByText('Young Adults').length).toBeGreaterThan(0);
    expect(screen.getByText('2026-03-15')).toBeInTheDocument();
  });
});
