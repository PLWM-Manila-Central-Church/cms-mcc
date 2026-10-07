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
    constructor(hints) { mocks.readerCreated(hints); }
    decodeFromImageElement(...args) { return mocks.decodeFromImageElement(...args); }
    decodeFromVideoDevice(...args) { return mocks.decodeFromVideoDevice(...args); }
  },
}));

vi.mock('@zxing/library', () => ({
  BarcodeFormat: { QR_CODE: 'qr-code' },
  DecodeHintType: { POSSIBLE_FORMATS: 'possible-formats', TRY_HARDER: 'try-harder', PURE_BARCODE: 'pure-barcode' },
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

  it('starts the default camera without treating the click event as a device ID', async () => {
    render(<QrScannerDialog onDecode={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));

    await waitFor(() => expect(mocks.decodeFromVideoDevice).toHaveBeenCalledTimes(1));
    expect(mocks.decodeFromVideoDevice.mock.calls[0][0]).toBeUndefined();
    expect(await screen.findByText(/Camera is ready/i)).toBeInTheDocument();
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

  it('retries a decoder error with ZXing try-harder QR hints', async () => {
    const onDecode = vi.fn();
    mocks.decodeFromImageElement
      .mockRejectedValueOnce({ name: 'ChecksumException', message: 'QR checksum failed.' })
      .mockResolvedValueOnce({ getText: () => 'MCC:BATCH:1:123' });
    render(<QrScannerDialog onDecode={onDecode} onClose={vi.fn()} />);

    const file = new File(['test image bytes'], 'batch.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/upload qr image/i), { target: { files: [file] } });

    await waitFor(() => expect(onDecode).toHaveBeenCalledWith('MCC:BATCH:1:123'));
    expect(mocks.readerCreated).toHaveBeenCalledTimes(2);
    const retryHints = mocks.readerCreated.mock.calls[1][0];
    expect(retryHints.get('try-harder')).toBe(true);
    expect(retryHints.get('possible-formats')).toEqual(['qr-code']);
  });

  it('uses a pure-barcode fallback when ZXing cannot dimension a clean uploaded QR', async () => {
    const onDecode = vi.fn();
    mocks.decodeFromImageElement
      .mockRejectedValueOnce({ name: 'NotFoundException', message: 'Dimensions could be not found.' })
      .mockRejectedValueOnce({ name: 'NotFoundException', message: 'Dimensions could be not found.' })
      .mockResolvedValueOnce({ getText: () => 'MCC:BATCH:1:123' });
    render(<QrScannerDialog onDecode={onDecode} onClose={vi.fn()} />);

    const file = new File(['test image bytes'], 'batch.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/upload qr image/i), { target: { files: [file] } });

    await waitFor(() => expect(onDecode).toHaveBeenCalledWith('MCC:BATCH:1:123'));
    expect(mocks.decodeFromImageElement).toHaveBeenCalledTimes(3);
    expect(mocks.readerCreated).toHaveBeenCalledTimes(3);
    const fallbackHints = mocks.readerCreated.mock.calls[2][0];
    expect(fallbackHints.get('try-harder')).toBe(true);
    expect(fallbackHints.get('pure-barcode')).toBe(true);
    expect(fallbackHints.get('possible-formats')).toEqual(['qr-code']);
  });

  it('disables image upload while camera startup is pending', async () => {
    let finishCameraStart;
    mocks.decodeFromVideoDevice.mockImplementationOnce(() => new Promise((resolve) => {
      finishCameraStart = resolve;
    }));
    render(<QrScannerDialog onDecode={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));
    const uploadInput = screen.getByLabelText(/upload qr image/i);
    await waitFor(() => expect(uploadInput).toBeDisabled());
    expect(screen.getByRole('button', { name: /starting camera/i })).toBeDisabled();

    finishCameraStart({ stop: mocks.stop });
    await waitFor(() => expect(uploadInput).toBeEnabled());
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

  it('sends a live camera result through the same decode callback and stops scanning', async () => {
    const onDecode = vi.fn();
    mocks.decodeFromVideoDevice.mockImplementationOnce(async (_deviceId, _video, onResult) => {
      onResult({ getText: () => 'MCC:MEMBER:1:123' }, undefined, { stop: mocks.stop });
      return { stop: mocks.stop };
    });
    render(<QrScannerDialog onDecode={onDecode} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));

    await waitFor(() => expect(onDecode).toHaveBeenCalledWith('MCC:MEMBER:1:123'));
    expect(mocks.stop).toHaveBeenCalled();
    expect(await screen.findByText(/QR code decoded/i)).toBeInTheDocument();
  });

  it('keeps image upload available when camera startup fails', async () => {
    const permissionError = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    mocks.decodeFromVideoDevice.mockRejectedValueOnce(permissionError);
    render(<QrScannerDialog onDecode={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Allow camera access for this site in browser settings/i);
    expect(screen.getByLabelText(/upload qr image/i)).toBeEnabled();
  });

  it('explains when the browser cannot find a camera', async () => {
    const missingCamera = Object.assign(new Error('Requested device not found'), { name: 'NotFoundError' });
    mocks.decodeFromVideoDevice.mockRejectedValueOnce(missingCamera);
    render(<QrScannerDialog onDecode={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/No camera was found/i);
    expect(screen.getByLabelText(/upload qr image/i)).toBeEnabled();
  });
});
