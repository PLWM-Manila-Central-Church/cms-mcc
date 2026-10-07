"use strict";

require("dotenv").config();

const { assertSafeQrTestTarget } = require("../scripts/qr-test-target");
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

    const suffix = `${Date.now()}-${process.pid}`;
    const roleNames = ["System Admin", "Registration Team", "Cell Group Leader", "Group Leader", "Member"];
    const roleRows = await models.Role.findAll({ where: { role_name: roleNames } });
    const roles = new Map(roleRows.map((role) => [role.role_name, role]));
    for (const roleName of roleNames) expect(roles.has(roleName)).toBe(true);

    const cell = await models.CellGroup.create({ name: `QR CI cell ${suffix}`, area: "CI" });
    const otherCell = await models.CellGroup.create({ name: `QR CI other cell ${suffix}`, area: "CI" });
    const group = await models.Group.create({ name: `QR CI group ${suffix}` });
    const otherGroup = await models.Group.create({ name: `QR CI other group ${suffix}` });

    const memberA = await models.Member.create({
      first_name: "QR",
      last_name: `Direct-${suffix}`,
      status: "Active",
      cell_group_id: cell.id,
      group_id: group.id,
    });
    const memberB = await models.Member.create({
      first_name: "QR",
      last_name: `Batch-${suffix}`,
      status: "Active",
      cell_group_id: cell.id,
      group_id: group.id,
    });
    const outsideMember = await models.Member.create({
      first_name: "QR",
      last_name: `Outside-${suffix}`,
      status: "Active",
      cell_group_id: otherCell.id,
      group_id: otherGroup.id,
    });

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
      return { user, token: tokenFor(user) };
    };

    actors = {
      admin: await makeUser("System Admin", "admin"),
      registration: await makeUser("Registration Team", "registration"),
      memberA: await makeUser("Member", "member-a", memberA.id),
      memberB: await makeUser("Member", "member-b", memberB.id),
      cellLeader: await makeUser("Cell Group Leader", "cell-leader", null, { leads_cell_group_id: cell.id }),
      groupLeader: await makeUser("Group Leader", "group-leader", null, { leads_group_id: group.id }),
    };

    await models.SystemSetting.update(
      { value: "true", updated_by: actors.admin.user.id },
      { where: { key: "qr_attendance_enabled" } },
    );
    const availability = await api("get", "/api/qr-attendance/capabilities", actors.admin.token);
    expect(expectData(availability)).toMatchObject({ enabled: true, schemaReady: true });

    const service = await models.Service.create({
      title: `QR CI Service ${suffix}`,
      service_date: new Date().toISOString().slice(0, 10),
      service_time: "10:00:00",
      capacity: 20,
      total_parking_slots: 0,
      status: "published",
    });
    const event = await models.Event.create({
      title: `QR CI Event ${suffix}`,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      status: "Upcoming",
      created_by: actors.admin.user.id,
    });

    fixture = {
      memberA,
      memberB,
      outsideMember,
      cell,
      group,
      service,
      event,
      serviceSession: await makeSession("service", service.id, "primary", "QR CI Service Session"),
      eventSession: await makeSession("event", event.id, "qr-ci-session", "QR CI Event Session"),
    };
  });

  afterAll(async () => {
    if (qrModels?.sequelize) await qrModels.sequelize.close();
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

  it("persists scoped Cell Group and Group Leader batches for both target types", async () => {
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
});
