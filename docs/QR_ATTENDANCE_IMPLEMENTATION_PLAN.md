# QR Attendance Implementation Plan

Prepared on 7 October 2026 for the Philippine Life Word Mission Manila Central Church management system.

This plan adds fixed member QR identification and leader attendance batch approval to both Services and Events. Registration staff can check in an individual member directly or scan, review, and approve a leader's batch. Each member is counted once for the selected service or event session. The implementation extends the existing React, Express, Sequelize, and TiDB application and uses the current production navigation and layout.

This document is now the implementation plan and execution record. Code is being developed in an isolated `codex/qr-attendance` worktree based on production `main`; the original dirty checkout is preserved. No QR migration has been applied to any database, no attendance rows have been created, and no production configuration has been changed. The global QR setting is seeded off by default, so the module stays unavailable until the schema and deliberate enablement are verified.

### Execution status as of 7 October 2026

| Work area | Current state | Evidence / remaining gate |
| --- | --- | --- |
| Data model and migrations | Implemented in the isolated branch | Additive tables and service-attendance provenance/correction columns; migration-shape tests pass. A real TiDB migration has not run. |
| API and permissions | Implemented in the isolated branch | Member issue/reissue, capabilities, sessions, direct check-in, leader draft/submit, registration review/approval, scoped list/summary/export, and audited correction routes are present. Unit, policy, migration-shape, and schema-fallback tests pass. |
| Frontend | Implemented in the isolated branch | Member QR, member-profile QR management, shared camera/image scanner, event and service workspace, leader batch controls, and registration review are present. Build and UI tests pass. Registration direct-confirm, Cell Group Leader batch-submit, and Registration Team batch-review UI paths use mocked API responses; they are not persistence evidence. The QR workspace is a lazy route and ZXing is loaded only when the scanner opens. |
| Browser QR image decoding | Verified locally | Generated a synthetic member QR PNG with the project QR library, uploaded it to the actual scanner component in a local browser, and the real ZXing decoder returned the expected versioned payload. The browser console showed no errors. This verifies image decode only, not attendance persistence. |
| Login and old attendance compatibility | Source-reviewed and guarded | Authentication files are untouched. QR-only attendance columns now use a separate model selected only after QR schema readiness. Legacy attendance reads/writes fall back to the original model if the optional schema is absent. Generic service check-ins are rejected for configured QR sessions and the UI directs operators to the workspace. Live login regression is still required after a safe test deployment. |
| Browser → API → database test | Pending | The isolated worktree has no `.env` or database credential and this laptop has no local MySQL/TiDB service. The prior `mcc-local-dev` target contains data and is not disposable. The TiDB account visible during this run listed no resources. Do not write to that database or production. |
| GitHub review | Pending | Implementation is committed locally as `54c9016` on `codex/qr-attendance`. Local Git push and connected GitHub branch creation both returned HTTP 403; no remote branch or pull request was created. |
| Release | Pending | Require a writable GitHub connection or user-published review branch, a verified isolated database, migration/integration run, uploaded member and batch QR images through the browser UI, role-flow verification, production-safe review, and `main` deployment checks. |

API Jest currently passes 8 suites / 39 tests and frontend Vitest passes 5 files / 14 tests. The frontend production build succeeds; the pre-existing large main chunk warning remains, with the QR workspace, member QR dialogs, and ZXing in separate chunks. These results are source/build/component/browser-decoder evidence, not database-backed completion.

The completion goal is a working QR attendance module for both Services and Events: a member can obtain the same fixed QR, a leader can record assigned members and issue a batch QR, Registration Team can check in individuals and approve batches using a live camera or an uploaded QR image, and confirmed attendance persists with correct counts, scope, timestamps, receipts, and audit history. The mandatory laptop proof uses actual QR images through the real browser UI and database-backed attendance flow. A decoded string, passing unit tests, a build, or a screenshot of a QR is not completion.

Implementation must continue through inspection, a concrete repair plan, focused repair, and verification until this goal and the release gates pass. A broken required flow stays pending and receives another repair cycle. Lack of a usable camera is handled through the supported image-upload path and a separately recorded camera-verification status. A real credential, staging-target, deployment, or user-action dependency remains an explicit blocker rather than a completed task; continue independent authorized work and resume the blocked check when its prerequisite is available. Respect a user's explicit pause/cancellation and the confirmed database/deployment boundaries.

**The production baseline determines which changes can be included.**

The remote main branch and latest Ready Vercel production deployment were checked at commit e698ef448ebd9b5283eb3fbbaf28970957e6ea10. The Render health endpoint returned status ok and db connected. Admin sign-in, the attendance overview, a service attendance sheet, event listing/detail, member sign-in, and the member Attendance tab were inspected live. Leader and Registration Team differences were inspected in main source and permission migrations; those roles were not signed in during this planning review. Production database schema metadata and camera hardware were not revalidated in this turn.

