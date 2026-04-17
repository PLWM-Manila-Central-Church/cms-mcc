# PLWM-MCC Church Management System

A full-stack web application for managing church operations at **Philippine Life Word Mission — Manila Central Church (PLWM-MCC)**.

---

## Overview

The CMS covers member management, attendance tracking, event registration, finance recording, ministry assignments, inventory, archives, and more — all behind a role-based access control system.

It consists of two separate applications that live in this monorepo:

| Folder | Stack | Deployed on |
|--------|-------|-------------|
| `frontend/` | React.js | Vercel |
| `backend/` | Node.js · Express · Sequelize · MySQL | Railway |

---

## Features

- **Member Management** — masterfile-style directory with cell group, group, status, age, and birthday fields
- **User Accounts** — role-based access; first login requires a password change
- **Member Portal** — dedicated interface for church members to view their profile, attendance, offerings, and register for services/events
- **Attendance** — manual check-in, barcode scan, and pre-registration (RSVP) with real-time display
- **Services** — create, publish, and complete services; attendance recorded per service
- **Events** — registration with capacity tracking; visible on the public landing page
- **Finance** — tithe and offering records per member
- **Ministry** — role assignments per service with member confirmation
- **Inventory** — item tracking, request workflow, and low-stock alerts
- **Archives** — file storage with visibility tiers (public / restricted / confidential)
- **Cell Groups & Groups** — manage church organizational structure
- **Audit Logs** — system activity history
- **Settings** — admin-only system configuration
- **Public Landing Page** — church information, live event listings, service schedules, and social links

---

## Roles

| Role | Access |
|------|--------|
| System Admin | Full access to everything |
| Pastor | Read-heavy access; can see confidential archives |
| Registration Team | Members, users, attendance, events, services |
| Finance Team | Finance records; restricted archives |
| Cell Group Leader | Cell groups, attendance recording |
| Group Leader | Groups, attendance recording |
| Member | Member portal only |

---

## Tech Stack

**Frontend**
- React 18
- React Router v6
- Axios
- Google Translate integration (multi-language support)

**Backend**
- Node.js + Express
- Sequelize ORM
- MySQL 8+
- JWT authentication (access + refresh tokens)
- Multer (file uploads)
- Resend (transactional email)
- Express Rate Limit

---

## Project Structure

```
cms-mcc/
├── frontend/
│   └── src/
│       ├── api/              # Axios instance
│       ├── components/       # Shared layout components (Sidebar, Header)
│       ├── context/          # Auth context
│       ├── hooks/            # Custom hooks
│       ├── pages/            # Page components (one folder per feature)
│       ├── routes/           # Route definitions and guards
│       └── utils/            # Constants, language utilities
│
└── backend/
    ├── migrations/           # Sequelize migration files
    ├── seeders/              # Database seed files
    └── src/
        ├── config/           # Database and Sequelize config
        ├── controllers/      # Route handler logic
        ├── helpers/          # Audit log, permission cache
        ├── middlewares/      # Auth, authorization, error handler, upload
        ├── models/           # Sequelize models
        ├── routes/           # Express route definitions
        ├── services/         # Business logic layer
        └── utils/            # Mailer and other utilities
```

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- MySQL 8+
- npm

### Backend

```bash
cd backend
npm install
# Create a .env file — see Environment Variables section below
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
```

### Frontend

```bash
cd frontend
npm install
# Create a .env file — see Environment Variables section below
npm start
```

---

## Environment Variables

**Backend** — create `backend/.env`:

```
PORT=5000
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASS=
JWT_SECRET=
JWT_REFRESH_SECRET=
RESEND_API_KEY=
RESEND_FROM=
FRONTEND_URL=
ALLOWED_ORIGIN=
BCRYPT_ROUNDS=10
```

**Frontend** — create `frontend/.env`:

```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Deployment

| Service | Platform | Trigger |
|---------|----------|---------|
| Backend API | Railway | Push to `main` / `fix/bug` branch |
| Frontend | Vercel | Push to `fix/bug` branch (promoted to production) |

**After pushing backend changes that include new migrations:**
```bash
npx sequelize-cli db:migrate
```
Railway runs this automatically if configured in the start command.

---

## API

The backend exposes a RESTful API at `/api`. All protected routes require a `Bearer` JWT in the `Authorization` header.

Key route groups:

```
/api/auth           — login, logout, refresh, forgot/reset password
/api/members        — CRUD for church members
/api/users          — CRUD for system users
/api/services       — church service management + attendance
/api/events         — event management + registration
/api/finance        — financial records
/api/attendance     — attendance records
/api/ministry       — ministry role assignments
/api/inventory      — inventory items + requests
/api/archives       — file archive records
/api/cell-groups    — cell group management
/api/notifications  — in-app notifications
/api/audit          — audit log reads
/api/settings       — system settings (admin only)
/api/roles          — role management
/api/public         — unauthenticated endpoints (landing page stats + events)
/api/member-portal  — member-only portal endpoints
```

---

## Languages

The system supports multi-language display via Google Translate integration. The selected language persists across the landing page, CMS, and member portal using a shared `localStorage` key.

Supported languages: English, Korean, Filipino (Tagalog), Cebuano, Ilocano, Hiligaynon, Waray, Bikol.

---

## License

Internal use only — PLWM Manila Central Church.
