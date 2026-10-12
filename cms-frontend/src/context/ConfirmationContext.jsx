import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmationContext = createContext(null);

function ConfirmationDialog({ request, onCancel, onConfirm }) {
  const inputRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const isPrompt = request?.kind === 'prompt';
  const minLength = Math.max(0, Number(request?.minLength) || 0);
  const maxLength = Math.max(minLength, Number(request?.maxLength) || 500);
  const trimmedValue = inputValue.trim();
  const promptValid = !isPrompt || (trimmedValue.length >= minLength && trimmedValue.length <= maxLength);

  useEffect(() => {
    if (!request) return;
    setInputValue(request.defaultValue || '');
    if (request.kind === 'prompt') inputRef.current?.focus();
    else cancelButtonRef.current?.focus();
  }, [request]);

  useEffect(() => {
    if (!request) return undefined;
    const focusableRefs = isPrompt
      ? [inputRef, cancelButtonRef, confirmButtonRef]
      : [cancelButtonRef, confirmButtonRef];
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableRefs.map((ref) => ref.current).filter(Boolean);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !focusable.includes(activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (activeElement === last || !focusable.includes(activeElement))) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request, isPrompt, onCancel]);

  if (!request) return null;
  const confirmColor = request.tone === 'warning' ? '#b45309' : request.tone === 'primary' ? '#075985' : '#b91c1c';
  const submit = () => {
    if (isPrompt) {
      if (!promptValid) return;
      onConfirm(trimmedValue);
    } else {
      onConfirm(true);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.5)' }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-confirmation-title"
        aria-describedby={isPrompt ? 'app-confirmation-message app-confirmation-input-hint' : 'app-confirmation-message'}
        style={{ width: 'min(100%,460px)', padding: 22, borderRadius: 14, background: '#fff', boxShadow: '0 24px 70px rgba(15,23,42,0.3)' }}
      >
        <h2 id="app-confirmation-title" style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 20 }}>{request.title}</h2>
        <p id="app-confirmation-message" style={{ margin: 0, color: '#475569', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{request.message}</p>
        {isPrompt && (
          <label style={{ display: 'grid', gap: 6, marginTop: 14, color: '#334155', fontSize: 13, fontWeight: 700 }}>
            {request.inputLabel || 'Reason'}
            <textarea
              ref={inputRef}
              aria-label={request.inputLabel || 'Reason'}
              rows={3}
              maxLength={maxLength}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              style={{ boxSizing: 'border-box', width: '100%', resize: 'vertical', minHeight: 84, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a', font: 'inherit' }}
            />
            <span id="app-confirmation-input-hint" style={{ color: promptValid ? '#64748b' : '#b91c1c', fontSize: 12, fontWeight: 500 }}>
              {trimmedValue.length < minLength
                ? `Enter at least ${minLength} characters. ${trimmedValue.length}/${minLength}`
                : `${trimmedValue.length}/${maxLength} characters`}
            </span>
          </label>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            style={{ minHeight: 40, padding: '8px 14px', border: '1px solid #dbe4ee', borderRadius: 8, background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
          >
            {request.cancelLabel || 'Cancel'}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={submit}
            disabled={!promptValid}
            style={{ minHeight: 40, padding: '8px 14px', border: 0, borderRadius: 8, background: confirmColor, color: '#fff', fontWeight: 700, cursor: promptValid ? 'pointer' : 'not-allowed', opacity: promptValid ? 1 : 0.65 }}
          >
            {request.confirmLabel || 'Confirm'}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ConfirmationProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);
  const requestKindRef = useRef(null);
  const triggerRef = useRef(null);

  const settle = useCallback((result) => {
    const resolve = resolverRef.current;
    if (!resolve) return;
    resolverRef.current = null;
    requestKindRef.current = null;
    setRequest(null);
    resolve(result);
  }, []);

  const openRequest = useCallback((kind, options = {}) => {
    if (resolverRef.current) return Promise.resolve(kind === 'prompt' ? null : false);
    triggerRef.current = typeof document === 'undefined' ? null : document.activeElement;
    requestKindRef.current = kind;
    setRequest({
      ...options,
      kind,
      title: options.title || (kind === 'prompt' ? 'Enter a reason' : 'Confirm action'),
      message: options.message || (kind === 'prompt' ? 'Provide a reason to continue.' : 'Are you sure you want to continue?'),
      confirmLabel: options.confirmLabel || (kind === 'prompt' ? 'Submit reason' : 'Confirm'),
      cancelLabel: options.cancelLabel || 'Cancel',
      tone: options.tone || 'danger',
      minLength: options.minLength ?? 0,
      maxLength: options.maxLength ?? 500,
    });
    return new Promise((resolve) => { resolverRef.current = resolve; });
  }, []);

  const confirm = useCallback((options = {}) => openRequest('confirm', options), [openRequest]);
  const prompt = useCallback((options = {}) => openRequest('prompt', options), [openRequest]);

  useEffect(() => {
    if (!request && !resolverRef.current && triggerRef.current?.isConnected) {
      const trigger = triggerRef.current;
      triggerRef.current = null;
      trigger.focus({ preventScroll: true });
    }
  }, [request]);

  useEffect(() => () => {
    const resolve = resolverRef.current;
    const value = requestKindRef.current === 'prompt' ? null : false;
    resolverRef.current = null;
    requestKindRef.current = null;
    resolve?.(value);
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm, prompt }}>
      {children}
      <ConfirmationDialog request={request} onCancel={() => settle(request?.kind === 'prompt' ? null : false)} onConfirm={settle} />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const value = useContext(ConfirmationContext);
  if (!value) throw new Error('useConfirmation must be used within a ConfirmationProvider');
  return value;
}
