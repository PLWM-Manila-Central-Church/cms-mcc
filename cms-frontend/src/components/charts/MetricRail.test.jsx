import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MetricRail from './MetricRail';

describe('MetricRail', () => {
  it('renders one label/value pair per item and passes hints through', () => {
    render(
      <MetricRail
        items={[
          { label: 'Total', value: '1,108' },
          { label: 'Active', value: '1,092', hint: '98.6% of roster' },
        ]}
      />,
    );

    expect(screen.getAllByRole('term')).toHaveLength(2);
    expect(screen.getAllByRole('definition')[0]).toHaveTextContent('1,108');
    expect(screen.getByText('98.6% of roster')).toBeInTheDocument();
    expect(document.querySelector('.ar-rail--vertical')).not.toBeNull();
  });

  it('supports a horizontal orientation for the page-level KPI strip', () => {
    render(<MetricRail orientation="horizontal" items={[{ label: 'Members', value: '1,108' }]} />);
    expect(document.querySelector('.ar-rail--horizontal')).not.toBeNull();
  });
});
