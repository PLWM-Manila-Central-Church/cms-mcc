import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.UI_BASE_URL || 'http://localhost:3000';
const HEADED = process.env.UI_HEADED === '1';

const roleUrl = (role, route) =>
  `${BASE}/role-review.html?role=${encodeURIComponent(role)}&embedded=1#${route}`;

const browser = await chromium.launch({
  channel: 'chrome',
  headless: !HEADED,
  slowMo: HEADED ? 80 : 0,
});

const results = [];

async function runSuite(name, role, route, fn) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => pageErrors.push(String(err.message)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 240));
  });

  let status = 'PASS';
  let detail = null;
  try {
    await page.goto(roleUrl(role, route), { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(900);
    await fn(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 2, `Horizontal overflow ${overflow}px on ${name}`);
    assert.equal(pageErrors.length, 0, `Page errors on ${name}: ${pageErrors.join('; ')}`);
  } catch (err) {
    status = 'FAIL';
    detail = String(err.message || err);
  } finally {
    results.push({ name, role, route, status, detail, consoleErrors: consoleErrors.slice(0, 3) });
    await context.close();
  }
}

// 1. Header & My Settings controls + integer constraint
await runSuite('Header & My Settings Controls', 'System Admin', '/dashboard', async (page) => {
  await page.getByRole('button', { name: /Language:/i }).click();
  await page.getByRole('button', { name: 'Notifications' }).click();
  await page.getByRole('button', { name: 'My Settings' }).click();
  await page.waitForTimeout(400);
  const sizeInput = page.locator('#staff-preference-size');
  await sizeInput.waitFor({ state: 'visible', timeout: 5000 });
  await sizeInput.fill('');
  await sizeInput.type('18e-.abc');
  assert.equal(await sizeInput.inputValue(), '18', 'Font size should reject non-digits');
});

// 2. Members directory, Member Form & Emergency Contact character restrictions
await runSuite('Members Directory & Form Constraints', 'System Admin', '/members', async (page) => {
  await page.getByRole('button', { name: 'Search' }).click();
  assert.ok(await page.getByRole('button', { name: 'View' }).count() > 0);
  assert.ok(await page.getByRole('button', { name: 'Edit' }).count() > 0);

  await page.getByRole('button', { name: '+ Add Member' }).click();
  const firstName = page.locator('#member-first_name');
  await firstName.waitFor({ state: 'visible', timeout: 5000 });
  await firstName.type('Juan123!@#');
  assert.equal(await firstName.inputValue(), 'Juan', 'First name should reject digits and symbols');

  const lastName = page.locator('#member-last_name');
  await lastName.type('dela456$%^ Cruz');
  assert.equal(await lastName.inputValue(), 'dela Cruz', 'Last name should reject digits and symbols');

  const phone = page.locator('#member-phone');
  await phone.type('abc+63 (917) 123-4567xyz!');
  assert.equal(await phone.inputValue(), '+63 (917) 123-4567', 'Phone should reject letters and invalid symbols');
});

await runSuite('Member Profile Emergency Contact Constraints', 'System Admin', '/members/1', async (page) => {
  const addBtn = page.getByRole('button', { name: '+ Add' });
  await addBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addBtn.click();

  const ecName = page.getByPlaceholder('Full Name *');
  await ecName.type('Maria999!@#');
  assert.equal(await ecName.inputValue(), 'Maria', 'Emergency contact name should strip digits/symbols');

  const ecRel = page.getByPlaceholder('Relationship *');
  await ecRel.type('Sister-in-law 123!');
  assert.equal(await ecRel.inputValue(), 'Sister-in-law ', 'Relationship should strip digits/symbols');

  const ecPhone = page.getByPlaceholder('Phone Number *');
  await ecPhone.type('abc0917-555-0199xyz');
  assert.equal(await ecPhone.inputValue(), '0917-555-0199', 'Emergency contact phone should strip letters');
});

// 3. Users table icon actions & UserFormPage constraints
await runSuite('Users Table & User Form Constraints', 'System Admin', '/users', async (page) => {
  assert.ok(await page.getByRole('button', { name: 'Edit' }).count() >= 1);
  assert.ok(await page.getByRole('button', { name: /Deactivate|Activate/ }).count() >= 1);
  await page.getByRole('button', { name: 'Archive' }).first().click();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: '+ Add User' }).click();
  const firstName = page.locator('#userformpage-first_name');
  await firstName.waitFor({ state: 'visible', timeout: 5000 });
  await firstName.type('Pedro987!@#');
  assert.equal(await firstName.inputValue(), 'Pedro');

  const phone = page.locator('#userformpage-phone');
  await phone.type('abc0918-222-3344xyz');
  assert.equal(await phone.inputValue(), '0918-222-3344');
});

