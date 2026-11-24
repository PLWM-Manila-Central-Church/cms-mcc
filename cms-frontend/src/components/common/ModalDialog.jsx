import { useRef } from 'react';
import useDialogFocus from '../../hooks/useDialogFocus';
import IconActionButton from './IconActionButton';

/**
 * Clean progressive-disclosure modal dialog for creation/edit forms so primary
 * module views stay focused on data tables instead of permanently open forms.
 */
export default function ModalDialog({
  open,
  onClose,
  title,
  subtitle = '',
  maxWidth = 680,
  children,
  footer,
}) {
  const dialogRef = useRef(null);
  useDialogFocus(open, dialogRef, onClose);

  if (!open) return null;

  return (
    <div
      className="mcc-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="mcc-modal-card"
        style={{ maxWidth }}
      >
        <div className="mcc-modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="mcc-modal-title">{title}</h2>
            {subtitle && <p className="mcc-modal-subtitle">{subtitle}</p>}
          </div>
          <IconActionButton
            icon="close"
            label={`Close ${title}`}
            tone="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>
        <div className="mcc-modal-body">{children}</div>
        {footer && (
          <div className="mcc-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 20px', borderTop: '1px solid var(--mcc-border, #e2e8f0)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
