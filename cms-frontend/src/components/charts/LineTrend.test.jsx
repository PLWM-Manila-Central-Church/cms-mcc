import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LineTrend from './LineTrend';

const parsePath = (d) =>
  [...d.matchAll(/([-\d.]+)\s+([-\d.]+)/g)].map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));

describe('LineTrend', () => {
  it('maps values so a larger value sits higher and zero sits on the baseline', () => {
    render(
      <LineTrend
        ariaLabel="Member growth"
        points={[{ label: 'Jan', values: { total: 0 } }, { label: 'Feb', values: { total: 10 } }]}
        series={[{ key: 'total', label: 'New members', color: '#005599' }]}
      />,
    );

    const d = document.querySelector('.ar-line').getAttribute('d');
    expect(d).not.toMatch(/NaN/);
    const coords = parsePath(d);
    expect(coords).toHaveLength(2);
    expect(coords[0].y).toBeGreaterThan(coords[1].y);
    expect(coords[0].y).toBeCloseTo(220 - 28, 0);
  });

  it('exposes the same numbers in a screen-reader table', () => {
    render(
      <LineTrend
        ariaLabel="Attendance"
        points={[{ label: 'Jan', values: { service: 4, events: 2 } }]}
        series={[
          { key: 'service', label: 'Services', color: '#005599' },
          { key: 'events', label: 'Events', color: '#13b5ea' },
        ]}
      />,
    );

    expect(screen.getByRole('table', { name: 'Attendance' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: '4' })).toHaveLength(1);
    expect(screen.getAllByRole('cell', { name: '2' })).toHaveLength(1);
    expect(document.querySelectorAll('.ar-line')).toHaveLength(2);
  });

  it('renders a sentence for an empty series and never an empty svg', () => {
    render(
      <LineTrend
        ariaLabel="Finance"
        points={[]}
        series={[]}
        emptyLabel="No records for this period."
      />,
    );

    expect(screen.getByText('No records for this period.')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeNull();
  });

  it('handles a single point without NaN and still reports it in the table', () => {
    render(
      <LineTrend
        ariaLabel="Finance"
        points={[{ label: 'Jan', values: { income: 900 } }]}
        series={[{ key: 'income', label: 'Income', color: '#005599' }]}
      />,
    );

    const d = document.querySelector('.ar-line').getAttribute('d');
    expect(d).not.toMatch(/NaN/);
    expect(screen.getByRole('cell', { name: '900' })).toBeInTheDocument();
  });
});
