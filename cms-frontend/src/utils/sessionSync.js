const CHANNEL_NAME = 'plwm-mcc-auth-session';
const STORAGE_KEY = 'plwm-mcc-auth-session-changed';
// A browser tab may open multiple BroadcastChannel objects with this name.
// Identify the sender so its own AuthProvider ignores its login notification.
const TAB_ID = typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `${Date.now()}-${Math.random()}`;

/** Tell other same-origin tabs to resolve the current HttpOnly-cookie session again. */
export function broadcastSessionChange() {
  if (typeof window === 'undefined') return;
  let broadcast = false;
  try {
    if (typeof window.BroadcastChannel === 'function') {
      const channel = new window.BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'session-changed', sender: TAB_ID });
      channel.close();
      broadcast = true;
    }
  } catch { /* Storage events are the fallback when channels are unavailable. */ }
  if (!broadcast) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'session-changed', sender: TAB_ID, nonce: Math.random() }));
    } catch { /* Browser storage can be disabled; local session state still updates. */ }
  }
}

/** Subscribe to account changes in sibling tabs without sending account data. */
export function subscribeToSessionChanges(onChange) {
  if (typeof window === 'undefined') return () => {};
  const handleMessage = event => {
    if (event.data?.type === 'session-changed' && event.data.sender !== TAB_ID) onChange();
  };
  const handleStorage = event => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const message = JSON.parse(event.newValue);
      if (message.type === 'session-changed' && message.sender !== TAB_ID) onChange();
    } catch { /* Ignore old or malformed storage values. */ }
  };
  let channel = null;
  try {
    if (typeof window.BroadcastChannel === 'function') {
      channel = new window.BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', handleMessage);
    }
  } catch { channel = null; }
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
    channel?.removeEventListener('message', handleMessage);
    channel?.close();
  };
}
