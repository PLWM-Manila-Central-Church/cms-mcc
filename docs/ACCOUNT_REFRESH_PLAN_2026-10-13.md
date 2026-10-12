# Account refresh and Admin workflow verification

## Confirmed scope

The user approved retaining every `demo.*` account, every existing Member account, and the original System Admin. Production Admin UI inventory: 81 active accounts, 60 retained and 21 removed. The exact private ID/email inventory is stored in ignored `tmp/account-cleanup-production-20261013.json`, not in this public report.

Create one fresh account for each remaining staff role through the Admin UI: Pastor, Registration Team, Finance Team, Ministry Leader, Cell Group Leader, Group Leader, and unified Leader. Use the user-approved short church-domain login IDs. The shared test password is kept out of repository documentation.

## Analyze and repair prerequisites

1. Account removal currently cascades into linked Members and creator-owned ministry records. Repair it to disable/remove the login, retain historical user/member/business links, revoke sessions and leadership assignments, and release the unique login email using an archived identifier. Audit the previous email and preserved member ID in the transaction.
2. Registration has user-management grants. Enforce a separate System Admin boundary on every account-management API and remove non-admin user permissions via migration and seeder reconciliation.
3. Bulk deletion currently submits parallel requests and hides partial progress. Delete sequentially, retain failed selections and report successes/failures.

## Validation and rollout

1. Verify authorization even when permission grants are incorrect; verify self-deletion is rejected and Member/ministry history is retained; verify session credentials are revoked and old email can be reused.
2. Apply permission migration only to explicitly guarded isolated QA. Run API and frontend checks, production build, and CI fresh-database/browser checks before release.
3. Review and release the repair through a PR to main. Verify Render migrations/health and Vercel's matching revision before cleanup.

## Admin browser execution

1. Re-inventory immediately before deletion and compare exact IDs, emails, roles and retention rules with the private manifest. Abort on unexpected changes.
2. Select only the confirmed 21 old accounts. Obtain the required action-time confirmation at the irreversible deletion dialog and inspect the rendered outcome. Verify retained demo/Member/Admin records and linked Member counts remain intact.
3. Prepare the seven fresh account forms, inspect role-specific required fields and available leadership teams, and obtain specific action-time confirmation before granting new role/team access. Preserve existing demo leadership assignments.
4. Submit creation through Admin UI only. Verify returned Users rows, role, linked Member and leadership assignment. Check mandatory fields, duplicate identity feedback, validation, cancel/back behavior, responsive layout, and error messages as issues arise.
5. Sign in each new account, verify its role landing page and exposed modules, reload persistence, role restrictions and logout. New accounts require a password change at first login; browser policy requires the user to complete that credential-change step. Do not bypass it through database/API edits.

## Completion evidence

Record retained/deleted/new account counts and role results; keep identifiers and screenshots private where appropriate. Final deliverable is the seven login IDs plus known shared password, UI results, any repaired issues, and any unresolved manual first-login steps. Membership/history preservation and least-privilege behavior are required acceptance conditions.
