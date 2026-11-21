# Admin Analytics Report — Design

Date: 2026-11-21
Status: proposed (awaiting approval)
Scope: `cms-frontend` admin Analytics page (`/reports/analytics`), its CSV export, and its print output.

## Intent

The admin Analytics page currently renders raw-looking blocks: four identical metric
cards, four horizontal bar lists, three column-chart trends, and a header that uses the
round app icon. It reads as a database dump rather than a report a church administrator
would hand to a pastor or paste into a thesis appendix.

The change makes it read as one document: your name banner and logo at the top, the
numbers themselves given prominence, trends drawn as real lines, demographics as donuts,
and a print/CSV output detailed enough to stand on its own.

Who it serves: System Admin, Pastor, Registration Team and Finance Team, viewing on a
laptop and printing to A4.

## Goals

- Replace div-percentage bars with hand-drawn SVG: line trends for member growth,
  attendance and finance; donuts for gender and age; ranked bars for cell and ministry groups.
- Give every chart a number indicator rail: the totals it is drawn from, at its left.
- Brand the page and its print output with the supplied lockup (`MCC Blue.png`) instead of
  the round app icon.
- Make print a real report: header, KPI strip, charts, detailed tables, notes, no chrome.
- Make the CSV more detailed without breaking its five-column Excel contract.
- Keep the existing palette exactly; remove decorative tells; keep the page calm and scannable.

## Non-goals

- No backend change. `/reports/analytics` already returns every number required.
- No change to Dashboard, Finance statement, Attendance, or public pages.
- No chart library, no PDF library, no animation framework.
- No dark mode, no theming system, no new fonts.
- No "vs. previous period" deltas: that needs data the API does not return.

## Anti-goals (a result that technically works but fails the brief)

