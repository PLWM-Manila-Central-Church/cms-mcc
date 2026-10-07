# QR Attendance Implementation Status

Updated 7 October 2026. This status is for the local `codex/qr-attendance` worktree based on production `main` at `e698ef448ebd9b5283eb3fbbaf28970957e6ea10`.

## Current outcome

The feature implementation and Services/Events browser upload flow are verified against CI's disposable MySQL database. Draft PR #14 is open, but the requested production-ready outcome is **not complete**: there has been no TiDB migration, TiDB attendance write, or deployment. Production data and configuration have not been changed. The current laptop IP `112.207.106.57` is now allowed by TiDB; the `mcc-local-dev` branch still needs its root password before isolated QA can start.

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
- Added `db:bootstrap-qr-qa`, which uses the branch-specific root credential only to create a new `qr_attendance_qa` schema and an app user limited to that schema, then writes the generated app credentials into the ignored local API `.env` and removes the temporary root credential file. The script has not yet been run against TiDB.

## Verification status

| Gate | Result | Evidence / limitation |
| --- | --- | --- |
| API automated tests | Pass | Current local run: 11 Jest suites / 54 tests passed; the TiDB/MySQL persistence integration suite was skipped because no QR QA database is connected. |
| QR database-target guard and current API suite | Pass, local | 10 target-guard tests pass; the full API run passed 11 suites / 54 tests with one database integration suite skipped. No TiDB connection was made. |
| Uploaded QR decoder fallback | Pass, local | The real ZXing browser decoder recovered all 100 generated member/batch QR PNGs using the bounded fallback sequence; 13 required the final pure-barcode mode. Scanner component tests verify that fallback wiring. This does not replace the database-backed browser E2E. |
| Frontend automated tests | Pass | 6 Vitest files, 21 tests, including Admin permission parity, camera success/denial handling, camera-start/upload coordination, and the image decode retry. Role-flow workspace tests mock the API and do not prove persistence. |
| Frontend production build | Pass with warning | Vite build succeeds. The main bundle is 933.03 kB and ZXing is 477.54 kB; both trigger the configured 500 kB chunk advisory. The workspace is lazy-loaded. |
| Diff whitespace check | Pass | `git diff --check` is clean. |
| Browser image upload through persisted QR flows | Pass, CI MySQL | Chromium uploaded synthetic member and batch QR PNGs through the actual scanner component and drove direct Service/Event check-in, leader batch submission/approval, count refresh, and member history against real API routes and a disposable database. |
| Camera optical test | Not verified | No physical-device camera session is recorded. Image upload remains the mandatory laptop path. |
| API/database persistence | Pass, limited to CI MySQL | Fresh migrations and four QR HTTP/API integration tests passed in GitHub Actions run `37561268697`, covering direct Service/Event writes, leader batch scope/approval, duplicates, scoped summaries, history, CSV, issue/image, and reissue. |
| Browser/API/database upload persistence | Pass, limited to CI MySQL | GitHub Actions run `37561268697` passed the real Chromium upload-to-API-to-MySQL Service/Event role flows, Admin Settings enablement, leader batch QR upload/review, counts, and member history. TiDB compatibility is still unverified. |
| TiDB network and isolated QA | Partially unblocked | TiDB now confirms `112.207.106.57` is allowed. The `mcc-local-dev` Connect dialog still says no branch password is set. No QA schema, QR migration, or attendance write has occurred. The new guarded bootstrap targets only `qr_attendance_qa`; it is unverified against the live branch until that password is generated. |
| Live login and existing-module regression | Not verified on a QR deployment | No QR build has been deployed. Source review shows authentication files were not changed; that is not live regression evidence. |
| Remote review and deployment | In review | Draft [PR #14](https://github.com/PLWM-Manila-Central-Church/cms-mcc/pull/14) is open against `main` and unmerged. CI run `37561268697` passed on head `13a2d05`, including fresh migrations, four API persistence tests, frontend tests/build, Admin Settings enablement, uploaded-QR Service/Event browser E2E, and camera component tests. Render's live API service tracks `main` and auto-deploys commits; `MIGRATE_ON_START=true` means a production deploy applies unapplied migrations. Current Render deploy is `0aa4f2b` and Vercel production is on `e698ef4`; Vercel has no QR branch preview. TiDB QA and production checks remain pending. |

## External gates to close

1. Generate the root password for the `mcc-local-dev` branch in TiDB Cloud and enter it in the temporary ignored `cms-api/.env.tidb-qa-bootstrap` file. Then run `npm run db:bootstrap-qr-qa`; this creates a new `qr_attendance_qa` schema and a TLS-required user scoped to that schema. Do not use the existing `church_cms` schema or production-oriented credentials.
2. Review draft PR #14 and keep it unmerged until isolated TiDB QA and the production-readiness review pass. The browser upload flow already passes on disposable MySQL.
3. Apply the additive migrations only to the isolated QA target, then verify readiness, feature-off behavior, and deliberate enablement.
4. Repeat the Services and Events browser flows on isolated TiDB QA with synthetic accounts and generated PNGs; verify durable rows, idempotency, role/group scope, review receipts, summaries, member history, CSV, and audit records.
5. Re-run login and existing-module journeys in the QA deployment. Record camera results separately; lack of a camera must not be reported as a pass.
6. Only after QA/review pass, merge through the repository's normal review process and verify the deployed `main` build and migration state.

Do not mark this implementation complete until the pending database-backed, role-flow, regression, and release gates have evidence recorded in `QR_ATTENDANCE_VERIFICATION_REPORT.md`.
