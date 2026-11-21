import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import BibleReadingPage from './BibleReadingPage';

const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../../api/axiosInstance', () => ({ default: { get: state.get, post: state.post, delete: state.delete } }));

beforeEach(() => {
  state.get.mockReset(); state.post.mockReset(); state.delete.mockReset();
  state.get.mockImplementation(async (path) => {
    if (path === '/bible-reading/summary') return { data: { data: {
      month: '2026-03', target: 31, total: 2, finished: 1,
      members: [
        { member_id: 1, name: 'Ana Cruz', completed: 31, target: 31, percent: 100, finished: true },
        { member_id: 2, name: 'Ben Reyes', completed: 4, target: 31, percent: 13, finished: false },
      ],
    } } };
    if (path === '/bible-reading/verses') return { data: { data: [
      { id: 7, group: 'Choir', group_id: 2, sunday_date: '2026-03-08', reference: 'John 3:16', verse_text: 'For God so loved the world.' },
    ] } };
    if (path === '/members/dropdowns/groups') return { data: { data: [{ id: 2, name: 'Choir' }] } };
    return { data: { data: [] } };
  });
  state.post.mockResolvedValue({ data: { data: { id: 8 } } });
  state.delete.mockResolvedValue({ data: { success: true } });
});

test('shows who finished the month and the assigned verses', async () => {
  render(<BibleReadingPage />);
  expect(await screen.findByText('Ana Cruz')).toBeInTheDocument();
  expect(screen.getByText('Ben Reyes')).toBeInTheDocument();
  expect(screen.getByText('31 / 31')).toBeInTheDocument();
  expect(screen.getByText('4 / 31')).toBeInTheDocument();
  expect(screen.getByText('Finished')).toBeInTheDocument();
  expect(screen.getByText(/John 3:16/)).toBeInTheDocument();
  expect(screen.getByText(/1 of 2 members finished/)).toBeInTheDocument();
});

test('assigns a verse and removes one', async () => {
  render(<BibleReadingPage />);
  await screen.findByText('Ana Cruz');

  fireEvent.change(screen.getByLabelText('Group'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Sunday'), { target: { value: '2026-03-15' } });
  fireEvent.change(screen.getByLabelText('Reference'), { target: { value: 'Psalm 23' } });
  fireEvent.change(screen.getByLabelText('Verse text'), { target: { value: 'The LORD is my shepherd.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Assign verse' }));

  await waitFor(() => expect(state.post).toHaveBeenCalledWith('/bible-reading/verses', expect.objectContaining({
    group_id: '2', sunday_date: '2026-03-15', reference: 'Psalm 23',
  })));

  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  await waitFor(() => expect(state.delete).toHaveBeenCalledWith('/bible-reading/verses/7'));
});