The current frontend is [cms-mcc.vercel.app](https://cms-mcc.vercel.app), and its /api rewrite targets [plwm-mcc-api.onrender.com](https://plwm-mcc-api.onrender.com). Main declares a React/Vite frontend, Node 20 Express API, and Sequelize MySQL-dialect database connection used with TiDB. QR work keeps those deployment/runtime choices.

The local checkout is on codex/deployment-guardrails and has existing uncommitted changes. Implementation must start in a clean worktree from a newly verified main commit. Review and port only the attendance fixes identified below; do not merge the local repair branch wholesale.

| Current surface | Verified structure | Planned integration |
| --- | --- | --- |
| /attendance | Member history search and recent service cards | Keep Services as the default view; add Events and role-specific batch navigation. |
| /services/:id/attendance | Service header, Checked In, Pre-registered, Capacity, Fill Rate, Remaining, manual search, attendance sheet, Undo | Add session status, Scan Member QR, and leader batch controls alongside the existing attendance controls. |
| /events and /events/:id | Status/category filters, event details, multi-day date ranges, registration count and registrant list | Keep registrations distinct; add an Attendance section with a session selector and entry into the attendance workspace. |
| /portal, Attendance tab | Member service history, attendance-rate card, existing Overview/Events/Attendance/Tithes navigation | Add My QR within the existing Attendance tab and a Services/Events history filter. Keep the four current main tabs in the same order. |
| Leader views | Shared service attendance storage, filtered using assigned cell group/group | Record the leader's draft roster separately from confirmed attendance for sessions using batch review. |
| Registration Team dashboard | Service attendance trends and cell-group breakdowns | Add a selected-session panel with confirmed attendance and pending batch counts using grouped queries. |

The revised church management paper describes scanning member identification, verification, recording in the church database, and attendance reporting. It also covers service/event pre-registration and role-based access. This plan implements that scan-and-verify flow and adds the user-approved batch submission workflow.

**The agreed attendance rules apply consistently to both Services and Events.**

1. A member creates their QR once and can redisplay the same code on another device after signing in. Generating it repeatedly does not issue a different code. Registration staff can revoke/reissue it with a recorded reason.
2. The QR identifies a member. It contains no password, login token, email, phone number, or authority to write attendance.
3. The operator selects a service or event session before scanning. The screen always displays its name, date, and session prominently.
4. A Registration Team or Admin individual check-in becomes confirmed attendance immediately after validation and physical identity review.
5. A Cell Group or Group Leader scans or manually marks assigned members into a saved draft. These entries appear as Draft or Pending, not confirmed attendance.
6. Submitting the draft freezes its attendee list and produces a new batch QR. Registration staff scan that QR, review the saved submission, and explicitly approve or reject it.
7. Confirmation preserves the original capture time and recording leader. It also records who approved the batch and when.
8. An existing confirmed check-in is preserved when another operator scans the member or another batch contains them. The result identifies the duplicate and does not overwrite its provenance.
9. Attendance at a separate cell-group meeting is not automatically attendance at a church service or event. The batch must belong to the exact selected activity/session.
10. Confirmed attendance can be corrected through an audited void/reinstate action by Registration Team or Admin. Leaders can remove draft entries or withdraw pending submissions; they cannot silently delete approved attendance.

The first release supports online recording and approval. Connectivity failures must show an unsaved or pending state. Offline capture and synchronization require a separate follow-up design; a batch-reference QR still needs a connection to retrieve its saved list.

**Authentication compatibility is a release requirement.**

| Protected area | Required behavior |
| --- | --- |
| Login and password flows | Keep auth controllers/services/routes, password hashing, reset/change-password rules, and credential requirements outside the QR change set. |
| Sessions and cookies | Keep JWT secrets, cookie names/options, refresh rotation, session restoration, AuthContext bootstrap, and ProtectedRoute behavior intact. |
| API transport | Reuse the existing cookie-authenticated Axios client and CSRF/origin checks. Preserve the Vercel /api proxy before the SPA fallback. |
| QR errors | Reserve 401 for genuine authentication failures. Unknown, revoked, malformed, wrong-session, or expired QR codes use domain error responses handled inside the attendance screen. |
| Initial page load | Load QR components and capabilities when attendance/My QR is opened. QR table availability or scanner loading cannot become a condition of login, dashboard, or portal boot. |
| Camera | Request camera permission only after Start Camera. QR generation, login, and page navigation do not request camera or microphone access. |
| Request limits | Add QR limits separate from the existing shared API allowance; scanning must not exhaust a shared church IP's allowance for login/session/profile traffic. |
| Optional feature readiness | QR sessions default to draft/closed and require an explicit Registration Team/Admin action to open. A missing QR schema yields a clear attendance-module-unavailable response; it does not terminate the API process. |
| Other modules | Preserve finance, inventory, archives, member profile updates, ministry assignments, event registrations, service RSVPs, seats/parking, and notification contracts. QR confirmation does not mutate any of those records automatically. |

The current Axios interceptor attempts refresh on 401 and can redirect to login if refresh fails. Therefore an invalid attendance QR must never be treated as an invalid authentication token. A real session expiry while scanning uses the existing refresh flow; scanner state pauses during the request and resumes only after a successful response.

The current general API limiter is shared by IP and applies to authentication routes as well. The narrow rate-limiter integration must exempt only the new QR request namespace from that shared counter, replace it with bounded QR pre-authentication IP limits and authenticated per-user limits, and retain every existing authentication limit. It requires tests with multiple scanner devices sharing one IP. Do not disable the general limiter or change cookie/security settings to make scanning work.

Keep the new backend feature models/router isolated under src/modules/qr-attendance where practical. Share the existing Sequelize connection and core Member/Service/Event models. Load the optional router/model registry through a guarded path rather than adding QR dependencies or table queries to authentication initialization.

**The UI extends current pages with small, role-aware additions.**

| User/page | Controls and states |
| --- | --- |
| Member Attendance tab | My QR opens a dedicated dialog. First use offers Create My QR; later visits offer Show My QR, Download, and Print. Explain that staff scan it for the selected activity. Show unavailable/reissued/profile-not-linked states locally. |
| Operational member QR handling | Registration/Admin can issue, download/print, and reissue a member QR through a dedicated action on the existing member profile page. Reissue requires a reason. The QR dialog does not alter ordinary member editing, and leaders cannot retrieve other members' reusable codes. |
| Registration service attendance | Keep manual lookup and the sheet. Add Scan Member QR and Scan Leader Batch modes; both offer Start Camera and Upload QR Image, a session/window indicator, and Pending Batches. A scan shows member name/photo or initials for verification and a result receipt. |
| Registration event detail | Preserve the existing registration section. Add a separate Attendance section with session picker and confirmed, registered/expected, pending, and walk-in totals. Open the shared workspace under /attendance/sessions/:id. |
| Cell Group / Group Leader | Show only assigned roster, own draft, pending/approved batches, and confirmed records within scope. Camera scanning, QR image upload, and manual roster selection save draft entries. Submit Batch opens a review and then shows its QR receipt with Download PNG and Print controls. |
| Registration batch review | Display activity/session, leader, group, submission time, distinct member count, names, capture times, and already-confirmed members. Approve and Reject require explicit actions. Reject requires a reason. |
| Approved receipt | Show newly confirmed and already-present counts. Rescanning or re-uploading an approved batch opens its receipt and never applies it again. |
| Closed session | Show history and receipts. Check-in controls are disabled; permitted corrections use a reason and a separate correction action. |
| Camera failure | Offer Upload QR Image, Retry Camera, Switch Camera where supported, manual input, and member search. Denied permission, unsupported device, poor image, and network failure each have useful local messages. |
| Image input | Offer a labelled file picker, local image preview, Decode/Replace/Clear controls, and the same member or batch review used by camera scanning. Invalid images clear the previous candidate and show a local retry message. |

Use the current blue branding, cards, tables, existing icon set, and EN/Tagalog language mechanism. On phones, scanner/review dialogs become full-width sheets with a clear session header and large controls; the member QR has a plain high-contrast background and quiet margin. Avoid a redesign of MainLayout, Sidebar, Header, portal tab indexing, or global CSS.

Add a local QR error boundary and explicit loading/error states. Stop every camera track when the dialog closes, the page changes, logout begins, or the component unmounts. Use keyboard-operable buttons, labels, focus trapping/return, and an accessible success/error announcement. Treat decoded text as data; never open or execute an arbitrary URL encoded in a QR. Camera access must run on a secure origin and obtain the browser's permission, following [MDN's camera requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

Use the existing backend qrcode package for generated SVG/PNG. Evaluate and pin a reviewed @zxing/browser release for camera decoding, imported only in the scanner chunk; the [project documentation](https://github.com/zxing-js/browser/blob/master/README.md) describes camera decoding and stopping its controls. Native BarcodeDetector may be an optional optimization, not the sole decoder, because [MDN identifies limited browser availability](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector). A USB reader that types text into an input uses the same payload validator, independently of camera decoding. No camera images need to be uploaded to Render or stored in S3.

**QR image upload is a normal feature and the primary laptop verification route.**

Support PNG, JPEG, and WebP through the browser's file picker, with an initial 5 MiB file limit and a bounded decoded image size of 16 megapixels. Check the actual image decode result rather than trusting a filename extension. Reject corrupt, unsupported, oversized, or QR-free files with a clear local message. Download QR defaults to PNG so the application's own member and batch images can be uploaded directly. Printed views may still use generated SVG; untrusted SVG, PDF, and remote URL uploads are outside this first input path.

Decode the selected image in the browser using the same QR reader's image/canvas support described in [ZXing's image decoding documentation](https://github.com/zxing-js/browser/blob/master/README.md). Pass only the decoded, bounded QR payload into the same member-preview, check-in, draft-item, or batch-resolution endpoint used by camera input. The selected image is not sent to Render/S3, and upload input does not bypass identity review, authorization, session timing, duplicate protection, or approval.

Reuse one result handler for camera, image, and keyboard input. Optional input-source metadata is diagnostic information, not proof of identity or an authorization condition. New file selection immediately clears the old decoded candidate; a decode revision/abort guard prevents a slow earlier image from replacing a newer result. Bound decode duration, release temporary image/canvas resources, and revoke object URLs on replacement/close/unmount, following [MDN's object URL cleanup guidance](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static). Image errors must remain inside the scanner dialog and must not clear authentication or block other pages.

| Input path | Evidence it must produce |
| --- | --- |
| Uploaded member image | The actual image is decoded by the UI, preview resolves the correct member, explicit confirmation creates one persisted attendance record, and summaries/history show it. |
| Uploaded leader batch image | The actual image resolves the frozen server submission, review occurs before approval, and approval produces durable new/duplicate outcomes and correct session totals. |
| Live camera | When hardware and permission are available, the same result handler is exercised with live frames; repeated frames do not duplicate attendance and the camera stops on close. |
| Camera unavailable | Upload remains usable, end-to-end image proof completes the laptop workflow, and the report explicitly identifies physical camera coverage still pending. |

Provide both camera and image-upload controls in the release. The core functional goal can be proven through upload on the laptop. Physical camera reliability may only be reported as verified after a real camera exercise; a simulated stream or uploaded image is labelled as that input type.

**Permissions distinguish recording a draft from confirming attendance.**

| Role | Own member QR | Attendance visibility | Direct confirmation | Leader draft/submit | Approve/reject batches | Corrections/session setup |
| --- | --- | --- | --- | --- | --- | --- |
| Member | Own linked member only | Own confirmed service/event history | No | No | No | No |
| Cell Group Leader | Own code if a member profile is linked | Assigned cell group and own batches | Batch-review sessions use pending drafts | Own cell group | No | Request correction; no confirmed-row deletion |
| Group Leader | Own code if linked | Assigned group and own batches | Batch-review sessions use pending drafts | Own group | No | Request correction; no confirmed-row deletion |
| Registration Team | Issue/print/reissue within operational member access | All sessions and submissions | Yes | Review submissions; no leader impersonation | Yes | Audited corrections and session setup |
| System Admin | Manage member QR | All | Yes | Administrative visibility | Yes | Yes |
| Pastor | Own code if linked | Read-only attendance consistent with approved existing scope | No | No | No | No |
| Ministry Leader | Own code if linked | Read-only own ministry where existing scope permits | No | No | No | No |
| Finance Team | Own code if linked | No new attendance access | No | No | No | No |

Proposed grants use a separate qr_attendance permission namespace for read, check_in, record_batch, submit_batch, review_batch, correct, and configure_session. Member self-QR endpoints derive memberId from the authenticated user rather than accepting a chosen member ID. Operational QR issue/reissue uses a separate member_qr:manage permission.

Append only the required grants. Do not reset/delete existing role_permissions or broaden events:create, members:update, services:create, or attendance permissions as a shortcut. Use existing leader assignment fields and getMemberScopeWhere/ensureMemberInScope behavior inside the QR service. Read, mutation, batch resolution, approval, export, and correction endpoints all enforce scope in the backend, following [OWASP's request-by-request authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

Changing permission grants uses the existing permission-cache invalidation. Existing sessions can reload to obtain new permission strings without forced logout, password changes, or session revocation.

For a session explicitly enabled in batch_review mode, guard the existing service attendance create/delete endpoints as well as the new UI. Otherwise a leader could bypass approval using the legacy API. On that session, old direct-write requests return BATCH_APPROVAL_REQUIRED and point the leader to their draft. This is an intentional attendance-flow change restricted to enabled sessions, not an authentication change. Sessions not opted into the new workflow retain their current manual flow during the pilot.

**Services and Events share the workflow while retaining their existing parent records.**

Create an attendance session wrapper with real foreign keys to exactly one Service or Event. Each existing service has at most one attendance session. An event can have several sessions, allowing a multi-day seminar or retreat to retain separate attendance per day/session. The default session dates are proposed from the parent and confirmed by Registration Team/Admin; opening a page must not create a session as a hidden write.

Store capture, confirmation, and session instants in UTC and display church activity times in Asia/Manila. Do not change the process timezone or reinterpret existing DATEONLY/TIME values globally. Validate actual server time against the configured capture/approval windows and parent cancellation/deletion state. Some currently displayed parent activities have old dates with an open-looking status; status text alone must not reopen attendance. Completed/cancelled sessions are read-only except authorized corrections or explicitly audited late-approval overrides.

Keep current service attendance in attendances with its unique service/member constraint. Add event_attendances for actual event check-ins. Both are accessed through one confirmed-attendance writer with service and event adapters. Roles do not get separate copies of either confirmed ledger, and batch approval does not create a second service attendance dataset.

| Proposed new table | Main fields and responsibilities |
| --- | --- |
| member_qr_credentials | member_id unique, public_id unique unpredictable UUID, version, active state, issued/reissued/revoked timestamps and actors. This is a redisplayable attendance identifier, not a login credential. Rotation changes public_id and invalidates the previous code; audit metadata records the rotation without raw payloads. |
| attendance_sessions | service_id nullable FK, event_id nullable FK, session_key/title, starts_at/ends_at, check_in_opens_at/closes_at, approval_deadline, enabled, leader_confirmation_mode, expected_basis, created_by. Exactly one parent is required. A service_id is unique; event_id plus session_key is unique. |
| attendance_expected_members | session_id/member_id unique, roster source, capture/freeze timestamp, group/cell-group IDs at roster freeze. Stores an explicit expected roster when attendance rates or no-show reports require it. |
| attendance_batches | session_id, public_id unique, submitted_by, exactly one cell-group/group FK, revision, state, submission digest, submitted_at, approval deadline, reviewed_by/at, rejection/withdrawal reason, client_request_id, optional superseded batch reference. |
| attendance_batch_items | batch_id/member_id unique, server capture time, capture method, recording user, group/cell-group snapshot, approval outcome, typed confirmed attendance reference. Submitted items are immutable. |
| event_attendances | session_id/member_id unique, checked_in_at, recorded_by, confirmed_by/at, method, source_batch_id nullable, group/cell-group snapshot, correction/void metadata. Contains only confirmed event attendance. |

Add optional provenance/correction fields to the existing attendances table for QR/batch-confirmed service records: source_batch_id, confirmed_by/at, group/cell-group snapshots, voided_by/at/reason, and a QR method value. Legacy records receive no invented provenance. Add optional transaction support to the attendance writer, preserving existing controller contracts.

Use unsigned ID types matching current parent tables, named indexes, real foreign keys, and database uniqueness. Useful indexes cover session/time, session/group, session/cell-group, member/time, and batch session/state/submission-time. Preserve one confirmed row per member/session even after voiding; reinstatement updates that row through an audited action.

Validate exactly-one-parent/scope rules in Joi/service logic and verify whether enforced CHECK constraints are enabled on the actual TiDB environment before relying on them. [TiDB exposes a CHECK-constraint configuration variable](https://docs.pingcap.com/tidb/stable/system-variables/#tidb_enable_check_constraint-new-in-v720). MySQL CI success alone is insufficient. Do not change a cluster-wide setting implicitly during migration. If enforced checks are unavailable, document the application-enforced invariant and verify it with integrity queries.

Use restrictive deletion behavior for confirmed history. An empty draft activity/session can be removed through the existing authorized deletion workflow; an activity with confirmed attendance gets a clear attendance-history conflict rather than a foreign-key 500 or silent cascade. Treat parent/member deletion behavior as an explicit compatibility test.

**QR payloads are identification references with explicit purposes.**

Use versioned formats equivalent to MCC:MEMBER:1:<random-public-id> and MCC:BATCH:1:<random-public-id>. Member and batch payload types are never interchangeable. The decoder accepts a small bounded string and validates its prefix/version/identifier. A batch's target is determined from its stored session; the caller's selected session must match.

The stable member code has no time-based expiry in this release. It remains valid while its credential/member is eligible and can be revoked/reissued. Fixed QR possession alone does not prove physical presence: staff review the displayed member name/photo and follow the church's identity check procedure before recording arrival.

The batch QR references an immutable submission, not a serialized attendee list. Approval uses the server list and digest, not client-supplied member IDs from the decoded code. The default approval deadline is session end plus 24 hours, configurable before opening the session. An approved/rejected/withdrawn/expired code opens a receipt with its current state. It cannot confirm records again. Late approval requires an authorized override with a reason, independently of the capture window.

Return QR images and private lists with private/no-store response caching. Keep raw QR payloads out of URLs, analytics events, ordinary logs, and CSV exports. Authentication and per-record authorization remain mandatory even when a code/reference is known.

**The proposed API contracts isolate the new feature.**

Paths below are proposed additions, not existing endpoints. Keep existing endpoint names and response shapes intact except documented attendance correctness fixes.

| Endpoint | Purpose and enforcement |
| --- | --- |
| GET /api/qr-attendance/capabilities | Authenticated feature/schema readiness, permitted actions, and module availability; no new dependency in auth bootstrap. |
| GET /api/member-portal/attendance-qr | Return only the authenticated linked member's existing QR or not-yet-issued state. |
| POST /api/member-portal/attendance-qr | Idempotently issue that member's first fixed QR. Repeated requests return the existing identifier. |
| GET/POST /api/qr-attendance/members/:id/qr | Registration/Admin operational read or idempotent first issuance for an authorized member, with member_qr:manage. Supports printed/uploaded images for members without portal access. |
| POST /api/qr-attendance/members/:id/qr/reissue | Registration/Admin operational reissue with reason; no permission for leaders to retrieve other members' reusable codes. |
| GET /api/qr-attendance/sessions | Bounded service/event session list with target/date filters and allowed visibility. |
| POST /api/qr-attendance/sessions | Explicit, authorized session configuration with validated parent, times, roster policy, and leader mode. |
| GET /api/qr-attendance/sessions/:id/roster | Paginated roster constrained to the current actor's assignment/eligibility. |
| POST /api/qr-attendance/sessions/:id/member-preview | Resolve/validate a member QR for this actor/session and return minimal identity data; read-only despite POST payload protection. |
| POST /api/qr-attendance/sessions/:id/check-ins | Registration/Admin confirmed QR/manual check-in with a client request identifier. |
| GET /api/qr-attendance/sessions/:id/attendance | Paginated confirmed attendance within actor scope. |
| GET /api/qr-attendance/sessions/:id/summary | Grouped confirmed/expected/pending/source totals within actor scope. |
| GET/POST /api/qr-attendance/sessions/:id/batches | List permitted batches or create an idempotent leader draft. |
| PUT/DELETE /api/qr-attendance/batches/:id/items/:memberId | Own draft-only add/update/remove; validate assignment and expected revision on every mutation. |
| POST /api/qr-attendance/batches/:id/submit | Revalidate and freeze own draft, then return the batch QR receipt. |
| POST /api/qr-attendance/batches/resolve | Registration/Admin resolve a scanned batch for the selected session; resolution itself does not approve. |
| POST /api/qr-attendance/batches/:id/approve | Registration/Admin atomic approval using the expected revision/digest and idempotent receipt. |
| POST /api/qr-attendance/batches/:id/reject or /withdraw | Reviewer rejection with reason, or owner withdrawal before approval. |
| POST /api/qr-attendance/sessions/:id/attendance/:memberId/correct | Authorized void/reinstate with reason, preserved provenance, and audit. |
| GET /api/member-portal/attendance/events | Own confirmed event history with pagination; preserves the current service-history API shape. |
| GET /api/qr-attendance/sessions/:id/export | Scoped CSV/print data with the same filters as the on-screen report and no QR payloads. |

Each mutation validates authentication, capability, ownership/scope, parent status, session timing, member eligibility, and current record state. Membership, recording user, scope snapshots, and server time are derived by the server. Optional registration requirements are session policy: a walk-in is either accepted as a distinct attendance category or rejected with a clear rule; scanning never books a seat/parking slot or silently changes RSVP/event registration.

Default service sessions allow an authorized operator to record a walk-in. Event session setup requires staff to explicitly choose registration-required or walk-ins-allowed before enabling scanning. A member must exist, have an active QR, and satisfy the selected attendance policy; soft-deleted members are blocked. An Inactive membership label alone must not make a returning person's real attendance disappear or automatically change their membership status: present a review warning and follow the session's staff override policy. Portal access remains governed by existing account authentication independently of attendance identity.

QR-confirmed writes and QR draft-item additions revalidate the original code and its resolved member, even after a successful preview. Revocation between preview and confirmation must be honored. Manual recording is a distinct authorized operation; a client cannot label a manually selected ID as a verified QR scan by choosing a method field.

| Response | Meaning |
| --- | --- |
| 200/201 | Confirmed check-in or saved submission; duplicates/retries return an existing result with an explicit already_present/already_approved outcome. |
| 400/422 | Invalid input or unsupported/malformed QR payload. |
| 403 | Valid session but insufficient capability or member/batch outside scope. |
| 404 | QR unavailable/unknown/revoked or permitted resource not found; reveal no out-of-scope identity details. |
| 409 | Wrong selected session, closed window, stale draft revision, disabled workflow, or required batch approval. |
| 410 | Expired batch approval reference, with allowed receipt/status guidance. |
| 429 | QR rate limit; Retry-After and local backoff, with no logout. |
| 401 | Only actual missing/expired/revoked authentication handled by the existing session client. |

**Batch approval is a transactional state change with a durable receipt.**

The normal state flow is Draft -> Submitted -> Approved or Rejected. The owner can withdraw a submitted batch before review. Expiry prevents ordinary approval after its deadline. Corrections to a submitted list create a new draft/version after withdrawal; an approved batch remains an immutable receipt.

On submission, validate every member against the leader assignment and target session, save the submitted revision/digest, and preserve capture metadata. Never rely on a UI roster filter as authorization. A leader reassignment before submission requires revalidation; historical assignments captured in an already-submitted batch remain visible to the authorized reviewer.

On approval:

1. Lock/recheck the batch, ownership-independent reviewer capability, selected session, submitted state, digest, and deadline.
2. Read item/member/registration data in bounded set-based queries. Use stable member order for writes to reduce lock conflicts.
3. Through the service/event writer, insert or convert each eligible confirmed row. Existing real attendance is linked as already present without overwriting its time or recorder. Voided/conflicting records require an explicit correction decision.
4. Record per-item outcomes, approving user, approval time, and receipt totals in the same transaction.
5. Write a required AuditLog entry inside that transaction using the model directly or a QR-specific strict audit function. The existing best-effort global audit helper must not be changed for auth/other modules.
6. Commit, then invalidate attendance/dashboard caches. Return new and duplicate counts from the durable result; post-commit notification failure must not reverse the approval.

Approval creates all eligible new records or rolls back its new writes on validation/audit/database failure. Duplicates are explicit successful skips. Database uniqueness and a bounded retry policy protect against two scanners or two reviewers racing, including a unique conflict detected at TiDB commit. A timed-out client retrieves/retries the same operation receipt instead of assuming the first request failed.

Start with a maximum of 200 items per batch; larger groups submit multiple batches for the same session. Paginate rosters and lists. Permit one in-flight scan request per device, pause decoding while verifying/confirming, and debounce repeated frames. The shared database pool remains the existing configured pool; add no independent connection pool for QR.

**Attendance counts are derived from physical confirmation.**

The source review identified prerequisite fixes within attendance:

- Service RSVP code creates pre-reg attendance rows that several summaries count as attended. Preserve RSVP intent in ServiceResponse/event registration; exclude pre-reg rows from physical attendance totals.
- Conversion from pre-reg to manual check-in currently preserves the earlier timestamp. A real QR/manual arrival records the current server time and preserves the earlier intent evidence separately.
- Stored pre-reg rows are not consistently labelled as pre-registration in the service sheet. Do not count them as checked in or treat them as an already-present leader checkbox.
- Member history currently renders non-Present statuses as Absent, including Pre-registered. Use explicit Present, Pre-registered, Pending approval, Voided, and Unknown mappings. Absence requires the expected roster and a closed session; it is not a catch-all label.
- The member attendance-rate numerator must use confirmed physical attendance from the same completed-service set as its denominator; it must not include a published service or RSVP outside that set.
- Capacity is a venue limit, not an expected-person list. Keep Capacity/Fill Rate as venue metrics and calculate registered no-shows from a frozen expected roster.
- The main service Undo handler throws not-found unconditionally. Port only the reviewed local fix and test the exact route. QR-confirmed records use audited corrections rather than silent deletion.
- Event list, detail, and registration-list APIs need backend leader filtering, including embedded registration/member-ID arrays; the current Everyone option conflicts with the requested own-group visibility. Return an explicit numeric registrationCount independently of the scoped identity list. Update both EventsPage and EventDetailPage to use that count so filtering does not incorrectly change capacity indicators. Member self-registration visibility remains self-scoped through the existing portal.

Apply a consistent confirmed predicate across attendance, service summary/capacity updates, Registration Team dashboard, and member-history queries. For service rows it excludes pre-reg and voided records. Existing old records whose true arrival time or group assignment cannot be recovered remain explicitly legacy/unknown; do not invent values or convert RSVPs into historical attendance.

For sessions enabled in the new workflow, expected count comes from the chosen RSVP/eligible roster policy, captured in attendance_expected_members. Reports show confirmed, expected, registered no-shows after closure, walk-ins, pending submissions, and unassigned members distinctly. Group and cell-group breakdowns are separate dimensions; their totals must not be added together. Across a multi-session event, show both distinct people and attendance visits with clear labels.

Registration staff review and freeze the expected roster before opening the session, using the activity's RSVP cutoff and eligibility policy. Later arrival by someone outside that frozen roster is a walk-in or an explicitly audited expected-roster amendment, according to the session policy. Later RSVP changes do not rewrite historical expectations. When no expected roster is configured, show attendance and capacity only and omit absence percentages.

Query summaries with grouped/set-based SQL and indexed session filters. Avoid the current pattern of repeated counts for each service/status/group. Pending totals count distinct members in submitted items who are not already confirmed, rather than summing batch sizes. CSV/print use the same authorization/filter/count logic as the dashboard.

**The implementation files are deliberately bounded.**

| Location | Planned work |
| --- | --- |
| cms-api/src/modules/qr-attendance/ | Isolated models, router/controller, Joi schemas, session/QR/batch services, confirmed writer adapters, readiness checks, and QR-specific limits. |
| cms-api/migrations/ | Ordered additive tables/indexes/provenance fields and append-only QR grants. Allocate unused timestamps after rechecking main. |
| cms-api/src/app.js | Small guarded mounts for /api/qr-attendance and the self-QR/history additions. Preserve route order, existing auth mount, CSRF middleware, and error middleware. |
| cms-api/src/middlewares/rateLimiters.js | Narrow QR namespace exemption/replacement with explicit limits, retaining all auth and other endpoint limits. |
| cms-api/src/models/Attendance.model.js and validators/attendance.validator.js | Add supported QR/provenance/correction fields without renaming service_id or changing legacy required contracts. |
| cms-api/src/services/attendance.service.js, service-extras.service.js, services.service.js | Transaction-aware service adapter, correct physical-count predicate, timestamp conversion, summary consistency, and enabled-session leader guards. |
| cms-api/src/controllers/service-extras.controller.js | Reviewed Undo repair, correct pre-reg presentation, and scoped service attendance behavior. |
| cms-api/src/services/member-portal.service.js and dashboard.service.js | Correct attendance counts/statuses and preserve existing non-attendance response fields. |
| cms-api/src/services/events.service.js and events.controller.js | Leader filtering in event registration/detail responses with contract tests; preserve event registration and status workflows. |
| cms-frontend/src/features/qr-attendance/ | Lazy camera/image scanner, bounded file validation/decoding, shared result handler, member QR dialog, workspace, roster draft, batch receipt/review, summaries, API hooks, and status formatting. |
| cms-frontend/src/pages/attendance/ | Integrate session-aware QR/batch controls and preserve manual workflows for sessions not enabled. |
| cms-frontend/src/pages/events/EventsPage.jsx and EventDetailPage.jsx | Preserve registration/capacity counts when identity arrays are scoped; add attendance entry/section independently of registration controls. |
| cms-frontend/src/pages/members/MemberPortal.jsx | Add My QR and service/event attendance views; keep QR fetching out of the initial portal load request group. |
| cms-frontend/src/pages/members/MemberProfilePage.jsx | Add a guarded, lazy operational QR dialog for Registration/Admin issue, PNG download/print, and reasoned reissue. Preserve ordinary profile editing and scope. |
| cms-frontend/src/routes/AppRoute.jsx | Add lazy attendance workspace routes using existing ProtectedRoute capability checks. |
| cms-frontend/package.json and package-lock.json | Pin only the chosen scanner dependency; retain the current React/Vite/Node toolchain. |
| cms-api/test and frontend feature tests | Focused state, scope, concurrency, error, and auth-regression coverage. |

AuthContext, axiosInstance, ProtectedRoute, auth service/controllers/routes, verifyToken, cookie/secrets configuration, Vercel API rewrite, and global CSS are protected baseline files. Review must reject incidental changes there. If a later finding requires an authentication repair, handle it in a separate reviewed change with its own evidence; it is not a scanner dependency.

**Deliver work in gated releases from main.**

| Work package | Deliverables | Completion gate |
| --- | --- | --- |
| 1. Establish the implementation baseline | Clean worktree from current main; affected-file inventory; production schema/migration metadata read; confirmed isolated staging API/database; auth and existing-module baseline journeys | Target identities recorded; no dirty-branch sweep; staging requests demonstrably reach staging. |
| 2. Attendance compatibility foundation | Reviewed counting/status/timestamp/Undo fixes; leader API filtering; documented service contracts; compatibility handling for future QR/void rows | Existing API/frontend checks and scoped attendance/RSVP tests pass. Tag this as the supported fallback release before enabling QR. |
| 3. Additive schema and backend | Six new tables, service provenance fields, uniqueness/FKs, QR-specific permissions, guarded router, strict transaction/receipt logic; new sessions remain draft | Fresh MySQL migration CI plus existing-schema upgrade and concurrency checks on isolated TiDB; old app contracts remain valid. |
| 4. Integrate the current UI | My QR dialog/PNG download; camera and image upload; service scanner/batches; event sessions/attendance; scoped leader drafts; registration review/PNG receipts; manual fallback; translations/mobile accessibility | Component/integration checks and browser journeys pass on draft sessions and explicitly opened sessions. Missing QR schema cannot block login/portal. |
| 5. Verify both targets and shared-IP load | Actual member/batch image downloads and uploads through the UI for a Service and an Event; direct confirmation, leader approval, overlaps, exports, multi-day sessions, invalid QR, session expiry, other modules; live camera where available | Mandatory laptop upload flows and acceptance matrix pass. Any physical camera coverage limit is explicitly recorded. Representative concurrent scanning does not harm auth response time or exhaust the shared pool. |
| 6. Deploy with sessions closed | Merge reviewed code to main after CI; additive migration verification; backend health/readiness; frontend build retaining /api rewrite; all QR sessions remain draft/closed | Production login/logout, refresh/reload, portal, and unrelated-module checks pass. New schema state is verified explicitly. |
| 7. Open a limited pilot | Registration Team/Admin explicitly opens one real service and one real event session, one cell group and one group, bounded batch sizes | Confirmed totals reconcile with operator counts; no unexpected logout; duplicate/retry/correction receipts and audits reconcile. |
| 8. Expand and document operations | Enable further sessions; leader/registration instructions; printed-code reissue procedure; correction and support runbook | Pilot evidence accepted; user-facing workflows and support procedures complete. |

All production frontend/backend releases continue to fetch main. Temporary implementation branches and isolated staging are review/test environments. Keep CI gates for API tests, fresh migrations, frontend tests, and production build; add an existing-schema migration/transaction suite rather than relying on mocked Sequelize tests alone.

The current Vercel rewrite points at the production Render API even on a feature preview. A preview URL therefore is not an isolated write-test target. Provision an explicitly isolated staging API/database and a verified staging frontend proxy, or run the full local frontend against that isolated API. Never seed test leaders, create synthetic services/events, or approve test attendance through a preview until that separation is proven. HTTPS/real-device camera testing also needs an appropriate staging origin.

The previously observed local TiDB branch credential/IP mismatch remains a staging prerequisite to resolve and recheck during implementation. This plan does not assume the local .env currently selects the right database. Record the actual TiDB branch, DB user, backend target, applied migrations, and backup/recovery procedure before any schema or fixture writes.

Render currently runs pending migrations on startup and logs a warning when a migration fails. A healthy database connection alone does not prove the new QR schema exists. Verify each table/index/constraint and QR readiness before configuring a session. Session configuration starts in draft and opening requires a separate authorized action. Run migrations once through the reviewed deployment path; no sequelize.sync({ alter: true }), production reset, or blanket seeding.

TiDB DDL commits automatically and cannot simply be rolled back as a data transaction, as described in [TiDB's transaction documentation](https://docs.pingcap.com/tidb/stable/transaction-overview/). Separate small additive DDL changes, test them on an upgraded staging copy, and preserve old columns/keys. Leave partial new schema disabled while a forward repair is reviewed. Do not rotate JWT/refresh secrets or change the production database credentials as part of deploying QR.

**Acceptance tests prove the new behavior and preserve the existing system.**

| Test family | Required cases |
| --- | --- |
| Authentication | Admin, Member, Registration Team, Cell Group Leader, Group Leader, and read-only roles; new device/private browsing; login, reload/session restoration, logout, expiry/refresh, forced-password flow. Invalid QR and 429 must never trigger an auth redirect. Password-reset delivery is tested only in isolated staging or an explicitly authorized real account. |
| Fixed member QR | First creation, concurrent duplicate issuance, same QR after new-device login, staff reissue/revocation, inactive/deleted/unlinked profile, no access to another member's code. |
| Direct scans | Service and Event; correct/closed/wrong session; registered and policy-permitted walk-in; actual server arrival time; double camera frames; simultaneous devices; retry after network response loss. |
| Leader scope | Assigned roster only; forged member/group ID; unassigned leader; reassignment during draft; direct legacy endpoint bypass in batch_review mode; own/all batch resolution rules. |
| Batch lifecycle | Save/reopen draft, remove draft item, revision conflict, submit/freeze, withdrawal/replacement, rejected/expired receipt, immutable approved list, reviewer recheck, timeout retry, two reviewers, duplicate member across different leader batches. |
| Atomicity | Failure before commit/audit failure/commit conflict produces no partial confirmation; successful retry produces one ledger row and one durable approval outcome. |
| Overlap | A member in both a group and cell group, or directly scanned before/after batch approval, remains one confirmed person per session. Breakdown filters are stable and explain overlap. |
| Reports | RSVP never counted as presence; unknown/pre-reg not labelled Absent; expected roster frozen; walk-ins distinct; no-shows only after closure; scope-safe CSV/print; moved member retains historical group attribution; multi-session distinct people versus visits. |
| Corrections/deletion | Void/reinstate with reason; no leader deletion of approved rows; summary and history agree; empty draft deletion works; parent/member-history deletion conflicts are clear. |
| Image/UI | Real browser file picker; member and batch PNGs downloaded from the app; JPEG/WebP screenshots; QR-free/corrupt/unsupported/oversized files; small/rotated/low-quality images; replace during decode; repeated upload; resource cleanup; correct result and explicit confirmation; no backend image upload or auth redirect. |
| Camera/UI | Chrome/Edge desktop; live camera when accessible; rear camera selection where present; permission denied; no camera with upload fallback; printed and phone QR where hardware permits; accessible controls; 360/390-pixel phones, tablet, desktop; camera stops on close/navigation/logout. Android Chrome/iPhone Safari optical coverage is recorded separately when those devices are available. |
| Feature failure/rollback | Feature off, missing QR tables, decoder load failure, local QR error boundary, permission unavailable, genuine auth expiry, disabled pilot session, rollback to the compatibility foundation. |
| Existing modules | Member/profile photo, service RSVP/seat/parking, event register/cancel/status, ministry invitation/assignment, finance view/forms, inventory, archives/download, settings, notifications, and existing routes; no unintended data mutations. |

Functional write tests and synthetic accounts belong to the verified isolated target. Production smoke checks start with read-only login/navigation; pilot attendance is real operational attendance under the agreed rollout.

**The laptop workflow tests the actual application from image generation through persistence.**

Create a small tagged fixture set only in the verified isolated database: Members A, B, and C in the leader's assigned roster, Member D outside it, Member/Cell Group Leader/Group Leader/Registration Team/Admin accounts, one open Service, and one Event with two sessions. As Registration Team, use the operational member QR dialog to issue/download Members B and D's PNGs for the later positive/scope tests; Member A obtains their own through My QR. This also exercises the supported path for a member without portal access. Use the deployed-equivalent UI and database constraints. Do not substitute a mocked QR decoder or direct database insert for the final browser journey.

1. Sign in as Member A, create/show My QR, and download its PNG. Sign out and sign in again or use a fresh browser context; download/decode must resolve the same member identifier. Use the application's own PNG generation and delivery path.
2. Sign in as Registration Team, select the Service session, choose Upload QR Image, and select Member A's PNG with the real file picker. Verify preview, then explicitly confirm. Check the receipt, API result, persisted record, service sheet, member history, and confirmed total of one.
3. Re-upload Member A's PNG and repeat from a second operator context. Verify already-present outcomes and an unchanged confirmed count of one. Reissue the member QR in staging and verify that the earlier PNG becomes unavailable while the new PNG works, without changing login credentials or logging out unrelated sessions.
4. Sign in as the Cell Group Leader, upload Member B's PNG and manually mark Member C into a saved draft. Verify that confirmed attendance remains one, the draft survives reload, and the pending list contains only the assigned members. Submit and download the generated batch PNG.
5. As Registration Team, upload that batch PNG. Verify that resolving/reviewing alone leaves the confirmed count at one. Approve and verify two new confirmations, the original leader/capture times, approval actor/time, and a final confirmed count of three. Persist and reopen the approved receipt.
6. Re-upload that batch PNG; approve a second overlapping Group Leader batch; and directly upload a member already included in a batch. Verify the distinct count stays three and receipts identify existing confirmations without changing their original provenance.
7. Repeat individual and batch upload for Event session 1. Verify the separate event records/history/totals and an unchanged Service count. Select Event session 2 while resolving the session-1 batch and verify a wrong-session result with no write. A valid new session-2 check-in counts once for that session and correctly in distinct-person versus visit reports.
8. Upload a blank image, corrupt image, unsupported file, over-limit image, unrecognized QR, revoked member code, expired/rejected/withdrawn batch, and out-of-scope Member D. Verify clear errors, no stale candidate confirmation, no partial record, and an intact authenticated session. Check authorization with forged request IDs as well as UI controls.
9. Simulate a lost response after a staging commit, a decode failure, approval conflict, and network interruption. Retry/reopen using the same operation/batch receipt. Confirm that no duplicate or partial attendance appears and saved drafts/receipts remain recoverable.
10. Reconcile database rows, session summaries, group views, member histories, CSV/print, and required audit events. Exercise login/reload/logout/private browsing and existing-module journeys after these QR failures. Record actual results and repeat the exact failed steps after every repair.

Use the available browser automation file-chooser capability for these images so the real upload component and decoder are exercised. Keep fixture images and a repeatable verification script locally or in an appropriate test artifact directory, labelled with synthetic identities/session names. Do not include passwords, cookie storage, access tokens, raw QR identifiers, or sensitive production rosters in published screenshots/traces.

For camera coverage, use a permitted real laptop webcam and a printed or separately displayed staging QR when available. An isolated automated browser may additionally use a synthetic video stream of generated QR frames to exercise the camera adapter, repeated-frame protection, and cleanup; label that test simulated. Neither option is a prerequisite for the mandatory image-upload path, and neither justifies an unsupported claim about physical devices not tested.

Production proof follows the existing rollout boundary: verify the released image UI and decoder, then confirm permitted real pilot attendance or an explicitly authorized disposable test session. Do not mark a real member present solely to manufacture test evidence. If the production confirmation prerequisite is unavailable, keep that release gate pending while continuing the remaining authorized verification/repair work.

**Every issue follows a documented inspect, plan, repair, and verify cycle.**

| Step | Required action |
| --- | --- |
| Inspect and reproduce | Reproduce using the exact role, activity/session, input image/camera mode, and saved state. Trace browser -> API -> database -> summary/history and inspect the narrow logs/code. |
| Plan the repair | Record the cause, affected files/contracts/data, smallest proposed correction, auth/other-feature risk, intended regression case, and rollback implications before editing. |
| Repair | Apply the focused change from the clean implementation branch. Preserve attendance data, session behavior, production-target boundaries, and unrelated dirty work. |
| Review | Inspect the diff for incidental auth/proxy/global changes, missing scope checks, unbounded requests, partial writes, and changed UI contracts. Address newly discovered related failures with the same loop. |
| Verify | Repeat the original failing browser journey with the real image/decoder and persistence checks, then run the affected scope/duplicate/auth regression cases. A code change or passing mocked test alone does not close the issue. |
| Reconcile and continue | Record evidence, update the per-flow status, and move to the next pending gate. A recurring failure reopens the issue and triggers another planned repair. |

Maintain docs/QR_ATTENDANCE_IMPLEMENTATION_STATUS.md and docs/QR_ATTENDANCE_VERIFICATION_REPORT.md during implementation. Each issue entry includes reproduction, expected/actual result, root cause, repair plan, changed files/commit, verification evidence, and Open/Repairing/Verified/Blocked status. Each required flow records environment, role, Service/Event/session, input type, before/after confirmed count, duplicate outcome, persistence/audit/history checks, and auth regression result. Record camera observations separately from upload observations.

The implementation completion rule is explicit: continue authorized development, inspection, and repair until member QR generation, individual upload check-in, leader draft/submission, batch upload review/approval, duplicate handling, correct reports/history, and the existing-login/other-feature/rollout gates pass for both Services and Events. Do not conclude because a camera is absent, one decoder call works, a page loads, or a build passes. A necessary external dependency is recorded and resolved or handed off specifically; it does not turn a failed or untested flow into a pass. Requested credentials/permission actions are limited to the exact action needed, and independent work proceeds while that dependency is pending.

Measure warm authentication latency before and during representative scanner load on the same staging deployment. Start with five devices sharing one IP, repeated frames, direct scans concurrent with a 200-person batch, and a larger indexed history fixture. Provisional gates are zero unexpected valid-session logouts, no auth 429 caused by QR scan counters, no duplicate/partial confirmations, and no more than 20% regression in warm login/session p95. Target a warm single check-in p95 below 1.5 seconds and a 200-item approval below 10 seconds; confirm or revise performance targets from measured hosting capacity before production. Do not count a cold-start delay as a database correctness result.

**Rollback preserves confirmed attendance and authentication.**

1. Close the affected pilot sessions and stop check-ins/approvals. Keep Registration Team manual operational fallback available; pending leader drafts/submissions remain saved.
2. Preserve the /api rewrite, cookies, authentication secrets, and current session behavior.
3. Roll the QR UI/API back to the tested attendance compatibility foundation through main. After QR/void records exist, do not deploy a pre-foundation release that counts pre-reg/void rows incorrectly.
4. Keep new tables, QR identities, submitted lists, receipts, confirmed event records, and audit history. Avoid production down-migrations and attendance-data deletion as rollback steps.
5. Reconcile pending/confirmed counts and existing login/module behavior, then repair forward in staging before re-enabling.

The release is complete only when both Service and Event individual/batch flows work in their intended browser roles through the actual QR image-upload path, permissions are enforced through every entry point, totals/history/audit reconcile, camera and manual fallback states behave correctly, existing login/other-module journeys pass, and the rollout/rollback exercise preserves data. Live camera proof is accepted when available and is reported separately; absent physical hardware does not prevent laptop upload proof. Camera optical reliability is not labelled verified without a real device exercise. Source review, successful builds, and a homepage 200 alone do not satisfy these gates.

**Reference material grounds the implementation decisions.**

- [Production baseline](https://github.com/PLWM-Manila-Central-Church/cms-mcc/tree/e698ef448ebd9b5283eb3fbbaf28970957e6ea10)
- [Current API transport](https://github.com/PLWM-Manila-Central-Church/cms-mcc/blob/e698ef448ebd9b5283eb3fbbaf28970957e6ea10/cms-frontend/src/api/axiosInstance.js)
- [Current service attendance](https://github.com/PLWM-Manila-Central-Church/cms-mcc/blob/e698ef448ebd9b5283eb3fbbaf28970957e6ea10/cms-api/src/services/attendance.service.js)
- [Current event registration model](https://github.com/PLWM-Manila-Central-Church/cms-mcc/blob/e698ef448ebd9b5283eb3fbbaf28970957e6ea10/cms-api/src/models/EventRegistration.model.js)
- [Revised paper supplied by the user](C:/Users/LESTER/Downloads/A-WEB-BASED-CHURCH-MANAGEMENT-SYSTEM-OF-PHILIPPINE-LIFE-WORD-MISSION-MANILA-CENTRAL-CHURCHREVISED.docx)
