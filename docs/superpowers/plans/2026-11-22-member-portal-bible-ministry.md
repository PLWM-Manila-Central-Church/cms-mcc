# Member Portal: Ministry Schedules, Bible Reading, Money Privacy

Date: 2026-11-22
Status: approved for implementation (user asked for analysis, a plan, and completion in one pass)
Scope: `cms-api` + `cms-frontend` member portal and one registration-team screen.

## What the member asked for

1. **Ministry page** — no applications inside the portal; a member is assigned, not applying.
   An assigned member sees only their ministry's schedule: events where the ministry is
   assigned, practice schedules, and cleaning duty. Clean, simple, not overwhelming.
2. **Bible reading** — a per-group memory verse assigned each Sunday (visible already for the
   coming Sunday once the latest Sunday has passed), a reading calendar members tick off, and
   a registration-team view of who finished the month. The supplied Google Sheet is the plan
   format for 2026 (six months real, six months placeholder).
3. **Tithes** — one show/hide control that conceals every amount on the tab.

## Constraints

- Palette unchanged: `#005599`, `#003d70`, `#13b5ea`, `#f5f7fa`, `#fff`, `#e2e8f0`, `#0f172a`, `#52647a`,
  plus the portal's existing theme object (light/dark) — no new hues.
- Native stack only: React + existing theme objects, Express + Sequelize. No new dependencies.
- Member route stays `/portal`; member role still cannot reach admin routes.
- Admin screen reuses the existing module permission system; no new roles.
- Sheet is the source of truth for Jan–Jun 2026; Jul–Dec 2026 render as an honest placeholder
  ("plan not published yet"), never as fake readings.

## Data and API design

New tables (one migration):

| Table | Columns |
| --- | --- |
| `ministry_schedules` | id, ministry_role_id, kind ENUM('practice','cleaning','service'), title, schedule_date, start_time, end_time, location, notes, created_by, is_deleted |
| `bible_reading_progress` | id, member_id, reading_date DATE, completed_at, UNIQUE(member_id, reading_date) |
| `group_memory_verses` | id, group_id, sunday_date DATE, reference, verse_text, created_by, UNIQUE(group_id, sunday_date) |

Portal endpoints (member token):

- `GET /member-portal/schedule` → merged: service assignments, ministry schedules for the
  member's ministries, ministry event invites. Grouped server-side by `kind`.
- `GET /member-portal/bible-reading?month=YYYY-MM` → plan days, ticked dates, counts, target,
  memory verse for this/next Sunday and whether my group owns it.
- `POST /member-portal/bible-reading/:date` → toggle one day.
- `GET /member-portal/memory-verse` → resolved verse (kept separate for the Overview card).

Registration-team endpoints (`attendance:read`, resolved as a ruling):

- `GET /bible-reading/summary?month` → members, completed, target, percent, finished flag.
- `GET /bible-reading/verses?month`, `POST /bible-reading/verses`, `DELETE /bible-reading/verses/:id`.

Ministry schedule admin (`ministry:update`):

- `GET /ministry/schedules?ministryRoleId`, `POST /ministry/schedules`, `DELETE /ministry/schedules/:id`.

Plan data lives in `cms-api/src/data/bible-reading-2026.json` (generated from the sheet: 181 real
days Jan–Jun) plus a placeholder generator for Jul–Dec.

## Affected files

Backend — new: migration, three models, `src/data/bible-reading-2026.json`,
`src/helpers/bibleReading.helper.js`, `src/services/bibleReading.service.js`,
`src/services/ministrySchedule.service.js`, `src/controllers/bible-reading.controller.js`,
`src/routes/bible-reading.routes.js`. Modified: `member-portal.routes.js`,
`member-portal.controller.js`, `ministry.routes.js`, `app.js`, three tests.

Frontend — new: `src/components/portal/BibleReadingPanel.jsx`,
`src/components/portal/MinistrySchedulePanel.jsx`, `src/pages/reports/BibleReadingPage.jsx`.
Modified: `pages/members/MemberPortal.jsx` (sixth tab, ministry schedule, money eye),
`pages/ministry/MinistryPage.jsx` (Schedules tab), `routes/AppRoute.jsx`, `utils/constants.js`
(nav item), `utils/roleAccess.js` (paths). Tests: panel tests, page test, portal test.

## Layout decisions

- Portal ministry tab: three small groups — **Next up** (service assignments), **Practices**,
  **Cleaning** — each a plain list of date/time/location rows, no cards inside cards, no icons
  per row. Empty group renders one muted line, never an empty box.
- Bible tab: month strip (7 columns, weekday letters), today outlined, completed days filled
  with the accent tint and a check, future days quiet. Above the grid: one memory-verse line
  ("My group · Sunday, Mar 8 · Psalm 23:1–6") or a muted "No verse assigned to your group yet."
  Below: `12 of 31 days · 39%` with a thin progress rule. Registration sees the same shape in
  a table.
- Money eye: one control at the top-right of the hero, `eye`/`eyeOff` icon, `aria-pressed`,
  label "Hide amounts"/"Show amounts"; hiding replaces every amount with `₱ ••••` and keeps
  layout stable (tabular width). Preference persists in `localStorage` (`plwm_money_hidden`).

## Task order

1. Migration + models + plan JSON + helper (TDD on helper).
2. Services (TDD on pure logic: memory-verse resolution, monthly summary, schedule grouping).
3. Controllers + routes + app mount.
4. Portal ministry schedule panel.
5. Portal Bible tab (reading grid + memory verse) + Overview verse line.
6. Tithes eye toggle.
7. Admin Bible reading page + nav/permissions.
8. Ministry schedules admin tab.
9. Full tests + build + visual check at 3000.

## Rulings taken up front

- Verse assignment and reading monitor are guarded by `attendance:read` rather than inventing
  a new permission: Registration Team already holds it, Admin/Pastor hold everything.
- Portal "Bible" becomes a sixth tab rather than a new route: the portal is a single-page
  tabbed surface and a route would break the member-only redirect structure.
- Placeholder months show an explicit "not published" state; no invented readings.

## As built (deviations from this plan, with reasons)

- Ministry schedules became a standalone page at `/ministry/schedules` (nav: Admin, Pastor,
  Ministry Leader) instead of a tab inside `MinistryPage`: that page is already a six-tab
  surface for leaders, and a separate route keeps the admin entry discoverable without
  reworking its tab renderer.
- The upcoming memory verse also appears as one quiet card on the portal Overview, above the
  profile card, so the assignment is visible without opening the Bible tab.
- Reading monitor and verse endpoints are additionally limited to the three role names
  (not only the `attendance:read` permission), because the data is church-wide member
  progress rather than team attendance.

## Revision (later the same day): the event surface becomes a calendar

- The portal now opens on a full-page **Church calendar** (tab "Calendar", second tab,
  default landing). It lists every upcoming event, keeps multi-day events on each day they
  cover, marks registered events, and shows the selected day's details underneath.
- The old Events tab content was removed: **no upcoming services, no ministry assignment
  lists, no ministry invite cards** on the calendar surface. Ministry schedules stay on the
  dedicated Ministries tab and in `/ministry/schedules`.
- Month navigation uses Manila dates; past events are not invented, and past days simply
  carry no chips.
- The November–December 2026 schedule supplied for review lives in
  `cms-frontend/src/design-review-events.js` and is served by the local review harness only.
