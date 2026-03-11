import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import ForceChangePassword from '../pages/auth/ForceChangePassword';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import MembersPage       from '../pages/members/MembersPage';
import MemberFormPage    from '../pages/members/MemberFormPage';
import MemberProfilePage from '../pages/members/MemberProfilePage';
import CellGroupsPage   from '../pages/cellgroups/CellGroupsPage';
import MinistryPage     from '../pages/ministry/MinistryPage';
import UsersPage     from '../pages/users/UsersPage';
import UserFormPage  from '../pages/users/UserFormPage';
import ServicesPage   from '../pages/services/ServicesPage';
import AttendancePage from '../pages/attendance/AttendancePage';
import FinancePage   from '../pages/finance/FinancePage';
import MyGivingPage  from '../pages/finance/MyGivingPage';
import AttendanceOverviewPage from '../pages/attendance/AttendanceOverviewPage';
import EventsPage      from '../pages/events/EventsPage';
import EventDetailPage from '../pages/events/EventDetailPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import ArchivesPage from '../pages/archives/ArchivesPage';
import AuditLogPage from '../pages/audit/AuditLogPage';
import SettingsPage from '../pages/settings/SettingsPage';
import DashboardPage from '../pages/dashboard/DashboardPage';

const UnauthorizedPage = () => <div><h1>Unauthorized</h1><p>You do not have permission to view this page.</p></div>;

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/settings" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><MainLayout><AuditLogPage /></MainLayout></ProtectedRoute>} />
      <Route path="/archives" element={<ProtectedRoute><MainLayout><ArchivesPage /></MainLayout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><MainLayout><InventoryPage /></MainLayout></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><MainLayout><EventsPage /></MainLayout></ProtectedRoute>} />
<Route path="/events/:id" element={<ProtectedRoute><MainLayout><EventDetailPage /></MainLayout></ProtectedRoute>} />
      <Route path="/attendance" element={
  <ProtectedRoute><MainLayout><AttendanceOverviewPage /></MainLayout></ProtectedRoute>
} />
      <Route path="/finance" element={<ProtectedRoute><MainLayout><FinancePage /></MainLayout></ProtectedRoute>} />
<Route path="/finance/my-giving" element={<ProtectedRoute><MainLayout><MyGivingPage /></MainLayout></ProtectedRoute>} />
<Route path="/services" element={
  <ProtectedRoute>
    <MainLayout><ServicesPage /></MainLayout>
  </ProtectedRoute>
} />
<Route path="/services/:id/attendance" element={
  <ProtectedRoute>
    <MainLayout><AttendancePage /></MainLayout>
  </ProtectedRoute>
} />
<Route path="/users" element={
  <ProtectedRoute>
    <MainLayout><UsersPage /></MainLayout>
  </ProtectedRoute>
} />
<Route path="/users/new" element={
  <ProtectedRoute>
    <MainLayout><UserFormPage /></MainLayout>
  </ProtectedRoute>
} />
<Route path="/users/:id/edit" element={
  <ProtectedRoute>
    <MainLayout><UserFormPage /></MainLayout>
  </ProtectedRoute>
} />
      <Route path="/members" element={
        <ProtectedRoute>
          <MainLayout><MembersPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/cell-groups" element={
        <ProtectedRoute>
          <MainLayout><CellGroupsPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/ministry" element={
        <ProtectedRoute>
          <MainLayout><MinistryPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/members/new" element={
        <ProtectedRoute>
          <MainLayout><MemberFormPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/members/:id" element={
        <ProtectedRoute>
          <MainLayout><MemberProfilePage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/members/:id/edit" element={
        <ProtectedRoute>
          <MainLayout><MemberFormPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/reset-password"
        element={user ? <Navigate to="/dashboard" replace /> : <ResetPasswordPage />}
      />

      <Route
        path="/force-change-password"
        element={
          <ProtectedRoute>
            <ForceChangePassword />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;