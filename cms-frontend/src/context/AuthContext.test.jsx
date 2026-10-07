import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), setLeaderScopeHeader: vi.fn() }));

vi.mock('../api/axiosInstance', () => ({
  default: { get: mocks.get, post: mocks.post },
  setLeaderScopeHeader: mocks.setLeaderScopeHeader,
}));

import { AuthProvider, useAuth } from './AuthContext';

function PermissionProbe({ module, action }) {
  const { hasPermission, loading } = useAuth();
  return <output data-testid="permission-result">{loading ? 'loading' : String(hasPermission(module, action))}</output>;
}

function SessionProbe() {
  const { user, activeLeaderScopeKey, logout, login } = useAuth();
  return (
    <div>
      <output data-testid="current-role">{user?.roleName || 'signed-out'}</output>
      <output data-testid="current-scope">{activeLeaderScopeKey || 'none'}</output>
      <button type="button" onClick={() => logout()}>Sign out</button>
      <button type="button" onClick={() => login('next-member@example.invalid', 'TestPass123')}>Sign in member</button>
    </div>
  );
}

const renderPermission = async ({ user, permissions, module, action }) => {
  mocks.get.mockResolvedValueOnce({ data: { data: { user, permissions } } });
  render(
    <AuthProvider>
      <PermissionProbe module={module} action={action} />
    </AuthProvider>,
  );
  return screen.findByTestId('permission-result');
};

describe('AuthContext permissions', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.setLeaderScopeHeader.mockReset();
    window.sessionStorage.clear();
  });

  it('matches the API System Admin permission bypass', async () => {
    const result = await renderPermission({
      user: { id: 1, roleName: 'System Admin' },
      permissions: [],
      module: 'settings',
      action: 'read',
    });

    expect(result).toHaveTextContent('true');
  });

  it('keeps non-admin access limited to granted permissions', async () => {
    const result = await renderPermission({
      user: { id: 2, roleName: 'Registration Team' },
      permissions: ['qr_attendance:read', 'qr_attendance:check_in'],
      module: 'settings',
      action: 'read',
    });

    expect(result).toHaveTextContent('false');
  });

  it('keeps combined Leader context read-only even when the common role has a write grant', async () => {
    const result = await renderPermission({
      user: {
        id: 3,
        roleName: 'Leader',
        leaderAssignments: [{
          scopeType: 'cell_group',
          scopeId: 8,
          scopeKey: 'cell_group:8',
          teamName: 'Cell Group 8',
          permissions: ['qr_attendance:read', 'qr_attendance:record_batch'],
        }, {
          scopeType: 'group',
          scopeId: 3,
          scopeKey: 'member_group:3',
          teamName: 'Group 3',
          permissions: ['qr_attendance:read', 'qr_attendance:record_batch'],
        }],
      },
      permissions: ['qr_attendance:record_batch'],
      module: 'qr_attendance',
      action: 'record_batch',
    });

    expect(result).toHaveTextContent('false');
  });

  it('allows a Leader read that is present in an assigned permission profile', async () => {
    const result = await renderPermission({
      user: {
        id: 4,
        roleName: 'Leader',
        leaderAssignments: [{
          scopeType: 'group',
          scopeId: 3,
          scopeKey: 'member_group:3',
          teamName: 'Group 3',
          permissions: ['members:read'],
        }],
      },
      permissions: [],
      module: 'members',
      action: 'read',
    });

    expect(result).toHaveTextContent('true');
  });

  it('clears Leader scope across logout and a different account login', async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        data: {
          user: {
            id: 5,
            roleName: 'Leader',
            leaderAssignments: [
              { scopeType: 'cell_group', scopeId: 8, scopeKey: 'cell_group:8', permissions: ['qr_attendance:read'] },
              { scopeType: 'group', scopeId: 3, scopeKey: 'member_group:3', permissions: ['qr_attendance:read'] },
            ],
          },
          permissions: [],
        },
      },
    });
    mocks.post
      .mockResolvedValueOnce({ data: { data: { message: 'Logged out' } } })
      .mockResolvedValueOnce({
        data: { data: { user: { id: 6, roleName: 'Member' }, permissions: [], forcePasswordChange: false } },
      });

    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('current-role')).toHaveTextContent('Leader'));
    expect(screen.getByTestId('current-scope')).toHaveTextContent('all');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByTestId('current-role')).toHaveTextContent('signed-out'));
    expect(window.sessionStorage.getItem('mcc-leader-scope')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in member' }));
    await waitFor(() => expect(screen.getByTestId('current-role')).toHaveTextContent('Member'));
    expect(screen.getByTestId('current-scope')).toHaveTextContent('none');
    expect(mocks.setLeaderScopeHeader).toHaveBeenLastCalledWith(null);
  });
});
