import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const fixturePath = process.env.QR_E2E_FIXTURE_PATH;
const baseUrl = process.env.QR_E2E_BASE_URL || 'http://127.0.0.1:3000';
assert.ok(fixturePath && fs.existsSync(fixturePath), 'QR_E2E_FIXTURE_PATH must point to synthetic CI fixture data');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const runSuffix = Date.now().toString(36);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcc-qr-browser-e2e-'));
const browserErrors = [];
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const contexts = [];

const localDateTime = (offsetMs) => {
  const local = new Date(Date.now() + offsetMs - new Date().getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const logPageErrors = (page, label) => {
  page.on('pageerror', (error) => browserErrors.push(`${label}: ${error.message}`));
};

const login = async (credentials, destination) => {
  const context = await browser.newContext({
    acceptDownloads: true,
    permissions: ['camera'],
    viewport: { width: 1365, height: 900 },
  });
  contexts.push(context);
  const page = await context.newPage();
  const qrApiResponses = [];
  const historyApiResponses = [];
  const settingsApiResponses = [];
  const leaderScopeHeaders = [];
  page.qrApiResponses = qrApiResponses;
  logPageErrors(page, credentials.email);
  page.on('request', (request) => {
    const scope = request.headers()['x-mcc-leader-scope'];
    if (scope) leaderScopeHeaders.push(scope);
  });
  page.on('response', async (response) => {
    const url = new URL(response.url());
    if (url.pathname.includes('/attendance-qr') || url.pathname.includes('/qr-attendance/')) {
      qrApiResponses.push(`${response.status()} ${url.pathname}`);
    }
    if (url.pathname === '/api/member-portal/attendance-qr/history') {
      const body = await response.json().catch(() => null);
      historyApiResponses.push({
        status: response.status(),
        records: Array.isArray(body?.data?.records)
          ? body.data.records.map((record) => ({ event_id: record.event_id, event_title: record.event_title, status: record.status }))
          : null,
        message: body?.message || body?.error?.message || null,
      });
    }
    if (url.pathname === '/api/settings' && response.request().method() === 'GET') {
      const body = await response.json().catch(() => null);
      settingsApiResponses.push({
        status: response.status(),
        settingCount: body?.data && typeof body.data === 'object' ? Object.keys(body.data).length : 0,
        qrEnabled: body?.data?.qr_attendance_enabled?.value ?? null,
        message: body?.message || body?.error?.message || null,
      });
    }
  });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === destination, { timeout: 45_000 }),
    page.getByRole('button', { name: /Sign In/ }).click(),
  ]);
  return { context, page, qrApiResponses, historyApiResponses, settingsApiResponses, leaderScopeHeaders };
};

const createUnifiedLeaderFromAdmin = async (page, fixture) => {
  await page.goto(`${baseUrl}/users/new`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="first_name"]').fill('Browser');
  await page.locator('input[name="last_name"]').fill('E2E Leader');
  await page.locator('input[name="email"]').fill(fixture.unifiedLeader.email);
  await page.locator('input[name="password"]').fill(fixture.password);
  await page.locator('select[name="role_id"]').selectOption({ label: 'Leader' });
  await page.locator('#leader-cell-group').selectOption(String(fixture.leaderScopes.cellGroupId));
  await page.locator('#leader-group').selectOption(String(fixture.leaderScopes.groupId));
  await page.locator('#leadership-reason').fill('Assigned as the QR attendance flow test leader');
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/users' && response.request().method() === 'POST';
  }, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Create User', exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 201, 'Admin UI should create a unified Leader with both assignments');
  await page.waitForURL((url) => url.pathname === '/users', { timeout: 30_000 });
};

const completeForcedPasswordChange = async ({ page }, password) => {
  await page.locator('input[name="current_password"]').fill(password);
  await page.locator('input[name="new_password"]').fill(password);
  await page.locator('input[name="confirm_password"]').fill(password);
  await page.getByRole('button', { name: 'Update Password', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30_000 });
};

