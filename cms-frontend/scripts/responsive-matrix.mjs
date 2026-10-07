import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const fixture = JSON.parse(fs.readFileSync(process.env.RESPONSIVE_MATRIX_FIXTURE, 'utf8'));
const baseUrl = process.env.LOCAL_CMS_URL || 'http://127.0.0.1:3001';
const viewports = [
  { width: 320, height: 700 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
  { width: 600, height: 900 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
  { width: 1365, height: 900 },
];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const failures = [];

const login = async (credentials) => {
  const context = await browser.newContext({ viewport: viewports[0], acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  let loginRequest = null;
  let loginResponse = null;
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/login') {
      const body = JSON.parse(request.postData() || '{}');
      loginRequest = {
        keys: Object.keys(body),
        emailMatches: body.email === credentials.email,
        passwordLength: String(body.password || '').length,
      };
    }
  });
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname === '/api/auth/login') {
      const body = await response.json().catch(() => ({}));
      loginResponse = { status: response.status(), message: body.message || body.error?.message || null, errors: body.errors || null };
    }
  });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  try {
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30_000 }),
      page.getByRole('button', { name: /Sign In/ }).click(),
    ]);
  } catch (error) {
    const formText = await page.locator('body').innerText().catch(() => 'Login page unavailable');
    throw new Error(`Login failed. Request: ${JSON.stringify(loginRequest)}. API: ${JSON.stringify(loginResponse)}. UI: ${formText.slice(-800)}. ${error.message}`);
  }
  return { context, page, pageErrors };
};

const setScope = async (page, scopeKey) => {
  await page.getByLabel('Active leadership team').selectOption(scopeKey);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction((value) => document.querySelector('[aria-label="Active leadership team"]')?.value === value, scopeKey);
};

const openAndCheck = async (page, path, label, ready) => {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => {
      const main = document.querySelector('main');
      if (!main) return true;
      const width = window.innerWidth;
      const expectedPaddingTop = width <= 768 ? 72 : 80;
      const expectedMarginLeft = width <= 768 ? 0 : width <= 1024 ? 68 : 244;
      const style = getComputedStyle(main);
      return Math.abs(parseFloat(style.paddingTop) - expectedPaddingTop) < 0.5
        && Math.abs(parseFloat(style.marginLeft) - expectedMarginLeft) < 0.5;
    });
    const dimensions = await page.evaluate(() => ({ width: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    assert.ok(Math.max(dimensions.document, dimensions.body) <= dimensions.width + 1,
      `${label} overflows at ${viewport.width}px: ${JSON.stringify(dimensions)}`);
  }
};

try {
  const leader = await login(fixture.leader);
  const leaderCases = [
    ['/leader/teams', 'Leader teams page', (page) => page.getByRole('heading', { name: 'My Teams', exact: true }).waitFor({ state: 'visible' })],
    ['/dashboard', 'Leader dashboard', (page) => page.getByRole('heading').first().waitFor({ state: 'visible' })],
    [`/attendance/qr?target_type=event&target_id=${fixture.eventId}&session_id=${fixture.eventSessionId}`, 'Combined QR workspace', (page) => page.locator('.qr-session-status').filter({ hasText: 'open' }).waitFor({ state: 'visible' })],
  ];
  for (const [path, label, ready] of leaderCases) await openAndCheck(leader.page, path, label, ready);

  await setScope(leader.page, `cell_group:${fixture.scope.cellGroupId}`);
  await openAndCheck(leader.page, '/cell-groups', 'Cell-group workspace', (page) => page.getByRole('heading').first().waitFor({ state: 'visible' }));
  await setScope(leader.page, `member_group:${fixture.scope.groupId}`);
  await openAndCheck(leader.page, '/members', 'Group member roster', (page) => page.getByRole('heading').first().waitFor({ state: 'visible' }));
  await openAndCheck(leader.page, `/events/${fixture.eventId}`, 'Scoped event detail', (page) => page.getByRole('heading').first().waitFor({ state: 'visible' }));
  assert.deepEqual(leader.pageErrors, []);
  await leader.context.close();

  const admin = await login(fixture.admin);
  await openAndCheck(admin.page, '/users/new', 'Admin Leader assignment form', async (page) => {
    await page.locator('select[name="role_id"]').selectOption({ label: 'Leader' });
    await page.locator('#leader-cell-group').waitFor({ state: 'visible' });
    await page.locator('#leader-group').waitFor({ state: 'visible' });
  });
  assert.deepEqual(admin.pageErrors, []);
  await admin.context.close();

  const pastor = await login(fixture.pastor);
  await openAndCheck(pastor.page, '/dashboard', 'Pastor Home attendance action', (page) =>
    page.getByRole('button', { name: /Attendance report/ }).waitFor({ state: 'visible' }));
  await pastor.page.getByRole('button', { name: /Attendance report/ }).click();
  await pastor.page.waitForURL((url) => url.pathname === '/attendance', { timeout: 15_000 });
  await openAndCheck(pastor.page, '/attendance', 'Pastor attendance report', async (page) => {
    await page.getByRole('heading', { name: 'Pastor Attendance Report', exact: true }).waitFor({ state: 'visible' });
    await page.getByText('Confirmed visits', { exact: true }).waitFor({ state: 'visible' });
  });
  await pastor.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await pastor.page.waitForFunction(() => Math.abs(parseFloat(getComputedStyle(document.querySelector('main')).paddingTop) - 80) < 0.5);
  const [reportDownload] = await Promise.all([
    pastor.page.waitForEvent('download', { timeout: 20_000 }),
    pastor.page.getByRole('button', { name: /Export filtered report/ }).click(),
  ]);
  assert.match(await reportDownload.suggestedFilename(), /^pastor-attendance-/);
  const reportCsv = fs.readFileSync(await reportDownload.path(), 'utf8');
  assert.match(reportCsv, /Filtered attendance totals/);
  assert.match(reportCsv, /"Reconciliation status"/);

  await pastor.page.getByLabel('Activity type').selectOption('event');
  await pastor.page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await pastor.page.waitForURL((url) => url.searchParams.get('activity_type') === 'event', { timeout: 15_000 });
  const memberSearch = pastor.page.getByLabel('Search member attendance history');
  await memberSearch.fill(fixture.memberSearch);
  const candidate = pastor.page.getByRole('listbox', { name: 'Matching members' }).getByRole('option').first();
  await candidate.waitFor({ state: 'visible', timeout: 15_000 });
  await candidate.click();
  const memberHistory = pastor.page.getByRole('region', { name: 'Pastor member attendance drilldown' });
  await memberHistory.getByText(`${fixture.memberSearch}, ${fixture.memberFirstName} · Active`).waitFor({ state: 'visible', timeout: 15_000 });
  await memberHistory.getByText(fixture.eventTitle, { exact: false }).waitFor({ state: 'visible', timeout: 15_000 });
  for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
    await pastor.page.setViewportSize(viewport);
    await pastor.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))));
    const dimensions = await pastor.page.evaluate(() => ({ width: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    assert.ok(Math.max(dimensions.document, dimensions.body) <= dimensions.width + 1,
      `Pastor member drilldown overflows at ${viewport.width}px: ${JSON.stringify(dimensions)}`);
  }
  assert.deepEqual(pastor.pageErrors, []);
  await pastor.context.close();

  console.log('Responsive and role flow checks passed across 320–1440px: Leader teams/dashboard/rosters/Event/QR, Admin assignment form, and Pastor report filters/member history/Service-Event detail and CSV-capable view.');
} finally {
  await browser.close();
}
