# QR Attendance Verification Report

Updated 7 October 2026. This is a verification record for the local QR attendance implementation, not a production-release certificate.

## Test results

| Environment / test | Result | What it establishes |
| --- | --- | --- |
| `cms-api`: full Jest suite plus TiDB QR persistence integration | Pass: 13 suites / 61 tests total | The regular API suite passed 12 suites / 57 tests with its database suite skipped; the separate TiDB integration suite passed 4/4 tests against the isolated QA schema. |
| Local QR target-guard verification | Pass: 10 guard tests | Confirms QR fixture writes accept only loopback CI MySQL or the exact TLS TiDB endpoint/schema with explicit opt-in and the scoped `qrqa_app` user. |
| Local real-ZXing decoder experiment | Pass: 100/100 generated PNGs | Member and batch QR payloads were generated with the production `qrcode` settings and decoded in headless Chromium. 87 decoded on the fast path; the remaining 13 decoded with the pure-barcode fallback after `TRY_HARDER` also missed. This is decoder evidence, not API persistence evidence. |
| GitHub Actions QR API persistence integration, run 37561268697 | Pass: 4 integration tests | Fresh MySQL migrations plus real Express routes and persisted writes: member QR issue/PNG, Service/Event direct check-in, Cell/Group leader scope and batch approval, duplicate counts, scoped summaries, event history, CSV, and QR reissue. |
| GitHub Actions CI, run 37561268697 | Pass | API tests, frontend tests/build, fresh MySQL migrations, API persistence integration, and browser E2E passed on PR head `13a2d05`. |
| GitHub Actions CI, run 37565377891 | Pass | All three jobs passed on PR head `b1f8493`: API tests, frontend tests/build, fresh MySQL migrations, QR persistence integration, and the uploaded-QR browser flow. |
| GitHub Actions uploaded-QR browser flow, run 37561268697 | Pass | The fixture began with QR attendance disabled. Admin enabled it in Settings, then Chromium drove Service/Event session setup, fixed member QR downloads in separate browser contexts, Registration Team direct uploads, Cell Group/Group Leader batch uploads, Registration Team batch QR upload/approval, counts, and member history against CI MySQL. Camera optics and TiDB were not tested. |
| `cms-frontend`: `npm test` | Pass: 7 files / 23 tests | Component behavior using mocked APIs. Includes System Admin permission parity, camera result/denial paths, camera-start/upload coordination, image decode fallbacks, Registration Team / leader workspace flows, and a concurrent failed-refresh queue regression. |
| `cms-frontend`: `npm run build` | Pass with chunk advisory | Production assets compile. Main bundle: 933.19 kB; ZXing: 451.53 kB. The attendance workspace and scanner entry are emitted separately. |
| `git diff --check` | Pass | No whitespace errors in the current local change. |
| Local Chromium browser E2E on TiDB QA | Pass | Admin enabled QR, created Service/Event sessions, and synthetic members used fixed QR images across browser contexts. Registration Team completed direct Service/Event check-ins; Cell/Group Leaders submitted batch QR images; Registration Team uploaded and approved both. Counts, member history, logout, and protected-route redirect passed. |
| TiDB QA schema isolation | Pass | QA test writes targeted only the new `qr_attendance_qa` schema on `mcc-local-dev` through a TLS-required `qrqa_app` account. Existing `church_cms` tables were not used. |
| TiDB QA migration chain | Pass: 71 migrations | All migrations applied, including QR schema and the event-registration FK compatibility repair. The second `db:migrate` run was a no-op. |
| TiDB QA persistence and browser flow | Pass | Four API persistence tests and the local Chromium upload flow passed on TiDB. During the successful E2E run, Service and Event each finished with two confirmed attendance rows, one approved leader batch, and one confirmed batch item. |

## Role-flow coverage in frontend tests

| Role and flow | Result | Test boundary |
| --- | --- | --- |
| Admin creates a draft Event session, then opens check-in as a separate action | Pass | Mocked API; validates request shape and UI state transitions. |
| Admin enables QR attendance from Settings before session setup | Pass | Real browser flow; fixture starts disabled, Settings API saves the Admin toggle, and the subsequent QR sessions open. |
| Registration Team scans a member QR, reviews the member, and explicitly confirms check-in | Pass | Mocked API; verifies preview happens before the check-in request. |
| Cell Group Leader captures an assigned member into a draft and submits it | Pass | Mocked API; verifies saved pending entry and batch QR download request. |
| Registration Team reviews a submitted leader batch and approves it | Pass | Mocked API; verifies scope/submitter display, digest/revision submission, and approval receipt. |
| Camera scan callback and permission-denied upload fallback | Pass | Component tests mock the camera decoder callback and permission failure. This is not a physical camera or optical test. |
| Concurrent session restore after failed token refresh | Pass | Axios unit regression verifies every queued session request rejects promptly instead of remaining pending. |

These mocked tests prove frontend request sequencing and UI state handling. CI integration/browser flows prove persisted attendance on disposable MySQL; separate TiDB QA runs verify the same APIs and uploaded-QR browser path against TiDB. The final local browser run also verified logout and protected-route handling. Production deployment behavior remains unverified.

## End-to-end requirements still pending

- Verify camera operation on physical hardware if available. Component tests cover camera callbacks and permission-denied upload fallback, but no physical optical session is recorded; image upload works on the laptop path.
- Exercise cross-device member QR redisplay and reasoned QR reissue/revocation, including an earlier PNG after reissue.
- Verify the full set of malformed, wrong-session, revoked, expired, duplicate, and out-of-scope QR cases leave counts and authentication intact.
- Verify production login/logout/refresh and representative existing modules after the QR build is deployed to `main`.
- PR #14 is open from `codex/qr-attendance` to `main`, still draft and unmerged. Run `37565377891` passed on head `b1f8493`; merge and production verification remain pending.

## CI migration repair

The first draft-PR CI run failed the fresh MySQL migration job at `20261007000002-seed-qr-attendance-permissions` with `Unknown column 'created_at'`; the seed now writes only supported `system_settings` columns. TiDB QA then exposed an older `event_registrations.registered_by` inline-FK DDL incompatibility. The historical migration now adds the column and FK separately, with a forward-only idempotent repair migration for databases where either is missing. All 71 migrations applied to `qr_attendance_qa`; a second run was a no-op. The regular API suite passed 12 suites / 57 tests, and the TiDB persistence suite passed 4/4. The local Chromium upload-to-TiDB flow passed for Services and Events, including leader batch approval, counts/history, logout, and protected-route redirect. The auth refresh queue regression also passed in frontend tests. CI run `37565377891` passed all three jobs on head `b1f8493`, including the forward migration on fresh MySQL and the uploaded-QR Service/Event browser flow.

## Review note

No production database connection was made, no production records were modified, and no production QR migration was applied. The original ignored `.env` pointing at `church_cms` was not used. TiDB QA writes were confined to the new `qr_attendance_qa` schema on `mcc-local-dev` through the TLS-required scoped `qrqa_app` account; the root bootstrap credential file was removed after setup. Migrations, QR persistence tests, and Service/Event browser attendance flows now pass on TiDB QA. Production deployment and post-deployment checks remain pending.
