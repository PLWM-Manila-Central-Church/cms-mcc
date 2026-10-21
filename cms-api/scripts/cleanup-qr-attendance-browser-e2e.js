"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Op } = require("sequelize");
const sequelize = require("../src/config/db");
const { assertSafeQrTestTarget } = require("./qr-test-target");
const uploadStorage = require("../src/middlewares/upload-s3");
const {
  Attendance,
  ArchiveAccessLog,
  ArchiveRecord,
  ArchiveVersion,
  AuditLog,
  CellGroup,
  CellGroupHistory,
  EmergencyContact,
  Event,
  EventRegistration,
  Expense,
  ExpenseCategory,
  Account,
  Fund,
  Attachment,
  FinancialRecord,
  Group,
  InventoryItem,
  InventoryCategory,
  InventoryRequest,
  InventoryUsage,
  Member,
  MemberNote,
  MemberStatusHistory,
  MinistryApplication,
  MinistryAssignment,
  MinistryMembership,
  Notification,
  RefreshToken,
  Service,
  ServiceAttendanceSummary,
  ServiceResponse,
  SubstituteRequest,
  SystemSetting,
  User,
  UserSession,
  UserLeaderAssignment,
} = require("../src/models");
const {
  AttendanceBatch,
  AttendanceBatchItem,
  AttendanceExpectedMember,
  EventAttendance,
  MemberQrCredential,
  QrServiceAttendance,
  QrAttendanceSession,
} = require("../src/modules/qr-attendance/models");
const { deriveInventoryStatus } = require("../src/helpers/inventoryStatus.helper");
const outreach = require("../src/modules/outreach/models");

