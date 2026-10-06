# QR Attendance Implementation Status

Updated 7 October 2026. This status is for the local `codex/qr-attendance` worktree based on production `main` at `e698ef448ebd9b5283eb3fbbaf28970957e6ea10`.

## Current outcome

The feature implementation and local source checks are ready for isolated QA review. Draft PR #14 is open, but the requested production-ready outcome is **not complete**: there has been no database migration, database-backed attendance write, or deployment. Production data and configuration have not been changed.

## Work completed locally

- Additive QR attendance schema and permission migrations, API services/routes, member QR identity, session lifecycle, direct check-in, leader batch submission, Registration Team review/approval, correction audit, scoped summaries, and CSV export.
- Member portal and operational member QR surfaces; lazy Service/Event workspace; upload and live-camera scanner component; QR image delivery and batch receipt UI.
- QR feature switch defaults off. Optional QR schema readiness is checked before use; legacy attendance compatibility and authentication files remain separate from QR-only fields and routes.
- Local browser upload/decode smoke: generated a synthetic member QR PNG with the project QR library, uploaded it through the actual scanner component, and decoded the expected payload with the real ZXing decoder. This is decoder evidence only.
- Focused mocked-API workspace coverage for Admin session creation/opening, Registration Team direct check-in confirmation, Cell Group Leader draft/submission, and Registration Team batch approval.

## Verification status

| Gate | Result | Evidence / limitation |
| --- | --- | --- |
| API automated tests | Pass | 10 Jest suites, 44 tests, including the `system_settings` seed-shape regression. |
| Frontend automated tests | Pass | 5 Vitest files, 15 tests. Role-flow workspace tests mock the API and do not prove persistence. |
| Frontend production build | Pass with warning | Vite build succeeds. The main bundle is 933.03 kB and ZXing is 477.54 kB; both trigger the configured 500 kB chunk advisory. The workspace is lazy-loaded. |
| Diff whitespace check | Pass | `git diff --check` is clean. |
| Browser image decoding | Pass, limited | Actual scanner component and decoder were exercised with a synthetic QR image. No API or database write occurred. |
| Camera optical test | Not verified | No physical-device camera session is recorded. Image upload remains the mandatory laptop path. |
| Migration and API/database persistence | Blocked | TiDB is now signed in. The active `PLWM-MCC` Starter cluster lists an active `mcc-local-dev` branch from `main`; the UI rounds row storage to 0 MiB, but the previous read-only audit found about 3,901 rows there. It is not a disposable target. The original checkout `.env` is production-oriented, and no QR migration or database write has occurred. |
| Live login and existing-module regression | Not verified on a QR deployment | No QR build has been deployed. Source review shows authentication files were not changed; that is not live regression evidence. |
| Remote review and deployment | In review | Draft [PR #14](https://github.com/PLWM-Manila-Central-Church/cms-mcc/pull/14) is open against `main` and unmerged. The follow-up CI run passed on head `f9451e6`, including fresh database migrations, API tests, and frontend build/tests. Isolated TiDB QA and production checks remain pending. |

## External gates to close

1. Provide a dedicated empty QA TiDB cluster/branch/schema and scoped test credentials. Do not reuse the production-oriented endpoint or the data-bearing `mcc-local-dev` target.
2. Review draft PR #14 and keep it unmerged until isolated QA and browser persistence checks pass. Do not deploy the draft.
3. Apply the additive migrations only to the isolated QA target, then verify readiness, feature-off behavior, and deliberate enablement.
4. Run the Services and Events browser flows with synthetic accounts and actual generated PNGs through the real upload UI; verify durable rows, idempotency, role/group scope, review receipts, summaries, member history, CSV, and audit records.
5. Re-run login and existing-module journeys in the QA deployment. Record camera results separately; lack of a camera must not be reported as a pass.
6. Only after QA/review pass, merge through the repository's normal review process and verify the deployed `main` build and migration state.

Do not mark this implementation complete until the pending database-backed, role-flow, regression, and release gates have evidence recorded in `QR_ATTENDANCE_VERIFICATION_REPORT.md`.
