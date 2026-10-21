import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ArchivesPage from './ArchivesPage';

const state = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), archived: false }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get, patch: state.patch } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, roleName: 'System Admin' }, hasPermission: () => true }) }));
vi.mock('../../context/ConfirmationContext', () => ({ useConfirmation: () => ({ confirm: vi.fn(async () => true) }) }));
vi.mock('../../hooks/useIsMobile', () => ({ default: () => false }));
vi.mock('../../components/archives/ArchiveCategoriesManager', () => ({ default: () => null }));

const record = {
  id: 90,
  title: 'Retained archive record',
  status: 'approved',
  is_deleted: 1,
  visibility: 'public',
  file_type: 'pdf',
  document_date: '2026-10-10',
  category: { id: 2, name: 'Church Records' },
  uploadedByUser: { email: 'admin@plwmmcc.com' },
};

describe('ArchivesPage archive lifecycle controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.archived = true;
    state.get.mockImplementation(async (url) => {
      if (url === '/archives/categories') return { data: { data: [] } };
      const isArchivedView = String(url).includes('archived=true');
      const rows = isArchivedView === state.archived ? [{ ...record, is_deleted: Number(state.archived) }] : [];
      return { data: { data: { records: rows, total: rows.length, total_pages: 1 } } };
    });
    state.patch.mockImplementation(async (url) => {
      if (url.endsWith('/restore')) state.archived = false;
      return { data: { success: true } };
    });
  });

  it('exposes accessible names for upload form fields', async () => {
    render(<ArchivesPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Upload' }));
    expect(screen.getByRole('textbox', { name: 'Title *' })).toBeRequired();
    expect(screen.getByRole('combobox', { name: 'Category *' })).toBeRequired();
    expect(screen.getByLabelText('Document Date')).toHaveAttribute('type', 'date');
    expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByLabelText('File *')).toHaveAttribute('type', 'file');
  });

  it('shows retained records in Archived and restores them back to Active', async () => {
    render(<ArchivesPage />);
    expect(await screen.findByText('0 active document records')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
    expect(await screen.findByText('Retained archive record')).toBeInTheDocument();
    expect(screen.getByText('Archived', { selector: 'span' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(state.patch).toHaveBeenCalledWith('/archives/90/restore'));
    expect(await screen.findByText('Retained archive record')).toBeInTheDocument();
    expect(screen.getByText('1 active document records')).toBeInTheDocument();
  });
});
