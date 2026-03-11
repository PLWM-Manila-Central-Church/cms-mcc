# PLWM-MCC Church Management System

A full-stack Church Management System for **Philippine League of Women in Ministry – Manila Central Church (PLWM-MCC)**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js (Create React App) |
| Backend | Node.js + Express |
| Database | MySQL + Sequelize ORM |
| Auth | JWT (Access + Refresh tokens) + RBAC |

---

## Project Structure

```
cms-mcc/
├── cms-api/          # Backend (Node.js/Express)
│   ├── migrations/   # Sequelize migrations
│   ├── seeders/      # Seed data
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       └── services/
└── cms-frontend/     # Frontend (React)
    └── src/
        ├── api/
        ├── components/
        ├── context/
        ├── pages/
        ├── routes/
        └── utils/
```

---

## Prerequisites

- Node.js v18+
- MySQL 8+ (or MariaDB 10.6+)
- npm

---

## Backend Setup (`cms-api`)

### 1. Install dependencies

```bash
cd cms-api
npm install
```

### 2. Create the `.env` file

Create a file named `.env` in the `cms-api/` root:

```env
# Server
NODE_ENV=development
PORT=5000
ALLOWED_ORIGIN=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=church_management_database
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_secret_here
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12

# SMTP (required for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=PLWM-MCC <your_email@gmail.com>
```

> **Note:** Use a strong random string for `JWT_SECRET` and `REFRESH_TOKEN_SECRET`.
> You can generate one with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 3. Create the database

```sql
CREATE DATABASE church_management_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run migrations

```bash
npx sequelize-cli db:migrate
```

### 5. Run seeders (initial roles, permissions, admin user)

```bash
npx sequelize-cli db:seed:all
```

### 6. Start the backend

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.

---

## Frontend Setup (`cms-frontend`)

### 1. Install dependencies

```bash
cd cms-frontend
npm install
```

### 2. Create the `.env` file

Create a file named `.env` in the `cms-frontend/` root:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

For production, point this to your deployed API URL.

### 3. Add public assets

Place the following files in `cms-frontend/public/`:

- `logo.png` — PLWM-MCC church logo
- `smr.jpg` — church background photo (used on the login page)

### 4. Start the frontend

```bash
# Development
npm start

# Production build
npm run build
```

The app will be available at `http://localhost:3000`.

---

## Default Admin Account

After running seeders, log in with:

```
Email:    admin@plwmmcc.com
Password: admin123
```

> **Change this password immediately after first login.**

---

## API Endpoints Overview

| Module | Base Path |
|---|---|
| Auth | `/api/auth` |
| Members | `/api/members` |
| Users | `/api/users` |
| Cell Groups | `/api/cellgroups` |
| Ministry | `/api/ministry` |
| Services | `/api/services` |
| Attendance | `/api/attendance` |
| Finance | `/api/finance` |
| Events | `/api/events` |
| Inventory | `/api/inventory` |
| Archives | `/api/archives` |
| Notifications | `/api/notifications` |
| Settings | `/api/settings` |
| Audit Logs | `/api/audit-logs` |
| Dashboard | `/api/dashboard` |

---

## ⚠️ Security Notes

- **Never commit `.env` files to version control.** Add `.env` to `.gitignore` immediately if not already done.
- Rotate `JWT_SECRET` and `REFRESH_TOKEN_SECRET` before deploying to production.
- Change the default admin password on first login.
- Set `NODE_ENV=production` in your production environment.
- Configure SMTP credentials for password reset emails to work.

---

## Modules

| Module | Status |
|---|---|
| Authentication (Login, Forgot/Reset Password) | ✅ |
| Dashboard | ✅ |
| Members (CRUD, Profile, Emergency Contacts) | ✅ |
| Cell Groups (CRUD) | ✅ |
| Ministry (Roles + Assignments) | ✅ |
| Users & Role Management | ✅ |
| Services (CRUD, Status Flow) | ✅ |
| Attendance (Barcode Check-in) | ✅ |
| Finance (Records, Summary) | ✅ |
| Events (CRUD, Registration) | ✅ |
| Inventory (Items, Requests) | ✅ |
| Archives (Upload, Versioning) | ✅ |
| Notifications (Bell, Polling) | ✅ |
| Audit Logs | ✅ |
| Settings | ✅ |

---

## License

Internal use only — PLWM Manila Central Church.
