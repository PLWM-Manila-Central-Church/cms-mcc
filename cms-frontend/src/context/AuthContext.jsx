import { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const storedUser        = localStorage.getItem('user');
    const storedPermissions = localStorage.getItem('permissions');
    const accessToken       = localStorage.getItem('accessToken');

    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
      setPermissions(JSON.parse(storedPermissions || '[]'));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await axiosInstance.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user, permissions, forcePasswordChange } = res.data.data;

    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user',         JSON.stringify(user));
    localStorage.setItem('permissions',  JSON.stringify(permissions));

    setUser(user);
    setPermissions(permissions);

    return { forcePasswordChange };
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
    return permissions.includes(`${module}:${action}`);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);