import { describe, expect, it } from 'vitest';
import { getFinanceRecordLabel } from './financeRecordLabel';

describe('finance dashboard record labels', () => {
  it('labels anonymous giving without implying it belongs to a member', () => {
    expect(getFinanceRecordLabel({ is_anonymous: 1, Member: null })).toBe('Anonymous giving');
  });

  it('keeps the member name for a linked non-anonymous record', () => {
    expect(getFinanceRecordLabel({
      is_anonymous: 0,
      Member: { first_name: 'Alex', last_name: 'Rivera' },
    })).toBe('Alex Rivera');
  });

  it('keeps the generic label for a non-anonymous record without a member link', () => {
    expect(getFinanceRecordLabel({ is_anonymous: 0, Member: null })).toBe('Member record');
  });
});
