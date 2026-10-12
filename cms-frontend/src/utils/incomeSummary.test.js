import { describe, expect, it } from 'vitest';
import { getIncomeSummaryAmounts } from './incomeSummary';

describe('finance income summary precision', () => {
  it('calculates category cards in cents without displaying negative zero', () => {
    expect(getIncomeSummaryAmounts([
      { category: { name: 'Offering' }, total_amount: 1.11 },
      { category: { name: 'Tithes' }, total_amount: 2.22 },
    ])).toEqual({ total: 3.33, tithes: 2.22, offerings: 1.11, other: 0 });
  });

  it('includes additional categories and accepts database decimal strings', () => {
    expect(getIncomeSummaryAmounts([
      { category: { name: 'Offering' }, total_amount: '1.11' },
      { category: { name: 'Tithes' }, total_amount: '2.22' },
      { category: { name: 'Missions' }, total_amount: '0.37' },
    ])).toEqual({ total: 3.7, tithes: 2.22, offerings: 1.11, other: 0.37 });
  });

  it('returns zeroed cards for empty or invalid summary values', () => {
    expect(getIncomeSummaryAmounts([])).toEqual({ total: 0, tithes: 0, offerings: 0, other: 0 });
    expect(getIncomeSummaryAmounts([{ total_amount: 'invalid' }]))
      .toEqual({ total: 0, tithes: 0, offerings: 0, other: 0 });
  });
});
