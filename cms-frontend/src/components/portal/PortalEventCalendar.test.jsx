import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import PortalEventCalendar from './PortalEventCalendar';

const colors = {
  surface: '#fff', border: '#e2e8f0', borderL: '#f1f5f9', t1: '#0f172a', t2: '#475569',
  t3: '#64748b', accent: '#005599', accentT: '#005599', accentL: '#eff6ff', success: '#16a34a', successL: '#dcfce7',
};
const fonts = { xs: 11, sm: 13, base: 14, md: 15, lg: 18, stat: 26 };

const events = [
  { id: 1, title: 'MCC | Bible Retreat', start_date: '2026-11-30', end_date: '2026-12-02', location: 'Galilee Retreat Center' },
  { id: 2, title: 'MCC | Wednesday Sermon', start_date: '2026-12-09', start_time: '19:00:00' },
  { id: 3, title: 'MCC | CG 43 Taguig', start_date: '2026-12-10', start_time: '19:00:00', location: 'Taguig', is_registered: true },
  { id: 4, title: 'MCC | CG 11 UPS 5', start_date: '2026-12-10', start_time: '19:00:00', location: 'UPS 5' },
];

test('shows a month of events and the details of the selected day', () => {
  render(<PortalEventCalendar events={events} c={colors} f={fonts} labels={{}} initialMonth="2026-12" />);

  expect(screen.getByText('Wednesday Sermon')).toBeInTheDocument();
  expect(screen.getByRole('gridcell', { name: /December 10, 2026, 2 events/ })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('gridcell', { name: /December 10, 2026/ }));
  expect(screen.getByText('MCC | CG 43 Taguig')).toBeInTheDocument();
  expect(screen.getByText('MCC | CG 11 UPS 5')).toBeInTheDocument();
  expect(screen.getByText('Registered')).toBeInTheDocument();
});

test('keeps a multi-day event on every day it covers', () => {
  render(<PortalEventCalendar events={events} c={colors} f={fonts} labels={{}} initialMonth="2026-12" />);
  expect(screen.getByRole('gridcell', { name: /December 1, 2026, 1 event/ })).toBeInTheDocument();
  expect(screen.getByRole('gridcell', { name: /December 2, 2026, 1 event/ })).toBeInTheDocument();
  expect(screen.getByRole('gridcell', { name: /December 3, 2026, 0 events/ })).toBeInTheDocument();
});

test('moves between months and explains an empty day', () => {
  render(<PortalEventCalendar events={events} c={colors} f={fonts} labels={{}} initialMonth="2026-12" />);
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByText('November 2026')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  fireEvent.click(screen.getByRole('gridcell', { name: /December 3, 2026/ }));
  expect(screen.getByText('Nothing scheduled for this day.')).toBeInTheDocument();
});

test('opens details for an event', () => {
  const onEventClick = vi.fn();
  render(<PortalEventCalendar events={events} onEventClick={onEventClick} c={colors} f={fonts} labels={{}} initialMonth="2026-12" />);
  fireEvent.click(screen.getByRole('gridcell', { name: /December 10, 2026/ }));
  fireEvent.click(screen.getAllByRole('button', { name: 'View details' })[0]);
  expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
});
