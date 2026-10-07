# QR Attendance Verification Report

Updated 7 October 2026. This is a verification record for the local QR attendance implementation, not a production-release certificate.

## Test results

| Environment / test | Result | What it establishes |
| --- | --- | --- |
| `cms-api`: `npm test -- --runInBand` | Pass: 11 suites / 54 tests; 1 DB suite skipped | Unit and contract coverage for QR permissions/policies, payloads, migration shape, schema fallback, attendance writers, settings-table timestamp contract, and QR test-target safety. No TiDB connection was made. |
| Local QR target-guard verification | Pass: 10 guard tests; full API suite 11 passed / 1 skipped | Confirms that write-enabled QR tests accept only loopback CI MySQL or the exact public TiDB endpoint with explicit opt-in, TLS, the `qr_attendance_qa` schema, and a non-root scoped user. It does not establish live TiDB connectivity. |
| GitHub Actions QR API persistence integration, run 37556418791 | Pass: 4 integration tests | Fresh MySQL migrations plus real Express routes and persisted writes: member QR issue/PNG, Service/Event direct check-in, Cell/Group leader scope and batch approval, duplicate counts, scoped summaries, event history, CSV, and QR reissue. |
| GitHub Actions CI, run 37556418791 | Pass | API tests, frontend tests/build, fresh MySQL migrations, API persistence integration, and browser E2E passed on PR head `684b97f`. |
| GitHub Actions uploaded-QR browser flow, run 37556418791 | Pass | The fixture began with QR attendance disabled. Admin enabled it in Settings, then Chromium drove Service/Event session setup, fixed member QR downloads in separate browser contexts, Registration Team direct uploads, Cell Group/Group Leader batch uploads, Registration Team approval, counts, and member history against CI MySQL. Camera optics and TiDB were not tested. |
| `cms-frontend`: `npm test` | Pass: 6 files / 21 tests | Component behavior using mocked APIs. Includes System Admin permission parity, camera result/denial paths, camera-start/upload coordination, try-harder image retry, and Registration Team / leader workspace flows. |
| `cms-frontend`: `npm run build` | Pass with chunk advisory | Production assets compile. Main bundle: 933.03 kB; ZXing: 477.54 kB. The attendance workspace and scanner entry are emitted separately. |
| `git diff --check` | Pass | No whitespace errors in the current local change. |
| Local browser scanner upload smoke | Pass, decode only | A generated synthetic QR PNG was uploaded into the actual scanner component; ZXing decoded the expected versioned payload without browser console errors. No authenticated API or database write was tested. |
| TiDB public endpoint allowlist | Pass, network only | The console confirms laptop IP `112.207.106.57` is allowed for the cluster and the `mcc-local-dev` branch. This proves only network authorization, not SQL login or QR persistence. |

## Role-flow coverage in frontend tests

| Role and flow | Result | Test boundary |
| --- | --- | --- |
| Admin creates a draft Event session, then opens check-in as a separate action | Pass | Mocked API; validates request shape and UI state transitions. |
| Admin enables QR attendance from Settings before session setup | Pass | Real browser flow; fixture starts disabled, Settings API saves the Admin toggle, and the subsequent QR sessions open. |
| Registration Team scans a member QR, reviews the member, and explicitly confirms check-in | Pass | Mocked API; verifies preview happens before the check-in request. |
| Cell Group Leader captures an assigned member into a draft and submits it | Pass | Mocked API; verifies saved pending entry and batch QR download request. |
| Registration Team reviews a submitted leader batch and approves it | Pass | Mocked API; verifies scope/submitter display, digest/revision submission, and approval receipt. |
| Camera scan callback and permission-denied upload fallback | Pass | Component tests mock the camera decoder callback and permission failure. This is not a physical camera or optical test. |

These mocked tests prove frontend request sequencing and UI state handling. The separate CI integration and browser flows prove role authorization, persisted attendance, count reconciliation, and member history against a disposable MySQL database. They do not prove TiDB behavior or production deployment behavior.

## End-to-end requirements still pending

- Repeat the Service and Event image-upload flows against a dedicated isolated TiDB QA schema/branch. The CI browser E2E currently proves these flows against disposable MySQL only.
- The `mcc-local-dev` Connect dialog reports that its branch root password is not set. Generate it in TiDB Cloud and enter it into the ignored bootstrap file; the new bootstrap script has only passed local syntax/guard checks so far.
- Repeat the Event leader-batch upload and review in the isolated QA run; one earlier CI attempt timed out waiting for the review panel, and the later diagnostic run passed.
- On TiDB, verify migration application/readiness, stored member QR identity, approval receipt persistence, duplicate/idempotent outcomes, scope enforcement, timestamps, audit history, session totals, member history, and exported CSV.
- Exercise cross-device member QR redisplay and reasoned QR reissue/revocation, including an earlier PNG after reissue.
- Verify the full set of malformed, wrong-session, revoked, expired, duplicate, and out-of-scope QR cases leave counts and authentication intact.
- Verify login, logout, refresh/session persistence, and representative existing modules on the QA deployment after the QR build is deployed.
- Camera optical verification is optional for the laptop path: uploaded PNG scanning is covered end-to-end, while physical camera success/fallback remains unverified.
- Draft PR #14 is open from `codex/qr-attendance` to `main`, unmerged. CI run `37553468457` passed on head `c924bdd`, including Admin Settings enablement and the browser upload flow. Keep the PR draft until review and isolated TiDB QA pass. The existing `mcc-local-dev` branch was not used for QR writes; no TiDB migration or attendance write has occurred.

## CI migration repair

The first draft-PR CI run failed the fresh MySQL migration job at `20261007000002-seed-qr-attendance-permissions` with `Unknown column 'created_at'`. The seed now writes only supported `system_settings` columns, with a regression test. The integration review also fixed a missing leader-scope helper in summaries. Browser E2E fixes include matching history rows with appended `(Service)`/`(Event)` labels, diagnostics for intermittent Event batch scan/capture timeouts, and an Admin Settings flow that exposed frontend `hasPermission` not mirroring the API's System Admin bypass. `AuthContext` now grants the same Admin UI access, with a regression test. Uploaded batch/member QR images now retry ZXing decode errors with QR-only `TRY_HARDER` hints after the fast decode misses, while explicit timeout errors remain bounded. CI run `37556418791` passes on PR head `684b97f`, including Settings enablement, Services/Events uploaded-QR flows, and camera callback/denial component tests. The local target guard now rejects accidental QR fixture writes to `church_cms`; its 10 tests and the 54-test API suite pass. The TiDB bootstrap and migration path remains pending the branch root password.

## Review note

No production database connection was made, no production records were modified, and no QR migration was applied. The original ignored `.env` points at `church_cms` with a root account and was not copied into the QR worktree. The `mcc-local-dev` branch contains existing application data, so QR tests will use only the new `qr_attendance_qa` schema with a scoped account. The laptop IP allowlist is now verified, but branch credentials and every TiDB-backed flow remain pending. See `QR_ATTENDANCE_IMPLEMENTATION_STATUS.md` for the unblock sequence.
