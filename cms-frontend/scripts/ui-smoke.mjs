import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.UI_BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('.qa', 'ui-smoke');
fs.mkdirSync(OUT, { recursive: true });

const cases = [
  // Member Portal (calm engagement, calendar, money privacy, ministries RSVP/messages/prayer, bible)
  { role: 'Member', route: '/portal?tab=overview', expect: /overview|giving|attendance/i, name: 'portal-overview' },
  { role: 'Member', route: '/portal?tab=calendar', expect: /calendar/i, name: 'portal-calendar', after: async (page) => {
    const cell = page.getByRole('gridcell').first();
    await cell.click();
    await page.getByRole('dialog').waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
  } },
  { role: 'Member', route: '/portal?tab=attendance', expect: /attendance/i, name: 'portal-attendance' },
  { role: 'Member', route: '/portal?tab=tithes', expect: /tithes|giving/i, name: 'portal-tithes', after: async (page) => {
    const tithesTab = page.getByRole('button', { name: /Tithes/i }).first();
    if (await tithesTab.count()) await tithesTab.click();
    await page.getByText(/My Tithes and Offering History|Year-to-Date/i).first().waitFor({ timeout: 5000 });
    const eye = page.locator('button[aria-pressed]').first();
    const before = await eye.getAttribute('aria-pressed');
    await eye.click();
    const after = await eye.getAttribute('aria-pressed');
    if (before === after) throw new Error('money eye did not toggle');
  } },
  { role: 'Member', route: '/portal?tab=ministries', expect: /ministr|activities|prayer/i, name: 'portal-ministries', after: async (page) => {
    const minTab = page.getByRole('button', { name: /Ministries/i }).first();
    if (await minTab.count()) await minTab.click();
    await page.getByText(/Activities & RSVP|Prayer Requests/i).first().waitFor({ timeout: 5000 });
  } },
  { role: 'Member', route: '/portal?tab=bible', expect: /bible|reading/i, name: 'portal-bible', after: async (page) => {
    const cell = page.getByRole('gridcell').first();
    await cell.click();
    await page.getByRole('dialog').waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
  } },

  // System Admin (all major & newly built modules)
  { role: 'System Admin', route: '/dashboard', expect: /dashboard|control center|members/i, name: 'admin-dashboard' },
  { role: 'System Admin', route: '/ministries', expect: /ministries|young adults/i, name: 'admin-ministries' },
  { role: 'System Admin', route: '/groups', expect: /serving groups|choir/i, name: 'admin-groups' },
  { role: 'System Admin', route: '/events', expect: /events/i, name: 'admin-events' },
  { role: 'System Admin', route: '/events/1', expect: /event planning|approved budget|program/i, name: 'admin-event-workspace' },
  { role: 'System Admin', route: '/attendance', expect: /attendance/i, name: 'admin-attendance' },
  { role: 'System Admin', route: '/finance', expect: /finance|tithes|giving/i, name: 'admin-finance' },
  { role: 'System Admin', route: '/finance/expenses', expect: /expenses|received income/i, name: 'admin-finance-expenses' },
  { role: 'System Admin', route: '/finance/funds', expect: /funds|accounts|transfers/i, name: 'admin-finance-funds' },
  { role: 'System Admin', route: '/finance/approvals', expect: /expense approval|pending approval/i, name: 'admin-finance-approvals' },
  { role: 'System Admin', route: '/finance/reports', expect: /consolidated financial statement|unified audit ledger/i, name: 'admin-finance-reports' },
  { role: 'System Admin', route: '/cell-groups', expect: /cell group|weekly meetings/i, name: 'admin-cellgroups' },
  { role: 'System Admin', route: '/services', expect: /service program|recurring/i, name: 'admin-services' },
  { role: 'System Admin', route: '/inventory', expect: /inventory|stock ledger|borrowing/i, name: 'admin-inventory' },
  { role: 'System Admin', route: '/archives', expect: /archive/i, name: 'admin-archives' },
  { role: 'System Admin', route: '/users', expect: /users|admin@plwmmcc/i, name: 'admin-users' },
  { role: 'System Admin', route: '/reports/analytics', expect: /consolidated analytics|gatherings/i, name: 'admin-analytics' },
  { role: 'System Admin', route: '/reports/registration', expect: /registration analytics/i, name: 'admin-registration' },
  { role: 'System Admin', route: '/bible-reading', expect: /bible reading/i, name: 'admin-bible' },
  { role: 'System Admin', route: '/ministry/schedules', expect: /ministry schedule/i, name: 'admin-ministry-schedules' },
  { role: 'System Admin', route: '/members', expect: /members/i, name: 'admin-members' },
  { role: 'System Admin', route: '/outreach', expect: /notifications|follow-up/i, name: 'admin-outreach', after: async (page) => {
    await page.getByRole('tab', { name: 'Campaigns' }).click();
    await page.getByRole('button', { name: 'New notification' }).click();
    await page.getByRole('button', { name: 'Preview audience & cost' }).click();
    await page.getByText(/eligible recipient/).first().waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
  } },

  // All other 7 staff roles
  { role: 'Pastor', route: '/dashboard', expect: /pastoral|dashboard|attendance/i, name: 'pastor-dashboard' },
  { role: 'Pastor', route: '/reports/analytics', expect: /consolidated analytics/i, name: 'pastor-analytics' },
  { role: 'Registration Team', route: '/dashboard', expect: /registration|check-in|attendance/i, name: 'reg-dashboard' },
  { role: 'Registration Team', route: '/reports/registration', expect: /registration analytics/i, name: 'reg-analytics' },
  { role: 'Finance Team', route: '/dashboard', expect: /finance|stewardship|giving/i, name: 'finance-dashboard' },
  { role: 'Finance Team', route: '/finance/funds', expect: /funds|accounts/i, name: 'finance-funds' },
  { role: 'Ministry Leader', route: '/dashboard', expect: /ministry|dashboard/i, name: 'ministry-leader-dashboard' },
  { role: 'Ministry Leader', route: '/groups', expect: /serving groups|choir/i, name: 'ministry-leader-groups' },
  { role: 'Cell Leader', route: '/dashboard', expect: /cell|dashboard/i, name: 'cell-leader-dashboard' },
  { role: 'Group Leader', route: '/dashboard', expect: /group|dashboard/i, name: 'group-leader-dashboard' },
  { role: 'Combined Leader', route: '/dashboard', expect: /team|leader|dashboard/i, name: 'combined-leader-dashboard' },

  // Mobile responsive checks (390x844)
  { role: 'Member', route: '/portal?tab=calendar', expect: /calendar/i, name: 'mobile-calendar', viewport: { width: 390, height: 844 }, mobile: true, after: async (page) => {
    await page.getByRole('gridcell').first().click();
    await page.getByRole('dialog').waitFor({ timeout: 4000 });
    const close = page.getByRole('button', { name: /close/i }).first();
    if (await close.count()) await close.click();
  } },
  { role: 'Member', route: '/portal?tab=tithes', expect: /tithes|giving/i, name: 'mobile-tithes', viewport: { width: 390, height: 844 }, mobile: true },
  { role: 'System Admin', route: '/dashboard', expect: /dashboard|control center/i, name: 'mobile-admin-dashboard', viewport: { width: 390, height: 844 }, mobile: true },
];

