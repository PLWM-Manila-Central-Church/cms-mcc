import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('../api/axiosInstance', () => ({
  default: { get: mocks.get, post: mocks.post },
}));

import { AuthProvider, useAuth } from './AuthContext';

function PermissionProbe({ module, action }) {
  const { hasPermission, loading } = useAuth();
  return <output data-testid="permission-result">{loading ? 'loading' : String(hasPermission(module, action))}</output>;
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
});
