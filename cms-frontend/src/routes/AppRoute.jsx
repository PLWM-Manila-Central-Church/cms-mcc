import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ConfirmationProvider } from '../context/ConfirmationContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

// Load route screens on demand so public, member, and CMS routes do not share one oversized entry chunk.
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const ForceChangePassword = lazy(() => import('../pages/auth/ForceChangePassword'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const MembersPage = lazy(() => import('../pages/members/MembersPage'));
const MemberFormPage = lazy(() => import('../pages/members/MemberFormPage'));
const MemberPortal = lazy(() => import('../pages/members/MemberPortal'));
const MemberPortalSettings = lazy(() => import('../pages/members/MemberPortalSettings'));
const MemberProfilePage = lazy(() => import('../pages/members/MemberProfilePage'));
const CellGroupsPage = lazy(() => import('../pages/cellgroups/CellGroupsPage'));
const MinistryPage = lazy(() => import('../pages/ministry/MinistryPage'));
const UsersPage = lazy(() => import('../pages/users/UsersPage'));
const UserFormPage = lazy(() => import('../pages/users/UserFormPage'));
const ServicesPage = lazy(() => import('../pages/services/ServicesPage'));
const AttendancePage = lazy(() => import('../pages/attendance/AttendancePage'));
const QrAttendancePage = lazy(() => import('../pages/attendance/QrAttendancePage'));
const FinancePage = lazy(() => import('../pages/finance/FinancePage'));
const AnalyticsReportPage = lazy(() => import('../pages/reports/AnalyticsReportPage'));
const TeamAttendanceReportPage = lazy(() => import('../pages/reports/TeamAttendanceReportPage'));
const OutreachPage = lazy(() => import('../pages/notifications/OutreachPage'));
const MyGivingPage = lazy(() => import('../pages/finance/MyGivingPage'));
const AttendanceOverviewPage = lazy(() => import('../pages/attendance/AttendanceOverviewPage'));
const EventsPage = lazy(() => import('../pages/events/EventsPage'));
const EventDetailPage = lazy(() => import('../pages/events/EventDetailPage'));
const InventoryPage = lazy(() => import('../pages/inventory/InventoryPage'));
const ArchivesPage = lazy(() => import('../pages/archives/ArchivesPage'));
const AuditLogPage = lazy(() => import('../pages/audit/AuditLogPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const MySettingsPage = lazy(() => import('../pages/settings/MySettingsPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const LeaderTeamsPage = lazy(() => import('../pages/leaders/LeaderTeamsPage'));
const HomePage = lazy(() => import('../pages/public/HomePage'));
const BibleSeminarPage = lazy(() => import('../pages/public/BibleSeminarPage'));
const BibleSeminarAdultsPage = lazy(() => import('../pages/public/BibleSeminarAdultsPage'));
const LatestSermonPage = lazy(() => import('../pages/public/LatestSermonPage'));
const SermonPage = lazy(() => import('../pages/public/OtherPages').then((pages) => ({ default: pages.SermonPage })));
const SundaySermonPage = lazy(() => import('../pages/public/OtherPages').then((pages) => ({ default: pages.SundaySermonPage })));
const ChristianLifePage = lazy(() => import('../pages/public/OtherPages').then((pages) => ({ default: pages.ChristianLifePage })));
const WorldMissionPage = lazy(() => import('../pages/public/OtherPages').then((pages) => ({ default: pages.WorldMissionPage })));
const MissionStatusPage = lazy(() => import('../pages/public/OtherPages').then((pages) => ({ default: pages.MissionStatusPage })));
const IntroductionPage = lazy(() => import('../pages/public/OtherPages').then((pages) => ({ default: pages.IntroductionPage })));
const WhatWeBelievePage = lazy(() => import('../pages/public/OtherPages').then((pages) => ({ default: pages.WhatWeBelievePage })));
const CIPage = lazy(() => import('../pages/public/OtherPages').then((pages) => ({ default: pages.CIPage })));

const UnauthorizedPage = () => {
  const { user } = useAuth();
  const destination = !user ? '/login' : user.roleName === 'Member' ? '/portal' : '/dashboard';
  return <main className="mcc-auth" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'var(--mcc-canvas)'}}>
    <section style={{maxWidth:480,width:'100%',padding:36,border:'1px solid #e2e8f0',borderRadius:18,background:'#fff',textAlign:'center'}}>
      <img src="/logo.jpg" alt="PLWM-MCC" style={{width:48,height:48,borderRadius:'50%'}}/>
      <p style={{fontSize:11,fontWeight:700,color:'#005599',letterSpacing:'.1em'}}>ACCESS RESTRICTED</p>
      <h1 style={{fontSize:28,lineHeight:1.25,letterSpacing:'-.03em'}}>This page is outside your workspace</h1>
      <p style={{fontSize:14,color:'#52647a',lineHeight:1.6}}>You do not have permission to view this page. Return to your workspace to continue with the modules available to your account.</p>
      <Link to={destination} style={{display:'inline-block',marginTop:12,padding:'12px 18px',borderRadius:10,background:'#005599',color:'#fff',textDecoration:'none',fontWeight:600}}>Return to {user ? 'my workspace' : 'sign in'}</Link>
    </section>
  </main>;
};

// Members can ONLY access /portal — redirect everyone else away from it
const PortalRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.roleName !== 'Member') return <Navigate to="/dashboard" replace />;
  if (user.forcePasswordChange && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" replace />;
  }
  return children;
};

