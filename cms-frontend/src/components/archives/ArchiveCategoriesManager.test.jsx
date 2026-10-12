import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '../../api/axiosInstance';
import ArchiveCategoriesManager from './ArchiveCategoriesManager';

const { mobileState } = vi.hoisted(() => ({ mobileState: { value: false } }));

vi.mock('../../api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../hooks/useIsMobile', () => ({ default: () => mobileState.value }));

describe('ArchiveCategoriesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobileState.value = false;
  });

  it('stacks the category editor on mobile and keeps the dialog within the viewport', () => {
    mobileState.value = true;
    render(<ArchiveCategoriesManager categories={[]} canManage canDelete />);

    fireEvent.click(screen.getByRole('button', { name: 'Manage categories' }));
    const dialog = screen.getByRole('dialog', { name: 'Archive categories' });
    const form = dialog.querySelector('form');

    expect(form).toHaveStyle({ gridTemplateColumns: 'minmax(0,1fr)' });
    expect(dialog).toHaveStyle({ boxSizing: 'border-box', overflowX: 'hidden' });
  });

  it('preserves the multi-column category editor on desktop', () => {
    render(<ArchiveCategoriesManager categories={[]} canManage canDelete />);

    fireEvent.click(screen.getByRole('button', { name: 'Manage categories' }));
    const form = screen.getByRole('dialog', { name: 'Archive categories' }).querySelector('form');

    expect(form).toHaveStyle({ gridTemplateColumns: 'minmax(180px,1fr) minmax(220px,2fr) auto' });
  });

  it('creates a category and reloads the archive choices', async () => {
    axiosInstance.post.mockResolvedValue({ data: { success: true } });
    const onChanged = vi.fn();
    render(<ArchiveCategoriesManager categories={[]} canManage canDelete onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Manage categories' }));
    fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Mission Reports' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Reports for mission work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledWith('/archives/categories', {
      name: 'Mission Reports',
      description: 'Reports for mission work',
    }));
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Category created.');
  });

  it('keeps the Finance Team category name reserved while allowing its description to change', async () => {
    axiosInstance.put.mockResolvedValue({ data: { success: true } });
    render(<ArchiveCategoriesManager
      categories={[{ id: 4, name: 'Financial Records', description: 'Required category' }]}
      canManage
      canDelete
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Manage categories' }));
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const nameInput = screen.getByLabelText('Category name');
    expect(nameInput).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated finance documents' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(axiosInstance.put).toHaveBeenCalledWith('/archives/categories/4', {
      name: 'Financial Records',
      description: 'Updated finance documents',
    }));
  });

  it('shows server errors when a category is in use', async () => {
    axiosInstance.delete.mockRejectedValue({ response: { data: { message: 'Cannot delete. 2 records are using this category' } } });
    render(<ArchiveCategoriesManager categories={[{ id: 7, name: 'Meeting Minutes' }]} canManage canDelete />);

    fireEvent.click(screen.getByRole('button', { name: 'Manage categories' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Meeting Minutes');
    fireEvent.click(screen.getByRole('button', { name: 'Delete category' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot delete. 2 records are using this category');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('does not show category controls without archive update permission', () => {
    render(<ArchiveCategoriesManager categories={[]} canManage={false} canDelete={false} />);
    expect(screen.queryByRole('button', { name: 'Manage categories' })).not.toBeInTheDocument();
  });
});
