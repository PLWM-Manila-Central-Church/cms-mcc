# Admin Analytics Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin Analytics page as one branded, consistently structured report: SVG line trends, donut demographics, ranked group lists, a number rail beside every chart, a detailed branded print sheet, and a richer five-column CSV.

**Architecture:** A new dependency-free `components/charts/` module supplies four presentational SVG primitives. One `ReportSection` wrapper gives every block identical chrome, so the page is composed rather than hand-styled. `AnalyticsReportPage.jsx` becomes composition + data wiring only. CSV detail is added as pure helpers in `utils/analyticsReport.js`, appended as new sections so existing documented rows stay byte-identical. All styling lives in one scoped stylesheet with screen and print halves.

**Tech Stack:** React 19, Vite 8, plain CSS, hand-written SVG, Vitest + Testing Library, Playwright for visual/print QA.

**Spec:** `docs/superpowers/specs/2026-11-21-admin-analytics-report-design.md`

## Global Constraints

- Palette only, from `styles/workspace.css`: `#005599`, `#003d70`, `#13b5ea`, `#f5f7fa`, `#ffffff`, `#e2e8f0`, `#0f172a`, `#52647a`. Series tints allowed: `#5c9dc4`, `#9dc0d8`, `#cfe0ea`. No other hues.
- No new npm dependencies. No chart, PDF, or animation library.
- CSV stays five columns, UTF-8 BOM, CRLF, escaped through `utils/csv.js`.
- Print is A4 landscape, 12mm margins. Charts are vector SVG; the only raster is the brand
  lockup (1392 px wide, ≈800 dpi at the 44 mm print width). Colours forced with
  `print-color-adjust: exact`.
- Role scoping from `getAnalyticsReportScope` is authoritative: Finance Team has no member/attendance sections; Registration Team has no finance section.
- Existing exports `formatReportBucket`, `getReportPeriodRange`, `getAnalyticsReportScope`, `buildAnalyticsCsvRows` keep their signatures (`TeamAttendanceReportPage` depends on two of them).
- Interactive targets ≥44px; focus ring `3px solid #13b5ea`; `prefers-reduced-motion` respected.
- One spacing scale: `20px` grid gap, `10px` radius, `1px solid #e2e8f0` rules, at most one shadow on the page header.
- Every section is `<ReportSection>`; every chart section pairs with `<MetricRail>`. No bespoke card markup anywhere.

## Review Focus

1. **Finance-only role:** Finance Team must see a complete, non-hollow page with no member/attendance placeholders or empty grid tracks. Pinned in Task 8 tests.
2. **Degenerate series:** zero buckets, one bucket, and all-zero values must render text or a flat line — never `NaN` in an SVG path. Pinned in Task 4 tests.
3. **Print integrity:** `.mcc-module table th/td` forces `padding: 16px 18px !important`; print tables must override it or the report balloons to many pages. Pinned in Task 9 verification.
4. **CSV safety and shape:** a group named `=SUM(A1)` or containing a quote must stay neutralised, and every row must remain five cells. Pinned in Task 6 tests.
5. **Long labels / many categories:** a 40-character group name and 20 categories must not overflow or force horizontal scroll at 390px. Pinned in Task 3 and Task 9 tests.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `cms-frontend/public/brand/mcc-lockup.png` | Blue horizontal lockup, from Drive `MCC Blue.png` |
| `cms-frontend/public/brand/mcc-lockup-white.png` | White lockup for dark surfaces |
| `src/utils/reportBranding.js` | Adds `CHURCH_REPORT_BANNER`, `CHURCH_REPORT_BANNER_DARK`; keeps existing exports |
| `src/components/charts/ReportSection.jsx` | Uniform section chrome: title, hint, actions, body |
| `src/components/charts/MetricRail.jsx` | The number indicator block beside a chart |
| `src/components/charts/LineTrend.jsx` | SVG line + area trend with hidden data table |
| `src/components/charts/DonutBreakdown.jsx` | SVG donut + legend rows with counts and shares |
| `src/components/charts/RankedBars.jsx` | Horizontal ranked bars for cell/ministry groups |
| `src/utils/analyticsReport.js` | Adds share/average/ratio helpers and three CSV sections |
| `src/pages/reports/AnalyticsReportPage.jsx` | Composition and data wiring only |
| `src/pages/reports/analyticsReport.css` | Tokens, grid, section/rail/chart styles, print block |
| `src/design-review.jsx` | Realistic analytics mock so charts can be reviewed without a database |

