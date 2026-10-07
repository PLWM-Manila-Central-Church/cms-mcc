# QR Attendance Implementation Status

Updated 7 October 2026. This status is for the local `codex/qr-attendance` worktree based on production `main` at `e698ef448ebd9b5283eb3fbbaf28970957e6ea10`.

## Current outcome

The feature implementation and Services/Events browser upload flow are verified against CI's disposable MySQL database. Draft PR #14 is open, but the requested production-ready outcome is **not complete**: there has been no TiDB migration, TiDB attendance write, or deployment. Production data and configuration have not been changed.

## Work completed locally

- Additive QR attendance schema and permission migrations, API services/routes, member QR identity, session lifecycle, direct check-in, leader batch submission, Registration Team review/approval, correction audit, scoped summaries, and CSV export.
- Member portal and operational member QR surfaces; lazy Service/Event workspace; upload and live-camera scanner component; QR image delivery and batch receipt UI.
- QR feature switch defaults off. Optional QR schema readiness is checked before use; legacy attendance compatibility and authentication files remain separate from QR-only fields and routes.
- Local browser upload/decode smoke: generated a synthetic member QR PNG with the project QR library, uploaded it through the actual scanner component, and decoded the expected payload with the real ZXing decoder. This is decoder evidence only.
- Focused mocked-API workspace coverage for Admin session creation/opening, Registration Team direct check-in confirmation, Cell Group Leader draft/submission, and Registration Team batch approval.
- CI browser E2E uses Chromium, the real QR scanner upload component, generated PNGs, real API routes, and disposable MySQL to verify Admin session setup, member QR downloads/reuse across browser contexts, direct Service/Event check-in, Cell Group/Group Leader batch submission, Registration Team approval, counts, and member history.

## Verification status

| Gate | Result | Evidence / limitation |
| --- | --- | --- |
| API automated tests | Pass | 10 Jest suites, 44 tests, including the `system_settings` seed-shape regression. |
| Frontend automated tests | Pass | 5 Vitest files, 15 tests. Role-flow workspace tests mock the API and do not prove persistence. |
| Frontend production build | Pass with warning | Vite build succeeds. The main bundle is 933.03 kB and ZXing is 477.54 kB; both trigger the configured 500 kB chunk advisory. The workspace is lazy-loaded. |
| Diff whitespace check | Pass | `git diff --check` is clean. |
| Browser image upload through persisted QR flows | Pass, CI MySQL | Chromium uploaded synthetic member and batch QR PNGs through the actual scanner component and drove direct Service/Event check-in, leader batch submission/approval, count refresh, and member history against real API routes and a disposable database. |
| Camera optical test | Not verified | No physical-device camera session is recorded. Image upload remains the mandatory laptop path. |
| API/database persistence | Pass, limited to CI MySQL | Fresh migrations and four QR HTTP/API integration tests passed in GitHub Actions run `37552009704`, covering direct Service/Event writes, leader batch scope/approval, duplicates, scoped summaries, history, CSV, issue/image, and reissue. |
| Browser/API/database upload persistence | Pass, limited to CI MySQL | GitHub Actions run `37552009704` passed the real Chromium upload-to-API-to-MySQL Service/Event role flows and member history. One prior run timed out at the Event batch review panel; repeat that path during TiDB QA. TiDB compatibility is still unverified. |
| TiDB schema and attendance persistence | Blocked pending isolated QA target | No QR migration or attendance write has occurred on TiDB. The original `.env` target was treated as production-oriented, and the existing `mcc-local-dev` database branch was not used for QR writes. |
| Live login and existing-module regression | Not verified on a QR deployment | No QR build has been deployed. Source review shows authentication files were not changed; that is not live regression evidence. |
| Remote review and deployment | In review | Draft [PR #14](https://github.com/PLWM-Manila-Central-Church/cms-mcc/pull/14) is open against `main` and unmerged. CI run `37552009704` passed on head `985289c`, including fresh migrations, four API persistence tests, frontend tests/build, and uploaded-QR browser E2E. TiDB QA and production checks remain pending. Vercel has no deployment for this feature branch; its latest production deployment is from `main`. |

## External gates to close

1. Establish a dedicated empty QA TiDB schema/branch and scoped test credentials. Do not reuse the production-oriented endpoint or write to existing application tables on `mcc-local-dev`.
2. Review draft PR #14 and keep it unmerged until isolated TiDB QA and the production-readiness review pass. The browser upload flow already passes on disposable MySQL.
3. Apply the additive migrations only to the isolated QA target, then verify readiness, feature-off behavior, and deliberate enablement.
4. Repeat the Services and Events browser flows on isolated TiDB QA with synthetic accounts and generated PNGs; verify durable rows, idempotency, role/group scope, review receipts, summaries, member history, CSV, and audit records.
5. Re-run login and existing-module journeys in the QA deployment. Record camera results separately; lack of a camera must not be reported as a pass.
6. Only after QA/review pass, merge through the repository's normal review process and verify the deployed `main` build and migration state.

Do not mark this implementation complete until the pending database-backed, role-flow, regression, and release gates have evidence recorded in `QR_ATTENDANCE_VERIFICATION_REPORT.md`.
