# Finance Expenses restoration

## Scope

On 2026-10-21, the Finance UI and API were intentionally narrowed to received income. On 2026-10-22, the user requested Expenses be restored, while clarifying that account selection and account assignment should not be part of expense recording.

The restored workflow records outgoing funds by expense category, date, amount, payment method, optional description and optional receipt. New expenses and categories have no account assignment. The former funds/accounts tables and legacy account links remain available in the database for history compatibility; they are not shown in the Expenses UI or required by the API.

## Implementation plan

1. Reopen the Expenses routes and add a Finance Team page alongside Giving records.
2. Remove account selection and implicit category-to-account assignment from the entry, edit, category setup, list and reporting flows.
3. Make the legacy account references nullable through a forward-only migration while preserving every current value.
4. Keep deletion disabled. Archive expenses, categories, funds, accounts and receipts; allow System Admin to restore archived records with parent checks for legacy account-linked rows.
5. Include income, expenses and net balance in Finance dashboard metrics and weekly, monthly, annual and custom reports/CSV exports.
6. Verify API scopes, migrations, reports, archive/restore, receipt upload/download and the rendered Finance Team and System Admin workflows using only disposable local data.

## Verification results

- The restored Finance Team page has no account field or account column. New categories and expenses can be created without an account assignment; the new local QA expense persisted with `account_id = NULL`.
- Existing account-linked QA history survived the nullable-column migration and restored successfully through System Archives.
- Local browser QA exercised sign-in, expense creation, edit, archive, account-free category setup, restore by System Admin, receipt upload/download/archive/restore, and weekly/monthly/annual finance reports plus CSV export.
- The weekly, monthly and annual reports reconciled the same local fixture: PHP 0 received income, PHP 204.75 expenses, PHP -204.75 net balance. The exported weekly CSV matched the rendered report.
- A fresh local MySQL 8.4 database completed migrations through `20261022000004`; `db:validate:3nf` passed. The generated model catalog matches all 58 Sequelize models.
- API suite: 418 passed, 20 skipped. Frontend suite: 183 passed. Production frontend build succeeded. SMS/email delivery stayed disabled.
- These results are local only. No production expense, account, category, member or event data was created or changed, and the restoration is not yet deployed.

## Statement of Account and sample-record review

- Added a Finance Statement preview that combines active giving and expense records for the selected date range, shows opening/period/closing recorded balances, and lists transactions chronologically with income, expense, category, reference, payment method and running balance.
- Named givers use the system's established `Surname, Given name` display format. Anonymous giving stays labeled as anonymous; expense rows do not expose donor information.
- The CSV contains the church name, statement type, period, generated time, summary totals and detail ledger. The print view uses the church logo and existing blue/cyan theme so it can be saved as a branded PDF.
- A read-only review of all production Finance pages found the active income rows consistently carry explicit `DEMO-` receipt references and share the same synthetic recorder. No production record has been changed yet; after the archive-capable release, only rows with that explicit sample marker are to be archived and verified in System Archives. Recheck the live set immediately before archiving and preserve any unmarked rows.
- Statement tests and local UI review use only the isolated local QA database. Production record archival remains a separate post-release action and must be confirmed through the live Finance and System Archives UI.
