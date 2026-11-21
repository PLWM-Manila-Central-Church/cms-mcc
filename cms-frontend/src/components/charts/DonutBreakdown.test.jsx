import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DonutBreakdown from './DonutBreakdown';

const dashLength = (element) => parseFloat(element.getAttribute('stroke-dasharray'));

describe('DonutBreakdown', () => {
  it('splits the ring proportionally and totals the centre', () => {
    render(
      <DonutBreakdown
        ariaLabel="Gender"
        rows={[{ label: 'Female', total: 75 }, { label: 'Male', total: 25 }]}
        total={100}
        centerLabel="members"
      />,
    );

    const arcs = document.querySelectorAll('.ar-donut-slice');
    expect(arcs).toHaveLength(2);
    expect(dashLength(arcs[0])).toBeGreaterThan(dashLength(arcs[1]));
    expect(dashLength(arcs[0]) / dashLength(arcs[1])).toBeCloseTo(3, 0);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('members')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders a quiet ring instead of dividing by zero', () => {
    render(
      <DonutBreakdown
        ariaLabel="Age"
        rows={[{ label: 'Unknown', total: 0 }]}
        total={0}
        centerLabel="members"
      />,
    );

    expect(document.querySelectorAll('.ar-donut-slice')).toHaveLength(0);
    expect(document.querySelector('.ar-donut-ring')).not.toBeNull();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders the empty label when there are no rows', () => {
    render(<DonutBreakdown ariaLabel="Age" rows={[]} total={0} centerLabel="members" emptyLabel="No demographics." />);
    expect(screen.getByText('No demographics.')).toBeInTheDocument();
  });
});