---

### Task 1: Brand assets and banner constants

**Files:**
- Create: `cms-frontend/public/brand/mcc-lockup.png`, `cms-frontend/public/brand/mcc-lockup-white.png`
- Modify: `cms-frontend/src/utils/reportBranding.js`
- Test: `cms-frontend/src/utils/reportBranding.test.js`

**Interfaces:**
- Produces: `CHURCH_REPORT_NAME: string`, `CHURCH_REPORT_SHORT_NAME: string`, `CHURCH_REPORT_LOGO: string` (unchanged), `CHURCH_REPORT_BANNER: '/brand/mcc-lockup.png'`, `CHURCH_REPORT_BANNER_DARK: '/brand/mcc-lockup-white.png'`.

- [ ] **Step 1: Copy the two assets** from `%TEMP%\mcc-brand\mcc-blue.png` (1392×179, 167 KB)
      and `%TEMP%\mcc-brand\mcc-white.png` (144 KB) into `cms-frontend/public/brand/` as
      `mcc-lockup.png` and `mcc-lockup-white.png`. These are the Drive originals `MCC Blue.png`
      and `MCC White.png`. Verify both are PNG (`89 50 4E 47`) and report byte sizes. The lockup
      is a wide band (7.78:1), not a square mark: the header places it as a band, never inside
      the 54px circular frame the old icon used.

- [ ] **Step 2: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { CHURCH_REPORT_BANNER, CHURCH_REPORT_BANNER_DARK, CHURCH_REPORT_LOGO } from './reportBranding';

