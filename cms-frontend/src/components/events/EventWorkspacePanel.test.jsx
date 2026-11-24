import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import EventWorkspacePanel from './EventWorkspacePanel';
import { ConfirmationProvider } from '../../context/ConfirmationContext';

vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({
      data: {
        data: {
          event: { id: 1, title: 'Youth Camp' },
          committees: [{ id: 1, name: 'Logistics', responsibilities: 'Setup' }],
          assignments: [],
          program: [{ id: 1, start_time: '09:00', title: 'Opening Praise', lead_person: 'Choir' }],
          budgets: [{ id: 2, title: 'Camp Budget', total_requested: 20000, total_approved: 20000, status: 'approved' }],
          cash_advances: [{ id: 3, recipient_name: 'Juan Dela Cruz', amount_released: 10000, release_date: '2026-10-10', status: 'released' }],
          liquidations: [{ id: 4, total_advanced: 10000, total_spent: 8500, amount_returned: 1500, amount_reimbursed: 0, status: 'submitted', items: [{ id: 1 }] }],
          inventory_requests: [],
          financial_summary: { approved_budget: 20000, cash_advanced: 10000, actual_posted_expenses: 0, variance: 20000, returned_cash: 0, reimbursement_due: 0 },
          checklist: [{ key: 'budget', label: 'Event budget approved', done: true }],
        },
      },
    })),
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock('../../hooks/useIsMobile', () => ({ default: () => false }));

describe('EventWorkspacePanel', () => {
  test('renders financial reconciliation strip and switches across workspace tabs', async () => {
    render(<ConfirmationProvider><EventWorkspacePanel eventId={1} /></ConfirmationProvider>);
    await waitFor(() => expect(screen.getByText('Opening Praise')).toBeInTheDocument());
    expect(screen.getByText('Logistics')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Budget & Advances/i }));
    expect(screen.getByText('Camp Budget')).toBeInTheDocument();
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Liquidation & Posting/i }));
    expect(screen.getByRole('button', { name: /Verify & Post to Finance/i })).toBeInTheDocument();
  });
});
