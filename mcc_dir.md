# MCC Directory Structure

This document contains the complete directory structure and files of the MCC (Church Management System) project.

## Complete File Tree

```
cms-api/
  jsconfig.json
  package.json
  package-lock.json
  test-hash.js
  migrations/
    20260306144237-create-roles.js
    20260306144238-create-permissions.js
    20260306144239-create-inventory-categories.js
    20260306144240-create-role-permissions.js
    20260306144241-create-cell-groups.js
    20260306144242-create-groups.js
    20260306144243-create-financial-categories.js
    20260306144244-create-event-categories.js
    20260306144245-create-members.js
    20260306144246-create-emergency-contacts.js
    20260306144247-create-invited-members.js
    20260306144248-create-ministry-roles.js
    20260306144249-create-users.js
    20260306144250-create-member-status-history.js
    20260306144251-create-cell-group-history.js
    20260306144252-create-member-notes.js
    20260306144253-create-user-sessions.js
    20260306144254-create-password-reset-tokens.js
    20260306144255-create-refresh-tokens.js
    20260306144256-create-services.js
    20260306144258-create-service-attendance-summary.js
    20260306144259-create-attendances.js
    20260306144260-create-service-responses.js
    20260306144261-create-ministry-assignments.js
    20260306144262-create-substitute-requests.js
    20260306144263-create-financial-records.js
    20260306144265-create-events.js
    20260306144266-create-event-registrations.js
    20260306144267-create-inventory-items.js
    20260306144269-create-inventory-usage.js
    20260306144270-create-inventory-requests.js
    20260306144271-create-archive-categories.js
    20260306144272-create-archive-records.js
    20260306144274-create-archive-versions.js
    20260306144275-create-archive-access-logs.js
    20260306144276-create-notifications.js
    20260306144277-create-audit-logs.js
    20260306144278-create-system-settings.js
    20260312000001-add-payment-method-to-financial-records.js
    20260312000002-add-payment-method-safe.js
    20260314000001-fix-permissions.js
    20260314000002-nullable-audit-user-id.js
    20260315000001-fix-role-permissions.js
    20260318000001-add-start-time-to-events.js
    20260318000002-fix-event-registrations-and-permissions.js
    20260318000003-add-member-event-registration-permissions.js
    20260318000004-add-pastor-inventory-create-permission.js
    20260318000005-seed-missing-system-settings.js
    20260319000001-add-performance-indexes.js
    20260320000001-update-member-status-and-leader-permissions.js
    20260322000001-add-account-lockout-to-users.js
    20260323000001-add-finance-ministry-permission.js
    20260324000001-alter-users-add-leader-fields.js
    20260324000002-alter-notifications-add-reference-fields.js
    20260324000003-create-ministry-memberships.js
    20260324000004-create-ministry-event-invites.js
    20260324000005-replace-ministry-roles.js
    20260324000006-insert-ministry-delete-permission.js
  seeders/
    20260306174227-seed-roles.js
    20260306174228-seed-permissions.js
    20260306174229-seed-role-permissions.js
    20260306174231-seed-cell-groups.js
    20260306174232-seed-groups.js
    20260306174233-seed-financial-categories.js
    20260306174234-seed-event-categories.js
    20260306174235-seed-inventory-categories.js
    20260306174237-seed-ministry-roles.js
    20260306174238-seed-archive-categories.js
    20260306174239-seed-system-settings.js
    20260306174240-seed-admin-user.js
  src/
    app.js
    server.js
    config/
      db.js
      sequelize.js
    controllers/
      archives.controller.js
      attendance.controller.js
      audit.controller.js
      auth.controller.js
      cellgroups.controller.js
      dashboard.controller.js
      events.controller.js
      finance.controller.js
      inventory.controller.js
      member-extras.controller.js
      member-portal.controller.js
      members.controller.js
      ministry.controller.js
      ministry-invites.controller.js
      notifications.controller.js
      public.controller.js
      roles.controller.js
      service-extras.controller.js
      services.controller.js
      settings.controller.js
      users.controller.js
    helpers/
      auditLog.helper.js
      permissionCache.helper.js
    middlewares/
      authorize.js
      errorHandler.js
      upload.js
      validate.js
      verifyToken.js
    models/
      index.js
      ArchiveAccessLog.model.js
      ArchiveCategory.model.js
      ArchiveRecord.model.js
      ArchiveVersion.model.js
      Attendance.model.js
      AuditLog.model.js
      CellGroup.model.js
      CellGroupHistory.model.js
      EmergencyContact.model.js
      Event.model.js
      EventCategory.model.js
      EventRegistration.model.js
      FinancialCategory.model.js
      FinancialRecord.model.js
      Group.model.js
      InventoryCategory.model.js
      InventoryItem.model.js
      InventoryRequest.model.js
      InventoryUsage.model.js
      InvitedMember.model.js
      Member.model.js
      MemberNote.model.js
      MemberStatusHistory.model.js
      MinistryAssignment.model.js
      MinistryEventInvite.model.js
      MinistryMembership.model.js
      MinistryRole.model.js
      Notification.model.js
      PasswordResetToken.model.js
      Permission.model.js
      RefreshToken.model.js
      Role.model.js
      RolePermission.model.js
      Service.model.js
      ServiceAttendanceSummary.model.js
      ServiceResponse.model.js
      SubstituteRequest.model.js
      SystemSetting.model.js
      User.model.js
      UserSession.model.js
    routes/
      archives.routes.js
      attendance.routes.js
      audit.routes.js
      auth.routes.js
      cellgroups.routes.js
      dashboard.routes.js
      events.routes.js
      finance.routes.js
      inventory.routes.js
      member-extras.routes.js
      member-portal.routes.js
      members.routes.js
      ministry.routes.js
      ministry-invites.routes.js
      notifications.routes.js
      public.routes.js
      roles.routes.js
      service-extras.routes.js
      services.routes.js
      settings.routes.js
      users.routes.js
    services/
      archives.service.js
      attendance.service.js
      audit.service.js
      auth.service.js
      cellgroups.service.js
      dashboard.service.js
      events.service.js
      finance.service.js
      inventory.service.js
      member-extras.service.js
      member-portal.service.js
      members.service.js
      ministry.service.js
      ministry-invites.service.js
      notifications.service.js
      roles.service.js
      service-extras.service.js
      services.service.js
      settings.service.js
      users.service.js
    utils/
      mailer.js
    validators/
      attendance.validator.js
      auth.validator.js
      cellgroups.validator.js
      events.validator.js
      finance.validator.js
      inventory.validator.js
      members.validator.js
      ministry.validator.js
      roles.validator.js
      settings.validator.js
      users.validator.js

cms-frontend/
  package.json
  package-lock.json
  README.md
  public/
    banner.webp
    bible.webp
    church.webp
    favicon.ico
    god.webp
    hs.webp
    humans.webp
    index.html
    jesus.webp
    logo.jpg
    logo192.png
    logo512.png
    manifest.json
    mcc.jpg
    robots.txt
    salvation.webp
    smr.jpg
    vercel.json
  src/
    App.css
    App.js
    App.test.js
    index.css
    index.js
    logo.svg
    reportWebVitals.js
    setupTests.js
    api/
      axiosInstance.js
    components/
      common/
        BottomSheet.jsx
        MobileTable.jsx
      layout/
        Header.jsx
        MainLayout.jsx
        Sidebar.jsx
    context/
      AuthContext.jsx
    hooks/
      useIsMobile.js
    pages/
      archives/
        ArchivesPage.jsx
      attendance/
        AttendanceOverviewPage.jsx
        AttendancePage.jsx
      audit/
        AuditLogPage.jsx
      auth/
        ForceChangePassword.jsx
        ForgotPasswordPage.jsx
        LoginPage.jsx
        ResetPasswordPage.jsx
      cellgroups/
        CellGroupsPage.jsx
      dashboard/
        DashboardPage.jsx
      events/
        EventDetailPage.jsx
        EventsPage.jsx
      finance/
        FinancePage.jsx
        MyGivingPage.jsx
      inventory/
        InventoryPage.jsx
      members/
        MemberFormPage.jsx
        MemberPortal.jsx
        MemberPortalSettings.jsx
        MemberProfilePage.jsx
        MembersPage.jsx
      ministry/
        MinistryPage.jsx
      public/
        BibleSeminarAdultsPage.jsx
        BibleSeminarPage.jsx
        BibleSeminarSchedulePage.jsx
        HomePage.jsx
        LatestSermonPage.jsx
        OtherPages.jsx
        PublicLayout.jsx
      services/
        ServicesPage.jsx
      settings/
        MySettingsPage.jsx
        SettingsPage.jsx
      users/
        UserFormPage.jsx
        UsersPage.jsx
    routes/
      AppRoute.jsx
      ProtectedRoute.jsx
    utils/
      constants.js
      langUtils.js

LICENSE
README.md
```

