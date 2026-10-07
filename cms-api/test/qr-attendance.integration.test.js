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
    const roleNames = ["System Admin", "Pastor", "Registration Team", "Cell Group Leader", "Group Leader", "Leader", "Member"];
    const roleRows = await models.Role.findAll({ where: { role_name: roleNames } });
    const roles = new Map(roleRows.map((role) => [role.role_name, role]));
    for (const roleName of roleNames) expect(roles.has(roleName)).toBe(true);

    const cell = await models.CellGroup.create({ name: `QR CI cell ${suffix}`, area: "CI" });
    const otherCell = await models.CellGroup.create({ name: `QR CI other cell ${suffix}`, area: "CI" });
    const assignmentGuardCell = await models.CellGroup.create({ name: `QR CI guarded cell ${suffix}`, area: "CI" });
    const group = await models.Group.create({ name: `QR CI group ${suffix}` });
    const otherGroup = await models.Group.create({ name: `QR CI other group ${suffix}` });
    const youngAdultsGroup = await models.Group.create({ name: `Young Adults QA ${suffix}` });

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
    const unassignedMember = await models.Member.create({
      first_name: "QR",
      last_name: `Concurrent-${suffix}`,
      status: "Active",
      cell_group_id: null,
      group_id: null,
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
    const event = await models.Event.create({
      title: `QR CI Event ${suffix}`,
      start_date: activityDate,
      end_date: activityDate,
      status: "Upcoming",
      created_by: actors.admin.user.id,
    });

    fixture = {
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
    const event = await models.Event.create({
      title: `QR CI finalize event ${Date.now()}`,
      start_date: activityDate,
      end_date: activityDate,
      status: "Upcoming",
      created_by: actors.admin.user.id,
    });

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
    const [tooYoung, eligible, tooOld] = await Promise.all([17, 20, 31].map((age) =>
      models.Member.create({
        first_name: "Candidate",
        last_name: `Age${age}-${Date.now()}-${process.pid}`,
        birthdate: dateForAge(age),
        status: "Active",
        group_id: null,
      }),
    ));

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
