# PLWM-MCC Church Management System

The PLWM-MCC Church Management System is a web-based platform for church operations at Philippine Life Word Mission - Manila Central Church. It combines a public church website, a role-based management system, and a member portal.

The system is built to help authorized church staff and leaders manage members, services, attendance, events, ministry rosters, finance records, inventory, archives, notifications, and settings from one organized application.

## System Areas

| Area | Purpose |
| --- | --- |
| Public website | Public church information, Bible seminar pages, sermons, world mission pages, and introduction pages. |
| Management system | Protected dashboard for church staff, pastors, ministry leaders, group leaders, and operational teams. |
| Member portal | Member-only portal for personal profile, giving history, attendance history, service responses, event registrations, and ministry invitations. |

## Main Features

| Module | What It Supports |
| --- | --- |
| Dashboard | Role-specific overview, activity, operational metrics, and quick context. |
| Members | Member profiles, contact details, status, group/cell group assignment, notes, and profile records. |
| Users | Login accounts, role assignment, leader scope assignment, and account status. |
| Cell Groups | Cell group records, assigned members, and scoped leader workflows. |
| Ministry | Ministry rosters, member assignment/unassignment, and ministry event involvement. |
| Services | Service schedules, response deadlines, status tracking, and attendance connection. |
| Attendance | Service attendance check-in and attendance review flows. |
| Events | Event listings, event detail pages, registration, and ministry invitations. |
| Finance | Giving and financial records with category and receipt tracking. |
| Inventory | Item catalog, stock levels, usage, requests, and transaction compatibility records. |
| Archives | Document categories, file records, visibility levels, approvals, versions, and access logs. |
| Notifications | In-app notifications for relevant user workflows. |
| Audit Logs | Administrative activity history for accountability. |
| Settings | System settings and personal display preferences. |

## Roles

Access is controlled by role and permission checks. Some leader roles are also scoped to a specific ministry, cell group, or member group.

| Role | General Access |
| --- | --- |
| System Admin | Full administrative access across the system. |
| Pastor | Broad read access, including pastor-level archive visibility and church overview pages. |
| Registration Team | Member, user, service, attendance, event, archive, and operational workflows. |
| Finance Team | Finance records, members needed for finance work, archives, and personal settings. |
| Ministry Leader | Own ministry roster, attendance/events/inventory/archive visibility, and ministry event invitation workflows. |
| Cell Group Leader | Own cell group members, attendance tasks, events, inventory, archives, and personal settings. |
| Group Leader | Assigned group members, read-only service/event/attendance context, inventory, archives, and personal settings. |
| Member | Member portal only. |

## Public Routes

The public website does not require login.

| Route | Page |
| --- | --- |
| `/` | Home |
| `/bible-seminar` | Bible Seminar |
| `/bible-seminar/adults` | Bible Seminar for Adults |
| `/bible-seminar/schedule` | Bible Seminar Schedule |
| `/sermon` | Sermon page |
| `/sermon/latest` | Latest Sermon |
| `/sermon/sunday` | Sunday Sermon |
| `/sermon/christian-life` | Christian Life |
| `/world-mission` | World Mission |
| `/world-mission/status` | Mission Status |
| `/introduction` | Church Introduction |
| `/introduction/beliefs` | What We Believe |
| `/introduction/ci` | Church Identity |

## Protected Routes

Protected pages require login and the correct permission or role scope.

| Route | Page |
| --- | --- |
| `/dashboard` | Dashboard |
| `/members` | Members |
| `/members/new` | New Member |
| `/members/:id` | Member Profile |
| `/members/:id/edit` | Edit Member |
| `/cell-groups` | Cell Groups |
| `/ministry` | Ministry |
| `/users` | Users |
| `/users/new` | New User |
| `/users/:id/edit` | Edit User |
| `/attendance` | Attendance Overview |
| `/services` | Services |
| `/services/:id/attendance` | Service Attendance |
| `/events` | Events |
| `/events/:id` | Event Detail |
| `/finance` | Finance |
| `/finance/my-giving` | My Giving |
| `/inventory` | Inventory |
| `/archives` | Archives |
| `/audit-logs` | Audit Logs |
| `/settings` | System Settings |
| `/my-settings` | My Settings |
| `/portal` | Member Portal |
| `/portal/settings` | Member Portal Settings |

## Technology Stack

### Frontend

- React
- React Router
- Axios
- React Query
- React Hook Form
- React Hot Toast

### Backend

