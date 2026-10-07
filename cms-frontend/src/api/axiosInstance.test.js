import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from './axiosInstance';

describe('axios auth refresh queue', () => {
  const originalAdapter = axiosInstance.defaults.adapter;

  afterEach(() => {
    vi.restoreAllMocks();
    axiosInstance.defaults.adapter = originalAdapter;
  });

  it('rejects every queued session restore when the shared refresh fails', async () => {
    const unauthorized = (config) => new axios.AxiosError(
      'Unauthorized',
      'ERR_BAD_REQUEST',
      config,
      undefined,
      { status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config },
    );
    const adapter = vi.fn(async (config) => { throw unauthorized(config); });
    axiosInstance.defaults.adapter = adapter;

    let rejectRefresh;
    const refreshPromise = new Promise((_, reject) => { rejectRefresh = reject; });
    const refreshRequest = vi.spyOn(axios, 'post').mockReturnValue(refreshPromise);
    const first = axiosInstance.get('/auth/session', { _skipAuthRedirect: true });
    const second = axiosInstance.get('/auth/session', { _skipAuthRedirect: true });
    const settledRequests = Promise.allSettled([first, second]);

    await vi.waitFor(() => {
      expect(adapter).toHaveBeenCalledTimes(2);
      expect(refreshRequest).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    rejectRefresh(new Error('Refresh token expired'));

    const results = await Promise.race([
      settledRequests,
      new Promise((resolve) => setTimeout(() => resolve(null), 500)),
    ]);
    expect(results).not.toBeNull();
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
  });
});
