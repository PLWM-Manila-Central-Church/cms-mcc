# Database Schema Evolution Guide

This guide records the safe project workflow for evolving the TiDB/MySQL schema while the frontend, API, and deployed release may temporarily run different application versions.

## Current contract

- Production uses TiDB Cloud through the MySQL protocol. The inspected `qr_attendance_qa` schema is an isolated QA target; it is not production.
- `cms-api/migrations/` is the authoritative schema history. Sequelize models describe the runtime contract but do not replace migrations.
- `docs/DATABASE_SCHEMA_CATALOG.md` is the model-derived catalog. `docs/TIDB_LIVE_SCHEMA_CATALOG.md` is a QA-only live metadata and aggregate-count snapshot. Neither is a migration.
- Do not use `sequelize.sync({ alter: true })`, edit an applied migration, or make a manual schema change without a corresponding migration and review.
- Never infer that a `.env` file points to disposable data. Before a database write, verify `NODE_ENV`, host/cluster identity, and the exact database name; use the QA guard scripts and exact confirmation values.

## Developer workflow

1. **Analyze impact.** Identify owners, reads/writes, API validation, role scopes, reports/exports, background tasks, deployment ordering, current data, table size, indexes, and foreign-key behavior.
2. **Choose an additive shape.** Prefer nullable columns, new tables, or new indexes first. Avoid dropping/renaming a field while any released API version may still use it.
3. **Write one forward migration.** Use a new timestamped file, make reruns/failure behavior explicit, preserve existing values, and include an intentional `down` path only when rollback is genuinely data-safe.
4. **Update the application contract together.** Update model, associations, validation, service, permission checks, UI, documentation, and tests in the same reviewed change.
5. **Validate the full chain.** Run migration shape/history validation, the API and frontend suites, production frontend build, and `git diff --check`. CI's empty MySQL migration chain is necessary but does not prove TiDB compatibility.
6. **Apply to isolated TiDB QA.** Confirm the exact QA database and environment guard immediately before applying. Verify the resulting live DDL, aggregates, migration ledger, and affected UI flow.
7. **Observe parity before contracting.** For a replacement structure, backfill in bounded batches, compare old and new values, monitor one complete release cycle, then remove the old structure in a later migration after checking every consumer.
8. **Release through review.** Run CI on the proposed `main` change, deploy only from the approved branch, confirm service health and migrations, then verify the affected production UI and data behavior. A successful migration command alone is not release proof.

## Repository commands

Run read-only or local checks from `cms-api/`:

```powershell
npm run db:validate:catalog
npm run db:validate:3nf
npm run db:catalog:live -- --exact-counts --check
```

The live catalog command is guarded to the isolated `qr_attendance_qa` target and exports metadata plus exact aggregate row counts only. It omits TiDB's volatile table-size estimates so repeated `--check` runs compare schema and row-count evidence rather than fluctuating approximate sizes. To intentionally refresh the checked-in QA snapshot after reviewing the target, use:

```powershell
npm run db:catalog:live -- --exact-counts --write
```

That `--write` writes the generated Markdown catalog; it does not migrate or modify table data. Do not run a migration, seed, reset, fixture cleanup, or data repair merely because the live catalog command succeeds.

## Expand, migrate, contract

Use this sequence when a schema change affects persisted data or overlaps deployed versions:

1. **Expand:** add a compatible nullable field/table/index and deploy code that tolerates both old and new representations.
2. **Migrate:** backfill bounded batches with a repeatable job; track progress and failures; compare counts and business-level aggregates without logging sensitive values.
3. **Dual-write only when required:** keep both writes in one transaction, add a parity check, and define which side is authoritative during the transition.
4. **Switch reads:** change reads after parity is established; retain the old write path until the release has been observed.
5. **Contract:** stop old writes, inspect code/report/export/integration consumers and production data, then remove old columns or tables in a later reviewed migration.

For an unused nullable field with no compatibility risk, a single additive migration may be sufficient. Do not apply a multi-release pattern mechanically.

## Current cutover register

| Area | Current state | Safe evolution rule |
|---|---|---|
| Inventory balance | `inventory_items.quantity` is updated by application workflows; `inventory_transactions` exists but is not written by runtime code | Decide whether the quantity column or a complete ledger is authoritative. Do not switch reads or fabricate history until movements and opening balances reconcile. |
| Leadership | `user_leader_assignments` supports unified assignments; `users.leads_*` remains as a compatibility projection; ministry role/position structures coexist | Keep compatibility fields until authorization, invite, roster, and report consumers have moved and assignment parity is proven. Validate polymorphic scope targets in services and before deleting teams. |
| Archive versions | Version rows reference archive records; record current-version pointer has no FK; version-number uniqueness is service-managed | Preflight duplicate versions and invalid pointers on every target before adding unique/FK constraints. Preserve files and audit history. |
| Finance attachments | An attachment has nullable income/expense owner columns; model/API validation requires exactly one | Keep application validation; add a database-level invariant only after checking TiDB constraint support and existing rows on the deployment target. |
| Authentication state | Refresh-token hashes are indexed; revoked/expired tokens and user sessions persist; logout does not populate session `logout_at` | Define session semantics and retention first. Preserve incident-review/audit needs; clean only disposable auth state beyond the approved reuse and investigation window. |
| Events and attendance | RSVP, reservation, and physical attendance are separate tables; event seat/parking constraints are additive | Keep registration separate from check-in. Add new attendance dimensions through new migrations and preserve unique session/member semantics. |

## Migration and deployment gates

- Check migration names and ordering; do not reuse timestamps or file names.
- Design indexes for a specific filter/order path. Account for write overhead and duplicate/overlapping indexes.
- Use preflight queries for duplicates, nulls, orphan references, and value ranges before adding unique or restrictive constraints.
- Consider table size, TiDB DDL duration, backfill batch size, lock behavior, and deployment startup limits.
- Keep API changes backward compatible while old and new app instances can overlap.
- Verify migration ordering with a fresh database in CI, then apply to isolated TiDB QA and compare live DDL. MySQL CI is not a substitute for the TiDB QA pass.
- Treat rollback scripts that delete or transform data as data-loss operations. Prefer forward repair and verified backup/recovery plans over destructive `down` migrations.
- Do not include secrets, row-level personal data, or full production query results in schema catalogs or logs.

## Current baseline

The 2026-10-11 UTC isolated QA catalog contains 58 base tables, 527 columns, 290 indexes, 128 foreign keys, 626 aggregate rows, and 99 applied migrations. The model/live name and supported type comparison is clean, and 39 targeted compatibility checks pass. These figures describe QA only and must be refreshed before a future migration or release; they are not production capacity metrics. The row count includes synthetic login/session history created during browser verification and was refreshed after the Admin mobile route sweep.
