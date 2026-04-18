# PLWM-MCC Church Management System

A comprehensive web-based platform for managing church operations at **Philippine Life Word Mission — Manila Central Church (PLWM-MCC)**.

---

## About

The PLWM-MCC Church Management System is a full-stack web application designed to streamline and digitize church administrative workflows. It provides role-based access control, enabling different ministry teams to manage their specific areas while maintaining data security and integrity.

The system handles member directories, attendance tracking, event management, financial records, ministry assignments, inventory, and more — all through an intuitive web interface.

---

## Tech Stack

### Frontend
- **Framework:** React 18
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Internationalization:** Google Translate API (multi-language support)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Sequelize
- **Database:** MySQL 8+
- **Authentication:** JWT (Access + Refresh tokens)
- **File Uploads:** Multer
- **Email:** Resend API
- **Rate Limiting:** Express Rate Limit

---

## Features

### Core Modules

| Module | Description |
|--------|-------------|
| **Member Management** | Complete member directory with contact info, cell group assignment, membership status, birthday tracking |
| **User Management** | Role-based user accounts with secure authentication |
| **Attendance Tracking** | Manual check-in, barcode scanning, pre-registration (RSVP), real-time dashboard display |
| **Service Management** | Create, publish, and complete church services with integrated attendance |
| **Event Registration** | Event creation with capacity limits, visible on public landing page |
| **Finance Records** | Tithe and offering tracking per member |
| **Ministry Assignments** | Service-based ministry roles with member confirmation |
| **Inventory System** | Item tracking, request workflow, low-stock alerts |
| **File Archives** | Document storage with visibility levels (public, restricted, confidential) |
| **Cell Groups** | Organizational structure management |
| **Audit Logs** | System activity history for compliance |
| **Settings** | Admin-only system configuration |

### Additional Features

- **Member Portal** — Dedicated interface for church members to view profiles, attendance, offerings
- **Public Landing Page** — Church information, live events, service schedules, social links
- **Multi-Language Support** — English, Korean, Filipino (Tagalog), Cebuano, Ilocano, Hiligaynon, Waray, Bikol

---

## User Roles & Access Levels

| Role | Access Level |
|------|-------------|
| System Admin | Full system access |
| Pastor | Read-heavy; access to confidential archives |
| Registration Team | Members, users, attendance, events, services |
| Finance Team | Finance records; restricted archives |
| Cell Group Leader | Cell group management; attendance recording |
| Group Leader | Group management; attendance recording |
| Member | Member portal only |

---

## Project Structure

```
cms-mcc/
├── cms-api/                    # Backend API
│   ├── migrations/             # Database migrations
│   ├── seeders/                # Database seed data
│   └── src/
│       ├── config/              # Configuration files
│       ├── controllers/         # Route handlers
│       ├── helpers/             # Utilities (audit logs, permissions)
│       ├── middlewares/        # Express middleware
│       ├── models/            # Sequelize models
│       ├── routes/             # Route definitions
│       ├── services/           # Business logic
│       └── utils/              # Utilities (mailer, helpers)
│
└── frontend/                   # React Frontend
    └── src/
        ├── api/                # Axios configuration
        ├── components/        # Shared UI components
        ├── context/            # React context providers
        ├── hooks/             # Custom React hooks
        ├── pages/             # Page components
        ├── routes/            # Route definitions
        └── utils/             # Constants, utilities
```

---

## Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Backend API | Railway | `cms-mcc-production.up.railway.app` |
| Frontend | Vercel | `cms-mcc.vercel.app` |

**Deployment Trigger:** Push to `main` branch automatically deploys both frontend and backend.

---

## API Endpoints

The backend exposes a RESTful API at `/api`. Protected routes require a Bearer JWT token.

### Available Routes

```
/api/auth            → Authentication (login, logout, refresh, password reset)
/api/members         → Member CRUD operations
/api/users           → User CRUD operations
/api/services        → Church service management
/api/events          → Event management
/api/finance         → Financial records
/api/attendance      → Attendance tracking
/api/ministry        → Ministry role assignments
/api/inventory       → Inventory management
/api/archives        → File archive records
/api/cellgroups      → Cell group management
/api/groups         → Ministry group management
/api/notifications   → In-app notifications
/api/audit           → Audit log access
/api/settings        → System settings (admin)
/api/roles           → Role management
/api/public          → Public endpoints (landing page data)
/api/member-portal   → Member-only portal endpoints
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

### Local Development Setup

#### Backend

```bash
cd cms-api
npm install
cp .env.example .env  # Configure your environment variables
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env  # Configure your environment variables
npm start
```

### Environment Variables

**cms-api/.env:**
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=church_cms
DB_USER=root
DB_PASS=your_password
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
RESEND_API_KEY=your_resend_key
RESEND_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGIN=http://localhost:3000
BCRYPT_ROUNDS=10
```

**frontend/.env:**
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Languages Supported

The system provides multi-language support using Google Translate integration. Languages are persisted across the application via local storage.

- English
- Korean
- Filipino (Tagalog)
- Cebuano
- Ilocano
- Hiligaynon
- Waray
- Bikol

---

## License

**Internal Use Only** — PLWM Manila Central Church

All rights reserved. This codebase is for the exclusive use of PLWM-MCC and its authorized personnel.

---

## Support

For technical support or inquiries, please contact the system administrator.