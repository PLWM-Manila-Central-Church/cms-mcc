import { describe, expect, it } from 'vitest';
import { getUnlockErrorMessage } from './IdleLockScreen';

describe('idle session unlock errors', () => {
  it('keeps invalid credentials generic', () => {
    expect(getUnlockErrorMessage({ response: { status: 401 } })).toBe('Incorrect password');
  });

  it('surfaces the login rate-limit message instead of mislabeling it as a password error', () => {
    expect(getUnlockErrorMessage({
      response: { status: 429, data: { message: 'Too many login attempts. Try again later.' } },
    })).toBe('Too many login attempts. Try again later.');
  });

  it('distinguishes network and server failures', () => {
    expect(getUnlockErrorMessage({ request: {} }))
      .toBe('Could not contact the server. Check your connection and try again.');
    expect(getUnlockErrorMessage({ response: { status: 503, data: {} } }))
      .toBe('The server could not verify your session. Try again later.');
  });
});
