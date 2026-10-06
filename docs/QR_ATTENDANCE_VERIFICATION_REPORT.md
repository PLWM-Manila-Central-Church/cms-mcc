# QR Attendance Verification Report

Updated 7 October 2026. This is a verification record for the local QR attendance implementation, not a production-release certificate.

## Test results

| Environment / test | Result | What it establishes |
| --- | --- | --- |
| `cms-api`: `npm test -- --runInBand` | Pass: 9 suites / 43 tests | Unit and contract coverage for QR permissions/policies, payloads, migration shape, schema fallback, and attendance writers. No TiDB connection was made. |
| `cms-frontend`: `npm test` | Pass: 5 files / 15 tests | Component behavior using mocked APIs. Includes the Admin session lifecycle test and Registration Team / Cell Group Leader flows below. |
| `cms-frontend`: `npm run build` | Pass with chunk advisory | Production assets compile. Main bundle: 933.03 kB; ZXing: 477.54 kB. The attendance workspace and scanner entry are emitted separately. |
| `git diff --check` | Pass | No whitespace errors in the current local change. |
| Local browser scanner upload smoke | Pass, decode only | A generated synthetic QR PNG was uploaded into the actual scanner component; ZXing decoded the expected versioned payload without browser console errors. No authenticated API or database write was tested. |

## Role-flow coverage in frontend tests

| Role and flow | Result | Test boundary |
| --- | --- | --- |
| Admin creates a draft Event session, then opens check-in as a separate action | Pass | Mocked API; validates request shape and UI state transitions. |
| Registration Team scans a member QR, reviews the member, and explicitly confirms check-in | Pass | Mocked API; verifies preview happens before the check-in request. |
| Cell Group Leader captures an assigned member into a draft and submits it | Pass | Mocked API; verifies saved pending entry and batch QR download request. |
| Registration Team reviews a submitted leader batch and approves it | Pass | Mocked API; verifies scope/submitter display, digest/revision submission, and approval receipt. |

These tests prove frontend request sequencing and UI state handling. They do not prove role authorization at the running API, TiDB transactions, durable attendance, count reconciliation, or concurrency behavior.

## End-to-end requirements still pending

- Run both Service and Event individual check-in and leader batch approval through the browser upload flow against a dedicated isolated QA database.
- Verify migration application/readiness, stored member QR identity, approval receipt persistence, duplicate/idempotent outcomes, scope enforcement, timestamps, audit history, session totals, member history, and exported CSV.
- Exercise cross-device member QR redisplay and reasoned QR reissue/revocation, including an earlier PNG after reissue.
- Verify the full set of malformed, wrong-session, revoked, expired, duplicate, and out-of-scope QR cases leave counts and authentication intact.
- Verify login, logout, refresh/session persistence, and representative existing modules on the QA deployment after the QR build is deployed.
- Record physical camera success/fallback separately. Current verified laptop evidence uses image upload and does not claim camera verification.
- Draft PR #14 is open from `codex/qr-attendance` to `main` at `eaf9b91`, unmerged; GitHub Actions CI is in progress. Keep it draft until review and isolated QA pass. Repo-level branch protections/rulesets are absent; org-level controls remain unverified. TiDB Cloud is signed in, but the visible `mcc-local-dev` branch has existing rows according to the prior read-only audit and is not safe for QR writes. No isolated QA resource was created.

## Review note

No production database credentials were used, no production records were modified, and no QR migration was applied. The original `.env` target was treated as production-oriented. The isolated `mcc-local-dev` database was not used because it contains data and is not a disposable QR fixture target. See `QR_ATTENDANCE_IMPLEMENTATION_STATUS.md` for the required unblock sequence.
