# PLWM-MCC Church Implementation and Rollout Plan

**Status:** Prepared; rollout not approved or executed
**Scope:** Philippine Life Word Mission – Manila Central Church main branch

## Purpose and scope

This plan turns the thesis implementation objective—deploy the system at the church, train staff, and maintain it—into operational stages with observable exit checks. It covers the thesis modules: attendance, member profiles, service/event pre-registration, event management, notifications, finance, inventory, reports, and digital archives. It does not extend the system to other branches, payroll, advanced accounting, or advanced HR.

## Verified deployment baseline

- Vercel hosts the frontend and Render hosts `plwm-mcc-api`; both auto-deploy from GitHub `main`. The latest successful live deployments still point to `5856fb5548d4a7476bcdaf6c6b427276cda1a0f2`.
- TiDB Cloud is the MySQL-compatible database provider. The local acceptance target is isolated `qr_attendance_qa` with TLS and a scoped QA account; 39 schema compatibility checks pass and all 99 current QA migrations are applied.
- The `user/paper-alignment-completion` worktree is based on the current `main` commit but contains uncommitted source and migration changes. Those changes are not in GitHub `main` and are not deployed.
- Render's live API service is on the Free plan. The service-level environment has `S3_REGION` only; `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` are absent. The local API `.env` has none of the S3 values. The user selected an existing S3-compatible provider, but its identity and bucket/credential details are not yet available. Production `main` still uses ephemeral local-disk fallback; the local branch now fails production uploads closed with `503 UPLOAD_STORAGE_UNAVAILABLE`, but that guard is not on `main`.
- Render lists Brevo sender variables, but successful delivery and key validity are not confirmed. No SMS provider is configured. Live camera access remains unverified in the in-app browser; QA Analytics CSV downloads were captured and reconciled locally, and QR image upload works in QA.

## Go/no-go readiness gates

| Gate | Required evidence | Current state |
|---|---|---|
| Release candidate | Review the local diff, pass API/frontend tests and production build, inspect every migration, and merge only the reviewed release to `main`. | Local work is uncommitted; production still runs the earlier `main` commit. |
| Database | Take and verify a production backup; confirm the production database identity without exposing credentials; apply forward migrations once; confirm the migration ledger and 3NF checks. | QA checks pass. Production migration acceptance has not been run. |
| File storage | Identify the existing S3-compatible provider; configure its endpoint, bucket, region, and bucket-scoped access key/secret in the ignored local API `.env` and Render service. Keep objects private and serve them through the authenticated same-origin upload route. Verify upload, authorized download, unauthorized denial, delete, and persistence across restart/redeploy. | **No-go:** provider details and four required S3 values are missing locally and from Render's service-level environment. `render.yaml` already declares the secret keys as `sync: false`; no secret belongs in Git. The production guard must be released before opening writes without durable storage. |
| Notifications | Confirm sender/domain, Brevo key validity, notification consent/opt-in, and a controlled test recipient; verify in-app delivery separately from email. | QA UI verified in-app event, attendance, substitute, inventory manager, pending requester, and active Member notices. Brevo delivery/key validity and SMS remain unresolved. |
| Role acceptance | Sign in through the deployed UI as Admin, Registration, Finance, Pastor, Group Leader, Cell Group Leader, unified Leader, and Member; confirm navigation, scope, read/write controls, key workflows, and logout. | Local/QA journeys cover core flows. Full production acceptance is pending. |
| Data readiness | Dry-run member, group, ministry, finance-category, and inventory imports; reconcile counts and samples with authorized church records; preserve an export/backup and document rejected rows. | No production import was performed as part of this plan. |
| Research evidence | Resolve the manuscript's 47-respondent versus approximately-400 implied-sample discrepancy; collect real ISO/IEC 25010 responses, training attendance, manual distribution, and approval records. | **Human evidence required; do not fabricate.** |

## Rollout stages

### 1. Preflight and release review

1. Confirm the church's deployment owner, technical contact, data steward, and named Admin/Registration/Finance/Pastor/leader representatives.
2. Review the full local diff and dependency/security checks. Confirm `.env`, test manifests, downloaded QA files, and synthetic fixtures are not staged. Preserve the base `main` commit and create a rollback reference.
3. Confirm Vercel and Render still target `main`; verify health checks, CORS, same-origin `/api` proxy, database connection, feature flags, and rate limits without exposing values.
4. Close or explicitly sign off each no-go gate above. Do not claim uploads are production-ready while the S3 variables are absent.

### 2. Production data and migration preparation

1. Export and verify a restorable production backup before schema work or imports.
2. Compare the live schema and migration ledger against the reviewed release candidate. Apply only additive, idempotent forward migrations; avoid destructive resets and do not run fixture seeders against production.
3. Prepare validated import files for Members, statuses, Gender, groups/cell groups, and permitted reference data. Dry-run for duplicate identities, invalid dates/statuses, missing relations, and rejected rows; obtain church data-owner approval before the production import.
4. Reconcile table counts, representative profiles, group assignments, finance category totals, and soft-deleted records after import. Retain the source export and a row-level import report under the church's approved retention policy.

### 3. Controlled pilot

Run a pilot with synthetic or explicitly authorized real attendance, not a mixture of both:

