import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import InventoryOperationsPanel from './InventoryOperationsPanel';

vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/inventory/transactions') return Promise.resolve({ data: { data: [{ id: 1, occurred_at: '2026-11-20', item: { name: 'Shure Mic' }, transaction_type: 'adjustment', quantity_delta: 2, balance_after: 6, notes: 'Restock' }] } });
      if (url === '/inventory/borrowings') return Promise.resolve({ data: { data: [{ id: 1, item: { name: 'Shure Mic' }, borrower_name: 'Youth Camp', quantity: 2, quantity_returned: 0, due_return_date: '2026-11-30', status: 'borrowed', effective_status: 'borrowed', is_overdue: false }] } });
      if (url === '/inventory/maintenance') return Promise.resolve({ data: { data: [{ id: 1, maintenance_date: '2026-11-18', item: { name: 'Sound Mixer' }, maintenance_type: 'repair', vendor: 'ProAudio', cost: 2500, status: 'in_progress' }] } });
      if (url === '/inventory/reports/extended') return Promise.resolve({ data: { data: { summary: { reusable_assets: 10, consumables: 5, total_valuation_php: 150000, active_borrowings: 1, overdue_borrowings: 0, under_repair: 1 }, by_location: [{ location: 'Sanctuary', count: 15 }] } } });
      return Promise.resolve({ data: { data: [] } });
    }),
  },
}));

describe('InventoryOperationsPanel', () => {
  test('renders stock ledger, borrowing and maintenance tabs cleanly', async () => {
    render(<InventoryOperationsPanel items={[{ id: 1, name: 'Shure Mic', quantity: 6 }]} canManage />);
    await waitFor(() => expect(screen.getByText('Restock')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Borrowing/i }));
    expect(screen.getByText('Youth Camp')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Maintenance/i }));
    expect(screen.getByText('Sound Mixer')).toBeInTheDocument();
  });
});
