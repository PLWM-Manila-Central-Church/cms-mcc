import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import BibleReadingPanel from './BibleReadingPanel';

const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get, post: state.post } }));

const colors = {
  surface: '#fff', surfaceAlt: '#f8fafc', border: '#e2e8f0', borderL: '#f1f5f9',
  t1: '#0f172a', t2: '#475569', t3: '#64748b', accent: '#005599', accentT: '#005599',
  accentL: '#eff6ff', danger: '#dc2626', success: '#16a34a',
};
const fonts = { xs: 11, sm: 13, base: 14, md: 15, lg: 18, stat: 26 };

const monthFixture = {
  month: '2026-03',
  today: '2026-03-03',
  target: 31,
  count: 1,
  percent: 3,
  completed: ['2026-03-01'],
  group: 'Choir',
  days: [
    { date: '2026-03-01', day: 'Sun', ot: 'Lev 1-3', nt: 'Mark 1', ps: 'Ps 50', placeholder: false },
    { date: '2026-03-02', day: 'Mon', ot: 'Lev 4/5', nt: 'Mark 2', ps: 'Ps 51', placeholder: false },
    { date: '2026-03-03', day: 'Tue', ot: 'Lev 6/7', nt: 'Mark 3', ps: 'Ps 52', placeholder: false },
  ],
  memoryVerse: {
    latestSunday: '2026-03-01',
    upcomingSunday: '2026-03-08',
    verse: { reference: 'John 3:16', verse_text: 'For God so loved the world.' },
    thisSundayVerse: null,
  },
};

beforeEach(() => {
  state.get.mockReset();
  state.post.mockReset();
  state.get.mockResolvedValue({ data: { data: monthFixture } });
  state.post.mockResolvedValue({ data: { data: { completed: true } } });
});

test('shows the next Sunday memory verse for the member group', async () => {
  render(<BibleReadingPanel c={colors} f={fonts} labels={{}} />);
  expect(await screen.findByText('For God so loved the world.')).toBeInTheDocument();
  expect(screen.getByText('John 3:16')).toBeInTheDocument();
  expect(screen.getByText(/Choir · Sunday, Mar 8/)).toBeInTheDocument();
});

test('shows the day readings and marks the selected day as read', async () => {
  render(<BibleReadingPanel c={colors} f={fonts} labels={{}} />);
  const done = await screen.findByRole('gridcell', { name: '2026-03-01, completed' });
  expect(done).toBeInTheDocument();

  fireEvent.click(screen.getByRole('gridcell', { name: '2026-03-02' }));
  expect(screen.getByText('Monday, March 2, 2026')).toBeInTheDocument();
  expect(screen.getAllByText('Mark 2').length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
  await waitFor(() => expect(state.post).toHaveBeenCalledWith('/member-portal/bible-reading/2026-03-02'));
});

test('explains an unpublished day and keeps future days unmarkable', async () => {
  state.get.mockResolvedValue({ data: { data: {
    ...monthFixture,
    days: [
      ...monthFixture.days,
      { date: '2026-03-09', day: 'Mon', ot: null, nt: null, ps: null, placeholder: true },
      { date: '2026-04-01', day: 'Wed', ot: 'Judg 1', nt: 'Luke 1', ps: 'Ps 90', placeholder: false },
    ],
  } } });
  render(<BibleReadingPanel c={colors} f={fonts} labels={{}} />);

  fireEvent.click(await screen.findByRole('gridcell', { name: '2026-03-09' }));
  expect(screen.getByText('No reading is published for this day.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('gridcell', { name: '2026-04-01' }));
  expect(screen.getAllByText('Judg 1').length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument();
});

test('explains that the month is not published yet instead of showing a blank grid', async () => {
  state.get.mockResolvedValue({ data: { data: {
    month: '2026-08', today: '2026-03-03', target: 0, count: 0, percent: 0, completed: [],
    days: [{ date: '2026-08-01', day: 'Sat', ot: null, nt: null, ps: null, placeholder: true }],
    memoryVerse: { latestSunday: '2026-03-01', upcomingSunday: '2026-03-08', verse: null, thisSundayVerse: null },
  } } });
  render(<BibleReadingPanel c={colors} f={fonts} labels={{}} />);
  expect(await screen.findByText(/has not been published yet/)).toBeInTheDocument();
  expect(screen.queryByRole('gridcell')).not.toBeInTheDocument();
});
