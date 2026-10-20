# Outreach implementation and non-SMS QA results

Date: 20 October 2026. Checkout: `qr-attendance/mcc`, branch `user/panel-revision-workflow-20261020`.

## Delivered locally

- Existing Service/Event sessions can opt into scheduled activity reminders and attendance follow-up series.
- Two consecutive finalized eligible absences create one care episode; additional absences update it. Presence, excusal, pending review, correction and resolution are handled without treating provisional records as absences.
- An auditable queue, unique keys, worker leases, stale-claim recovery, consent rechecks, expiry and guarded retry support internal notifications and a future SMS transport.
- Admin/Registration manage policies, expected-roster exceptions, consent and internal processing. Pastor assigns/resolves care cases. Cell/Group/Ministry and unified Leaders use existing member scopes. Members manage their own preferences.
- Disabled, simulation and live SMS states are distinct. SMS remains independently gated off. No provider credentials were added or tested.
- Responsive staff screens, Member preference card, role navigation, case deep links, history and server-side scoped CSV data are included.
- Earlier panel changes remain intact: report periods, archive/restore, Member event imagery, and category-derived expense accounts.

## Automated evidence

| Check | Result |
|---|---|
| Full backend Jest regression | 72 suites passed, 1 suite skipped; 363 tests passed, 19 skipped |
| Full frontend Vitest regression | 52 files, 172 tests passed |
| Final frontend production build | Passed |
| Git whitespace check | Passed |
| Guarded real QA workflow exercise | 13 internal scenarios passed; provider network stub rejected any attempted request; zero provider requests |
| Final database check before cleanup | Two resolved cases; zero live SMS attempts |
| Final database check after cleanup | All six outreach tables have zero rows; zero fixture users; original absent outreach configuration restored |

The migration was applied only to TLS-protected `qr_attendance_qa` using its scoped application user and explicit target guard. No production migration, deployment or account mutation occurred.

## Browser evidence

All accounts and attendance records below were synthetic and have been removed.

| Role / path | Observed result |
|---|---|
| Admin | Configuration available; live option disabled; invalid reminder day rejected with exact error; valid configuration saved; attendance excusal reopened finalization and cancelled a case; clearing/refinalizing restored the same episode |
| Registration | Activity rules/history/consent available, Configuration absent; reminder policy saved; internal process returned zero records with SMS mode disabled |
| Cell Leader | Only Cell case visible; note required; own case review saved |
| Group Leader | Group membership included both applicable cases; another worker's case was read-only |
| Unified Leader | Combined case detail read-only; Cell selection showed one case, Group selection two |
| Pastor | Global care view without processing/configuration/consent controls; assigned a case to self and resolved it with a note |
| Member | In-app activity reminder and care notification visible; invalid number rejected; valid number saved with SMS off; staff route redirected to portal |
| Finance | No outreach navigation; direct staff route redirected to dashboard |
| Repeated evaluation | After Pastor resolution: zero new cases, zero open cases, two resolved cases |
| Responsive | 390 × 844 viewport: no document horizontal overflow; tables scroll within cards; dialog remains within viewport. Override reset afterward |

Saved screenshot evidence is in the local temporary folder: `mcc-outreach-result-20261020.jpg` and `mcc-outreach-mobile-20261020.jpg`. These screenshots document synthetic QA, not production.

## Repairs found during QA

1. Nested API errors were initially replaced with a generic message. Both new screens now use the shared error helper; specific validation was retested through the browser.
2. Background attendance evaluation can finish after the first page read. Every authorized role now has a read-only Refresh view action; evaluation is not added to the critical scan transaction.
3. A malformed multibyte scheduler token could cause a timing-safe comparison length exception. Comparison now checks byte lengths first; denial is covered by a regression test.
4. Aborted case/preference loads no longer apply stale responses after a view change.

## Deliberately unverified or pending