const run = async () => {
  assert.equal(process.env.NODE_ENV, "test", "Refusing to clean fixtures outside test mode");
  assert.equal(process.env.QR_ATTENDANCE_BROWSER_E2E, "true", "Refusing to clean outside the isolated browser E2E job");
  assertSafeQrTestTarget(process.env);
  assert.ok(process.env.QR_E2E_FIXTURE_PATH, "QR_E2E_FIXTURE_PATH is required");

  const fixturePath = path.resolve(process.env.QR_E2E_FIXTURE_PATH);
  const tempRoot = path.resolve(os.tmpdir()) + path.sep;
  assert.ok(fixturePath.startsWith(tempRoot), "Fixture credentials must be stored under the OS temp directory");
  assert.match(path.basename(fixturePath), /^mcc-qr-browser-e2e-qa-[a-z0-9-]+\.json$/i, "Unexpected QA fixture file name");
  assert.ok(fs.existsSync(fixturePath), "Fixture file is missing");
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const created = fixture.createdIds || {};
  const eventImageKeys = new Set(Array.isArray(created.eventImageKeys) ? created.eventImageKeys : []);
  const archiveRecordIds = Array.isArray(created.archiveRecordIds) ? created.archiveRecordIds : [];
  const archiveVersionIds = Array.isArray(created.archiveVersionIds) ? created.archiveVersionIds : [];
  const manifestProfilePhotoKeys = Array.isArray(created.profilePhotoKeys) ? created.profilePhotoKeys : [];
  const archiveRecordTitles = created.archiveRecordTitles || {};
  const archiveFileKeys = Array.isArray(created.archiveFileKeys) ? created.archiveFileKeys : [];
  const userEmails = created.userEmails || [];
  const memberIds = created.memberIds || [];
  const groupIds = [...new Set([
    ...(Array.isArray(created.groupIds) ? created.groupIds : []),
    ...(created.groupId ? [created.groupId] : []),
  ].map(Number))];
  const cellGroupIds = [...new Set(Array.isArray(created.cellGroupIds) ? created.cellGroupIds.map(Number) : [])];
  const ministryAssignmentIds = Array.isArray(created.ministryAssignmentIds) ? created.ministryAssignmentIds : [];
  const receiptFilePaths = [];
  const profilePhotoKeys = new Set(manifestProfilePhotoKeys);
  let syntheticIncomeIds = [];
  let syntheticExpenseIds = [];
  const idFilter = (ids) => ids.length ? { [Op.in]: ids } : { [Op.in]: [0] };
  const isFixtureEmail = (email) =>
    /^qr-browser-[a-z0-9-]+@example\.com$/i.test(email)
    || /^qr-ci-[a-z0-9-]+@example\.invalid$/i.test(email);
  const isFixtureMemberName = (member) =>
    /^(?:QR (?:Direct|Batch|Outside|Concurrent)|CI Member (?:Direct|Cell|Group|Unified)|CI Leader Unified)-\d+-\d+$/i.test(`${member.first_name} ${member.last_name}`)
    || /^(?:Avery QA Import|CherQA|SoloQATest|RowTwo QAImport|Second QAImport|ImportQA|MappedQA)\s*$/i.test(`${member.first_name} ${member.last_name}`)
    || /^Candidate Age(?:17|20|31)-\d+-\d+$/i.test(`${member.first_name} ${member.last_name}`);
  const isFixtureGroupName = (name) =>
    /^(?:QR CI (?:other )?group|QR Browser E2E Group|Young Adults QA) \d+-\d+$/i.test(name);
  const isFixtureCellGroupName = (name) =>
    /^(?:QR CI (?:other |guarded )?cell|QR Browser E2E (?:Other )?Cell) \d+-\d+$/i.test(name);
  const isPositiveId = (id) => Number.isSafeInteger(Number(id)) && Number(id) > 0;
  assert.ok(userEmails.length > 0 && userEmails.every(isFixtureEmail), "Fixture user scope is invalid");
  assert.ok(new Set(userEmails).size === userEmails.length, "Fixture user emails must be unique");
  assert.ok([...eventImageKeys].every((key) => uploadStorage.getStoredFileKey(key, "event-images") === key), "Fixture Event image keys are invalid");
  assert.ok([...profilePhotoKeys].every((key) => uploadStorage.getStoredFileKey(key, "profiles") === key), "Fixture profile-photo scope is invalid");
  assert.ok(memberIds.length > 0 && new Set(memberIds).size === memberIds.length, "Fixture member scope is invalid");
  assert.ok(memberIds.every(isPositiveId), "Fixture member IDs are invalid");
  assert.ok(groupIds.every(isPositiveId) && new Set(groupIds).size === groupIds.length, "Fixture Group IDs are invalid");
  assert.ok(cellGroupIds.every(isPositiveId) && new Set(cellGroupIds).size === cellGroupIds.length, "Fixture Cell Group IDs are invalid");
  assert.ok(new Set(ministryAssignmentIds).size === ministryAssignmentIds.length, "Ministry assignment fixture IDs must be unique");
  assert.ok(ministryAssignmentIds.every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0), "Ministry assignment fixture IDs are invalid");
  assert.ok(new Set(archiveRecordIds).size === archiveRecordIds.length, "Archive fixture IDs must be unique");
  if (archiveRecordIds.length) {
    assert.ok(archiveRecordIds.every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0), "Archive fixture IDs are invalid");
    assert.ok(archiveVersionIds.every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0), "Archive version fixture IDs are invalid");
    assert.ok(archiveRecordIds.every((id) => typeof archiveRecordTitles[id] === "string" && (archiveRecordTitles[id].startsWith("QA ") || /^MCC Storage QA \d{8}$/.test(archiveRecordTitles[id]))), "Archive fixture titles are invalid");
    assert.ok(archiveFileKeys.length > 0, "Archive fixture storage keys are missing");
    for (const key of archiveFileKeys) {
      assert.equal(uploadStorage.getStoredFileKey(key, "archives"), key, "Archive fixture key is invalid");
    }
  }

  let fixtureUserIds = [];
  let fixtureEventIds = [];
  await sequelize.authenticate();
  await sequelize.transaction(async (transaction) => {
    const users = await User.findAll({
      where: { email: { [Op.in]: userEmails } },
      attributes: ["id", "email"],
      transaction,
    });
    const userIds = users.map((user) => user.id);
    fixtureUserIds = userIds;
    const existingFixtureEmails = new Set(users.map((user) => user.email));
    const missingFixtureEmails = userEmails.filter((email) => !existingFixtureEmails.has(email));
    const deferredLeaderEmail = process.env.QR_E2E_REUSE_LEADER === "true" ? null : fixture.unifiedLeader?.email;
    const allowedMissingFixtureEmails = deferredLeaderEmail
      && userEmails.includes(deferredLeaderEmail)
      && !existingFixtureEmails.has(deferredLeaderEmail)
      ? [deferredLeaderEmail]
      : [];
    assert.deepEqual(
      missingFixtureEmails,
      allowedMissingFixtureEmails,
      "Fixture user scope changed before cleanup",
    );

    const fixtureMembers = await Member.unscoped().findAll({
      where: { id: { [Op.in]: memberIds } },
      attributes: ["id", "first_name", "last_name", "group_id", "cell_group_id", "profile_photo_url"],
      transaction,
    });
    assert.equal(fixtureMembers.length, memberIds.length, "Fixture Member scope changed before cleanup");
    assert.ok(fixtureMembers.every(isFixtureMemberName), "Member cleanup scope includes a non-fixture name");
    for (const member of fixtureMembers) {
      if (!member.profile_photo_url) continue;
      const photoKey = uploadStorage.getStoredFileKey(member.profile_photo_url, "profiles");
      assert.ok(photoKey, `Fixture Member ${member.id} has an invalid profile photo key`);
      profilePhotoKeys.add(photoKey);
    }
    const linkedUsers = await User.findAll({
      where: { member_id: { [Op.in]: memberIds } },
      attributes: ["id"],
      transaction,
    });
    assert.ok(linkedUsers.every((user) => userIds.includes(user.id)), "A non-manifest User is linked to a fixture Member");

    if (groupIds.length) {
      const fixtureGroups = await Group.findAll({
        where: { id: { [Op.in]: groupIds } },
        attributes: ["id", "name"],
        transaction,
      });
      assert.equal(fixtureGroups.length, groupIds.length, "Fixture Group scope changed before cleanup");
      assert.ok(fixtureGroups.every((group) => isFixtureGroupName(group.name)), "Group cleanup scope includes a non-fixture name");
    }
    if (cellGroupIds.length) {
      const fixtureCellGroups = await CellGroup.findAll({
        where: { id: { [Op.in]: cellGroupIds } },
        attributes: ["id", "name"],
        transaction,
      });
      assert.equal(fixtureCellGroups.length, cellGroupIds.length, "Fixture Cell Group scope changed before cleanup");
      assert.ok(fixtureCellGroups.every((cellGroup) => isFixtureCellGroupName(cellGroup.name)), "Cell Group cleanup scope includes a non-fixture name");
    }

    const scopedEntities = [];
    if (groupIds.length) scopedEntities.push({ group_id: { [Op.in]: groupIds } });
    if (cellGroupIds.length) scopedEntities.push({ cell_group_id: { [Op.in]: cellGroupIds } });
    if (scopedEntities.length) {
      const linkedMembers = await Member.unscoped().findAll({
        where: { [Op.or]: scopedEntities },
        attributes: ["id"],
        transaction,
      });
      assert.ok(linkedMembers.every((member) => memberIds.includes(member.id)), "A non-manifest Member references a fixture Group or Cell Group");

      const scopedUsers = await User.findAll({
        where: { [Op.or]: [
          ...(groupIds.length ? [{ leads_group_id: { [Op.in]: groupIds } }] : []),
          ...(cellGroupIds.length ? [{ leads_cell_group_id: { [Op.in]: cellGroupIds } }] : []),
        ] },
        attributes: ["id"],
        transaction,
      });
      assert.ok(scopedUsers.every((user) => userIds.includes(user.id)), "A non-manifest User leads a fixture Group or Cell Group");

      const scopedAssignments = await UserLeaderAssignment.findAll({
        where: { [Op.or]: [
          ...(groupIds.length ? [{ scope_type: "member_group", scope_id: { [Op.in]: groupIds } }] : []),
          ...(cellGroupIds.length ? [{ scope_type: "cell_group", scope_id: { [Op.in]: cellGroupIds } }] : []),
        ] },
        attributes: ["user_id"],
        transaction,
      });
      assert.ok(scopedAssignments.every((assignment) => userIds.includes(assignment.user_id)), "A non-manifest User is assigned to a fixture Group or Cell Group");
    }
    const assignmentsByFixtureUser = await UserLeaderAssignment.findAll({
      where: { assigned_by: { [Op.in]: userIds } },
      attributes: ["user_id", "scope_type", "scope_id"],
      transaction,
    });
    assert.ok(assignmentsByFixtureUser.every((assignment) =>
      userIds.includes(assignment.user_id)
      && (assignment.scope_type === "member_group"
        ? groupIds.includes(Number(assignment.scope_id))
        : assignment.scope_type === "cell_group" && cellGroupIds.includes(Number(assignment.scope_id))),
    ), "A fixture User created a non-fixture leader assignment");

    const fixtureEvents = userIds.length ? await Event.unscoped().findAll({
      where: { created_by: { [Op.in]: userIds } },
      attributes: ["id", "title", "created_by", "image_key"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    }) : [];
    const isFixtureEventTitle = (title) =>
      /^QR Browser E2E Event \d+-\d+$/i.test(title)
      || /^QR Browser E2E Reservation \d{4}-\d{2}-\d{2}$/i.test(title);
    assert.ok(
      fixtureEvents.every((event) => userIds.includes(event.created_by) && isFixtureEventTitle(event.title)),
      "Event cleanup scope includes a non-fixture Event or creator",
    );
    if (created.eventId) {
      const manifestEvent = fixtureEvents.find((event) => Number(event.id) === Number(created.eventId));
      assert.ok(manifestEvent, "Manifest Event is missing or no longer owned by a manifest User");
      assert.equal(manifestEvent.title, fixture.event?.title, "Fixture Event title changed before cleanup");
    }
    fixtureEventIds = [...new Set([
      ...(created.eventId ? [Number(created.eventId)] : []),
      ...fixtureEvents.map((event) => Number(event.id)),
    ])];
    assert.ok(fixtureEventIds.every(isPositiveId), "Fixture Event IDs are invalid");
    for (const event of fixtureEvents) {
      if (!event.image_key) continue;
      const imageKey = uploadStorage.getStoredFileKey(event.image_key, "event-images");
      assert.ok(imageKey, `Fixture Event ${event.id} has an invalid image key`);
      eventImageKeys.add(imageKey);
    }
    const fixtureRegistrations = fixtureEventIds.length ? await EventRegistration.findAll({
      where: { event_id: idFilter(fixtureEventIds) },
      attributes: ["member_id"],
      transaction,
    }) : [];
    assert.ok(
      fixtureRegistrations.every((registration) => memberIds.includes(Number(registration.member_id))),
      "Event cleanup scope includes a non-fixture registration",
    );

    if (archiveRecordIds.length) {
      const archiveIdFilter = { [Op.in]: archiveRecordIds };
      const archiveRecords = await ArchiveRecord.unscoped().findAll({
        where: { id: archiveIdFilter },
        attributes: ["id", "title", "uploaded_by", "file_url"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      for (const record of archiveRecords) {
        assert.equal(record.title, archiveRecordTitles[record.id], `Archive fixture title mismatch for ID ${record.id}`);
        assert.ok(userIds.includes(record.uploaded_by), `Archive fixture uploader mismatch for ID ${record.id}`);
      }

      const archiveVersions = await ArchiveVersion.findAll({
        where: { record_id: archiveIdFilter },
        attributes: ["id", "record_id", "file_url"],
        transaction,
      });
      assert.ok(archiveVersions.every((version) => archiveVersionIds.includes(version.id)), "Archive version scope changed");
      const databaseArchiveKeys = [...new Set([
        ...archiveRecords.map((record) => uploadStorage.getStoredFileKey(record.file_url, "archives")),
        ...archiveVersions.map((version) => uploadStorage.getStoredFileKey(version.file_url, "archives")),
      ])].sort();
      assert.ok(databaseArchiveKeys.every((key) => archiveFileKeys.includes(key)), "Archive fixture file keys changed");

      await ArchiveRecord.unscoped().update(
        { current_version_id: null },
        { where: { id: archiveIdFilter }, transaction },
      );
      await ArchiveAccessLog.destroy({ where: { record_id: archiveIdFilter }, transaction });
      await ArchiveVersion.destroy({
        where: { id: { [Op.in]: archiveVersionIds }, record_id: archiveIdFilter },
        transaction,
      });
      await ArchiveRecord.unscoped().destroy({ where: { id: archiveIdFilter }, transaction });
    }

    // Outreach fixtures reference only the already-validated synthetic Members.
    // Remove their dependent history before removing the underlying QR sessions.
    const { readiness } = require("../src/modules/outreach/readiness");
    if (await readiness()) {
      const deliveries = await outreach.OutreachDelivery.findAll({ where: { member_id: idFilter(memberIds) }, attributes: ["id"], transaction });
      if (deliveries.length) await outreach.OutreachDeliveryAttempt.destroy({ where: { delivery_id: idFilter(deliveries.map((row) => row.id)) }, transaction });
      await outreach.OutreachDelivery.destroy({ where: { member_id: idFilter(memberIds) }, transaction });
      await outreach.AttendanceFollowUp.destroy({ where: { member_id: idFilter(memberIds) }, transaction });
      await outreach.AttendanceException.destroy({ where: { member_id: idFilter(memberIds) }, transaction });
      await outreach.OutreachPreference.destroy({ where: { member_id: idFilter(memberIds) }, transaction });
      const fixtureSessionScopes = [
        ...(created.serviceId ? [{ service_id: created.serviceId }] : []),
        ...(fixtureEventIds.length ? [{ event_id: idFilter(fixtureEventIds) }] : []),
      ];
      if (fixtureSessionScopes.length) {
        const fixtureSessions = await QrAttendanceSession.findAll({ where: { [Op.or]: fixtureSessionScopes }, attributes: ["id"], transaction });
        await outreach.OutreachSessionPolicy.destroy({ where: { session_id: idFilter(fixtureSessions.map((row) => row.id)) }, transaction });
      }
      for (const snapshot of created.outreachConfigSnapshot || []) {
        assert.ok(/^outreach_(enabled|mode|reminder_days|reminder_hour|daily_sms_cap|reminder_template|followup_template)$/.test(snapshot.key), "Unexpected outreach setting cleanup key");
        const setting = await SystemSetting.findOne({ where: { key: snapshot.key }, transaction, lock: transaction.LOCK.UPDATE });
        if (setting) assert.ok(userIds.includes(Number(setting.updated_by)), "An outreach setting changed outside this fixture; refusing to overwrite it");
        if (snapshot.existed) {
          assert.ok(setting, "Original outreach configuration disappeared");
          await setting.update({ value: snapshot.value, updated_by: snapshot.updated_by }, { transaction });
        } else if (setting) await setting.destroy({ transaction });
      }
    }
    const sessionScopes = [
      ...(created.serviceId ? [{ service_id: created.serviceId }] : []),
      ...(fixtureEventIds.length ? [{ event_id: { [Op.in]: fixtureEventIds } }] : []),
    ];
    const sessions = sessionScopes.length
      ? await QrAttendanceSession.findAll({
        where: { [Op.or]: sessionScopes },
        attributes: ["id"],
        transaction,
      })
      : [];
    const sessionIds = sessions.map((session) => session.id);
    const batches = sessionIds.length ? await AttendanceBatch.findAll({
      where: { session_id: { [Op.in]: sessionIds } }, attributes: ["id"], transaction,
    }) : [];
    const batchIds = batches.map((batch) => batch.id);

    if (batchIds.length) await AttendanceBatchItem.destroy({ where: { batch_id: { [Op.in]: batchIds } }, transaction });
    if (created.serviceId) {
      await QrServiceAttendance.destroy({ where: { service_id: created.serviceId, member_id: idFilter(memberIds) }, transaction });
    }
    if (sessionIds.length) {
      await EventAttendance.destroy({ where: { session_id: { [Op.in]: sessionIds } }, transaction });
      await AttendanceExpectedMember.destroy({ where: { session_id: { [Op.in]: sessionIds } }, transaction });
      await AttendanceBatch.destroy({ where: { session_id: { [Op.in]: sessionIds } }, transaction });
      await QrAttendanceSession.destroy({ where: { id: { [Op.in]: sessionIds } }, transaction });
    }

    await MemberQrCredential.destroy({ where: { member_id: idFilter(memberIds) }, transaction });
    // Fixture Members are newly created and manifest-scoped. Remove their event
    // registrations across all event IDs so portal-flow QA cannot leave a row on
    // an existing QA event when the test targets it instead of the fixture event.
    await EventRegistration.destroy({ where: { member_id: idFilter(memberIds) }, transaction });
    if (created.serviceId) {
      await ServiceResponse.destroy({ where: { service_id: created.serviceId, member_id: idFilter(memberIds) }, transaction });
      await Attendance.destroy({ where: { service_id: created.serviceId, member_id: idFilter(memberIds) }, transaction });
      await ServiceAttendanceSummary.destroy({ where: { service_id: created.serviceId }, transaction });
    }
    if (userIds.length) {
      const incomeRecords = await FinancialRecord.unscoped().findAll({
        where: { recorded_by: { [Op.in]: userIds } }, attributes: ["id"], transaction,
      });
      const expenseRecords = await Expense.findAll({
        where: { created_by: { [Op.in]: userIds } }, attributes: ["id"], transaction,
      });
      syntheticIncomeIds = incomeRecords.map((record) => record.id);
      syntheticExpenseIds = expenseRecords.map((record) => record.id);
      const attachmentRows = await Attachment.findAll({
        where: {
          [Op.or]: [
            { income_id: idFilter(syntheticIncomeIds) },
            { expense_id: idFilter(syntheticExpenseIds) },
          ],
        },
        attributes: ["id", "file_path"],
        transaction,
      });
      for (const attachment of attachmentRows) {
        const key = uploadStorage.getStoredFileKey(attachment.file_path, "receipts");
        assert.ok(key, `Invalid receipt storage key on fixture attachment ${attachment.id}`);
        receiptFilePaths.push(key);
      }
      if (attachmentRows.length) {
        await Attachment.destroy({
          where: { id: { [Op.in]: attachmentRows.map((attachment) => attachment.id) } },
          transaction,
        });
      }
      await FinancialRecord.unscoped().destroy({ where: { recorded_by: { [Op.in]: userIds } }, transaction });
      await Expense.destroy({ where: { created_by: { [Op.in]: userIds } }, transaction });
    }
    if (created.financeExpenseCategoryName) {
      await ExpenseCategory.destroy({ where: { category_name: created.financeExpenseCategoryName }, transaction });
    }
    if (created.financeAccountName) {
      await Account.destroy({ where: { name: created.financeAccountName }, transaction });
    }
    if (created.financeFundName) {
      await Fund.destroy({ where: { name: created.financeFundName }, transaction });
    }

    if (fixture.previousQrAttendanceSetting) {
      await SystemSetting.update(fixture.previousQrAttendanceSetting, { where: { key: "qr_attendance_enabled" }, transaction });
    }
    if (fixtureEventIds.length) {
      await EventRegistration.destroy({ where: { event_id: idFilter(fixtureEventIds) }, transaction });
      await Event.unscoped().destroy({ where: { id: idFilter(fixtureEventIds) }, transaction });
    }
    if (created.serviceId) await Service.destroy({ where: { id: created.serviceId }, transaction });

    const stockToRestore = new Map();
    const usages = userIds.length ? await InventoryUsage.findAll({
      where: { used_by: { [Op.in]: userIds } }, attributes: ["item_id", "quantity_used"], transaction,
    }) : [];
    for (const usage of usages) stockToRestore.set(usage.item_id, (stockToRestore.get(usage.item_id) || 0) + Number(usage.quantity_used));
    const approvedRequests = userIds.length ? await InventoryRequest.findAll({
      where: { requested_by: { [Op.in]: userIds }, status: "approved" }, attributes: ["item_id", "quantity"], transaction,
    }) : [];
    for (const request of approvedRequests) stockToRestore.set(request.item_id, (stockToRestore.get(request.item_id) || 0) + Number(request.quantity));
    for (const [itemId, quantity] of stockToRestore) {
      const item = await InventoryItem.findByPk(itemId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!item) continue;
      const nextQuantity = Number(item.quantity) + quantity;
      const nextStatus = deriveInventoryStatus({ quantity: nextQuantity, low_stock_threshold: item.low_stock_threshold, status: item.status });
      await item.update({ quantity: nextQuantity, status: nextStatus }, { transaction });
    }
    const ministryApplications = memberIds.length ? await MinistryApplication.findAll({
      where: { member_id: { [Op.in]: memberIds } },
      attributes: ["id"],
      transaction,
    }) : [];
    const ministryApplicationIds = ministryApplications.map((application) => application.id);
    if (ministryApplicationIds.length) {
      await Notification.destroy({
        where: { reference_type: "ministry_application", reference_id: { [Op.in]: ministryApplicationIds } },
        transaction,
      });
    }

    if (memberIds.length) {
      await EmergencyContact.destroy({ where: { member_id: { [Op.in]: memberIds } }, transaction });
      await MemberNote.destroy({ where: { member_id: { [Op.in]: memberIds } }, transaction });
      await MemberStatusHistory.destroy({ where: { member_id: { [Op.in]: memberIds } }, transaction });
      await CellGroupHistory.destroy({
        where: { [Op.or]: [
          { member_id: { [Op.in]: memberIds } },
          ...(cellGroupIds.length ? [
            { old_cell_group_id: { [Op.in]: cellGroupIds } },
            { new_cell_group_id: { [Op.in]: cellGroupIds } },
          ] : []),
        ] },
        transaction,
      });
      await MinistryApplication.destroy({ where: { member_id: { [Op.in]: memberIds } }, transaction });
      await MinistryMembership.destroy({ where: { member_id: { [Op.in]: memberIds } }, transaction });
    }
    if (ministryAssignmentIds.length) {
      const assignmentRows = await MinistryAssignment.findAll({
        where: { id: { [Op.in]: ministryAssignmentIds } },
        attributes: ["id", "service_id", "member_id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      assert.ok(assignmentRows.every((assignment) =>
        Number(assignment.service_id) === Number(created.serviceId)
        && memberIds.includes(Number(assignment.member_id)),
      ), "Ministry assignment cleanup scope changed");
      const assignmentIdFilter = { [Op.in]: ministryAssignmentIds };
      const substituteRequests = await SubstituteRequest.findAll({
        where: { assignment_id: assignmentIdFilter },
        attributes: ["id"],
        transaction,
      });
      const substituteRequestIds = substituteRequests.map((request) => request.id);
      if (substituteRequestIds.length) {
        await Notification.destroy({
          where: { reference_type: "substitute_request", reference_id: { [Op.in]: substituteRequestIds } },
          transaction,
        });
        await SubstituteRequest.destroy({ where: { id: { [Op.in]: substituteRequestIds } }, transaction });
      }
      await MinistryAssignment.destroy({ where: { id: assignmentIdFilter }, transaction });
    }
    if (userIds.length) {
      await UserLeaderAssignment.destroy({ where: { [Op.or]: [
        { user_id: { [Op.in]: userIds } },
        { assigned_by: { [Op.in]: userIds } },
      ] }, transaction });
      await InventoryUsage.destroy({ where: { used_by: { [Op.in]: userIds } }, transaction });
      const inventoryRequests = await InventoryRequest.findAll({
        where: { requested_by: { [Op.in]: userIds } },
        attributes: ["id"],
        transaction,
      });
      const inventoryRequestIds = inventoryRequests.map((request) => request.id);
      if (inventoryRequestIds.length) {
        await Notification.destroy({
          where: { reference_type: "inventory_request", reference_id: { [Op.in]: inventoryRequestIds } },
          transaction,
        });
      }
      await InventoryRequest.destroy({ where: { requested_by: { [Op.in]: userIds } }, transaction });
      await RefreshToken.destroy({ where: { user_id: { [Op.in]: userIds } }, transaction });
      await UserSession.destroy({ where: { user_id: { [Op.in]: userIds } }, transaction });
      await Notification.destroy({ where: { user_id: { [Op.in]: userIds } }, transaction });
      await AuditLog.destroy({ where: { user_id: { [Op.in]: userIds } }, transaction });
      await User.destroy({ where: { id: { [Op.in]: userIds } }, transaction });
    }
    if (created.inventoryItemName) {
      await InventoryItem.destroy({ where: { name: created.inventoryItemName }, transaction });
    }
    if (created.inventoryCategoryId) {
      await InventoryCategory.destroy({ where: { id: created.inventoryCategoryId }, transaction });
    }

    if (memberIds.length) {
      await Member.unscoped().destroy({ where: { id: { [Op.in]: memberIds } }, transaction });
    }
    if (groupIds.length) await Group.destroy({ where: { id: { [Op.in]: groupIds } }, transaction });
    if (cellGroupIds.length) await CellGroup.destroy({ where: { id: { [Op.in]: cellGroupIds } }, transaction });
  });

  for (const fileKey of archiveFileKeys) await uploadStorage.deleteStoredFile(fileKey);
  for (const imageKey of eventImageKeys) await uploadStorage.deleteStoredFile(imageKey);
  for (const fileKey of receiptFilePaths) await uploadStorage.deleteStoredFile(fileKey);
  for (const photoKey of profilePhotoKeys) await uploadStorage.deleteStoredFile(photoKey);
  if (!uploadStorage.s3Enabled) {
    for (const photoKey of profilePhotoKeys) {
      const photoPath = path.resolve(__dirname, "../..", "uploads", photoKey);
      assert.equal(fs.existsSync(photoPath), false, `Fixture profile photo remains after cleanup: ${photoKey}`);
    }
  }

  const remainingReceiptAttachments = await Attachment.count({
    where: {
      [Op.or]: [
        { income_id: { [Op.in]: syntheticIncomeIds.length ? syntheticIncomeIds : [0] } },
        { expense_id: { [Op.in]: syntheticExpenseIds.length ? syntheticExpenseIds : [0] } },
      ],
    },
  });
  assert.equal(remainingReceiptAttachments, 0, "Finance fixture receipt attachments remain after cleanup");
  const remainingEventRegistrations = await EventRegistration.count({ where: { member_id: idFilter(memberIds) } });
  assert.equal(remainingEventRegistrations, 0, "Event registrations for fixture Members remain after cleanup");
  assert.equal(await User.count({ where: { email: { [Op.in]: userEmails } } }), 0, "Fixture users remain after cleanup");
  assert.equal(await Member.unscoped().count({ where: { id: { [Op.in]: memberIds } } }), 0, "Fixture Members remain after cleanup");
  assert.equal(await Group.count({ where: { id: idFilter(groupIds) } }), 0, "Fixture Groups remain after cleanup");
  assert.equal(await CellGroup.count({ where: { id: idFilter(cellGroupIds) } }), 0, "Fixture Cell Groups remain after cleanup");
  if (fixtureEventIds.length) {
    assert.equal(await Event.unscoped().count({ where: { id: idFilter(fixtureEventIds) } }), 0, "Fixture Events remain after cleanup");
  }
  assert.equal(await UserSession.count({ where: { user_id: idFilter(fixtureUserIds) } }), 0, "Fixture sessions remain after cleanup");
  assert.equal(await RefreshToken.count({ where: { user_id: idFilter(fixtureUserIds) } }), 0, "Fixture refresh tokens remain after cleanup");
  assert.equal(await Notification.count({ where: { user_id: idFilter(fixtureUserIds) } }), 0, "Fixture notifications remain after cleanup");
  assert.equal(await AuditLog.count({ where: { user_id: idFilter(fixtureUserIds) } }), 0, "Fixture audit rows remain after cleanup");
  assert.equal(await UserLeaderAssignment.count({ where: { [Op.or]: [
    { user_id: idFilter(fixtureUserIds) },
    { assigned_by: idFilter(fixtureUserIds) },
  ] } }), 0, "Fixture leader assignments remain after cleanup");
  assert.equal(await MemberQrCredential.count({ where: { member_id: idFilter(memberIds) } }), 0, "Fixture Member QR credentials remain after cleanup");

  if (ministryAssignmentIds.length) {
    const remainingAssignments = await MinistryAssignment.count({ where: { id: { [Op.in]: ministryAssignmentIds } } });
    const remainingSubstituteRequests = await SubstituteRequest.count({
      where: { assignment_id: { [Op.in]: ministryAssignmentIds } },
    });
    assert.equal(remainingAssignments, 0, "Ministry fixture assignments remain after cleanup");
    assert.equal(remainingSubstituteRequests, 0, "Substitute requests remain after cleanup");
  }

  if (archiveRecordIds.length) {
    const remainingRecords = await ArchiveRecord.unscoped().count({ where: { id: { [Op.in]: archiveRecordIds } } });
    const remainingVersions = await ArchiveVersion.count({ where: { record_id: { [Op.in]: archiveRecordIds } } });
    const remainingLogs = await ArchiveAccessLog.count({ where: { record_id: { [Op.in]: archiveRecordIds } } });
    assert.equal(remainingRecords, 0, "Archive fixture records remain after cleanup");
    assert.equal(remainingVersions, 0, "Archive fixture versions remain after cleanup");
    assert.equal(remainingLogs, 0, "Archive fixture access logs remain after cleanup");
  }

  fs.rmSync(fixturePath, { force: true });
  console.log("Removed the scoped synthetic QR browser fixtures and restored the prior QR setting in the isolated QA database.");
};

run()
  .catch((error) => {
    console.error("QR browser fixture cleanup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
