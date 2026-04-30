"use strict";

require("dotenv").config();

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { Op } = require("sequelize");

const sequelize = require("../src/config/db");
const {
  ArchiveAccessLog,
  ArchiveCategory,
  ArchiveRecord,
  ArchiveVersion,
  Attendance,
  AuditLog,
  CellGroup,
  CellGroupHistory,
  EmergencyContact,
  Event,
  EventCategory,
  EventRegistration,
  FinancialCategory,
  FinancialRecord,
  Group,
  InventoryCategory,
  InventoryItem,
  InventoryRequest,
  InventoryUsage,
  InvitedMember,
  Member,
  MemberNote,
  MemberStatusHistory,
  MinistryAssignment,
  MinistryEventInvite,
  MinistryMembership,
  MinistryRole,
  Notification,
  PasswordResetToken,
  RefreshToken,
  Role,
  Service,
  ServiceAttendanceSummary,
  ServiceResponse,
  SubstituteRequest,
  User,
  UserSession,
} = require("../src/models");

const EXPECTED_MARKER = "PLWM_MCC_QA";
const DEMO_PREFIX = "[DEMO]";
const DEMO_EMAIL_DOMAIN = "plwm-mcc.example.com";
const DEMO_EMAIL_DOMAINS = [DEMO_EMAIL_DOMAIN, "plwm-mcc.test"];

const assertDemoRunAllowed = () => {
  if (process.env.ALLOW_PRODUCTION_DEMO_DATA !== "true") {
    throw new Error(
      "Refusing to run demo data script. Set ALLOW_PRODUCTION_DEMO_DATA=true after taking a production backup.",
    );
  }

  if (process.env.DEMO_DATA_MARKER !== EXPECTED_MARKER) {
    throw new Error(
      `Refusing to run demo data script. Set DEMO_DATA_MARKER=${EXPECTED_MARKER}.`,
    );
  }
};

const demoToken = () => `[DEMO:${process.env.DEMO_DATA_MARKER}]`;
const demoEmail = (name) => `demo.${name}@${DEMO_EMAIL_DOMAIN}`;
const demoEmailConditions = () => DEMO_EMAIL_DOMAINS.map((domain) => ({
  email: { [Op.like]: `demo.%@${domain}` },
}));
const demoNote = (text) => `${demoToken()} ${text}`;
const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const dateOnly = (date) => date.toISOString().slice(0, 10);
const compact = (items) => items.filter(Boolean);

const unscoped = (model) => (typeof model.unscoped === "function" ? model.unscoped() : model);

const destroyWhere = async (model, where, transaction) => {
  if (!where) return 0;
  return unscoped(model).destroy({ where, transaction });
};

const inWhere = (field, ids) => {
  if (!ids.length) return null;
  return { [field]: { [Op.in]: ids } };
};

const orWhere = (conditions) => {
  const valid = compact(conditions);
  return valid.length ? { [Op.or]: valid } : null;
};

const idsFor = async (model, where, transaction) => {
  if (!where) return [];
  const rows = await unscoped(model).findAll({
    attributes: ["id"],
    where,
    transaction,
  });
  return rows.map((row) => row.id);
};

const findRequired = async (model, where, label, transaction) => {
  const row = await model.findOne({ where, transaction });
  if (!row) {
    throw new Error(`Missing required reference data: ${label}. Run db:migrate and db:seed first.`);
  }
  return row;
};

const findFirstRequired = async (model, field, values, label, transaction) => {
  for (const value of values) {
    const row = await model.findOne({ where: { [field]: value }, transaction });
    if (row) return row;
  }
  throw new Error(`Missing required reference data: ${label}. Expected one of: ${values.join(", ")}`);
};

const createMember = async (member, transaction) => Member.create(
  {
    status: "Active",
    address: demoNote("Demo address for QA testing only."),
    phone: "+639170000000",
    ...member,
  },
  { transaction },
);

const createUser = async ({ role, member, email, passwordHash, scope = {} }, transaction) => User.create(
  {
    role_id: role.id,
    member_id: member ? member.id : null,
    email,
    password_hash: passwordHash,
    is_active: 1,
    force_password_change: 0,
    ...scope,
  },
  { transaction },
);

