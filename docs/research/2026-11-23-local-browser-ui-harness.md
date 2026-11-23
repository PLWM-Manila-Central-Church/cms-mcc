# Local browser control and UI smoke harness

Date: 2026-11-23
Status: working; 25/25 role-route checks pass locally.

## What this is

Playwright driving the system Chrome channel against the local Vite dev server, using the
role-review harness (`/role-review.html?role=…&embedded=1#/route`). It is full programmatic browser
control: navigation, clicks, keyboard, dialogs, console capture, network capture and screenshots.

```bash
cd cms-frontend
npm start                 # dev server on http://localhost:3000
npm run test:ui           # headless sweep, writes .qa/ui-smoke/
UI_HEADED=1 npm run test:ui   # watch it in Chrome
UI_BASE_URL=http://localhost:3000 npm run test:ui
```

Artifacts (gitignored): `.qa/ui-smoke/<case>.png` and `report.json`.

## Coverage

- **Member**: Overview, Calendar (opens a day dialog), Attendance, Tithes (money eye toggles),
  Ministries, Bible (opens a day dialog), plus 390px mobile Calendar and Tithes with horizontal
  overflow detection.
- **System Admin**: Dashboard, Events, Attendance, Finance, Archives, Analytics, Registration
  Analytics, Bible Reading, Ministry Schedules, Members, Notifications & Follow-ups.
- **Registration Team**: Dashboard, Attendance, Registration Analytics.
- **Pastor**: Analytics, Bible Reading.
- **Finance Team**: Finance.

Every case fails on page errors, uncaught console errors, HTTP 5xx, missing expected content,
failed interaction, or mobile overflow. The run exits non-zero if any case fails, so it can gate a
release.

## Result

`CASES: 25  FAILED: 0` — screenshots for every case, including the member calendar dialog, the
registration analytics drill-in and the mobile day dialog.

## Limits (important)

- The role-review harness **mocks the API**; this proves UI rendering, routing, permissions and
  interactions, not database responses, authentication or SMS delivery.
- No production or preview URL is touched. Real logged-in flows still need staging credentials.
- The Outreach screen in the harness shows “needs its database migration” because the mock
  availability endpoint returns `schema_ready: false`. That is a harness default, not proof about
  production — but the production outreach migration still needs verifying before live SMS.
- Playwright’s Chrome channel must exist on the machine; already present here (Playwright 1.63.0).

## Extending

Add a case to `scripts/ui-smoke.mjs`:

```js
{ role: 'Registration Team', route: '/events', expect: /events/i, name: 'reg-events',
  after: async (page) => { await page.getByRole('button', { name: /view/i }).first().click(); } }
```

Use `viewport` + `mobile: true` for narrow layouts. Keep `expect` specific enough to catch an error
screen but broad enough not to break on copy changes.
