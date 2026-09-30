import { Component } from 'react';

/**
 * ErrorBoundary — catches render crashes and shows a fallback UI
 * instead of unmounting the entire React tree.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            padding: '48px 24px',
            textAlign: 'center',
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#dc2626"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ margin: '16px 0 8px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', maxWidth: 400, lineHeight: 1.5 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            style={{
              background: '#005599',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Go to Home
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre
              style={{
                marginTop: 24,
                padding: 16,
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: 12,
                color: '#dc2626',
                maxWidth: '100%',
                overflow: 'auto',
                textAlign: 'left',
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}