import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinancePage from './FinancePage';

const { mockAxios } = vi.hoisted(() => ({
  mockAxios: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
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
  beforeEach(() => {
    vi.clearAllMocks();
    setViewportWidth(390);
    mockAxios.get.mockImplementation(async (url) => {
      if (url === '/finance/categories') return { data: { data: [] } };
      if (url === '/finance/summary') return { data: { data: [] } };
      if (url.startsWith('/finance?')) return { data: { data: { records: [], total: 0 } } };
      if (url.startsWith('/finance/members/search')) return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });
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
