"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcrypt");
const sequelize = require("../src/config/db");
const { assertSafeQrTestTarget } = require("./qr-test-target");
const { User, Role, Member, UserLeaderAssignment, SystemSetting } = require("../src/models");
const { QrAttendanceSession, AttendanceExpectedMember, EventAttendance } = require("../src/modules/qr-attendance/models");
const { OutreachSessionPolicy, AttendanceException } = require("../src/modules/outreach/models");
const { DEFAULTS, DAY, reminderWindow } = require("../src/modules/outreach/policy");

(async () => {
  assertSafeQrTestTarget(process.env);
  assert.equal(process.env.QR_ATTENDANCE_BROWSER_E2E, "true");
  assert.notEqual(process.env.SMS_DELIVERY_ENABLED, "true", "No live SMS is authorized");
  const fixturePath = path.resolve(process.env.QR_E2E_FIXTURE_PATH || "");
  assert.ok(fixturePath.startsWith(path.resolve(os.tmpdir()) + path.sep));
  assert.match(path.basename(fixturePath), /^mcc-qr-browser-e2e-qa-[a-z0-9-]+\.json$/i);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.ok(!fixture.outreach, "Use a fresh scoped fixture");
  await sequelize.authenticate();
  const admin = await User.findOne({ where: { email: fixture.admin.email } });
  assert.ok(admin && /^qr-browser-admin-/.test(admin.email));
  const keys = Object.keys(DEFAULTS).map((name) => "outreach_" + name);
  const settings = await SystemSetting.findAll({ where: { key: keys } });
  fixture.createdIds.outreachConfigSnapshot = keys.map((name) => {
    const row = settings.find((setting) => setting.key === name);
    return { key: name, existed: Boolean(row), value: row?.value || null, updated_by: row?.updated_by || null };
  });
  fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2), { mode: 0o600 });
  await SystemSetting.update({ value: "true", updated_by: admin.id }, { where: { key: "qr_attendance_enabled" } });
  const suffix = fixture.service.title.split(" ").pop();
  const memberIds = fixture.createdIds.memberIds;
  const members = await Member.findAll({ where: { id: memberIds }, order: [["id", "ASC"]] });
  assert.equal(members.length, memberIds.length);
  for (let index = 0; index < members.length; index++) await members[index].update({ phone: "+63910000" + String(1000 + index) });
  const leaderRole = await Role.findOne({ where: { role_name: "Leader" } });
  const existingUnified = await User.findOne({ where: { email: fixture.unifiedLeader.email } });
  const unified = existingUnified || await User.create({ email: fixture.unifiedLeader.email, password_hash: await bcrypt.hash(fixture.password, 10),
    role_id: leaderRole.id, member_id: members[members.length - 1].id, is_active: 1, is_deleted: 0, force_password_change: 0 });
  await UserLeaderAssignment.bulkCreate([
    { user_id: unified.id, scope_type: "cell_group", scope_id: fixture.leaderScopes.cellGroupId, is_active: true, assigned_by: admin.id },
    { user_id: unified.id, scope_type: "member_group", scope_id: fixture.leaderScopes.groupId, is_active: true, assigned_by: admin.id },
  ], { ignoreDuplicates: true });
  const now = new Date();
  const series = "qa_" + suffix.replaceAll("-", "_");
  const createSession = async (label, startsAt, ids, finalized = true) => {
    const session = await QrAttendanceSession.create({
      event_id: fixture.event.id, session_key: label + "_" + suffix, title: "QA Outreach " + label + " " + suffix,
      starts_at: startsAt, ends_at: new Date(startsAt.getTime() + 3600000), check_in_opens_at: new Date(startsAt.getTime() - 3600000),
      check_in_closes_at: new Date(startsAt.getTime() + 3600000), approval_deadline: new Date(startsAt.getTime() + 2 * 3600000),
      status: finalized ? "closed" : "draft", expected_basis: "explicit_roster", expected_roster_frozen_at: finalized ? startsAt : null,
      capture_closed_at: finalized ? new Date(startsAt.getTime() + 3600000) : null,
      finalized_at: finalized ? new Date(startsAt.getTime() + 2 * 3600000) : null,
      finalized_by: finalized ? admin.id : null, finalized_revision: finalized ? 1 : null, activity_revision: 1,
      created_by: admin.id,
    });
    await AttendanceExpectedMember.bulkCreate(ids.map((memberId) => {
      const member = members.find((row) => Number(row.id) === Number(memberId));
      return { session_id: session.id, member_id: member.id, source: "staff_added", cell_group_id_at_freeze: member.cell_group_id, group_id_at_freeze: member.group_id, created_at: now };
    }));
    return session;
  };
  const first = await createSession("First gathering", new Date(now.getTime() - 14 * DAY), memberIds);
  const second = await createSession("Second gathering", new Date(now.getTime() - 7 * DAY), memberIds.slice(0, 4));
  await OutreachSessionPolicy.bulkCreate([first, second].map((session) => ({ session_id: session.id, followups_enabled: true, series_key: series, updated_by: admin.id })));
  await EventAttendance.create({
    session_id: first.id, member_id: memberIds[1], check_in_method: "manual", entry_source: "direct",
    checked_in_at: first.starts_at, confirmed_at: first.starts_at, recorded_by: admin.id, confirmed_by: admin.id,
    cell_group_id_at_check_in: members[1].cell_group_id, group_id_at_check_in: members[1].group_id,
  });
  await AttendanceException.bulkCreate([
    { session_id: first.id, member_id: memberIds[2], status: "excused", reason: "QA excused absence", updated_by: admin.id },
    { session_id: second.id, member_id: memberIds[3], status: "pending", reason: "QA awaiting attendance review", updated_by: admin.id },
  ]);
  const reminder = await createSession("Reminder gathering", new Date(now.getTime() + 3 * DAY), memberIds.slice(0, 2), false);
  const due = reminderWindow(reminder, 3, 9).due;
  await OutreachSessionPolicy.create({ session_id: reminder.id, reminders_enabled: true, reminders_enabled_at: new Date(due.getTime() - 60000), series_key: series + "_reminder", updated_by: admin.id });
  for (const [name, value] of Object.entries(DEFAULTS)) {
    const nextValue = name === "enabled" ? true : name === "mode" ? "disabled" : value;
    const [setting] = await SystemSetting.findOrCreate({ where: { key: "outreach_" + name }, defaults: { value: JSON.stringify(nextValue), updated_by: admin.id } });
    await setting.update({ value: JSON.stringify(nextValue), updated_by: admin.id });
  }
  fixture.outreach = { series, firstSessionId: first.id, secondSessionId: second.id, reminderSessionId: reminder.id, adminUserId: admin.id,
    memberIds, reminderTestClock: new Date(due.getTime() + 60000).toISOString(), sms_delivery_enabled: false };
  fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2), { mode: 0o600 });
  console.log("Prepared scoped outreach fixtures in qr_attendance_qa. Live SMS remains disabled.");
})().catch((error) => { console.error("Outreach fixture setup failed: " + (error.code || error.message)); process.exitCode = 1; })
  .finally(() => sequelize.close());
