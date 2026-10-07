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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcc-qr-browser-e2e-'));
const browserErrors = [];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
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
    viewport: { width: 1365, height: 900 },
  });
  contexts.push(context);
  const page = await context.newPage();
  const qrApiResponses = [];
  logPageErrors(page, credentials.email);
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.includes('/attendance-qr')) qrApiResponses.push(`${response.status()} ${url.pathname}`);
  });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === destination, { timeout: 45_000 }),
    page.getByRole('button', { name: /Sign In/ }).click(),
  ]);
  return { context, page, qrApiResponses };
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
  const sessionId = Number(await sessionSelect.inputValue());
  assert.ok(Number.isSafeInteger(sessionId) && sessionId > 0, `No ${targetType} session was selected after creation`);
  await page.getByRole('button', { name: 'Open Check-in', exact: true }).click();
  await page.getByText('Attendance session opened.', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  return sessionId;
};

const openWorkspace = async (page, targetType, targetId, sessionId) => {
  await page.goto(`${baseUrl}/attendance/qr?target_type=${targetType}&target_id=${targetId}&session_id=${sessionId}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#qr-session-select').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction((id) => document.querySelector('#qr-session-select')?.value === String(id), sessionId, { timeout: 30_000 });
  await page.locator('.qr-session-status').filter({ hasText: 'open' }).waitFor({ state: 'visible', timeout: 30_000 });
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
  const fileInput = page.locator('input[type="file"]').last();
  await fileInput.waitFor({ state: 'attached', timeout: 15_000 });
  await fileInput.setInputFiles(imagePath);
};

const directCheckIn = async (page, member, imagePath) => {
  await uploadImage(page, 'Scan Member QR', imagePath);
  await page.getByText('Ready to check in', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('button', { name: 'Confirm Check-in', exact: true }).click();
  await page.getByText(`${member.firstName} ${member.lastName} is checked in.`, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
};

const captureAndDownloadBatch = async (page, member, imagePath, label) => {
  await page.getByRole('button', { name: 'Start Leader Batch', exact: true }).click();
  await page.getByRole('button', { name: 'Scan Member into Draft', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  await uploadImage(page, 'Scan Member into Draft', imagePath);
  await page.getByText(`${member.firstName} ${member.lastName} saved as pending.`, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
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

const scanAndApproveBatch = async (page, imagePath) => {
  await uploadImage(page, 'Scan Leader Batch QR', imagePath);
  await page.getByRole('heading', { name: /Review Batch #/ }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('button', { name: 'Approve Attendance', exact: true }).click();
  await page.getByText('Approved: 1 new check-ins, 0 already confirmed.', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
};

try {
  const admin = await login(fixture.admin, '/dashboard');
  const serviceSessionId = await createAndOpenSession(admin.page, 'service', fixture.service.id, 'Browser E2E Service', 'primary');
  const eventSessionId = await createAndOpenSession(admin.page, 'event', fixture.event.id, 'Browser E2E Event', 'browser-e2e');
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
  await memberASecondDevice.context.close();
  await memberB.context.close();
  await memberC.context.close();

  const registration = await login(fixture.registration, '/dashboard');
  await openWorkspace(registration.page, 'service', fixture.service.id, serviceSessionId);
  await directCheckIn(registration.page, fixture.members.direct, memberA.pngPath);
  await assertConfirmedCount(registration.page, 1);

  const cellLeader = await login(fixture.cellLeader, '/dashboard');
  await openWorkspace(cellLeader.page, 'service', fixture.service.id, serviceSessionId);
  const serviceBatchPng = await captureAndDownloadBatch(cellLeader.page, fixture.members.cell, memberB.pngPath, 'service');
  await cellLeader.context.close();
  await openWorkspace(registration.page, 'service', fixture.service.id, serviceSessionId);
  await scanAndApproveBatch(registration.page, serviceBatchPng);
  await assertConfirmedCount(registration.page, 2);

  await openWorkspace(registration.page, 'event', fixture.event.id, eventSessionId);
  await directCheckIn(registration.page, fixture.members.direct, memberASecondDevice.pngPath);
  await assertConfirmedCount(registration.page, 1);

  const groupLeader = await login(fixture.groupLeader, '/dashboard');
  await openWorkspace(groupLeader.page, 'event', fixture.event.id, eventSessionId);
  const eventBatchPng = await captureAndDownloadBatch(groupLeader.page, fixture.members.group, memberC.pngPath, 'event');
  await groupLeader.context.close();
  await openWorkspace(registration.page, 'event', fixture.event.id, eventSessionId);
  await scanAndApproveBatch(registration.page, eventBatchPng);
  await assertConfirmedCount(registration.page, 2);
  await registration.context.close();

  await memberA.page.reload({ waitUntil: 'domcontentloaded' });
  await memberA.page.getByRole('button', { name: 'Attendance', exact: true }).click();
  await memberA.page.getByText(fixture.event.title, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  await memberA.page.getByText(fixture.service.title, { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });

  assert.deepEqual(browserErrors, [], `Browser errors: ${browserErrors.join('; ')}`);
  console.log('QR browser E2E passed: fixed member QR upload, Service/Event direct check-in, scoped leader batches, approval, counts, and member history.');
} catch (error) {
  console.error('QR browser E2E failed:', error.stack || error.message);
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close().catch(() => {});
  fs.rmSync(tempDir, { recursive: true, force: true });
}
