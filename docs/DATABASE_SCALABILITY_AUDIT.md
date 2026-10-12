# Database Architecture and Scalability Audit

Audit date: 2026-10-11

Database: TiDB Cloud `qr_attendance_qa`, TiDB `8.0.11-TiDB-v8.5.3-serverless`

Source: current local implementation and a read-only metadata/aggregate snapshot of the isolated QA schema

## Executive assessment

The schema has a sound relational foundation for the current church-management workload. Its major domains are separated, high-value relationships are mostly protected by foreign keys, and unique keys protect core registration, attendance, membership, and QR identity rules. The 39 repository compatibility checks pass, the live QA catalog matches the current Sequelize models for table/column names and supported SQL types, and all 99 migrations are applied on the inspected QA schema.

The QA database contains 626 aggregate rows across all tables, several functional tables are empty, and this audit did not inspect production table contents, run `EXPLAIN ANALYZE`, or conduct a representative load/concurrency test. These observations do not establish production capacity. The immediate scaling limits are application query shape, growing history tables, and unresolved source-of-truth transitions.

There is no basis for a broad schema rewrite or indiscriminate normalization. The best path is targeted: cap growing reads, reduce repeated dashboard queries, define retention, and settle the inventory and leadership transition models before those domains accumulate substantial data.

## Snapshot and method

| Measure | Isolated QA snapshot |
|---|---:|
| Base tables | 58 (57 Sequelize model tables plus `SequelizeMeta`) |
| Live columns | 527 |
| Index definitions | 290 |
| Physical foreign keys | 128 |
| Aggregate rows, including migration metadata | 626 |
| Applied migrations | 99 |
| Model/live table-name differences | None |
| Model/live column-name differences | None |
| Supported normalized model/live type differences | None |
| Repository compatibility checks | 39 passed, 0 failed |

The live catalog in [TIDB_LIVE_SCHEMA_CATALOG.md](TIDB_LIVE_SCHEMA_CATALOG.md) contains schema metadata and aggregate row counts only; it does not include row-level member, finance, or credential data. The model-only data dictionary is [DATABASE_SCHEMA_CATALOG.md](DATABASE_SCHEMA_CATALOG.md).

The 3NF compatibility script is a set of targeted existence, duplicate, orphan, and backfill-parity checks. Passing it is useful evidence, but it does not prove that every relation satisfies every normal form. The QA row count is too small to estimate production storage or throughput.

## Domain architecture

| Domain | Current structure | Assessment |
|---|---|---|
| Identity and access | `users`, `roles`, `permissions`, `role_permissions`, invitations, reset/refresh tokens, sessions | Role permissions are normalized. Email is unique; refresh tokens are stored as SHA-256 hashes. Session/token retention and session logout tracking still need policy. |
| Members and groups | `members`, contacts, notes, status/group history, cell/member groups | Repeating profile details and history are separate. Current membership is distinct from attendance-time group snapshots, which preserves historical reporting. |
| Leadership and ministries | `user_leader_assignments`, legacy `users.leads_*`, `ministries`, `ministry_roles`, `ministry_positions`, ministry memberships/assignments | The unified assignment service is in use and retains legacy projections for compatibility. The model transition is not complete: role/position concepts still coexist, and `ministry_positions` has no QA rows. Keep both representations until parity and consumer checks support a cutover. |
| Services and events | Services/RSVP, `attendances`, Events/`event_registrations`, QR sessions/batches/event attendance | RSVP and physical check-in are separate. Service and event attendance share a session/batch design while retaining their domain-specific attendance records. Unique keys and group snapshots support duplicate prevention and scoped historical views. |
| Finance | Categories, funds/accounts, income records, expenses, attachments | Income and expense records remain separate models with their own workflow. Attachment ownership is checked in the model/API, but the database does not enforce exactly one parent. Preserve the separate business records unless a future accounting requirement calls for a unified ledger. |
| Inventory | `inventory_items`, requests, usage, transactions | Current quantity is stored on the item and changed by application workflows. `inventory_transactions` exists but has no runtime write path and is empty in QA, so it is not yet an authoritative ledger. |
| Archives | Categories, records, versions, access logs | Record/version history is separated. The version pointer and version-number invariants are currently enforced by service behavior rather than complete database constraints. |
| Operations | Notifications, audit logs, settings | Appropriate append-oriented records exist, but several high-growth reads are unbounded and no retention/partition/archive policy is documented. |

