import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinancePage from './FinancePage';

const { mockAxios } = vi.hoisted(() => ({
  mockAxios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../api/axiosInstance', () => ({ default: mockAxios }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true, user: { roleName: 'System Admin' } }),
}));
vi.mock('../../context/ConfirmationContext', () => ({
  useConfirmation: () => ({ confirm: vi.fn() }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('../../components/finance/FinanceAttachments', () => ({ default: () => null }));

const setViewportWidth = (width) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  window.dispatchEvent(new Event('resize'));
};

const renderPage = () => render(<MemoryRouter><FinancePage /></MemoryRouter>);

const summaryGrid = () => screen.getByText('Total Collected').parentElement.parentElement.parentElement;

describe('FinancePage responsive layout', () => {
  it('opens the giving shortcut as a named dialog and cancels without saving', async () => {
    render(<MemoryRouter initialEntries={['/finance?new=giving']}><FinancePage /></MemoryRouter>);
    expect(await screen.findByRole('dialog', { name: 'New Giving Record' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Income Category' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Amount (PHP)' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockAxios.post).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    setViewportWidth(390);
    mockAxios.get.mockImplementation(async (url) => {
      if (url === '/finance/categories') return { data: { data: [] } };
      if (url === '/finance/summary') return { data: { data: [] } };
      if (url.startsWith('/finance?')) return { data: { data: { records: [], total: 0 } } };
      if (url === '/finance/records') return { data: { data: { records: [], total_pages: 1 } } };
      if (url === '/finance/expenses') return { data: { data: { expenses: [], total_pages: 1 } } };
      if (url.startsWith('/finance/members/search')) return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });
  });

  it('previews a church-branded finance statement and opens the print flow', async () => {
    mockAxios.get.mockImplementation(async (url) => {
      if (url === '/finance/categories') return { data: { data: [] } };
      if (url === '/finance/summary') return { data: { data: [] } };
      if (url.startsWith('/finance?')) return { data: { data: { records: [], total: 0 } } };
      if (url === '/finance/records') return { data: { data: { records: [
        { id: 10, transaction_date: '2026-10-20', amount: '500.00', category: { name: 'Tithes' }, Member: { last_name: 'Sarmiento', first_name: 'Christian' }, payment_method: 'cash', receipt_number: 'R-10' },
      ], total_pages: 1 } } };
      if (url === '/finance/expenses') return { data: { data: { expenses: [
        { id: 4, date: '2026-10-21', amount: '75.00', category: { category_name: 'Utilities' }, paymentMethod: { method_name: 'Cash' }, description: 'Water bill' },
      ], total_pages: 1 } } };
      throw new Error(`Unexpected GET ${url}`);
    });
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});

    renderPage();
    await screen.findByText('No records found.');
    fireEvent.click(screen.getByRole('button', { name: 'Finance Statement' }));

    const dialog = await screen.findByRole('dialog', { name: 'Finance Statement of Account' });
    expect(dialog).toHaveTextContent('PLWM - MANILA CENTRAL CHURCH');
    expect(dialog).toHaveTextContent('CSV includes church and report labels. Print / Save PDF preserves the logo and color theme.');
    expect(dialog).toHaveTextContent('Sarmiento, Christian');
    expect(dialog).toHaveTextContent('Water bill');
    expect(dialog).toHaveTextContent('₱425.00');
    fireEvent.click(screen.getByRole('button', { name: 'Print / Save PDF' }));
    expect(print).toHaveBeenCalledOnce();
  });

  it('stacks summary cards and date fields at mobile widths', async () => {
    renderPage();
    await screen.findByText('No records found.');

    expect(summaryGrid()).toHaveStyle({ gridTemplateColumns: '1fr' });
    expect(screen.getByText('Date Range').parentElement).toHaveStyle({ display: 'grid' });
    expect(screen.getByLabelText('From')).toHaveStyle({ width: '100%' });
    expect(screen.getByLabelText('To')).toHaveStyle({ width: '100%' });
  });

  it('lets summary columns fit available desktop space and keeps inline date filters', async () => {
    setViewportWidth(1280);
    renderPage();
    await screen.findByText('No records found.');

    expect(summaryGrid()).toHaveStyle({ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' });
    expect(screen.getByText('Date Range').parentElement).toHaveStyle({ display: 'flex' });
  });
});
