import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RankedBars from './RankedBars';

describe('RankedBars', () => {
  it('sizes bars against the largest row and keeps every label', () => {
    render(<RankedBars rows={[{ label: 'Alpha', total: 50 }, { label: 'Beta', total: 25 }]} />);
    const bars = document.querySelectorAll('.ar-ranked-bar');
    expect(bars[0]).toHaveStyle({ width: '100%' });
    expect(bars[1]).toHaveStyle({ width: '50%' });
    expect(screen.getByText('Alpha')).toHaveAttribute('title', 'Alpha');
  });

  it('sorts descending before applying the limit', () => {
    render(<RankedBars rows={[{ label: 'Low', total: 1 }, { label: 'High', total: 9 }]} limit={1} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.queryByText('Low')).not.toBeInTheDocument();
  });

  it('keeps the Other aggregate as the final row', () => {
    render(<RankedBars rows={[{ label: 'Other (12 cell groups)', total: 180 }, { label: 'Alpha', total: 20 }]} />);
    const labels = [...document.querySelectorAll('.ar-ranked-label')].map((node) => node.textContent);
    expect(labels).toEqual(['Alpha', 'Other (12 cell groups)']);
  });

  it('renders the empty label when there are no rows', () => {
    render(<RankedBars rows={[]} emptyLabel="No groups recorded." />);
    expect(screen.getByText('No groups recorded.')).toBeInTheDocument();
    expect(document.querySelector('.ar-ranked')).toBeNull();
  });

  it('never exceeds 100% width with a long label and twenty categories', () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({ label: 'A'.repeat(40) + index, total: index }));
    render(<RankedBars rows={rows} limit={20} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    document.querySelectorAll('.ar-ranked-bar').forEach((bar) => {
      expect(parseFloat(bar.style.width)).toBeLessThanOrEqual(100);
    });
  });
});