## What is working well

- Primary keys and 128 physical foreign keys protect the majority of concrete relationships.
- Unique indexes enforce member barcode/email, user email, role/permission pairs, event registration, event seat/parking reservation, service/member attendance, QR public IDs/versions, and other core identities.
- QR check-ins retain the member's group affiliation at check-in. This is intentional historical denormalization: later group moves should not rewrite old attendance reports.
- The schema separates pre-registration from physical arrival. Event registration does not create an `event_attendances` row; Services and Events each have their own attendance record path.
- The migration history is forward-only in practice and applied through 99 entries on this isolated QA schema. The model/live catalog comparison currently reports no supported column type mismatch.
- Recent safeguards include inventory-request idempotency, event seat/parking uniqueness, QR credential version uniqueness, and transactional reservation paths.

## Findings and recommended work

### High priority: inventory quantity has no transaction ledger

The item row's `quantity` is the current source of truth. Usage and request-review paths update that value, while the existing `inventory_transactions` model/table has no runtime writes. The QA snapshot has 0 inventory items, 0 usage rows, and 0 transaction rows, so there is no inventory history from which to prove or rebuild balances.

**Recommendation:** decide whether the product needs a complete stock ledger. If yes, add explicit receipt/initial-stock, adjustment, usage, fulfillment, return, and correction transactions in the same transaction as the quantity change. Start with new movements, reconcile each existing item against the ledger in bounded batches, and switch balance reads only after a reviewed parity report. Do not backfill synthetic opening transactions or delete usage history without an approved accounting rule.

### High priority: repeated count queries in the Registration dashboard

The Registration Team dashboard loads up to ten completed Services, then runs separate active/inactive attendance counts per Service. It also loads every cell group and runs a member count and attendance count per group for the latest Service. Query volume therefore grows with the number of displayed Services and groups.

**Recommendation:** replace the loops with grouped aggregate queries keyed by `service_id` and `cell_group_id`, keeping voided and pre-registration rows excluded exactly as they are now. Compare result parity against the current implementation before switching.

### High priority: several history and roster reads have no server-side page cap

Current unbounded reads include a user's complete notification feed, audit logs filtered by user/table, all Ministry assignments and assignments for one Service, archive versions/access logs per record, and the complete member attendance history. Some are bounded by a parent entity but can still grow for long-lived records. The general Audit Logs UI list and several finance, member, event, and inventory lists already use pagination.

**Recommendation:** add stable ordering and bounded pagination/cursors to feeds and long-lived histories. Use a retention/archive rule for notifications and authentication records, while preserving legally or operationally required audit and finance history. Keep compatibility response fields during frontend migration.

### High priority: authentication history grows without a retention contract

Refresh tokens are stored as SHA-256 hashes and an index covers the 64-character digest prefix for equality lookup. The latest isolated QA snapshot has 61 refresh-token rows, 59 user-session rows, and 121 audit rows. Expired/revoked token rows and `user_sessions` still accumulate. The logout path revokes the refresh token but does not set a corresponding `user_sessions.logout_at`; the session table therefore cannot currently provide reliable active-session history. The snapshot includes synthetic browser-test login activity and is not a production user count.

**Recommendation:** define the intended meaning and retention of a session row. Update the matching session on logout if session history is used operationally, and add a scheduled or bounded cleanup for expired/revoked token data after the reuse-detection and incident-review window. Keep immutable security audit events separate from disposable session/token state.

### Medium priority: leadership transition needs one documented authority

`user_leader_assignments` is used by the unified Leader role and the assignment workflow; the legacy `users.leads_cell_group_id`, `leads_group_id`, and `leads_ministry_id` fields remain for compatibility. The table uses polymorphic `(scope_type, scope_id)`, so a conventional foreign key cannot verify that each scope points to the correct cell-group, member-group, or ministry table. The service validates targets, and legacy fields are projected for older code. QA contains two unified Leader assignments. `ministry_roles` and the backfilled `ministries` currently pass parity; `ministry_positions` has no rows.

**Recommendation:** keep the current compatibility contract until every authorization, profile, invite, roster, and reporting consumer uses the chosen authority. Document whether one user can hold multiple scopes and positions. Add explicit target deletion checks and parity monitoring. Consider separate typed assignment tables only if enforcing scope foreign keys becomes more valuable than the flexibility of the current polymorphic table.

### Medium priority: database does not enforce a few service-level invariants

