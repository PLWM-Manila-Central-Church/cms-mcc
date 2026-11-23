# Archive retention and registration analytics

Date: 2026-11-23
Status: implemented locally; not deployed or run against production TiDB

## Part 1 — Archive lifetime, listing and safeguards

Current state: archiving is a soft delete (`archive_records.is_deleted = 1`) with restore and role
scoping, but nothing is ever removed and there is no retention UI. System archives are soft-deleted
rows from ~20 tables surfaced through a UNION view.

Design:

- **Retention window**: 60 days from archiving. `purge_after` is written when a record is archived
  (`deleted_at + 60 days`) and recomputed on every restore/re-archive.
- **Auto purge**: a daily scheduler (same pattern as the outreach scheduler) deletes due records:
  - document archives: `archive_records` + its versions and access logs, and the stored file;
  - system records: only secondary retained data (notifications, contacts, ministry memberships/
    assignments, attendance batch items, event images, check-ins). People, money, events and
    services are **protected** and never auto-purged.
- **Safeguards**:
  - `retention_hold` on document archives and an `archive_holds` table for system records;
    held items are skipped and shown as "Held".
  - Financial Records category documents are exempt from auto purge.
  - System Admin only for purging and holds; every purge writes an audit log entry.
  - `system_settings.archive_auto_purge = '0'` disables the scheduler.
  - UI shows days remaining, held state, and a banner explaining the 60-day rule; purge failures
    are skipped per row instead of aborting the batch.
- **Organised list**: archived document view gains retention sort/filter and a "Due soon" chip;
  the system archive table gains the same countdown, grouping by entity type already present.

Files: migration `20261123000001-archive-retention`, `ArchiveHold.model.js`,
`helpers/archiveRetention.helper.js` (+ test), `services/archiveRetention.service.js`,
`modules/archives/retentionScheduler.js`, archive routes/controller, `ArchivesPage.jsx`,
`SystemArchivesPanel.jsx`, `server.js`.

## Part 2 — Registration analytics

Registration Team already has `attendance:read` and `events:read` but no reporting surface of its
own (the analytics page is dashboard-gated and church-wide).

Design:

- Endpoint `GET /reports/registration?from&to` (attendance:read): programme totals (events,
  registrations, capacity fill, seats, parking), per-event rows with counts and fill rates,
  registration timeline by day, and an attendance summary for services in range (present counts,
  services held, average per service, recent services).
- Endpoint `GET /reports/registration/events/:id`: one event with cumulative registrations per
  day, seat/parking reserved split, registrar list (name, registered at, seat, parking).
- Page `/reports/registration`, nav visible to Registration Team, Admin, Pastor:
  - metric rail, registration trend (reuse `LineTrend`), category mix (`RankedBars`),
    event table with fill bars, attendance summary table;
  - clicking an event opens a centred detail dialog (same `PortalDialog` pattern) with the
    cumulative trend, seat/parking donut and the registrant list.
- Pure helpers (`fillRate`, `cumulativeSeries`, `attendanceRate`) unit tested; page tested with
  mocked axios.

Files: `services/registrationAnalytics.service.js`, `helpers/registrationAnalytics.helper.js`
(+ test), reports controller/routes, `pages/reports/RegistrationAnalyticsPage.jsx` (+ test),
`AppRoute.jsx`, `constants.js`, `Sidebar.jsx` (roles filter already supported).


## As built (2026-11-23)

Verified locally:

- archive retention helper: 7 tests; registration analytics helper: 3 tests;
  Mocean transport: 5 tests; existing SMS safety: 2 tests.
- frontend: 235/235 tests and production build pass; UI smoke harness 25/25 routes.
- Mocean live: one SMS accepted (HTTP 202, status 0, 1 credit), received on the handset.

Not done / not verified:

- Neither migration has been applied to production TiDB; the archive purge and registration APIs
  have not run against real data.
- System-record retention holds exist as an API only; there is no toggle in the system archive UI.
- The registration page has only been exercised against the mock harness, not live registrations.
- Deployment is blocked: the org rejects the supplied GitHub PAT (lifetime policy), so Render is
  still running the 22 Oct build.