// Ministry Leaders manage their members exclusively through the Ministry page
// (roster tab). Trying to access /members redirects them to /ministry.
const MembersRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isMinistryLeader = user?.roleName === 'Ministry Leader' && !!user?.leadsMinistryId;
  if (isMinistryLeader) return <Navigate to="/ministry" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  // Where to redirect logged-in users trying to access login/public auth pages
  const homeRedirect = user?.roleName === 'Member' ? '/portal' : '/dashboard';

  return (
    <ConfirmationProvider>
    <Suspense fallback={<div style={{ minHeight: 160, padding: 32, color: '#64748b' }}>Loading page…</div>}>
    <Routes>
      {/* ── Public Church Website (no auth) ── */}
      <Route path="/"                         element={<HomePage />} />
      <Route path="/bible-seminar"            element={<BibleSeminarPage />} />
      <Route path="/bible-seminar/adults"     element={<BibleSeminarAdultsPage />} />
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
      <Route path="/leader/teams" element={<ProtectedRoute><MainLayout><LeaderTeamsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/settings"   element={<ProtectedRoute module="settings" action="read"><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/my-settings" element={<ProtectedRoute><MainLayout><MySettingsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute module="audit" action="read"><MainLayout><AuditLogPage /></MainLayout></ProtectedRoute>} />
      <Route path="/archives"   element={<ProtectedRoute module="archives" action="read"><MainLayout><ArchivesPage /></MainLayout></ProtectedRoute>} />
      <Route path="/inventory"  element={<ProtectedRoute module="inventory" action="read"><MainLayout><InventoryPage /></MainLayout></ProtectedRoute>} />
      <Route path="/events"     element={<ProtectedRoute module="events" action="read"><MainLayout><EventsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute module="events" action="read"><MainLayout><EventDetailPage /></MainLayout></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute module="attendance" action="read"><MainLayout><AttendanceOverviewPage /></MainLayout></ProtectedRoute>} />
      <Route path="/attendance/qr" element={<ProtectedRoute module="qr_attendance" action="read"><MainLayout><Suspense fallback={<div style={{ padding: 32 }}>Loading attendance tools…</div>}><QrAttendancePage /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/finance"    element={<ProtectedRoute module="finance" action="read"><MainLayout><FinancePage /></MainLayout></ProtectedRoute>} />
      <Route path="/finance/expenses" element={<ProtectedRoute module="finance" action="read"><Navigate to="/finance" replace /></ProtectedRoute>} />
      <Route path="/reports/analytics" element={<ProtectedRoute module="dashboard" action="read"><MainLayout><Suspense fallback={<div style={{ padding: 32 }}>Loading analytics…</div>}><AnalyticsReportPage /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/reports/team-attendance" element={<ProtectedRoute module="attendance" action="read"><MainLayout><Suspense fallback={<div style={{ padding: 32 }}>Loading team attendance…</div>}><TeamAttendanceReportPage /></Suspense></MainLayout></ProtectedRoute>} />
      <Route path="/outreach" element={<ProtectedRoute module="outreach" action="read"><MainLayout><OutreachPage /></MainLayout></ProtectedRoute>} />
      <Route path="/finance/my-giving" element={<ProtectedRoute module="finance" action="read"><MainLayout><MyGivingPage /></MainLayout></ProtectedRoute>} />
      <Route path="/services"          element={<ProtectedRoute module="services" action="read"><MainLayout><ServicesPage /></MainLayout></ProtectedRoute>} />
      <Route path="/services/:id/attendance" element={<ProtectedRoute module="attendance" action="read"><MainLayout><AttendancePage /></MainLayout></ProtectedRoute>} />
      <Route path="/users"      element={<ProtectedRoute module="users" action="read"><MainLayout><UsersPage /></MainLayout></ProtectedRoute>} />
      <Route path="/users/new"  element={<ProtectedRoute module="users" action="create"><MainLayout><UserFormPage /></MainLayout></ProtectedRoute>} />
      <Route path="/users/:id/edit" element={<ProtectedRoute module="users" action="update"><MainLayout><UserFormPage /></MainLayout></ProtectedRoute>} />

      {/* Members routes — Ministry Leaders are redirected to /ministry */}
      <Route path="/members" element={
        <ProtectedRoute module="members" action="read">
          <MainLayout>
            <MembersRoute><MembersPage /></MembersRoute>
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/members/new"    element={<ProtectedRoute module="members" action="create"><MainLayout><MembersRoute><MemberFormPage /></MembersRoute></MainLayout></ProtectedRoute>} />
      <Route path="/members/:id"    element={<ProtectedRoute module="members" action="read"><MainLayout><MembersRoute><MemberProfilePage /></MembersRoute></MainLayout></ProtectedRoute>} />
      <Route path="/members/:id/edit" element={<ProtectedRoute module="members" action="update"><MainLayout><MembersRoute><MemberFormPage /></MembersRoute></MainLayout></ProtectedRoute>} />

      <Route path="/cell-groups" element={<ProtectedRoute module="cell_groups" action="read"><MainLayout><CellGroupsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/ministry"    element={<ProtectedRoute module="ministry" action="read"><MainLayout><MinistryPage /></MainLayout></ProtectedRoute>} />

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </ConfirmationProvider>
  );
};

export default AppRoutes;