const selectLeaderScope = async (page, scopeKey) => {
  await page.getByLabel('Active leadership team').selectOption(scopeKey);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction((value) => document.querySelector('[aria-label="Active leadership team"]')?.value === value, scopeKey, { timeout: 30_000 });
};

const assertCombinedLeaderViewIsReadOnly = async (page) => {
  await page.getByText(/Combined team attendance is read-only\./).waitFor({ state: 'visible', timeout: 30_000 });
  assert.equal(await page.getByRole('button', { name: 'Start Leader Batch', exact: true }).count(), 0,
    'A Leader in combined scope must not be offered batch write actions');
};

const assertResponsiveNoHorizontalOverflow = async (page, label) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 900 },
    { width: 1365, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert.equal(fits, true, `${label} should not overflow at ${viewport.width}px`);
  }
};

const enableQrAttendanceInAdminSettings = async ({ page, settingsApiResponses }) => {
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded' });
  try {
    await page.getByRole('button', { name: /Services/ }).click({ timeout: 10_000 });
  } catch (error) {
    const visibleText = await page.locator('body').innerText().catch(() => 'Unable to read page text');
    throw new Error(
      `Admin Settings Services group did not render. URL: ${page.url()}. `
      + `Settings API: ${JSON.stringify(settingsApiResponses)}. `
      + `Visible page text: ${visibleText.slice(-1800)}. Cause: ${error.message}`,
    );
  }
  const settingRow = page.getByText('qr_attendance_enabled', { exact: true }).locator('xpath=../..');
  if (await settingRow.getByText('Enabled', { exact: true }).isVisible().catch(() => false)) return;
  await settingRow.getByText('Disabled', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return url.pathname === '/api/settings' && candidate.request().method() === 'PUT';
    }, { timeout: 30_000 }),
    settingRow.getByRole('button', { name: 'Toggle QR Attendance', exact: true }).click(),
  ]);
  assert.equal(response.status(), 200, 'Admin could not enable QR attendance in Settings');
  await settingRow.getByText('Enabled', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
};

const createMemberQrDownload = async (credentials, label) => {
  const signedIn = await login(credentials, '/portal');
  const { page, context } = signedIn;
  await page.getByRole('button', { name: 'Attendance', exact: true }).click();
  await page.getByRole('button', { name: 'My Attendance QR', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'My Member QR', exact: true });
  await dialog.getByRole('status').waitFor({ state: 'hidden', timeout: 30_000 });
  const createButton = dialog.getByRole('button', { name: 'Create My QR', exact: true });
  if (await createButton.isVisible()) await createButton.click();
  try {
    await dialog.locator('img[alt="Your fixed member attendance QR code"]').waitFor({ state: 'visible', timeout: 30_000 });
  } catch {
    const dialogText = await dialog.innerText({ timeoutMs: 5_000 }).catch(() => 'QR dialog was not rendered');
    throw new Error(`Member QR image was not available for ${label}. Dialog: ${dialogText}. QR API responses: ${signedIn.qrApiResponses.join(', ')}`);
  }

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('link', { name: 'Download PNG', exact: true }).click(),
  ]);
  const source = await download.path();
  assert.ok(source && fs.existsSync(source), `Member QR download failed for ${label}`);
  const target = path.join(tempDir, `${label}-member-qr.png`);
  fs.copyFileSync(source, target);
  return { ...signedIn, pngPath: target };
};