// 4. Ministries Hub & Serving Groups tabs, modals, and code/age constraints
await runSuite('Ministries Hub Tabs & Modal Constraints', 'System Admin', '/ministries', async (page) => {
  for (const tabName of ['Activities & RSVP', 'Announcements & Messages', 'Prayer & Pastoral Care', 'Reports', 'Roster']) {
    await page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
  }
  await page.getByRole('button', { name: /New Ministry/i }).click();
  const dialog = page.getByRole('dialog', { name: 'New Ministry' });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });

  const codeInput = dialog.getByPlaceholder('e.g. YA, HS, MEN');
  await codeInput.type('ya-min!@# 1');
  assert.equal(await codeInput.inputValue(), 'YA-MIN1', 'Short code should normalize to uppercase alphanumeric');

  const minAgeInput = dialog.locator('input[type="number"]').first();
  await minAgeInput.type('18e-.abc');
  assert.equal(await minAgeInput.inputValue(), '18');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
});

await runSuite('Serving Groups Tabs & Modal Constraints', 'System Admin', '/groups', async (page) => {
  for (const tabName of ['Volunteers', 'Activities', 'Tasks', 'Positions & Roles']) {
    const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
    if (await tab.count()) await tab.click();
  }
  await page.getByRole('button', { name: /New Group \/ Team/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Create Serving Group' });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  const codeInput = dialog.getByPlaceholder('e.g. TECH, USHER');
  await codeInput.type('tech_1!@# ');
  assert.equal(await codeInput.inputValue(), 'TECH_1');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
});

// 5. Events & Event Workspace tabs and constraints
await runSuite('Events Form & Card Actions', 'System Admin', '/events', async (page) => {
  await page.getByRole('button', { name: '+ New Event' }).click();
  const capInput = page.getByPlaceholder('Optional', { exact: true });
  await capInput.waitFor({ state: 'visible', timeout: 5000 });
  await capInput.type('250e-.abc');
  assert.equal(await capInput.inputValue(), '250');

  const parkInput = page.getByPlaceholder('Not specified', { exact: true });
  await parkInput.type('40e-.abc');
  assert.equal(await parkInput.inputValue(), '40');
  await page.getByRole('button', { name: 'Cancel' }).first().click();

  assert.ok(await page.getByRole('button', { name: 'View' }).count() >= 1);
  assert.ok(await page.getByRole('button', { name: 'Edit' }).count() >= 1);
});

await runSuite('Event Workspace All Tabs & Constraints', 'System Admin', '/events/1', async (page) => {
  const inCharge = page.getByPlaceholder('In-charge');
  await inCharge.waitFor({ state: 'visible', timeout: 5000 });
  await inCharge.type('Pastor123!@#');
  assert.equal(await inCharge.inputValue(), 'Pastor');

  await page.getByRole('tab', { name: /Budget & Advances/i }).click();
  const recipient = page.getByPlaceholder('Recipient coordinator name');
  await recipient.type('Coordinator99!@#');
  assert.equal(await recipient.inputValue(), 'Coordinator');
  const advAmount = page.getByPlaceholder('Advance amount (PHP)');
  await advAmount.type('1500.559');
  assert.equal(await advAmount.inputValue(), '1500.55');

  await page.getByRole('tab', { name: /Liquidation & Posting/i }).click();
  const orNum = page.getByPlaceholder('OR / Receipt #');
  await orNum.type('OR#2026-01<>!');
  assert.equal(await orNum.inputValue(), 'OR#2026-01');

  await page.getByRole('tab', { name: /Resources/i }).click();
  await page.getByRole('tab', { name: /Completion Checklist & Report/i }).click();
});

// 6. Services & ServicePlannerPanel
await runSuite('Services Form & Planner Panel Constraints', 'System Admin', '/services', async (page) => {
  await page.getByRole('button', { name: '+ New Service' }).click();
  const cap = page.locator('#servicespage-capacity');
  await cap.waitFor({ state: 'visible', timeout: 5000 });
  await cap.type('300e-.abc');
  assert.equal(await cap.inputValue(), '300');
  await page.getByRole('button', { name: 'Cancel' }).first().click();

  const minister = page.getByPlaceholder('Assigned minister / lead');
  await minister.type('Elder123!@#');
  assert.equal(await minister.inputValue(), 'Elder');

  await page.getByRole('button', { name: /Servants & Conflicts/i }).click();
  await page.getByRole('button', { name: /Recurring Rules/i }).click();
});

// 7. Finance Suite (Giving, Expenses, Funds & Accounts, Approvals, Reports)
await runSuite('Finance Giving Dialog & Statement Constraints', 'System Admin', '/finance', async (page) => {
  await page.getByRole('button', { name: /Add Financial Record/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });

  const giverSearch = dialog.locator('#finance-giver-search');
  await giverSearch.type('Alex123!@#');
  assert.equal(await giverSearch.inputValue(), 'Alex');

  const amount = dialog.getByRole('spinbutton', { name: 'Amount (PHP)' });
  await amount.type('1250.999');
  assert.equal(await amount.inputValue(), '1250.99');

  const receipt = dialog.getByRole('textbox', { name: 'Receipt Number' });
  await receipt.type('OR#2026-99<>!');
  assert.equal(await receipt.inputValue(), 'OR#2026-99');

  await dialog.getByRole('button', { name: 'Cancel' }).click();
});

await runSuite('Finance Expenses & Setup Constraints', 'System Admin', '/finance/expenses', async (page) => {
  await page.getByRole('button', { name: '+ Add expense' }).click();
  const dialog = page.getByRole('dialog', { name: /Add expense/i });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  const amount = dialog.getByRole('spinbutton', { name: 'Amount (PHP)' });
  await amount.type('450.129');
  assert.equal(await amount.inputValue(), '450.12');
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Expense setup' }).click();
  assert.ok(await page.getByRole('button', { name: 'Edit' }).count() >= 1);
  await page.getByRole('button', { name: 'Back to expenses' }).click();
});

await runSuite('Finance Funds & Accounts Constraints', 'System Admin', '/finance/funds', async (page) => {
  const codeInput = page.getByPlaceholder('Code (MISS)');
  await codeInput.waitFor({ state: 'visible', timeout: 5000 });
  await codeInput.type('miss-01!@#');
  assert.equal(await codeInput.inputValue(), 'MISS-01');

  const maskedInput = page.getByPlaceholder(/Masked account #/i);
  await maskedInput.type('BPI ****-4821!@#');
  assert.equal(await maskedInput.inputValue(), '****-4821');

  const trfAmount = page.getByPlaceholder('Amount (PHP)');
  await trfAmount.type('3500.559');
  assert.equal(await trfAmount.inputValue(), '3500.55');
});

await runSuite('Finance Approvals & Reports Modes', 'System Admin', '/finance/approvals', async (page) => {
  const amount = page.getByPlaceholder('Amount (PHP) *');
  await amount.waitFor({ state: 'visible', timeout: 5000 });
  await amount.type('18450.759');
  assert.equal(await amount.inputValue(), '18450.75');
  assert.ok(await page.getByRole('button', { name: 'Approve' }).count() >= 1);
  assert.ok(await page.getByRole('button', { name: 'Reject' }).count() >= 1);
});

await runSuite('Finance Reports & Unified Ledger', 'System Admin', '/finance/reports', async (page) => {
  for (const label of ['Detailed Expense Transactions', 'Annual Expense Summary', 'Expenses by Ministry', 'Expenses by Event', 'Monthly Category Breakdown']) {
    await page.getByRole('button', { name: label }).click();
  }
});

// 8. Cell Groups, Inventory, Archives, Outreach, Bible Reading, Ministry Schedules
await runSuite('Cell Groups & Meetings Constraints', 'System Admin', '/cell-groups', async (page) => {
  const scripture = page.getByPlaceholder('Scripture (e.g. John 15)');
  await scripture.waitFor({ state: 'visible', timeout: 5000 });
  await scripture.type('John 15:1-12 @#$');
  assert.equal(await scripture.inputValue(), 'John 15:1-12 ');

  const attendees = page.getByPlaceholder('Attendees');
  await attendees.type('24e-.abc');
  assert.equal(await attendees.inputValue(), '24');
});

await runSuite('Inventory Items & Asset Operations Constraints', 'System Admin', '/inventory', async (page) => {
  await page.getByRole('button', { name: '+ Add Item' }).click();
  const unitInput = page.getByPlaceholder('pcs, sets, boxes...');
  await unitInput.waitFor({ state: 'visible', timeout: 5000 });
  await unitInput.type('pcs123!@#');
  assert.equal(await unitInput.inputValue(), 'pcs');
  await page.getByRole('button', { name: /Cancel/i }).first().click();

  const deltaInput = page.getByPlaceholder('+Stock In / -Out');
  await deltaInput.type('-15a.4');
  assert.equal(await deltaInput.inputValue(), '-154');

  await page.getByRole('button', { name: /Borrowing/i }).click();
  const borrower = page.getByPlaceholder('Borrower name *');
  await borrower.type('Juan123!@#');
  assert.equal(await borrower.inputValue(), 'Juan');

  await page.getByRole('button', { name: /Maintenance/i }).click();
  await page.getByRole('button', { name: /Valuation & Summary/i }).click();
});

await runSuite('Archives Categories & Detail Actions', 'System Admin', '/archives', async (page) => {
  await page.getByRole('button', { name: 'Manage categories' }).click();
  const dialog = page.getByRole('dialog', { name: 'Archive categories' });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  await dialog.getByRole('button', { name: 'Close category manager' }).click();

  await page.getByText('2026 Church Annual Minutes').click();
  assert.ok(await page.getByRole('button', { name: 'Edit' }).count() >= 1);
  assert.ok(await page.getByRole('button', { name: 'Archive record' }).count() >= 1);
});

await runSuite('Outreach Campaigns & Budget Constraint', 'System Admin', '/outreach', async (page) => {
  await page.getByRole('tab', { name: 'Campaigns' }).click();
  await page.getByRole('button', { name: 'New notification' }).click();
  const dialog = page.getByRole('dialog', { name: 'New notification' });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  const budgetCap = dialog.getByPlaceholder('Auto');
  await budgetCap.type('500.789');
  assert.equal(await budgetCap.inputValue(), '500.78');
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
});

await runSuite('Bible Reading & Ministry Schedules Constraints', 'System Admin', '/bible-reading', async (page) => {
  const refInput = page.getByRole('textbox', { name: 'Reference' });
  await refInput.waitFor({ state: 'visible', timeout: 5000 });
  await refInput.type('Psalm 23:1-6 @#$');
  assert.equal(await refInput.inputValue(), 'Psalm 23:1-6 ');
  assert.ok(await page.getByRole('button', { name: 'Remove' }).count() >= 1);
});

// 9. All Remaining 8 Roles Interactive Verification
for (const [role, route] of [
  ['Pastor', '/dashboard'],
  ['Registration Team', '/attendance/qr'],
  ['Finance Team', '/finance'],
  ['Ministry Leader', '/ministry'],
  ['Cell Leader', '/cell-groups'],
  ['Group Leader', '/members'],
  ['Combined Leader', '/leader/teams'],
  ['Member', '/portal?tab=ministries'],
]) {
  await runSuite(`Role Workspace: ${role}`, role, route, async (page) => {
    const text = await page.locator('body').innerText();
    assert.ok(!/something went wrong|application error/i.test(text), `Error rendered for ${role}`);
    if (role === 'Member') {
      await page.getByRole('button', { name: 'yes' }).first().click();
      await page.getByPlaceholder('Send a note to your leader…').fill('Thank you for the reminder!');
      await page.getByRole('button', { name: 'Send' }).click();
    }
  });
}

await browser.close();

const failed = results.filter((r) => r.status !== 'PASS');
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length > 0) process.exit(1);
