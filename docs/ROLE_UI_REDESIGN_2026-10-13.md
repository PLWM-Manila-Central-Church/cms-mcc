# Local redesign of all role workspaces

## Analysis before implementation

The previous pass changed shared presentation but left most module interiors and dashboards intact. Existing DashboardPage has different data per role yet the same Primary Work / Watch List / Access Summary arrangement for almost everyone. Shared module pages use independent inline style objects, so shared CSS alone does not redesign them. The Member portal is a separate application surface. Unified Leader must distinguish cell-only, group-only and combined assignments without changing authorization.

## Role-specific design decisions

| Workspace | Main purpose | Navigation and visual hierarchy |
| --- | --- | --- |
| Administration | Records, access and oversight | Compact operations navigation; control-center dashboard; activity/review queues; dense, readable management tables |
| Pastoral oversight | Attendance insights, member care and approvals | Report-first navigation; broad insight panels and editorial hierarchy; clear read/review guidance |
| Registration desk | Intake and physical check-in | Session/scanning actions first; task-oriented command area; compact search and roster views; obvious scan/review separation |
| Finance office | Giving, expenses and reconciliation | Ledger-first navigation; numeric totals and aligned transaction rows; report/expense shortcuts |
| Ministry coordination | Ministry roster, schedules and requests | Ministry-first navigation; schedule/task emphasis; request and roster cards |
| Cell leadership | Assigned cell roster and attendance | Cell-first navigation; team identity visible; batch checklist; scoped records |
| Group leadership | Group roster and services | Member-roster-first navigation; roster and schedule split; scoped attendance shortcuts |
| Combined leadership | Choose a team, then record | Team chooser first; visible single-team versus combined read-only guidance; separate task areas |
| Member | Personal participation | Personal welcome/QR actions; own attendance and giving; event cards; approachable profile and settings |

Distinct workspaces share the original blue/cyan/navy palette and logo. Different purpose, order, layout, labels and action emphasis provide role distinction. Status colors continue to indicate business state rather than role identity.

## Implementation plan

1. Add a pure workspace configuration that resolves roles/Leader assignments, navigation order, page guidance and permitted shortcuts. Filter every shortcut through existing role-path and module-permission logic.
2. Integrate role identity into MainLayout, Sidebar and Header; add module-specific workspace context and workflow links.
3. Replace common dashboard arrangement with role-specific panel titles, task order and layouts. Retain live dashboard data and existing registration charts.
4. Migrate every authenticated page and supporting module component to role-scoped visual tokens: page title, surface, border, radius, form sizing, tables and action hierarchy. Keep local/business statuses intact. Add explicit page classes rather than relying only on the outer shell.
5. Redesign Member overview/actions and all its tabs/settings with its personal presentation. Apply matching auth/unauthorized presentation.
6. Provide a local design review of actual components using clearly labeled synthetic, in-memory data, disconnected from the API. This permits visual review of roles without bypassing actual password-change gates. It must not become an authenticated application route or ship in the production build.
7. Build and check role/navigation/component regressions. Inspect actual local review pages, keyboard states and page transitions using browser control. Record synthetic visual evidence separately from authenticated live/QA acceptance.

## Safety and acceptance

No database, login credentials, permissions, deployment services or production routes are to be changed. No deployment in this task. Preserve the dirty migration worktree; implement in the clean qr-attendance worktree. First-login credential changes and authenticated backend role acceptance remain separately pending.

Every existing authenticated page must be listed in the migration inventory. Each role must have a distinct workspace key and meaningful role-specific navigation/dashboard guidance. Shared modules must inherit that role's visual hierarchy while preserving their existing controls, API contracts and access restrictions. Public church pages retain their public-site purpose and are outside the authenticated-role redesign.
