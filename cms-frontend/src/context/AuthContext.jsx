import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

const parseStoredPermissions = (value) => {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const permSet = useMemo(() => new Set(permissions), [permissions]);

  useEffect(() => {
      // Read user and permissions from cookies (set by backend on login)
      // document.cookie is parsed manually — no need for a cookie library for ~4 cookies
      const parseCookie = (name) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
      };

      const storedUser        = parseCookie('user');
      const storedPermissions = parseCookie('permissions');
      const accessToken       = parseCookie('accessToken');

      if (storedUser && accessToken) {
        try {
          setUser(JSON.parse(storedUser));
          setPermissions(parseStoredPermissions(storedPermissions));
        } catch {
          // corrupted cookie — ignore
        }
      }
      setLoading(false);
    }, []);

  const login = async (email, password) => {
      const res = await axiosInstance.post('/auth/login', { email, password });
      const { user, permissions, forcePasswordChange } = res.data.data;

      // user and permissions are already set as cookies by the server
      // Just update React state
      const userWithFlag = {
        ...user,
        forcePasswordChange: !!forcePasswordChange,
        leadsCellGroupId:   user.leadsCellGroupId || null,
        leadsGroupId:       user.leadsGroupId || null,
        leadsMinistryId:     user.leadsMinistryId || null,
        leadsCellGroupName: user.leadsCellGroupName || null,
        leadsGroupName:     user.leadsGroupName || null,
        leadsMinistryName:  user.leadsMinistryName || null,
      };

      setUser(userWithFlag);
      setPermissions(permissions || []);

      return { forcePasswordChange };
    };

    const clearForcePasswordChange = () => {
      const updatedUser = { ...user, forcePasswordChange: false };
      setUser(updatedUser);
    };

    const logout = async () => {
        try {
          await axiosInstance.post('/auth/logout', {});
        } catch (err) {
          // silent — server may already have invalidated the token
        } finally {
          // Server clears all auth cookies; just reset React state
          setUser(null);
          setPermissions([]);
        }
      };

  const hasPermission = (module, action) => {
    return permSet.has(`${module}:${action}`);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, hasPermission, clearForcePasswordChange }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
