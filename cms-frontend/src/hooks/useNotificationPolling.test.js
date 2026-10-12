import { act, renderHook } from '@testing-library/react';
import { createElement, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../api/axiosInstance', () => ({ default: api }));

import useNotificationPolling from './useNotificationPolling';

const StrictWrapper = ({ children }) => createElement(StrictMode, null, children);

describe('useNotificationPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not overlap a slow request and waits a full interval after it settles', async () => {
    let resolveFirst;
    api.get
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValue({ data: { data: [{ id: 1 }] } });
    const onNotifications = vi.fn();
    const { unmount } = renderHook(
      () => useNotificationPolling({ onNotifications, pollIntervalMs: 100 }),
      { wrapper: StrictWrapper },
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/notifications', { timeout: 15000 });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({ data: { data: [{ id: 1 }] } });
      await Promise.resolve();
    });
    expect(onNotifications).toHaveBeenCalledWith([{ id: 1 }]);

    await act(async () => { await vi.advanceTimersByTimeAsync(99); });
    expect(api.get).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(api.get).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('backs off after failures and returns to the normal interval after success', async () => {
    api.get
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue({ data: { data: [] } });
    const onError = vi.fn();
    const { unmount } = renderHook(() => useNotificationPolling({ onNotifications: vi.fn(), onError, pollIntervalMs: 100 }));

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(199); });
    expect(api.get).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(api.get).toHaveBeenCalledTimes(2);

    await act(async () => { await vi.advanceTimersByTimeAsync(99); });
    expect(api.get).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(api.get).toHaveBeenCalledTimes(3);
    unmount();
  });

  it('clears the scheduled poll when the consumer unmounts', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    const { unmount } = renderHook(() => useNotificationPolling({ onNotifications: vi.fn(), pollIntervalMs: 100 }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(api.get).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
