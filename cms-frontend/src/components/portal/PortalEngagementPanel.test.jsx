import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import PortalEngagementPanel from './PortalEngagementPanel';

const mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({
      data: {
        data: {
          ministry: { id: 1, name: 'Young Adults' },
          activities: [{ id: 10, title: 'YA Fellowship', activity_date: '2026-11-29', location: 'Hall', my_response: 'no_response' }],
          announcements: [{ id: 1, title: 'Bring a friend', body: 'Arrive 15 minutes early.' }],
          messages: [{ id: 1, direction: 'leader_to_member', body: 'See you Sunday!' }],
          feedback: [],
        },
      },
    })),
    post: (...args) => mockPost(...args),
  },
}));

describe('PortalEngagementPanel', () => {
  test('renders calm member engagement and posts Yes RSVP cleanly', async () => {
    render(<PortalEngagementPanel />);
    await waitFor(() => expect(screen.getByText('YA Fellowship')).toBeInTheDocument());
    expect(screen.getByText('Bring a friend')).toBeInTheDocument();
    expect(screen.getByText('See you Sunday!')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'yes' }));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/member-portal/activities/10/rsvp', { response: 'yes', decline_reason: null }));
  });
});
