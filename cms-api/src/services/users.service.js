"use strict";

const bcrypt = require("bcrypt");
const { User, Role, Member, MinistryRole, MinistryMembership, CellGroup, MinistryGroup, UserLeaderAssignment, AuditLog } = require("../models");
const sequelize = require("../config/db");
const auditLog = require("../helpers/auditLog.helper");
const permissionCache = require("../helpers/permissionCache.helper");
const AppError = require("../helpers/AppError");
const {
  LEADER_ROLE,
  assignmentProjections,
  persistAssignments,
  targetsForRole,
  validateAssignmentTargets,
} = require("./leaderAssignments.service");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const userIncludes = [
  { model: Role, as: "role", attributes: ["id", "role_name"] },
  {
    model: Member,
    as: "member",
    attributes: [
      "id", "first_name", "last_name", "email", "phone", "gender",
      "birthdate", "spiritual_birthday", "address", "cell_group_id", "group_id",
    ],
    required: false,
    include: [
      {
        model: MinistryMembership,
        as: "MinistryMemberships",
        attributes: ["id", "ministry_role_id"],
        required: false,
      },
    ],
  },
  {
    model: MinistryRole,
    as: "leadsMinistry",
    attributes: ["id", "name"],
    required: false,
  },
  {
    model: CellGroup,
    as: "leadsCellGroup",
    attributes: ["id", "name", "area"],
    required: false,
  },
  {
    model: MinistryGroup,
    as: "leadsGroup",
    attributes: ["id", "name"],
    required: false,
  },
  {
    model: UserLeaderAssignment,
    as: "leaderAssignments",
    attributes: ["id", "scope_type", "scope_id", "legacy_column", "assigned_by", "is_active", "version", "revoked_at"],
    required: false,
    separate: true,
    order: [["scope_type", "ASC"], ["scope_id", "ASC"], ["id", "ASC"]],
  },
];


const LEADERSHIP_PROFILE_ROLES = new Set([
  LEADER_ROLE, "Cell Group Leader", "Group Leader", "Ministry Leader",
]);

const isSystemAdministrator = (actor) =>
  actor && typeof actor === "object" && actor.roleName === "System Admin";

const hasAssignedLeadershipInput = (data = {}) => Boolean(
  data.leader_assignments
  || data.leads_cell_group_id
  || data.leads_group_id
  || data.leads_ministry_id,
);

