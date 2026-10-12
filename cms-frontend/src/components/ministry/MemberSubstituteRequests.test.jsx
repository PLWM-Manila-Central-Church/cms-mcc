import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MemberSubstituteRequests from './MemberSubstituteRequests';

const { mockAxios } = vi.hoisted(() => ({
  mockAxios: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../../api/axiosInstance', () => ({ default: mockAxios }));

const service = { id: 9, title: 'Sunday Service', service_date: '2026-10-11', status: 'published' };
const replacement = { id: 21, first_name: 'Alex', last_name: 'Helper' };
let requestRows;

describe('MemberSubstituteRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestRows = [];
    mockAxios.get.mockImplementation(async (url) => {
      if (url === '/services/substitutes/mine') return { data: { data: requestRows } };
      if (url === '/services/substitutes/eligible-services') return { data: { data: [service] } };
      if (url === '/services/substitutes/replacements') return { data: { data: [replacement] } };
      throw new Error(`Unexpected Member API request: ${url}`);
    });
    mockAxios.post.mockImplementation(async (_url, payload) => {
      requestRows = [{
        id: 31,
        status: 'pending',
        reason: payload.reason,
        createdAt: '2026-10-10T08:00:00.000Z',
        assignment: { service_id: service.id, Service: { title: service.title } },
        proposedSubstituteUser: payload.proposed_member_id ? { member: replacement } : null,
      }];
      return { data: { success: true } };
    });
  });

  it('loads the member’s assigned services and request history without broad member lookup', async () => {
    render(<MemberSubstituteRequests />);

    expect(await screen.findByText('No substitute requests yet.')).toBeInTheDocument();
    expect(mockAxios.get).toHaveBeenCalledWith('/services/substitutes/mine');
    expect(mockAxios.get).toHaveBeenCalledWith('/services/substitutes/eligible-services');
    expect(mockAxios.get.mock.calls.some(([url]) => url === '/members')).toBe(false);
  });

  it('submits an assignment-scoped request with an optional roster replacement and shows its status', async () => {
    render(<MemberSubstituteRequests />);
    await screen.findByText('No substitute requests yet.');

    fireEvent.click(screen.getByRole('button', { name: 'New request' }));
    fireEvent.change(screen.getByLabelText(/Service/), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Family emergency' } });
    fireEvent.change(screen.getByLabelText(/Proposed replacement/), { target: { value: 'Alex' } });

    fireEvent.click(await screen.findByRole('option', { name: 'Helper, Alex' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => expect(mockAxios.post).toHaveBeenCalledWith('/services/substitutes', {
      service_id: 9,
      reason: 'Family emergency',
      proposed_member_id: 21,
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Substitute request submitted.');
    const requestRow = await screen.findByRole('row', { name: /Sunday Service/ });
    expect(requestRow).toHaveTextContent(/2026/);
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Helper, Alex')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh substitute requests' }));
    await waitFor(() => expect(screen.queryByText('Substitute request submitted. You can follow its status below.')).not.toBeInTheDocument());
  });

  it.each(['created_at', 'createdAt'])('renders submitted dates from the %s timestamp shape', async (timestampKey) => {
    requestRows = [{
      id: 44,
      status: 'rejected',
      reason: 'A previously submitted reason.',
      assignment: { service_id: service.id, Service: { title: service.title } },
      [timestampKey]: '2026-10-10T08:00:00.000Z',
    }];

    render(<MemberSubstituteRequests />);

    const row = await screen.findByRole('row', { name: /Sunday Service/ });
    expect(row).toHaveTextContent(/2026/);
    expect(row).not.toHaveTextContent('—');
  });

  it('shows a retryable load error and recovers on refresh', async () => {
    mockAxios.get.mockRejectedValueOnce(new Error('temporary error'));
    render(<MemberSubstituteRequests />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your substitute requests. Try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No substitute requests yet.')).toBeInTheDocument();
  });
});
