# QR Attendance Implementation Status

Updated 12 October 2026. The original QR release merged to `main` as `bfeb476209682aada3a65d97561379ab0d5ec674`; the current `main`, Vercel Production, and live Render API are at `5856fb5548d4a7476bcdaf6c6b427276cda1a0f2`. The detailed verification table below records the initial release baseline; current local QA follow-ups are appended.

## Current outcome

QR attendance for Services and Events is deployed in production. A prior production smoke check found the feature enabled and confirmed the Admin/Member QR surfaces; no production QR token, session, or attendance record was created. The latest local isolated QA UI verified fixed Member QR issue/display/download, uploaded direct check-in, manual check-in, leader batch submission and QR review/approval, Member history, scoped Service/Event views, and Pastor read-only attendance. Production QR writes and live camera capture remain unverified.

## Work completed locally

- Additive QR attendance schema and permission migrations, API services/routes, member QR identity, session lifecycle, direct check-in, leader batch submission, Registration Team review/approval, correction audit, scoped summaries, and CSV export.
- Member portal and operational member QR surfaces; lazy Service/Event workspace; upload and live-camera scanner component; QR image delivery and batch receipt UI.
- The QR feature switch defaults off in code. After production checks passed, the Admin enabled it in Settings. Optional QR schema readiness is checked before use; legacy attendance compatibility and authentication files remain separate from QR-only fields and routes.
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
| Login and representative module regression | Pass on TiDB QA and production | Synthetic QA roles passed the full QR flow. Production Admin login, session restoration after reload, and Services/Members/Events pages passed. Production Member login, Events/Attendance/Tithes pages, QR panel visibility, and logout passed. |
| Production QR feature switch | Pass | Admin enabled `qr_attendance_enabled`; the setting remained enabled after reload. Member QR panel appeared. The test stopped before creating a member QR credential or attendance session. |
| Render production deployment | Pass | Auto-deploy from `main` checked out `bfeb476209682aada3a65d97561379ab0d5ec674`; migrations completed, deploy went live, and `/health` returned `ok` with the database connected. |
| Vercel production deployment | Pass | `cms-mcc.vercel.app` is assigned to a READY production deployment for `bfeb476209682aada3a65d97561379ab0d5ec674`. |
| Remote review and deployment | Complete | [PR #14](https://github.com/PLWM-Manila-Central-Church/cms-mcc/pull/14) was squash-merged to `main`. GitHub Actions run `37565761403` passed all three jobs on the final PR head; production migration and login/module smoke checks passed. |

## Remaining limitations

1. No physical camera optical session was available; uploaded QR image scanning passed end to end in CI and on TiDB QA.
2. Additional fuzzing of QR parser boundaries remains useful. The guarded suite covers malformed and wrong-kind payloads, cross-session batch QR use, closed capture windows, expired batch submission, reason-gated late approval, duplicate check-ins, scope enforcement, and old member QR rejection after reissue.

The application supports image-upload scanning and is deployed, but this does not prove production QR check-ins work end to end. Physical camera testing, production attendance write validation, and the additional payload/session edge cases remain open.

## Local QA follow-up (10 October 2026)

- APR review found that the leader roster search compared a full-name query against each name column separately. It now matches `First Last` and `Last First` across name-field boundaries while keeping the assigned-team filter outside the search alternatives. The UI explicitly reports when no member matches the current leader's team.
- The guarded QR integration suite passed 17/17 after the search repair, including full-name, reversed-name, and outside-scope queries; the full API suite also passed 39 suites/177 tests (17 database tests skipped in that run). In the rendered local QA UI, a Cell Group Leader found and added an assigned member, an outside-cell member remained absent, the leader submitted a batch, and Registration reviewed and approved it. The confirmed Event attendance row appeared as `Present` with source `leader_batch`.
- The exact QA fixture was removed afterward; suffix counts are zero and the previously captured `qr_attendance_enabled` value was restored. This local follow-up did not change the deployed release, production database, or `main`.
- The camera preview did not reach a confirmed ready/error state in the in-app browser during this follow-up; live camera optics remain unverified. The separate image-upload path remains covered by the earlier CI and TiDB browser runs listed above.

## Local QA follow-up (11 October 2026)

- **QR session export repair:** The rendered UI showed confirmed attendance, but the session CSV download was not covered by the earlier UI checks. Source review found the generated object URL was revoked immediately after `link.click()`. The export now attaches the anchor before clicking, removes it afterward, and revokes the URL after a short delay. A focused workspace test verifies the anchor is connected during activation and the URL stays valid until cleanup.
- **Rendered export verification:** In isolated `qr_attendance_qa`, Registration confirmed two Service check-ins and downloaded the session CSV. Its two rows included the expected columns and `direct` / `manual` values. A Cell Group Leader then opened the same Service and downloaded the scoped CSV; it contained only the in-cell attendee and excluded Registration's outside-cell check-in. The rendered Cell Group attendance sheet showed the same one-row scope.
- **QR flow and fixture cleanup:** The Member generated and downloaded a fixed QR; Registration uploaded it through the real scanner and confirmed a QR/direct Service check-in in an earlier QA pass. The final manifest cleanup removed synthetic users, QR credentials, sessions, check-ins, and the fixture manifest, restoring `qr_attendance_enabled=true`. No production attendance data was changed.
- **Validation boundary:** Frontend regression coverage and the production build are recorded in the paper-alignment completion plan. The export fix is local and uncommitted; production direct/batch/CSV behavior and live camera capture were not exercised.

## Final local role-flow verification (11 October 2026)

- Member QR issuance through the Admin member profile rendered version 1 and a PNG download. The Member portal Attendance tab showed the same fixed QR, issue date, and download/print actions.
- For a pre-existing isolated QA Service session, Registration uploaded a member QR image, reviewed the resolved member, and confirmed the direct check-in. The Cell Group Leader saw its scoped Service attendance, added a member to a leader batch, submitted it, and downloaded the batch QR. Registration scanned that QR image, reviewed the captured row, and approved it. The Service list showed the direct QR and leader-batch records with the expected provenance.
- For Event `1435047`, Registration opened a temporary registration-required Event session. A registered member QR check-in, a manual lookup check-in, and a Cell Group Leader batch submission/Registration approval all appeared in the Event session as separate `event_attendances` rows. Pastor saw the Event counts and records without scan or review controls.
- The unified Leader UI switched between its Cell Group and Group assignments; its combined-team view was read-only. After the browser checks, only the newly created attendance/session/batch/credential/notification/audit rows were removed. Event `1435047`, its three registrations, three seats, two parking assignments, and the pre-existing Service session were preserved.
- `Start Camera` on `http://127.0.0.1:3000` returned the visible permission-denied fallback. Uploaded member and batch images decoded locally and were not uploaded by the scanner. Live camera capture remains pending an allowed origin permission and usable camera device.

## QR error-contract integration follow-up (12 October 2026)

- **Analyze and plan:** The guarded database suite lacked explicit cases for malformed member payloads, a batch QR resolved against the wrong activity session, and a session whose check-in window had closed. Add one isolated test that asserts application error codes/statuses and verifies scan errors do not use HTTP 401.
- **Repair:** The first closed-window fixture targeted a Service that already had its single allowed QR session and received the correct `ATTENDANCE_SESSION_EXISTS` response. The test was moved to a second uniquely keyed synthetic Event session. The transient session/audit entries and submitted cross-session batch are removed inside the test so shared fixture report counts stay stable.
- **Verification:** The guarded TiDB suite passed 19/19, including `QR_INVALID` (400), `CHECK_IN_CLOSED` (409), `BATCH_SESSION_MISMATCH` (409), `BATCH_SUBMISSION_EXPIRED` (410), and reason-gated `BATCH_APPROVAL_EXPIRED` (410). The full API suite passed 60 suites / 275 tests with 19 DB-integration cases skipped in that separate run. All 39 QA compatibility checks pass and the live catalog matches all 57 Sequelize models.
- **Responsive QA:** At 390 × 844, the Event QR session selector and the Service scanner modal rendered without horizontal overflow. The modal measured 375 pixels wide within a 375-pixel document/body layout; the temporary viewport was reset after inspection.
- **Local origin/camera follow-up:** The ignored API `.env` now aligns API `PORT=5001` with the Vite proxy and includes both local origins. Registration sign-in succeeded at `http://localhost:3000`; the visible `Start Camera` attempt timed out, while `127.0.0.1` previously returned permission denied. The in-app browser capability list exposes no camera-permission setting, and no live stream was received.
- **Boundary:** These checks use the isolated QA schema; they do not prove live camera access or production QR writes.

## Final local auth and fixture follow-up (12 October 2026)

- The auth-session migration links each refresh token to its `user_sessions` row. Rendered QA login/reload/logout passed for Admin, Pastor, unified Leader, Member, and Registration. Each latest QA session had a populated `logout_at` and its linked refresh token revoked. The Leader dashboard rendered both assigned teams and kept the combined view read-only.
- The manifest cleanup initially stopped on a foreign-key restriction because a browser-created reservation Event owned by the synthetic Admin was not listed as the seed's primary Event. The helper now validates all Events owned by manifest users against synthetic title patterns and fixture-only registrations, includes their attendance sessions, and removes dependent rows before users. The retry removed the full QA fixture and manifest and restored `qr_attendance_enabled=true`; no production data was touched.
- QA is clean of this fixture. All 100 migrations are applied; the refreshed catalog matches the 58-table schema and all 39 compatibility checks pass. These checks establish local QA behavior only.
- The in-app browser still does not provide a usable camera stream or permission control. Uploaded member and batch QR flows remain the verified laptop path; live camera and production check-ins remain unverified.
