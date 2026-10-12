import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SubstituteReviewQueue from './SubstituteReviewQueue';

const { mockAxios, authState, mockConfirm } = vi.hoisted(() => ({
  mockAxios: { get: vi.fn(), put: vi.fn() },
  authState: { canUpdate: true },
  mockConfirm: vi.fn(),
}));

vi.mock('../../api/axiosInstance', () => ({ default: mockAxios }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (_module, action) => action !== 'update' || authState.canUpdate }),
}));
vi.mock('../../context/ConfirmationContext', () => ({
  useConfirmation: () => ({ confirm: mockConfirm }),
}));

const pendingRequest = {
  id: 41,
  status: 'pending',
  requested_by: 17,
  reason: 'I cannot attend this service.',
  assignment: { service_id: 8, Service: { title: 'Sunday Worship' } },
  requestedByUser: { email: 'member@example.test', member: { first_name: 'Jamie', last_name: 'Member' } },
  proposedSubstituteUser: { member: { first_name: 'Alex', last_name: 'Helper' } },
  proposed_substitute: 22,
};

let resolvedStatus = null;

describe('SubstituteReviewQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.canUpdate = true;
    resolvedStatus = null;
    mockConfirm.mockResolvedValue(true);
    mockAxios.get.mockImplementation(async () => ({
      data: { data: [{ ...pendingRequest, status: resolvedStatus || 'pending' }] },
    }));
    mockAxios.put.mockImplementation(async (_url, payload) => {
      resolvedStatus = payload.status;
      return { data: { success: true } };
    });
  });

  it('shows scoped request details and asks for confirmation before approval', async () => {
    render(<SubstituteReviewQueue />);

    expect(await screen.findByText('Sunday Worship')).toBeInTheDocument();
    expect(screen.getByText('Jamie Member')).toBeInTheDocument();
    expect(screen.getByText('Alex Helper')).toBeInTheDocument();
    expect(screen.getByText('I cannot attend this service.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve substitute request for Sunday Worship' }));

    await waitFor(() => expect(mockAxios.put).toHaveBeenCalledWith('/services/substitutes/41/resolve', { status: 'approved' }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Approve substitute request?',
      confirmLabel: 'Approve request',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Substitute request approved.');
    expect(await screen.findByText('approved')).toBeInTheDocument();
  });

  it('does not resolve a request when the reviewer cancels', async () => {
    mockConfirm.mockResolvedValue(false);
    render(<SubstituteReviewQueue />);
    await screen.findByText('Sunday Worship');

    fireEvent.click(screen.getByRole('button', { name: 'Reject substitute request for Sunday Worship' }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockAxios.put).not.toHaveBeenCalled();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('does not load or expose the review queue without ministry:update', () => {
    authState.canUpdate = false;
    render(<SubstituteReviewQueue />);

    expect(screen.queryByRole('region', { name: 'Substitute request review' })).not.toBeInTheDocument();
    expect(mockAxios.get).not.toHaveBeenCalled();
  });
});
