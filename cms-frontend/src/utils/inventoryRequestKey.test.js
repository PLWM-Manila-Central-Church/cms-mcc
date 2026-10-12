import { describe, expect, it, vi } from 'vitest';
import { createInventoryRequestKey } from './inventoryRequestKey';

describe('createInventoryRequestKey', () => {
  it('uses a UUID when the browser provides crypto.randomUUID', () => {
    const randomUUID = vi.fn(() => '74e6fd82-683b-4b27-b5c1-a2d323f3dffa');
    vi.stubGlobal('crypto', { randomUUID });

    expect(createInventoryRequestKey()).toBe('74e6fd82-683b-4b27-b5c1-a2d323f3dffa');
    expect(randomUUID).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('falls back to a bounded, allowed idempotency key', () => {
    vi.stubGlobal('crypto', {});
    vi.spyOn(Date, 'now').mockReturnValue(1_791_649_700_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const key = createInventoryRequestKey();
    expect(key).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