- `archive_versions` has no unique `(record_id, version_number)` index; `archive_records.current_version_id` is indexed but has no foreign key to an `archive_versions` row. Both tables currently have 0 QA rows. A migration should preflight duplicates and pointer consistency before adding constraints on a nonempty target.
- `attachments` has nullable `income_id` and `expense_id`; Sequelize validation requires exactly one, but the database has no equivalent check constraint. Retain API validation and add a compatible database invariant if TiDB version support and existing data checks permit it.
- Only one active member QR is expected. The QR service serializes issuance by locking the member row, while the schema enforces public-ID and per-member-version uniqueness but not active-status uniqueness. Preserve the transaction lock and consider a database-enforced strategy if supported and verified.
- The `archive_records.status` and `is_deleted` columns both represent deletion state. The service updates them together; document a canonical rule and keep the writes transactional to prevent drift.

### Medium priority: duplicate indexes add avoidable write cost

The live catalog shows two equivalent creation-time indexes on `audit_logs` and two equivalent `(user_id, is_read)` indexes on `notifications`. Remove redundant copies only through a new migration after confirming their names and usage in every target schema. Do not remove merely overlapping indexes without query-plan evidence. The generated `SequelizeMeta` table also contains a duplicate unique index on its primary-key column, but this tiny migration ledger is not a meaningful application performance risk.

### Medium priority: horizontal API scaling needs shared-state and connection planning

Role-profile and general application caches are process-local. With multiple API instances, cache contents and invalidation can temporarily diverge. The database pool is configured per process, so total potential connections rise with the instance count. The current Render service has one instance, which limits the current exposure but does not prove that adding instances is safe.

**Recommendation:** before adding instances, set an explicit connection budget against TiDB limits, instrument pool wait/usage, and either move shared cache state to a shared cache or document acceptable staleness and ensure authorization changes bypass stale cached decisions.

### Lower priority: make search and lifecycle invariants measurable

Member search uses contains-style matching over names/contact/barcode; leading wildcards will not benefit from ordinary B-tree name indexes. Stored status fields such as inventory availability and archive deletion state can diverge from their source values if a write path misses the shared helper.

**Recommendation:** preserve the current UX at this data size. If search latency becomes material, add a measured search strategy (prefix, full-text, or dedicated search service) rather than stacking speculative indexes. Keep derived statuses updated in the same transaction and add mismatch checks.

## Normalization conclusion

The main transactional domains are sensibly separated and the schema does not show a reason for a broad normalization rewrite. The principal risks are transitional duplicate representations and operational growth controls:

1. `inventory_items.quantity` versus an unused transaction ledger;
2. unified leader assignments versus compatibility fields and ministry-role concepts;
3. archive state/version invariants and attachment parent ownership enforced only partly in SQL;
4. history/feed rows without bounded reads or retention.

The event/service attendance snapshots, audit JSON snapshots, and stored availability values are deliberate denormalizations for history, audit, or efficient filtering. Keep them if each write path updates them consistently and parity checks detect drift.

## Recommended sequence

1. Add pagination/caps to unbounded high-growth reads and batch the Registration dashboard aggregates; preserve current role scope and output semantics.
2. Record a session/token retention policy and repair logout session tracking; add a safe cleanup process only after the retention window is approved.
3. Choose the inventory balance authority before building more inventory reporting or import features; if a ledger is selected, implement transactional movements and a reconciliation report first.
4. Finish documenting the leader/ministry authority and polymorphic-scope deletion rules; keep compatibility columns while consumers are migrated.
5. Add archive/version and attachment constraints through additive migrations after target-specific duplicate/orphan preflights. Remove confirmed duplicate indexes in the same controlled, reviewed migration window.
6. Build a representative isolated dataset, record `EXPLAIN` plans and query timings, and run concurrency/load tests with agreed latency and connection targets.
7. Repeat model/live DDL, integrity, migration, and rendered-flow checks on a production-like staging database before a production migration. This audit made no production schema change.

## Limits of this audit

- The database inspected was isolated `qr_attendance_qa`, not production `church_cms`.
- The QA snapshot has 626 aggregate rows; it is too small to establish production capacity or meaningful storage growth.
- No production row data, individual finance values, or credentials were included.
- No `EXPLAIN ANALYZE`, sustained load test, failover test, or multi-instance cache test was run.
- Local source and this audit remain uncommitted and undeployed.
