import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MinistrySchedulePanel from './MinistrySchedulePanel';

const colors = {
  surface: '#fff', border: '#e2e8f0', borderL: '#f1f5f9',
  t1: '#0f172a', t2: '#475569', t3: '#64748b', accent: '#005599',
};
const fonts = { xs: 11, sm: 13, base: 14, md: 15 };

describe('MinistrySchedulePanel', () => {
  it('separates service, practice and cleaning schedules', () => {
    render(
      <MinistrySchedulePanel
        c={colors}
        f={fonts}
        labels={{}}
        data={{
          assignments: [{ id: 1, confirmed: 1, ministryRole: { name: 'Choir' }, Service: { title: 'Sunday Worship', service_date: '2026-03-08', service_time: '09:00:00' } }],
          schedules: [
            { id: 2, kind: 'practice', title: 'Choir practice', date: '2026-03-06', startTime: '18:00:00', location: 'Sanctuary', ministry: 'Choir' },
            { id: 3, kind: 'cleaning', title: 'Sanctuary cleaning', date: '2026-03-07', ministry: 'Choir' },
          ],
          invites: [],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Serving schedule' })).toBeInTheDocument();
    expect(screen.getByText('Sunday Worship')).toBeInTheDocument();
    expect(screen.getByText('Choir practice')).toBeInTheDocument();
    expect(screen.getByText('Sanctuary cleaning')).toBeInTheDocument();
    expect(screen.getByText('Mar 6')).toBeInTheDocument();
  });

  it('shows one quiet line per empty group instead of empty boxes', () => {
    render(<MinistrySchedulePanel c={colors} f={fonts} labels={{}} data={{ assignments: [], schedules: [], invites: [] }} />);
    expect(screen.getAllByText('Nothing scheduled yet.')).toHaveLength(4);
  });
});
