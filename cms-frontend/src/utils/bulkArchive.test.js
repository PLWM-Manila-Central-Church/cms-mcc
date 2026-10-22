import { describe, expect, it, vi } from 'vitest';
import { archiveRecordsWithResults } from './bulkArchive';

describe('bulk archive results', () => {
  it('continues after an item fails and reports per-record failures', async () => {
    const archiveRecord = vi.fn(async (id) => {
      if (id === 2) throw new Error('conflict');
      return { id };
    });
    const result = await archiveRecordsWithResults([1, 2, 3], archiveRecord);
    expect(result.archivedCount).toBe(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].id).toBe(2);
    expect(archiveRecord).toHaveBeenCalledTimes(3);
  });

  it('returns an empty failure list when all records archive', async () => {
    await expect(archiveRecordsWithResults([4, 5], vi.fn().mockResolvedValue(undefined)))
      .resolves.toEqual({ archivedCount: 2, failures: [] });
  });
});
