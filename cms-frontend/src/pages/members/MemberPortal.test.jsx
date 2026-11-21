import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get, post: state.post } }));
const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const DAY_LABEL = new Date(`${TODAY}T00:00:00Z`).toLocaleDateString('en-PH', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: 'Member', email: 'sample@example.com' }, logout: vi.fn() }) }));
vi.mock('../../context/ConfirmationContext', () => ({ useConfirmation: () => ({ confirm: vi.fn() }) }));
vi.mock('../../utils/langUtils', () => ({ LANGS: [], getLangCode: () => 'en', saveLangCode: vi.fn(), loadGTScript: vi.fn(), applyGTLang: vi.fn() }));
vi.mock('../../components/common/MemberNotificationCenter', () => ({ default: () => null }));
import MemberPortal from './MemberPortal';
test('shows a neutral attendance state when the period contains no services', async () => {
  render(<MemoryRouter initialEntries={['/portal?tab=attendance']}><MemberPortal /></MemoryRouter>);
  expect(await screen.findByText('No services in this period')).toBeInTheDocument();
  expect(screen.queryByText('Needs Improvement')).not.toBeInTheDocument();
});
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  localStorage.clear();
  state.get.mockImplementation(async path => {
    let data = [];
    if (path === '/member-portal/profile') data = { first_name: 'Sample', last_name: 'Member', gender: 'Male' };
    if (path === '/member-portal/attendance') data = { records: [], rate: 0 };
    if (path.startsWith('/member-portal/finance')) data = { records: [], summary: {} };
    if (path === '/member-portal/events') data = [{ id: 1, title: 'Sample Event', start_date: TODAY, end_date: TODAY, registration_deadline: '2099-12-31', capacity: 100, registration_count: 1, image_url: '/events/1/image', status: 'Upcoming' }];
    return { data: { data } };
  });
});
test('Member event details is named, keyboard dismissible and returns focus', async () => {
  render(<MemoryRouter initialEntries={['/portal?tab=events']}><MemberPortal /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('gridcell', { name: new RegExp(DAY_LABEL) }));
  const trigger = await screen.findByRole('button', { name: 'View details' });
  fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Event Details' })).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByRole('button', { name: 'Close event details' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole('button', { name: `Open ${DAY_LABEL}` })).toHaveFocus());
  expect(document.body.style.overflow).toBe('');
  expect(screen.getByRole('button', { name: 'Calendar', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('shows the calendar and the uploaded artwork in the event details', async () => {
  render(<MemoryRouter initialEntries={['/portal?tab=events']}><MemberPortal /></MemoryRouter>);

  expect(await screen.findByRole('grid', { name: /2026/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('gridcell', { name: new RegExp(DAY_LABEL) }));
  fireEvent.click(await screen.findByRole('button', { name: 'View details' }));
  expect((await screen.findAllByAltText('Sample Event event'))[0]).toHaveAttribute('src', '/api/events/1/image');
});

test('shows the next Sunday memory verse on the overview', async () => {
  state.get.mockImplementation(async (path) => {
    let data = [];
    if (path === '/member-portal/profile') data = { first_name: 'Sample', last_name: 'Member', gender: 'Male' };
    if (path === '/member-portal/attendance') data = { records: [], rate: 0 };
    if (path === '/member-portal/memory-verse') data = { group: 'Choir', verse: { reference: 'Psalm 23:1-6', verse_text: 'The LORD is my shepherd.' } };
    return { data: { data } };
  });

  render(<MemoryRouter initialEntries={['/portal?tab=overview']}><MemberPortal /></MemoryRouter>);
  expect(await screen.findByText('The LORD is my shepherd.')).toBeInTheDocument();
  expect(screen.getByText('Psalm 23:1-6')).toBeInTheDocument();
  expect(screen.getByText(/Memory verse · Choir/)).toBeInTheDocument();
});

test('hides the giving total on the overview with the same eye control', async () => {
  state.get.mockImplementation(async path => {
    let data = [];
    if (path === '/member-portal/profile') data = { first_name: 'Sample', last_name: 'Member', gender: 'Male' };
    if (path === '/member-portal/attendance') data = { records: [], rate: 0 };
    if (path.startsWith('/member-portal/finance')) data = { ytdTotal: 1200, total: 0, total_pages: 1, records: [] };
    return { data: { data } };
  });

  render(<MemoryRouter initialEntries={['/portal?tab=overview']}><MemberPortal /></MemoryRouter>);
  expect(await screen.findByText('₱1,200.00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Hide amounts' }));
  expect(await screen.findByText('₱ ••••')).toBeInTheDocument();
  expect(screen.queryByText('₱1,200.00')).not.toBeInTheDocument();
  expect(localStorage.getItem('plwm_money_hidden')).toBe('1');
});

test('hides every tithe amount behind one control and remembers it', async () => {
  state.get.mockImplementation(async path => {
    let data = [];
    if (path === '/member-portal/profile') data = { first_name: 'Sample', last_name: 'Member', gender: 'Male' };
    if (path === '/member-portal/attendance') data = { records: [], rate: 0 };
    if (path.startsWith('/member-portal/finance')) {
      data = {
        ytdTotal: 1200,
        total: 1,
        total_pages: 1,
        records: [{ id: 9, amount: 1200, transaction_date: '2026-11-01', category: { name: 'Tithe' }, attachments: [] }],
      };
    }
    return { data: { data } };
  });

  render(<MemoryRouter initialEntries={['/portal?tab=tithes']}><MemberPortal /></MemoryRouter>);

  const toggle = await screen.findByRole('button', { name: 'Hide amounts' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getAllByText('₱1,200.00').length).toBeGreaterThan(0);

  fireEvent.click(toggle);

  expect(await screen.findByRole('button', { name: 'Show amounts' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByText('₱1,200.00')).not.toBeInTheDocument();
  expect(screen.getAllByText('₱ ••••').length).toBeGreaterThan(0);
  expect(localStorage.getItem('plwm_money_hidden')).toBe('1');
});
