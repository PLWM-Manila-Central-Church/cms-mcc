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
    const storedUser        = localStorage.getItem('user');
    const storedPermissions = localStorage.getItem('permissions');
    const accessToken       = localStorage.getItem('accessToken');

    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
      setPermissions(parseStoredPermissions(storedPermissions));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await axiosInstance.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user, permissions, forcePasswordChange } = res.data.data;

    // Store forcePasswordChange and leader scope ids inside the user object.
    // forcePasswordChange: enforced by ProtectedRoute on next navigation.
    // leadsMinistryId: used by Ministry Leader scoping.
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

    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user',         JSON.stringify(userWithFlag));
    localStorage.setItem('permissions',  JSON.stringify(permissions));

    setUser(userWithFlag);
    setPermissions(permissions);

    return { forcePasswordChange };
  };

  const clearForcePasswordChange = () => {
    const updatedUser = { ...user, forcePasswordChange: false };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await axiosInstance.post('/auth/logout', { refresh_token: refreshToken });
    } catch (err) {
      // silent
    } finally {
      localStorage.clear();
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