describe('report branding', () => {
  it('exposes the banner lockups and keeps the legacy logo path', () => {
    expect(CHURCH_REPORT_BANNER).toBe('/brand/mcc-lockup.png');
    expect(CHURCH_REPORT_BANNER_DARK).toBe('/brand/mcc-lockup-white.png');
    expect(CHURCH_REPORT_LOGO).toBe('/logo.jpg');
  });
});
```

- [ ] **Step 3: Run it and confirm it fails** — `cd cms-frontend && npx vitest run src/utils/reportBranding.test.js` → fails on undefined export.

- [ ] **Step 4: Add the two constants** to `reportBranding.js`, leaving the three existing exports untouched.

- [ ] **Step 5: Re-run** — expect PASS.

- [ ] **Step 6: Commit** — `git add cms-frontend/public/brand cms-frontend/src/utils/reportBranding.js cms-frontend/src/utils/reportBranding.test.js && git commit -m "feat(analytics): add church banner assets and branding constants"`

---

### Task 2: ReportSection and MetricRail

**Files:**
- Create: `src/components/charts/ReportSection.jsx`, `src/components/charts/MetricRail.jsx`
- Test: `src/components/charts/ReportSection.test.jsx`, `src/components/charts/MetricRail.test.jsx`

**Interfaces:**
- `ReportSection({ title: string, hint?: string, actions?: ReactNode, children: ReactNode, className?: string })` → `<section className={"ar-section " + className}>` containing `<h2 className="ar-section-title">`, optional `<p className="ar-section-hint">`, optional `<div className="ar-section-actions">`, then children.
- `MetricRail({ items: Array<{ label: string, value: string, hint?: string }>, orientation?: 'vertical' | 'horizontal' })` → `<dl className="ar-rail ar-rail--vertical|horizontal">`, each item a `<div className="ar-rail-item">` with `<dt>` label and `<dd>` value, plus `<span className="ar-rail-hint">` when hint exists.
- Both are pure presentational components with no data fetching.

- [ ] **Step 1: Write the failing tests**

```jsx
// ReportSection.test.jsx
render(<ReportSection title="Member growth" hint="New members per month"><p>body</p></ReportSection>);
expect(screen.getByRole('heading', { name: 'Member growth' })).toBeInTheDocument();
expect(screen.getByText('New members per month')).toBeInTheDocument();
expect(screen.getByText('body')).toBeInTheDocument();
```

```jsx
// MetricRail.test.jsx
render(<MetricRail items={[{ label: 'Total', value: '1,108' }, { label: 'Active', value: '1,092', hint: '98.6%' }]} />);
expect(screen.getByRole('definition')).toHaveTextContent('1,108');
expect(screen.getAllByRole('term')).toHaveLength(2);
expect(screen.getByText('98.6%')).toBeInTheDocument();
```

- [ ] **Step 2: Run both, confirm they fail** — `npx vitest run src/components/charts`.

- [ ] **Step 3: Implement both components.** Rail renders values as text (never `toLocaleString` inside the component; formatting belongs to the page). `orientation` defaults to `'vertical'`.

- [ ] **Step 4: Re-run** — PASS.

- [ ] **Step 5: Commit** — `feat(analytics): add report section and metric rail primitives`

---

### Task 3: RankedBars

**Files:**
- Create: `src/components/charts/RankedBars.jsx`
- Test: `src/components/charts/RankedBars.test.jsx`

**Interfaces:**
- `RankedBars({ rows: Array<{ label: string, total: number }>, limit?: number = 10, color?: string = '#005599', emptyLabel?: string })`
- Renders `<ol className="ar-ranked">`; each `<li>` has `<span className="ar-ranked-label" title={label}>`, a track with an inner bar whose width is `total/max*100` where `max = Math.max(1, ...rows.map(r => r.total))`, and `<span className="ar-ranked-value">` with the integer count.
- Rows are sorted descending by `total` before slicing to `limit`; ties keep input order.

- [ ] **Step 1: Write the failing tests**

```jsx
it('sizes bars against the largest row and keeps every label', () => {
  render(<RankedBars rows={[{ label: 'Alpha', total: 50 }, { label: 'Beta', total: 25 }]} />);
  const bars = document.querySelectorAll('.ar-ranked-bar');
  expect(bars[0]).toHaveStyle({ width: '100%' });
  expect(bars[1]).toHaveStyle({ width: '50%' });
  expect(screen.getByText('Alpha')).toHaveAttribute('title', 'Alpha');
});

it('truncates to the limit but reports the count honestly', () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({ label: `G${i}`, total: 15 - i }));
  render(<RankedBars rows={rows} limit={10} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(10);
});

it('renders the empty label when there are no rows', () => {
  render(<RankedBars rows={[]} emptyLabel="No groups recorded." />);
  expect(screen.getByText('No groups recorded.')).toBeInTheDocument();
});

