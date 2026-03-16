# PLWM-MCC Church Management System

**Philippine Life Word Mission — Manila Central Church**  
Parañaque City, Philippines

---

## Overview

A full-stack Church Management System (CMS) built for PLWM Manila Central Church. The system includes a **public-facing church website** and a **protected internal management system** for staff and members.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js (Create React App) |
| **Backend** | Node.js + Express + Sequelize |
| **Database** | MySQL (hosted on Railway) |
| **Auth** | JWT (8h access token + 7d refresh token) |
| **Email** | Brevo API (`BREVO_API_KEY`) |
| **Frontend hosting** | Vercel |
| **Backend hosting** | Railway |
| **ORM migrations** | sequelize-cli |

---

## Project Structure

```
cms-mcc/
├── cms-frontend/          # React frontend (deployed to Vercel)
│   ├── public/
│   │   ├── index.html     # viewport-fit=cover for notch/fold support
│   │   ├── logo.jpg       # Church logo
│   │   ├── mcc.jpg        # MCC building photo (login page background)
│   │   └── smr.jpg        # Summer retreat photo
│   └── src/
│       ├── api/           # Axios instance + interceptors
│       ├── components/
│       │   └── layout/
│       │       ├── MainLayout.jsx   # Responsive: drawer on mobile, collapse on tablet
│       │       ├── Sidebar.jsx      # Nav sidebar with mobile drawer mode
│       │       └── Header.jsx       # Top bar with hamburger + notifications
│       ├── context/
│       │   └── AuthContext.jsx      # JWT auth + permissions
│       ├── pages/
│       │   ├── public/              # Public church website (no auth)
│       │   │   ├── PublicLayout.jsx # Shared nav + footer + Google Translate
│       │   │   ├── HomePage.jsx     # Landing page with YouTube video hero
│       │   │   ├── BibleSeminarPage.jsx
│       │   │   ├── BibleSeminarAdultsPage.jsx  # 5 video series
│       │   │   ├── BibleSeminarSchedulePage.jsx
│       │   │   ├── LatestSermonPage.jsx
│       │   │   └── OtherPages.jsx   # Sermon, World Mission, Introduction, Beliefs, CI
│       │   ├── auth/
│       │   │   ├── LoginPage.jsx    # Split layout (mcc.jpg bg + form)
│       │   │   ├── ForgotPasswordPage.jsx
│       │   │   ├── ResetPasswordPage.jsx
│       │   │   └── ForceChangePassword.jsx
│       │   └── [cms pages]/         # Dashboard, Members, Finance, Events, etc.
│       ├── routes/
│       │   ├── AppRoute.jsx         # Route definitions (public + protected)
│       │   └── ProtectedRoute.jsx   # Guards: unauthenticated → /login
│       ├── utils/
│       │   └── constants.js         # NAV_ITEMS, permissions, role constants
│       ├── index.css                # Global responsive CSS + breakpoints
│       └── index.js
│
└── cms-api/               # Express backend (deployed to Railway)
    ├── migrations/        # Sequelize migration files
    ├── seeders/           # Seed data
    └── src/
        ├── app.js         # Express app + CORS + route registration
        ├── server.js      # DB connect + listen
        ├── config/        # DB + Sequelize config
        ├── controllers/   # Request handlers
        ├── services/      # Business logic
        ├── models/        # Sequelize models (37 tables)
        ├── routes/        # Express routers
        ├── middlewares/   # verifyToken, authorize, errorHandler
        ├── helpers/
        │   └── auditLog.helper.js   # Fire-and-forget audit logging
        └── utils/
            └── mailer.js            # Brevo API email
```

---

## Roles & Permissions

| Role | Description |
|---|---|
| **System Admin** | Full access to all modules |
| **Pastor** | Dashboard, members, finance view, events, audit logs |
| **Registration Team** | Members, events, services, attendance |
| **Finance Team** | Finance, members view |
| **Cell Group Leader** | Cell groups, members view, events, inventory requests |
| **Group Leader** | Group view, events, inventory requests |
| **Member** | My giving, events (self-registration), services |

---

## Public Website Routes

