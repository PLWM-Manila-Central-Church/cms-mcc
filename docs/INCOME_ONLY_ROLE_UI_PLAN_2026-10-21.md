# Income-only finance and role UI verification

> Historical scope note: the income-only decision recorded here was superseded by the user's 2026-10-22 request to restore Expenses. Current implementation and verification are tracked in [Finance Expenses Restoration](FINANCE_EXPENSES_RESTORATION_2026-10-22.md).

## Confirmed scope

- Finance records money received: tithes, offerings, donations and other income. Expenses are excluded.
- Event images are working according to the user's production confirmation; retain their implementation and include a display regression check.
- SMS delivery is excluded. QA must disable email delivery and external SMS processing.
- Preserve existing financial history and database tables. No destructive migration is required to retire an exposed feature.
- The user authorized using the linked Drive folder as the real member roster source and requested cleanup of old Services, Events, member records and non-exempt Member login accounts. Keep the designated Lesterius Member login and every `@plwmmcc.com` account.

## Implementation sequence

1. Use the clean checkout matching production (5379b78), preserving the older dirty worktree.
2. Retire expense UI, setup UI and routes; redirect old frontend bookmarks to income records. Remove expense and net-balance figures from analytics and CSV exports. Disable expense API paths and expense receipt uploads, keeping existing database history intact.
3. Correct inventory notification recipients: inventory managers receive operational notices; only affected pending requesters receive requester notices. Stop broadcasts to unrelated Members. Reuse authenticated per-user notification access.
4. Run focused backend and frontend regressions and production builds. Verify no stale expense navigation or outgoing SMS/email paths are introduced.
5. Browser-check all supplied staff accounts in production without changing passwords: Admin, Registration, Finance, Pastor, Group, Cell, combined Leader and Ministry. Inspect role navigation, reports, notifications, attendance scope and relevant archive/event screens. Use the previously supplied Member account for its portal.
6. Exercise state-changing tests in isolated qr_attendance_qa: received-income record/receipt, notification generation and audience isolation, unread/read/open/dismiss/clear behavior, weekly/monthly/annual reports, archive/restore and direct/batch QR attendance. Use synthetic fixtures and clean them up.
7. Repair reproducible failures after inspecting their cause. Rerun the affected browser path and focused regressions. Publish only the reviewed patch, then repeat role navigation and access checks on the deployed release.

## Role matrix

| Role | Required checks |
|---|---|
| Admin | Income-only finance, reports, archive/restore, event image display, notification controls and recipient boundaries |
| Registration | Attendance sessions, direct and batch QR, scoped reports, notifications and outreach access |
| Finance | Received-income form, receipt/history, period reports; no expense or attendance administration |
| Pastor | Aggregate reports, pastoral attendance/care views; correct read/write restrictions |
| Group / Cell | Assigned team only, attendance and batch flow, scoped report and notification deep links |
| Combined Leader | Both assigned scopes, no outside-team access, correct scope switching |
| Ministry | Own ministry assignments and requests; no finance or unrelated team data |
| Member | Own attendance/QR, giving, events/images and notification preferences/messages |

## Completion evidence

Record each flow as passed, failed, blocked or not exercised; distinguish production observation, isolated QA browser proof and automated checks. Successful login alone does not certify a role. Do not claim physical-camera proof from an uploaded-image test. Report external authentication/connectivity limitations precisely.

## Real roster preparation and reset

Drive source was read only; no files or access settings were changed. There are 18 workbooks: 17 current sources and the older `LAKEFRONT B (FOR EDITING)` copy. The 17 current sources contain 1,102 named rows. The 2026 Lakefront B file has 67 rows; the older file has 55, with 46 shared name keys, 19 new-only keys and 8 older-only keys. Use the newer file for shared names and add the 8 older-only members. Two rows in the current files are exact duplicates after the import normalization rules; other repeated names are retained. The merged roster contains 1,108 unique member records.

The staging run matches one existing protected Member profile to one source row; update that profile in place to preserve its login link, then create 1,107 new Member profiles. Keep all 14 protected accounts (the 13 church-domain accounts plus the designated Lesterius login) and their 13 linked Member profiles. The other protected linked profiles do not match a roster name and remain unchanged. The Admin Members importer accepts exact cell-group and main-group names, strips a UTF-8 BOM, returns row-to-member IDs, and does not include roster names in skipped-row errors.