- Node.js
- Express
- Sequelize
- MySQL-compatible TiDB
- JWT authentication
- Bcrypt password hashing
- Helmet, CORS, request logging, and rate limiting
- Multer file upload handling
- Brevo/Nodemailer mail delivery integration

### Deployment

| Component | Platform |
| --- | --- |
| Frontend | Vercel |
| Backend API | Render |
| Database | TiDB Cloud |

The backend is configured through the root `render.yaml` Blueprint. Sensitive environment variables are configured in the hosting provider dashboards and are not stored in the repository.

## Repository Structure

```text
cms-mcc/
  cms-api/             Backend API
    migrations/        Sequelize migrations
    seeders/           Seed data
    scripts/           Operational scripts
    src/
      config/          Database and environment config
      controllers/     Request handlers
      helpers/         Shared backend helpers
      middlewares/     Auth, permission, and request middleware
      models/          Sequelize models
      routes/          API route definitions
      services/        Business logic
      utils/           Utilities

  cms-frontend/        React frontend
    public/            Static public assets
    src/
      api/             Axios/API configuration
      components/      Shared UI components
      context/         React context providers
      pages/           Public, management, and portal pages
      routes/          Route definitions
      utils/           Constants, role access, and display helpers

  docs/                Local-only documentation artifacts
  render.yaml          Render backend Blueprint
```

## Backend Setup

Use placeholder values for local development. Do not commit real production secrets.

```bash
cd cms-api
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Required backend environment values:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=church_cms
DB_USER=root
DB_PASSWORD=
DB_SSL=false

JWT_SECRET=change_me
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_SECRET=change_me
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGIN=http://localhost:3000

BREVO_API_KEY=
SMTP_FROM="PLWM-MCC <noreply@example.com>"
MAX_FILE_SIZE_MB=25
```

## Frontend Setup

```bash
cd cms-frontend
npm install
npm start
```

For local API access, configure the frontend API URL with a placeholder local value:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Useful Commands

### Backend

```bash
npm run dev
npm run start
npm run db:migrate
npm run db:seed
npm run db:validate:3nf
npm run demo:seed
npm run demo:cleanup
```

### Frontend

```bash
npm start
npm run build
npm test
```

## Database Notes

The production database is TiDB Cloud with MySQL-compatible access. Schema changes are managed through Sequelize migrations.

Recent 3NF compatibility work added non-destructive normalized structures for ministries, ministry positions, leader assignments, inventory transactions, and archive current-version metadata. Existing production-facing API shapes should remain compatible while these structures are adopted gradually.

Before running production migrations:

1. Take a database backup.
2. Run `npm run db:validate:3nf`.
3. Run migrations.
4. Run `npm run db:validate:3nf` again.
5. Verify the Render backend health endpoint and key role workflows.

## API Overview

The backend exposes REST endpoints under `/api`.

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | Login, logout, refresh, password reset, and password change. |
| `/api/members` | Member records and member profile workflows. |
| `/api/member-portal` | Member-only portal data and actions. |
| `/api/users` | User account management. |
| `/api/roles` | Role and permission-related management. |
| `/api/dashboard` | Dashboard statistics. |
| `/api/cellgroups` | Cell group data. |
| `/api/ministry` | Ministry roles, rosters, assignments, and scoped ministry workflows. |
| `/api/ministry-invites` | Ministry event invitation workflows. |
| `/api/services` | Church service records. |
| `/api/attendance` | Service attendance workflows. |
| `/api/events` | Event records and registrations. |
| `/api/finance` | Financial records. |
| `/api/inventory` | Inventory items, usage, requests, and transactions. |
| `/api/archives` | Archive records, versions, and access logs. |
| `/api/notifications` | In-app notifications. |
| `/api/audit` | Audit log access. |
| `/api/settings` | System settings. |
| `/api/public` | Public website data. |

## Security And Data Handling

- Do not commit `.env` files or production credentials.
- Do not place real member, finance, or private church records in documentation or seed files.
- Use role and permission checks for all protected workflows.
- Keep member portal access limited to the authenticated member's own data.
- Keep finance and archive access limited to authorized roles.
- Use backups and validation before production database migrations.

## Documentation

Local documentation artifacts are stored in `docs/`. That folder is intentionally ignored by Git in this repository.

Useful local documents may include:

- system handbook
- database schema notes
- ERD/DBML exports
- migration notes
- QA and audit notes

## License

Internal use only. This repository is for PLWM-MCC and authorized maintainers.