const collectDemoIds = async (transaction) => {
  const token = demoToken();
  const memberIds = await idsFor(
    Member,
    orWhere([
      ...demoEmailConditions(),
      { first_name: { [Op.like]: `${DEMO_PREFIX}%` } },
    ]),
    transaction,
  );
  const userIds = await idsFor(
    User,
    orWhere(demoEmailConditions()),
    transaction,
  );
  const serviceIds = await idsFor(
    Service,
    { title: { [Op.like]: `${DEMO_PREFIX}%` } },
    transaction,
  );
  const eventIds = await idsFor(
    Event,
    orWhere([
      { title: { [Op.like]: `${DEMO_PREFIX}%` } },
      { description: { [Op.like]: `%${token}%` } },
    ]),
    transaction,
  );
  const inventoryItemIds = await idsFor(
    InventoryItem,
    orWhere([
      { name: { [Op.like]: `${DEMO_PREFIX}%` } },
      { notes: { [Op.like]: `%${token}%` } },
    ]),
    transaction,
  );
  const archiveRecordIds = await idsFor(
    ArchiveRecord,
    orWhere([
      { title: { [Op.like]: `${DEMO_PREFIX}%` } },
      { description: { [Op.like]: `%${token}%` } },
    ]),
    transaction,
  );
  const assignmentIds = await idsFor(
    MinistryAssignment,
    orWhere([
      inWhere("service_id", serviceIds),
      inWhere("member_id", memberIds),
    ]),
    transaction,
  );

  return {
    archiveRecordIds,
    assignmentIds,
    eventIds,
    inventoryItemIds,
    memberIds,
    serviceIds,
    userIds,
  };
};

const cleanupDemoData = async (transaction) => {
  const ids = await collectDemoIds(transaction);
  const token = demoToken();

  await destroyWhere(Notification, orWhere([
    inWhere("user_id", ids.userIds),
    { message: { [Op.like]: `%${token}%` } },
  ]), transaction);
  await destroyWhere(AuditLog, orWhere([
    inWhere("user_id", ids.userIds),
    { action: { [Op.like]: "DEMO_%" } },
  ]), transaction);
  await destroyWhere(UserSession, inWhere("user_id", ids.userIds), transaction);
  await destroyWhere(RefreshToken, inWhere("user_id", ids.userIds), transaction);
  await destroyWhere(PasswordResetToken, inWhere("user_id", ids.userIds), transaction);

  await destroyWhere(ArchiveAccessLog, orWhere([
    inWhere("record_id", ids.archiveRecordIds),
    inWhere("accessed_by", ids.userIds),
  ]), transaction);
  await destroyWhere(ArchiveVersion, orWhere([
    inWhere("record_id", ids.archiveRecordIds),
  ]), transaction);
  await destroyWhere(ArchiveRecord, orWhere([
    inWhere("id", ids.archiveRecordIds),
    { description: { [Op.like]: `%${token}%` } },
  ]), transaction);

  await destroyWhere(FinancialRecord, orWhere([
    inWhere("member_id", ids.memberIds),
    inWhere("recorded_by", ids.userIds),
    inWhere("deleted_by", ids.userIds),
    { notes: { [Op.like]: `%${token}%` } },
  ]), transaction);

  await destroyWhere(InventoryRequest, orWhere([
    inWhere("item_id", ids.inventoryItemIds),
    inWhere("requested_by", ids.userIds),
    inWhere("reviewed_by", ids.userIds),
    { purpose: { [Op.like]: `%${token}%` } },
  ]), transaction);
  await destroyWhere(InventoryUsage, orWhere([
    inWhere("item_id", ids.inventoryItemIds),
    inWhere("used_by", ids.userIds),
    { used_for: { [Op.like]: `%${token}%` } },
  ]), transaction);
  await destroyWhere(InventoryItem, orWhere([
    inWhere("id", ids.inventoryItemIds),
    { notes: { [Op.like]: `%${token}%` } },
  ]), transaction);

  await destroyWhere(MinistryEventInvite, orWhere([
    inWhere("event_id", ids.eventIds),
    inWhere("member_id", ids.memberIds),
  ]), transaction);
  await destroyWhere(EventRegistration, orWhere([
    inWhere("event_id", ids.eventIds),
    inWhere("member_id", ids.memberIds),
  ]), transaction);
  await destroyWhere(Event, orWhere([
    inWhere("id", ids.eventIds),
    { description: { [Op.like]: `%${token}%` } },
  ]), transaction);

  await destroyWhere(SubstituteRequest, orWhere([
    inWhere("assignment_id", ids.assignmentIds),
    inWhere("requested_by", ids.userIds),
    inWhere("proposed_substitute", ids.userIds),
    inWhere("resolved_by", ids.userIds),
    { reason: { [Op.like]: `%${token}%` } },
  ]), transaction);
  await destroyWhere(MinistryAssignment, orWhere([
    inWhere("id", ids.assignmentIds),
    inWhere("service_id", ids.serviceIds),
    inWhere("member_id", ids.memberIds),
  ]), transaction);

  await destroyWhere(Attendance, orWhere([
    inWhere("service_id", ids.serviceIds),
    inWhere("member_id", ids.memberIds),
  ]), transaction);
  await destroyWhere(ServiceResponse, orWhere([
    inWhere("service_id", ids.serviceIds),
    inWhere("member_id", ids.memberIds),
    { override_reason: { [Op.like]: `%${token}%` } },
  ]), transaction);
  await destroyWhere(ServiceAttendanceSummary, inWhere("service_id", ids.serviceIds), transaction);
  await destroyWhere(Service, inWhere("id", ids.serviceIds), transaction);

  await destroyWhere(MinistryMembership, orWhere([
    inWhere("member_id", ids.memberIds),
  ]), transaction);
  await destroyWhere(EmergencyContact, inWhere("member_id", ids.memberIds), transaction);
  await destroyWhere(MemberNote, orWhere([
    inWhere("member_id", ids.memberIds),
    { note: { [Op.like]: `%${token}%` } },
  ]), transaction);
  await destroyWhere(CellGroupHistory, orWhere([
    inWhere("member_id", ids.memberIds),
    inWhere("changed_by", ids.userIds),
    { reason: { [Op.like]: `%${token}%` } },
  ]), transaction);
  await destroyWhere(MemberStatusHistory, orWhere([
    inWhere("member_id", ids.memberIds),
    inWhere("changed_by", ids.userIds),
    { reason: { [Op.like]: `%${token}%` } },
  ]), transaction);

  await destroyWhere(InvitedMember, orWhere([
    ...demoEmailConditions(),
    inWhere("invited_by", ids.userIds),
  ]), transaction);
  await destroyWhere(User, inWhere("id", ids.userIds), transaction);
  await destroyWhere(Member, inWhere("id", ids.memberIds), transaction);
};

