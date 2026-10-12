"use strict";

require("dotenv").config();

const { assertSafeQrTestTarget } = require("../scripts/qr-test-target");
const { Op } = require("sequelize");
const integrationEnabled = process.env.QR_ATTENDANCE_INTEGRATION_DB === "true";
if (integrationEnabled) assertSafeQrTestTarget(process.env);
const describeDatabase = integrationEnabled ? describe : describe.skip;

describeDatabase("QR attendance API persistence integration", () => {
  jest.setTimeout(60000);

  let request;
  let app;
  let models;
  let qrModels;
  let jwt;
  let actors;
  let fixture;
  let dbAuthenticated = false;

  const dateOnlyInManila = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const api = (method, path, token) =>
    request(app)[method](path).set("Authorization", `Bearer ${token}`);

  const tokenFor = (user) => jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "15m" },
  );

  const expectData = (response, status = 200) => {
    expect(response.status).toBe(status);
    expect(response.body.success).toBe(true);
    return response.body.data;
  };

  const makeSession = async (targetType, targetId, sessionKey, title) => {
    const now = Date.now();
    const date = (offsetMs) => new Date(now + offsetMs).toISOString();
    const created = await api("post", "/api/qr-attendance/sessions", actors.admin.token)
      .send({
        target_type: targetType,
        target_id: targetId,
        session_key: sessionKey,
        title,
        starts_at: date(-60 * 60 * 1000),
        ends_at: date(2 * 60 * 60 * 1000),
        check_in_opens_at: date(-5 * 60 * 1000),
        check_in_closes_at: date(30 * 60 * 1000),
        approval_deadline: date(2 * 60 * 60 * 1000),
        time_zone: "Asia/Manila",
        expected_basis: "none",
        registration_required: false,
        leader_confirmation_mode: "batch_review",
      });
    const session = expectData(created, 201);
    fixture.sessionIds.push(Number(session.id));
    const opened = await api("post", `/api/qr-attendance/sessions/${session.id}/open`, actors.admin.token).send({});
    expectData(opened);
    return session;
  };

  const submitAndApprove = async ({ leader, sessionId, memberPayload, expectedNew, expectedDuplicate, rejectPayload }) => {
    const created = await api("post", `/api/qr-attendance/sessions/${sessionId}/batches`, leader.token)
      .send({ client_request_id: require("node:crypto").randomUUID() });
    const batch = expectData(created, 201).batch;
    const nextRevision = Number(batch.revision) + 1;

    const added = await api("post", `/api/qr-attendance/batches/${batch.id}/items`, leader.token)
      .send({ qr_payload: memberPayload, expected_revision: batch.revision });
    expectData(added, 201);

    if (rejectPayload) {
      const outsideScope = await api("post", `/api/qr-attendance/batches/${batch.id}/items`, leader.token)
        .send({ qr_payload: rejectPayload, expected_revision: nextRevision });
      expect(outsideScope.status).toBe(403);
    }

    const submitted = await api("post", `/api/qr-attendance/batches/${batch.id}/submit`, leader.token)
      .send({ expected_revision: nextRevision });
    const receipt = expectData(submitted);
    expect(receipt.batch.state).toBe("submitted");
    expect(receipt.payload).toMatch(/^MCC:BATCH:1:/);
    expect(receipt.item_count).toBe(1);

    const resolved = await api("post", "/api/qr-attendance/batches/resolve", actors.registration.token)
      .send({ session_id: sessionId, qr_payload: receipt.payload });
    expect(expectData(resolved).batch.id).toBe(batch.id);

    const approved = await api("post", `/api/qr-attendance/batches/${batch.id}/approve`, actors.registration.token)
      .send({
        expected_revision: receipt.batch.revision,
        content_digest: receipt.batch.content_digest,
        late_approval: false,
      });
    const approval = expectData(approved);
    expect(approval.newly_confirmed_count).toBe(expectedNew);
    expect(approval.already_confirmed_count).toBe(expectedDuplicate);
    return { batchId: batch.id, payload: receipt.payload, approval };
  };

  beforeAll(async () => {
    process.env.JWT_SECRET ||= "qr-attendance-integration-only-secret";
    request = require("supertest");
    jwt = require("jsonwebtoken");
    models = require("../src/models");
    qrModels = require("../src/modules/qr-attendance/models");
    app = require("../src/app");
    await qrModels.sequelize.authenticate();
    dbAuthenticated = true;

    const suffix = `${Date.now()}-${process.pid}`;
    fixture = {
      suffix,
      cellGroupIds: [],
      groupIds: [],
      memberIds: [],
      userIds: [],
      serviceIds: [],
      eventIds: [],
      sessionIds: [],
    };
    const previousQrSetting = await models.SystemSetting.findOne({
      where: { key: "qr_attendance_enabled" },
      attributes: ["value", "updated_by"],
      raw: true,
    });
    fixture.previousQrSetting = previousQrSetting
      ? { value: previousQrSetting.value, updated_by: previousQrSetting.updated_by }
      : null;

    const roleNames = ["System Admin", "Pastor", "Registration Team", "Cell Group Leader", "Group Leader", "Leader", "Member"];
    const roleRows = await models.Role.findAll({ where: { role_name: roleNames } });
    const roles = new Map(roleRows.map((role) => [role.role_name, role]));
    for (const roleName of roleNames) expect(roles.has(roleName)).toBe(true);

    const cell = await models.CellGroup.create({ name: `QR CI cell ${suffix}`, area: "CI" });
    fixture.cellGroupIds.push(Number(cell.id));
    const otherCell = await models.CellGroup.create({ name: `QR CI other cell ${suffix}`, area: "CI" });
    fixture.cellGroupIds.push(Number(otherCell.id));
    const assignmentGuardCell = await models.CellGroup.create({ name: `QR CI guarded cell ${suffix}`, area: "CI" });
    fixture.cellGroupIds.push(Number(assignmentGuardCell.id));
    const group = await models.Group.create({ name: `QR CI group ${suffix}` });
    fixture.groupIds.push(Number(group.id));
    const otherGroup = await models.Group.create({ name: `QR CI other group ${suffix}` });
    fixture.groupIds.push(Number(otherGroup.id));
    const youngAdultsGroup = await models.Group.create({ name: `Young Adults QA ${suffix}` });
    fixture.groupIds.push(Number(youngAdultsGroup.id));

    const memberA = await models.Member.create({
      first_name: "QR",
      last_name: `Direct-${suffix}`,
      status: "Active",
      cell_group_id: cell.id,
      group_id: group.id,
    });
    fixture.memberIds.push(Number(memberA.id));
    const memberB = await models.Member.create({
      first_name: "QR",
      last_name: `Batch-${suffix}`,
      status: "Active",
      cell_group_id: cell.id,
      group_id: group.id,
    });
    fixture.memberIds.push(Number(memberB.id));
    const outsideMember = await models.Member.create({
      first_name: "QR",
      last_name: `Outside-${suffix}`,
      status: "Active",
      cell_group_id: otherCell.id,
      group_id: otherGroup.id,
    });
    fixture.memberIds.push(Number(outsideMember.id));
    const unassignedMember = await models.Member.create({
      first_name: "QR",
      last_name: `Concurrent-${suffix}`,
      status: "Active",
      cell_group_id: null,
      group_id: null,
    });
    fixture.memberIds.push(Number(unassignedMember.id));

    const makeUser = async (roleName, label, memberId = null, scope = {}) => {
      const user = await models.User.create({
        role_id: roles.get(roleName).id,
        member_id: memberId,
        email: `qr-ci-${label}-${suffix}@example.invalid`,
        password_hash: "integration-only-not-a-login-password",
        is_active: 1,
        force_password_change: 0,
        ...scope,
      });
      fixture.userIds.push(Number(user.id));
      return { user, token: tokenFor(user) };
    };

    actors = {
      admin: await makeUser("System Admin", "admin"),
      pastor: await makeUser("Pastor", "pastor"),
      registration: await makeUser("Registration Team", "registration"),
      memberA: await makeUser("Member", "member-a", memberA.id),
      memberB: await makeUser("Member", "member-b", memberB.id),
      cellLeader: await makeUser("Cell Group Leader", "cell-leader", null, { leads_cell_group_id: cell.id }),
      otherCellLeader: await makeUser("Cell Group Leader", "other-cell-leader", null, { leads_cell_group_id: otherCell.id }),
      groupLeader: await makeUser("Group Leader", "group-leader", null, { leads_group_id: group.id }),
      youngAdultsLeader: await makeUser("Group Leader", "young-adults-leader", null, { leads_group_id: youngAdultsGroup.id }),
    };
    actors.unifiedLeader = await makeUser("Leader", "unified-leader", null, {
      leads_cell_group_id: cell.id,
      leads_group_id: group.id,
    });
    await models.UserLeaderAssignment.bulkCreate([
      {
        user_id: actors.unifiedLeader.user.id,
        scope_type: "cell_group",
        scope_id: cell.id,
        legacy_column: "leads_cell_group_id",
        assigned_by: actors.admin.user.id,
        is_active: true,
        version: 1,
      },
      {
        user_id: actors.unifiedLeader.user.id,
        scope_type: "member_group",
        scope_id: group.id,
        legacy_column: "leads_group_id",
        assigned_by: actors.admin.user.id,
        is_active: true,
        version: 1,
      },
    ]);
    actors.assignmentGuardLeader = await makeUser("Leader", "assignment-guard-leader", null, {
      leads_cell_group_id: assignmentGuardCell.id,
    });
    await models.UserLeaderAssignment.create({
      user_id: actors.assignmentGuardLeader.user.id,
      scope_type: "cell_group",
      scope_id: assignmentGuardCell.id,
      legacy_column: "leads_cell_group_id",
      assigned_by: actors.admin.user.id,
      is_active: true,
      version: 1,
    });

    await models.SystemSetting.update(
      { value: "true", updated_by: actors.admin.user.id },
      { where: { key: "qr_attendance_enabled" } },
    );
    const availability = await api("get", "/api/qr-attendance/capabilities", actors.admin.token);
    expect(expectData(availability)).toMatchObject({ enabled: true, schemaReady: true });

    const activityDate = dateOnlyInManila();
    const service = await models.Service.create({
      title: `QR CI Service ${suffix}`,
      service_date: activityDate,
      service_time: "10:00:00",
      capacity: 20,
      total_parking_slots: 0,
      status: "published",
    });
    fixture.serviceIds.push(Number(service.id));
    const event = await models.Event.create({
      title: `QR CI Event ${suffix}`,
      start_date: activityDate,
      end_date: activityDate,
      status: "Upcoming",
      created_by: actors.admin.user.id,
    });
    fixture.eventIds.push(Number(event.id));

    Object.assign(fixture, {
      memberA,
      memberB,
      outsideMember,
      unassignedMember,
      cell,
      otherCell,
      assignmentGuardCell,
      group,
      youngAdultsGroup,
      service,
      event,
      serviceSession: await makeSession("service", service.id, "primary", "QR CI Service Session"),
      eventSession: await makeSession("event", event.id, "qr-ci-session", "QR CI Event Session"),
    });
  });

  afterAll(async () => {
    try {
      if (!dbAuthenticated || !fixture || !models || !qrModels) return;

      const ids = (values) => [...new Set((values || []).map(Number).filter(Number.isInteger))];
      const memberIds = ids(fixture.memberIds);
      const userIds = ids(fixture.userIds);
      const serviceIds = ids(fixture.serviceIds);
      const eventIds = ids(fixture.eventIds);
      let sessionIds = ids(fixture.sessionIds);
      const cellGroupIds = ids(fixture.cellGroupIds);
      const groupIds = ids(fixture.groupIds);
      const destroyIn = async (Model, column, values, transaction) => {
        if (values.length) {
          await Model.destroy({ where: { [column]: { [Op.in]: values } }, transaction });
        }
      };

      let batchIds = [];
      await qrModels.sequelize.transaction(async (transaction) => {
        if (serviceIds.length || eventIds.length) {
          const relatedSessions = await qrModels.QrAttendanceSession.findAll({
            where: { [Op.or]: [
              ...(serviceIds.length ? [{ service_id: { [Op.in]: serviceIds } }] : []),
              ...(eventIds.length ? [{ event_id: { [Op.in]: eventIds } }] : []),
            ] },
            attributes: ["id"],
            raw: true,
            transaction,
          });
          sessionIds = ids([...sessionIds, ...relatedSessions.map((session) => session.id)]);
        }
        const batches = sessionIds.length
          ? await qrModels.AttendanceBatch.findAll({
            where: { session_id: { [Op.in]: sessionIds } },
            attributes: ["id"],
            raw: true,
            transaction,
          })
          : [];
        batchIds = ids(batches.map((batch) => batch.id));

        await destroyIn(qrModels.AttendanceBatchItem, "batch_id", batchIds, transaction);
        await destroyIn(qrModels.AttendanceExpectedMember, "session_id", sessionIds, transaction);
        await destroyIn(qrModels.EventAttendance, "session_id", sessionIds, transaction);
        await destroyIn(qrModels.QrServiceAttendance, "service_id", serviceIds, transaction);
        if (batchIds.length) {
          await qrModels.AttendanceBatch.update(
            { supersedes_batch_id: null },
            { where: { id: { [Op.in]: batchIds } }, transaction },
          );
        }
        await destroyIn(qrModels.AttendanceBatch, "id", batchIds, transaction);
        await destroyIn(qrModels.MemberQrCredential, "member_id", memberIds, transaction);
        await destroyIn(qrModels.QrAttendanceSession, "id", sessionIds, transaction);

        await destroyIn(models.EventRegistration, "event_id", eventIds, transaction);
        await destroyIn(models.ServiceResponse, "service_id", serviceIds, transaction);
        await destroyIn(models.Attendance, "service_id", serviceIds, transaction);
        await destroyIn(models.ServiceAttendanceSummary, "service_id", serviceIds, transaction);
        await destroyIn(models.EmergencyContact, "member_id", memberIds, transaction);
        await destroyIn(models.MemberNote, "member_id", memberIds, transaction);
        await destroyIn(models.MemberStatusHistory, "member_id", memberIds, transaction);
        await destroyIn(models.CellGroupHistory, "member_id", memberIds, transaction);
        await destroyIn(models.UserLeaderAssignment, "user_id", userIds, transaction);
        await destroyIn(models.UserSession, "user_id", userIds, transaction);
        await destroyIn(models.RefreshToken, "user_id", userIds, transaction);
        await destroyIn(models.Notification, "user_id", userIds, transaction);
        await destroyIn(models.AuditLog, "user_id", userIds, transaction);
        await destroyIn(models.Event, "id", eventIds, transaction);
        await destroyIn(models.Service, "id", serviceIds, transaction);
        if (userIds.length) {
          await models.User.unscoped().destroy({ where: { id: { [Op.in]: userIds } }, transaction });
        }
        if (memberIds.length) {
          await models.Member.unscoped().destroy({ where: { id: { [Op.in]: memberIds } }, transaction });
        }
        await destroyIn(models.Group, "id", groupIds, transaction);
        await destroyIn(models.CellGroup, "id", cellGroupIds, transaction);

        if (fixture.previousQrSetting) {
          await models.SystemSetting.update(
            fixture.previousQrSetting,
            { where: { key: "qr_attendance_enabled" }, transaction },
          );
        }
      });

      const remaining = await Promise.all([
        userIds.length ? models.User.unscoped().count({ where: { id: { [Op.in]: userIds } } }) : 0,
        memberIds.length ? models.Member.unscoped().count({ where: { id: { [Op.in]: memberIds } } }) : 0,
        serviceIds.length ? models.Service.count({ where: { id: { [Op.in]: serviceIds } } }) : 0,
        eventIds.length ? models.Event.count({ where: { id: { [Op.in]: eventIds } } }) : 0,
        sessionIds.length ? qrModels.QrAttendanceSession.count({ where: { id: { [Op.in]: sessionIds } } }) : 0,
        sessionIds.length ? qrModels.AttendanceBatch.count({ where: { session_id: { [Op.in]: sessionIds } } }) : 0,
        batchIds.length ? qrModels.AttendanceBatchItem.count({ where: { batch_id: { [Op.in]: batchIds } } }) : 0,
        sessionIds.length ? qrModels.AttendanceExpectedMember.count({ where: { session_id: { [Op.in]: sessionIds } } }) : 0,
        sessionIds.length ? qrModels.EventAttendance.count({ where: { session_id: { [Op.in]: sessionIds } } }) : 0,
        serviceIds.length ? qrModels.QrServiceAttendance.count({ where: { service_id: { [Op.in]: serviceIds } } }) : 0,
        memberIds.length ? qrModels.MemberQrCredential.count({ where: { member_id: { [Op.in]: memberIds } } }) : 0,
        eventIds.length ? models.EventRegistration.count({ where: { event_id: { [Op.in]: eventIds } } }) : 0,
        serviceIds.length ? models.ServiceResponse.count({ where: { service_id: { [Op.in]: serviceIds } } }) : 0,
        serviceIds.length ? models.Attendance.count({ where: { service_id: { [Op.in]: serviceIds } } }) : 0,
      ]);
      expect(remaining).toEqual(Array(14).fill(0));
    } finally {
      if (qrModels?.sequelize) await qrModels.sequelize.close();
    }
  });

  it("issues a stable member QR and downloads its PNG", async () => {
    const issued = await api("post", "/api/member-portal/attendance-qr", actors.memberA.token).send({});
    expect(expectData(issued, 201)).toMatchObject({ available: true, version: 1 });

    const first = expectData(await api("get", "/api/member-portal/attendance-qr", actors.memberA.token));
    const second = expectData(await api("get", "/api/member-portal/attendance-qr", actors.memberA.token));
    expect(first.payload).toMatch(/^MCC:MEMBER:1:/);
    expect(second.payload).toBe(first.payload);

    const image = await api("get", "/api/member-portal/attendance-qr/image.png", actors.memberA.token);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toContain("image/png");
    expect(image.body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

    const issuedB = await api("post", `/api/qr-attendance/members/${fixture.memberB.id}/qr`, actors.registration.token).send({});
    expect(expectData(issuedB, 201).available).toBe(true);
    fixture.qrPayloadA = first.payload;
    fixture.qrPayloadB = expectData(await api("get", `/api/qr-attendance/members/${fixture.memberB.id}/qr`, actors.registration.token)).payload;

    const issuedOutside = await api("post", `/api/qr-attendance/members/${fixture.outsideMember.id}/qr`, actors.registration.token).send({});
    expect(expectData(issuedOutside, 201).available).toBe(true);
    fixture.qrPayloadOutside = expectData(await api("get", `/api/qr-attendance/members/${fixture.outsideMember.id}/qr`, actors.registration.token)).payload;
  });

  it("persists direct Service and Event check-ins once and reconciles summaries and history", async () => {
    for (const session of [fixture.serviceSession, fixture.eventSession]) {
      const preview = await api("post", `/api/qr-attendance/sessions/${session.id}/member-preview`, actors.registration.token)
        .send({ qr_payload: fixture.qrPayloadA });
      expect(expectData(preview).outcome).toBe("ready");

      const first = await api("post", `/api/qr-attendance/sessions/${session.id}/check-ins`, actors.registration.token)
        .send({ qr_payload: fixture.qrPayloadA });
      expect(expectData(first, 201)).toMatchObject({ outcome: "confirmed", created: true });

      const duplicate = await api("post", `/api/qr-attendance/sessions/${session.id}/check-ins`, actors.registration.token)
        .send({ qr_payload: fixture.qrPayloadA });
      expect(expectData(duplicate)).toMatchObject({ outcome: "already_confirmed", created: false });

      const summary = await api("get", `/api/qr-attendance/sessions/${session.id}/summary`, actors.registration.token);
      expect(expectData(summary).confirmed_count).toBe(1);
    }

    const serviceRecord = await qrModels.QrServiceAttendance.findOne({
      where: { service_id: fixture.service.id, member_id: fixture.memberA.id },
    });
    expect(serviceRecord).toMatchObject({ entry_source: "direct", check_in_method: "barcode" });

    const eventRecord = await qrModels.EventAttendance.findOne({
      where: { session_id: fixture.eventSession.id, member_id: fixture.memberA.id },
    });
    expect(eventRecord).toMatchObject({ entry_source: "direct", check_in_method: "qr" });
    const memberHistory = await api("get", "/api/member-portal/attendance-qr/history", actors.memberA.token);
    expect(expectData(memberHistory).records).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: fixture.event.id, status: "Present" }),
    ]));
  });

  it("rejects malformed member QRs, cross-session batch QRs, and captures after the check-in window with typed non-401 errors", async () => {
    const malformedMemberQr = await api(
      "post",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/member-preview`,
      actors.registration.token,
    ).send({ qr_payload: "not-an-attendance-qr" });
    expect(malformedMemberQr.status).toBe(400);
    expect(malformedMemberQr.body.error.code).toBe("QR_INVALID");
    expect(malformedMemberQr.status).not.toBe(401);

    const now = Date.now();
    const date = (offsetMs) => new Date(now + offsetMs).toISOString();
    const closedWindowCreated = await api("post", "/api/qr-attendance/sessions", actors.admin.token).send({
      target_type: "event",
      target_id: fixture.event.id,
      session_key: `qr-closed-window-${now}`,
      title: "QR closed-window integration session",
      starts_at: date(-60 * 60 * 1000),
      ends_at: date(60 * 60 * 1000),
      check_in_opens_at: date(-20 * 60 * 1000),
      check_in_closes_at: date(-60 * 1000),
      approval_deadline: date(60 * 60 * 1000),
      time_zone: "Asia/Manila",
      expected_basis: "none",
      registration_required: false,
      leader_confirmation_mode: "batch_review",
    });
    const closedWindowSession = expectData(closedWindowCreated, 201);
    fixture.sessionIds.push(Number(closedWindowSession.id));
    const openedClosedWindow = expectData(
      await api("post", `/api/qr-attendance/sessions/${closedWindowSession.id}/open`, actors.admin.token).send({}),
    );
    expect(openedClosedWindow).toMatchObject({ status: "open" });

    const outsideWindowPreview = await api(
      "post",
      `/api/qr-attendance/sessions/${closedWindowSession.id}/member-preview`,
      actors.registration.token,
    ).send({ qr_payload: fixture.qrPayloadA });
    expect(outsideWindowPreview.status).toBe(409);
    expect(outsideWindowPreview.body.error.code).toBe("CHECK_IN_CLOSED");
    expect(outsideWindowPreview.status).not.toBe(401);

    expect(await qrModels.EventAttendance.count({ where: { session_id: closedWindowSession.id } })).toBe(0);
    expect(await qrModels.QrAttendanceSession.destroy({ where: { id: closedWindowSession.id, event_id: fixture.event.id } })).toBe(1);
    expect(await models.AuditLog.destroy({
      where: {
        target_table: "attendance_sessions",
        target_id: closedWindowSession.id,
        action: { [Op.in]: ["QR_SESSION_CREATED", "QR_SESSION_OPENED"] },
      },
    })).toBe(2);
    fixture.sessionIds = fixture.sessionIds.filter((id) => Number(id) !== Number(closedWindowSession.id));

    const createdBatch = await api(
      "post",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/batches`,
      actors.cellLeader.token,
    ).send({ client_request_id: require("node:crypto").randomUUID() });
    const batch = expectData(createdBatch, 201).batch;
    const addedMember = await api("post", `/api/qr-attendance/batches/${batch.id}/items`, actors.cellLeader.token)
      .send({ qr_payload: fixture.qrPayloadB, expected_revision: batch.revision });
    expectData(addedMember, 201);

    const submitted = await api("post", `/api/qr-attendance/batches/${batch.id}/submit`, actors.cellLeader.token)
      .send({ expected_revision: Number(batch.revision) + 1 });
    const submittedBatch = expectData(submitted);
    expect(submittedBatch.batch.state).toBe("submitted");
    expect(submittedBatch.payload).toMatch(/^MCC:BATCH:1:/);

    const wrongSessionResolution = await api("post", "/api/qr-attendance/batches/resolve", actors.registration.token)
      .send({ session_id: fixture.eventSession.id, qr_payload: submittedBatch.payload });
    expect(wrongSessionResolution.status).toBe(409);
    expect(wrongSessionResolution.body.error.code).toBe("BATCH_SESSION_MISMATCH");
    expect(wrongSessionResolution.status).not.toBe(401);

    expect(await qrModels.QrServiceAttendance.count({ where: { source_batch_id: batch.id } })).toBe(0);
    expect(await qrModels.AttendanceBatchItem.destroy({ where: { batch_id: batch.id } })).toBe(1);
    expect(await qrModels.AttendanceBatch.destroy({ where: { id: batch.id, session_id: fixture.serviceSession.id } })).toBe(1);
    expect(await models.AuditLog.destroy({
      where: {
        target_table: "attendance_batches",
        target_id: batch.id,
        action: { [Op.like]: "QR_ATTENDANCE_BATCH_%" },
      },
    })).toBeGreaterThanOrEqual(2);
  });

  it("rejects expired batch submission and requires an audited reason for late approval", async () => {
    if (!fixture.qrPayloadB) {
      const issued = await api("post", `/api/qr-attendance/members/${fixture.memberB.id}/qr`, actors.registration.token).send({});
      expect([200, 201]).toContain(issued.status);
      const state = expectData(await api("get", `/api/qr-attendance/members/${fixture.memberB.id}/qr`, actors.registration.token));
      fixture.qrPayloadB = state.payload;
    }

    const temporarySessions = [];
    const createEventSession = async (sessionKey, title) => {
      const now = Date.now();
      const date = (offsetMs) => new Date(now + offsetMs).toISOString();
      const created = await api("post", "/api/qr-attendance/sessions", actors.admin.token).send({
        target_type: "event",
        target_id: fixture.event.id,
        session_key: sessionKey,
        title,
        starts_at: date(-60 * 60 * 1000),
        ends_at: date(60 * 60 * 1000),
        check_in_opens_at: date(-5 * 60 * 1000),
        check_in_closes_at: date(30 * 60 * 1000),
        approval_deadline: date(60 * 60 * 1000),
        time_zone: "Asia/Manila",
        expected_basis: "none",
        registration_required: false,
        leader_confirmation_mode: "batch_review",
      });
      const session = expectData(created, 201);
      temporarySessions.push(session);
      fixture.sessionIds.push(Number(session.id));
      const opened = expectData(
        await api("post", `/api/qr-attendance/sessions/${session.id}/open`, actors.admin.token).send({}),
      );
      expect(opened).toMatchObject({ status: "open" });
      return session;
    };

    const submitMemberBatch = async (session) => {
      const created = await api("post", `/api/qr-attendance/sessions/${session.id}/batches`, actors.cellLeader.token)
        .send({ client_request_id: require("node:crypto").randomUUID() });
      const batch = expectData(created, 201).batch;
      const added = await api("post", `/api/qr-attendance/batches/${batch.id}/items`, actors.cellLeader.token)
        .send({ qr_payload: fixture.qrPayloadB, expected_revision: batch.revision });
      expectData(added, 201);
      const submitted = await api("post", `/api/qr-attendance/batches/${batch.id}/submit`, actors.cellLeader.token)
        .send({ expected_revision: Number(batch.revision) + 1 });
      return { batch, receipt: expectData(submitted) };
    };

    const cleanupTemporaryEventSession = async (session) => {
      const batchRows = await qrModels.AttendanceBatch.findAll({
        where: { session_id: session.id }, attributes: ["id"], raw: true,
      });
      const batchIds = batchRows.map((row) => Number(row.id));
      const itemRows = batchIds.length ? await qrModels.AttendanceBatchItem.findAll({
        where: { batch_id: { [Op.in]: batchIds } }, attributes: ["id"], raw: true,
      }) : [];
      const attendanceRows = await qrModels.EventAttendance.findAll({
        where: { session_id: session.id }, attributes: ["id"], raw: true,
      });
      const attendanceIds = attendanceRows.map((row) => Number(row.id));
      const relatedTargets = [
        { target_table: "attendance_sessions", target_id: session.id },
        ...(batchIds.length ? [{ target_table: "attendance_batches", target_id: { [Op.in]: batchIds } }] : []),
        ...(itemRows.length ? [{ target_table: "attendance_batch_items", target_id: { [Op.in]: itemRows.map((row) => Number(row.id)) } }] : []),
        ...(attendanceIds.length ? [{ target_table: "event_attendances", target_id: { [Op.in]: attendanceIds } }] : []),
      ];
      const auditRows = await models.AuditLog.findAll({
        where: { action: { [Op.like]: "QR_%" }, [Op.or]: relatedTargets },
        attributes: ["id"],
        raw: true,
      });
      const notificationRows = await models.Notification.findAll({
        where: {
          type: "attendance_event_recorded",
          reference_id: fixture.event.id,
          reference_type: "event",
          message: `Your attendance was recorded for ${session.title}.`,
        },
        attributes: ["id"],
        raw: true,
      });

      await qrModels.sequelize.transaction(async (transaction) => {
        if (batchIds.length) {
          await qrModels.AttendanceBatchItem.destroy({ where: { batch_id: { [Op.in]: batchIds } }, transaction });
        }
        await qrModels.EventAttendance.destroy({ where: { session_id: session.id }, transaction });
        await qrModels.AttendanceExpectedMember.destroy({ where: { session_id: session.id }, transaction });
        if (batchIds.length) await qrModels.AttendanceBatch.destroy({ where: { id: { [Op.in]: batchIds } }, transaction });
        await qrModels.QrAttendanceSession.destroy({ where: { id: session.id, event_id: fixture.event.id }, transaction });
        if (auditRows.length) {
          await models.AuditLog.destroy({ where: { id: { [Op.in]: auditRows.map((row) => Number(row.id)) } }, transaction });
        }
        if (notificationRows.length) {
          await models.Notification.destroy({ where: { id: { [Op.in]: notificationRows.map((row) => Number(row.id)) } }, transaction });
        }
      });

      fixture.sessionIds = fixture.sessionIds.filter((id) => Number(id) !== Number(session.id));
      expect(await qrModels.QrAttendanceSession.count({ where: { id: session.id } })).toBe(0);
      expect(await qrModels.AttendanceBatch.count({ where: { session_id: session.id } })).toBe(0);
      expect(await qrModels.EventAttendance.count({ where: { session_id: session.id } })).toBe(0);
    };

    try {
      const expiredSubmissionSession = await createEventSession(
        `qr-expired-submit-${Date.now()}`,
        "QR expired submission integration session",
      );
      const expiredBatchCreated = await api(
        "post",
        `/api/qr-attendance/sessions/${expiredSubmissionSession.id}/batches`,
        actors.cellLeader.token,
      ).send({ client_request_id: require("node:crypto").randomUUID() });
      const expiredBatch = expectData(expiredBatchCreated, 201).batch;
      const expiredItemAdded = await api(
        "post",
        `/api/qr-attendance/batches/${expiredBatch.id}/items`,
        actors.cellLeader.token,
      ).send({ qr_payload: fixture.qrPayloadB, expected_revision: expiredBatch.revision });
      const expiredDraft = expectData(expiredItemAdded, 201).batch;
      await qrModels.QrAttendanceSession.update(
        { approval_deadline: new Date(Date.now() - 60 * 1000) },
        { where: { id: expiredSubmissionSession.id } },
      );
      const expiredSubmission = await api(
        "post",
        `/api/qr-attendance/batches/${expiredBatch.id}/submit`,
        actors.cellLeader.token,
      ).send({ expected_revision: Number(expiredDraft.revision) });
      expect(expiredSubmission.status).toBe(410);
      expect(expiredSubmission.body.error.code).toBe("BATCH_SUBMISSION_EXPIRED");
      expect(expiredSubmission.status).not.toBe(401);
      await cleanupTemporaryEventSession(expiredSubmissionSession);

      const lateApprovalSession = await createEventSession(
        `qr-late-approval-${Date.now()}`,
        "QR late approval integration session",
      );
      const lateApprovalBatch = await submitMemberBatch(lateApprovalSession);
      await qrModels.QrAttendanceSession.update(
        { approval_deadline: new Date(Date.now() - 60 * 1000) },
        { where: { id: lateApprovalSession.id } },
      );
      const expiredApproval = await api(
        "post",
        `/api/qr-attendance/batches/${lateApprovalBatch.batch.id}/approve`,
        actors.registration.token,
      ).send({
        expected_revision: lateApprovalBatch.receipt.batch.revision,
        content_digest: lateApprovalBatch.receipt.batch.content_digest,
        late_approval: false,
      });
      expect(expiredApproval.status).toBe(410);
      expect(expiredApproval.body.error.code).toBe("BATCH_APPROVAL_EXPIRED");
      expect(expiredApproval.status).not.toBe(401);

      const acceptedLateApproval = await api(
        "post",
        `/api/qr-attendance/batches/${lateApprovalBatch.batch.id}/approve`,
        actors.registration.token,
      ).send({
        expected_revision: lateApprovalBatch.receipt.batch.revision,
        content_digest: lateApprovalBatch.receipt.batch.content_digest,
        late_approval: true,
        late_approval_reason: "Authorized late QA approval",
      });
      expect(expectData(acceptedLateApproval)).toMatchObject({ newly_confirmed_count: 1, already_confirmed_count: 0 });
      expect(await qrModels.EventAttendance.count({ where: { session_id: lateApprovalSession.id, member_id: fixture.memberB.id } })).toBe(1);
      await cleanupTemporaryEventSession(lateApprovalSession);
    } finally {
      for (const session of temporarySessions) {
        if (await qrModels.QrAttendanceSession.count({ where: { id: session.id } })) {
          await cleanupTemporaryEventSession(session);
        }
      }
    }
  });

  it("opens and retries an explicit expected roster without duplicating saved members", async () => {
    const now = Date.now();
    const date = (offsetMs) => new Date(now + offsetMs).toISOString();
    const created = await api("post", "/api/qr-attendance/sessions", actors.admin.token).send({
      target_type: "event",
      target_id: fixture.event.id,
      session_key: `qr-explicit-${now}`,
      title: "QR explicit-roster integration session",
      starts_at: date(-60 * 60 * 1000),
      ends_at: date(2 * 60 * 60 * 1000),
      check_in_opens_at: date(-5 * 60 * 1000),
      check_in_closes_at: date(30 * 60 * 1000),
      approval_deadline: date(2 * 60 * 60 * 1000),
      time_zone: "Asia/Manila",
      expected_basis: "explicit_roster",
      registration_required: false,
      leader_confirmation_mode: "batch_review",
    });
    const session = expectData(created, 201);
    fixture.sessionIds.push(Number(session.id));

    const roster = await api("post", `/api/qr-attendance/sessions/${session.id}/expected-members`, actors.admin.token)
      .send({ member_ids: [fixture.memberA.id, fixture.memberB.id], reason: "Expected integration attendees" });
    expect(expectData(roster, 201)).toMatchObject({ added_count: 2, already_present_count: 0 });

    const opened = await api("post", `/api/qr-attendance/sessions/${session.id}/open`, actors.admin.token).send({});
    expect(expectData(opened)).toMatchObject({ status: "open", expected_count: 2 });
    const retry = await api("post", `/api/qr-attendance/sessions/${session.id}/open`, actors.admin.token).send({});
    expect(expectData(retry)).toMatchObject({ status: "open", expected_count: 2, already_open: true });

    const frozenRows = await qrModels.AttendanceExpectedMember.findAll({
      where: { session_id: session.id },
      attributes: ["member_id", "cell_group_id_at_freeze", "group_id_at_freeze"],
      raw: true,
    });
    expect(frozenRows).toHaveLength(2);
    expect(frozenRows.map((row) => Number(row.member_id)).sort()).toEqual([fixture.memberA.id, fixture.memberB.id].sort());
    expect(frozenRows.find((row) => Number(row.member_id) === fixture.memberA.id)).toMatchObject({
      cell_group_id_at_freeze: fixture.cell.id,
      group_id_at_freeze: fixture.group.id,
    });
  });



  it("persists scoped Cell Group and Group Leader batches for both target types", async () => {
    const fullNameSearch = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/roster?search=${encodeURIComponent(`${fixture.memberB.first_name} ${fixture.memberB.last_name}`)}`,
      actors.cellLeader.token,
    );
    expect(expectData(fullNameSearch).members.map((member) => Number(member.id))).toContain(Number(fixture.memberB.id));

    const reversedNameSearch = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/roster?search=${encodeURIComponent(`${fixture.memberB.last_name} ${fixture.memberB.first_name}`)}`,
      actors.cellLeader.token,
    );
    expect(expectData(reversedNameSearch).members.map((member) => Number(member.id))).toContain(Number(fixture.memberB.id));

    const outsideScopeSearch = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/roster?search=${encodeURIComponent(`${fixture.outsideMember.first_name} ${fixture.outsideMember.last_name}`)}`,
      actors.cellLeader.token,
    );
    expect(expectData(outsideScopeSearch).members).toHaveLength(0);

    const serviceBatch = await submitAndApprove({
      leader: actors.cellLeader,
      sessionId: fixture.serviceSession.id,
      memberPayload: fixture.qrPayloadB,
      expectedNew: 1,
      expectedDuplicate: 0,
      rejectPayload: fixture.qrPayloadOutside,
    });
    const serviceLeaderRecord = await qrModels.QrServiceAttendance.findOne({
      where: { service_id: fixture.service.id, member_id: fixture.memberB.id },
    });
    expect(serviceLeaderRecord).toMatchObject({ entry_source: "leader_batch", source_batch_id: serviceBatch.batchId });
    expect(Number(serviceLeaderRecord.recorded_by)).toBe(actors.cellLeader.user.id);
    expect(Number(serviceLeaderRecord.confirmed_by)).toBe(actors.registration.user.id);

    const cellScopedSummary = await api("get", `/api/qr-attendance/sessions/${fixture.serviceSession.id}/summary`, actors.cellLeader.token);
    expect(expectData(cellScopedSummary).confirmed_count).toBe(2);
    const serviceSummary = await api("get", `/api/qr-attendance/sessions/${fixture.serviceSession.id}/summary`, actors.registration.token);
    expect(expectData(serviceSummary).confirmed_count).toBe(2);

    const eventBatch = await submitAndApprove({
      leader: actors.cellLeader,
      sessionId: fixture.eventSession.id,
      memberPayload: fixture.qrPayloadB,
      expectedNew: 1,
      expectedDuplicate: 0,
    });
    const eventLeaderRecord = await qrModels.EventAttendance.findOne({
      where: { session_id: fixture.eventSession.id, member_id: fixture.memberB.id },
    });
    expect(eventLeaderRecord).toMatchObject({ entry_source: "leader_batch", source_batch_id: eventBatch.batchId });
    expect(Number(eventLeaderRecord.recorded_by)).toBe(actors.cellLeader.user.id);
    expect(Number(eventLeaderRecord.confirmed_by)).toBe(actors.registration.user.id);

    const groupDuplicateBatch = await submitAndApprove({
      leader: actors.groupLeader,
      sessionId: fixture.eventSession.id,
      memberPayload: fixture.qrPayloadB,
      expectedNew: 0,
      expectedDuplicate: 1,
    });
    const groupBatchDetails = await api("get", `/api/qr-attendance/batches/${groupDuplicateBatch.batchId}`, actors.registration.token);
    expect(expectData(groupBatchDetails).items[0].outcome).toBe("already_confirmed");

    const eventSummary = await api("get", `/api/qr-attendance/sessions/${fixture.eventSession.id}/summary`, actors.groupLeader.token);
    expect(expectData(eventSummary).confirmed_count).toBe(2);
    const events = await qrModels.EventAttendance.findAll({ where: { session_id: fixture.eventSession.id } });
    expect(events).toHaveLength(2);
    const eventCsv = await api("get", `/api/qr-attendance/sessions/${fixture.eventSession.id}/export.csv`, actors.registration.token);
    expect(eventCsv.status).toBe(200);
    expect(eventCsv.text).toContain(fixture.memberB.last_name);
    const memberBatchHistory = await api("get", "/api/member-portal/attendance-qr/history", actors.memberB.token);
    expect(expectData(memberBatchHistory).records).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: fixture.event.id, status: "Present" }),
    ]));
  });

  it("keeps churchwide Service attendance totals out of Leader responses", async () => {
    const outsideCheckIn = await api(
      "post",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/check-ins`,
      actors.registration.token,
    ).send({ qr_payload: fixture.qrPayloadOutside });
    expect(expectData(outsideCheckIn, 201).outcome).toBe("confirmed");

    const leaderServices = await api("get", "/api/services?limit=100", actors.unifiedLeader.token)
      .set("X-MCC-Leader-Scope", `cell_group:${fixture.cell.id}`);
    const leaderService = expectData(leaderServices).services.find((row) => Number(row.id) === Number(fixture.service.id));
    expect(leaderService).toBeDefined();
    expect(leaderService.ServiceAttendanceSummary).toBeNull();
    expect(leaderService.pre_registered_count).toBe(0);

    const globalServices = await api("get", "/api/services?limit=100", actors.admin.token);
    const globalService = expectData(globalServices).services.find((row) => Number(row.id) === Number(fixture.service.id));
    expect(Number(globalService.ServiceAttendanceSummary.total_attended)).toBe(3);
    const pastorServices = await api("get", "/api/services?limit=100", actors.pastor.token);
    const pastorService = expectData(pastorServices).services.find((row) => Number(row.id) === Number(fixture.service.id));
    expect(Number(pastorService.ServiceAttendanceSummary.total_attended)).toBe(3);

    const scopedDetail = await api("get", `/api/services/${fixture.service.id}/attendance`, actors.unifiedLeader.token)
      .set("X-MCC-Leader-Scope", `member_group:${fixture.group.id}`);
    const scopedData = expectData(scopedDetail);
    expect(Number(scopedData.summary.total_attended)).toBe(2);
    expect(scopedData.records.map((record) => Number(record.member_id)).sort((a, b) => a - b))
      .toEqual([fixture.memberA.id, fixture.memberB.id].map(Number).sort((a, b) => a - b));

    const globalDetail = await api("get", `/api/services/${fixture.service.id}/attendance`, actors.admin.token);
    expect(Number(expectData(globalDetail).summary.total_attended)).toBe(3);
    const pastorDetail = await api("get", `/api/services/${fixture.service.id}/attendance`, actors.pastor.token);
    expect(Number(expectData(pastorDetail).summary.total_attended)).toBe(3);

    const scopedSummary = await api("get", `/api/services/summary/${fixture.service.id}`, actors.unifiedLeader.token)
      .set("X-MCC-Leader-Scope", `cell_group:${fixture.cell.id}`);
    expect(Number(expectData(scopedSummary).total_attended)).toBe(2);
    const globalSummary = await api("get", `/api/services/summary/${fixture.service.id}`, actors.admin.token);
    expect(Number(expectData(globalSummary).total_attended)).toBe(3);

    await models.ServiceResponse.bulkCreate([
      { service_id: fixture.service.id, member_id: fixture.memberA.id, attendance_status: "ATTENDING" },
      { service_id: fixture.service.id, member_id: fixture.outsideMember.id, attendance_status: "ATTENDING" },
    ]);
    const scopedResponses = await api("get", `/api/services/responses/${fixture.service.id}`, actors.unifiedLeader.token)
      .set("X-MCC-Leader-Scope", `member_group:${fixture.group.id}`);
    expect(expectData(scopedResponses).map((response) => Number(response.member_id))).toEqual([fixture.memberA.id]);
    const globalResponses = await api("get", `/api/services/responses/${fixture.service.id}`, actors.admin.token);
    expect(expectData(globalResponses)).toHaveLength(2);
    const pastorResponses = await api("get", `/api/services/responses/${fixture.service.id}`, actors.pastor.token);
    expect(expectData(pastorResponses)).toHaveLength(2);
  });

  it("returns a filtered read-only Pastor report with unique/visit and team metrics", async () => {
    const reportPath = `/api/attendance/pastor-report?from=${fixture.service.service_date}&to=${fixture.service.service_date}&activity_type=service&activity_id=${fixture.service.id}&mode=all`;
    const reportResponse = await api("get", reportPath, actors.pastor.token);
    const report = expectData(reportResponse);

    expect(report.filters).toMatchObject({
      from: fixture.service.service_date,
      to: fixture.service.service_date,
      activity_type: "service",
      activity_id: Number(fixture.service.id),
      time_zone: "Asia/Manila",
    });
    expect(report.summary).toMatchObject({
      service_visits: 3,
      event_session_visits: 0,
      confirmed_visits: 3,
      unique_attendees: 3,
    });
    expect(report.sessions).toHaveLength(1);
    expect(report.sessions[0]).toMatchObject({
      session_id: fixture.serviceSession.id,
      target_type: "service",
      expected_basis: "none",
      expected_count: null,
    });
    expect(JSON.stringify(report.sessions[0])).not.toMatch(/email|phone|barcode/i);
    expect(report.team_breakdown.cell_groups.length).toBeGreaterThan(0);
    expect(report.trends.some((point) => point.service_visits === 3)).toBe(true);

    const eventReport = expectData(await api(
      "get",
      `/api/attendance/pastor-report?from=${fixture.event.start_date}&to=${fixture.event.start_date}&activity_type=event&activity_id=${fixture.event.id}`,
      actors.pastor.token,
    ));
    expect(eventReport.summary.event_session_visits).toBe(2);
    expect(eventReport.summary.event_unique_participants).toBe(2);
    expect(eventReport.event_activity_summary).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event_id: fixture.event.id,
        unique_participants: 2,
        session_visits: 2,
        qr_session_count: 2,
      }),
    ]));

    const leaderDenied = await api("get", reportPath, actors.unifiedLeader.token)
      .set("X-MCC-Leader-Scope", `cell_group:${fixture.cell.id}`);
    expect(leaderDenied.status).toBe(403);

    const csv = await api("get", `/api/attendance/pastor-report/export.csv?from=${fixture.service.service_date}&to=${fixture.service.service_date}&activity_type=service&activity_id=${fixture.service.id}`, actors.pastor.token);
    expect(csv.status).toBe(200);
    expect(csv.text).toContain("Confirmed visits");
    expect(csv.text).toContain(String(fixture.service.id));

    const memberSearch = await api("get", `/api/attendance/pastor-report/members?search=${encodeURIComponent(fixture.memberA.last_name)}&limit=5`, actors.pastor.token);
    const candidates = expectData(memberSearch);
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: fixture.memberA.id, first_name: fixture.memberA.first_name, last_name: fixture.memberA.last_name }),
    ]));
    expect(Object.keys(candidates.find((member) => Number(member.id) === fixture.memberA.id)))
      .toEqual(expect.arrayContaining(["id", "first_name", "last_name", "status"]));
    expect(candidates.find((member) => Number(member.id) === fixture.memberA.id)).not.toHaveProperty("email");
    expect(candidates.find((member) => Number(member.id) === fixture.memberA.id)).not.toHaveProperty("phone");
    const memberHistory = await api(
      "get",
      `/api/attendance/pastor-report/members/${fixture.memberA.id}/history?from=${fixture.service.service_date}&to=${fixture.service.service_date}&activity_type=service`,
      actors.pastor.token,
    );
    const history = expectData(memberHistory);
    expect(history.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ activity_type: "service", activity_id: fixture.service.id, status: "confirmed" }),
    ]));
    expect(history.records.every((record) => !["email", "phone", "barcode"].some((field) => Object.prototype.hasOwnProperty.call(record, field)))).toBe(true);
    const leaderMemberSearch = await api(
      "get",
      `/api/attendance/pastor-report/members?search=${encodeURIComponent(fixture.memberA.last_name)}`,
      actors.unifiedLeader.token,
    );
    expect(leaderMemberSearch.status).toBe(403);

    const legacyService = await models.Service.create({
      title: `QR CI legacy service ${Date.now()}`,
      service_date: fixture.service.service_date,
      service_time: "11:00:00",
      capacity: 25,
      total_parking_slots: 0,
      status: "completed",
    });
    fixture.serviceIds.push(Number(legacyService.id));
    await models.Attendance.create({
      service_id: legacyService.id,
      member_id: fixture.outsideMember.id,
      check_in_method: "manual",
      checked_in_at: new Date(),
      recorded_by: actors.registration.user.id,
    });
    const legacyReportResponse = await api(
      "get",
      `/api/attendance/pastor-report?from=${fixture.service.service_date}&to=${fixture.service.service_date}&activity_type=service&activity_id=${legacyService.id}`,
      actors.pastor.token,
    );
    const legacyReport = expectData(legacyReportResponse);
    expect(legacyReport.summary.confirmed_visits).toBe(1);
    expect(legacyReport.sessions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        session_id: null,
        target_type: "service",
        target_id: legacyService.id,
        confirmed_visits: 1,
        finalization_status: "no_session",
      }),
    ]));
  });

  it("finalizes expected rosters for Service and Event sessions and reopens reconciliation after corrections", async () => {
    const activityDate = dateOnlyInManila();
    const service = await models.Service.create({
      title: `QR CI finalize service ${Date.now()}`,
      service_date: activityDate,
      service_time: "10:00:00",
      capacity: 40,
      total_parking_slots: 0,
      status: "published",
    });
    fixture.serviceIds.push(Number(service.id));
    const event = await models.Event.create({
      title: `QR CI finalize event ${Date.now()}`,
      start_date: activityDate,
      end_date: activityDate,
      status: "Upcoming",
      created_by: actors.admin.user.id,
    });
    fixture.eventIds.push(Number(event.id));

    for (const target of [
      { type: "service", id: service.id },
      { type: "event", id: event.id },
    ]) {
      const now = Date.now();
      const date = (offsetMs) => new Date(now + offsetMs).toISOString();
      const created = await api("post", "/api/qr-attendance/sessions", actors.admin.token).send({
        target_type: target.type,
        target_id: target.id,
        session_key: `finalize-${target.type}-${now}`,
        title: `Finalize ${target.type} QA session`,
        starts_at: date(-60 * 60 * 1000),
        ends_at: date(2 * 60 * 60 * 1000),
        check_in_opens_at: date(-5 * 60 * 1000),
        check_in_closes_at: date(30 * 60 * 1000),
        approval_deadline: date(2 * 60 * 60 * 1000),
        time_zone: "Asia/Manila",
        expected_basis: "explicit_roster",
        registration_required: false,
        leader_confirmation_mode: "batch_review",
      });
      const session = expectData(created, 201);
      fixture.sessionIds.push(Number(session.id));

      const roster = await api("post", `/api/qr-attendance/sessions/${session.id}/expected-members`, actors.admin.token)
        .send({ member_ids: [fixture.memberA.id, fixture.memberB.id], reason: "Finalize test expected roster" });
      expect(expectData(roster, 201).added_count).toBe(2);
      expectData(await api("post", `/api/qr-attendance/sessions/${session.id}/open`, actors.admin.token).send({}));

      const checkIn = await api("post", `/api/qr-attendance/sessions/${session.id}/check-ins`, actors.registration.token)
        .send({ qr_payload: fixture.qrPayloadA });
      expect(expectData(checkIn, 201).outcome).toBe("confirmed");
      expectData(await api("post", `/api/qr-attendance/sessions/${session.id}/close`, actors.admin.token).send({}));

      const provisional = expectData(await api("get", `/api/qr-attendance/sessions/${session.id}/summary`, actors.pastor.token));
      expect(provisional).toMatchObject({
        finalization_status: "provisional",
        expected_count: 2,
        checked_expected_count: 1,
        provisional_missing_count: 1,
        final_absent_count: null,
      });

      const pastorFinalize = await api("post", `/api/qr-attendance/sessions/${session.id}/finalize`, actors.pastor.token)
        .send({ expected_activity_revision: provisional.activity_revision, reason: "Pastor is read only" });
      expect(pastorFinalize.status).toBe(403);

      const finalized = await api("post", `/api/qr-attendance/sessions/${session.id}/finalize`, actors.registration.token)
        .send({ expected_activity_revision: provisional.activity_revision, reason: "Registration completed reconciliation" });
      expect(expectData(finalized)).toMatchObject({ finalized: true, final_absent_count: 1 });
      const finalSummary = expectData(await api("get", `/api/qr-attendance/sessions/${session.id}/summary`, actors.pastor.token));
      expect(finalSummary).toMatchObject({ finalization_status: "finalized", final_absent_count: 1 });

      const version = target.type === "service" ? 0 : 0;
      const voided = await api("post", `/api/qr-attendance/sessions/${session.id}/members/${fixture.memberA.id}/correction`, actors.registration.token)
        .send({ action: "void", reason: "Correction test invalidates finalization", expected_version: version });
      expect(voided.status).toBe(200);
      const reopened = expectData(await api("get", `/api/qr-attendance/sessions/${session.id}/summary`, actors.pastor.token));
      expect(reopened).toMatchObject({
        finalization_status: "provisional",
        final_absent_count: null,
        provisional_missing_count: 2,
      });
    }
  });

  it("filters and paginates leader batches using the validated state contract", async () => {
    const approvedPage = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.eventSession.id}/batches?state=approved&page=1&limit=1`,
      actors.registration.token,
    );
    const approved = expectData(approvedPage);
    expect(approved).toMatchObject({ total: 2, page: 1, limit: 1 });
    expect(approved.batches).toHaveLength(1);
    expect(approved.batches[0].state).toBe("approved");

    const aliasPage = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.eventSession.id}/batches?status=approved&page=1&limit=1`,
      actors.registration.token,
    );
    expect(expectData(aliasPage).total).toBe(2);

    const conflicting = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.eventSession.id}/batches?state=approved&status=rejected`,
      actors.registration.token,
    );
    expect(conflicting.status).toBe(422);
  });

  it("keeps a dual-assigned Leader's combined reads read-only and binds writes to one typed team", async () => {
    const allHeaders = { "X-MCC-Leader-Scope": "all" };
    const combinedSummary = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/summary`,
      actors.unifiedLeader.token,
    ).set(allHeaders);
    expect(expectData(combinedSummary).confirmed_count).toBe(2);

    const combinedRoster = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/roster?limit=100&page=1`,
      actors.unifiedLeader.token,
    ).set(allHeaders);
    const roster = expectData(combinedRoster);
    expect(roster.total).toBe(2);
    expect(roster.members.map((member) => Number(member.id)).sort((a, b) => a - b))
      .toEqual([fixture.memberA.id, fixture.memberB.id].map(Number).sort((a, b) => a - b));

    const allWrite = await api(
      "post",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/batches`,
      actors.unifiedLeader.token,
    ).set(allHeaders).send({ client_request_id: require("node:crypto").randomUUID() });
    expect(allWrite.status).toBe(409);
    expect(allWrite.body.error.code).toBe("LEADER_SCOPE_REQUIRED");

    const wrongTeamRead = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/summary`,
      actors.unifiedLeader.token,
    ).set("X-MCC-Leader-Scope", `cell_group:${fixture.outsideMember.cell_group_id}`);
    expect(wrongTeamRead.status).toBe(403);

    const selectedCellWrite = await api(
      "post",
      `/api/qr-attendance/sessions/${fixture.serviceSession.id}/batches`,
      actors.unifiedLeader.token,
    ).set("X-MCC-Leader-Scope", `cell_group:${fixture.cell.id}`)
      .send({ client_request_id: require("node:crypto").randomUUID() });
    expect(expectData(selectedCellWrite, 201).batch.cell_group_id).toBe(fixture.cell.id);

    const selectedGroupRead = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.eventSession.id}/summary`,
      actors.unifiedLeader.token,
    ).set("X-MCC-Leader-Scope", `member_group:${fixture.group.id}`);
    expect(expectData(selectedGroupRead).confirmed_count).toBe(2);
  });

  it("serializes concurrent team assignment attempts for an unassigned member", async () => {
    const assignmentUrl = "/api/members/scope/assign";
    const [first, second] = await Promise.all([
      api("post", assignmentUrl, actors.cellLeader.token).send({ member_id: fixture.unassignedMember.id }),
      api("post", assignmentUrl, actors.otherCellLeader.token).send({ member_id: fixture.unassignedMember.id }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const saved = await models.Member.findByPk(fixture.unassignedMember.id, {
      attributes: ["cell_group_id", "group_id"],
    });
    expect([fixture.cell.id, fixture.otherCell.id].map(Number)).toContain(Number(saved.cell_group_id));
    expect(saved.group_id).toBeNull();
  });

  it("preserves Young Adults eligibility and candidate filtering for the group-leader profile", async () => {
    const dateForAge = (years) => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - years);
      return date.toISOString().slice(0, 10);
    };
    const candidateFixtures = [];
    for (const age of [17, 20, 31]) {
      const candidate = await models.Member.create({
        first_name: "Candidate",
        last_name: `Age${age}-${Date.now()}-${process.pid}`,
        birthdate: dateForAge(age),
        status: "Active",
        group_id: null,
      });
      fixture.memberIds.push(Number(candidate.id));
      candidateFixtures.push(candidate);
    }
    const [tooYoung, eligible, tooOld] = candidateFixtures;

    const candidates = await api(
      "get",
      `/api/members/scope/search?search=Age&limit=100`,
      actors.youngAdultsLeader.token,
    );
    const candidateIds = expectData(candidates).map((member) => Number(member.id));
    expect(candidateIds).toContain(Number(eligible.id));
    expect(candidateIds).not.toContain(Number(tooYoung.id));
    expect(candidateIds).not.toContain(Number(tooOld.id));

    const underageAssignment = await api("post", "/api/members/scope/assign", actors.youngAdultsLeader.token)
      .send({ member_id: tooYoung.id });
    expect(underageAssignment.status).toBe(400);
    expect(underageAssignment.body.error.code).toBe("VALIDATION");

    const successfulAssignment = await api("post", "/api/members/scope/assign", actors.youngAdultsLeader.token)
      .send({ member_id: eligible.id });
    expect(expectData(successfulAssignment, 201).group_id).toBe(fixture.youngAdultsGroup.id);

    const overageAssignment = await api("post", "/api/members/scope/assign", actors.youngAdultsLeader.token)
      .send({ member_id: tooOld.id });
    expect(overageAssignment.status).toBe(400);
    expect(overageAssignment.body.error.code).toBe("VALIDATION");
  });

  it("keeps assignment candidates in one selected scope and leaves the other membership dimension intact", async () => {
    const combinedCandidateSearch = await api(
      "get",
      "/api/members/scope/search?search=Outside&limit=20",
      actors.unifiedLeader.token,
    ).set("X-MCC-Leader-Scope", "all");
    expect(combinedCandidateSearch.status).toBe(409);

    const scopedCandidateSearch = await api(
      "get",
      "/api/members/scope/search?search=Outside&limit=20",
      actors.unifiedLeader.token,
    ).set("X-MCC-Leader-Scope", `cell_group:${fixture.cell.id}`);
    expect(expectData(scopedCandidateSearch)).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: fixture.outsideMember.id }),
    ]));

    const removedFromCell = await api(
      "patch",
      `/api/members/${fixture.memberB.id}/unassign-scope`,
      actors.cellLeader.token,
    ).send({});
    expect(removedFromCell.status).toBe(200);
    const member = await models.Member.findByPk(fixture.memberB.id, {
      attributes: ["cell_group_id", "group_id"],
    });
    expect(member.cell_group_id).toBeNull();
    expect(Number(member.group_id)).toBe(Number(fixture.group.id));
  });

  it("scopes Event registration totals consistently for combined and selected Leader contexts", async () => {
    await models.EventRegistration.bulkCreate([
      { event_id: fixture.event.id, member_id: fixture.memberA.id, registered_at: new Date(), registered_by: actors.admin.user.id },
      { event_id: fixture.event.id, member_id: fixture.memberB.id, registered_at: new Date(), registered_by: actors.admin.user.id },
      { event_id: fixture.event.id, member_id: fixture.outsideMember.id, registered_at: new Date(), registered_by: actors.admin.user.id },
    ]);
    const path = `/api/events?search=${encodeURIComponent(fixture.event.title)}&limit=10&page=1`;

    const combined = await api("get", path, actors.unifiedLeader.token)
      .set("X-MCC-Leader-Scope", "all");
    expect(expectData(combined).events[0].registration_count).toBe(2);

    const cellOnly = await api("get", path, actors.unifiedLeader.token)
      .set("X-MCC-Leader-Scope", `cell_group:${fixture.cell.id}`);
    expect(expectData(cellOnly).events[0].registration_count).toBe(1);

    const groupOnly = await api("get", path, actors.unifiedLeader.token)
      .set("X-MCC-Leader-Scope", `member_group:${fixture.group.id}`);
    expect(expectData(groupOnly).events[0].registration_count).toBe(2);

    const churchwide = await api("get", path, actors.admin.token);
    expect(expectData(churchwide).events[0].registration_count).toBe(3);

    for (const reader of [actors.registration, actors.pastor]) {
      const list = await api("get", path, reader.token);
      expect(expectData(list).events[0].registration_count).toBe(3);
      const detail = await api("get", `/api/events/${fixture.event.id}`, reader.token);
      expect(expectData(detail).registration_count).toBe(3);
    }

    const pastorEventWrite = await api("post", "/api/events", actors.pastor.token).send({});
    expect(pastorEventWrite.status).toBe(403);
  });

  it("blocks deleting a team while a leadership assignment references it", async () => {
    expect(await models.Member.count({ where: { cell_group_id: fixture.assignmentGuardCell.id } })).toBe(0);

    const response = await api(
      "delete",
      `/api/cellgroups/${fixture.assignmentGuardCell.id}`,
      actors.admin.token,
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("LEADER_ASSIGNMENTS_EXIST");
    expect(await models.CellGroup.findByPk(fixture.assignmentGuardCell.id)).not.toBeNull();
  });

  it("preserves leader assignment history and invalidates tokens when Admin deletes the account", async () => {
    const userId = actors.assignmentGuardLeader.user.id;
    const assignmentCountBefore = await models.UserLeaderAssignment.count({ where: { user_id: userId } });
    expect(assignmentCountBefore).toBe(1);

    const deletion = await api("delete", `/api/users/${userId}`, actors.admin.token);
    expect(deletion.status).toBe(200);

    const deletedUser = await models.User.findByPk(userId, { attributes: ["is_active", "is_deleted"] });
    expect(Number(deletedUser.is_active)).toBe(0);
    expect(Number(deletedUser.is_deleted)).toBe(1);
    expect(await models.UserLeaderAssignment.count({ where: { user_id: userId } })).toBe(assignmentCountBefore);

    const existingToken = await api("get", "/api/auth/session", actors.assignmentGuardLeader.token);
    expect(existingToken.status).toBe(401);
  });

  it("revokes the previous member QR on a reasoned reissue", async () => {
    const oldPayload = fixture.qrPayloadOutside;
    const reissued = await api("post", `/api/qr-attendance/members/${fixture.outsideMember.id}/qr/reissue`, actors.registration.token)
      .send({ reason: "Integration test reissue" });
    expect(expectData(reissued, 201).version).toBe(2);
    const nextState = expectData(await api("get", `/api/qr-attendance/members/${fixture.outsideMember.id}/qr`, actors.registration.token));
    expect(nextState.payload).not.toBe(oldPayload);

    const oldCodePreview = await api("post", `/api/qr-attendance/sessions/${fixture.eventSession.id}/member-preview`, actors.registration.token)
      .send({ qr_payload: oldPayload });
    expect(oldCodePreview.status).toBe(404);
    const noOutsideEventAttendance = await qrModels.EventAttendance.count({
      where: { session_id: fixture.eventSession.id, member_id: fixture.outsideMember.id },
    });
    expect(noOutsideEventAttendance).toBe(0);
  });

  it("applies Admin assignment revisions immediately to existing tokens and deactivation", async () => {
    const userId = actors.unifiedLeader.user.id;
    const changed = await api("put", `/api/users/${userId}`, actors.admin.token).send({
      role_id: actors.unifiedLeader.user.role_id,
      leader_assignments: { cell_group_id: null, group_id: fixture.group.id },
      leadership_reason: "Remove cell assignment",
      expected_leadership_revision: 0,
    });
    expect(expectData(changed).leadership_revision).toBe(1);

    const staleChange = await api("put", `/api/users/${userId}`, actors.admin.token).send({
      role_id: actors.unifiedLeader.user.role_id,
      leader_assignments: { cell_group_id: fixture.cell.id, group_id: fixture.group.id },
      leadership_reason: "Stale assignment edit",
      expected_leadership_revision: 0,
    });
    expect(staleChange.status).toBe(409);
    expect(staleChange.body.error.code).toBe("LEADERSHIP_REVISION_CHANGED");

    const existingTokenSession = await api("get", "/api/auth/session", actors.unifiedLeader.token);
    const sessionUser = expectData(existingTokenSession).user;
    expect(sessionUser.leaderAssignments).toHaveLength(1);
    expect(sessionUser.leaderAssignments[0].scopeType).toBe("group");

    const groupScopedSummary = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.eventSession.id}/summary`,
      actors.unifiedLeader.token,
    );
    expect(expectData(groupScopedSummary).confirmed_count).toBe(2);

    const revokedLastAssignment = await api("put", `/api/users/${userId}`, actors.admin.token).send({
      role_id: actors.unifiedLeader.user.role_id,
      leader_assignments: { cell_group_id: null, group_id: null },
      leadership_reason: "Revoke the final team assignment",
      expected_leadership_revision: 1,
    });
    expect(expectData(revokedLastAssignment).leadership_revision).toBe(2);
    const assignmentRequiredSession = await api("get", "/api/auth/session", actors.unifiedLeader.token);
    expect(expectData(assignmentRequiredSession).user.leaderAssignments).toHaveLength(0);
    const noScopeRead = await api(
      "get",
      `/api/qr-attendance/sessions/${fixture.eventSession.id}/summary`,
      actors.unifiedLeader.token,
    );
    expect(noScopeRead.status).toBe(403);
    const noScopeWrite = await api(
      "post",
      `/api/qr-attendance/sessions/${fixture.eventSession.id}/batches`,
      actors.unifiedLeader.token,
    ).send({ client_request_id: require("node:crypto").randomUUID() });
    expect(noScopeWrite.status).toBe(409);

    const deactivated = await api("put", `/api/users/${userId}/deactivate`, actors.admin.token);
    expect(deactivated.status).toBe(200);
    const priorTokenAfterDeactivation = await api("get", "/api/auth/session", actors.unifiedLeader.token);
    expect(priorTokenAfterDeactivation.status).toBe(401);
  });
});
