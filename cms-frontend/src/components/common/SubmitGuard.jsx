import React from 'react';

const spinnerStyle = {
  display: 'inline-block',
  width: '14px',
  height: '14px',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderTopColor: '#fff',
  borderRadius: '50%',
  animation: 'submitGuardSpin 0.6s linear infinite',
  marginRight: '6px',
  verticalAlign: 'middle',
};

// Inject the keyframes once
const keyframesId = '__submitGuardSpinStyle';
if (typeof document !== 'undefined' && !document.getElementById(keyframesId)) {
  const styleSheet = document.createElement('style');
  styleSheet.id = keyframesId;
  styleSheet.textContent = `
    @keyframes submitGuardSpin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

/**
 * SubmitGuard
 *
 * A wrapper <button> component that prevents double-clicks with a loading state
 * and displays a CSS spinner when a request is in progress.
 *
 * Props:
 *   onClick   - click handler
 *   children  - button label / content
 *   disabled  - disable the button
 *   loading   - show spinner and disable
 *   style     - additional styles merged with defaults
 *   ...rest   - passed through to the <button>
 */
export default function SubmitGuard({
  onClick,
  children,
  disabled = false,
  loading = false,
  style,
  ...rest
}) {
  const defaultStyle = {
    background: '#005599',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    padding: '6px 10px',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.65 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.4,
    transition: 'opacity 0.15s ease',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...defaultStyle, ...style }}
      {...rest}
    >
      {loading && <span style={spinnerStyle} />}
      {children}
    </button>
  );
}