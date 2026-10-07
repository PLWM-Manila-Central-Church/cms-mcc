import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from './axiosInstance';
import { fetchAllPages } from './fetchAllPages';

vi.mock('./axiosInstance', () => ({
  default: { get: vi.fn() },
}));

describe('fetchAllPages', () => {
  beforeEach(() => axiosInstance.get.mockReset());

  it('loads every page in bounded batches and preserves record order', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: { members: [{ id: 1 }], total_pages: 3 } } })
      .mockResolvedValueOnce({ data: { data: { members: [{ id: 2 }], total_pages: 3 } } })
      .mockResolvedValueOnce({ data: { data: { members: [{ id: 3 }], total_pages: 3 } } });

    await expect(fetchAllPages('/members', 'members', { status: 'Active' }))
      .resolves.toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

    expect(axiosInstance.get.mock.calls.map(([, config]) => config.params))
      .toEqual([
        { status: 'Active', page: 1, limit: 100 },
        { status: 'Active', page: 2, limit: 100 },
        { status: 'Active', page: 3, limit: 100 },
      ]);
  });

  it('rejects oversized dropdown datasets before fetching more pages', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { data: { members: [], total_pages: 101 } } });

    await expect(fetchAllPages('/members', 'members')).rejects.toThrow(/exceeds the supported dropdown size/);
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
  });
});
