import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readerCreated: vi.fn(),
  decodeFromImageElement: vi.fn(),
  decodeFromVideoDevice: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: class {
    constructor() { mocks.readerCreated(); }
    decodeFromImageElement(...args) { return mocks.decodeFromImageElement(...args); }
    decodeFromVideoDevice(...args) { return mocks.decodeFromVideoDevice(...args); }
  },
}));

import QrScannerDialog from './QrScannerDialog';

function ScannerHarness({ onDecode, closeOnDecode = false }) {
  const [open, setOpen] = useState(true);
  const handleDecode = (text) => {
    onDecode(text);
    if (closeOnDecode) setOpen(false);
  };
  return open ? <QrScannerDialog onDecode={handleDecode} onClose={() => setOpen(false)} /> : <p>Scanner closed</p>;
}

describe('QrScannerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decodeFromVideoDevice.mockImplementation(async () => ({ stop: mocks.stop }));
    mocks.decodeFromImageElement.mockResolvedValue({ getText: () => 'MCC:MEMBER:1:123' });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qr-test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
    Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 32 });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { configurable: true, get: () => 32 });
  });

  it('does not initialize the camera or decoder until the operator starts scanning', () => {
    render(<QrScannerDialog onDecode={vi.fn()} onClose={vi.fn()} />);
    expect(mocks.readerCreated).not.toHaveBeenCalled();
    expect(mocks.decodeFromVideoDevice).not.toHaveBeenCalled();
  });

  it('decodes an uploaded image through the shared payload callback', async () => {
    const onDecode = vi.fn();
    render(<ScannerHarness onDecode={onDecode} closeOnDecode />);
    const file = new File(['test image bytes'], 'member.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/upload qr image/i), { target: { files: [file] } });

    await waitFor(() => expect(onDecode).toHaveBeenCalledWith('MCC:MEMBER:1:123'));
    expect(mocks.decodeFromImageElement).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Scanner closed')).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:qr-test');
  });

  it('rejects an oversized upload before asking the QR decoder to read it', async () => {
    render(<QrScannerDialog onDecode={vi.fn()} onClose={vi.fn()} />);
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/upload qr image/i), { target: { files: [file] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/smaller than 5 mib/i);
    expect(mocks.readerCreated).not.toHaveBeenCalled();
  });

  it('stops camera controls when the scanner closes', async () => {
    render(<ScannerHarness onDecode={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));
    await waitFor(() => expect(mocks.decodeFromVideoDevice).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /close scanner/i }));
    expect(await screen.findByText('Scanner closed')).toBeInTheDocument();
    expect(mocks.stop).toHaveBeenCalled();
  });
});