it('survives a 40-character label and 20 categories without a width above 100%', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ label: 'A'.repeat(40) + i, total: i }));
  render(<RankedBars rows={rows} limit={20} />);
  document.querySelectorAll('.ar-ranked-bar').forEach((bar) => {
    expect(parseFloat(bar.style.width)).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run and confirm failure.**

- [ ] **Step 3: Implement.** Width string uses `Math.min(100, ...)`; zero totals render a 0-width bar with a visible `0` value, not a broken track.

- [ ] **Step 4: Re-run** — PASS. **Step 5: Commit** — `feat(analytics): add ranked bar chart primitive`

---

### Task 4: LineTrend

**Files:**
- Create: `src/components/charts/LineTrend.jsx`
- Test: `src/components/charts/LineTrend.test.jsx`

**Interfaces:**
- `LineTrend({ points: Array<{ label: string, values: Record<string, number> }>, series: Array<{ key: string, label: string, color: string }>, height?: number = 220, valueFormat?: (n: number) => string = String, ariaLabel: string, emptyLabel?: string })`
- Geometry: viewBox `0 0 640 height`; x at `pad + i * (plotWidth / max(1, points.length - 1))` for `points.length > 1`, centred otherwise; y at `height - pad - (value / yMax) * plotHeight` with `yMax = Math.max(1, maxValue * 1.12)`; baseline at `height - pad`.
- Renders one `<path className="ar-line">` per series, one `<path className="ar-area">` only for the first series at `fillOpacity="0.08"`, `<circle className="ar-dot">` per point when `points.length / series.length <= 24` groups, and a `<table className="sr-only">` with a `<caption>{ariaLabel}</caption>`, one column per series.
- Empty (`points.length === 0`) → `<p className="ar-empty">`. Single point → a dot plus a 2px baseline stub, no `NaN` in `d`.

- [ ] **Step 1: Write the failing tests**

```jsx
it('maps values into a monotonic path and keeps zero as the baseline', () => {
  render(<LineTrend ariaLabel="Member growth" points={[{ label: 'Jan', values: { total: 0 } }, { label: 'Feb', values: { total: 10 } }]} series={[{ key: 'total', label: 'New members', color: '#005599' }]} />);
  const d = document.querySelector('.ar-line').getAttribute('d');
  expect(d).not.toMatch(/NaN/);
  const ys = d.match(/[-\d.]+ (?=[\d.]+)/g).map(Number);
  expect(ys[0]).toBeGreaterThan(ys[1]);
});

it('exposes the same numbers in a screen-reader table', () => {
  render(<LineTrend ariaLabel="Attendance" points={[{ label: 'Jan', values: { service: 4, events: 2 } }]} series={[{ key: 'service', label: 'Services', color: '#005599' }, { key: 'events', label: 'Events', color: '#13b5ea' }]} />);
  expect(screen.getByRole('table', { name: 'Attendance' })).toBeInTheDocument();
  expect(screen.getAllByRole('cell', { name: '4' })).toHaveLength(1);
});

it('renders a sentence for an empty series and never an empty svg', () => {
  render(<LineTrend ariaLabel="Finance" points={[]} series={[]} emptyLabel="No records for this period." />);
  expect(screen.getByText('No records for this period.')).toBeInTheDocument();
  expect(document.querySelector('svg')).toBeNull();
});
```

- [ ] **Step 2: Run and confirm failure.**

- [ ] **Step 3: Implement.** Round every coordinate with `Number(x.toFixed(2))` before joining. x-labels: render at most 6, choosing every `ceil(n / 6)`-th point plus the last. Hover/focus readout uses CSS only (`.ar-line-group:hover .ar-dot`), no React state, so print stays deterministic.

- [ ] **Step 4: Re-run** — PASS. **Step 5: Commit** — `feat(analytics): add SVG line trend with accessible table`

---

### Task 5: DonutBreakdown

**Files:**
- Create: `src/components/charts/DonutBreakdown.jsx`
- Test: `src/components/charts/DonutBreakdown.test.jsx`

**Interfaces:**
- `DonutBreakdown({ rows: Array<{ label: string, total: number }>, total: number, centerLabel: string, colors?: string[], ariaLabel: string, emptyLabel?: string })`
- Geometry: radius 54, circumference `C = 2 * Math.PI * 54`, each slice `strokeDasharray="{share} {C - share}"` and cumulative `strokeDashoffset`, rotated `-90deg`, slice gap achieved by a 2% reduction of each share (`Math.max(0, share - 2)`).
- Legend `<ul className="ar-legend">` rows: swatch, label, `value` (`toLocaleString('en-PH')`), and share as `(total / sum * 100).toFixed(1)` with a trailing `.0` trimmed, suffixed `%`.
- `sum === 0` → one `#e2e8f0` ring, centre shows `0`, legend still lists labels with `0%`.

- [ ] **Step 1: Write the failing tests**

```jsx
it('splits the ring into proportional arcs and totals the centre', () => {
  render(<DonutBreakdown ariaLabel="Gender" rows={[{ label: 'Female', total: 75 }, { label: 'Male', total: 25 }]} total={100} centerLabel="members" />);
  const arcs = document.querySelectorAll('.ar-donut-slice');
  expect(arcs).toHaveLength(2);
  expect(arcs[0].getAttribute('stroke-dasharray')).toMatch(/^1[0-9]{2}\./);
  expect(screen.getByText('75%')).toBeInTheDocument();
  expect(screen.getByText('members')).toBeInTheDocument();
});

it('renders a quiet ring instead of dividing by zero', () => {
  render(<DonutBreakdown ariaLabel="Age" rows={[{ label: 'Unknown', total: 0 }]} total={0} centerLabel="members" />);
  expect(document.querySelectorAll('.ar-donut-slice')).toHaveLength(0);
  expect(screen.getByText('0%')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm failure.**

- [ ] **Step 3: Implement.** Shares derive from `sum = rows.reduce(...)` rather than the `total` prop, so a stale total cannot overdraw the ring; `total` is display-only and falls back to `sum`.

- [ ] **Step 4: Re-run** — PASS. **Step 5: Commit** — `feat(analytics): add donut breakdown primitive`

---

### Task 6: CSV detail helpers and new sections

**Files:**
- Modify: `src/utils/analyticsReport.js`
- Test: `src/utils/analyticsReport.test.js`

**Interfaces (new exports):**
- `shareOf(value: number, total: number): number` → one decimal, `0` when total is 0.
- `averagePerBucket(total: number, buckets: number): number` → one decimal, `0` when `buckets` is 0.
- `expenseRatio(expenses: number, income: number): number` → one decimal percent, `0` when income is 0.
- `netMargin(net: number, income: number): number` → one decimal percent, `0` when income is 0.
- `buildAnalyticsCsvRows` gains three appended sections in this fixed order: `MEMBER MIX` (after `MEMBER DEMOGRAPHICS`), `ATTENDANCE SUMMARY` (after the attendance totals, before `ATTENDANCE TREND`), `FINANCE RATIOS` (after `FINANCE TREND`). Existing sections and the three `Finance` rows keep their exact values and positions relative to each other.

- [ ] **Step 1: Write the failing tests**

```js
it('exports member mix shares without touching documented sections', () => {
  const rows = buildAnalyticsCsvRows(data, scope);
  expect(rows.filter(([s]) => s === 'Finance')).toEqual([
    ['Finance', 'Received income', 900, 'PHP', ''],
    ['Finance', 'Expenses', 250, 'PHP', ''],
    ['Finance', 'Net balance', 650, 'PHP', ''],
  ]);
  expect(rows).toContainEqual(['Member mix', 'Female', 7, 'members', '58.3% of 12 members']);
});

it('keeps five columns when a group label looks like a formula', () => {
  const rows = buildAnalyticsCsvRows({ ...data, demographics: { ...data.demographics, cell_groups: [{ label: '=SUM(A1:A9)', total: 3 }] } }, scope);
  expect(rows.every((row) => row.length === 5)).toBe(true);
  expect(toCsv(rows)).toContain('"\'=SUM(A1:A9)"');
});

it('computes ratios without dividing by zero', () => {
  expect(expenseRatio(250, 0)).toBe(0);
  expect(netMargin(650, 900)).toBe(72.2);
  expect(averagePerBucket(9, 0)).toBe(0);
});
```

- [ ] **Step 2: Run and confirm failure.**

- [ ] **Step 3: Implement the four helpers and append the three sections.** Notes column carries the human sentence; `Value` stays a number; `Unit` is `%` or `check-ins`. The attendance average is labelled `Average per interval` and described in Notes as check-ins divided by report buckets — never "per service", because the API returns no count of services held and this plan does not add one.

- [ ] **Step 4: Re-run the whole util spec** — `npx vitest run src/utils/analyticsReport.test.js` → PASS, including the pre-existing five tests.

- [ ] **Step 5: Commit** — `feat(analytics): add member mix, attendance summary and finance ratios to CSV`

---

### Task 7: Compose the page

**Files:**
- Modify: `src/pages/reports/AnalyticsReportPage.jsx`
- Test: `src/pages/reports/AnalyticsReportPage.test.jsx`

**Interfaces:**
- Consumes: `ReportSection`, `MetricRail`, `LineTrend`, `DonutBreakdown`, `RankedBars`, `CHURCH_REPORT_BANNER`.
- Produces: the rendered report; no exported API.
- Fixed composition, in this order, each wrapped in `ReportSection`:
  1. Header: `<img src={CHURCH_REPORT_BANNER} alt="" className="ar-banner">`, title, scope sentence, meta line, actions (Print, CSV).
  2. Filters: period select, from/to, refresh — native controls, unchanged labels (`Report period`, `From`, `To`, `Refresh report`).
  3. `.ar-kpis` → `MetricRail` horizontal with Members, Active, Inactive, New in range.
  4. `.ar-grid` → Member growth (`LineTrend`, series `total`) with rail (Total, New in range, Peak month) beside Gender (`DonutBreakdown`).
  5. Attendance (`LineTrend`, series `service` + `events`) with rail (Service check-ins, Event check-ins, Average per interval) beside Age (`DonutBreakdown`).
  6. Finance full width (`LineTrend`, series `income` + `expenses`) with rail (Received income, Expenses, Net balance).
  7. Groups full width: two `RankedBars` blocks, cell groups and ministry groups, side by side.
- Sections render only when their data exists for the role; when a role lacks everything, render one sentence instead of an empty grid.

- [ ] **Step 1: Rewrite the test file's fixtures** to include realistic data (12 members, 4 gender rows, 5 age bands, 2 attendance buckets, 2 finance buckets) and keep the two existing role assertions.

- [ ] **Step 2: Add failing assertions for the new structure**

```jsx
it('pairs every chart with a number rail and a single heading style', async () => {
  render(<AnalyticsReportPage />);
  expect(await screen.findByRole('heading', { name: 'Member growth' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Gender' })).toBeInTheDocument();
  expect(screen.getAllByRole('term').length).toBeGreaterThanOrEqual(6);
  expect(document.querySelectorAll('.ar-section').length).toBeGreaterThanOrEqual(6);
});

it('renders no member sections and no empty grid for Finance Team', async () => {
  state.roleName = 'Finance Team';
  state.get.mockResolvedValue({ data: { data: financeOnlyFixture } });
  render(<AnalyticsReportPage />);
  expect(await screen.findByRole('heading', { name: 'Finance' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Member growth' })).not.toBeInTheDocument();
  expect(document.querySelectorAll('.ar-section[data-empty="true"]')).toHaveLength(0);
});
```

- [ ] **Step 3: Run and confirm failure.**

- [ ] **Step 4: Implement the composition.** Keep `loadReport`, `downloadCsv`, `selectPeriod`, error/notice handling, and the `mcc-module mcc-module-analytics-report` wrapper class untouched — print visibility depends on it. Formatting helpers (`number`, `money`) move into `analyticsReport.js`-free local constants; no chart math in the page.

- [ ] **Step 5: Re-run page + util tests** — PASS.

- [ ] **Step 6: Commit** — `feat(analytics): compose branded report page from chart primitives`

---

### Task 8: Layout, tokens, and responsive behaviour

**Files:**
- Modify: `src/pages/reports/analyticsReport.css`
- Test: visual verification in Task 9 (no unit test for layout)

**Interfaces:**
- Tokens scoped to `.analytics-report`: `--ar-gap: 20px`, `--ar-radius: 10px`, `--ar-rule: #e2e8f0`, `--ar-muted: #52647a`, `--ar-ink: #0f172a`, `--ar-brand: #005599`, `--ar-cyan: #13b5ea`.
- Grid: `.ar-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--ar-gap); }`; charts span 8, donuts 4, finance and groups span 12. Below 900px every child spans 12 and the rail turns horizontal.
- `.ar-section` has no shadow; one 1px top rule, 18px padding-block; headings 20px/650; body 14px; labels 12px; numerals `font-variant-numeric: tabular-nums`.

- [ ] **Step 1: Write the token and layout block**, replacing the inline `S` object styling entirely. Delete `S` from the page in the same commit.

- [ ] **Step 2: Verify no regressions in role workspaces** — `npx vitest run` (full suite) → PASS.

- [ ] **Step 3: Manual check at three widths** with Playwright: 1440, 900, 390. Record that no horizontal scrollbar appears and the rail stacks above its chart at 390.

- [ ] **Step 4: Commit** — `style(analytics): consistent grid, tokens and responsive rules`

---

### Task 9: Print sheet

**Files:**
- Modify: `src/pages/reports/analyticsReport.css` (`@media print` block)

**Interfaces:**
- Print header uses `CHURCH_REPORT_BANNER` at `44mm` width; charts print at `width: 100%` with `break-inside: avoid`; tables print with `padding: 4px 6px !important` overriding `.mcc-module`'s forced 16/18px; `.ar-actions, .ar-filters, .ar-notice { display: none !important }`.

- [ ] **Step 1: Replace the print block** so it no longer relies on `body * { visibility: hidden }` for layout, while keeping the visibility rule as the isolation mechanism (other pages depend on it not leaking).

- [ ] **Step 2: Add the print-only tables** beneath the charts: demographics (label, count, share), attendance by bucket, finance by bucket, group aggregates. Mark them `.ar-print-only` (hidden on screen, `display: block` in print).

- [ ] **Step 3: Add one static closing footnote block** — data scope, privacy sentence, "generated by PLWM-MCC CMS", and the line "Switch off browser headers and footers in the print dialog for a clean sheet." No page numbers, nothing repeated per page: real pagination needs `@page` margin boxes with uneven support or a measurement pass over variable-height charts, and neither earns its risk here.

- [ ] **Step 4: Verify with Playwright** — emulate print media at 1440px, capture `analytics-print.png`, and export a PDF with `page.pdf({ format: 'A4', landscape: true })`. Assert page count ≤ 4 and that no table row is clipped (visual check of the capture).

- [ ] **Step 5: Commit** — `feat(analytics): branded print sheet with detailed tables`

---

### Task 10: Review harness and final verification

**Files:**
- Modify: `src/design-review.jsx`
- Verify: whole app

**Interfaces:**
- `design-review.jsx` analytics branch returns a populated payload: `members {total:1108, active:1092, inactive:16, new_in_range:42}`, four gender rows, five age bands, six cell groups, five groups, twelve growth buckets, twelve attendance buckets, twelve finance buckets.

- [ ] **Step 1: Replace the analytics mock** with the payload above so every primitive renders real geometry.

- [ ] **Step 2: Run the full suite** — `npx vitest run` → PASS.

- [ ] **Step 3: Production build** — `npm run build` → succeeds, no new chunks over 50KB.

- [ ] **Step 4: Live check at http://127.0.0.1:3000/reports/analytics** for System Admin: charts, rails, donuts, groups, CSV download, print preview. Capture screenshots at 1440 and 390.

- [ ] **Step 5: Check the two other roles** via `design-review.html?role=Finance+Team` and `?role=Registration+Team`; confirm no holes and no forbidden sections.

- [ ] **Step 6: Commit** — `chore(analytics): populate design review data and verify report`

---

## Self-Review

- **Spec coverage:** line trends (Task 4/7), donuts (Task 5/7), ranked groups (Task 3/7), number rails (Task 2/7), brand banner (Task 1/7), detailed CSV (Task 6), branded print with tables (Task 9), consistent layout and tokens (Task 8), review harness (Task 10). Backend, routes, nav and finance statement are untouched by design.
- **Type consistency:** `rows`/`points`/`series`/`items` names are identical across Tasks 2–7; `shareOf`, `averagePerBucket`, `expenseRatio`, `netMargin` are defined once in Task 6 and consumed only there.
- **Proportion:** the plan specifies interfaces and assertions, not component bodies; chart math is left to the builder with only the constraints that prevent `NaN` and overflow.
