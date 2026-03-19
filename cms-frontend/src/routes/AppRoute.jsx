import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

// Auth
import LoginPage from '../pages/auth/LoginPage';
import ForceChangePassword from '../pages/auth/ForceChangePassword';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

// CMS (protected)
import MembersPage       from '../pages/members/MembersPage';
import MemberFormPage    from '../pages/members/MemberFormPage';
import MemberProfilePage from '../pages/members/MemberProfilePage';
import MemberPortal      from '../pages/members/MemberPortal';
import MemberPortalSettings from '../pages/members/MemberPortalSettings';
import CellGroupsPage    from '../pages/cellgroups/CellGroupsPage';
import MinistryPage      from '../pages/ministry/MinistryPage';
import UsersPage         from '../pages/users/UsersPage';
import UserFormPage      from '../pages/users/UserFormPage';
import ServicesPage      from '../pages/services/ServicesPage';
import AttendancePage    from '../pages/attendance/AttendancePage';
import FinancePage       from '../pages/finance/FinancePage';
import MyGivingPage      from '../pages/finance/MyGivingPage';
import AttendanceOverviewPage from '../pages/attendance/AttendanceOverviewPage';
import EventsPage        from '../pages/events/EventsPage';
import EventDetailPage   from '../pages/events/EventDetailPage';
import InventoryPage     from '../pages/inventory/InventoryPage';
import ArchivesPage      from '../pages/archives/ArchivesPage';
import AuditLogPage      from '../pages/audit/AuditLogPage';
import SettingsPage      from '../pages/settings/SettingsPage';
import DashboardPage     from '../pages/dashboard/DashboardPage';

// Public site (no auth)
import HomePage                 from '../pages/public/HomePage';
import BibleSeminarPage         from '../pages/public/BibleSeminarPage';
import BibleSeminarAdultsPage   from '../pages/public/BibleSeminarAdultsPage';
import BibleSeminarSchedulePage from '../pages/public/BibleSeminarSchedulePage';
import LatestSermonPage         from '../pages/public/LatestSermonPage';
import {
  SermonPage, SundaySermonPage, ChristianLifePage,
  WorldMissionPage, MissionStatusPage,
  IntroductionPage, WhatWeBelievePage, CIPage,
} from '../pages/public/OtherPages';

const UnauthorizedPage = () => (
  <div style={{ padding: 48, textAlign: 'center' }}>
    <h1>Unauthorized</h1>
    <p>You do not have permission to view this page.</p>
  </div>
);

// Members can ONLY access /portal — redirect everyone else away from it
const PortalRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.roleName !== 'Member') return <Navigate to="/dashboard" replace />;
  // If first login, must change password first
  if (user.forcePasswordChange && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" replace />;
  }
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  // Where to redirect logged-in users trying to access login/public auth pages
  const homeRedirect = user?.roleName === 'Member' ? '/portal' : '/dashboard';

  return (
    <Routes>
      {/* ── Public Church Website (no auth) ── */}
      <Route path="/"                         element={<HomePage />} />
      <Route path="/bible-seminar"            element={<BibleSeminarPage />} />
      <Route path="/bible-seminar/adults"     element={<BibleSeminarAdultsPage />} />
      <Route path="/bible-seminar/schedule"   element={<BibleSeminarSchedulePage />} />
      <Route path="/sermon"                   element={<SermonPage />} />
      <Route path="/sermon/latest"            element={<LatestSermonPage />} />
      <Route path="/sermon/sunday"            element={<SundaySermonPage />} />
      <Route path="/sermon/christian-life"    element={<ChristianLifePage />} />
      <Route path="/world-mission"            element={<WorldMissionPage />} />
      <Route path="/world-mission/status"     element={<MissionStatusPage />} />
      <Route path="/introduction"             element={<IntroductionPage />} />
      <Route path="/introduction/beliefs"     element={<WhatWeBelievePage />} />
      <Route path="/introduction/ci"          element={<CIPage />} />

      {/* ── Auth ── */}
      <Route path="/login"           element={user ? <Navigate to={homeRedirect} replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to={homeRedirect} replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password"  element={user ? <Navigate to={homeRedirect} replace /> : <ResetPasswordPage />} />
      <Route path="/force-change-password" element={<ProtectedRoute><ForceChangePassword /></ProtectedRoute>} />

      {/* ── Member Portal (Member role only, no sidebar) ── */}
      <Route path="/portal"          element={<PortalRoute><MemberPortal /></PortalRoute>} />
      <Route path="/portal/settings" element={<PortalRoute><MemberPortalSettings /></PortalRoute>} />

      {/* ── CMS (protected) ── */}
      <Route path="/dashboard"  element={<ProtectedRoute><MainLayout><DashboardPage /></MainLayout></ProtectedRoute>} />
      <Route path="/settings"   element={<ProtectedRoute module="settings" action="read"><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute module="audit" action="read"><MainLayout><AuditLogPage /></MainLayout></ProtectedRoute>} />
      <Route path="/archives"   element={<ProtectedRoute><MainLayout><ArchivesPage /></MainLayout></ProtectedRoute>} />
      <Route path="/inventory"  element={<ProtectedRoute><MainLayout><InventoryPage /></MainLayout></ProtectedRoute>} />
      <Route path="/events"     element={<ProtectedRoute><MainLayout><EventsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute><MainLayout><EventDetailPage /></MainLayout></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><MainLayout><AttendanceOverviewPage /></MainLayout></ProtectedRoute>} />
      <Route path="/finance"    element={<ProtectedRoute module="finance" action="read"><MainLayout><FinancePage /></MainLayout></ProtectedRoute>} />
      <Route path="/finance/my-giving" element={<ProtectedRoute><MainLayout><MyGivingPage /></MainLayout></ProtectedRoute>} />
      <Route path="/services"          element={<ProtectedRoute><MainLayout><ServicesPage /></MainLayout></ProtectedRoute>} />
      <Route path="/services/:id/attendance" element={<ProtectedRoute><MainLayout><AttendancePage /></MainLayout></ProtectedRoute>} />
      <Route path="/users"      element={<ProtectedRoute module="users" action="read"><MainLayout><UsersPage /></MainLayout></ProtectedRoute>} />
      <Route path="/users/new"  element={<ProtectedRoute module="users" action="create"><MainLayout><UserFormPage /></MainLayout></ProtectedRoute>} />
      <Route path="/users/:id/edit" element={<ProtectedRoute module="users" action="update"><MainLayout><UserFormPage /></MainLayout></ProtectedRoute>} />
      <Route path="/members"        element={<ProtectedRoute><MainLayout><MembersPage /></MainLayout></ProtectedRoute>} />
      <Route path="/members/new"    element={<ProtectedRoute><MainLayout><MemberFormPage /></MainLayout></ProtectedRoute>} />
      <Route path="/members/:id"    element={<ProtectedRoute><MainLayout><MemberProfilePage /></MainLayout></ProtectedRoute>} />
      <Route path="/members/:id/edit" element={<ProtectedRoute><MainLayout><MemberFormPage /></MainLayout></ProtectedRoute>} />
      <Route path="/cell-groups" element={<ProtectedRoute module="cellgroups" action="read"><MainLayout><CellGroupsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/ministry"    element={<ProtectedRoute><MainLayout><MinistryPage /></MainLayout></ProtectedRoute>} />

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
