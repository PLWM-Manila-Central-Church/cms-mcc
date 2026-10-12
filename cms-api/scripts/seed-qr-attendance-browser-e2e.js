"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const bcrypt = require("bcrypt");
const sequelize = require("../src/config/db");
const dateOnlyInTimezone = require("../src/helpers/dateOnlyInTimezone");
const { assertSafeQrTestTarget } = require("./qr-test-target");
const {
  CellGroup,
  Event,
  Group,
  InventoryCategory,
  Member,
  Role,
  Service,
  SystemSetting,
  User,
  UserLeaderAssignment,
} = require("../src/models");

const run = async () => {
  assert.equal(process.env.NODE_ENV, "test", "Refusing to seed outside test mode");
  assert.equal(process.env.QR_ATTENDANCE_BROWSER_E2E, "true", "Refusing to seed outside the isolated browser E2E job");
  assertSafeQrTestTarget(process.env);
  assert.ok(process.env.QR_E2E_FIXTURE_PATH, "QR_E2E_FIXTURE_PATH is required");

  await sequelize.authenticate();
  const roleNames = ["System Admin", "Registration Team", "Cell Group Leader", "Group Leader", "Leader", "Pastor", "Finance Team", "Member"];
  const roleRows = await Role.findAll({ where: { role_name: roleNames } });
  const roles = new Map(roleRows.map((role) => [role.role_name, role]));
  for (const roleName of roleNames) assert.ok(roles.has(roleName), `Missing seeded role: ${roleName}`);

  const suffix = `${Date.now()}-${process.pid}`;
  const password = process.env.QR_E2E_PASSWORD || "QR-E2E-Only-2026!";
  const passwordHash = await bcrypt.hash(password, 10);
  const cell = await CellGroup.create({ name: `QR Browser E2E Cell ${suffix}`, area: "CI" });
  const outsideCell = await CellGroup.create({ name: `QR Browser E2E Other Cell ${suffix}`, area: "CI" });
  const group = await Group.create({ name: `QR Browser E2E Group ${suffix}` });
  const inventoryCategory = await InventoryCategory.create({ name: `QR Browser E2E Inventory ${suffix}` });

  const memberA = await Member.create({ first_name: "CI Member", last_name: `Direct-${suffix}`, status: "Active", cell_group_id: cell.id, group_id: group.id });
  const memberB = await Member.create({ first_name: "CI Member", last_name: `Cell-${suffix}`, status: "Active", cell_group_id: cell.id, group_id: group.id });
  const memberC = await Member.create({ first_name: "CI Member", last_name: `Group-${suffix}`, status: "Active", cell_group_id: outsideCell.id, group_id: group.id });
  const memberD = await Member.create({ first_name: "CI Member", last_name: `Unified-${suffix}`, status: "Active", cell_group_id: cell.id, group_id: group.id });
  const leaderMember = await Member.create({
    first_name: "CI Leader",
    last_name: `Unified-${suffix}`,
    status: "Active",
    cell_group_id: cell.id,
    group_id: group.id,
  });

  const makeUser = async (roleName, username, memberId = null, scope = {}) => {
    const email = `qr-browser-${username}-${suffix}@example.com`;
    await User.create({
      role_id: roles.get(roleName).id,
      member_id: memberId,
      email,
      password_hash: passwordHash,
      is_active: 1,
      force_password_change: 0,
      ...scope,
    });
    return { email, password };
  };

  const admin = await makeUser("System Admin", "admin");
  const adminUser = await User.findOne({ where: { email: admin.email } });
  const qrSetting = await SystemSetting.findOne({ where: { key: "qr_attendance_enabled" } });
  const registration = await makeUser("Registration Team", "registration");
  const cellLeader = await makeUser("Cell Group Leader", "cell-leader", null, { leads_cell_group_id: cell.id });
  const groupLeader = await makeUser("Group Leader", "group-leader", null, { leads_group_id: group.id });
  const unifiedLeader = await makeUser("Leader", "unified-leader", leaderMember.id, { leads_cell_group_id: cell.id, leads_group_id: group.id });
  const unifiedLeaderUser = await User.findOne({ where: { email: unifiedLeader.email }, attributes: ["id"] });
  await UserLeaderAssignment.bulkCreate([
    {
      user_id: unifiedLeaderUser.id,
      scope_type: "cell_group",
      scope_id: cell.id,
      legacy_column: "leads_cell_group_id",
      assigned_by: adminUser.id,
      is_active: true,
      version: 1,
    },
    {
      user_id: unifiedLeaderUser.id,
      scope_type: "member_group",
      scope_id: group.id,
      legacy_column: "leads_group_id",
      assigned_by: adminUser.id,
      is_active: true,
      version: 1,
    },
  ]);
  const pastor = await makeUser("Pastor", "pastor");
  const finance = await makeUser("Finance Team", "finance");
  const memberAUser = await makeUser("Member", "member-a", memberA.id);
  const memberBUser = await makeUser("Member", "member-b", memberB.id);
  const memberCUser = await makeUser("Member", "member-c", memberC.id);
  const memberDUser = await makeUser("Member", "member-d", memberD.id);
  await SystemSetting.update(
    { value: "false", updated_by: adminUser.id },
    { where: { key: "qr_attendance_enabled" } },
  );
  const today = dateOnlyInTimezone(new Date(), "Asia/Manila");
  const service = await Service.create({
    title: `QR Browser E2E Service ${suffix}`,
    service_date: today,
    service_time: "10:00:00",
    capacity: 30,
    total_parking_slots: 6,
    status: "published",
  });
  const event = await Event.create({
    title: `QR Browser E2E Event ${suffix}`,
    start_date: today,
    end_date: today,
    status: "Upcoming",
    created_by: adminUser.id,
  });

  fs.writeFileSync(process.env.QR_E2E_FIXTURE_PATH, JSON.stringify({
    password,
    admin,
    registration,
    cellLeader,
    groupLeader,
    unifiedLeader,
    pastor,
    finance,
    leaderScopes: { cellGroupId: cell.id, groupId: group.id },
    previousQrAttendanceSetting: qrSetting ? { value: qrSetting.value, updated_by: qrSetting.updated_by } : null,
    createdIds: {
      cellGroupIds: [cell.id, outsideCell.id],
      groupId: group.id,
      memberIds: [memberA.id, memberB.id, memberC.id, memberD.id, leaderMember.id],
      ministryAssignmentIds: [],
      serviceId: service.id,
      eventId: event.id,
      inventoryCategoryId: inventoryCategory.id,
      inventoryItemName: `QR Browser E2E Inventory Item ${suffix}`,
      userEmails: [admin.email, registration.email, cellLeader.email, groupLeader.email, unifiedLeader.email, pastor.email, finance.email, memberAUser.email, memberBUser.email, memberCUser.email, memberDUser.email],
    },
    members: {
      direct: { ...memberAUser, firstName: memberA.first_name, lastName: memberA.last_name },
      cell: { ...memberBUser, firstName: memberB.first_name, lastName: memberB.last_name },
      group: { ...memberCUser, firstName: memberC.first_name, lastName: memberC.last_name },
      unified: { ...memberDUser, firstName: memberD.first_name, lastName: memberD.last_name },
    },
    service: { id: service.id, title: service.title },
    event: { id: event.id, title: event.title },
  }), { encoding: "utf8", mode: 0o600 });
  console.log("Seeded synthetic QR browser E2E fixtures into the isolated QR QA database.");
};

run()
  .catch((error) => {
    console.error("QR browser E2E fixture seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
