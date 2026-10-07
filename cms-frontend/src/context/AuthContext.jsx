import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance, { setLeaderScopeHeader } from '../api/axiosInstance';

const AuthContext = createContext(null);

const normalizeUser = (user, forcePasswordChange = false) => ({
  ...user,
  forcePasswordChange: Boolean(forcePasswordChange),
  leaderAssignments: (Array.isArray(user.leaderAssignments) ? user.leaderAssignments : []).map((assignment) => ({
    ...assignment,
    scopeType: assignment.scopeType || (assignment.scope_type === 'member_group' ? 'group' : assignment.scope_type),
    scopeId: assignment.scopeId ?? Number(assignment.scope_id),
    scopeKey: assignment.scopeKey || `${assignment.scope_type === 'member_group' ? 'group' : assignment.scope_type}:${assignment.scope_id}`,
    teamName: assignment.teamName || assignment.team_name || `${assignment.scope_type === 'cell_group' ? 'Cell group' : 'Group'} #${assignment.scope_id}`,
  })),
  leadsCellGroupId: user.leadsCellGroupId || null,
  leadsGroupId: user.leadsGroupId || null,
  leadsMinistryId: user.leadsMinistryId || null,
  leadsCellGroupName: user.leadsCellGroupName || null,
  leadsGroupName: user.leadsGroupName || null,
  leadsMinistryName: user.leadsMinistryName || null,
});

const initialLeaderScope = (nextUser, previousKey = null) => {
  if (nextUser?.roleName !== 'Leader') return null;
  const assignments = nextUser.leaderAssignments || [];
  if (previousKey === 'all' && assignments.length > 1) return 'all';
  if (assignments.some((assignment) => assignment.scopeKey === previousKey)) return previousKey;
  if (assignments.length === 1) return assignments[0].scopeKey;
  return 'all';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [activeLeaderScopeKey, setActiveLeaderScopeKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const authRevision = useRef(0);
  const permSet = useMemo(() => new Set(permissions), [permissions]);

  const selectLeaderScope = (scopeKey, { reload = false } = {}) => {
    if (user?.roleName !== 'Leader') return false;
    const valid = scopeKey === 'all' || user.leaderAssignments?.some((assignment) => assignment.scopeKey === scopeKey);
    if (!valid) return false;
    setLeaderScopeHeader(scopeKey);
    setActiveLeaderScopeKey(scopeKey);
    setUser((current) => current && ({ ...current, activeLeaderScopeKey: scopeKey }));
    try {
      window.sessionStorage.setItem('mcc-leader-scope', scopeKey);
    } catch {
      // Session storage can be disabled; the in-memory scope still works.
    }
    if (reload) window.location.reload();
    return true;
  };

  const hasLeaderPermission = (scopeKey, module, action) => {
    if (user?.roleName !== 'Leader') return permSet.has(`${module}:${action}`);
    const permission = `${module}:${action}`;
    const assignments = user.leaderAssignments || [];
    if (scopeKey === 'all') {
      return action === 'read' && assignments.some((assignment) => assignment.permissions?.includes(permission));
    }
    return Boolean(assignments.find((assignment) => assignment.scopeKey === scopeKey)?.permissions?.includes(permission));
  };

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
        const restoredUser = data.user ? normalizeUser(data.user, data.forcePasswordChange) : null;
        let savedScope = null;
        try { savedScope = window.sessionStorage.getItem('mcc-leader-scope'); } catch { /* storage is optional */ }
        const restoredScope = initialLeaderScope(restoredUser, savedScope);
        setLeaderScopeHeader(restoredScope);
        setUser(restoredUser ? { ...restoredUser, activeLeaderScopeKey: restoredScope } : null);
        setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
        setActiveLeaderScopeKey(restoredScope);
      } catch {
        if (!mounted || authRevision.current !== revision) return;
        setUser(null);
        setPermissions([]);
        setLeaderScopeHeader(null);
        setActiveLeaderScopeKey(null);
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
      const initialScope = initialLeaderScope(normalizedUser);
      const scopedUser = { ...normalizedUser, activeLeaderScopeKey: initialScope };

      if (authRevision.current === revision) {
        setLeaderScopeHeader(initialScope);
        setUser(scopedUser);
        setPermissions(Array.isArray(responsePermissions) ? responsePermissions : []);
        setActiveLeaderScopeKey(initialScope);
      }

      return { forcePasswordChange: scopedUser.forcePasswordChange, user: scopedUser };
    } finally {
      if (authRevision.current === revision) setLoading(false);
    }
  };

  const clearForcePasswordChange = () => {
    setUser((current) => current && { ...current, forcePasswordChange: false });
  };

  const logout = async () => {
    const revision = ++authRevision.current;
    setLeaderScopeHeader(null);
    try { window.sessionStorage.removeItem('mcc-leader-scope'); } catch { /* storage is optional */ }
    try {
      await axiosInstance.post('/auth/logout', {});
    } catch {
      // The session may already have expired or been revoked.
    } finally {
      if (authRevision.current === revision) {
        setUser(null);
        setPermissions([]);
        setLeaderScopeHeader(null);
        setActiveLeaderScopeKey(null);
        setLoading(false);
      }
    }
  };

  const hasPermission = (module, action) => {
    if (user?.roleName === 'System Admin') return true;
    if (user?.roleName === 'Leader') return hasLeaderPermission(activeLeaderScopeKey, module, action);
    return permSet.has(`${module}:${action}`);
  };

  return (
    <AuthContext.Provider
      value={{ user, permissions, loading, login, logout, hasPermission, hasLeaderPermission, activeLeaderScopeKey, selectLeaderScope, clearForcePasswordChange }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
