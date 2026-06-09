import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * IdleLockScreen — full-screen lock overlay shown after inactivity.
 * User must re-enter their password to dismiss.
 */
export default function IdleLockScreen({ onUnlock }) {
  const { user, login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!user?.email || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(user.email, password);
      // Login succeeded — dismiss the lock screen
      setPassword('');
      if (onUnlock) onUnlock();
    } catch (err) {
      setError('Incorrect password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '40px 36px',
          width: 380,
          maxWidth: '90vw',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}
      >
        {/* Lock icon (simple SVG) */}
        <div style={{ marginBottom: 20 }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#003d70"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2
          style={{
            margin: '0 0 4px',
            fontSize: 20,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          Session Locked
        </h2>

        <p
          style={{
            margin: '0 0 6px',
            fontSize: 13,
            color: '#64748b',
          }}
        >
          Due to inactivity, your session has been locked.
        </p>

        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            fontWeight: 600,
            color: '#005599',
          }}
        >
          {user.email}
        </p>

        <form onSubmit={handleUnlock}>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '11px 14px',
              fontSize: 14,
              border: '1.5px solid #e2e8f0',
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 12,
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#005599')}
            onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
          />

          {error && (
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 13,
                color: '#dc2626',
                fontWeight: 500,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '11px 0',
              fontSize: 14,
              fontWeight: 600,
              background: loading ? '#94a3b8' : '#005599',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: '#94a3b8',
          }}
        >
          PLWM-MCC Church Management
        </p>
      </div>
    </div>
  );
}