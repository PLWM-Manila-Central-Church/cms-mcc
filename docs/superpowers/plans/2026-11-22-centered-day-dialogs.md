# Centered day dialogs for the member portal

Date: 2026-11-22
Status: proposed — awaiting approval
Supersedes the presentation part of the calendar and Bible-reading work; behaviour and data stay as built.

## The ask

Clicking a day in the **Calendar** or in **Bible reading** should open the full information in a
**centered dialog**, not the right-side drawer and not an inline panel underneath. The dialog
keeps everything we know about that day. For Bible reading that means the assigned passages
only — the plan stores references, not chapter text.

## Visual

Two mockups were rendered at 1280×860 (background intentionally blurred, as in the real dialog):

- Event day dialog: 560px card, "Selected day / Saturday, November 28, 2026", three event
  blocks (all-day and timed), each with time column, title, meta, description, registered
  badge and "View details".
- Bible day dialog: 520px card, "Selected day / Sunday, November 22, 2026", three passage
  tiles (Old Testament, New Testament, Psalms/Proverbs), the "References only" note and the
  read toggle.

Both sit on a blurred, dimmed layer (`rgba(4,20,38,.45)` + `blur(6px)`), 18px radius, and a
36px close button in the header.

## Interaction

| Surface | Trigger | Result |
| --- | --- | --- |
| Calendar | click a day cell | centered **day dialog** listing every event that day, complete info |
| Calendar | click an event chip | centered **event dialog** with full event details (image, date, time, location, registered count, parking, deadline, description, registration actions) |
| Calendar | "View details" inside the day dialog | replaces the day dialog with the event dialog (one dialog at a time) |
| Bible | click a day cell | centered **Bible day dialog**: date, OT/NT/Ps passages, read state, Mark as read / unread |
| Bible | close / Escape / backdrop | closes, returns focus to the day cell that opened it |

Inline panels to retire: the calendar's "Selected day" section under the grid, and the Bible
panel's selected-day block. Day cells keep the selected ring only while their dialog is open.

## Component plan

New `cms-frontend/src/components/portal/PortalDialog.jsx`

- props: `onClose`, `label`, `children`, `width` (560 default, 520 for Bible), `testId`.
- centered on every breakpoint (`place-items:center`, `padding: 16`); card `width:
  min(<width>px, 100%)`, `max-height: 86dvh`, body scrolls.
- blurred overlay, close on backdrop click and Escape, body scroll lock, focus moved to the
  close button on open and restored to the opener on close, `role="dialog"` +
  `aria-modal="true"` + `aria-label`.
- extracted so the portal's existing `Backdrop` (event/service sheets) and the Bible panel
  share one implementation.

Modified:

- `pages/members/MemberPortal.jsx` — `Backdrop` delegates to `PortalDialog` (centered instead
  of the right drawer); `EventModal` content unchanged; calendar day click opens a new
  `CalendarDayDialog` (defined in `PortalEventCalendar`), which lists the day's events and can
  hand off to the event dialog.
- `components/portal/PortalEventCalendar.jsx` — remove the inline day panel; add day dialog;
  chips keep opening the event dialog; `onEventClick` unchanged.
- `components/portal/BibleReadingPanel.jsx` — remove the inline selected-day block; open the
  Bible day dialog on cell click; toggle lives in the dialog.

## Tests

- `PortalEventCalendar.test.jsx`: day click opens a dialog with that day's events; dialog lists
  all events (not only the two chips); View details calls `onEventClick`; Escape closes and
  restores focus; empty day dialog says so.
- `BibleReadingPanel.test.jsx`: day click opens the dialog with date and three passages; toggle
  posts; unpublished day shows the note; future day has no toggle; Escape closes.
- `MemberPortal.test.jsx`: event dialog is centered by role/label (behavioural assertions stay
  the same); existing focus-return test keeps passing.

## Order

1. `PortalDialog` + tests (focus, Escape, backdrop).
2. Refactor `Backdrop` and `EventModal` onto it; visual check.
3. Calendar day dialog; retire inline panel.
4. Bible day dialog; retire inline panel.
5. Full suite, build, desktop + 390px screenshots.

## Open questions (recommended answer first)

1. **Mobile**: centered card at 92vw (matches "in the middle") rather than the current bottom
   sheet — recommended? (Bottom sheet is more native on phones, but the ask says middle.)
2. **Crowded days**: a day with 6+ events scrolls inside the dialog — acceptable, or should it
   collapse to 3 with "show all"?
3. **Bible chapters**: keep references only and state that chapter text is not stored, or add
   verse text to the plan data (needs a Bible text source; larger change)?
4. **Open registrations inside the day dialog**: navigate to the event dialog (recommended) or
   allow registering straight from the day list?
