# Activity reminders and attendance follow-up

## Authorized scope

Implement the pasted notification proposal in the existing MCC application. Work stays in the local `user/panel-revision-workflow-20261020` checkout. Preserve the pending report/archive/event-image/expense changes.

**No SMS testing:** do not create a provider account, validate credentials with a provider, send SMS, query a real provider message, or enable live delivery. Verify internal rules, simulation, permissions, migrations, and UI only. Defaults must prevent provider requests even when a queue exists.

## Architecture and decisions

- Reuse React, Express, Sequelize/TiDB, existing Service/Event attendance sessions, frozen expected rosters, finalization revisions, member records, leadership assignments, notifications, and audit logs.
- Add six tables: `outreach_preferences`, `outreach_session_policies`, `attendance_exceptions`, `attendance_follow_ups`, `outreach_deliveries`, and `outreach_delivery_attempts`. No parallel activity or attendance system.
- An activity must explicitly enable reminders/follow-ups and have an expected roster. Optional activities with no expected roster never create absences.
- Follow-ups are grouped by a staff-selected gathering series. Within a series use actual session start time plus session ID as a stable tie breaker. Cancelled sessions are excluded. A more recent unfinalized or pending outcome blocks automatic follow-up until reviewed; missing scans are never treated as finalized absence.
- Present or excused ends an absence episode. Two finalized eligible absences open one case; continued absences update that case rather than sending again. Resolved cases remain resolved for that episode. Corrected attendance invalidates finalization and cancels unjustified pending deliveries/cases.
- Exceptions annotate the existing expected roster (`excused`, `pending`, `cleared`), carry a reason/audit trail, and reopen finalization. Confirmed attendance remains authoritative.
- Reminder defaults are three and one calendar days before the gathering, at 09:00 Asia/Manila. Late reminders expire; recovery does not send a backlog of outdated reminders.
- Consent is tied to the normalized Philippine mobile number. A changed number requires fresh consent. Opt-out cancels pending SMS. Cases remain available for appropriate personal care even when SMS is off.
- Queue insertion uses unique deterministic keys. Dispatch uses a database claim/lease. In-app creation and completion are transactional. Ambiguous SMS results are marked for review instead of blindly retried.
- The worker supports disabled, simulation, and live modes. Simulation is explicitly labelled. `SMS_DELIVERY_ENABLED=false` is an independent server gate. No UI option may bypass it.
- Mocean is an interchangeable transport. Credentials stay in server environment variables. Provider request/status behavior remains unverified until the user separately authorizes SMS testing.
- Processing runs after attendance finalization/correction and through a recoverable interval, CLI, or protected scheduler endpoint. A sleeping free host needs an external trigger for unattended schedules.

## Access

| Actor | Access |
|---|---|
| System Admin | Configure workflow, policies, consent, exceptions, cases, queue and processing |
| Registration Team | Policies, recorded consent, attendance exceptions, cases, queue and processing |
| Pastor | Read all cases/history and assign/resolve follow-ups |
| Leaders | Read cases/history for current assigned members; claim/resolve within a selected team |
| Member | Read/change own contact preferences and consent only |
| Finance / other roles | No staff outreach access; an account linked to a Member can manage its own preferences |

Revoked assignments and inactive/deleted users/members are excluded. The unified Leader's combined view is read-only.

## API contract

All responses use `{ success: true, data }`; domain errors follow the existing `{ error: { code, message } }` handling. IDs are positive integers, collections are paginated (maximum 100), and mutations reject unknown fields.

| Method | Path under `/api/outreach` | Contract |
|---|---|---|
| GET | `/availability` | Feature/schema/mode and current actor capabilities, no secrets |
| GET/PUT | `/configuration` | Admin workflow enable/mode, reminder days/hour, templates, daily cap |
| GET | `/overview` | Scoped case/delivery counts and operational status |
| GET | `/sessions` | Existing sessions and their outreach policy, roster basis and finalization |
| PUT | `/sessions/:id/policy` | Reminder/follow-up opt-in and series key; staff only |
| GET | `/sessions/:id/roster` | Expected members with present/absent/excused/pending/provisional outcome |
| PUT | `/sessions/:id/members/:memberId/exception` | Excused/pending/cleared with reason; reopens finalization |
| GET | `/members` | Staff member picker and consent state |
| GET/PUT | `/members/:id/preferences` | Admin/Registration-recorded consent with evidence note |
| GET/PUT | `/me/preferences` | Authenticated account's linked Member phone/consent/category preferences only |
| GET | `/follow-ups` | Scoped, paginated cases; filter status/search |
| GET | `/follow-ups/:id` | Scoped case detail, eligible timeline and delivery history |
| GET | `/follow-ups/:id/assignees` | Active eligible workers only |
| POST | `/follow-ups/:id/assign` | Global worker assigns an eligible worker; scoped leader may claim self |
| POST | `/follow-ups/:id/resolve` | Resolution note; audited optimistic revision |
| GET | `/deliveries` | Scoped, paginated channel/status history; no credentials/raw provider responses |
| POST | `/deliveries/:id/retry` | Definitive failed deliveries only; revalidates consent/eligibility |
| POST | `/evaluate` | Staff evaluates due reminders/follow-ups without provider calls |
| POST | `/process` | Staff processes internal/simulated queue; live mode requires server gate |
| POST | `/jobs/run` | Server scheduler token only; disabled unless explicitly configured |

## Implementation sequence

1. Add policy functions, schema/readiness gate and forward migrations with indexes/permissions.
2. Implement preference, policy, roster-exception and scoped case services.
3. Implement evaluation, idempotent queues, preflight validation, claims/recovery, attempts and transport adapter.
4. Add finalization/correction hooks and scheduler lifecycle. Failures must never roll back an attendance write.
5. Add responsive staff workspace and Member preference card, navigation and deep links.
6. Verify internal rules and APIs; migrate only the confirmed `qr_attendance_qa` target; exercise UI with synthetic data; run affected regression checks/build; clean fixtures.

## Acceptance checks (no SMS network calls)

- [x] One absence: no case. Two consecutive finalized eligible absences: one case.
- [x] Present/excused resets; pending/unfinalized blocks; cancelled sessions and unrelated series excluded by policy checks.
- [x] Continued absences and repeated/concurrent evaluation do not duplicate the episode or messages.
- [x] Attendance correction cancels unjustified pending work; resolved episodes do not reopen on each sweep.
- [x] Consent defaults off; invalid/changed phone or opt-out blocks SMS and cancels pending SMS.
- [x] Reminders target eligible expected members at each configured interval once and expire safely.
- [x] Internal claim recovery preserves history. External retry/delivery effects remain untested as instructed.
- [x] Simulation was exercised through the Admin UI: three simulated SMS and three internal notifications; zero live attempts and no false provider receipt timestamps.
- [x] Admin/Registration/Pastor/Cell/Group/unified Leader/Member/Finance browser boundaries passed. Ministry and revoked-assignment paths were inspected/tested at source/API level, not separately browser-certified.
- [x] UI loading, errors, validation, save, assignment, resolution, refresh, scoped history and CSV download passed. Mobile notification placement and dark-theme consistency were repaired and browser-retested.
- [x] Existing report/archive/event image/expense/auth/attendance checks and frontend build remain green.
- [x] Synthetic QA data is removed; no production migration/deployment or real SMS occurred.

See `OUTREACH_QA_RESULTS_2026-10-20.md` for evidence and remaining verification limits.

## Deferred by explicit user instruction

Real Mocean account setup, credentials, SMS sends, delivery receipt verification and carrier/device inbox testing. Live SMS must remain visibly disabled and must not be described as verified.