const createUserWithLeadership = async (data, role, actor) => {
  if (!isSystemAdministrator(actor)) {
    throw AppError.forbidden("Only System Admin can create or assign a leadership account");
  }

  const desired = await targetsForRole(role.role_name, data, [], true);
  const reason = String(data.leadership_reason || "").trim();
  if (reason.length < 5) {
    throw AppError.badRequest("LEADERSHIP_REASON_REQUIRED", "Enter a reason of at least 5 characters for this leadership assignment");
  }
  const assignmentFields = assignmentProjections(role.role_name, desired);
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const createdId = await sequelize.transaction(async (transaction) => {
    const duplicate = await User.findOne({
      where: { email: data.email, is_deleted: 0 },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (duplicate) throw AppError.conflict("DUPLICATE", "Email already in use");

    let memberId = data.member_id || null;
    if (memberId) {
      const member = await Member.findOne({
        where: { id: memberId, is_deleted: 0 },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member is not available");
    } else if (data.first_name && data.last_name) {
      const member = await Member.create({
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        email: data.email || null,
        phone: data.phone || null,
        gender: data.gender || null,
        birthdate: data.birthdate || null,
        spiritual_birthday: data.spiritual_birthday || null,
        address: data.address || null,
        cell_group_id: data.cell_group_id ? Number(data.cell_group_id) : null,
        group_id: data.group_id ? Number(data.group_id) : null,
        status: "Active",
        is_deleted: 0,
      }, { transaction });
      memberId = member.id;
    }

    const user = await User.create({
      email: data.email,
      password_hash: passwordHash,
      role_id: role.id,
      member_id: memberId,
      invited_member_id: data.invited_member_id || null,
      ...assignmentFields,
      leadership_revision: 1,
      is_active: 1,
      force_password_change: 1,
    }, { transaction });

    const assignmentRows = await UserLeaderAssignment.findAll({
      where: { user_id: user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    await persistAssignments({
      userId: user.id,
      actorId: actor.userId,
      roleName: role.role_name,
      desired,
      reason,
      existingRows: assignmentRows,
      transaction,
    });

    if (data.member_ministry_role_id && memberId) {
      if (role.role_name === "Ministry Leader") {
        throw AppError.badRequest("VALIDATION", "Use the leader assignment controls to assign a Ministry Leader");
      }
      await MinistryMembership.findOrCreate({
        where: {
          ministry_role_id: Number(data.member_ministry_role_id),
          member_id: Number(memberId),
        },
        defaults: {
          ministry_role_id: Number(data.member_ministry_role_id),
          member_id: Number(memberId),
          added_by: actor.userId,
        },
        transaction,
      });
    }

    await AuditLog.create({
      user_id: actor.userId,
      action: "CREATE_LEADERSHIP_USER",
      target_table: "users",
      target_id: user.id,
      new_values: {
        user_id: user.id,
        role_name: role.role_name,
        assignment_types: [...desired.entries()].filter(([, id]) => id != null).map(([type]) => type),
        reason,
      },
    }, { transaction });

    return user.id;
  });

  const created = await exports.getUserById(createdId);
  auditLog.log({ userId: actor.userId, action: "CREATE_USER", targetTable: "users", targetId: created.id });
  return created;
};
const validateLeaderAssignment = async (role, data, existingUser = null) => {
  if (role.role_name === LEADER_ROLE) {
    const desired = await targetsForRole(role.role_name, data, existingUser?.leaderAssignments || [], !existingUser);
    await validateAssignmentTargets(desired);
    return assignmentProjections(role.role_name, desired);
  }
  const final = {
    leads_cell_group_id: data.leads_cell_group_id !== undefined ? data.leads_cell_group_id : existingUser?.leads_cell_group_id,
    leads_group_id:      data.leads_group_id      !== undefined ? data.leads_group_id      : existingUser?.leads_group_id,
    leads_ministry_id:   data.leads_ministry_id   !== undefined ? data.leads_ministry_id   : existingUser?.leads_ministry_id,
  };

  if (role.role_name === "Cell Group Leader" && !final.leads_cell_group_id) {
    throw AppError.badRequest("VALIDATION", "Cell Group Leader requires a leader cell group assignment");
  }
  if (role.role_name === "Group Leader" && !final.leads_group_id) {
    throw AppError.badRequest("VALIDATION", "Group Leader requires a leader group assignment");
  }
  if (role.role_name === "Ministry Leader" && !final.leads_ministry_id) {
    throw AppError.badRequest("VALIDATION", "Ministry Leader requires a leader ministry assignment");
  }

  if (role.role_name === "Cell Group Leader" && final.leads_cell_group_id) {
      const row = await CellGroup.findByPk(final.leads_cell_group_id);
      if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Leader cell group not found");
    }
    if (role.role_name === "Group Leader" && final.leads_group_id) {
      const row = await MinistryGroup.findByPk(final.leads_group_id);
      if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Leader group not found");
    }
    if (role.role_name === "Ministry Leader" && final.leads_ministry_id) {
      const row = await MinistryRole.findByPk(final.leads_ministry_id);
      if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Leader ministry not found");
    }

  return {
    leads_cell_group_id: role.role_name === "Cell Group Leader" ? parseInt(final.leads_cell_group_id) : null,
    leads_group_id:      role.role_name === "Group Leader"      ? parseInt(final.leads_group_id)      : null,
    leads_ministry_id:   role.role_name === "Ministry Leader"   ? parseInt(final.leads_ministry_id)   : null,
  };
};

// ── Get All Users ────────────────────────────────────────────
exports.getAllUsers = async () => {
  return await User.findAll({
    where: { is_deleted: 0 },
    attributes: { exclude: ["password_hash"] },
    include: userIncludes,
    order: [["created_at", "DESC"]],
  });
};

// ── Get User By ID ───────────────────────────────────────────
exports.getUserById = async (id) => {
  const user = await User.findOne({
    where: { id, is_deleted: 0 },
    attributes: { exclude: ["password_hash"] },
    include: userIncludes,
  });
  if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "Requested resource not available");
  return user;
};

// ── Create User ──────────────────────────────────────────────
exports.createUser = async (data, createdBy) => {
  const actor = createdBy && typeof createdBy === "object" ? createdBy : null;
  const createdById = actor?.userId ?? createdBy;
  const {
    email, password, role_id, member_id, invited_member_id,
    first_name, last_name, phone, gender, birthdate,
    spiritual_birthday, address, cell_group_id, group_id,
    leads_cell_group_id, leads_group_id, leads_ministry_id,
    member_ministry_role_id,
  } = data;

  const existing = await User.findOne({ where: { email, is_deleted: 0 } });
  if (existing) throw AppError.conflict("DUPLICATE", "Email already in use");

  const role = await Role.findByPk(role_id);
  if (!role) throw AppError.notFound("RECORD_NOT_FOUND", "Role not found");

  if (LEADERSHIP_PROFILE_ROLES.has(role.role_name)) {
    if (!isSystemAdministrator(actor)) {
      throw AppError.forbidden("Only System Admin can create a leadership account or assign its teams");
    }
    return createUserWithLeadership(data, role, actor);
  }

  const leaderAssignment = await validateLeaderAssignment(role, {
    leads_cell_group_id,
    leads_group_id,
    leads_ministry_id,
  });

  // Validate: member_ministry_role_id is NOT allowed for Ministry Leader role
  if (member_ministry_role_id && role.role_name === 'Ministry Leader') {
    throw AppError.badRequest("VALIDATION", "Use leads_ministry_id for Ministry Leader role, not member_ministry_role_id");
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let resolvedMemberId = member_id || null;
  if (!resolvedMemberId && first_name && last_name) {
    const member = await Member.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email || null,
      phone: phone || null,
      gender: gender || null,
      birthdate: birthdate || null,
      spiritual_birthday: spiritual_birthday || null,
      address: address || null,
      cell_group_id: cell_group_id ? parseInt(cell_group_id) : null,
      group_id: group_id ? parseInt(group_id) : null,
      status: "Active",
      is_deleted: 0,
    });
    resolvedMemberId = member.id;
  }

  const user = await User.create({
    email,
    password_hash,
    role_id,
    member_id: resolvedMemberId || null,
    invited_member_id: invited_member_id || null,
    ...leaderAssignment,
    is_active: 1,
    force_password_change: 1,
  });

  // If member_ministry_role_id is provided, add user to that ministry as a team member
  if (member_ministry_role_id && resolvedMemberId) {
    await MinistryMembership.findOrCreate({
      where: {
        ministry_role_id: parseInt(member_ministry_role_id),
        member_id: resolvedMemberId,
      },
      defaults: {
        ministry_role_id: parseInt(member_ministry_role_id),
        member_id: resolvedMemberId,
        added_by: createdBy,
      },
    });
  }

  const created = await exports.getUserById(user.id);
  auditLog.log({ userId: createdById, action: "CREATE_USER", targetTable: "users", targetId: created.id });
  return created;
};


const hasLeaderAssignmentInput = (data = {}) => Boolean(
  data.leader_assignments
  || data.leads_cell_group_id
  || data.leads_group_id
  || data.leads_ministry_id
);

const getAssignmentKeySet = (rows = []) => new Set(rows
  .filter((row) => Number(row.is_active ?? 1) === 1 && !row.revoked_at)
  .map((row) => `${row.scope_type}:${Number(row.scope_id)}`));

const assignmentKeysMatch = (currentRows, desired) => {
  const current = getAssignmentKeySet(currentRows);
  const next = new Set([...desired.entries()]
    .filter(([, id]) => id != null)
    .map(([type, id]) => `${type}:${Number(id)}`));
  return current.size === next.size && [...current].every((key) => next.has(key));
};

const updateUserWithLeaderScope = async (id, data, actor, requestedRole) => {
  if (!isSystemAdministrator(actor)) {
    throw AppError.forbidden("Only System Admin can change a leadership role or assignment");
  }
  if (data.member_ministry_role_id && requestedRole.role_name === "Ministry Leader") {
    throw AppError.badRequest("VALIDATION", "Use the leadership assignment control to assign a Ministry Leader");
  }

  const reason = String(data.leadership_reason || "").trim();
  const sequelizeInstance = sequelize;
  const changedId = await sequelizeInstance.transaction(async (transaction) => {
    const user = await User.findOne({
      where: { id, is_deleted: 0 },
      include: [{ model: Role, as: "role", attributes: ["id", "role_name"] }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "Requested resource not available");

    const expectedRevision = data.expected_leadership_revision;
    if (expectedRevision !== undefined && Number(expectedRevision) !== Number(user.leadership_revision || 0)) {
      throw AppError.conflict("LEADERSHIP_REVISION_CHANGED", "Leadership assignments changed. Reload this account and try again");
    }

    if (data.email && data.email !== user.email) {
      const duplicate = await User.findOne({
        where: { email: data.email, is_deleted: 0 },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (duplicate && Number(duplicate.id) !== Number(user.id)) {
        throw AppError.conflict("DUPLICATE", "Email already in use");
      }
    }

    const [existingRows, memberRole] = await Promise.all([
      UserLeaderAssignment.findAll({
        where: { user_id: user.id },
        order: [["scope_type", "ASC"], ["scope_id", "ASC"], ["id", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      }),
      Role.findByPk(data.role_id || user.role_id, { transaction }),
    ]);
    if (!memberRole) throw AppError.notFound("RECORD_NOT_FOUND", "Role not found");

    const desired = await targetsForRole(memberRole.role_name, data, existingRows, false, {
      leads_cell_group_id: user.leads_cell_group_id,
      leads_group_id: user.leads_group_id,
      leads_ministry_id: user.leads_ministry_id,
    });
    const changed = Number(memberRole.id) !== Number(user.role_id)
      || !assignmentKeysMatch(existingRows, desired);
    if (changed && reason.length < 5) {
      throw AppError.badRequest("LEADERSHIP_REASON_REQUIRED", "Enter a reason of at least 5 characters for the leadership change");
    }

    const nextMemberId = data.member_id !== undefined ? data.member_id : user.member_id;
    const projections = assignmentProjections(memberRole.role_name, desired);
    const nextLeadershipRevision = changed
      ? Number(user.leadership_revision || 0) + 1
      : Number(user.leadership_revision || 0);

    await user.update({
      ...(data.email && { email: data.email }),
      ...(data.role_id && { role_id: data.role_id }),
      ...(data.member_id !== undefined && { member_id: data.member_id }),
      ...(data.invited_member_id !== undefined && { invited_member_id: data.invited_member_id }),
      ...projections,
      ...(changed && { leadership_revision: nextLeadershipRevision }),
    }, { transaction });

    if (changed) {
      await persistAssignments({
        userId: user.id,
        actorId: actor.userId,
        roleName: memberRole.role_name,
        desired,
        reason,
        existingRows,
        transaction,
      });
    }

    if (nextMemberId && data.member_ministry_role_id !== undefined) {
      if (data.member_ministry_role_id) {
        const [membership, created] = await MinistryMembership.findOrCreate({
          where: { member_id: nextMemberId },
          defaults: {
            ministry_role_id: Number(data.member_ministry_role_id),
            member_id: nextMemberId,
            added_by: actor.userId,
          },
          transaction,
        });
        if (!created && Number(membership.ministry_role_id) !== Number(data.member_ministry_role_id)) {
          await membership.update({ ministry_role_id: Number(data.member_ministry_role_id) }, { transaction });
        }
      } else {
        await MinistryMembership.destroy({ where: { member_id: nextMemberId }, transaction });
      }
    }

    const canEditMembers = (await permissionCache.get(actor.roleId)).has("members:update");
    const hasMemberFields =
      data.first_name !== undefined || data.last_name !== undefined || data.phone !== undefined
      || data.gender !== undefined || data.birthdate !== undefined || data.spiritual_birthday !== undefined
      || data.address !== undefined || data.cell_group_id !== undefined || data.group_id !== undefined;
    if (nextMemberId && hasMemberFields && canEditMembers) {
      const member = await Member.findByPk(nextMemberId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Linked member profile is unavailable");
      await member.update({
        ...(data.first_name && { first_name: data.first_name.trim() }),
        ...(data.last_name && { last_name: data.last_name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.gender !== undefined && { gender: data.gender || null }),
        ...(data.birthdate !== undefined && { birthdate: data.birthdate || null }),
        ...(data.spiritual_birthday !== undefined && { spiritual_birthday: data.spiritual_birthday || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.cell_group_id !== undefined && { cell_group_id: data.cell_group_id ? Number(data.cell_group_id) : null }),
        ...(data.group_id !== undefined && { group_id: data.group_id ? Number(data.group_id) : null }),
      }, { transaction });
    }

    await AuditLog.create({
      user_id: actor.userId,
      action: changed ? "UPDATE_USER_LEADERSHIP" : "UPDATE_USER",
      target_table: "users",
      target_id: user.id,
      old_values: changed ? {
        role_id: user.role_id,
        leadership_revision: user.leadership_revision,
      } : null,
      new_values: {
        role_id: memberRole.id,
        ...(changed && {
          leadership_revision: nextLeadershipRevision,
          assignment_keys: [...desired.entries()].filter(([, value]) => value != null).map(([type, value]) => `${type}:${Number(value)}`),
          reason,
        }),
      },
    }, { transaction });
    return user.id;
  });

  return exports.getUserById(changedId);
};

// ── Update User ──────────────────────────────────────────────
exports.updateUser = async (id, data, actor) => {
  const updatedBy = actor?.userId ?? actor;
  const user = await User.findByPk(id);
  if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "Requested resource not available");

  const {
    email, role_id, member_id, invited_member_id, is_active,
    first_name, last_name, phone, gender, birthdate,
    spiritual_birthday, address, cell_group_id, group_id,
    leads_cell_group_id, leads_group_id, leads_ministry_id,
    member_ministry_role_id,
  } = data;

  if (email && email !== user.email) {
    const existing = await User.findOne({ where: { email, is_deleted: 0 } });
    if (existing) throw AppError.conflict("DUPLICATE", "Email already in use");
  }

  const role = role_id
    ? await Role.findByPk(role_id)
    : await Role.findByPk(user.role_id);
  if (!role) throw AppError.notFound("RECORD_NOT_FOUND", "Role not found");

  const currentRole = await Role.findByPk(user.role_id);
  const currentRoleIsLeaderProfile = LEADERSHIP_PROFILE_ROLES.has(currentRole?.role_name);
  const nextRoleIsLeaderProfile = LEADERSHIP_PROFILE_ROLES.has(role.role_name);
  if (currentRoleIsLeaderProfile || nextRoleIsLeaderProfile || hasLeaderAssignmentInput(data)) {
    if (!isSystemAdministrator(actor)) {
      throw AppError.forbidden("Only System Admin can change a leadership role or team assignment");
    }
    return updateUserWithLeaderScope(id, data, actor, role);
  }

  const leaderAssignment = await validateLeaderAssignment(role, {
    leads_cell_group_id,
    leads_group_id,
    leads_ministry_id,
  }, user);

  if (member_ministry_role_id && role.role_name === "Ministry Leader") {
    throw AppError.badRequest("VALIDATION", "Use leads_ministry_id for Ministry Leader role, not member_ministry_role_id");
  }

  await user.update({
    ...(email && { email }),
    ...(role_id && { role_id }),
    ...(member_id !== undefined && { member_id }),
    ...(invited_member_id !== undefined && { invited_member_id }),
    ...(is_active !== undefined && { is_active }),
    ...leaderAssignment,
  });

  // Update linked member ministry membership
  if (user.member_id && member_ministry_role_id !== undefined) {
    if (member_ministry_role_id) {
      const [membership, created] = await MinistryMembership.findOrCreate({
        where: { member_id: user.member_id },
        defaults: {
          ministry_role_id: parseInt(member_ministry_role_id),
          member_id: user.member_id,
          added_by: updatedBy,
        },
      });
      if (!created && membership.ministry_role_id !== parseInt(member_ministry_role_id)) {
        await membership.update({ ministry_role_id: parseInt(member_ministry_role_id) });
      }
    } else {
      await MinistryMembership.destroy({ where: { member_id: user.member_id } });
    }
  }

  // Update linked member if exists — writing member profile fields
  // (name/contact/group assignments) requires members:update, otherwise
  // a users:update-only role could silently move members between groups.
  const canEditMembers = actor?.roleName === "System Admin" || (
    actor?.roleId && (await permissionCache.get(actor.roleId)).has("members:update")
  );
  const hasMemberFields =
    first_name !== undefined || last_name !== undefined || phone !== undefined ||
    gender !== undefined || birthdate !== undefined || spiritual_birthday !== undefined ||
    address !== undefined || cell_group_id !== undefined || group_id !== undefined;

  if (user.member_id && hasMemberFields && canEditMembers) {
    const member = await Member.findByPk(user.member_id);
    if (member) {
      await member.update({
        ...(first_name && { first_name: first_name.trim() }),
        ...(last_name && { last_name: last_name.trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(gender !== undefined && { gender: gender || null }),
        ...(birthdate !== undefined && { birthdate: birthdate || null }),
        ...(spiritual_birthday !== undefined && { spiritual_birthday: spiritual_birthday || null }),
        ...(address !== undefined && { address: address || null }),
        ...(cell_group_id !== undefined && { cell_group_id: cell_group_id ? parseInt(cell_group_id) : null }),
        ...(group_id !== undefined && { group_id: group_id ? parseInt(group_id) : null }),
      });
    }
  }

  auditLog.log({ userId: updatedBy, action: "UPDATE_USER", targetTable: "users", targetId: id });
return await exports.getUserById(id);
};

// ── Deactivate User (Soft Delete) ────────────────────────────
exports.deactivateUser = async (id, requestingUserId) => {
  if (parseInt(id) === parseInt(requestingUserId))
    throw AppError.badRequest("VALIDATION", "You cannot deactivate your own account");

  const user = await User.findOne({ where: { id, is_deleted: 0 } });
  if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "Requested resource not available");

  await user.update({ is_active: 0 });
  auditLog.log({ userId: requestingUserId, action: "DEACTIVATE_USER", targetTable: "users", targetId: id });
  return { message: "User deactivated successfully." };
};

// ── Activate User ─────────────────────────────────────────────
exports.activateUser = async (id, requestingUserId) => {
  const user = await User.findOne({ where: { id, is_deleted: 0 } });
  if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "Requested resource not available");

  await user.update({ is_active: 1 });
  auditLog.log({ userId: requestingUserId, action: "ACTIVATE_USER", targetTable: "users", targetId: id });
  return { message: "User activated successfully." };
};

// ── Hard Delete User ──────────────────────────────────────────
exports.hardDeleteUser = async (id, requestingUserId) => {
  if (parseInt(id) === parseInt(requestingUserId))
    throw AppError.badRequest("VALIDATION", "You cannot delete your own account");

  const user = await User.findOne({ where: { id, is_deleted: 0 } });
  if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "Requested resource not available");

  const sequelize = require("../config/db");

  // Capture member_id before deletion so we can cascade
  const linkedMemberId = user.member_id;

  await sequelize.transaction(async (t) => {
    // Nullify audit logs (preserve history but remove user reference)
    await sequelize.query(
      "UPDATE audit_logs SET user_id = NULL WHERE user_id = :userId",
      { replacements: { userId: id }, transaction: t }
    );

    // Delete dependent records
    await sequelize.query("DELETE FROM refresh_tokens WHERE user_id = :userId",        { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM password_reset_tokens WHERE user_id = :userId", { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM user_sessions WHERE user_id = :userId",         { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM notifications WHERE user_id = :userId",         { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM ministry_memberships WHERE added_by = :userId",          { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM ministry_event_invites WHERE invited_by = :userId",      { replacements: { userId: id }, transaction: t });

    // Soft-delete and deactivate the user so existing access JWTs fail the
    // next authorization check even though refresh credentials are removed.
    await user.update({ is_deleted: 1, is_active: 0, deleted_at: new Date() }, { transaction: t });

    // Cascade: soft-delete the linked member (if any)
    if (linkedMemberId) {
      await sequelize.query(
        "UPDATE members SET is_deleted = 1, deleted_at = NOW(), deleted_by = :deletedBy WHERE id = :memberId AND is_deleted = 0",
        { replacements: { deletedBy: requestingUserId, memberId: linkedMemberId }, transaction: t }
      );
    }
  });

  auditLog.log({ userId: requestingUserId, action: "DELETE_USER", targetTable: "users", targetId: id });
  return { message: "User and linked member profile permanently deleted." };
};
