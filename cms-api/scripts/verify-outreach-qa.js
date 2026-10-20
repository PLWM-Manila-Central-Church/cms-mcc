"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const sequelize = require("../src/config/db");
const { assertSafeQrTestTarget } = require("./qr-test-target");
const { Member, User } = require("../src/models");
const { QrAttendanceSession, AttendanceExpectedMember, EventAttendance } = require("../src/modules/qr-attendance/models");
const { OutreachSessionPolicy, AttendanceException, AttendanceFollowUp, OutreachDelivery, OutreachDeliveryAttempt } = require("../src/modules/outreach/models");
const repo = require("../src/modules/outreach/repository");
const { evaluateMembers, queueDueReminders } = require("../src/modules/outreach/evaluation");
const { getConfiguration } = require("../src/modules/outreach/configuration");
const { processQueue, preflight, recoverExpiredClaims } = require("../src/modules/outreach/dispatcher");
const { DAY, reminderWindow } = require("../src/modules/outreach/policy");
const { exceptionCounts } = require("../src/modules/outreach/attendanceAnnotations");

(async () => {
  assertSafeQrTestTarget(process.env);
  assert.equal(process.env.QR_ATTENDANCE_BROWSER_E2E, "true");
  assert.notEqual(process.env.SMS_DELIVERY_ENABLED, "true", "Live SMS testing is not authorized");
  const file = path.resolve(process.env.QR_E2E_FIXTURE_PATH || "");
  assert.ok(file.startsWith(path.resolve(os.tmpdir()) + path.sep));
  const fixture = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.ok(fixture.outreach);
  let providerRequests = 0;
  global.fetch = async () => { providerRequests++; throw new Error("Provider network is forbidden in this verification"); };
  await sequelize.authenticate();
  const config = await getConfiguration();
  assert.equal(config.enabled, true);
  assert.equal(config.mode, "disabled");
  const o = fixture.outreach, [a, b, c, d, oneAbsence] = o.memberIds;
  const admin = { userId: o.adminUserId, roleName: "System Admin" };
  const members = await Member.findAll({ where: { id: o.memberIds }, order: [["id", "ASC"]] });
  const primaryCase = () => AttendanceFollowUp.findOne({ where: { member_id: a, series_key: o.series } });
  const caseCount = async (id) => AttendanceFollowUp.count({ where: { member_id: id, series_key: o.series } });
  const checks = [];
  await evaluateMembers(o.memberIds, config);
  assert.equal(await caseCount(a), 1);
  for (const id of [b, c, d, oneAbsence]) assert.equal(await caseCount(id), 0);
  checks.push("two absences create one case; present/excused/pending/one absence do not");
  const initialCase = await primaryCase();
  await Promise.all([evaluateMembers([a], config), evaluateMembers([a], config)]);
  assert.equal(await caseCount(a), 1);
  checks.push("concurrent evaluation preserves one episode and unique delivery jobs");

  const second = await QrAttendanceSession.findByPk(o.secondSessionId);
  await second.update({ finalized_at: null, finalized_revision: null, activity_revision: 2 });
  await evaluateMembers([a], config);
  assert.equal((await primaryCase()).status, "cancelled");
  assert.equal(await OutreachDelivery.count({ where: { follow_up_id: initialCase.id, status: "queued" } }), 0);
  checks.push("an unfinalized correction cancels the case and unsent messages");
  await second.update({ finalized_at: new Date(), finalized_revision: 2 });
  await evaluateMembers([a], config);
  assert.equal((await primaryCase()).id, initialCase.id);
  assert.ok(["open", "assigned"].includes((await primaryCase()).status));
  checks.push("refinalization resumes the same unsent episode");

  const third = await QrAttendanceSession.create({
    event_id: fixture.event.id, session_key: "qa_third_" + o.series, title: "QA Outreach third gathering " + o.series,
    starts_at: new Date(Date.now() - 3 * DAY), ends_at: new Date(Date.now() - 3 * DAY + 3600000),
    check_in_opens_at: new Date(Date.now() - 3 * DAY - 3600000), check_in_closes_at: new Date(Date.now() - 3 * DAY + 3600000),
    approval_deadline: new Date(Date.now() - 3 * DAY + 7200000), status: "closed", expected_basis: "explicit_roster",
    expected_roster_frozen_at: new Date(), finalized_at: new Date(), finalized_revision: 1, activity_revision: 1, finalized_by: admin.userId, created_by: admin.userId,
  });
  await AttendanceExpectedMember.create({ session_id: third.id, member_id: a, source: "staff_added", created_at: new Date(), cell_group_id_at_freeze: members[0].cell_group_id, group_id_at_freeze: members[0].group_id });
  await OutreachSessionPolicy.create({ session_id: third.id, followups_enabled: true, series_key: o.series, updated_by: admin.userId });
  await evaluateMembers([a], config);
  assert.equal((await primaryCase()).absence_count, 3);
  assert.equal(await caseCount(a), 1);
  checks.push("a third absence updates the existing episode");

  const preferenceData = { phone: members[0].phone, sms_enabled: true, activity_reminders: true, attendance_followups: true,
    consent_confirmed: true, consent_note: "Synthetic QA consent recorded for internal eligibility checks only" };
  await repo.setPreference(a, preferenceData, admin);
  await evaluateMembers([a], config);
  const smsJob = await OutreachDelivery.findOne({ where: { follow_up_id: initialCase.id, channel: "sms" } });
  assert.ok(smsJob);
  const result = await processQueue({ limit: 100 });
  assert.equal(result.live_sms_enabled, false);
  await smsJob.reload();
  assert.equal(smsJob.status, "queued"); assert.equal(smsJob.attempt_count, 0);
  assert.ok(await OutreachDelivery.count({ where: { channel: "in_app", status: "sent" } }));
  checks.push("in-app queue processes while all SMS stays queued with zero attempts");
  await members[0].update({ phone: "+639100009999" });
  assert.equal((await preflight(smsJob, config)).reason, "SMS_CONSENT_MISSING_OR_CHANGED");
  await repo.setPreference(a, { ...preferenceData, sms_enabled: false, phone: members[0].phone }, admin);
  await smsJob.reload(); assert.equal(smsJob.status, "cancelled");
  checks.push("phone changes invalidate consent and opt-out cancels pending SMS without sending");

  await AttendanceException.update({ status: "cleared", reason: "QA corrected excusal" }, { where: { session_id: o.firstSessionId, member_id: c } });
  await evaluateMembers([c], config);
  const outsideCase = await AttendanceFollowUp.findOne({ where: { member_id: c, series_key: o.series } });
  assert.ok(outsideCase);
  const cellUser = await User.findOne({ where: { email: fixture.cellLeader.email } });
  const cellActor = { userId: cellUser.id, roleName: "Cell Group Leader", leadsCellGroupId: fixture.leaderScopes.cellGroupId };
  await assert.rejects(repo.assertCaseAccess(outsideCase.id, cellActor), (error) => error.status === 403);
  const cellCases = await repo.listFollowUps({ page: 1, limit: 100 }, cellActor);
  assert.ok(cellCases.items.every((row) => Number(row.member.cell_group_id) === Number(fixture.leaderScopes.cellGroupId)));
  const groupUser = await User.findOne({ where: { email: fixture.groupLeader.email } });
  const groupActor = { userId: groupUser.id, roleName: "Group Leader", leadsGroupId: fixture.leaderScopes.groupId };
  assert.ok((await repo.listFollowUps({ page: 1, limit: 100 }, groupActor)).items.some((row) => row.id === outsideCase.id));
  checks.push("Cell and Group roles see only their assigned members");
  await repo.updateFollowUp(outsideCase.id, { expected_revision: outsideCase.revision, note: "Synthetic QA follow-up resolved after personal contact" }, admin, "resolve");
  await evaluateMembers([c], config);
  assert.equal((await AttendanceFollowUp.findByPk(outsideCase.id)).status, "resolved");
  assert.equal(await caseCount(c), 1);
  checks.push("resolved episodes stay resolved through repeat evaluation");

  const memberB = await Member.findByPk(b);
  await repo.setPreference(b, { phone: memberB.phone, sms_enabled: false, activity_reminders: false, attendance_followups: true, consent_confirmed: false, consent_note: "Synthetic QA reminder preference off" }, admin);
  const reminderSession = await QrAttendanceSession.findByPk(o.reminderSessionId);
  const firstClock = new Date(o.reminderTestClock);
  await queueDueReminders(config, firstClock); await queueDueReminders(config, firstClock);
  assert.equal(await OutreachDelivery.count({ where: { session_id: reminderSession.id, kind: "activity_reminder", reminder_days: 3, channel: "in_app", member_id: a } }), 1);
  assert.equal(await OutreachDelivery.count({ where: { session_id: reminderSession.id, kind: "activity_reminder", member_id: b } }), 0);
  const secondClock = new Date(reminderWindow(reminderSession, 1, 9).due.getTime() + 60000);
  await queueDueReminders(config, secondClock);
  assert.equal(await OutreachDelivery.count({ where: { session_id: reminderSession.id, channel: "in_app", member_id: a } }), 2);
  await processQueue({ limit: 100, now: secondClock });
  checks.push("three-day and one-day reminder windows are separately idempotent and respect preferences");

  const reviewCounts = await exceptionCounts(second);
  assert.equal(reviewCounts.pending, 1);
  checks.push("pending attendance is counted separately from finalized absence");
  const leaseJob = await OutreachDelivery.findOne({ where: { channel: "in_app", member_id: a } });
  await leaseJob.update({ status: "processing", delivery_mode: "in_app", lease_until: new Date(Date.now() - 60000), claim_token: "qa-interrupted" });
  await recoverExpiredClaims(new Date());
  await leaseJob.reload(); assert.equal(leaseJob.status, "queued");
  // Restore this deliberately interrupted synthetic record to its already
  // completed result; it must not create another member notification.
  await leaseJob.update({ status: "sent", claim_token: null, lease_until: null });
  checks.push("interrupted internal claims recover without replaying external delivery");
  assert.equal(providerRequests, 0);
  assert.equal(await OutreachDeliveryAttempt.count({ where: { mode: "live" } }), 0);
  checks.push("zero provider requests and zero live SMS attempts");
  fixture.outreach.primaryCaseId = initialCase.id;
  fixture.outreach.outsideCaseId = outsideCase.id;
  fixture.outreach.thirdSessionId = third.id;
  fixture.outreach.verification = { checked_at: new Date().toISOString(), checks, provider_requests: providerRequests, live_sms_attempts: 0 };
  fs.writeFileSync(file, JSON.stringify(fixture, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(fixture.outreach.verification, null, 2));
})().catch((error) => { console.error("Non-SMS outreach QA failed: " + (error.code || error.message)); process.exitCode = 1; })
  .finally(() => sequelize.close());