- Real SMS, provider authentication/credits, delivery receipts and phone inbox receipt: deferred at the user's request. The Mocean transport is implemented but not provider-certified. No free or unlimited carrier allowance is assumed.
- SMS simulation dispatch and CSV download were subsequently verified through the browser; see the additional visual QA pass below.
- Ministry-specific UI, revoked assignments and every device/browser combination were not separately certified in this browser pass. Existing scope services and API authorization were reused and reviewed; automated role checks passed.
- No claim of exhaustive testing of every existing page is made.
- Production deployment, external scheduling on a sleeping host, durable Supabase upload verification and complete production regression remain outside this local completion. Earlier production storage uncertainty is not resolved by local build success.

For setup, operational controls and later authorized SMS validation, see `OUTREACH_OPERATIONS.md`.

## Additional visual QA pass — 20 October 2026

The user requested notification triggering and design consistency checks without consuming messaging credits. A fresh synthetic fixture was used in `qr_attendance_qa`. The API ran with live SMS, email delivery and automatic scheduling disabled; uploads used local disk. No paid service or provider account was activated.

### Browser checks completed

- Admin selected **Simulation** through Configuration, evaluated work and processed six records: three in-app notifications and three simulated SMS. History showed distinct modes and statuses. CSV download succeeded and contained the expected six scoped records.
- The Cell Leader's new assignment notification opened the correct scoped care dialog through its deep link.
- The Member received an activity reminder and care follow-up. Mark read updated the badge; Open navigated to Events; Dismiss removed one notice; Clear all showed the empty state. Escape closed the panel and returned keyboard focus to the bell.
- Desktop, 390 × 844 and 320 × 740 layouts were inspected. After repair, mobile notification bounds were within the viewport (390: left 7/right 373; 320: left 7/right 303). No document overflow was observed in those settled views.
- Member preferences were checked in light/dark themes, and an opt-out saved successfully in dark mode. Theme and viewport overrides were restored afterward.
- Weekly reports used 18–20 October; monthly 1–20 October; annual 1 January–20 October. Desktop and mobile filters/cards stayed within the existing workspace layout.
- A synthetic local archive upload was archived and restored through the UI. The dialog described retained files/history, and the record returned to Active. Its upload fields now expose accessible names.
- An existing church image was uploaded to the synthetic Event. Admin card, Member card and desktop/mobile detail views rendered it without a new layout or palette.
- Selecting an expense category displayed its account under **Charged to**, with no account selector in the expense dialog. A synthetic PHP 1 record saved with that derived account; the mobile edit dialog fit the viewport. No money was transferred.

### Visual repairs

1. **Off-screen mobile notification menu:** changed the Member menu to a viewport-contained fixed panel, positioned below its bell, with bounded height and wrapped text.
2. **Dark theme mismatch:** the preferences card now follows Member portal surface/text/border colors; notification action links use readable theme colors.
3. **Keyboard behavior:** notification Escape/focus return and workspace tab arrow/Home/End navigation added.
4. **Ambiguous delivery wording:** history now distinguishes provider-accepted SMS from in-app availability; channel/type labels use ordinary display names.
5. **Archive form accessibility:** connected upload labels to their corresponding fields without changing form data or service logic.
6. **Transient image-preview warning:** the Event editor now waits for its object URL before rendering the preview image, avoiding an empty image source during file selection. This final guard passed the build; the upload/display browser flow had already passed before the guard.

### Final evidence

- All 52 frontend test files passed: **177 tests**. Build and whitespace check passed. Backend logic was not changed in this visual pass; the earlier 363-test backend result remains the baseline.
- After the final image-preview guard, the focused frontend rerun passed **18 tests** and the build passed again.
- Before cleanup: **0 live SMS attempts**, **3 simulated SMS**, **3 in-app sent**, **0 simulated records with sent/delivered/provider-ID receipts**.
- Cleanup restored absent outreach settings and removed the fixture users, all six outreach-table datasets, archive, expense setup/record, Event and local uploaded files. Production was not changed.
- Screenshots in the local temporary folder: `mcc-member-notifications-mobile-fixed.jpg`, `mcc-notifications-dark-fixed.jpg`, `mcc-notification-preferences-dark.jpg`, `mcc-event-photo-member-qa.jpg`.

The revised flows visually follow the current logo, navy/blue palette, card borders, spacing and control style. This is a targeted local UI/regression pass; it does not certify every existing module, device, role permutation, production storage or actual carrier delivery.