- A grid of equal rounded cards, one shadow, one radius, everywhere.
- Four pies crammed side by side; a legend that repeats the label at each slice.
- Gradient washes, glow, glassmorphism, emoji icons, animated counters.
- All-caps eyebrow labels above every section (the brand's own small caps excepted).
- Data colours outside the blue ramp, or a red/green pair that reads as traffic lights.
- Horizontal scrolling at 1280px, or dead vertical space under short cards.

## Constraints

- Palette is fixed, from `styles/workspace.css` and `styles/roleWorkspaces.css`:
  `--mcc-brand #005599`, admin brand `#003d70`, `--mcc-cyan #13b5ea`,
  `--mcc-canvas #f5f7fa`, `--mcc-surface #fff`, `--mcc-border #e2e8f0`,
  `--mcc-ink #0f172a`, `--mcc-secondary #52647a`.
- Roles are scoped in `getAnalyticsReportScope`: Finance Team sees finance only;
  Registration Team sees members/attendance only; System Admin and Pastor see all.
  Every layout must stay correct with entire sections absent.
- CSV must remain a rectangular five-column sheet (`Section, Measure / period, Value, Unit, Notes`)
  with a UTF-8 BOM, CRLF endings, and formula-injection escaping from `utils/csv.js`.
- Print is A4 landscape, 12mm margins, vectors only, colours forced on.
- Existing exports `formatReportBucket`, `getReportPeriodRange`, `getAnalyticsReportScope`,
  `buildAnalyticsCsvRows` are shared with `TeamAttendanceReportPage` and tests; signatures must not change.

## Approaches considered

**A. Hand-drawn SVG + CSS grid (chosen).** A small `charts/` module and a rewritten page.
Exact palette control, crisp vector print, no dependency, deterministic in jsdom. Cost: we
write scale, tick and arc math and screen-reader alternatives.

**B. Recharts.** Faster for tooltips, but pulls a dependency into a thesis repo, imposes a
generic visual language we would then fight, and prints as rasterised canvas in some setups.

**C. Hybrid (CSS for numbers, Recharts for lines).** Rejected: two rendering systems, two
visual languages, and the numbers would not align with the plotted geometry.

## Decisions already made

- **Demographics:** gender and age bands as donuts (3–5 slices each, legend with count and
  share); cell groups and ministry groups as ranked horizontal bars, since those carry up to
  20 categories and would be illegible as pies. Group lists keep the server's `Other (n …)`
  aggregate as the final row.
- **Charts are SVG built in-repo**, no dependency.
- **Number rail sits left of each chart** on wide screens; it stacks above the chart below 900px.
- **Brand lockup** replaces the round icon in the page header and the print header. The
  round icon remains the app icon and finance-statement logo; untouched.
- **Exact brand assets:** `MCC Blue.png` (1392×179 px, 7.78:1, 167 KB) and `MCC White.png`
  (144 KB) from the shared Drive folder `1oLtoBFxd2Wq2Q30Sicj6Bwk4CC_LvrnI`, saved as
  `public/brand/mcc-lockup.png` and `public/brand/mcc-lockup-white.png`. It is a horizontal
  lockup — mark at left, two-line wordmark at right — used as a header band, not a square
  logo. It prints at 78mm wide (44mm made the wordmark unreadable), roughly 450 dpi, and
  charts are vector SVG; the lockup is the only raster on the sheet. The white variant is
  for dark surfaces only and never appears in the white print sheet.
- **Attendance "average" means average per reporting interval**, not per service: the API
  returns day-bucketed check-in totals and no count of services held. Labels say
  "Average per interval" everywhere, and headline figures read as check-ins, never as
  "services held". This keeps the no-backend-change constraint intact.
- **Print has one static closing footer**, no page numbers: per-page numbering needs `@page`
  margin boxes (uneven browser support) or a measurement pass over variable-height charts.
  The print dialog's own headers and footers are outside CSS control, so the page carries a
  one-line instruction to switch them off when a clean sheet is needed.

## Visual system

Colour (existing values only; series are tints of the brand ramp):

| Role | Value |
| --- | --- |
| Primary series | `#005599` |
| Secondary series | `#13b5ea` |
| Series tint 3 | `#5c9dc4` |
| Series tint 4 | `#9dc0d8` |
| Series tint 5 | `#cfe0ea` |
| Ink / secondary text | `#0f172a` / `#52647a` |
| Rules, tracks | `#e2e8f0` |
| Admin deep (headings, print banner band) | `#003d70` |

Type: keep Inter. One scale — 34px/650 stat number (tabular figures), 20px section
heading, 14px body, 12px label/legend, 11px footnote. No display face, no letterspaced
eyebrows except the report tag in print.

Structure: 12-column grid, 24px gutters. One border weight, one radius scale (10px cards,
6px controls), one shadow level at most on the page header only. Rules rather than boxes
where possible.

```
┌ lockup ──────────────────────────── period chips ── ┌ Print ┐ ┌ CSV ┐ ┐
├ 1,108 total │ 1,092 active │ 16 inactive │ +42 new ┤   rail
├──────────────────────────────────────┬─────────────────────────────┤
│ Member growth                        │ Gender                      │
│ 42 new this year          [line]     │ [donut] 58% Female          │
│                                      │         39% Male            │
├──────────────────────────────────────┼─────────────────────────────┤
│ Attendance                           │ Age                         │
│ 1,240 service check-ins    [line]    │ [donut] 18-29 · 30-49 …     │
│ 380 event check-ins                  │                             │
├──────────────────────────────────────┼─────────────────────────────┤
│ Finance                              │ Cell groups (ranked bars)   │
│ ₱… income / ₱… expenses   [line]     │ …                           │
└──────────────────────────────────────┴─────────────────────────────┘
```

## Component contracts

New, under `src/components/charts/`:

- `MetricRail.jsx` — `{ items: [{ label, value, hint? }] }`. Renders a vertical (wide) or
  horizontal (narrow) list of number + label + optional hint. Numbers use `tabular-nums`.
- `LineTrend.jsx` — `{ points: [{ label, value, value2? }], series: [{ key, label, color }], valueFormat, height }`.
  Draws a 0-based line with a 12% headroom, one area fill at 8% opacity, 3 y-ticks,
  thinned x-labels, and a hover/focus readout. Renders a visually hidden `<table>` of the
  same data for assistive tech. No animation beyond a 150ms stroke reveal, skipped under
  `prefers-reduced-motion`.
- `DonutBreakdown.jsx` — `{ rows: [{ label, total }], total, centerLabel, colors }`.
  Arcs drawn as stroked circles with `stroke-dasharray`, 2px gaps, legend rows carrying
  label, count and share (one decimal, rounded). Center shows the total and its noun.
  Falls back to a single muted ring when `total` is 0.
- `RankedBars.jsx` — `{ rows, max?, color }`. Thin track, 8px bar, value right-aligned,
  label truncated with a title attribute; bar length relative to the largest row, not the total.

Rewritten: `pages/reports/AnalyticsReportPage.jsx` (composition only, no chart math),
`pages/reports/analyticsReport.css` (screen + print).

Extended: `utils/reportBranding.js` gains `CHURCH_REPORT_BANNER` (`/brand/mcc-lockup.png`)
and `CHURCH_REPORT_BANNER_DARK`; `CHURCH_REPORT_LOGO` stays for existing consumers.

## CSV changes (still five columns)

Keep the header, BOM, CRLF, escaping, and the existing sections. Add detail as rows,
not columns:

- `Members`: one row per status share (`Share of roster`, value, `%`).
- `MEMBER DEMOGRAPHICS`: each row gains its share of the member total in `Notes`
  (e.g. `58.4% of 1,108 members`).
- New section `MEMBER MIX`: gender, age-band, cell-group and ministry-group shares,
  each sorted descending.
- `ATTENDANCE TREND`: keep per-bucket service/event/total; add `Average per interval`
  rows under a new `ATTENDANCE SUMMARY` section (check-ins divided by bucket count).
- `FINANCE TREND`: keep per-bucket income/expense/net. Add `FINANCE RATIOS`
  (expense ratio, net margin) so the three documented `Finance` rows stay byte-identical.

Derived values live in `analyticsReport.js` as pure functions so they can be unit-tested
without rendering.

## Print specification

A4 landscape, 12mm margins, white background, vectors.

1. Print header: lockup at 44mm wide, church name, "Consolidated Analytics", period,
   generated timestamp (Asia/Manila), and the report scope sentence.
2. KPI strip: four numbers in a row, separated by rules, no boxes.
3. Charts: two per row, each with its rail printed beside the plot; charts never split
   across a page (`break-inside: avoid`).
4. Tables: member demographics (label, count, share), attendance by bucket
   (services, events, total), finance by bucket (income, expenses, net), group aggregates.
5. One static closing footnote block: data scope, privacy note, "generated by PLWM-MCC CMS",
   and a line telling the reader to switch off browser headers/footers in the print dialog.
   No page numbers; nothing repeats per page.
6. Interactive chrome (filters, buttons, notices) hidden. Screen-only helper text hidden.

## Accessibility and HCI

- Every chart carries a visually hidden table equivalent; the visible legend is text, not an image.
- Contrast: ink on white 15.9:1, secondary on white 5.9:1, white on brand 7.3:1.
- Keyboard: period chips and filter inputs are native controls with a visible focus ring
  (`--mcc-cyan`, 3px). No keyboard trap, no hover-only information.
- Touch targets remain ≥44px per existing workspace rules.
- Empty and single-point series render an explicit sentence, never an empty box.
- Loading keeps the previous render dimmed rather than blanking the page.

## Blast radius

| Area | Effect | Action |
| --- | --- | --- |
| `pages/reports/AnalyticsReportPage.jsx` | rewritten | compose new components |
| `pages/reports/analyticsReport.css` | rewritten | screen + print, scoped to `.analytics-report` |
| `components/charts/*` | new | four components + tests |
| `utils/analyticsReport.js` | extended | new pure helpers; existing exports untouched |
| `utils/reportBranding.js` | extended | banner constants; `CHURCH_REPORT_LOGO` preserved |
| `utils/analyticsReport.test.js` | extended | CSV row expectations for new sections |
| `pages/reports/AnalyticsReportPage.test.jsx` | updated | new labels; role-scope assertions kept |
| `pages/reports/TeamAttendanceReportPage.jsx` | none | shares only `formatReportBucket`, `getReportPeriodRange` |
| `utils/financeStatement.js`, `FinanceStatementDialog.jsx` | none | use the church name and `/logo.jpg` directly |
| `routes/AppRoute.jsx`, `roleWorkspace.js`, `roleAccess.js`, Dashboard links | none | route and permissions unchanged |
| `design-review.jsx` | extended | analytics mock currently returns empty demographics; needs realistic numbers for visual QA |
| `public/brand/mcc-lockup.png`, `mcc-lockup-white.png` | new assets | copied from the Drive folder, ~167KB and ~144KB |
| `docs/*` QA records citing CSV row counts | historical | note that counts change; do not rewrite the record |
| Backend `analytics.service.js` | none | payload unchanged |

## What is left to the builder

- Exact SVG math (scales, tick placement, arc geometry) and component internals.
- Naming of internal CSS classes; they stay scoped to the report.
- Copy for empty states and hints.
- Whether the ranked-bar list shows 8 or 10 rows before scrolling on print.
- How aggressively to thin x-axis labels when the bucket count exceeds the width.
