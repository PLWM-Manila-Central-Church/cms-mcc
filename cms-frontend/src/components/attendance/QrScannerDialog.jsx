import { useEffect, useRef, useState } from 'react';
import useQrDialogFocus from './useQrDialogFocus';
import './qrAttendance.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 16 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export default function QrScannerDialog({ title = 'Scan QR code', onDecode, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const retryReaderRef = useRef(null);
  const mountedRef = useRef(true);
  const scanFinishedRef = useRef(false);
  const objectUrlRef = useRef(null);
  const decodeRevisionRef = useRef(0);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [imageDecoding, setImageDecoding] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [videoDeviceIndex, setVideoDeviceIndex] = useState(0);
  const [imagePreview, setImagePreview] = useState('');
  const [message, setMessage] = useState('Choose Start Camera or upload a QR image.');
  const [error, setError] = useState('');
  const { dialogRef, closeButtonRef } = useQrDialogFocus(true, onClose);

  const stopCamera = () => {
    controlsRef.current?.stop?.();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    stream?.getTracks?.().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mountedRef.current) setCameraActive(false);
  };

  const loadReader = async (tryHarder = false) => {
    const targetRef = tryHarder ? retryReaderRef : readerRef;
    if (!targetRef.current) {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (tryHarder) {
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');
        const hints = new Map([
          [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
          [DecodeHintType.TRY_HARDER, true],
        ]);
        targetRef.current = new BrowserQRCodeReader(hints);
      } else {
        targetRef.current = new BrowserQRCodeReader();
      }
    }
    return targetRef.current;
  };

  const emitText = (text) => {
    const value = String(text || '').trim();
    if (!value || value.length > 64) {
      setError('The QR code is empty or too long. Try another image.');
      return;
    }
    stopCamera();
    setError('');
    setMessage('QR code decoded. Review the result before confirming attendance.');
    onDecode(value);
  };

  const startCamera = async (preferredDeviceId) => {
    scanFinishedRef.current = false;
    setError('');
    setCameraStarting(true);
    try {
      const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
      if (!window.isSecureContext && !isLocalhost) {
        throw new Error('Camera access requires HTTPS. You can still upload a QR image.');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera access. Upload a QR image instead.');
      }
      const reader = await loadReader();
      const devices = typeof reader.listVideoInputDevices === 'function'
        ? await reader.listVideoInputDevices().catch(() => [])
        : [];
      if (mountedRef.current) setVideoDevices(devices);
      const preferredIndex = preferredDeviceId
        ? devices.findIndex((device) => device.deviceId === preferredDeviceId)
        : Math.max(0, devices.findIndex((device) => /back|rear|environment/i.test(device.label || '')));
      const deviceIndex = preferredIndex >= 0 ? preferredIndex : 0;
      const deviceId = preferredDeviceId || devices[deviceIndex]?.deviceId;
      if (mountedRef.current) setVideoDeviceIndex(deviceIndex);
      const controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, _decodeError, activeControls) => {
        if (!result) return;
        scanFinishedRef.current = true;
        activeControls?.stop?.();
        controlsRef.current = null;
        if (!mountedRef.current) return;
        setCameraActive(false);
        emitText(result.getText());
      });
      if (!mountedRef.current || scanFinishedRef.current) {
        controls.stop?.();
        return;
      }
      controlsRef.current = controls;
      setCameraActive(true);
      setMessage('Camera is ready. Hold the QR code in the frame.');
      if (typeof reader.listVideoInputDevices === 'function') {
        const refreshedDevices = await reader.listVideoInputDevices().catch(() => devices);
        if (mountedRef.current && refreshedDevices.length) {
          setVideoDevices(refreshedDevices);
          const activeIndex = refreshedDevices.findIndex((device) => device.deviceId === deviceId);
          if (activeIndex >= 0) setVideoDeviceIndex(activeIndex);
        }
      }
    } catch (scanError) {
      stopCamera();
      if (mountedRef.current) setError(scanError?.message || 'Camera could not start. Upload a QR image instead.');
    } finally {
      if (mountedRef.current) setCameraStarting(false);
    }
  };

  const switchCamera = async () => {
    if (videoDevices.length < 2) return;
    const nextIndex = (videoDeviceIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    stopCamera();
    await startCamera(nextDevice.deviceId);
  };

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const revision = ++decodeRevisionRef.current;
    stopCamera();
    setError('');
    setImagePreview('');
    setMessage('Checking the selected image…');
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;

    if (file.size > MAX_FILE_SIZE) {
      setError('Choose a PNG, JPEG, or WebP image smaller than 5 MiB.');
      return;
    }
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError('Use a PNG, JPEG, or WebP QR image.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setImagePreview(objectUrl);
    setImageDecoding(true);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('The selected file is not a readable image.');
      if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        throw new Error('The image is too large to scan. Choose an image under 16 megapixels.');
      }
      const reader = await loadReader();
      const decodeWithTimeout = async (activeReader) => {
        let timeoutId;
        try {
          return await Promise.race([
            activeReader.decodeFromImageElement(image),
            new Promise((_, reject) => {
              timeoutId = window.setTimeout(() => reject(new Error('Image decoding took too long. Try a smaller image.')), 10000);
            }),
          ]);
        } finally {
          window.clearTimeout(timeoutId);
        }
      };
      let result;
      try {
        result = await decodeWithTimeout(reader);
      } catch (firstDecodeError) {
        if (firstDecodeError?.name !== 'NotFoundException' && firstDecodeError?.message) throw firstDecodeError;
        const retryReader = await loadReader(true);
        result = await decodeWithTimeout(retryReader);
      }
      if (revision === decodeRevisionRef.current) emitText(result.getText());
    } catch (scanError) {
      if (mountedRef.current && revision === decodeRevisionRef.current) {
        setError(scanError?.message || 'No QR code was found in this image. Try a clearer image.');
        setMessage('Choose another image or start the camera.');
      }
    } finally {
      if (mountedRef.current && revision === decodeRevisionRef.current) setImageDecoding(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      decodeRevisionRef.current += 1;
      controlsRef.current?.stop?.();
      videoRef.current?.srcObject?.getTracks?.().forEach((track) => track.stop());
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return (
    <div className="qr-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
        <header className="qr-modal-header">
          <div>
            <h2 id="qr-scanner-title">{title}</h2>
            <p>Scan a member QR or a submitted leader batch QR for this selected session.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="qr-icon-button" onClick={onClose} aria-label="Close scanner">×</button>
        </header>
        <video ref={videoRef} className="qr-camera-preview" muted playsInline autoPlay aria-label="Camera QR preview" />
        {imagePreview && <img className="qr-image-preview" src={imagePreview} alt="Selected QR image preview" />}
        <div className="qr-scanner-actions">
          <button type="button" className="qr-primary-button" onClick={startCamera} disabled={cameraStarting || cameraActive}>
            {cameraStarting ? 'Starting camera…' : cameraActive ? 'Camera running' : 'Start Camera'}
          </button>
          {cameraActive && videoDevices.length > 1 && <button type="button" className="qr-secondary-button" onClick={switchCamera}>Switch Camera</button>}
          <label className="qr-secondary-button qr-file-button" aria-disabled={cameraStarting || imageDecoding}>
            {imageDecoding ? 'Decoding image…' : 'Upload QR Image'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} disabled={imageDecoding || cameraStarting} />
          </label>
        </div>
        <p className="qr-scanner-message" role="status" aria-live="polite">{message}</p>
        {error && <p className="qr-inline-error" role="alert">{error}</p>}
        <p className="qr-scanner-footnote">Images are decoded on this device and are not uploaded.</p>
      </section>
    </div>
  );
}
