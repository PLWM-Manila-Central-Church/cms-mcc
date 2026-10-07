import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: api }));

import MemberQrPanel from './MemberQrPanel';

describe('MemberQrPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: { available: false } } });
    api.post.mockResolvedValue({ data: { data: { available: true, version: 1, issued_at: '2026-10-07T03:00:00.000Z' } } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:member-qr');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('does not call the QR API until the member opens My Attendance QR', async () => {
    render(<MemberQrPanel />);
    expect(api.get).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'My Attendance QR' }));
    expect(await screen.findByRole('button', { name: 'Create My QR' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/member-portal/attendance-qr');
  });

  it('issues one reusable QR and loads a downloadable image on demand', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/image.png')) return Promise.resolve({ data: new Blob(['png']) });
      return Promise.resolve({ data: { data: { available: false } } });
    });
    render(<MemberQrPanel language="tl" />);
    fireEvent.click(screen.getByRole('button', { name: 'Aking Attendance QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Gumawa ng QR' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/member-portal/attendance-qr', {}));
    expect(await screen.findByAltText('Your fixed member attendance QR code')).toHaveAttribute('src', 'blob:member-qr');
    expect(screen.getByRole('link', { name: 'I-download ang PNG' })).toHaveAttribute('download', 'mcc-member-qr.png');
    fireEvent.click(screen.getByRole('button', { name: 'Isara' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:member-qr');
  });
});
