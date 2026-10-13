# MCC UI and HCI redesign

## Objective and boundaries

Retain the PLWM-MCC logo, blue (#005599), cyan (#13B5EA), church identity, routes, permissions, session handling and attendance semantics. Improve hierarchy, navigation, readability, feedback, keyboard access and responsive behavior. Work locally first; production approval and release evidence belong to a later release gate. No database migrations are needed for the design foundation.

The first visualization is `cms-frontend/ui-preview.html`. This interactive concept uses sample content, a role selector, search and action feedback. It is a design exploration, not evidence of authenticated features or permission coverage. It precedes implementation planning.

## Evidence collected

The authoritative clean checkout is the qr-attendance worktree at main b68f62f. The chat's other worktree contains substantial pre-existing changes; these must be preserved.

Live browser: the first tab rejected control with a browser-session ownership error. A fresh tab restored control. Admin authenticated successfully: dashboard and module entry screens were opened, with Finance clipping observed in a screenshot. The dashboard reports 66 accounts and 230 Members. The preserved lesterius Member authenticated successfully: Overview, Events, Attendance, Tithes and Ministries were opened. This is entry-screen and selected interaction coverage, not every control. Earlier account-refresh evidence confirms six staff credentials reached mandatory password change; their authenticated module UIs still require user-completed credential changes.

Source findings:

| Finding | Evidence | Repair/verification |
| --- | --- | --- |
| Attendance and QR can both appear active on mobile | BottomTabBar uses pathname.startsWith for both nested paths | Select the longest matching visible path; verify single active item on nested routes |
| Desktop sidebar also highlights ancestor and child | NavLink defaults to prefix matching | Use the same longest-path rule with explicit active/current state |
| Header language says EN twice | Two code labels rendered in Header | One code, full language name on wider screens |
| Header popovers lack expanded/controls state and Escape behavior | Header trigger and effect source | Add relationships, mutually exclusive opening and Escape-to-trigger focus |
| Notification row click is inaccessible to keyboard | Clickable div wraps dismiss button | Separate native open and dismiss buttons; keep message and timestamp semantics |
| Nested main landmark on leader teams | MainLayout main contains LeaderTeamsPage main | Use a section for the inner page |
| Global mobile main rule applies to every nested main | index.css generic main selector with !important | Scope safe-area padding to the staff content landmark |
| Forced password labels are not associated with inputs | Labels lack htmlFor and fields lack IDs | Add IDs, autocomplete, minLength, busy state and error announcement; keep submit API/redirect unchanged |
| Mobile More drawer has no modal/focus handling | MainLayout raw fixed div sheet | Add dialog semantics, focus containment/restoration and Escape/close control |
| BottomSheet can lock desktop scrolling while rendering nothing | Open lifecycle runs before desktop null return | Guard by rendering state and clean up timers/body overflow on unmount |
| Styling is scattered across inline objects and CSS | Shared shell, portal, lists, finance and QR source | Introduce scoped tokens; incrementally replace visual objects without blanket !important overrides |
| Finance summary card clipped in normal desktop view | Live Finance screenshot and fixed four-column grid | Adaptive columns, zero minimum card width and wrapping amounts; source repair implemented locally |
| Member Event Details has an unnamed close button and no dialog semantics | Live DOM and screenshot after View Details | Shared Service/Event panel gets named close controls, modal semantics, Escape, trapped focus and restoration; local repair, hosted recheck pending |
| Member portal has separate presentation and preferences | MemberPortal makeC, sticky header/tabs and settings | Preserve dark theme and user font preferences; verify each tab and dialog separately |

These are source findings until exercised in a browser. Do not label suspected overlap as reproduced without a screenshot and dimensions.

## Role and module coverage plan

| Role/account | Required screens and critical paths |
| --- | --- |
| Original Admin | Dashboard; Members list/profile/create/edit; Cell Groups; Ministry; Users; Services/attendance; Events/detail; Finance/expenses; Inventory; Archives; Audit; Settings; notifications |
| lesterius Member | Overview/profile editing; member QR; Events registration/reservation/cancel; Service RSVP; personal Attendance; giving; ministry applications/substitutes; portal settings; notifications |
| Pastor | Role dashboard; accessible member and attendance reports; service/event views; analytics; export/filter states; write actions remain permission-controlled |
| Registration | Members/services/events and direct check-in; scanner live/upload/manual fallback; batch approval; duplicate/rejected/error/empty/loading responses |
| Ministry Leader | Ministry roster, applications/substitutes, scheduling, scoped attendance, events, inventory requests and archives |
| Cell-only Leader | My Teams; selected cell scope; roster; attendance drafts and batch submission; events; permitted inventory/archive paths |
| Group-only Leader | My Teams; selected group scope; members; attendance and service/event tasks |
| Combined Leader | Scope switch, single-team writes, combined read-only state, preserved scope during navigation |
| Finance | Source audit now; authenticated verification pending because new Finance creation was explicitly deferred. Use a preserved authorized demo only if its credential is available; do not invent an account |

The navigation map is based on roleAccess, route permissions and module source. Actual visibility and successful API results must be recorded per role in the browser.

## Implementation sequence

1. **Visualize:** create responsive role-switchable concept with existing assets. Record screenshots at verified actual viewport sizes, mark all example data.
2. **Foundation:** shared neutral canvas, white surfaces, restrained borders/shadows, consistent 8px spacing rhythm, 44px targets, visible focus, reduced-motion support and readable secondary text. Scope presentation to staff/portal/auth so public-site design does not change accidentally.
3. **Staff shell:** refine sidebar and header; one active navigation item; skip link; accessible More dialog; notification keyboard actions and error feedback. Keep API requests, authorization and team scope contracts.
4. **Authentication presentation:** logo, readable form hierarchy, labels, error announcement and password-manager autocomplete. Preserve mandatory-change logic. User must perform credential changes through browser handoff; do not bypass them in code, API or database.
5. **Member portal:** apply the same hierarchy while respecting dark/theme/font preferences. Replace clickable profile div with a native button; improve tab selection state and announcement; visually verify all modals and mobile sticky positions.
6. **Modules:** standardize list headers/filter bars, forms, cards, tables, badges and dialog action hierarchy. Migrate one module at a time: Users/Members → Services/Events → Attendance/QR/Teams → Ministry → Finance → Inventory/Archives/Audit/Settings. Preserve destructive confirmations and partial-failure messages. Do not conceal long data to make screenshots attractive.
7. **Interaction repair:** for every observed wrong response, write reproduction steps, expected behavior, root cause, repair plan and regression result before moving on. Distinguish visual repair from business-logic repair.
8. **Verification:** component tests and production build; then browser flows with existing authorized data or isolated QA. Verify keyboard navigation, search no-results, sort/filter reset, dropdown Escape/outside click, modal focus/scroll, saving/error/loading states, refresh/session persistence and scope restrictions. No destructive production fixtures without specific authorization.
9. **Release:** review diff and evidence; deploy only after browser acceptance; compare production exact commit, then repeat representative per-role flows. Do not count local styles as deployed.

## Acceptance checklist

- Check actual CSS viewport 390x844, 768x1024, 1280x800 and 1440x900; also 200% zoom. An override request alone is insufficient: record window.innerWidth/innerHeight from the rendered DOM.
- No viewport overflow, clipped controls, hidden errors, sticky-header overlaps, bottom-navigation occlusion or dialog offscreen actions.
- Keyboard focus visible; icon actions named; one current navigation item; modal focus contained/restored; Escape closes non-destructive overlays.
- Status combines text and color. Labels remain visible when populated. Error messages describe the next step. Primary action unique per action group; dangerous actions visually distinct.
- Loading, disabled, empty, success and error states reviewed. Double submissions prevented without trapping the user after failures.
- Member data stays self-scoped, Leader writes stay one-team-scoped, combined view stays read-only. Design must not expand access.
- Browser screenshots and interaction results accompany the final report, with untested and blocked rows explicit.

## Current execution status

Concept created and exercised in the browser: role switching and search no-results respond correctly. A viewport request of 390x844 was not applied by the browser (actual DOM width remained 1310), so mobile visual acceptance is NOT confirmed; the override was reset.

Shared shell, auth presentation, Member portal accessibility/sticky stack, Finance adaptive summary and Leader landmark repairs are implemented locally. First full frontend run passed 40 files/132 tests. Production build passed. Additional Header/Sidebar/BottomSheet regression tests were then added; final results are recorded in the results document.

Local frontend runs at 127.0.0.1:3000, API at port 5001 against qr_attendance_qa. The 3006 origin was rejected by the API origin guard; using the existing allowed 3000 origin avoided changing security configuration. Production Admin credentials did not authenticate against isolated QA; no password reset, database seed or account mutation was performed to force local access.

Six staff credential changes and authenticated staff-module visual acceptance remain pending. Finance account creation remains pending by user instruction. Full per-module redesign and browser acceptance remain incomplete. No production redesign release has occurred.
