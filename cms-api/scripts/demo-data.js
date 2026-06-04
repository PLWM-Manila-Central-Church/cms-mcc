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
  Ministry,
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
  UserLeaderAssignment,
  UserSession,
} = require("../src/models");

const EXPECTED_MARKER = "PLWM_MCC_QA";
const DEMO_PREFIX = "[DEMO]";
const DEMO_EMAIL_DOMAINS = ["gmails.com", "plwm-mcc.example.com", "plwm-mcc.test"];

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

  // Note: user_leader_assignments CASCADE on user_id, so deleting the user deletes their assignment
  await destroyWhere(User, inWhere("id", ids.userIds), transaction);
  await destroyWhere(Member, inWhere("id", ids.memberIds), transaction);
};

const seedDemoData = async (transaction) => {
  await cleanupDemoData(transaction);

  const token = demoToken();

  // Load all standard roles
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

  // Load reference tables
  const allCellGroups = await CellGroup.findAll({ transaction });
  const allGroups = await Group.findAll({ transaction });
  const allMinistryRoles = await MinistryRole.findAll({ transaction });
  const allMinistries = await Ministry.findAll({ transaction });

  const eventCategory = await findRequired(EventCategory, {}, "Event category", transaction);
  const inventoryCategory = await findRequired(InventoryCategory, {}, "Inventory category", transaction);
  const archiveCategory = await findRequired(ArchiveCategory, {}, "Archive category", transaction);
  const financeTithe = await findRequired(FinancialCategory, { name: { [Op.like]: "%Tithe%" } }, "Tithe category", transaction).catch(() => findRequired(FinancialCategory, {}, "Financial Category", transaction));
  const financeOffering = await findRequired(FinancialCategory, { name: { [Op.like]: "%Offering%" } }, "Offering category", transaction).catch(() => findRequired(FinancialCategory, {}, "Financial Category", transaction));

  // Name Pools
  const maleFirstNames = [
    "Juan", "Jose", "Manuel", "Antonio", "Pedro", "Francisco", "Angelo", "Christian", "Mark", "John",
    "Robert", "Michael", "David", "James", "Joseph", "Richard", "Daniel", "Paul", "Kenneth", "Kevin",
    "Ronald", "Luis", "Gabriel", "Raymond", "Joshua", "Jonathan", "Ryan", "Vincent", "Edgar", "Jeffrey"
  ];
  const femaleFirstNames = [
    "Maria", "Ana", "Teresa", "Elena", "Angela", "Christina", "Mary", "Patricia", "Elizabeth", "Jennifer",
    "Linda", "Barbara", "Susan", "Margaret", "Dorothy", "Lisa", "Nancy", "Karen", "Betty", "Helen",
    "Sandra", "Donna", "Carol", "Ruth", "Sharon", "Michelle", "Laura", "Sarah", "Kimberly", "Deborah"
  ];
  const lastNames = [
    "Cruz", "Santos", "Reyes", "Dela Cruz", "Diaz", "Gonzales", "Ramos", "Aquino", "Bautista", "Garcia",
    "Lopez", "Castro", "Flores", "Sarmiento", "Villanueva", "Santiago", "Mendoza", "Perez", "Marquez", "Rivera",
    "Torres", "Mercado", "De Leon", "Gomez", "Del Rosario", "Alvarez", "Castillo", "Tolentino", "Pascual", "Valenzuela"
  ];

  // Hash the testing password once for extreme speed optimization (approx 10s -> 0.1s!)
  const tempPassword = "PLWM_mcc2026!";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const createdMembers = [];
  const createdUsers = [];

  console.log("Generating exactly 200 members distributed evenly...");

  // Generate 200 Members
  for (let i = 1; i <= 200; i++) {
    // 1. Determine Gender & Name
    const gender = (i % 2 === 1) ? "Male" : "Female";
    const firstName = (gender === "Male")
      ? maleFirstNames[(i * 7) % maleFirstNames.length]
      : femaleFirstNames[(i * 11) % femaleFirstNames.length];
    const lastName = lastNames[(i * 13) % lastNames.length];

    // 2. Determine Age Demographics & Fellowship Group
    let age;
    let fellowshipGroup;

    if (i <= 15) {
      age = 4; // Preschool
      fellowshipGroup = allGroups.find(g => g.name.includes("Preschool") || g.name.includes("Pre")) || allGroups[0];
    } else if (i <= 35) {
      age = 9; // Elementary
      fellowshipGroup = allGroups.find(g => g.name.includes("Elementary") || g.name.includes("Elem")) || allGroups[0];
    } else if (i <= 60) {
      age = 15; // High School
      fellowshipGroup = allGroups.find(g => g.name.includes("High School") || g.name.includes("High")) || allGroups[0];
    } else if (i <= 105) {
      age = 24; // Young Adults
      fellowshipGroup = allGroups.find(g => g.name.includes("Young Adults") || g.name.includes("YA")) || allGroups[0];
    } else {
      age = 40; // Adult Men/Women
      if (gender === "Male") {
        fellowshipGroup = allGroups.find(g => g.name.includes("Men")) || allGroups[0];
      } else {
        fellowshipGroup = allGroups.find(g => g.name.includes("Women")) || allGroups[0];
      }
    }

    // 3. Determine Cell Group Assignment (Teens & Adults only, i > 35)
    let cellGroup = null;
    if (i > 35 && allCellGroups.length > 0) {
      cellGroup = allCellGroups[(i - 36) % allCellGroups.length];
    }

    // 4. Calculate Birthdates
    const birthYear = 2026 - age;
    const birthdate = `${birthYear}-05-19`;
    const spiritualBirthday = (age >= 15) ? `${birthYear + 15}-05-19` : null;

    // 5. Generate unique barcode and email
    const emailName = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, "")}${i}`;
    const email = `demo.${emailName}@gmails.com`;
    const barcode = `DEMO-BARCODE-${i.toString().padStart(3, "0")}`;

    // 6. Create the Member record
    const member = await Member.create({
      first_name: firstName,
      last_name: lastName,
      email,
      phone: `+63917000${i.toString().padStart(4, "0")}`,
      birthdate,
      spiritual_birthday: spiritualBirthday,
      gender,
      status: (i % 8 === 0) ? "Semi-Active" : (i % 12 === 0) ? "New" : "Active",
      address: demoNote("Simulated address for local community QA testing."),
      cell_group_id: cellGroup ? cellGroup.id : null,
      group_id: fellowshipGroup ? fellowshipGroup.id : null,
      barcode,
    }, { transaction });

    createdMembers.push(member);

    // 7. Seed associated Emergency Contact
    await EmergencyContact.create({
      member_id: member.id,
      name: `${lastName} Emergency Contact`,
      relationship: "Family",
      phone: `+63918000${i.toString().padStart(4, "0")}`,
    }, { transaction });

    // 8. Seed status and cell histories
    await MemberStatusHistory.create({
      member_id: member.id,
      old_status: "New",
      new_status: member.status,
      changed_by: 1, // System admin
      reason: demoNote("Initial member seeding."),
    }, { transaction });

    if (cellGroup) {
      await CellGroupHistory.create({
        member_id: member.id,
        old_cell_group_id: null,
        new_cell_group_id: cellGroup.id,
        changed_by: 1,
        reason: demoNote("Initial cell group assignment."),
      }, { transaction });
    }
  }

  console.log("Successfully seeded 200 Member profiles.");

  // Map out exact System Roles for the first 50 adult members (member index 61 to 110)
  // i index in array is index - 1 (60 to 109)
  const systemUsersToCreate = [];

  for (let idx = 60; idx < 110; idx++) {
    const member = createdMembers[idx];
    const sequenceNum = idx + 1;

    let role = memberRole;
    let leadsCell = null;
    let leadsGroup = null;
    let leadsMinistryRole = null;

    if (sequenceNum === 61) {
      role = adminRole;
    } else if (sequenceNum <= 63) {
      role = pastorRole;
    } else if (sequenceNum <= 66) {
      role = registrationRole;
    } else if (sequenceNum <= 69) {
      role = financeRole;
    } else if (sequenceNum <= 86) {
      role = cellGroupLeaderRole;
      leadsCell = allCellGroups[(sequenceNum - 70) % allCellGroups.length];
    } else if (sequenceNum <= 92) {
      role = groupLeaderRole;
      leadsGroup = allGroups[(sequenceNum - 87) % allGroups.length];
    } else if (sequenceNum <= 110) {
      role = ministryLeaderRole;
      leadsMinistryRole = allMinistryRoles[(sequenceNum - 93) % allMinistryRoles.length];
    }

    systemUsersToCreate.push({
      member,
      role,
      leadsCell,
      leadsGroup,
      leadsMinistryRole,
    });
  }

  // Create standard user account logins for those 50 leaders/admins
  for (const item of systemUsersToCreate) {
    const user = await User.create({
      role_id: item.role.id,
      member_id: item.member.id,
      email: item.member.email,
      password_hash: passwordHash,
      is_active: 1,
      force_password_change: 0,
      leads_cell_group_id: item.leadsCell ? item.leadsCell.id : null,
      leads_group_id: item.leadsGroup ? item.leadsGroup.id : null,
      leads_ministry_id: item.leadsMinistryRole ? item.leadsMinistryRole.id : null,
    }, { transaction });

    createdUsers.push(user);

    // Seed 3NF UserLeaderAssignment table to satisfy database integrity constraints
    if (item.leadsCell) {
      await UserLeaderAssignment.create({
        user_id: user.id,
        scope_type: "cell_group",
        scope_id: item.leadsCell.id,
        legacy_column: "leads_cell_group_id",
        assigned_by: 1,
      }, { transaction });
    } else if (item.leadsGroup) {
      await UserLeaderAssignment.create({
        user_id: user.id,
        scope_type: "member_group",
        scope_id: item.leadsGroup.id,
        legacy_column: "leads_group_id",
        assigned_by: 1,
      }, { transaction });
    } else if (item.leadsMinistryRole) {
      // Find matching normalized ministry record
      const matchingMinistry = allMinistries.find(m => m.legacy_ministry_role_id === item.leadsMinistryRole.id);
      if (matchingMinistry) {
        await UserLeaderAssignment.create({
          user_id: user.id,
          scope_type: "ministry",
          scope_id: matchingMinistry.id,
          legacy_column: "leads_ministry_id",
          assigned_by: 1,
        }, { transaction });
      }
    }
  }

  // Helper Admin user ID for references (fallback to the newly seeded Admin)
  const refAdminUser = createdUsers[0];

  // Distribute all teens/adults (index 36 to 200) into MinistryMemberships evenly
  console.log("Distributing members into ministry memberships...");
  for (let idx = 35; idx < 200; idx++) {
    const member = createdMembers[idx];
    const minIndex = (idx - 35) % allMinistryRoles.length;
    const minRole = allMinistryRoles[minIndex];

    await MinistryMembership.create({
      ministry_role_id: minRole.id,
      member_id: member.id,
      added_by: refAdminUser.id,
    }, { transaction });
  }

  // Seed Event and Service items
  console.log("Setting up church events and Sunday services...");
  const serviceUpcoming = await Service.create({
    title: `${DEMO_PREFIX} Main Sunday Service`,
    service_date: dateOnly(addDays(7)),
    service_time: "09:00:00",
    capacity: 250,
    total_parking_slots: 50,
    response_deadline: addDays(5),
    status: "published",
  }, { transaction });

  const serviceCompleted = await Service.create({
    title: `${DEMO_PREFIX} Previous Sunday Service`,
    service_date: dateOnly(addDays(-7)),
    service_time: "09:00:00",
    capacity: 200,
    total_parking_slots: 40,
    response_deadline: addDays(-9),
    status: "completed",
  }, { transaction });

  await ServiceAttendanceSummary.create({ service_id: serviceUpcoming.id, total_expected: 60, total_attended: 0, total_absent: 0 }, { transaction });
  await ServiceAttendanceSummary.create({ service_id: serviceCompleted.id, total_expected: 120, total_attended: 105, total_absent: 15 }, { transaction });

  // 60 Service Responses (seat reservations) for the upcoming service
  for (let idx = 60; idx < 120; idx++) {
    const member = createdMembers[idx];
    await ServiceResponse.create({
      service_id: serviceUpcoming.id,
      member_id: member.id,
      attendance_status: (idx % 10 === 0) ? "NOT_ATTENDING" : (idx % 15 === 0) ? "UNDECIDED" : "ATTENDING",
      seat_number: `Seat-${idx}`,
      parking_slot: (idx % 4 === 0) ? `P-${idx}` : null,
    }, { transaction });
  }

  // 120 attendance entries for the completed service
  for (let idx = 60; idx < 180; idx++) {
    const member = createdMembers[idx];
    await Attendance.create({
      service_id: serviceCompleted.id,
      member_id: member.id,
      check_in_method: "manual",
      checked_in_at: addDays(-7),
      recorded_by: refAdminUser.id,
    }, { transaction });
  }

  // Create Events
  const eventUpcoming = await Event.create({
    category_id: eventCategory.id,
    title: `${DEMO_PREFIX} General Youth Summit`,
    description: demoNote("Interactive seminar event for active church members."),
    start_date: dateOnly(addDays(14)),
    end_date: dateOnly(addDays(14)),
    location: "Main Sanctuary Hall",
    capacity: 150,
    registration_deadline: addDays(10),
    status: "published",
    created_by: refAdminUser.id,
  }, { transaction });

  const eventCompleted = await Event.create({
    category_id: eventCategory.id,
    title: `${DEMO_PREFIX} Spiritual Leadership seminar`,
    description: demoNote("Leadership workshop for ministry and cell leaders."),
    start_date: dateOnly(addDays(-14)),
    end_date: dateOnly(addDays(-14)),
    location: "Training Room B",
    capacity: 50,
    registration_deadline: addDays(-16),
    status: "completed",
    created_by: refAdminUser.id,
  }, { transaction });

  // Seed registrations for upcoming and completed events (80 and 100 members respectively)
  for (let idx = 40; idx < 120; idx++) {
    const member = createdMembers[idx];
    await EventRegistration.create({
      event_id: eventUpcoming.id,
      member_id: member.id,
      registered_at: addDays(-2),
      registered_by: refAdminUser.id,
    }, { transaction });
  }

  for (let idx = 50; idx < 150; idx++) {
    const member = createdMembers[idx];
    await EventRegistration.create({
      event_id: eventCompleted.id,
      member_id: member.id,
      registered_at: addDays(-20),
      registered_by: refAdminUser.id,
    }, { transaction });
  }

  // Ministry assignments & Invites
  const mainMinistryRole = allMinistryRoles[0];
  const assignmentUpcoming = await MinistryAssignment.create({
    service_id: serviceUpcoming.id,
    member_id: createdMembers[115].id,
    ministry_role_id: mainMinistryRole.id,
    confirmed: 1,
    substitute_requested: 0,
  }, { transaction });

  await SubstituteRequest.create({
    assignment_id: assignmentUpcoming.id,
    requested_by: createdUsers[20].id, // a ministry leader user
    proposed_substitute: createdUsers[0].id,
    reason: demoNote("Duty replacement for scheduling clash."),
    status: "pending",
  }, { transaction });

  // Ministry Event Invite
  await MinistryEventInvite.create({
    event_id: eventUpcoming.id,
    ministry_role_id: mainMinistryRole.id,
    member_id: createdMembers[120].id,
    invited_by: refAdminUser.id,
    response_status: "pending",
    response_deadline: addDays(5),
  }, { transaction });

  // Seed inventory items and usage requests
  console.log("Setting up inventory items and categories...");
  const inventorySound = await InventoryItem.create({
    name: `${DEMO_PREFIX} Wireless UHF Microphone`,
    category_id: inventoryCategory.id,
    quantity: 10,
    unit: "pcs",
    condition: "Good",
    low_stock_threshold: 3,
    notes: demoNote("Sound equipment for praise and worship team."),
  }, { transaction });

  await InventoryRequest.create({
    item_id: inventorySound.id,
    requested_by: createdUsers[20].id,
    quantity: 2,
    purpose: demoNote("Youth fellowship band practice sound check."),
    status: "pending",
  }, { transaction });

  await InventoryUsage.create({
    item_id: inventorySound.id,
    quantity_used: 1,
    used_by: refAdminUser.id,
    used_for: demoNote("Sunday morning youth sermon audio presentation."),
    used_at: addDays(-7),
  }, { transaction });

  // Seed archive records
  console.log("Setting up digital archives...");
  const docArchive = await ArchiveRecord.create({
    category_id: archiveCategory.id,
    title: `${DEMO_PREFIX} General Church Council Minutes`,
    description: demoNote("Standard documentation archive folder."),
    file_url: "https://example.com/demo-church-document.pdf",
    file_type: "pdf",
    file_size: 256000,
    document_date: dateOnly(addDays(-10)),
    visibility: "restricted",
    status: "approved",
    uploaded_by: refAdminUser.id,
    approved_by: createdUsers[1].id, // Pastor user
  }, { transaction });

  await ArchiveVersion.create({
    record_id: docArchive.id,
    file_url: docArchive.file_url,
    file_type: docArchive.file_type,
    version_number: 1,
    uploaded_by: refAdminUser.id,
  }, { transaction });

  // Seed robust financial records (Tithes and Offerings)
  // Generates 1 to 2 entries for each adult member (idx 60 to 199) to build a realistic dashboard
  console.log("Seeding financial transaction records (tithes/offerings)...");
  let transactionCounter = 1;
  const financeUser = createdUsers[6]; // Finance Team user (member index 67)

  for (let idx = 60; idx < 200; idx++) {
    const member = createdMembers[idx];

    // Tithe
    await FinancialRecord.create({
      member_id: member.id,
      category_id: financeTithe.id,
      receipt_number: `DEMO-TITH-${transactionCounter.toString().padStart(4, "0")}`,
      amount: Math.floor(Math.random() * 5 + 1) * 1000.00, // 1000 to 5000 PHP
      payment_method: (idx % 2 === 0) ? "gcash" : "cash",
      transaction_date: dateOnly(addDays(-Math.floor(Math.random() * 20))),
      recorded_by: financeUser.id,
      notes: demoNote("Monthly tithe contribution."),
    }, { transaction });
    transactionCounter++;

    // Offering (random chance)
    if (idx % 3 === 0) {
      await FinancialRecord.create({
        member_id: member.id,
        category_id: financeOffering.id,
        receipt_number: `DEMO-OFFR-${transactionCounter.toString().padStart(4, "0")}`,
        amount: Math.floor(Math.random() * 4 + 1) * 200.00, // 200 to 800 PHP
        payment_method: "cash",
        transaction_date: dateOnly(addDays(-Math.floor(Math.random() * 20))),
        recorded_by: financeUser.id,
        notes: demoNote("Sunday service special offering contribution."),
      }, { transaction });
      transactionCounter++;
    }
  }

  // Seed Notifications and Audit logs
  console.log("Completing notification logs and system seed audit trails...");
  await Notification.create({
    user_id: createdUsers[0].id,
    type: "demo",
    message: demoNote("Admin notifications populated successfully."),
    reference_id: eventUpcoming.id,
    reference_type: "event",
    is_read: 0,
  }, { transaction });

  await AuditLog.create({
    user_id: refAdminUser.id,
    action: "DEMO_DATA_SEEDED",
    target_table: "demo_data",
    new_values: { marker: token, size: createdMembers.length },
    ip_address: "127.0.0.1",
  }, { transaction });

  // Map printable roles list
  const printableUsers = [
    ["System Admin (1 Account)", createdUsers[0].email],
    ["Pastors (2 Accounts)", `${createdUsers[1].email}, ${createdUsers[2].email}`],
    ["Registration Team (3 Accounts)", `${createdUsers[3].email}, ${createdUsers[4].email}, ${createdUsers[5].email}`],
    ["Finance Team (3 Accounts)", `${createdUsers[6].email}, ${createdUsers[7].email}, ${createdUsers[8].email}`],
    ["Cell Leaders (17 Accounts)", "Assigned to the first member in each of the 17 Cell Groups"],
    ["Fellowship Group Leaders (6 Accounts)", "Assigned to 1 leader per Fellowship Group"],
    ["Ministry Leaders (18 Accounts)", "Assigned to 1 leader per Ministry Role/Service"],
  ];

  return {
    tempPassword,
    users: printableUsers,
    counts: {
      "Members (Physical Records)": createdMembers.length,
      "Users (Account Logins)": createdUsers.length,
      "Services (Seeded)": 2,
      "Events (Seeded)": 2,
      "Inventory Items (Seeded)": 1,
      "Financial Records (Seeded)": transactionCounter - 1,
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
    console.log("Demo data cleanup complete. Cleaned up all @gmails.com and standard demo records.");
    return;
  }

  const result = await sequelize.transaction(async (transaction) => seedDemoData(transaction));
  console.log("\n=======================================================");
  console.log("🚀 DEMO SEED COMPLETELY SUCCESSFUL!");
  console.log("=======================================================\n");
  console.log(`Common Hashed Password for ALL user logins: ${result.tempPassword}`);
  console.log("\nSeeded User Accounts Overview:");
  console.table(result.users.map(([role_group, emails]) => ({ "Role/Group": role_group, "Accounts": emails })));
  console.log("\nGenerated Database Records Count Summary:");
  console.table(result.counts);
  console.log("\n💡 TIP: You can use any of the emails listed above with the common password to test system RBAC validation!");
  console.log("=======================================================\n");
};

main()
  .catch((error) => {
    console.error("❌ Seeding process error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