const createAndOpenSession = async (page, targetType, targetId, title, sessionKey) => {
  await page.goto(`${baseUrl}/attendance/qr?target_type=${targetType}&target_id=${targetId}`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Create attendance session', { exact: true }).click();
  await page.getByLabel('Session title').fill(title);
  await page.getByLabel('Session key').fill(sessionKey);
  await page.getByLabel('Activity starts').fill(localDateTime(-30 * 60_000));
  await page.getByLabel('Activity ends').fill(localDateTime(90 * 60_000));
  await page.getByLabel('Check-in opens').fill(localDateTime(-10 * 60_000));
  await page.getByLabel('Check-in closes').fill(localDateTime(45 * 60_000));
  await page.getByLabel('Batch approval deadline').fill(localDateTime(3 * 60 * 60_000));
  await page.getByRole('button', { name: 'Create Draft Session', exact: true }).click();
  await page.getByText('Draft attendance session created. Open it when check-in is ready.', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  const sessionSelect = page.locator('#qr-session-select');
  await sessionSelect.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction(() => {
    const select = document.querySelector('#qr-session-select');
    return Boolean(select?.value);
  }, undefined, { timeout: 30_000 });
  const sessionId = Number(await sessionSelect.inputValue());
  assert.ok(Number.isSafeInteger(sessionId) && sessionId > 0, `No ${targetType} session was selected after creation`);
  await page.getByRole('button', { name: 'Open Check-in', exact: true }).click();
  await page.getByText('Attendance session opened.', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  return sessionId;
};

const openWorkspace = async (page, targetType, targetId, sessionId) => {
  await page.goto(`${baseUrl}/attendance/qr?target_type=${targetType}&target_id=${targetId}&session_id=${sessionId}`, { waitUntil: 'domcontentloaded' });
  try {
    await page.locator('#qr-session-select').waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      path: `${location.pathname}${location.search}`,
      headings: [...document.querySelectorAll('h1, h2')].map((element) => element.innerText.trim().slice(0, 100)),
      alerts: [...document.querySelectorAll('[role="alert"], [role="status"]')]
        .map((element) => element.innerText.trim().slice(0, 160)).filter(Boolean).slice(-8),
      selectorPresent: Boolean(document.querySelector('#qr-session-select')),
    })).catch(() => ({ path: page.url(), headings: [], alerts: [], selectorPresent: false }));
    throw new Error(`QR session selector did not render: ${JSON.stringify({ diagnostics, qrApiResponses: page.qrApiResponses || [] })}. ${error.message}`);
  }
  await page.waitForFunction((id) => document.querySelector('#qr-session-select')?.value === String(id), sessionId, { timeout: 30_000 });
  await page.locator('.qr-session-status').filter({ hasText: 'open' }).waitFor({ state: 'visible', timeout: 30_000 });
};

