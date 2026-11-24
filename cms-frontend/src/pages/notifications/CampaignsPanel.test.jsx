import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import api from '../../api/axiosInstance';
import CampaignsPanel from './CampaignsPanel';
import { ConfirmationProvider } from '../../context/ConfirmationContext';

const renderPanel = (props) => render(<ConfirmationProvider><CampaignsPanel {...props} /></ConfirmationProvider>);

vi.mock('../../api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const campaign = {
  id: 1, title: 'Christmas Eve reminder', audience_type: 'all_members',
  message: 'Hi {{first_name}}, join us at 7 PM. PLWM-MCC', status: 'pending_approval',
  scheduled_at: '2099-12-23T10:00:00Z', recipient_count: 2, estimated_cost_php: 0.93,
  approval_required: true, created_by: 2,
};
const caps = { campaigns: true, campaign_write: true, broadcast: true, approve: true };

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url) => {
    if (url === '/outreach/campaigns') return Promise.resolve({ data: { data: { items: [campaign], total: 1, page: 1, total_pages: 1 } } });
    if (url === '/outreach/campaigns/1') return Promise.resolve({ data: { data: { campaign, delivery_summary: {} } } });
    if (url === '/outreach/campaigns/1/deliveries') return Promise.resolve({ data: { data: { items: [] } } });
    if (url === '/outreach/campaigns/member-options') return Promise.resolve({ data: { data: { items: [{ id: 12, label: 'Alex Sample' }], total_pages: 1 } } });
    if (url === '/events') return Promise.resolve({ data: { data: { events: [{ id: 1, title: 'Community Gathering', start_date: '2099-10-18' }] } } });
    if (url === '/ministry/roles') return Promise.resolve({ data: { data: [{ id: 1, name: 'Choir' }] } });
    if (url === '/cellgroups') return Promise.resolve({ data: { data: { cellGroups: [{ id: 1, name: 'Sample Cell' }] } } });
    return Promise.resolve({ data: { data: [] } });
  });
  api.post.mockResolvedValue({ data: { data: { recipient_count: 2, total_segments: 2, segment_count: 1, estimated_cost_php: 0.93, monthly_remaining_php: 499, approval_required: true, excluded: {} } } });
});

describe('CampaignsPanel', () => {
  test('lists notifications and opens the composer', async () => {
    renderPanel({ user: { userId: 1, roleName: 'Registration Team' }, caps });
    expect(await screen.findByText('Christmas Eve reminder')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New notification' }));
    expect(await screen.findByRole('dialog', { name: 'New notification' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
  });

  test('preview shows eligible recipients and estimated cost', async () => {
    renderPanel({ user: { userId: 1, roleName: 'Registration Team' }, caps });
    await screen.findByText('Christmas Eve reminder');
    fireEvent.click(screen.getByRole('button', { name: 'New notification' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add Alex Sample' }));
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Church reminder' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview audience & cost' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/outreach/campaigns/preview', expect.objectContaining({
      audience_type: 'selected_members', member_ids: [12], timing_mode: 'send_now',
    })));
    expect(await screen.findByText(/2 eligible recipients/)).toBeInTheDocument();
    expect(screen.getByText(/estimated/)).toHaveTextContent('₱0.93');
  });

  test('Pastor can view campaigns without composing', async () => {
    renderPanel({ user: { roleName: 'Pastor' }, caps: { campaigns: true } });
    expect(await screen.findByText('Christmas Eve reminder')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New notification' })).not.toBeInTheDocument();
  });

  test('approval-only view filters to pending approval', async () => {
    renderPanel({ user: { userId: 1, roleName: 'Registration Team' }, caps, approvalsOnly: true });
    await screen.findByText('Christmas Eve reminder');
    expect(api.get).toHaveBeenCalledWith('/outreach/campaigns', expect.objectContaining({
      params: expect.objectContaining({ status: 'pending_approval' }),
    }));
  });
});

