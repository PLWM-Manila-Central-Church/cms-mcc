import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.UI_BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('.qa', 'ui-smoke');
fs.mkdirSync(OUT, { recursive: true });

const cases = [
  { role: 'Member', route: '/portal?tab=overview', expect: /overview|giving|attendance/i, name: 'portal-overview' },
  { role: 'Member', route: '/portal?tab=calendar', expect: /calendar/i, name: 'portal-calendar', after: async (page) => {
    const cell = page.getByRole('gridcell').first();
    await cell.click();
    await page.getByRole('dialog').waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
  } },
  { role: 'Member', route: '/portal?tab=attendance', expect: /attendance/i, name: 'portal-attendance' },
  { role: 'Member', route: '/portal?tab=tithes', expect: /tithes|giving/i, name: 'portal-tithes', after: async (page) => {
    const eye = page.locator('button[aria-pressed]').first();
    const before = await eye.getAttribute('aria-pressed');
    await eye.click();
    const after = await eye.getAttribute('aria-pressed');
    if (before === after) throw new Error('money eye did not toggle');
  } },
  { role: 'Member', route: '/portal?tab=ministries', expect: /ministr/i, name: 'portal-ministries' },
  { role: 'Member', route: '/portal?tab=bible', expect: /bible|reading/i, name: 'portal-bible', after: async (page) => {
    const cell = page.getByRole('gridcell').first();
    await cell.click();
    await page.getByRole('dialog').waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
  } },
  { role: 'System Admin', route: '/dashboard', expect: /dashboard|welcome/i, name: 'admin-dashboard' },
  { role: 'System Admin', route: '/events', expect: /events/i, name: 'admin-events' },
  { role: 'System Admin', route: '/attendance', expect: /attendance/i, name: 'admin-attendance' },
  { role: 'System Admin', route: '/finance', expect: /finance|tithes|giving/i, name: 'admin-finance' },
  { role: 'System Admin', route: '/archives', expect: /archive/i, name: 'admin-archives' },
  { role: 'System Admin', route: '/reports/analytics', expect: /analytics|report/i, name: 'admin-analytics' },
  { role: 'System Admin', route: '/reports/registration', expect: /registration analytics/i, name: 'admin-registration' },
  { role: 'System Admin', route: '/bible-reading', expect: /bible reading/i, name: 'admin-bible' },
  { role: 'System Admin', route: '/ministry/schedules', expect: /ministry schedule/i, name: 'admin-ministry-schedules' },
  { role: 'System Admin', route: '/members', expect: /members/i, name: 'admin-members' },
  { role: 'System Admin', route: '/outreach', expect: /notifications|follow-up/i, name: 'admin-outreach' },
  { role: 'Registration Team', route: '/dashboard', expect: /dashboard|welcome/i, name: 'reg-dashboard' },
  { role: 'Registration Team', route: '/attendance', expect: /attendance/i, name: 'reg-attendance' },
  { role: 'Registration Team', route: '/reports/registration', expect: /registration analytics/i, name: 'reg-analytics' },
  { role: 'Pastor', route: '/reports/analytics', expect: /analytics|report/i, name: 'pastor-analytics' },
  { role: 'Pastor', route: '/bible-reading', expect: /bible reading/i, name: 'pastor-bible' },
  { role: 'Finance Team', route: '/finance', expect: /finance|tithes|giving/i, name: 'finance-finance' },
  { role: 'Member', route: '/portal?tab=calendar', expect: /calendar/i, name: 'mobile-calendar', viewport: { width: 390, height: 844 }, mobile: true, after: async (page) => {
    await page.getByRole('gridcell').first().click();
    await page.getByRole('dialog').waitFor({ timeout: 4000 });
    const close = page.getByRole('button', { name: /close/i }).first();
    if (await close.count()) await close.click();
  } },
  { role: 'Member', route: '/portal?tab=tithes', expect: /tithes|giving/i, name: 'mobile-tithes', viewport: { width: 390, height: 844 }, mobile: true },
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
    if (testCase.mobile) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) issues.missing = `horizontal overflow ${overflow}px`;
    }
    if (testCase.after) {
      try { await testCase.after(page); } catch (error) { issues.interaction = String(error.message).slice(0, 200); }
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
