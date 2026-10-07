# QR Attendance Implementation Status

Updated 7 October 2026. This status is for the local `codex/qr-attendance` worktree based on production `main` at `e698ef448ebd9b5283eb3fbbaf28970957e6ea10`.

## Current outcome

The feature implementation and Services/Events browser upload flow are verified against CI's disposable MySQL database and the isolated TiDB QA schema. Draft PR #14 is open, but the requested production-ready outcome is **not complete**: no production deployment or production attendance write has occurred. Production data and configuration have not been changed.

## Work completed locally

- Additive QR attendance schema and permission migrations, API services/routes, member QR identity, session lifecycle, direct check-in, leader batch submission, Registration Team review/approval, correction audit, scoped summaries, and CSV export.
- Member portal and operational member QR surfaces; lazy Service/Event workspace; upload and live-camera scanner component; QR image delivery and batch receipt UI.
- QR feature switch defaults off. Optional QR schema readiness is checked before use; legacy attendance compatibility and authentication files remain separate from QR-only fields and routes.
- System Admin Settings access now mirrors the API permission bypass; the browser test enables QR from its initially-off state through the actual Settings UI.
- The scanner prevents upload during camera startup. Uploaded images use a bounded decoder sequence: normal QR decode, QR-only `TRY_HARDER`, then `PURE_BARCODE` for clean digital QR images; live camera keeps the normal fast path.
- Camera callback handling and the upload fallback after a camera permission error have component regression coverage; physical camera optics are still unverified.
- Local browser upload/decode smoke: generated a synthetic member QR PNG with the project QR library, uploaded it through the actual scanner component, and decoded the expected payload with the real ZXing decoder. This is decoder evidence only.
- Focused mocked-API workspace coverage for Admin session creation/opening, Registration Team direct check-in confirmation, Cell Group Leader draft/submission, and Registration Team batch approval.
- CI browser E2E uses Chromium, the real QR scanner upload component, generated PNGs, real API routes, and disposable MySQL. It verifies the Admin enables the initially-off feature in Settings, then creates sessions; members download/reuse fixed QR across browser contexts; Registration Team checks in directly; Cell Group/Group Leaders submit batches; Registration Team approves; counts and member history persist.
- Added an explicit database-target guard for QR integration/browser fixture writes. It permits loopback CI MySQL or the TLS-enabled `qr_attendance_qa` schema with a non-root scoped account and confirmation markers; it rejects `church_cms` and unspecified remote targets.
- Added `db:bootstrap-qr-qa`, which used the `mcc-local-dev` branch root credential only to create `qr_attendance_qa` and a TLS-required app user limited to that schema. It wrote the generated app credentials into the ignored local API `.env` and removed the temporary root credential file.
- Split an older event-registration column addition from its foreign-key DDL for TiDB compatibility and added a forward-only idempotent repair migration for environments where the column or FK is missing.

## Verification status

| Gate | Result | Evidence / limitation |
| --- | --- | --- |
| API automated tests | Pass | Full local API run against TiDB QA: 13 Jest suites / 61 tests passed, including QR persistence integration. |
| QR database-target guard | Pass | 10 tests confirm QR writes are limited to loopback CI MySQL or the exact TLS TiDB endpoint/schema with explicit opt-in and the scoped `qrqa_app` user. |
| Uploaded QR decoder fallback | Pass, local | The real ZXing browser decoder recovered all 100 generated member/batch QR PNGs using the bounded fallback sequence; 13 required the final pure-barcode mode. Scanner component tests verify that fallback wiring. This does not replace the database-backed browser E2E. |
| Frontend automated tests | Pass | 7 Vitest files, 23 tests, including Admin permission parity, camera success/denial handling, upload decoding, role-flow workspace behavior, and the auth refresh-queue rejection regression. |
| Frontend production build | Pass with warning | Vite build succeeds. The main bundle is 933.19 kB; the separate ZXing bundle is 451.53 kB. The main bundle triggers the configured 500 kB chunk advisory. |
| Diff whitespace check | Pass | `git diff --check` is clean. |
| Browser image upload through persisted QR flows | Pass, CI MySQL and TiDB QA | Chromium uploaded synthetic member and leader batch QR PNGs through the actual scanner component. Direct Service/Event check-in, both leader batch approvals, counts, member history, logout, and protected-route redirect passed against real API routes and persisted databases. |
| Camera optical test | Not verified | No physical-device camera session is recorded. Image upload remains the mandatory laptop path. |
| API/database persistence | Pass on CI MySQL and TiDB QA | Four QR HTTP/API integration tests passed against the isolated TiDB schema and in CI MySQL, covering direct Service/Event writes, leader batch scope/approval, duplicates, scoped summaries, history, CSV, issue/image, and reissue. |
| Browser/API/database upload persistence | Pass on CI MySQL and TiDB QA | Chromium uploaded synthetic member and leader batch PNGs through the local Vite frontend and API connected to TiDB QA. Direct Service/Event check-in, both leader batch approvals, counts, and member history passed. |
| TiDB migrations and readiness | Pass on isolated QA | All 71 migrations applied to `qr_attendance_qa`, including QR schema, permissions, and the event-registration FK repair. A second `db:migrate` run was a no-op. All six QR tables and the enabled QA setting are present. |
| Persisted TiDB attendance evidence | Pass, synthetic QA data | In the successful browser run, the Service and Event sessions each finished with two confirmed attendees: one direct member scan and one leader-approved item. Each session had one approved leader batch. Repeat diagnostic runs also created synthetic QA fixtures; no production records were read or changed. |
| Login and representative module regression | Pass on isolated QA; production pending | Synthetic Admin, Registration Team, Cell/Group Leader, and Member login journeys passed locally against TiDB QA. Member portal service/event/finance/attendance endpoints loaded. Logout and protected-route redirect passed; production regression remains pending deployment. |
| Remote review and deployment | In review | Draft [PR #14](https://github.com/PLWM-Manila-Central-Church/cms-mcc/pull/14) is open against `main` and unmerged. TiDB QA passes locally; the latest migration compatibility and auth queue changes need to be pushed for fresh CI. Render's live API service tracks `main` and auto-deploys commits; `MIGRATE_ON_START=true` means a production deploy applies unapplied migrations. Current Render deploy was recorded as `0aa4f2b` and Vercel production as `e698ef4`; recheck these before release. Production checks remain pending. |

## External gates to close

1. Commit and push the TiDB compatibility migration and auth refresh-queue repair; then run CI and review the final diff.
2. Keep PR #14 in draft until CI and release-readiness review pass.
3. Verify camera operation on physical hardware if available; uploaded QR images already pass end to end on TiDB QA.
4. After review, merge through the normal process. Verify Render migration/startup and Vercel production deployment on `main`, then perform live login and read-only existing-module smoke checks.
5. Keep production attendance data untouched during smoke checks; enable QR for production use only after the release gate is confirmed.

Do not mark this implementation complete until fresh CI, production deployment, and post-deployment login/existing-module regression have evidence recorded in `QR_ATTENDANCE_VERIFICATION_REPORT.md`. Physical camera optics remain optional for the laptop image-upload path.