The source has 17 numbered cell groups (CG11–CG53) plus nine CG54 rows with no name. The staging manifest maps every source row to a target. The local migration adds `Toddlers` for 5 members and a visibly labeled `Cell Group 54 (name pending)` placeholder for 9. It also aligns six existing cell-group display names with the roster while preserving their IDs and leader assignments: Dela Rama, Fourth Estate, BF Homes, TS Cruz & Munti, Las Piñas and Lakefront A. Other main-group names map to the existing Men's Group, Women's Group, Young Adults, High School, Elementary and Preschool records. A production-like migration test covers these renames; an isolated QR-only QA database correctly skips them.

The normalized roster contains 838 Active and 270 Inactive records. The 235 Semi-Active and 161 New source states normalize to Active and are retained in `member_status_history`. M/F map to Male/Female; three missing statuses default to Active. Fourteen names are one word. Another 187 multiword source names have no comma delimiter; the import preserves the whole name in `first_name` and leaves `last_name` blank instead of guessing the surname. The staged merge has 482 missing phone values, 1,104 missing addresses, 628 valid birthdates and 633 valid spiritual birthdays. Invalid or incomplete dates stay blank, and phone values are retained without guessing missing digits.

The current workbooks contain 729 image objects in the member-photo column; 15 are anchored to rows without a member name and are not importable. The merged roster maps 715 usable photos, including 8 photos for older-only Lakefront B members. Older-copy images for names present in the new master are excluded. The 715 images are resized to a maximum 512 px and optimized from about 215 MB to about 12.1 MB (largest output about 70 KB), staying well below both the app's 5 MB upload limit and the existing Supabase bucket's 50 MB per-file limit. The bucket is `mcc-uploads` in the existing `PLWM MCC` Free project; current usage is 0 of 1 GB storage and 0 of 5 GB egress. No new storage project or paid resource is needed. The staging CSVs and images remain outside Git.

The spreadsheet folder has no event/service history, so it cannot provide replacement Event or Service records. Its formula errors and unrelated ministry, accounting and meeting history columns are not imported. Preserve the original files in Drive. A private staging manifest tracks source row keys, photo files, batches (500/500/107), group mapping and the protected-profile update. Upload photos only after their Member IDs are known.

Production inventory from the Admin UI/API read: 67 user accounts, 13 `@plwmmcc.com` accounts, 9 Member-role accounts, 231 Member records, 23 Services and 3 Events. The keep-set is the 14 protected accounts and their 13 linked Member profiles; the production roster match updates one linked profile. Three Member-role accounts are outside that keep-set. The remaining 218 legacy Member profiles can be soft-deleted after the new roster and account keep/delete manifest are reconciled. Existing finance records and Archive records remain outside the reset scope. Service deletion is currently hard-delete, while Event deletion is soft-delete and has no restore UI; treat cleanup as a separate action requiring a final production confirmation after backups and UI QA.

## Local verification completed

- Final local verification: backend suite 78 passed suites, 385 passed tests, 19 skipped; frontend suite 52 files and 175 tests passed; production frontend build passed. Focused CSV BOM/name-resolution, scope, migration and photo-controller coverage passes (12 tests).
- Runtime dependency audit reports 0 vulnerabilities after upgrading Multer to 2.4.0; the 11 open high-severity Multer advisories are addressed. Development now uses Node 20's stable built-in `--watch` instead of Nodemon. The full development dependency tree still has 19 moderate advisories, primarily the Jest/YAML/Sprintf chain with no safe in-range fix; this remains a separate development-toolchain follow-up.
- Local browser Admin Finance page shows income-only totals/records and an income form with no account selector. Synthetic income QA uses a reference-prefixed record and is covered by the isolated cleanup fixture.
- Local Admin import path created synthetic mononym and named rows; the visible Members list and profile show the group mapping, birthday fields and normalized status history. A synthetic profile image was uploaded to local disk fallback and visibly rendered. The member form accepts a blank surname, and the referral dropdown now uses the shared name formatter so mononyms do not show a leading comma. Native file-picker selection could not be exercised through the available in-app browser controls; the import API path and visible UI result were verified separately.
- Direct member QR and leader batch attendance, duplicate-scan prevention, notifications, archive restore, role navigation and event-image display passed in earlier isolated QA. Physical camera capture was not verified on this laptop; uploaded-QR fallback was verified. SMS remains disabled and untested.
- All current isolated QR-browser fixtures, including the import/photo test members, photo objects, synthetic income record, outreach state, service/event fixtures and QR artifacts, were removed by the guarded cleanup script. The local fixture login was removed, leaving the local UI at its sign-in screen.

Do not report the production work as complete until the patch is deployed, the role UI regression is repeated on production, the exact production archive/delete plan is approved at action time, the roster and photos are imported, the 14 protected accounts remain active, and all synthetic QA fixtures are removed.
