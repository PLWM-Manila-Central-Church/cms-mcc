import { describe, expect, it, vi } from 'vitest';
import { deleteRecordsWithResults } from './bulkDelete';

describe('bulk delete results', () => {
  it('reports partial failures so the UI can retain them for retry', async () => {
    const deleteRecord = vi.fn(async (id) => {
      if (id === 2) throw new Error('Not allowed');
    });

    const result = await deleteRecordsWithResults([1, 2, 3], deleteRecord);

    expect(result.deletedCount).toBe(2);
    expect(result.failures.map(({ id }) => id)).toEqual([2]);
    expect(deleteRecord).toHaveBeenCalledTimes(3);
  });

  it('continues after one failed request and supports a fully successful selection', async () => {
    const deleteRecord = vi.fn().mockResolvedValue(undefined);

    await expect(deleteRecordsWithResults([4, 5], deleteRecord))
      .resolves.toEqual({ deletedCount: 2, failures: [] });
  });
});
