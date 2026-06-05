# CMS — User Experience Flow Guide

> How each role navigates the system to get real work done.

---

## How to read this guide

Each section follows a **user persona** through their **daily workflow**. The format is:

```
[ACTION] → [NEXT SCREEN] → [DECISION]
```

---

## 1. Registration Team — Daily Operations

### 1.1 Morning: Check-in Service Attendance

```
LOGIN
  → Dashboard (/dashboard)
    → See metric cards: Today's Attendance, Total Members, Active Members, New Members
    → See Attendance Trends chart (vertical bars)
    → See Cell Group Alerts table (sorted by absences)

START CHECK-IN
  → Click any bar in Attendance Trends chart
    → Navigates to /services/:id/attendance
  → OR click "Attendance" in sidebar
    → Navigate to Attendance Overview (/attendance)
    → Click desired service → /services/:id/attendance

CHECK IN MEMBER
  → Search member by name in search box
  → Select member from results
  → Click "Check In"
  → System creates Attendance record + updates summary
  → Repeat for next member

HANDLE DUPLICATE
  → If member already checked in → system shows "Already checked in"
  → If member pre-registered → system upgrades pre-reg → manual

REMOVE CHECK-IN
  → Click delete icon on any checked-in row
  → Confirm deletion
```

### 1.2 Mid-day: Add New Member

```
SIDEBAR → Members (/members)
  → See member list with search/filters
  → Click "+ Add Member"
    → Member Form (/members/new)
    → Fill in: First Name, Last Name, Email, Phone, Birthdate, Status, Cell Group, etc.
    → Click "Save"
    → New member appears in list
    → Optionally: Create user account for them

FOLLOW-UP: Create User Account
  → Sidebar → Users (/users)
  → Click "+ Add User"
    → Select member from dropdown
    → Set email/password
    → Assign role
    → Click "Save"
    → User gets login credentials
```

### 1.3 Afternoon: Manage Events

```
SIDEBAR → Events (/events)
  → See upcoming events list

CREATE NEW EVENT
  → Click "Create Event" button
  → Fill in: title, date, location, category, capacity
  → Click "Save"
  → Event appears in list

VIEW REGISTRATIONS
  → Click any event card
    → Event Detail (/events/:id)
    → See registrations list
    → Cancel attendee if needed (click "Cancel")
    → Change event status (draft → published → completed)
```

---

## 2. Finance Team — Financial Management

### 2.1 Record New Giving

```
LOGIN → Dashboard
  → See: This month total, Records count
  → See Recent Finance Records list
  → Click "Open" → Finance page

FINANCE PAGE (/finance)
  → Income Records tab (default)
  → Click "+ Add Record"
    → Fill: Member (search), Amount, Category, Fund, Date, Payment Method
    → Click "Save"
    → Record appears in list with colored badge (Tithe, Offering, etc.)

SEARCH / FILTER
  → Type member name in search box
  → Select date range
  → Select category filter
  → Results update live
```

### 2.2 Manage Archives

```
SIDEBAR → Archives (/archives)
  → See archive records filtered to "Financial Records" category only
  → Category dropdown disabled with "Financial Records" selected

UPLOAD DOCUMENT
  → Click "+ Upload"
    → Form opens inline
    → Category auto-filled: "Financial Records"
    → Title, Description, Document Date, Visibility
    → Select file (.pdf, .docx, .xlsx, .jpg, etc.)
    → Click "Upload Record"
    → New record appears as "Pending"

DOWNLOAD DOCUMENT
  → Click any record → detail panel opens
  → Click "Download File"
    → System fetches via authenticated API
    → Browser downloads file with original extension
  → For version history: click "Download" on any version
```

---

## 3. System Admin — Oversight & Configuration

### 3.1 Manage Users

```
LOGIN → Dashboard
  → See: Active users, Members, Pending archives, Low stock
  → Click "User management" → /users

USERS PAGE
  → See all users with their roles
  → Click user to edit
    → Change role, email, or deactivate account

ADD NEW USER
  → Click "+ Add User"
    → Select existing member (or leave blank for external)
    → Set email + password
    → Select role (dropdown of all 7 roles)
    → Toggle "Force password change on login"
    → Click "Save"
    → New user receives credentials

DEACTIVATE USER
  → Click deactivate toggle on any user
  → User can no longer log in
  → Reactivate same way
```

### 3.2 Review Audit Logs

```
SIDEBAR → Audit Logs (/audit-logs)
  → See all system activity (paginated)

FILTER
  → By Action: "CHECK_IN", "CREATE_MEMBER", "UPLOAD_ARCHIVE", etc.
  → By Table: "attendances", "members", "finance_records", etc.
  → By User: search email
  → By Date: pick date range

INSPECT
  → Click any log row
    → Expands to show full details
    → Shows: who did what, when, which record ID
```

### 3.3 Configure Settings

```
SIDEBAR → Settings (/settings)
  → See grouped settings

EDIT
  → Click any setting value to edit inline
  → Changes save automatically
  → Categories: General, Finance, Members, Services, Events, Notifications
```

---

## 4. Cell Group Leader — Group Management