| Path | Page |
|---|---|
| `/` | Home (YouTube video hero, gatherings, events, mission) |
| `/bible-seminar` | Bible Seminar introduction (7 topics) |
| `/bible-seminar/adults` | 5-video adult seminar series |
| `/bible-seminar/schedule` | 2026 seminar & retreat schedule |
| `/sermon/latest` | Latest sermon (playlist embed) |
| `/sermon/sunday` | Sunday sermon archive |
| `/sermon/christian-life` | Christian Life Seminar series |
| `/world-mission` | PLWM overview (108 churches, 60 branches) |
| `/world-mission/status` | Full church & branch list |
| `/introduction` | Church introduction |
| `/introduction/beliefs` | What We Believe (7 doctrinal statements) |
| `/introduction/ci` | Church Identity |

---

## CMS Routes (Protected)

| Path | Module |
|---|---|
| `/dashboard` | Role-specific dashboard with stats |
| `/members` | Member directory, profiles, form |
| `/cell-groups` | Cell group management |
| `/ministry` | Ministry roles and assignments |
| `/users` | User account management |
| `/attendance` | Service attendance overview |
| `/services` | Service schedules + attendance |
| `/finance` | Financial records + giving |
| `/events` | Events + registration |
| `/inventory` | Inventory items + requests |
| `/archives` | Document archive + versions |
| `/audit-logs` | System audit log |
| `/settings` | System settings |

---

## Environment Variables

### Frontend (Vercel)

```env
REACT_APP_API_URL=https://your-railway-app.railway.app
```

### Backend (Railway)

```env
PORT=5000
NODE_ENV=production

# Database
DB_HOST=your-railway-db-host
DB_PORT=3306
DB_NAME=cms_mcc
DB_USER=root
DB_PASSWORD=your-password

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGIN=https://cms-mcc.vercel.app,https://your-other-origin.com

# Email (Brevo)
BREVO_API_KEY=your-brevo-api-key
SMTP_FROM=PLWM-MCC <noreply@yourdomain.com>

# Frontend URL (for password reset links)
FRONTEND_URL=https://cms-mcc.vercel.app

# Misc
BCRYPT_ROUNDS=10
```

---

## Local Development

### Frontend
```bash
cd cms-frontend
npm install
# Create .env.local:
echo "REACT_APP_API_URL=http://localhost:5000" > .env.local
npm start
```

### Backend
```bash
cd cms-api
npm install
# Create .env file with variables above (DB pointing to local MySQL)
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
```

---

## Deployment

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set `REACT_APP_API_URL` in Vercel environment variables
3. Build command: `npm run build`
4. Output directory: `build`

### Railway (Backend)
1. Connect GitHub repo to Railway
2. Set all backend environment variables in Railway dashboard
3. Start command: `npx sequelize-cli db:migrate && node src/server.js`

---

## Responsive Design

The entire app is optimized for all device sizes:

| Breakpoint | Target devices |
|---|---|
| `≤ 320px` | Samsung Galaxy Z Fold (closed), very small phones |
| `≤ 480px` | Small phones (iPhone SE, Galaxy A series) |
| `≤ 768px` | Phones (iPhone 14, Galaxy S24) |
| `≤ 1024px` | Tablets (iPad, Galaxy Tab, iPad mini) |
| `> 1024px` | Laptops and desktops |

**Mobile behavior:**
- CMS sidebar becomes a full-screen drawer with backdrop overlay
- Header shows hamburger menu; hides email and role tag
- All data tables scroll horizontally
- All multi-column grids stack to single column
- Login page shows form only (photo panel hidden)

**Public website:**
- Navigation dropdowns are click-toggle (works on touch)
- Language bar + nav bar scroll as one unit (no floating gap)
- YouTube video hero disabled on mobile (replaced with solid background)
- All section grids collapse at 900px → 600px → 320px progressively

---

## PLWM Mission Data

- **108 PLWM Churches** across Luzon, Visayas, Mindanao, and Palawan
- **60 Mission Branches** nationwide
- Scripture: *"I shall not die, but live, and declare the works of the LORD."* — Psalm 118:17

---

## Known Placeholders

The following contact information is currently placeholder and should be updated:

- Church address (Parañaque City, Philippines)
- Church phone number
- Church email address

---

## License

© 2026 Manila Central Church · Philippine Life Word Mission (PLWM)  
All rights reserved. Built for community, powered by faith.