const HEADED = process.env.UI_HEADED === '1';
const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED, slowMo: HEADED ? 120 : 0 });
const results = [];

for (const testCase of cases) {
  const context = await browser.newContext({ viewport: testCase.viewport || { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const issues = { console: [], pageErrors: [], http5xx: [], failed: [], missing: null, interaction: null };

  page.on('console', (message) => {
    if (message.type() === 'error') issues.console.push(message.text().slice(0, 240));
  });
  page.on('pageerror', (error) => issues.pageErrors.push(String(error.message).slice(0, 240)));
  page.on('response', (response) => {
    if (response.status() >= 500) issues.http5xx.push(`${response.status()} ${response.url().slice(0, 140)}`);
  });
  page.on('requestfailed', (request) => {
    issues.failed.push(`${request.failure()?.errorText || 'failed'} ${request.url().slice(0, 140)}`);
  });

  const url = `${BASE}/role-review.html?role=${encodeURIComponent(testCase.role)}&embedded=1#${testCase.route}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1200);
    const body = await page.locator('body').innerText();
    if (!testCase.expect.test(body)) issues.missing = `expected ${testCase.expect}`;
    if (/something went wrong|failed to load|application error/i.test(body)) issues.missing = 'error screen';

    const layoutCheck = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const sidebar = document.querySelector('.mcc-sidebar-rail');
      const main = document.querySelector('.mcc-main');
      let sidebarOverlap = false;
      if (sidebar && main && window.innerWidth >= 900) {
        const sbRect = sidebar.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        if (sbRect.width > 0 && mainRect.left < sbRect.right - 2) sidebarOverlap = true;
      }
      return { overflow, sidebarOverlap };
    });
    if (layoutCheck.overflow > 2) issues.missing = `horizontal overflow ${layoutCheck.overflow}px`;
    if (layoutCheck.sidebarOverlap) issues.missing = 'sidebar overlaps main workspace';

    if (testCase.after) {
      try {
        await testCase.after(page);
        const postOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (postOverflow > 2) issues.missing = `post-interaction horizontal overflow ${postOverflow}px`;
      } catch (error) { issues.interaction = String(error.message).slice(0, 200); }
    }
    await page.screenshot({ path: path.join(OUT, `${testCase.name}.png`), fullPage: true });
  } catch (error) {
    issues.missing = `navigation: ${String(error.message).slice(0, 200)}`;
  }

  const failing = issues.pageErrors.length > 0 || issues.http5xx.length > 0 || Boolean(issues.missing) || Boolean(issues.interaction);
  results.push({ ...testCase, issues, failing });
  await context.close();
}

await browser.close();

const summary = {
  base: BASE,
  cases: results.length,
  failed: results.filter((result) => result.failing).length,
  results: results.map((result) => ({
    name: result.name, role: result.role, route: result.route, failing: result.failing,
    console: result.issues.console.slice(0, 3), pageErrors: result.issues.pageErrors.slice(0, 3),
    http5xx: result.issues.http5xx.slice(0, 3), failedRequests: result.issues.failed.slice(0, 3),
    missing: result.issues.missing, interaction: result.issues.interaction,
  })),
};

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (summary.failed > 0) process.exitCode = 1;