### 4.1 View & Manage Cell Group

```
LOGIN → Dashboard
  → See: # of cell group members, attendance tasks, upcoming events

SIDEBAR → Cell Groups (/cell-groups)
  → See own cell group only

VIEW MEMBERS
  → Click group card → see member list
  → Each member shows: name, status, contact

ASSIGN / UNASSIGN MEMBERS
  → Click "Assign Member"
    → Search by name
    → Select member → assign to group
  → Click "Unassign" on any member
    → Removes from scope
```

### 4.2 Record Attendance for Cell Group

```
SIDEBAR → Attendance (/attendance)
  → See attendance overview
  → Click desired service
    → /services/:id/attendance
    → Pre-filtered to own cell group members only

CHECK IN
  → Search member → click "Check In"
  → Or scan barcode
  → Repeat for each member

REMOVE ATTENDANCE
  → Click delete icon on any row
  → Confirm
```

---

## 5. Ministry Leader — Ministry Operations

### 5.1 Manage Ministry Roster

```
LOGIN → Dashboard
  → See: Ministry members, pending invites, upcoming events

SIDEBAR → Ministry (/ministry)
  → See assignments tab (scoped to own ministry)
  → List of all ministry members

ADD MEMBER
  → Click "Add Member" → search dialog
  → Type name → select member
  → Member added to ministry roster

REMOVE MEMBER
  → Click "Remove" on any member
  → Confirm
```

### 5.2 Send Event Invites

```
SIDEBAR → Events (/events)
  → Find event → click to open

EVENT DETAIL
  → See "Invite Ministry Members" panel
  → Select members to invite
  → Click "Send Invites"
  → Invited members receive notification

VIEW RESPONSES
  → See invite status: Accepted, Declined, Pending
  → Track attendance per event
  → Cancel invites if needed
```

---

## 6. Pastor — Oversight & Approval

### 6.1 Review and Approve Archives

```
LOGIN → Dashboard
  → See: Pending archives count
  → Click "Archives" → /archives

FILTER PENDING
  → Set status filter to "Pending"
  → See all documents awaiting approval

APPROVE DOCUMENT
  → Click document → detail panel opens
  → Review: title, category, file, description
  → Click "Approve"
  → Status changes to "Approved"
  → Document becomes visible to relevant roles

VIEW CONFIDENTIAL
  → Toggle visibility filter → "Confidential"
  → Only Pastor and Admin can see these
  → Same approval workflow
```

### 6.2 Read-Only Monitoring

```
DASHBOARD: See all key metrics without editing
MEMBERS: Browse member directory, click profiles to view
FINANCE: View all records, summaries, categories (no edit)
EVENTS: View all events and registrations
AUDIT LOGS: Review all system activity
```

---

## 7. Group Leader — Group Operations

### 7.1 Manage Group Members

```
LOGIN → Dashboard
  → See: Group members, eligible candidates

SIDEBAR → Members (/members)
  → See own group members only (scoped)
  → Search/filter within scope
  → Click member → view profile

ASSIGN ELIGIBLE CANDIDATES
  → See Eligible Candidates counter on dashboard
  → Navigate to members → scoped view
  → Assign unassigned members to group
```

### 7.2 Attendance for Group

```
SIDEBAR → Attendance (/attendance)
  → Same check-in flow as Cell Group Leader
  → Pre-filtered to own group members

FOLLOW-UP
  → See which group members attended/didn't
  → Track attendance trends
```

---

## 8. Member — Self-Service Portal

### 8.1 View Profile & Activity

```
LOGIN → Portal (/portal)
  → See: Own profile summary
  → Attendance history (list of past services + check-in method)
  → Financial giving records (own contributions)

EDIT PROFILE
  → Click "Settings" gear icon
    → Update: name, email, phone, address, birthdate
    → Upload profile photo
    → Change password
```

### 8.2 Register for Events

```
PORTAL → Events section
  → See upcoming events
  → Click "Register" on any event
    → Registration confirmed
    → Event appears in "My Events"

CANCEL
  → Click "Cancel Registration" on any registered event
  → Confirm
  → Registration removed
```

### 8.3 Pre-register for Service

```
PORTAL → Services section
  → See upcoming services
  → Click "Pre-register"
  → Select: Attending, Not Attending, Undecided
  → Optional: seat number, parking slot
  → Submit response

CHANGE RESPONSE
  → Click same service
  → Update response
  → Previous response replaced
```

---

## 9. Cross-Cutting User Journeys

### 9.1 Invite New Member Flow

```
[Registration Team]
1. Sidebar → Members → "+ Add Member" → fill form → save
2. Sidebar → Users → "+ Add User" → select member → set role → save
3. [Optional] Sidebar → Cell Groups → assign member to cell group
4. [Optional] Sidebar → Ministry → add member to ministry roster

[Member receives email]
5. Member clicks link → /reset-password → sets password
6. Member logs in → forced to change password → portal
```

### 9.2 Event Lifecycle Flow

