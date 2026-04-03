/**
 * BottomSheet
 *
 * A mobile-friendly panel that slides up from the bottom of the
 * screen, replacing desktop modals/dialogs on small screens.
 * On desktop (≥768px) it renders nothing — the parent should
 * show its own modal there.
 *
 * Usage:
 *
 *   <BottomSheet
 *     open={showPanel}
 *     onClose={() => setShowPanel(false)}
 *     title="Event Details"
 *   >
 *     <p>Content goes here</p>
 *   </BottomSheet>
 *
 * Props:
 *   open      — boolean, controls visibility
 *   onClose   — fn called when user taps backdrop or close button
 *   title     — optional header title string
 *   children  — content to render inside the sheet
 *   height    — optional max-height override (default: '92dvh')
 *   forceShow — if true, renders on desktop too (useful for testing)
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MOBILE_BP = 768;

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  height,
  forceShow = false,
}) {
  const [visible,  setVisible]  = useState(false);
  const [closing,  setClosing]  = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BP : false
  );
  const startYRef = useRef(null);
  const sheetRef  = useRef(null);

  /* ── Detect mobile ───────────────────────────────────────── */
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  /* ── Open / close lifecycle ──────────────────────────────── */
  useEffect(() => {
    if (open) {
      setClosing(false);
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else if (visible) {
      triggerClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      document.body.style.overflow = '';
    }, 260);
  };

  const handleClose = () => {
    triggerClose();
    onClose?.();
  };

  /* ── Swipe-down to dismiss ───────────────────────────────── */
  const onTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    if (startYRef.current === null) return;
    const delta = e.changedTouches[0].clientY - startYRef.current;
    if (delta > 60) handleClose(); // swiped down 60px → dismiss
    startYRef.current = null;
  };

  /* ── Keyboard: ESC to close ──────────────────────────────── */
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && visible) handleClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* ── Don't render on desktop (unless forceShow) ──────────── */
  if (!isMobile && !forceShow) return null;
  if (!visible) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="bottom-sheet-backdrop"
        style={{ opacity: closing ? 0 : 1, transition: 'opacity 0.25s' }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={sheetRef}
        className={`bottom-sheet-panel${closing ? ' closing' : ''}`}
        style={height ? { maxHeight: height } : undefined}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
      >
        {/* Drag handle */}
        <div className="bottom-sheet-handle" />

        {/* Header */}
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px 10px',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
              {title}
            </span>
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: 18,
                lineHeight: 1,
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '16px 20px' }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