const assertCameraStarts = async (page) => {
  await page.getByRole('button', { name: 'Scan Member QR', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Scan Member QR', exact: true });
  await dialog.getByRole('button', { name: 'Start Camera', exact: true }).click();
  await dialog.getByText('Camera is ready. Hold the QR code in the frame.', { exact: true })
    .waitFor({ state: 'visible', timeout: 20_000 });

  const video = await dialog.locator('video[aria-label="Camera QR preview"]').evaluate((element) => ({
    width: element.videoWidth,
    height: element.videoHeight,
    tracks: element.srcObject?.getVideoTracks?.().map((track) => track.readyState) || [],
  }));
  assert.ok(video.width > 0 && video.height > 0, 'Camera preview should have live video dimensions');
  assert.ok(video.tracks.includes('live'), 'Camera preview should retain a live video track');

  await dialog.getByRole('button', { name: 'Close scanner', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 15_000 });
};

const assertConfirmedCount = async (page, expected) => {
  const confirmedValue = page.locator('.qr-summary-tile').filter({ hasText: 'Confirmed' }).locator('strong');
  await confirmedValue.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction((count) => {
    const tile = [...document.querySelectorAll('.qr-summary-tile')].find((item) => item.textContent?.includes('Confirmed'));
    return tile?.querySelector('strong')?.textContent?.trim() === String(count);
  }, expected, { timeout: 30_000 });
};

const uploadImage = async (page, buttonName, imagePath) => {
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  const scannerDialog = page.getByRole('dialog').last();
  const fileInput = scannerDialog.getByLabel(/Upload QR Image/i);
  await fileInput.waitFor({ state: 'attached', timeout: 15_000 });
  await fileInput.setInputFiles(imagePath);
};

const directCheckIn = async (page, member, imagePath) => {
  await uploadImage(page, 'Scan Member QR', imagePath);
  await page.getByText('Ready to check in', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('button', { name: 'Confirm Check-in', exact: true }).click();
  await page.getByText(`${member.firstName} ${member.lastName} is checked in.`, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
};

const captureAndDownloadBatch = async (page, member, imagePath, label, apiResponses) => {
  await page.getByRole('button', { name: 'Start Leader Batch', exact: true }).click();
  await page.getByRole('button', { name: 'Scan Member into Draft', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  await uploadImage(page, 'Scan Member into Draft', imagePath);
  try {
    await page.getByText(`${member.firstName} ${member.lastName} saved as pending.`, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    const visibleText = await page.locator('body').innerText().catch(() => 'Unable to read page text');
    throw new Error(
      `${label} leader could not capture ${member.firstName} ${member.lastName}. API: ${apiResponses.join(', ')}. `
      + `Visible page text: ${visibleText.slice(-2000)}. Cause: ${error.message}`,
    );
  }
  await page.getByRole('button', { name: 'Submit Batch for Review', exact: true }).click();
  await page.getByText('Batch submitted. Registration Team must scan or open it and approve the attendance.', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('link', { name: 'Download Batch QR', exact: true }).click(),
  ]);
  const source = await download.path();
  assert.ok(source && fs.existsSync(source), `Batch QR download failed for ${label}`);
  const target = path.join(tempDir, `${label}-batch-qr.png`);
  fs.copyFileSync(source, target);
  return target;
};

const scanAndApproveBatch = async (page, imagePath, apiResponses, label) => {
  await uploadImage(page, 'Scan Leader Batch QR', imagePath);
  try {
    await page.getByRole('heading', { name: /Review Batch #/ }).waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    const visibleText = await page.locator('body').innerText().catch(() => 'Unable to read page text');
    throw new Error(
      `${label} batch QR did not open for review. API: ${apiResponses.join(', ')}. `
      + `Visible page text: ${visibleText.slice(-2500)}. Cause: ${error.message}`,
    );
  }
  await page.getByRole('button', { name: 'Approve Attendance', exact: true }).click();
  await page.getByText('Approved: 1 new check-ins, 0 already confirmed.', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
};

try {
  const admin = await login(fixture.admin, '/dashboard');
  await enableQrAttendanceInAdminSettings(admin);
  const serviceSessionId = await createAndOpenSession(admin.page, 'service', fixture.service.id, `Browser E2E Service ${runSuffix}`, `primary-${runSuffix}`);
  const eventSessionId = await createAndOpenSession(admin.page, 'event', fixture.event.id, `Browser E2E Event ${runSuffix}`, `browser-e2e-${runSuffix}`);
  if (process.env.QR_E2E_REUSE_LEADER !== 'true') {
    await createUnifiedLeaderFromAdmin(admin.page, fixture);
  }
  await admin.context.close();

  const memberA = await createMemberQrDownload(fixture.members.direct, 'direct');
  const memberASecondDevice = await createMemberQrDownload(fixture.members.direct, 'direct-second-device');
  assert.equal(
    createHash('sha256').update(fs.readFileSync(memberA.pngPath)).digest('hex'),
    createHash('sha256').update(fs.readFileSync(memberASecondDevice.pngPath)).digest('hex'),
    'A returning member must receive the same fixed QR image on a fresh browser context',
  );
  const memberB = await createMemberQrDownload(fixture.members.cell, 'cell-leader-member');
  const memberC = await createMemberQrDownload(fixture.members.group, 'group-leader-member');
  const memberD = await createMemberQrDownload(fixture.members.unified, 'unified-leader-member');
  await memberASecondDevice.context.close();
  await memberB.context.close();
  await memberC.context.close();

  const registration = await login(fixture.registration, '/dashboard');
  await openWorkspace(registration.page, 'service', fixture.service.id, serviceSessionId);
  await assertCameraStarts(registration.page);
  await directCheckIn(registration.page, fixture.members.direct, memberA.pngPath);
  await assertConfirmedCount(registration.page, 1);

  const cellLeader = await login(fixture.cellLeader, '/dashboard');
  await openWorkspace(cellLeader.page, 'service', fixture.service.id, serviceSessionId);
  const serviceBatchPng = await captureAndDownloadBatch(cellLeader.page, fixture.members.cell, memberB.pngPath, 'service', cellLeader.qrApiResponses);
  await cellLeader.context.close();
  await openWorkspace(registration.page, 'service', fixture.service.id, serviceSessionId);
  await scanAndApproveBatch(registration.page, serviceBatchPng, registration.qrApiResponses, 'Service');
  await assertConfirmedCount(registration.page, 2);

  const forcedLeader = await login(
    fixture.unifiedLeader,
    process.env.QR_E2E_REUSE_LEADER === 'true' ? '/dashboard' : '/force-change-password',
  );
  if (process.env.QR_E2E_REUSE_LEADER !== 'true') {
    await completeForcedPasswordChange(forcedLeader, fixture.password);
  }
  const unifiedLeader = forcedLeader;
  await unifiedLeader.page.setViewportSize({ width: 390, height: 844 });
  await unifiedLeader.page.goto(`${baseUrl}/leader/teams`, { waitUntil: 'domcontentloaded' });
  await unifiedLeader.page.getByRole('heading', { name: 'My Teams', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  await unifiedLeader.page.getByLabel('Active leadership team').waitFor({ state: 'visible', timeout: 15_000 });
  await assertResponsiveNoHorizontalOverflow(unifiedLeader.page, 'Leader team page');
  await unifiedLeader.page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(unifiedLeader.page, 'service', fixture.service.id, serviceSessionId);
  assert.equal(await unifiedLeader.page.getByLabel('Active leadership team').inputValue(), 'all');
  await assertCombinedLeaderViewIsReadOnly(unifiedLeader.page);
  await assertResponsiveNoHorizontalOverflow(unifiedLeader.page, 'Combined QR attendance workspace');
  await unifiedLeader.page.setViewportSize({ width: 390, height: 844 });
  await selectLeaderScope(unifiedLeader.page, `cell_group:${fixture.leaderScopes.cellGroupId}`);
  await openWorkspace(unifiedLeader.page, 'service', fixture.service.id, serviceSessionId);
  const unifiedServiceBatch = await captureAndDownloadBatch(
    unifiedLeader.page,
    fixture.members.unified,
    memberD.pngPath,
    'unified-service',
    unifiedLeader.qrApiResponses,
  );
  assert.ok(unifiedLeader.leaderScopeHeaders.includes(`cell_group:${fixture.leaderScopes.cellGroupId}`),
    'Selected cell-group scope must be sent with API requests');
  await openWorkspace(registration.page, 'service', fixture.service.id, serviceSessionId);
  await scanAndApproveBatch(registration.page, unifiedServiceBatch, registration.qrApiResponses, 'Unified Leader Service');
  await assertConfirmedCount(registration.page, 3);

  await openWorkspace(registration.page, 'event', fixture.event.id, eventSessionId);
  await directCheckIn(registration.page, fixture.members.direct, memberASecondDevice.pngPath);
  await assertConfirmedCount(registration.page, 1);

  const groupLeader = await login(fixture.groupLeader, '/dashboard');
  await openWorkspace(groupLeader.page, 'event', fixture.event.id, eventSessionId);
  const eventBatchPng = await captureAndDownloadBatch(groupLeader.page, fixture.members.group, memberC.pngPath, 'event', groupLeader.qrApiResponses);
  await groupLeader.context.close();
  await openWorkspace(registration.page, 'event', fixture.event.id, eventSessionId);
  await scanAndApproveBatch(registration.page, eventBatchPng, registration.qrApiResponses, 'Event');
  await assertConfirmedCount(registration.page, 2);

  await selectLeaderScope(unifiedLeader.page, `member_group:${fixture.leaderScopes.groupId}`);
  await openWorkspace(unifiedLeader.page, 'event', fixture.event.id, eventSessionId);
  const unifiedEventBatch = await captureAndDownloadBatch(
    unifiedLeader.page,
    fixture.members.cell,
    memberB.pngPath,
    'unified-event',
    unifiedLeader.qrApiResponses,
  );
  assert.ok(unifiedLeader.leaderScopeHeaders.includes(`member_group:${fixture.leaderScopes.groupId}`),
    'Selected group scope must be sent with API requests');
  await openWorkspace(registration.page, 'event', fixture.event.id, eventSessionId);
  await scanAndApproveBatch(registration.page, unifiedEventBatch, registration.qrApiResponses, 'Unified Leader Event');
  await assertConfirmedCount(registration.page, 3);
  await registration.context.close();

  await selectLeaderScope(unifiedLeader.page, 'all');
  await openWorkspace(unifiedLeader.page, 'event', fixture.event.id, eventSessionId);
  await assertCombinedLeaderViewIsReadOnly(unifiedLeader.page);
  await assertConfirmedCount(unifiedLeader.page, 3);
  assert.ok(unifiedLeader.leaderScopeHeaders.includes('all'), 'Combined read-only scope must be sent with API requests');
  await selectLeaderScope(unifiedLeader.page, 'all');
  await openWorkspace(unifiedLeader.page, 'service', fixture.service.id, serviceSessionId);
  await assertCombinedLeaderViewIsReadOnly(unifiedLeader.page);
  await assertConfirmedCount(unifiedLeader.page, 3);
  await unifiedLeader.context.close();

  await memberA.page.reload({ waitUntil: 'domcontentloaded' });
  await memberA.page.getByRole('button', { name: 'Attendance', exact: true }).click();
  try {
    await memberA.page.locator('tr').filter({ hasText: fixture.event.title }).last().waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    const visibleText = await memberA.page.locator('body').innerText().catch(() => 'Unable to read page text');
    throw new Error(
      `Event attendance history did not render. API: ${JSON.stringify(memberA.historyApiResponses)}. `
      + `Visible page text: ${visibleText.slice(-2500)}. Cause: ${error.message}`,
    );
  }
  await memberA.page.locator('tr').filter({ hasText: fixture.service.title }).last().waitFor({ state: 'visible', timeout: 30_000 });

  const logoutResponsePromise = memberA.page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/auth/logout' && response.request().method() === 'POST';
  }, { timeout: 30_000 });
  await memberA.page.getByRole('button', { name: /Sign Out|Logout/i }).last().click();
  const logoutResponse = await logoutResponsePromise;
  assert.equal(logoutResponse.status(), 200, 'Member logout should revoke the authenticated session');
  await memberA.page.waitForURL((url) => url.pathname === '/login', { timeout: 30_000 });
  await memberA.page.goto(`${baseUrl}/portal`, { waitUntil: 'domcontentloaded' });
  await memberA.page.waitForURL((url) => url.pathname === '/login', { timeout: 30_000 });

  assert.deepEqual(browserErrors, [], `Browser errors: ${browserErrors.join('; ')}`);
  console.log('QR browser E2E passed: fake-camera startup, fixed member QR upload, Service/Event direct check-in, scoped leader batches, approval, counts, member history, logout, and protected-route redirect.');
} catch (error) {
  console.error('QR browser E2E failed:', error.stack || error.message);
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close().catch(() => {});
  fs.rmSync(tempDir, { recursive: true, force: true });
}
