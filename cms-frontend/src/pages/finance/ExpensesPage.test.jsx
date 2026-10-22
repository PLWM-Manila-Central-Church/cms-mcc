import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExpensesPage from './ExpensesPage';

const { mockAxios, mockConfirm, mockInvalidate } = vi.hoisted(() => ({
  mockAxios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
  mockConfirm: vi.fn(),
  mockInvalidate: vi.fn(),
}));

vi.mock('../../api/axiosInstance', () => ({ default: mockAxios }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock('../../context/ConfirmationContext', () => ({ useConfirmation: () => ({ confirm: mockConfirm }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }));

const expense = {
  id: 12,
  category_id: 4,
  payment_method_id: 2,
  date: '2026-10-20',
  amount: '450.00',
  description: 'Water bill',
  category: { category_name: 'Utilities' },
  account: { name: 'Operating account' },
  paymentMethod: { method_name: 'Bank transfer' },
  attachments: [],
};

const renderPage = () => render(<MemoryRouter initialEntries={['/finance/expenses']}><ExpensesPage /></MemoryRouter>);

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
    mockAxios.get.mockImplementation(async (url) => {
      if (url.startsWith('/finance/expenses?')) return { data: { data: { expenses: [expense], total: 1, total_pages: 1 } } };
      if (url === '/finance/expense-categories') return { data: { data: [{ id: 4, category_name: 'Utilities', account_id: 9, account: { id: 9, name: 'Operating account' } }] } };
      if (url === '/finance/payment-methods') return { data: { data: [{ id: 2, method_name: 'Bank transfer' }] } };
      if (url.startsWith('/finance/balance')) return { data: { data: { total_income: 1200, total_expense: 450, net_balance: 750 } } };
      throw new Error(`Unexpected GET ${url}`);
    });
  });

  it('records an expense by category without asking the user to choose an account', async () => {
    mockAxios.post.mockResolvedValue({ data: { success: true, data: expense } });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '+ Add expense' }));
    expect(await screen.findByRole('dialog', { name: 'Add expense' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Expense category'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Amount (PHP)'), { target: { value: '125.50' } });
    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Electricity bill' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record expense' }));

    await waitFor(() => expect(mockAxios.post).toHaveBeenCalledWith('/finance/expenses', expect.objectContaining({
      category_id: 4,
      amount: 125.5,
      payment_method_id: 2,
      description: 'Electricity bill',
    })));
    expect(mockAxios.post.mock.calls[0][1]).not.toHaveProperty('account_id');
  });

  it('archives an expense through the reversible archive endpoint', async () => {
    mockAxios.patch.mockResolvedValue({ data: { success: true } });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(mockAxios.patch).toHaveBeenCalledWith('/finance/expenses/12/archive'));
    expect(mockAxios.delete).toBeUndefined();
  });

  it('creates expense categories without an account field', async () => {
    mockAxios.post.mockResolvedValue({ data: { success: true, data: { id: 5 } } });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Expense setup' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add', exact: true }));
    expect(await screen.findByRole('dialog', { name: 'Add expense category' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Transport' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));

    await waitFor(() => expect(mockAxios.post).toHaveBeenCalledWith('/finance/expense-categories', expect.objectContaining({
      category_name: 'Transport',
    })));
    expect(mockAxios.post.mock.calls[0][1]).not.toHaveProperty('account_id');
  });
});
