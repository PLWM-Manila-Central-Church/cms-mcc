import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import FinanceFundsAccountsPage from './FinanceFundsAccountsPage';
import FinanceApprovalsPage from './FinanceApprovalsPage';
import FinanceReportsLedgerPage from './FinanceReportsLedgerPage';

vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/finance/funds/balances') return Promise.resolve({ data: { data: [{ id: 1, name: 'General Fund', fund_code: 'GEN', is_restricted: 0, current_balance: 85000 }] } });
      if (url === '/finance/accounts/balances') return Promise.resolve({ data: { data: [{ id: 1, name: 'BPI Main Bank', account_type: 'bank', current_balance: 85000 }] } });
      if (url === '/finance/transfers') return Promise.resolve({ data: { data: [] } });
      if (url === '/finance/expenses/workflow') return Promise.resolve({ data: { data: [{ id: 10, transaction_number: 'EXP-202610-1001', date: '2026-10-12', payee: 'Meralco', description: 'Electricity', amount: 12400, status: 'pending_approval', category: { category_name: 'Utilities' } }] } });
      if (url === '/finance/expense-categories') return Promise.resolve({ data: { data: [{ id: 1, category_name: 'Utilities' }] } });
      if (url === '/finance/payment-methods') return Promise.resolve({ data: { data: [{ id: 1, method_name: 'Bank Transfer' }] } });
      if (url === '/finance/reports/statement') return Promise.resolve({ data: { data: { from: '2026-10-01', to: '2026-10-31', beginning_balance: 50000, total_income: 40000, total_expenses: 15000, ending_balance: 75000, internal_transfers_excluded: 5000 } } });
      if (url === '/finance/reports/expenses') return Promise.resolve({ data: { data: { report_type: 'monthly_category', grand_total: 15000, rows: [{ category: 'Utilities', count: 2, total: 15000 }] } } });
      if (url === '/finance/ledger') return Promise.resolve({ data: { data: [{ entry_type: 'income', id: 1, transaction_number: 'INC-202610-001', date: '2026-10-05', category: 'Tithes', description: 'Sunday Offering', amount: 40000, status: 'posted' }] } });
      return Promise.resolve({ data: { data: [] } });
    }),
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: 'Finance Team' }, hasPermission: () => true }) }));
vi.mock('../../hooks/useIsMobile', () => ({ default: () => false }));

describe('Phase 3 Finance Upgrade Pages', () => {
  test('FinanceFundsAccountsPage renders funds and accounts balances', async () => {
    render(<MemoryRouter initialEntries={['/finance/funds']}><FinanceFundsAccountsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText('General Fund').length).toBeGreaterThan(0));
    expect(screen.getAllByText('BPI Main Bank').length).toBeGreaterThan(0);
  });

  test('FinanceApprovalsPage renders pending expense approval queue with actions', async () => {
    render(<MemoryRouter initialEntries={['/finance/approvals']}><FinanceApprovalsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Meralco')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  test('FinanceReportsLedgerPage renders consolidated statement and 5 report buttons', async () => {
    render(<MemoryRouter initialEntries={['/finance/reports']}><FinanceReportsLedgerPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Consolidated Financial Statement/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Expenses by Ministry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expenses by Event' })).toBeInTheDocument();
  });
});
