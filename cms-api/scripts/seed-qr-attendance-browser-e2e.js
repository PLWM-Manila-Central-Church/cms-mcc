"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const bcrypt = require("bcrypt");
const sequelize = require("../src/config/db");
const { assertSafeQrTestTarget } = require("./qr-test-target");
const {
  CellGroup,
  Event,
  Group,
  Member,
  Role,
  Service,
  SystemSetting,
  User,
} = require("../src/models");

const run = async () => {
  assert.equal(process.env.NODE_ENV, "test", "Refusing to seed outside test mode");
  assert.equal(process.env.QR_ATTENDANCE_BROWSER_E2E, "true", "Refusing to seed outside the isolated browser E2E job");
  assertSafeQrTestTarget(process.env);
  assert.ok(process.env.QR_E2E_FIXTURE_PATH, "QR_E2E_FIXTURE_PATH is required");

  await sequelize.authenticate();
  const roleNames = ["System Admin", "Registration Team", "Cell Group Leader", "Group Leader", "Member"];
  const roleRows = await Role.findAll({ where: { role_name: roleNames } });
  const roles = new Map(roleRows.map((role) => [role.role_name, role]));
  for (const roleName of roleNames) assert.ok(roles.has(roleName), `Missing seeded role: ${roleName}`);

  const suffix = `${Date.now()}-${process.pid}`;
  const password = "QR-E2E-Only-2026!";
  const passwordHash = await bcrypt.hash(password, 10);
  const cell = await CellGroup.create({ name: `QR Browser E2E Cell ${suffix}`, area: "CI" });
  const outsideCell = await CellGroup.create({ name: `QR Browser E2E Other Cell ${suffix}`, area: "CI" });
  const group = await Group.create({ name: `QR Browser E2E Group ${suffix}` });

  const memberA = await Member.create({ first_name: "CI Member", last_name: `Direct-${suffix}`, status: "Active", cell_group_id: cell.id, group_id: group.id });
  const memberB = await Member.create({ first_name: "CI Member", last_name: `Cell-${suffix}`, status: "Active", cell_group_id: cell.id, group_id: group.id });
  const memberC = await Member.create({ first_name: "CI Member", last_name: `Group-${suffix}`, status: "Active", cell_group_id: outsideCell.id, group_id: group.id });

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
  const registration = await makeUser("Registration Team", "registration");
  const cellLeader = await makeUser("Cell Group Leader", "cell-leader", null, { leads_cell_group_id: cell.id });
  const groupLeader = await makeUser("Group Leader", "group-leader", null, { leads_group_id: group.id });
  const memberAUser = await makeUser("Member", "member-a", memberA.id);
  const memberBUser = await makeUser("Member", "member-b", memberB.id);
  const memberCUser = await makeUser("Member", "member-c", memberC.id);

  await SystemSetting.update(
    { value: "false", updated_by: adminUser.id },
    { where: { key: "qr_attendance_enabled" } },
  );
  const today = new Date().toISOString().slice(0, 10);
  const service = await Service.create({
    title: `QR Browser E2E Service ${suffix}`,
    service_date: today,
    service_time: "10:00:00",
    capacity: 30,
    total_parking_slots: 0,
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
    members: {
      direct: { ...memberAUser, firstName: memberA.first_name, lastName: memberA.last_name },
      cell: { ...memberBUser, firstName: memberB.first_name, lastName: memberB.last_name },
      group: { ...memberCUser, firstName: memberC.first_name, lastName: memberC.last_name },
    },
    service: { id: service.id, title: service.title },
    event: { id: event.id, title: event.title },
  }), { encoding: "utf8", mode: 0o600 });
  console.log("Seeded synthetic QR browser E2E fixtures into isolated CI MySQL.");
};

run()
  .catch((error) => {
    console.error("QR browser E2E fixture seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
