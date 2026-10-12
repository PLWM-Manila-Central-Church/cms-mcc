import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, test, expect, beforeEach } from 'vitest';
import axiosInstance from '../../api/axiosInstance';
import UserFormPage from './UserFormPage';
vi.mock('../../api/axiosInstance', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  axiosInstance.get.mockImplementation(async url => ({ data: { data: url === '/roles/list' ? [{ id: 2, role_name: 'Pastor' }] : [] } }));
});
test('a new login can explicitly link the preserved Member after a duplicate-profile response', async () => {
  axiosInstance.post.mockRejectedValueOnce({ response: { data: { error: {
    code: 'MEMBER_PROFILE_EXISTS', message: 'Link the preserved Member.',
    details: { member: { id: 42, first_name: 'Existing', last_name: 'Member' } },
  } } } }).mockResolvedValueOnce({ data: { success: true } });
  render(<MemoryRouter initialEntries={['/users/new']}><Routes><Route path="/users/new" element={<UserFormPage />} /><Route path="/users" element={<p>Users listing</p>} /></Routes></MemoryRouter>);
  await screen.findByRole('option', { name: 'Pastor' });
  fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: 'New' } });
  fireEvent.change(screen.getByPlaceholderText('dela Cruz'), { target: { value: 'Login' } });
  fireEvent.change(screen.getByPlaceholderText('user@plwmmcc.com'), { target: { value: 'pastor@plwmmcc.com' } });
  fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'Example123@' } });
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create User' }));
  await screen.findByText('Link the preserved Member.');
  fireEvent.click(screen.getByRole('button', { name: 'Use existing Member profile' }));
  expect(screen.getByPlaceholderText('Juan')).toBeDisabled();
  expect(screen.getByPlaceholderText('Juan')).toHaveValue('Existing');
  fireEvent.click(screen.getByRole('button', { name: 'Create User' }));
  await waitFor(() => expect(axiosInstance.post).toHaveBeenLastCalledWith('/users', expect.objectContaining({ member_id: 42, first_name: 'Existing', last_name: 'Member' })));
  await screen.findByText('Users listing');
});
