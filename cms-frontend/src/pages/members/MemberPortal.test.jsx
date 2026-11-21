import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get, post: state.post } }));
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
    if (path === '/member-portal/events') data = [{ id: 1, title: 'Sample Event', event_date: '2099-10-18', registration_deadline: '2099-10-17', capacity: 100, registration_count: 1, image_url: '/events/1/image' }];
    return { data: { data } };
  });
});
test('Member event details is named, keyboard dismissible and returns focus', async () => {
  render(<MemoryRouter initialEntries={['/portal?tab=events']}><MemberPortal /></MemoryRouter>);
  const trigger = await screen.findByRole('button', { name: 'View Details' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Event Details' })).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByRole('button', { name: 'Close event details' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe('');
  expect(screen.getByRole('button', { name: 'Events', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('shows uploaded event artwork in the member event list and details', async () => {
  render(<MemoryRouter initialEntries={['/portal?tab=events']}><MemberPortal /></MemoryRouter>);
  const eventImages = await screen.findAllByAltText('Sample Event event');
  expect(eventImages[0]).toHaveAttribute('src', '/api/events/1/image');

  fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
  expect((await screen.findAllByAltText('Sample Event event')).length).toBeGreaterThan(1);
});

test('shows the next Sunday memory verse on the overview', async () => {
  state.get.mockImplementation(async (path) => {
    let data = [];
    if (path === '/member-portal/profile') data = { first_name: 'Sample', last_name: 'Member', gender: 'Male' };
    if (path === '/member-portal/attendance') data = { records: [], rate: 0 };
    if (path === '/member-portal/memory-verse') data = { group: 'Choir', verse: { reference: 'Psalm 23:1-6', verse_text: 'The LORD is my shepherd.' } };
    return { data: { data } };
  });

  render(<MemoryRouter initialEntries={['/portal']}><MemberPortal /></MemoryRouter>);
  expect(await screen.findByText('The LORD is my shepherd.')).toBeInTheDocument();
  expect(screen.getByText('Psalm 23:1-6')).toBeInTheDocument();
  expect(screen.getByText(/Memory verse · Choir/)).toBeInTheDocument();
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
