import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExpensesPage from './ExpensesPage';

const { mockAxios, permissionState } = vi.hoisted(() => ({
  mockAxios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  permissionState: { canDelete: true },
}));

vi.mock('../../api/axiosInstance', () => ({ default: mockAxios }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (_module, action) => (action === 'delete' ? permissionState.canDelete : true) }),
}));

const fixtureExpense = {
  id: 901,
  account_id: 1,
  category_id: 1,
  date: '2026-10-10',
  amount: '15.78',
  description: 'QA expense delete flow',
  payment_method_id: 1,
  account: { id: 1, name: 'QA Account' },
  category: { id: 1, category_name: 'QA Category', account_id: 1 },
  paymentMethod: { id: 1, method_name: 'Cash' },
};

let isDeleted = false;

const renderPage = () => render(<MemoryRouter><ExpensesPage /></MemoryRouter>);

describe('ExpensesPage deletion flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDeleted = false;
    permissionState.canDelete = true;
    mockAxios.get.mockImplementation(async (url) => {
      if (url === '/finance/funds') return { data: { data: [{ id: 10, name: 'QA Fund' }] } };
      if (url === '/finance/accounts') return { data: { data: [fixtureExpense.account] } };
      if (url === '/finance/expense-categories') return { data: { data: [fixtureExpense.category] } };
      if (url === '/finance/payment-methods') return { data: { data: [fixtureExpense.paymentMethod] } };
      if (url.startsWith('/finance/expenses?')) {
        return { data: { data: { expenses: isDeleted ? [] : [fixtureExpense], total: isDeleted ? 0 : 1 } } };
      }
      if (url === '/finance/balance') {
        return { data: { data: { total_income: 0, total_expense: isDeleted ? 0 : 15.78, net_balance: isDeleted ? 0 : -15.78 } } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    mockAxios.delete.mockImplementation(async () => {
      isDeleted = true;
      return { data: { success: true } };
    });
  });

  it('offers a role-scoped, keyboard-cancelable accessible confirmation', async () => {
    renderPage();
    await screen.findByText('QA expense delete flow');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete expense?' });
    expect(dialog).toHaveTextContent('PHP 15.78');
    expect(mockAxios.delete).not.toHaveBeenCalled();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    expect(screen.getByText('QA expense delete flow')).toBeInTheDocument();
    expect(mockAxios.delete).not.toHaveBeenCalled();
  });

  it('deletes only after the Admin confirms in the dialog', async () => {
    renderPage();
    await screen.findByText('QA expense delete flow');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete expense' }));

    await waitFor(() => expect(mockAxios.delete).toHaveBeenCalledWith('/finance/expenses/901'));
    expect(await screen.findByRole('status')).toHaveTextContent('Expense deleted.');
    expect(screen.queryByText('QA expense delete flow')).not.toBeInTheDocument();
  });

  it('does not expose Delete to a role without finance:delete', async () => {
    permissionState.canDelete = false;
    renderPage();
    await screen.findByText('QA expense delete flow');
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('rejects a reversed date range without issuing filter requests', async () => {
    renderPage();
    await screen.findByText('QA expense delete flow');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-12' } });
    await waitFor(() => expect(screen.getByLabelText('To')).toHaveAttribute('min', '2026-10-12'));
    await waitFor(() => expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('date_from=2026-10-12')));
    const requestCount = mockAxios.get.mock.calls.length;

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-10' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Start date must be on or before end date.');
    expect(screen.queryByText('QA expense delete flow')).not.toBeInTheDocument();
    expect(mockAxios.get).toHaveBeenCalledTimes(requestCount);
  });

  it('removes account choice from expense entry and sends only the category selection', async () => {
    mockAxios.post.mockResolvedValue({ data: { success: true } });
    renderPage();
    await screen.findByText('QA expense delete flow');

    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    const dialog = screen.getByRole('dialog', { name: 'Add expense' });
    expect(within(dialog).queryByLabelText('Account')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Select a category to see its account')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Expense category'), { target: { value: '1' } });
    expect(within(dialog).getByText('QA Account')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Amount (PHP)'), { target: { value: '22.5' } });
    fireEvent.change(within(dialog).getByLabelText('Payment method'), { target: { value: '1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save expense' }));

    await waitFor(() => expect(mockAxios.post).toHaveBeenCalledWith('/finance/expenses', {
      category_id: 1,
      date: expect.any(String),
      amount: 22.5,
      description: null,
      payment_method_id: 1,
    }));
    expect(mockAxios.post.mock.calls[0][1]).not.toHaveProperty('account_id');
  });

  it('guides the user to Finance setup when no expense categories exist', async () => {
    mockAxios.get.mockImplementation(async (url) => {
      if (url === '/finance/expense-categories') return { data: { data: [] } };
      if (url === '/finance/balance') return { data: { data: { total_income: 0, total_expense: 0, net_balance: 0 } } };
      if (url.startsWith('/finance/expenses?')) return { data: { data: { expenses: [], total: 0 } } };
      return { data: { data: [] } };
    });
    renderPage();
    const addExpense = await screen.findByRole('button', { name: 'Add expense' });
    expect(addExpense).toBeDisabled();
    expect(addExpense).toHaveStyle({ opacity: '0.5', cursor: 'not-allowed' });
    expect(addExpense).toHaveAttribute('aria-describedby', 'expense-setup-required');
    expect(screen.getByRole('note')).toHaveTextContent('Set up a fund, account, and expense category in Finance setup');
    fireEvent.click(addExpense);
    expect(screen.queryByRole('dialog', { name: 'Add expense' })).not.toBeInTheDocument();
    expect(mockAxios.post).not.toHaveBeenCalled();
  });
});