1. Admin confirms accounts, permissions, the QR feature setting, and system notifications.
2. Registration tests one Service and one Event: direct member QR, leader batch submission/approval, duplicate/invalid/manual fallback, reconciliation, export, and history.
3. One Cell Group Leader, one Group Leader, and one unified Leader verify that their rosters and write actions stay within assigned scope; Pastor confirms read-only reports.
4. Finance verifies income/expense totals, anonymous records, date filters, and authorized archive receipts. Inventory verifies availability, usage/reversal, scoped request/review, and requester alerts.
5. Record any discrepancy, stop the affected workflow, use the documented paper fallback, and correct it in QA before resuming. Do not use live member attendance to manufacture test evidence.

### 4. Staff training and church rollout

Deliver the thesis's three-day training only after the release passes the readiness gates:

| Day | Audience | Hands-on content |
|---|---|---|
| 1 | System Admin, Registration Team | Sign-in/account recovery, member records, user roles, services/events, QR direct and batch attendance, reports, audit trail, incident escalation. |
| 2 | Finance Team, Inventory Manager, archive staff | Tithes/offerings and anonymous giving, expenses and receipts, finance date filters, inventory status/usage/requests, archive visibility and versioning. |
| 3 | Pastor, Group/Cell Group Leaders, Members | Read-only reports, assigned roster boundaries, inventory requests, leader batch attendance, member QR/profile/registration/notifications, manual fallback. |

Before training, update and render-review the existing user manual to cover fixed Member QR generation, direct Registration check-in, leader batches, Registration review, and the unified Leader scopes. The current DOCX/PDF predates QR attendance and does not document the unified Leader role. A source-verified Markdown guide and printable three-page PDF supplement now cover the QR workflows, but they do not replace updating the master DOCX/PDF. The prescribed renderer currently fails because `soffice.exe` is unavailable on this host, so the source manual was left unchanged rather than publishing an unreviewed layout. Run this edit in an approved DOCX-rendering environment, then use the versioned manual and role-specific practice accounts. Record attendance, trainer, date, covered modules, questions, and acknowledgement; distribute the manual through the church-approved channel and retain distribution evidence. Do not record training as completed until the church performs and signs it off.

### 5. Go-live and maintenance

1. Publish the reviewed release from `main`; verify the exact commit on both Vercel and Render. Apply production migrations only after backup confirmation.
2. Run a read-only smoke check first, then complete an approved pilot transaction and reconcile it. Confirm file persistence after a controlled restart/redeploy before enabling uploads broadly.
3. Monitor `/health`, API errors, login/session recovery, notification failures, storage errors, database connection limits, and backup completion. Review audit logs for administrative changes.
4. Assign an owner and schedule for account lifecycle, role changes, support triage, backup restore drills, data cleanup, dependency/security updates, and periodic access review.

## Rollback and incident response

- For application regressions, stop further rollout and redeploy the last known-good `main` commit on both providers. Verify health, login, and role access before reopening the system.
- For QR problems, disable the QR feature setting and use the approved paper attendance process. Do not delete attendance history or synthetic data outside an exact QA manifest.
- Treat database migrations as forward-only unless a reviewed rollback is proven safe. Restore from a verified backup only under the church's incident owner and record the restoration point and reconciliation.
- For missing or inaccessible uploads, disable new production uploads, preserve metadata and audit history, and recover from the configured object store or verified backup. Do not report local Render-disk files as durable.

## Evidence to attach at completion

- Reviewed release commit and provider deployment IDs.
- Production backup/restore evidence and migration ledger.
- Reconciled import report and data-owner sign-off.
- Browser acceptance record for each role and key workflow, including responsive checks and export artifacts.
- Storage persistence/access checks and notification delivery evidence.
- Real ISO/IEC 25010 instrument, sample rationale approved by the researcher/panel, response dataset, training attendance, and manual-distribution evidence.

Items requiring provider credentials, a paid-plan decision, or researcher/panel evidence stay marked pending until the corresponding evidence exists.

## Read-only deployment revalidation (2026-10-12)

- `git ls-remote --heads origin` still returns only `main` at `5856fb5548d4a7476bcdaf6c6b427276cda1a0f2`. GitHub Actions run `37756789080` on that SHA completed successfully for API tests, fresh database migrations/QR browser flow, and the frontend production build/tests. The GitHub rulesets endpoint returned an empty list. The connected GitHub integration returned 403 for the classic branch-protection endpoint; an earlier Settings UI inspection showed no classic protection. No repository setting changed.
- Vercel's latest Production deployment remains `READY` on `main` at `5856fb5548d4a7476bcdaf6c6b427276cda1a0f2`. Render's `plwm-mcc-api` remains a Free, one-instance web service on `main` at the same SHA; its deployed auto-deploy trigger is still `commit`. The local `checksPass` Blueprint change has not been synced or deployed.
- The first production `/health` request in this revalidation timed out at 20 seconds. Render logs then showed the service starting and the `S3 not configured` warning; a retry returned `ok` with `db=connected` after 13.6 seconds. Render metrics returned one memory sample and no CPU, request-count, latency, or instance-count points in the queried interval. The retry confirms recovery, while cold-start responsiveness and production uploads remain release checks.
- The latest Render runtime evidence still shows the disk-storage fallback. The provider's S3-compatible endpoint, bucket, and credentials are not configured in the deployed service; no storage, email, deployment, or GitHub setting was changed in this revalidation.
