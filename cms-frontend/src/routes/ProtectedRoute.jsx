import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_ALLOWED_PATHS = {
  'Ministry Leader': ['/dashboard', '/ministry', '/events', '/attendance', '/inventory', '/archives', '/my-settings'],
  'Cell Group Leader': ['/dashboard', '/cell-groups', '/attendance', '/events', '/inventory', '/archives', '/my-settings'],
  'Group Leader': ['/dashboard', '/members', '/attendance', '/events', '/services', '/inventory', '/archives', '/my-settings'],
};

const isAllowedForRole = (roleName, pathname) => {
  const allowed = ROLE_ALLOWED_PATHS[roleName];
  if (!allowed) return true;
  if (pathname === '/force-change-password' || pathname === '/unauthorized') return true;
  if (roleName === 'Ministry Leader' && pathname.startsWith('/services/')) return true;
  if (roleName === 'Cell Group Leader' && /^\/services\/[^/]+\/attendance$/.test(pathname)) return true;
  return allowed.some(path => pathname === path || pathname.startsWith(`${path}/`));
};

const ProtectedRoute = ({ children, module, action }) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user must change password, only allow /force-change-password
  if (user.forcePasswordChange && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" replace />;
  }

  if (!isAllowedForRole(user.roleName, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (module && action && !hasPermission(module, action)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
