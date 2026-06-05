# Church Management System — Presentation Flow

> Complete role-by-role walkthrough of every page and function in the CMS.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Role Hierarchy & Permissions](#2-role-hierarchy--permissions)
3. [Access & Navigation](#3-access--navigation)
4. [Dashboard — Role-by-Role](#4-dashboard--role-by-role)
5. [Members Module](#5-members-module)
6. [Cell Groups Module](#6-cell-groups-module)
7. [Ministry Module](#7-ministry-module)
8. [Services Module](#8-services-module)
9. [Attendance Module](#9-attendance-module)
10. [Finance Module](#10-finance-module)
11. [Events Module](#11-events-module)
12. [Inventory Module](#12-inventory-module)
13. [Archives Module](#13-archives-module)
14. [Users Module](#14-users-module)
15. [Audit Logs Module](#15-audit-logs-module)
16. [Settings Module](#16-settings-module)
17. [Member Portal](#17-member-portal)
18. [Presentation Script — Suggested Walkthrough Order](#18-presentation-script--suggested-walkthrough-order)

---

## 1. System Overview

**Church Management System (CMS)** is a web-based platform for managing church operations:

| Layer | Technology |
|-------|-----------|
| Frontend | React (Create React App), deployed on Vercel |
| Backend | Node.js + Express, deployed on Render |
| Database | TiDB Cloud (MySQL-compatible) |
| Auth | JWT-based with refresh tokens |
| File Storage | Local filesystem on Render server |

### User Types (7 roles)

1. **System Admin** — Full system control
2. **Pastor** — Read-only oversight with archive approval
3. **Registration Team** — Member management, attendance, events, archives
4. **Finance Team** — Financial records, archives (Financial Records only)
5. **Cell Group Leader** — Own cell group management
6. **Group Leader** — Own ministry group management
7. **Member** — Self-service portal

---

## 2. Role Hierarchy & Permissions

### Permission Model

Every action in the system is gated by a `module:action` permission string:

| Module | Actions |
|--------|---------|
| members | read, create, update, delete |
| users | read, create, update, delete |
| attendance | read, create, update, delete |
| services | read, create, update, delete |
| finance | read, create, update, delete |
| events | read, create, update, delete, invite |
| inventory | read, create, update, delete |
| archives | read, create, update, delete |
| ministry | read, create, update, delete |
| cell_groups | read, create, update, delete |
| audit | read |
| settings | read, create, update, delete |

**System Admin** bypasses all permission checks.

### Permission Summary by Role

| Module | Admin | Pastor | Reg Team | Finance | Ministry Leader | CG Leader | Group Leader | Member |
|--------|-------|--------|----------|---------|----------------|-----------|--------------|--------|
| members | ALL | read | ALL | read | scoped read | scoped (CG page) | scoped read | directory only |
| users | ALL | read | CRUD | — | — | — | — | — |
| attendance | ALL | read | CR | — | read | CRD | CR | own only |
| services | ALL | R (C removed) | CR | read | read | read | read | pre-register |
| finance | ALL | read | read | ALL | — | — | — | own giving |
| events | ALL | read | ALL | read | read+invite | CR (scoped) | CR (scoped) | register/Cancel |
| inventory | ALL | create+read | read | read | request only | request only | request only | — |
| archives | ALL | read+approve | ALL | read (finance cat) | read | read | read | — |
| ministry | ALL | read | ALL | — | scoped manage | — | — | view invites |
| cell_groups | ALL | read | ALL | read | — | scoped | — | — |
| audit | ALL | read | read | read | — | — | — | — |
| settings | ALL | read | read | — | — | — | — | — |

---

## 3. Access & Navigation

### Login Flow

1. User navigates to `/login`
2. Enters email + password
3. Backend validates credentials, returns JWT + user profile + permissions
4. Frontend stores token in localStorage, redirects to `/dashboard`
5. First-time login: forced to `/force-change-password`

### Sidebar Navigation (Desktop)

Each role sees a different set of sidebar items:

| Role | Sidebar Items |
|------|--------------|
| **System Admin** | Dashboard, Members, Cell Groups, Ministry, Users, Attendance, Services, Finance, Events, Inventory, Archives, Audit Logs, Settings |
| **Pastor** | Same as Admin (full access) |
| **Registration Team** | Same as Admin (full operational access) |
| **Finance Team** | Dashboard, Members, Finance, Archives, My Settings |
| **Ministry Leader** | Dashboard, Ministry, Events, Attendance, Inventory, Archives, My Settings |
| **Cell Group Leader** | Dashboard, Cell Groups, Attendance, Events, Inventory, Archives, My Settings |
| **Group Leader** | Dashboard, Members, Attendance, Events, Services, Inventory, Archives, My Settings |
| **Member** | No sidebar — redirected to `/portal` |

### Mobile Bottom Navigation

Each role gets 4 bottom tabs:

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|------|-------|-------|-------|-------|
| System Admin | Home | Members | Events | Finance |
| Pastor | Home | Members | Events | Archives |
| Registration Team | Home | Members | Events | Services |
| Finance Team | Home | Finance | Members | Archives |
| Cell Group Leader | Home | Cell Group | Attendance | Events |
| Group Leader | Home | Members | Attendance | Events |
| Ministry Leader | Home | Ministry | Events | Attendance |

---

## 4. Dashboard — Role-by-Role

### URL: `/dashboard`

### 4.1 System Admin
- **Metric Cards:** Active users, Total members, Pending archives, Low stock items
- **Primary Work:** User management, Audit logs, Settings
- **Watch List:** Pending inventory requests, Upcoming events, Upcoming services
- **Recent Activity:** Latest audit log entries (clickable → `/audit-logs`)

### 4.2 Pastor
- **Metric Cards:** Active members, Upcoming services, Upcoming events, Pending archives
- **Primary Work:** Members (read-only), Events (read-only), Archives (approve)
- **Watch List:** Finance overview, Cell groups, Audit logs

### 4.3 Registration Team
- **Metric Cards:** Total members, Active members, Today's attendance, New members
- **Attendance Trends:** Vertical stacked bar chart showing Active/New/Semi-Active attendance across past services. Click any bar → attendance page for that service
- **Cell Group Attendance Alerts:** Sortable table + toggleable bar graph showing absence data per cell group. Columns: #, Cell Group, Total, Attended, Absent, Rate

### 4.4 Finance Team
- **Metric Cards:** This month total, Records count, Total members, Pending archives
- **Recent Finance Records:** List of latest transactions, "Open" button → `/finance`
- **Access Summary:** Read/write controls info

### 4.5 Ministry Leader
- **Metric Cards:** Ministry members, Pending invites, Upcoming events, Pending requests
- **Primary Work:** Ministry roster, Event invites, Attendance
- **Watch List:** Inventory, Archives

### 4.6 Cell Group Leader
- **Metric Cards:** Cell group members, Services/Attendance tasks, Upcoming events, Pending requests
- **Primary Work:** Cell group, Attendance, Events
- **Watch List:** Inventory, Archives

### 4.7 Group Leader
- **Metric Cards:** Group members, Eligible candidates, Upcoming events, Pending requests
- **Primary Work:** Members (scoped), Services, Events
- **Watch List:** Attendance, Inventory, Archives

---

## 5. Members Module

### URL: `/members`

### Who can access
Admin, Pastor, Reg Team, Finance Team, Group Leader (scoped), Member (directory view)

### Features by Role

| Feature | Admin | Pastor | Reg Team | Finance | Group Leader | Member |
|---------|-------|--------|----------|---------|--------------|--------|
| View list | ✅ | ✅ | ✅ | ✅ | ✅ (own group) | ✅ (directory) |
| Add member | ✅ | — | ✅ | — | — | — |
| Edit member | ✅ | — | ✅ | — | — | — |
| Delete member | ✅ | — | ✅ | — | — | — |
| Bulk delete | ✅ | — | ✅ | — | — | — |
| Search/filter | ✅ | ✅ | ✅ | ✅ | scoped | search only |
| Advanced filters | ✅ | ✅ | ✅ | ✅ | simplified | — |
| Assign to scope | — | — | — | — | ✅ | — |
| Unassign from scope | — | — | — | — | ✅ | — |

### Member Form (`/members/new`, `/members/:id/edit`)

**Full form (Admin, Reg Team):**
- First/Last name, Email, Phone, Birthdate, Spiritual birthday, Address, Gender, Status, Cell group, Group, Referred by

**Limited form (scoped leaders, if applicable):**
- Only basic fields: name, email, phone, birthdate, spiritual_birthday, address, gender

### Member Profile (`/members/:id`)
- Personal details, Emergency contacts, Member notes, Status history
- Edit button (Admin, Reg Team with `members:update`)
- Delete button (Admin, Reg Team with `members:delete`)

---

## 6. Cell Groups Module

### URL: `/cell-groups`

### Who can access
Admin, Pastor, Reg Team, Cell Group Leader (scoped)

### Features by Role

| Feature | Admin | Pastor | Reg Team | CG Leader |
|---------|-------|--------|----------|-----------|
| View all groups | ✅ | ✅ | ✅ | ✅ (own only) |
| Create group | ✅ | — | ✅ | — |
| Edit group | ✅ | — | ✅ | — |
| Delete group | ✅ | — | ✅ | — |
| View members | ✅ | ✅ | ✅ | ✅ (own) |
| Unassign member | — | — | — | ✅ |
| Assign member | — | — | — | ✅ |
| Member history | ✅ | ✅ | ✅ | ✅ (own) |

---

## 7. Ministry Module

### URL: `/ministry`

### Who can access
Admin, Pastor, Reg Team, Ministry Leader (scoped)

### Tabs

#### Assignments tab
- **Admin/Pastor/Reg Team:** Full CRUD on all ministry assignments
- **Ministry Leader:** Scoped to their ministry only
  - View roster
  - Search and add members
  - Remove members
  - Pending substitute requests

#### Roles tab
- **Admin/Pastor/Reg Team:** Manage ministry role definitions
- **Ministry Leader:** Hidden (no access)

#### Substitute Requests tab
- **Admin/Pastor/Reg Team:** View all substitute requests
- **Ministry Leader:** View pending, resolve
- **Member:** Submit requests

---

## 8. Services Module

### URL: `/services`

### Who can access
Admin, Pastor, Reg Team, Group Leader, Ministry Leader, CG Leader, Member

### Features by Role

| Feature | Admin | Pastor | Reg Team | Group/Ministry/CG Leader | Member |
|---------|-------|--------|----------|--------------------------|--------|
| View list | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create service | ✅ | — | ✅ | — | — |
| Edit service | ✅ | — | ✅ | — | — |
| Change status | ✅ | — | ✅ | — | — |
| Delete service | ✅ | — | — | — | — |
| Pre-register | — | — | — | — | ✅ |
| View own response | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 9. Attendance Module

### Attendance Overview (`/attendance`)
- List of recent services with attendance counts
- Click any service → check-in page

### Service Attendance (`/services/:id/attendance`)
- Search members by name/barcode
- Check in members (manually or barcode scan)
- View check-in history for that service
- Remove check-in records (if has `attendance:delete`)

### Features by Role

| Feature | Admin | Reg Team | CG/Group Leader | Pastor | Ministry Leader |
|---------|-------|----------|-----------------|--------|-----------------|
| View records | ✅ | ✅ | ✅ (scoped) | ✅ | ✅ (scoped) |
| Check in | ✅ | ✅ | ✅ (scoped) | — | — |
| Delete record | ✅ | — | ✅ (scoped) | — | — |

---

## 10. Finance Module

### URL: `/finance`

### Who can access
Admin, Pastor, Finance Team. Member redirected to `/finance/my-giving`

### Tabs
1. **Income Records** — Main transaction log
2. **Categories** — Income categories management
3. **Funds** — Fund definitions
4. **Accounts** — Account management
5. **Expenses** — Expense records
6. **Expense Categories** — Expense category management

### Income Records Features

| Feature | Admin | Finance Team | Pastor |
|---------|-------|-------------|--------|
| View records | ✅ | ✅ | ✅ |
| Create record | ✅ | ✅ | — |
| Edit record | ✅ | ✅ | — |
| Delete record | ✅ | ✅ | — |
| Bulk delete | ✅ | — | — |
| Search/filter | ✅ | ✅ | ✅ |
| Receipt upload | ✅ | ✅ | — |

---

## 11. Events Module

### URL: `/events`

### Who can access
All roles with `events:read`

### Event List Features

| Feature | Admin | Reg Team | CG/Group Leader | Ministry Leader | Pastor | Member |
|---------|-------|----------|-----------------|-----------------|--------|--------|
| View list | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create event | ✅ | ✅ | ✅ | — | — | ✅ |
| Edit event | ✅ | ✅ | — | — | — | — |
| Status change | ✅ | ✅ | — | — | — | — |
| Delete event | ✅ | ✅ | ✅ | — | — | ✅ |
| Self-register | ✅ | ✅ | ✅ | ✅ | — | ✅ |

### Event Detail (`/events/:id`)

| Feature | Admin/Reg Team | Ministry Leader | CG/Group Leader | Member |
|---------|---------------|-----------------|-----------------|--------|
| View details | ✅ | ✅ | ✅ | ✅ |
| Edit/Delete | ✅ | — | — | — |
| View registrations | ✅ | ✅ | ✅ | — |
| Cancel attendee | ✅ | ✅ | ✅ | — |
| Self-register/unregister | ✅ | — | ✅ | ✅ |
| Ministry invite panel | — | ✅ | — | — |
| Ministry invites list | — | ✅ | — | — |

---

## 12. Inventory Module

### URL: `/inventory`

### Who can access
All roles with `inventory:read`

### Tabs
1. **Items** — Catalog of inventory items
2. **Requests** — Inventory requests

### Items Features

| Feature | Admin | Pastor | Reg/Finance Team | Scoped leaders | Members |
|---------|-------|--------|------------------|----------------|---------|
| View items | ✅ | ✅ | ✅ | ✅ (simplified) | — |
| Add/edit item | ✅ | — | — | — | — |
| Delete item | ✅ | — | — | — | — |

### Requests Features

| Feature | Admin | Pastor | Reg/Finance Team | Scoped leaders | Members |
|---------|-------|--------|------------------|----------------|---------|
| View all requests | ✅ | — | ✅ | — | — |
| Submit request | ✅ | ✅ | ✅ | ✅ | — |
| Approve/reject | ✅ | — | — | — | — |
| View "My Requests" | ✅ | ✅ | ✅ | ✅ | — |

---

## 13. Archives Module

### URL: `/archives`

### Who can access
All roles with `archives:read`

### Features by Role

| Feature | Admin | Pastor | Reg Team | Finance Team | Ministry/CG/Group Leader |
|---------|-------|--------|----------|-------------|---------------------------|
| View records | ✅ (all) | ✅ (all) | ✅ (no confidential) | ✅ (finance cat only) | ✅ (public/restricted) |
| Upload | ✅ | — | ✅ | ✅ (finance cat only) | — |
| Edit own | ✅ | — | ✅ | ✅ | — |
| Approve | ✅ | ✅ | ✅ | — | — |
| Delete | ✅ | — | — | — | — |
| View versions | ✅ | ✅ | ✅ | ✅ | ✅ |
| View access logs | ✅ | ✅ | ✅ | — | — |
| Download | ✅ | ✅ | ✅ | ✅ | ✅ |

### Visibility Rules
- **Public** — visible to all
- **Restricted** — visible to Admin, Pastor, Finance, Reg Team, Ministry Leader, CG Leader, Group Leader
- **Confidential** — visible to Admin, Pastor only

---

## 14. Users Module

### URL: `/users`

### Who can access
Admin, Reg Team, Pastor

### Features by Role

| Feature | Admin | Reg Team | Pastor |
|---------|-------|----------|--------|
| View list | ✅ | ✅ | ✅ |
| Add user | ✅ | ✅ | — |
| Edit user | ✅ | ✅ | — |
| Activate/Deactivate | ✅ | ✅ | — |
| Hard delete | ✅ | — | — |
| Bulk delete | ✅ | — | — |

---

## 15. Audit Logs Module

### URL: `/audit-logs`

### Who can access
Admin, Pastor, Reg Team, Finance Team (roles with `audit:read`)

### Features
- Paginated log of all system actions
- Filter by action type, table name, user email, date range
- Click any log to expand with full details
- Links to related records where applicable

---

## 16. Settings Module

### URL: `/settings`

### Who can access
Admin (with `settings:read`), Pastor and Reg Team (read-only)

### Features
- Grouped settings: General, Finance, Members, Services, Events, Notifications
- **Admin:** Edit all settings
- **Pastor/Reg Team:** View only

---

## 17. Member Portal

### URL: `/portal`

### Who can access
Members only (all others redirected to `/dashboard`)

### Pages

#### Portal Home (`/portal`)
- Profile summary
- Attendance history
- Financial giving records (own)
- Upcoming events (self-register/cancel)
- Upcoming services (pre-register)
- Ministry assignments & invites

#### Portal Settings (`/portal/settings`)
- Update personal profile
- Upload profile photo
- Change password

### Features
| Feature | Available |
|---------|-----------|
| View own profile | ✅ |
| Update own profile | ✅ |
| View own attendance | ✅ |
| View own giving | ✅ |
| View upcoming events | ✅ |
| Register for event | ✅ |
| Cancel registration | ✅ |
| View upcoming services | ✅ |
| Pre-register for service | ✅ |
| View ministry assignments | ✅ |
| Confirm assignment | ✅ |
| View ministry invites | ✅ |
| Respond to invite | ✅ |
| Upload profile photo | ✅ |
| Change password | ✅ |

---

## 18. Presentation Script — Suggested Walkthrough Order

### Part 1: System Overview (2 min)
1. Open browser to production URL
2. Show login page → explain JWT auth
3. Log in as **System Admin** first

### Part 2: System Admin Walkthrough (5 min)
1. **Dashboard** — Show all 4 metric cards, primary work, watch list, recent activity
2. **Members** — Show list, add member, filters, member profile
3. **Cell Groups** — Show all groups, create/edit/delete
4. **Ministry** — Show all tabs, CRUD for assignments and roles
5. **Users** — Show user management, activate/deactivate
6. **Settings** — Show/edit system settings
7. **Audit Logs** — Show all logged actions
8. Highlight: full control, no restrictions

### Part 3: Pastor Walkthrough (3 min)
1. Switch to **Pastor** account
2. **Dashboard** — Show read-only metrics
3. **Members** — Can view but no add/edit/delete buttons
4. **Services** — Read-only, no create/delete
5. **Archives** — Show approval capability
6. Highlight: oversight without operational controls

### Part 4: Registration Team Walkthrough (5 min)
1. Switch to **Registration Team** account
2. **Dashboard** — Show attendance trend chart + cell group alerts
3. **Members** — Full CRUD, bulk delete
4. **Services** — Create/edit services, change status
5. **Attendance** — Check in members, filter by service
6. **Events** — Create/manage events, view registrations
7. **Archives** — Upload, edit, approve
8. Highlight: operational center of the system

### Part 5: Finance Team Walkthrough (3 min)
1. Switch to **Finance Team** account
2. **Dashboard** — Show financial metrics, recent records
3. **Finance** — Full CRUD on records, categories, funds, accounts, expenses
4. **Archives** — Show restricted to "Financial Records" category only
5. **Members** — Read-only lookup
6. Highlight: focused financial tools

### Part 6: Ministry Leader Walkthrough (3 min)
1. Switch to **Ministry Leader** account
2. **Dashboard** — Show ministry-specific metrics
3. **Ministry** — Show scoped roster, add/remove members
4. **Events** — Show ministry invite panel
5. **Attendance** — Scoped to ministry members
6. Highlight: focused ministry tools

### Part 7: Cell Group Leader Walkthrough (3 min)
1. Switch to **Cell Group Leader** account
2. **Dashboard** — Show cell group metrics
3. **Cell Groups** — Show own group only
4. **Attendance** — Check in own cell group members
5. **Events** — Create events for own group
6. Highlight: scoped to assigned group

### Part 8: Group Leader Walkthrough (2 min)
1. Switch to **Group Leader** account
2. **Dashboard** — Show group metrics
3. **Members** — Show scoped group members
4. **Services** — Read-only
5. Highlight: similar to CG but for groups

### Part 9: Member Portal (3 min)
1. Switch to **Member** account
2. Show portal home with own profile, attendance, giving
3. Show event registration flow
4. Show service pre-registration
5. Show settings page
6. Highlight: self-service experience

### Part 10: Architecture Summary (1 min)
1. Frontend → Vercel
2. Backend → Render  
3. Database → TiDB Cloud
4. Authentication → JWT
5. File storage → Server filesystem
6. Key APIs demonstrated
