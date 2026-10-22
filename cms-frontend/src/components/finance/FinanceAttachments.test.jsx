import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '../../api/axiosInstance';
import FinanceAttachments from './FinanceAttachments';

vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    getUri: vi.fn(({ url }) => `/api${url}`),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FinanceAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosInstance.getUri.mockImplementation(({ url }) => `/api${url}`);
  });

  it('uploads allowed receipts against the selected income and refreshes the row', async () => {
    axiosInstance.post.mockResolvedValue({ data: { success: true } });
    const onChanged = vi.fn();
    render(<FinanceAttachments targetType="income" targetId={42} canUpload onChanged={onChanged} />);

    const file = new File(['receipt'], 'giving.pdf', { type: 'application/pdf' });
    const image = new File(['image'], 'receipt.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Add receipt to financial record 42'), { target: { files: [file, image] } });

    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledTimes(2));
    const [path, body, config] = axiosInstance.post.mock.calls[0];
    expect(path).toBe('/finance/attachments/upload');
    expect(body.get('income_id')).toBe('42');
    expect(body.get('expense_id')).toBeNull();
    expect(body.get('file').name).toBe('giving.pdf');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(axiosInstance.post.mock.calls[1][1].get('file').name).toBe('receipt.jpg');
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent('2 receipts uploaded.');
  });

  it('uploads expense receipts against the expense record', async () => {
    axiosInstance.post.mockResolvedValue({ data: { success: true } });
    const onChanged = vi.fn();
    render(<FinanceAttachments targetType="expense" targetId={61} canUpload onChanged={onChanged} />);

    const receipt = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Add receipt to financial record 61'), { target: { files: [receipt] } });

    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledTimes(1));
    const body = axiosInstance.post.mock.calls[0][1];
    expect(body.get('expense_id')).toBe('61');
    expect(body.get('income_id')).toBeNull();
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it('rejects unsupported file types before sending them', async () => {
    axiosInstance.post.mockResolvedValue({ data: { success: true } });
    render(<FinanceAttachments targetType="income" targetId={13} canUpload />);

    const file = new File(['script'], 'receipt.html', { type: 'text/html' });
    fireEvent.change(screen.getByLabelText('Add receipt to financial record 13'), { target: { files: [file] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a PDF, JPG, PNG, or WebP file.');
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it('uses a native authenticated download link for a same-origin attachment route', () => {
    render(<FinanceAttachments attachments={[{ id: 8, file_name: 'giving receipt.pdf' }]} />);

    const link = screen.getByRole('link', { name: 'Download giving receipt.pdf' });
    expect(link).toHaveAttribute('href', new URL('/api/finance/attachments/8/download', window.location.origin).href);
    expect(link).toHaveAttribute('download', 'giving receipt.pdf');
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });

  it('keeps the authenticated Blob fallback when the configured API is cross-origin', async () => {
    axiosInstance.getUri.mockReturnValue('https://api.example.test/api/finance/attachments/8/download');
    axiosInstance.get.mockResolvedValue({ data: new Blob(['receipt'], { type: 'application/pdf' }) });
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:receipt') });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<FinanceAttachments attachments={[{ id: 8, file_name: 'giving receipt.pdf' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download giving receipt.pdf' }));

    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledWith(
      '/finance/attachments/8/download',
      { responseType: 'blob' },
    ));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('archives a receipt in an accessible dialog and refreshes the row', async () => {
    axiosInstance.patch.mockResolvedValue({ data: { success: true } });
    const onChanged = vi.fn();
    render(<FinanceAttachments
      attachments={[{ id: 8, file_name: 'giving receipt.pdf' }]}
      canArchive
      onChanged={onChanged}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Archive giving receipt.pdf' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('giving receipt.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Archive receipt' }));

    await waitFor(() => expect(axiosInstance.patch).toHaveBeenCalledWith('/finance/attachments/8/archive'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('does not expose upload or removal controls in a member read-only view', () => {
    render(<FinanceAttachments attachments={[{ id: 8, file_name: 'giving receipt.pdf' }]} />);

    expect(screen.queryByRole('button', { name: 'Add receipt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive giving receipt.pdf' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download giving receipt.pdf' })).toBeInTheDocument();
  });
});
