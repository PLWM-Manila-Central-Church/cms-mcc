import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn(), applied: false }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: fixture.get, post: fixture.post, delete: fixture.delete, patch: fixture.patch } }));

import { MemberMinistryApplications, MinistryApplicationQueue } from './MinistryApplications';

const application = {
  id: 12,
  status: 'pending',
  created_at: '2026-10-01T00:00:00.000Z',
  message: 'I can serve on weekends.',
  member: { first_name: 'Lester', last_name: 'Member' },
  ministryRole: { id: 4, name: 'Music' },
};

describe('ministry application user flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.applied = false;
  });

  it('lets a member submit an application and then shows its pending status', async () => {
    fixture.get.mockImplementation(async (url) => {
      if (url === '/ministry-applications/opportunities') {
        return { data: { data: [{ id: 4, name: 'Music', is_member: false, application: fixture.applied ? { id: 12, status: 'pending' } : null }] } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    fixture.post.mockImplementation(async (_url, payload) => {
      fixture.applied = true;
      expect(payload.ministry_role_id).toBe(4);
      return { data: { success: true } };
    });
    const showToast = vi.fn();

    render(<MemberMinistryApplications c={{ border: '#ddd', surface: '#fff', t1: '#111' }} showToast={showToast} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(fixture.post).toHaveBeenCalledWith('/ministry-applications', expect.objectContaining({ ministry_role_id: 4 })));
    expect(await screen.findByText('pending')).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith('Your ministry application was submitted.');
  });

  it('requires a rejection reason and sends a reviewer decision', async () => {
    fixture.get.mockResolvedValue({ data: { data: { applications: [application], total: 1 } } });
    fixture.patch.mockResolvedValue({ data: { success: true } });
    render(<MinistryApplicationQueue />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    expect(fixture.patch).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('at least five characters');

    fireEvent.change(screen.getByRole('textbox', { name: 'Rejection reason for Lester' }), { target: { value: 'Schedule does not match this season.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(fixture.patch).toHaveBeenCalledWith('/ministry-applications/12/review', expect.objectContaining({ status: 'rejected' })));
  });
});
