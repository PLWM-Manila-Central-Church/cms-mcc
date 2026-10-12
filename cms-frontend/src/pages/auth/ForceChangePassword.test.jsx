import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
const state = vi.hoisted(() => ({ role: 'Pastor', navigate: vi.fn(), put: vi.fn(), clear: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => state.navigate }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { roleName: state.role, memberId: 99 }, clearForcePasswordChange: state.clear, logout: vi.fn() }) }));
vi.mock('../../api/axiosInstance', () => ({ default: { put: state.put } }));
import ForceChangePassword from './ForceChangePassword';
beforeEach(() => { vi.clearAllMocks(); state.put.mockResolvedValue({ data: { success: true } }); });
test.each(['Pastor','Finance Team','Registration Team','Leader','Ministry Leader','Member'])(
  '%s reaches its authorized landing page after first-login password change', async role => {
    state.role = role;
    const { container } = render(<ForceChangePassword />);
    for (const name of ['current_password','new_password','confirm_password']) {
      fireEvent.change(container.querySelector(`input[name="${name}"]`), { target: { value: 'Example123@' } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith(role === 'Member' ? '/portal' : '/dashboard'));
    expect(state.clear).toHaveBeenCalled();
  },
);
