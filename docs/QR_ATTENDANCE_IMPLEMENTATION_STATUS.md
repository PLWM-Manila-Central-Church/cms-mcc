# QR Attendance Implementation Status

Updated 7 October 2026. This status records the QR release merged to `main` as `bfeb476209682aada3a65d97561379ab0d5ec674`.

## Current outcome

QR attendance for Services and Events is deployed and enabled in production. CI, isolated TiDB QA, and the production Admin/Member smoke checks passed. Production attendance records were left untouched; no live QR token, QR session, or check-in was created during verification.

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
2. Dedicated tests for malformed, wrong-session, expired payloads and scanning an earlier image after QR reissue remain useful additional edge-case coverage. Existing integration coverage includes idempotent duplicates, scope enforcement, and QR revocation on reissue.

The release goal is complete for image-upload scanning and production availability. Physical camera testing and the additional edge cases above are follow-up hardening.
