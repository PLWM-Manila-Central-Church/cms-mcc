import { afterEach, describe, expect, it } from 'vitest';
import { uploadUrl } from './uploadUrl';

describe('authenticated upload URL resolution', () => {
  const originalApiUrl = process.env.REACT_APP_API_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.REACT_APP_API_URL;
    else process.env.REACT_APP_API_URL = originalApiUrl;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('resolves the stored profile key through the local authenticated API route', () => {
    process.env.NODE_ENV = 'development';
    process.env.REACT_APP_API_URL = 'http://127.0.0.1:5004/api';
    expect(uploadUrl('/profiles/member-photo.webp')).toBe('http://127.0.0.1:5004/api/uploads/profiles/member-photo.webp');
  });

  it('does not double-prefix already normalized upload routes', () => {
    process.env.NODE_ENV = 'development';
    process.env.REACT_APP_API_URL = 'http://127.0.0.1:5004/api';
    expect(uploadUrl('/uploads/profiles/member-photo.webp')).toBe('http://127.0.0.1:5004/api/uploads/profiles/member-photo.webp');
  });

  it('routes legacy absolute profile URLs through the authenticated API', () => {
    process.env.NODE_ENV = 'development';
    process.env.REACT_APP_API_URL = 'http://127.0.0.1:5004/api';
    expect(uploadUrl('https://storage.example.invalid/profiles/legacy.webp'))
      .toBe('http://127.0.0.1:5004/api/uploads/profiles/legacy.webp');
  });
});
