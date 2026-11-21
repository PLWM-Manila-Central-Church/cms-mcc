import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PortalDialog({ onClose, label, children, width = 560 }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const openerRef = useRef(null);
  closeRef.current = onClose;

  useEffect(() => {
    openerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE) || panel;
    first?.focus?.();

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current?.();
      }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      const opener = openerRef.current;
      // Defer so a dialog that replaces this one (day -> event) wins the focus.
      setTimeout(() => {
        if (document.querySelector('[role="dialog"]')) return;
        if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
      }, 0);
    };
  }, []);

  const trapFocus = (event) => {
    if (event.key !== 'Tab') return;
    const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      onClick={() => closeRef.current?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 600, padding: 16,
        background: 'rgba(4,20,38,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
        style={{
          width: `min(${width}px, 100%)`, maxHeight: '86dvh', overflow: 'auto',
          background: '#fff', borderRadius: 18, boxShadow: '0 30px 80px rgba(2,18,35,0.38)',
          outline: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
