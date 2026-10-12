"use strict";

const sequelize = require("../config/db");
const { User, RefreshToken, PasswordResetToken, UserSession, UserLeaderAssignment, AuditLog } = require("../models");
const AppError = require("../helpers/AppError");

module.exports = async (id, actor) => {
  if (actor?.roleName !== "System Admin") throw AppError.forbidden("Account management requires System Admin access");
  if (Number(id) === Number(actor.userId)) throw AppError.badRequest("VALIDATION", "You cannot delete your own account");

  return sequelize.transaction(async (transaction) => {
    const user = await User.findOne({ where: { id, is_deleted: 0 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "Requested resource not available");
    const now = new Date();
    const previousEmail = user.email;
    await RefreshToken.update({ revoked: 1, revoked_at: now }, { where: { user_id: user.id, revoked: 0 }, transaction });
    await PasswordResetToken.update({ used: 1 }, { where: { user_id: user.id, used: 0 }, transaction });
    await UserSession.update({ logout_at: now }, { where: { user_id: user.id, logout_at: null }, transaction });
    await UserLeaderAssignment.update({
      is_active: false, revoked_at: now, revoked_by: actor.userId,
      revocation_reason: "User login account removed by System Admin",
      version: sequelize.literal("version + 1"),
    }, { where: { user_id: user.id, is_active: true }, transaction });

    // Keep the historical user ID and all Member/business references. Release
    // the unique login email so a genuinely fresh account can use it again.
    await user.update({
      email: `deleted-user-${user.id}@accounts.invalid`,
      is_deleted: 1, is_active: 0, deleted_at: now,
      leads_cell_group_id: null, leads_group_id: null, leads_ministry_id: null,
      leadership_revision: Number(user.leadership_revision || 0) + 1,
    }, { transaction });
    await AuditLog.create({
      user_id: actor.userId, action: "DELETE_USER", target_table: "users", target_id: user.id,
      old_values: { email: previousEmail, member_id: user.member_id },
      new_values: { is_deleted: 1, is_active: 0, member_profile_preserved: true },
    }, { transaction });
    return { message: "User login removed. Member profile and historical records were preserved." };
  });
};