## Project Summary

The MCC project is a comprehensive Church Management System (CMS) consisting of two main components:

### 1. **cms-api/** - Node.js Backend API
- **Framework**: Express.js with Sequelize ORM
- **Database**: PostgreSQL with comprehensive migration system
- **Architecture**: MVC pattern with service layer
- **Key Features**:
  - **Authentication & Authorization**: JWT-based auth with role-based permissions
  - **Member Management**: Complete member database with emergency contacts, status history, and notes
  - **Cell Groups**: Small group management with history tracking
  - **Attendance System**: Service attendance tracking and summaries
  - **Financial Management**: Giving/tithing records with categories and payment methods
  - **Event Management**: Event creation, registration, and management
  - **Inventory Management**: Item tracking, usage, and requests
  - **Ministry Management**: Ministry assignments and memberships
  - **Archive System**: Document management with version control and access logging
  - **Audit Logging**: Comprehensive system activity tracking
  - **Notifications**: System notifications and alerts
  - **User Management**: Role-based user system with session management

### 2. **cms-frontend/** - React Frontend
- **Framework**: React.js with modern hooks and context
- **Styling**: CSS with responsive design
- **Architecture**: Component-based with protected routing
- **Key Features**:
  - **Public Pages**: Church website with sermon information, Bible seminar details
  - **Member Portal**: Secure member access to personal information and giving
  - **Admin Dashboard**: Comprehensive administrative interface
  - **Mobile Responsive**: Bottom sheets and mobile-optimized tables
  - **Authentication**: Login, forgot password, reset password flows
  - **Multi-module Pages**: Separate pages for attendance, events, finance, inventory, etc.

### Database Structure
The system includes **35+ database tables** covering:
- User management (users, roles, permissions, sessions)
- Member information (members, emergency contacts, status history)
- Church organization (cell groups, ministries, groups)
- Financial data (financial records, categories, payment tracking)
- Event management (events, registrations, categories)
- Inventory tracking (items, usage, requests, categories)
- Archive system (records, versions, access logs)
- System functionality (audit logs, notifications, settings)

### Key Features
- **Role-Based Access Control**: Granular permissions for different user types
- **Audit Trail**: Complete logging of all system activities
- **Mobile Support**: Responsive design with mobile-specific components
- **Member Self-Service**: Portal for members to update information and view giving
- **Public Website**: Church website integration with member management
- **Comprehensive Reporting**: Dashboard and analytics for church leadership
- **Data Security**: Account lockout, session management, and access controls

This system provides a complete solution for church administration, member management, and public communication, all integrated into a single cohesive platform.