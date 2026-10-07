import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

const normalizeUser = (user, forcePasswordChange = false) => ({
  ...user,
  forcePasswordChange: Boolean(forcePasswordChange),
  leadsCellGroupId: user.leadsCellGroupId || null,
  leadsGroupId: user.leadsGroupId || null,
  leadsMinistryId: user.leadsMinistryId || null,
  leadsCellGroupName: user.leadsCellGroupName || null,
  leadsGroupName: user.leadsGroupName || null,
  leadsMinistryName: user.leadsMinistryName || null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const authRevision = useRef(0);
  const permSet = useMemo(() => new Set(permissions), [permissions]);

  useEffect(() => {
    let mounted = true;
    const revision = authRevision.current;

    const restoreSession = async () => {
      try {
        const response = await axiosInstance.get('/auth/session', {
          _skipAuthRedirect: true,
        });
        if (!mounted || authRevision.current !== revision) return;

        const data = response.data?.data || {};
        setUser(data.user ? normalizeUser(data.user, data.forcePasswordChange) : null);
        setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
      } catch {
        if (!mounted || authRevision.current !== revision) return;
        setUser(null);
        setPermissions([]);
      } finally {
        if (mounted && authRevision.current === revision) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const revision = ++authRevision.current;
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { user: responseUser, permissions: responsePermissions, forcePasswordChange } = response.data.data;
      const normalizedUser = normalizeUser(responseUser, forcePasswordChange);

      if (authRevision.current === revision) {
        setUser(normalizedUser);
        setPermissions(Array.isArray(responsePermissions) ? responsePermissions : []);
      }

      return { forcePasswordChange: normalizedUser.forcePasswordChange, user: normalizedUser };
    } finally {
      if (authRevision.current === revision) setLoading(false);
    }
  };

  const clearForcePasswordChange = () => {
    setUser((current) => current && { ...current, forcePasswordChange: false });
  };

  const logout = async () => {
    const revision = ++authRevision.current;
    try {
      await axiosInstance.post('/auth/logout', {});
    } catch {
      // The session may already have expired or been revoked.
    } finally {
      if (authRevision.current === revision) {
        setUser(null);
        setPermissions([]);
        setLoading(false);
      }
    }
  };

  const hasPermission = (module, action) =>
    user?.roleName === 'System Admin' || permSet.has(`${module}:${action}`);

  return (
    <AuthContext.Provider
      value={{ user, permissions, loading, login, logout, hasPermission, clearForcePasswordChange }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