```
[Registration Team or Cell Group Leader]
1. Sidebar → Events → "+ Create Event" → set title, date, capacity
2. Event starts as "Draft"

[Ministry Leader (optional)]
3. Open event → "Invite Ministry Members" → select members → send
4. Invited members receive notification
5. Members respond: Accept/Decline

[Registration Team]
6. Open event → view registrations
7. Change event status: Draft → Published → Completed

[Anyone with access]
8. View event → see registered attendees

[Registration Team or Admin]
9. Cancel individual registration if needed
10. Delete event if cancelled
```

### 9.3 Inventory Request → Approval Flow

```
[Any leader: Ministry Leader, Cell Group Leader, Group Leader]
1. Sidebar → Inventory → Requests tab → "My Requests"
2. Click "New Request" → select items, quantity, purpose
3. Submit → status: "Pending"

[Admin or Registration Team]
4. Sidebar → Inventory → Requests tab → "All Requests"
5. See pending requests
6. Click "Review" → approve or reject with note

[Requestor]
7. Check "My Requests" → see status update
8. If approved → items available for use
9. If rejected → see reviewer note, resubmit if needed
```

### 9.4 Attendance Data Pipeline

```
1. Service created by Registration Team
2. Service published → visible to members
3. Members pre-register via portal (optional)
4. Service date arrives

[Registration Team / Cell Group Leader]
5. Open service attendance page
6. Search members → check in (manual/barcode)
7. System creates Attendance record
8. System updates ServiceAttendanceSummary

[Dashboard]
9. Registration Team sees Attendance Trends chart updated
10. Cell Group Alerts panel shows absences

[Member Portal]
11. Member sees their attendance history updated
```

---

## 10. Error & Edge Case Flows

### 10.1 Login Fails

```
USER ENTERS WRONG PASSWORD
  → Error message: "Invalid credentials"
  → User can try again (rate limited after 10 attempts)

USER FORGOT PASSWORD
  → Click "Forgot Password"
  → Enter email
  → Receive reset link
  → Click link → set new password
  → Login with new password

ACCOUNT DEACTIVATED
  → Login attempt fails
  → No specific message for security
  → Contact admin
```

### 10.2 Permission Denied

```
USER CLICKS BUTTON WITHOUT PERMISSION
  → Backend returns 403
  → Frontend hides the button
  → Button simply doesn't appear

USER NAVIGATES TO RESTRICTED URL
  → ProtectedRoute checks permissions
  → If denied → redirects to dashboard
  → No explanation shown
```

### 10.3 File Upload Fails

```
WRONG FILE TYPE
  → Frontend: accept attribute limits to .pdf,.docx,.xlsx,.jpg,.jpeg,.png,.mp4,.mp3
  → Backend: extension filter rejects
  → Backend: magic-byte check verifies true type
  → Error: "Invalid file type"

FILE TOO LARGE
  → Max: 25MB (configurable via env)
  → Multer rejects before save
  → Error: "File too large"

UPLOAD INTERRUPTED
  → No partial file saved
  → User retries upload
```

---

## 11. Navigation Map

### Desktop Sidebar Hierarchy

```
Dashboard        /dashboard
Members          /members
  ├─ Add        /members/new
  └─ Profile    /members/:id
Cell Groups      /cell-groups
Ministry         /ministry
Users            /users
  ├─ Add        /users/new
  └─ Edit       /users/:id/edit
Attendance       /attendance
  └─ Service    /services/:id/attendance
Services         /services
Finance          /finance
  └─ My Giving  /finance/my-giving
Events           /events
  └─ Detail     /events/:id
Inventory        /inventory
  ├─ Items
  └─ Requests
Archives         /archives
Audit Logs       /audit-logs
Settings         /settings
My Settings      /my-settings
```

### Member Portal Tabs

```
Portal Home      /portal
  ├─ Profile
  ├─ Attendance
  ├─ Giving
  ├─ Events
  ├─ Services
  └─ Ministry
Portal Settings  /portal/settings
```

---

## 12. Quick Reference: Action → Role Matrix

| I want to... | Admin | Pastor | Reg Team | Finance | Ministry | CG Leader | Group Leader | Member |
|---|---|---|---|---|---|---|---|---|
| Add a member | ✅ | — | ✅ | — | — | — | — | — |
| Check in attendance | ✅ | — | ✅ | — | — | ✅ | ✅ | — |
| Create an event | ✅ | — | ✅ | — | — | ✅ | ✅ | ✅ |
| Upload an archive | ✅ | — | ✅ | ✅ (finance) | — | — | — | — |
| Approve an archive | ✅ | ✅ | ✅ | — | — | — | — | — |
| Add a finance record | ✅ | — | — | ✅ | — | — | — | — |
| Create a user | ✅ | — | ✅ | — | — | — | — | — |
| Manage settings | ✅ | read | read | — | — | — | — | — |
| Assign to ministry | ✅ | — | ✅ | — | ✅ | — | — | — |
| Submit inventory request | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Approve inventory request | ✅ | — | ✅ | — | — | — | — | — |
| Invite to event | ✅ | — | ✅ | — | ✅ | — | — | — |
| Pre-register for service | — | — | — | — | — | — | — | ✅ |
| Register for event | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Download archive file | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| View audit logs | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
