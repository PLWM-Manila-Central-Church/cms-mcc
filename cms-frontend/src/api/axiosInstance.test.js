import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axiosInstance, { setLeaderScopeHeader } from './axiosInstance';

describe('axios auth refresh queue', () => {
  const originalAdapter = axiosInstance.defaults.adapter;

  afterEach(() => {
    vi.restoreAllMocks();
    axiosInstance.defaults.adapter = originalAdapter;
    axiosInstance.inFlightRequests.clear();
    setLeaderScopeHeader(null);
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

  it('keeps the original team scope on an in-flight retry after the active selection changes', async () => {
    const sentScopes = [];
    const adapter = vi.fn(async (config) => {
      sentScopes.push(config.headers.get('X-MCC-Leader-Scope'));
      if (sentScopes.length === 1) {
        throw new axios.AxiosError(
          'Unauthorized',
          'ERR_BAD_REQUEST',
          config,
          undefined,
          { status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config },
        );
      }
      return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
    });
    axiosInstance.defaults.adapter = adapter;
    setLeaderScopeHeader('cell_group:8');
    vi.spyOn(axios, 'post').mockImplementation(async () => {
      setLeaderScopeHeader('member_group:3');
      return { data: { success: true }, status: 200, statusText: 'OK', headers: {} };
    });

    const response = await axiosInstance.post('/members/scope/assign', { member_id: 42 });

    expect(response.status).toBe(200);
    expect(sentScopes).toEqual(['cell_group:8', 'cell_group:8']);
    expect(axiosInstance.inFlightRequests.size).toBe(0);
  });

  it('deduplicates identical pending mutations within a scope but separates other scopes', async () => {
    const requests = [];
    const adapter = vi.fn((config) => new Promise((resolve) => {
      requests.push({ config, resolve });
    }));
    axiosInstance.defaults.adapter = adapter;

    setLeaderScopeHeader('cell_group:8');
    const cellFirst = axiosInstance.post('/members/scope/assign', { member_id: 42 });
    const cellDuplicate = axiosInstance.post('/members/scope/assign', { member_id: 42 });
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));

    setLeaderScopeHeader('member_group:3');
    const groupRequest = axiosInstance.post('/members/scope/assign', { member_id: 42 });
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(2));
    expect(requests.map(({ config }) => config.headers.get('X-MCC-Leader-Scope')))
      .toEqual(['cell_group:8', 'member_group:3']);

    for (const { config, resolve } of requests) {
      resolve({ data: { success: true }, status: 200, statusText: 'OK', headers: {}, config });
    }
    await Promise.all([cellFirst, cellDuplicate, groupRequest]);
    expect(axiosInstance.inFlightRequests.size).toBe(0);
  });
});