const seedDemoData = async (transaction) => {
  await cleanupDemoData(transaction);

  const token = demoToken();
  const [
    adminRole,
    pastorRole,
    registrationRole,
    financeRole,
    ministryLeaderRole,
    cellGroupLeaderRole,
    groupLeaderRole,
    memberRole,
  ] = await Promise.all([
    findRequired(Role, { role_name: "System Admin" }, "System Admin role", transaction),
    findRequired(Role, { role_name: "Pastor" }, "Pastor role", transaction),
    findRequired(Role, { role_name: "Registration Team" }, "Registration Team role", transaction),
    findRequired(Role, { role_name: "Finance Team" }, "Finance Team role", transaction),
    findRequired(Role, { role_name: "Ministry Leader" }, "Ministry Leader role", transaction),
    findRequired(Role, { role_name: "Cell Group Leader" }, "Cell Group Leader role", transaction),
    findRequired(Role, { role_name: "Group Leader" }, "Group Leader role", transaction),
    findRequired(Role, { role_name: "Member" }, "Member role", transaction),
  ]);

  const [youngAdults, mensGroup, womensGroup, cg11, cg12, ministryRole] = await Promise.all([
    findFirstRequired(Group, "name", ["Young Adults", "YA"], "Young Adults group", transaction),
    findFirstRequired(Group, "name", ["Men's Group", "Men"], "Men's Group", transaction),
    findFirstRequired(Group, "name", ["Women's Group", "Women"], "Women's Group", transaction),
    findFirstRequired(CellGroup, "name", ["Cell Group 11 UPS 5", "Cell Group 11"], "Cell Group 11", transaction),
    findFirstRequired(CellGroup, "name", ["Cell Group 12 Sucat", "Cell Group 12"], "Cell Group 12", transaction),
    findFirstRequired(MinistryRole, "name", ["Vocalist", "Worship Leader", "Others"], "demo ministry role", transaction),
  ]);

  const [eventCategory, inventoryCategory, lowStockCategory, archiveCategory, financeTithe, financeOffering] = await Promise.all([
    findFirstRequired(EventCategory, "name", ["Youth Event", "Fellowship", "Others"], "event category", transaction),
    findFirstRequired(InventoryCategory, "name", ["Audio Equipment", "Event Supplies", "Others"], "inventory category", transaction),
    findFirstRequired(InventoryCategory, "name", ["Office Supplies", "Others"], "inventory low-stock category", transaction),
    findFirstRequired(ArchiveCategory, "name", ["Meeting Minutes", "Others"], "archive category", transaction),
    findFirstRequired(FinancialCategory, "name", ["Tithes", "Offering", "Others"], "tithe category", transaction),
    findFirstRequired(FinancialCategory, "name", ["Offering", "Others"], "offering category", transaction),
  ]);

  const members = {};
  members.admin = await createMember({
    first_name: `${DEMO_PREFIX} Admin`,
    last_name: "Tester",
    email: demoEmail("admin.member"),
    birthdate: "1986-01-15",
    spiritual_birthday: "2008-06-01",
    gender: "Male",
  }, transaction);
  members.pastor = await createMember({
    first_name: `${DEMO_PREFIX} Pastor`,
    last_name: "Tester",
    email: demoEmail("pastor.member"),
    birthdate: "1978-04-10",
    spiritual_birthday: "1998-02-11",
    gender: "Male",
  }, transaction);
  members.registration = await createMember({
    first_name: `${DEMO_PREFIX} Registration`,
    last_name: "Tester",
    email: demoEmail("registration.member"),
    birthdate: "1992-09-08",
    spiritual_birthday: "2012-03-19",
    gender: "Female",
  }, transaction);
  members.finance = await createMember({
    first_name: `${DEMO_PREFIX} Finance`,
    last_name: "Tester",
    email: demoEmail("finance.member"),
    birthdate: "1989-11-23",
    spiritual_birthday: "2010-08-05",
    gender: "Female",
  }, transaction);
  members.ministryLeader = await createMember({
    first_name: `${DEMO_PREFIX} Ministry`,
    last_name: "Leader",
    email: demoEmail("ministry.leader.member"),
    birthdate: "1996-05-20",
    spiritual_birthday: "2015-01-12",
    gender: "Female",
    group_id: youngAdults.id,
    cell_group_id: cg12.id,
  }, transaction);
  members.cellLeader = await createMember({
    first_name: `${DEMO_PREFIX} Cell Group`,
    last_name: "Leader",
    email: demoEmail("cg.leader.member"),
    birthdate: "1994-08-18",
    spiritual_birthday: "2014-06-22",
    gender: "Male",
    group_id: youngAdults.id,
    cell_group_id: cg11.id,
  }, transaction);
  members.groupLeader = await createMember({
    first_name: `${DEMO_PREFIX} YA`,
    last_name: "Leader",
    email: demoEmail("group.leader.member"),
    birthdate: "1995-12-03",
    spiritual_birthday: "2013-07-14",
    gender: "Male",
    group_id: youngAdults.id,
    cell_group_id: cg11.id,
  }, transaction);
  members.portal = await createMember({
    first_name: `${DEMO_PREFIX} Portal`,
    last_name: "Member",
    email: demoEmail("portal.member"),
    birthdate: "2001-10-02",
    spiritual_birthday: "2020-01-20",
    gender: "Female",
    group_id: youngAdults.id,
    cell_group_id: cg11.id,
    barcode: "DEMO-PORTAL-001",
  }, transaction);
  members.yaAssignedOne = await createMember({
    first_name: `${DEMO_PREFIX} YA Assigned`,
    last_name: "One",
    email: demoEmail("ya.assigned.one"),
    birthdate: "2003-02-14",
    spiritual_birthday: "2021-04-01",
    gender: "Female",
    group_id: youngAdults.id,
    cell_group_id: cg11.id,
    barcode: "DEMO-YA-001",
  }, transaction);
  members.yaAssignedTwo = await createMember({
    first_name: `${DEMO_PREFIX} YA Assigned`,
    last_name: "Two",
    email: demoEmail("ya.assigned.two"),
    birthdate: "1999-07-30",
    spiritual_birthday: "2019-09-10",
    gender: "Male",
    group_id: youngAdults.id,
    cell_group_id: cg11.id,
    barcode: "DEMO-YA-002",
  }, transaction);
  members.yaUnassigned = await createMember({
    first_name: `${DEMO_PREFIX} YA Candidate`,
    last_name: "Unassigned",
    email: demoEmail("ya.unassigned"),
    birthdate: "2005-03-08",
    spiritual_birthday: "2023-11-05",
    gender: "Female",
  }, transaction);
  members.yaTooOld = await createMember({
    first_name: `${DEMO_PREFIX} Non YA`,
    last_name: "Age Test",
    email: demoEmail("nonya.age.test"),
    birthdate: "1990-05-06",
    spiritual_birthday: "2018-01-02",
    gender: "Male",
    group_id: mensGroup.id,
  }, transaction);
  members.womenAssigned = await createMember({
    first_name: `${DEMO_PREFIX} Women`,
    last_name: "Member",
    email: demoEmail("women.member"),
    birthdate: "1988-06-18",
    spiritual_birthday: "2011-12-12",
    gender: "Female",
    group_id: womensGroup.id,
    cell_group_id: cg12.id,
  }, transaction);
  members.cgUnassigned = await createMember({
    first_name: `${DEMO_PREFIX} CG Candidate`,
    last_name: "Unassigned",
    email: demoEmail("cg.unassigned"),
    birthdate: "2002-12-11",
    spiritual_birthday: "2022-02-22",
    gender: "Male",
    group_id: youngAdults.id,
  }, transaction);
  members.ministryOne = await createMember({
    first_name: `${DEMO_PREFIX} Ministry`,
    last_name: "One",
    email: demoEmail("ministry.one"),
    birthdate: "2000-01-19",
    spiritual_birthday: "2017-05-17",
    gender: "Female",
    group_id: youngAdults.id,
    cell_group_id: cg11.id,
  }, transaction);
  members.ministryTwo = await createMember({
    first_name: `${DEMO_PREFIX} Ministry`,
    last_name: "Two",
    email: demoEmail("ministry.two"),
    birthdate: "1997-03-27",
    spiritual_birthday: "2016-06-25",
    gender: "Male",
    group_id: youngAdults.id,
    cell_group_id: cg12.id,
  }, transaction);
  members.ministryCandidate = await createMember({
    first_name: `${DEMO_PREFIX} Ministry Candidate`,
    last_name: "Unassigned",
    email: demoEmail("ministry.candidate"),
    birthdate: "2004-09-04",
    spiritual_birthday: "2022-08-14",
    gender: "Female",
    group_id: youngAdults.id,
  }, transaction);

  const tempPassword = `Demo!${crypto.randomBytes(9).toString("base64url")}`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const users = {};
  users.admin = await createUser({ role: adminRole, member: members.admin, email: demoEmail("admin"), passwordHash }, transaction);
  users.pastor = await createUser({ role: pastorRole, member: members.pastor, email: demoEmail("pastor"), passwordHash }, transaction);
  users.registration = await createUser({ role: registrationRole, member: members.registration, email: demoEmail("registration"), passwordHash }, transaction);
  users.finance = await createUser({ role: financeRole, member: members.finance, email: demoEmail("finance"), passwordHash }, transaction);
  users.ministryLeader = await createUser({
    role: ministryLeaderRole,
    member: members.ministryLeader,
    email: demoEmail("ministry.leader"),
    passwordHash,
    scope: { leads_ministry_id: ministryRole.id },
  }, transaction);
  users.cellLeader = await createUser({
    role: cellGroupLeaderRole,
    member: members.cellLeader,
    email: demoEmail("cell.leader"),
    passwordHash,
    scope: { leads_cell_group_id: cg11.id },
  }, transaction);
  users.groupLeader = await createUser({
    role: groupLeaderRole,
    member: members.groupLeader,
    email: demoEmail("group.leader"),
    passwordHash,
    scope: { leads_group_id: youngAdults.id },
  }, transaction);
  users.member = await createUser({ role: memberRole, member: members.portal, email: demoEmail("member"), passwordHash }, transaction);

  await InvitedMember.create({
    email: demoEmail("pending.invite"),
    first_name: `${DEMO_PREFIX} Pending`,
    last_name: "Invite",
    invite_token: `demo-${process.env.DEMO_DATA_MARKER.toLowerCase()}-${crypto.randomUUID()}`,
    invited_by: users.registration.id,
    expires_at: addDays(14),
    status: "pending",
  }, { transaction });

  const allMembers = Object.values(members);
  await Promise.all(allMembers.map((member, index) => EmergencyContact.create({
    member_id: member.id,
    name: `${DEMO_PREFIX} Emergency Contact ${index + 1}`,
    relationship: "Family",
    phone: `+63917000${String(index + 1).padStart(4, "0")}`,
  }, { transaction })));

  await Promise.all([
    MemberNote.create({
      member_id: members.portal.id,
      note: demoNote("Public demo note for member profile testing."),
      is_confidential: 0,
      created_by: users.registration.id,
    }, { transaction }),
    MemberNote.create({
      member_id: members.portal.id,
      note: demoNote("Confidential demo note visible only to allowed roles."),
      is_confidential: 1,
      created_by: users.pastor.id,
    }, { transaction }),
    CellGroupHistory.create({
      member_id: members.portal.id,
      old_cell_group_id: null,
      new_cell_group_id: cg11.id,
      changed_by: users.registration.id,
      reason: demoNote("Initial demo CG assignment."),
    }, { transaction }),
    MemberStatusHistory.create({
      member_id: members.portal.id,
      old_status: "Visitor",
      new_status: "Active",
      changed_by: users.registration.id,
      reason: demoNote("Demo status activation."),
    }, { transaction }),
  ]);

  await Promise.all([
    MinistryMembership.create({ ministry_role_id: ministryRole.id, member_id: members.ministryLeader.id, added_by: users.admin.id }, { transaction }),
    MinistryMembership.create({ ministry_role_id: ministryRole.id, member_id: members.ministryOne.id, added_by: users.ministryLeader.id }, { transaction }),
    MinistryMembership.create({ ministry_role_id: ministryRole.id, member_id: members.ministryTwo.id, added_by: users.ministryLeader.id }, { transaction }),
  ]);

  const serviceUpcoming = await Service.create({
    title: `${DEMO_PREFIX} Upcoming Sunday Service`,
    service_date: dateOnly(addDays(7)),
    service_time: "09:00:00",
    capacity: 180,
    total_parking_slots: 35,
    response_deadline: addDays(5),
    status: "published",
  }, { transaction });
  const serviceCompleted = await Service.create({
    title: `${DEMO_PREFIX} Completed Worship Service`,
    service_date: dateOnly(addDays(-7)),
    service_time: "09:00:00",
    capacity: 160,
    total_parking_slots: 30,
    response_deadline: addDays(-9),
    status: "completed",
  }, { transaction });

  await Promise.all([
    ServiceAttendanceSummary.create({ service_id: serviceUpcoming.id, total_expected: 6, total_attended: 0, total_absent: 0 }, { transaction }),
    ServiceAttendanceSummary.create({ service_id: serviceCompleted.id, total_expected: 7, total_attended: 5, total_absent: 2 }, { transaction }),
  ]);

  await Promise.all([
    ServiceResponse.create({ service_id: serviceUpcoming.id, member_id: members.portal.id, attendance_status: "ATTENDING", seat_number: "A1", parking_slot: "P1" }, { transaction }),
    ServiceResponse.create({ service_id: serviceUpcoming.id, member_id: members.yaAssignedOne.id, attendance_status: "UNDECIDED" }, { transaction }),
    ServiceResponse.create({ service_id: serviceUpcoming.id, member_id: members.yaAssignedTwo.id, attendance_status: "NOT_ATTENDING", override_by: users.registration.id, override_reason: demoNote("Demo override test.") }, { transaction }),
  ]);

  const attendedMembers = [
    members.portal,
    members.yaAssignedOne,
    members.yaAssignedTwo,
    members.cgUnassigned,
    members.ministryOne,
  ];
  await Promise.all(attendedMembers.map((member) => Attendance.create({
    service_id: serviceCompleted.id,
    member_id: member.id,
    check_in_method: "manual",
    checked_in_at: addDays(-7),
    recorded_by: users.registration.id,
  }, { transaction })));

  const assignmentOne = await MinistryAssignment.create({
    service_id: serviceUpcoming.id,
    member_id: members.ministryOne.id,
    ministry_role_id: ministryRole.id,
    confirmed: 1,
    substitute_requested: 0,
  }, { transaction });
  const assignmentTwo = await MinistryAssignment.create({
    service_id: serviceUpcoming.id,
    member_id: members.ministryTwo.id,
    ministry_role_id: ministryRole.id,
    confirmed: 0,
    substitute_requested: 1,
  }, { transaction });
  await SubstituteRequest.create({
    assignment_id: assignmentTwo.id,
    requested_by: users.ministryLeader.id,
    proposed_substitute: users.member.id,
    reason: demoNote("Demo substitute request for ministry testing."),
    status: "pending",
  }, { transaction });

  const eventPublished = await Event.create({
    category_id: eventCategory.id,
    title: `${DEMO_PREFIX} Youth Fellowship Night`,
    description: demoNote("Published demo event with registrations and ministry invites."),
    start_date: dateOnly(addDays(14)),
    end_date: dateOnly(addDays(14)),
    location: "PLWM-MCC Main Hall",
    capacity: 120,
    registration_deadline: addDays(10),
    status: "published",
    created_by: users.registration.id,
  }, { transaction });
  const eventCompleted = await Event.create({
    category_id: eventCategory.id,
    title: `${DEMO_PREFIX} Completed Leadership Huddle`,
    description: demoNote("Completed demo event for history checks."),
    start_date: dateOnly(addDays(-14)),
    end_date: dateOnly(addDays(-14)),
    location: "PLWM-MCC Training Room",
    capacity: 40,
    registration_deadline: addDays(-16),
    status: "completed",
    created_by: users.admin.id,
  }, { transaction });

  await Promise.all([
    EventRegistration.create({ event_id: eventPublished.id, member_id: members.portal.id, registered_at: addDays(-1), registered_by: users.member.id }, { transaction }),
    EventRegistration.create({ event_id: eventPublished.id, member_id: members.yaAssignedOne.id, registered_at: addDays(-1), registered_by: users.registration.id }, { transaction }),
    EventRegistration.create({ event_id: eventPublished.id, member_id: members.womenAssigned.id, registered_at: addDays(-1), registered_by: users.registration.id }, { transaction }),
    EventRegistration.create({ event_id: eventCompleted.id, member_id: members.ministryOne.id, registered_at: addDays(-20), registered_by: users.registration.id }, { transaction }),
    MinistryEventInvite.create({ event_id: eventPublished.id, ministry_role_id: ministryRole.id, member_id: members.ministryOne.id, invited_by: users.ministryLeader.id, response_status: "pending", response_deadline: addDays(7) }, { transaction }),
    MinistryEventInvite.create({ event_id: eventPublished.id, ministry_role_id: ministryRole.id, member_id: members.ministryTwo.id, invited_by: users.ministryLeader.id, response_status: "attending", response_deadline: addDays(7), responded_at: addDays(-1) }, { transaction }),
  ]);

  const itemMic = await InventoryItem.create({
    name: `${DEMO_PREFIX} Wireless Microphone Set`,
    category_id: inventoryCategory.id,
    quantity: 6,
    unit: "set",
    condition: "Good",
    low_stock_threshold: 2,
    notes: demoNote("Demo inventory item for request testing."),
  }, { transaction });
  const itemChairs = await InventoryItem.create({
    name: `${DEMO_PREFIX} Folding Chairs`,
    category_id: inventoryCategory.id,
    quantity: 40,
    unit: "pcs",
    condition: "Fair",
    low_stock_threshold: 10,
    notes: demoNote("Demo inventory item for availability checks."),
  }, { transaction });
  const itemLowStock = await InventoryItem.create({
    name: `${DEMO_PREFIX} Printer Paper Low Stock`,
    category_id: lowStockCategory.id,
    quantity: 1,
    unit: "ream",
    condition: "Good",
    low_stock_threshold: 5,
    notes: demoNote("Demo low-stock inventory item."),
  }, { transaction });

  await Promise.all([
    InventoryRequest.create({ item_id: itemMic.id, requested_by: users.ministryLeader.id, quantity: 1, purpose: demoNote("Ministry rehearsal request."), status: "pending" }, { transaction }),
    InventoryRequest.create({ item_id: itemChairs.id, requested_by: users.cellLeader.id, quantity: 10, purpose: demoNote("Cell group fellowship request."), status: "approved", reviewed_by: users.admin.id }, { transaction }),
    InventoryRequest.create({ item_id: itemLowStock.id, requested_by: users.groupLeader.id, quantity: 2, purpose: demoNote("YA meeting supplies request."), status: "rejected", reviewed_by: users.admin.id }, { transaction }),
    InventoryUsage.create({ item_id: itemChairs.id, quantity_used: 8, used_by: users.registration.id, used_for: demoNote("Completed event seating."), used_at: addDays(-14) }, { transaction }),
  ]);

  const archivePublic = await ArchiveRecord.create({
    category_id: archiveCategory.id,
    title: `${DEMO_PREFIX} Public Ministry Schedule`,
    description: demoNote("Public demo archive visible to broad roles."),
    file_url: "https://example.com/plwm-mcc-demo-public.pdf",
    file_type: "pdf",
    file_size: 128000,
    document_date: dateOnly(addDays(-3)),
    visibility: "public",
    status: "approved",
    uploaded_by: users.registration.id,
    approved_by: users.pastor.id,
  }, { transaction });
  const archiveRestricted = await ArchiveRecord.create({
    category_id: archiveCategory.id,
    title: `${DEMO_PREFIX} Restricted Leader Notes`,
    description: demoNote("Restricted demo archive for leader visibility checks."),
    file_url: "https://example.com/plwm-mcc-demo-restricted.pdf",
    file_type: "pdf",
    file_size: 142000,
    document_date: dateOnly(addDays(-2)),
    visibility: "restricted",
    status: "approved",
    uploaded_by: users.registration.id,
    approved_by: users.pastor.id,
  }, { transaction });
  const archiveConfidential = await ArchiveRecord.create({
    category_id: archiveCategory.id,
    title: `${DEMO_PREFIX} Confidential Pastor File`,
    description: demoNote("Confidential demo archive for pastor/admin checks."),
    file_url: "https://example.com/plwm-mcc-demo-confidential.pdf",
    file_type: "pdf",
    file_size: 156000,
    document_date: dateOnly(addDays(-1)),
    visibility: "confidential",
    status: "approved",
    uploaded_by: users.registration.id,
    approved_by: users.pastor.id,
  }, { transaction });
  const archivePending = await ArchiveRecord.create({
    category_id: archiveCategory.id,
    title: `${DEMO_PREFIX} Pending Archive Approval`,
    description: demoNote("Pending demo archive for approval testing."),
    file_url: "https://example.com/plwm-mcc-demo-pending.pdf",
    file_type: "pdf",
    file_size: 99000,
    document_date: dateOnly(new Date()),
    visibility: "restricted",
    status: "pending",
    uploaded_by: users.registration.id,
  }, { transaction });

  await Promise.all([archivePublic, archiveRestricted, archiveConfidential, archivePending].map((record) => ArchiveVersion.create({
    record_id: record.id,
    file_url: record.file_url,
    file_type: record.file_type,
    version_number: 1,
    uploaded_by: users.registration.id,
  }, { transaction })));

  await Promise.all([
    FinancialRecord.create({ member_id: members.portal.id, category_id: financeTithe.id, receipt_number: "DEMO-TITHE-001", amount: 1500.00, payment_method: "gcash", transaction_date: dateOnly(addDays(-21)), recorded_by: users.finance.id, notes: demoNote("Demo tithe record for member portal giving.") }, { transaction }),
    FinancialRecord.create({ member_id: members.portal.id, category_id: financeOffering.id, receipt_number: "DEMO-OFFERING-001", amount: 500.00, payment_method: "cash", transaction_date: dateOnly(addDays(-7)), recorded_by: users.finance.id, notes: demoNote("Demo offering record for finance list.") }, { transaction }),
    FinancialRecord.create({ member_id: members.yaAssignedOne.id, category_id: financeOffering.id, receipt_number: "DEMO-DELETED-001", amount: 250.00, payment_method: "bank_transfer", transaction_date: dateOnly(addDays(-30)), recorded_by: users.finance.id, notes: demoNote("Deleted demo finance record."), is_deleted: 1, deleted_at: addDays(-20), deleted_by: users.finance.id }, { transaction }),
  ]);

  await Promise.all([
    Notification.create({ user_id: users.admin.id, type: "demo", message: demoNote("Admin demo notification."), reference_id: eventPublished.id, reference_type: "event", is_read: 0 }, { transaction }),
    Notification.create({ user_id: users.ministryLeader.id, type: "demo", message: demoNote("Ministry leader demo invite notification."), reference_id: eventPublished.id, reference_type: "event", is_read: 0 }, { transaction }),
    Notification.create({ user_id: users.member.id, type: "demo", message: demoNote("Member portal demo notification."), reference_id: serviceUpcoming.id, reference_type: "service", is_read: 1, read_at: addDays(-1) }, { transaction }),
    AuditLog.create({ user_id: users.admin.id, action: "DEMO_DATA_SEEDED", target_table: "demo_data", new_values: { marker: token }, ip_address: "127.0.0.1" }, { transaction }),
  ]);

  return {
    tempPassword,
    users: [
      ["System Admin", users.admin.email],
      ["Pastor", users.pastor.email],
      ["Registration Team", users.registration.email],
      ["Finance Team", users.finance.email],
      ["Ministry Leader", users.ministryLeader.email],
      ["Cell Group Leader", users.cellLeader.email],
      ["Group Leader", users.groupLeader.email],
      ["Member", users.member.email],
    ],
    counts: {
      members: allMembers.length,
      services: 2,
      events: 2,
      inventoryItems: 3,
      archives: 4,
    },
  };
};

const main = async () => {
  assertDemoRunAllowed();

  const mode = process.argv[2];
  if (!["seed", "cleanup"].includes(mode)) {
    throw new Error("Usage: node scripts/demo-data.js <seed|cleanup>");
  }

  await sequelize.authenticate();

  if (mode === "cleanup") {
    await sequelize.transaction(async (transaction) => cleanupDemoData(transaction));
    console.log("Demo data cleanup complete.");
    return;
  }

  const result = await sequelize.transaction(async (transaction) => seedDemoData(transaction));
  console.log("Demo data seed complete.");
  console.log(`Temporary password for all demo accounts: ${result.tempPassword}`);
  console.table(result.users.map(([role, email]) => ({ role, email })));
  console.table(result.counts);
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
