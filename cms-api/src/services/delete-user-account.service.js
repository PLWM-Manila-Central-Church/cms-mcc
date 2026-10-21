"use strict";

const sequelize = require("../config/db");
const { User, RefreshToken, PasswordResetToken, UserSession, AuditLog } = require("../models");
const AppError = require("../helpers/AppError");

module.exports = async (id, actor) => {
  if (actor?.roleName !== "System Admin") throw AppError.forbidden("Account management requires System Admin access");
  if (Number(id) === Number(actor.userId)) throw AppError.badRequest("VALIDATION", "You cannot archive your own account");

  return sequelize.transaction(async (transaction) => {
    const user = await User.findOne({ where: { id, is_deleted: 0 }, transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "Requested resource not available");
    const now = new Date();
    const previousEmail = user.archived_email || user.email;
    await RefreshToken.update({ revoked: 1, revoked_at: now }, { where: { user_id: user.id, revoked: 0 }, transaction });
    await PasswordResetToken.update({ used: 1 }, { where: { user_id: user.id, used: 0 }, transaction });
    await UserSession.update({ logout_at: now }, { where: { user_id: user.id, logout_at: null }, transaction });
    // Keep the identity, member link, and leadership assignments so restoring
    // this archived account does not lose its established relationships.
    await user.update({
      archived_email: previousEmail,
      archived_is_active: user.is_active == null ? 1 : Number(user.is_active),
      is_deleted: 1, is_active: 0, deleted_at: now, deleted_by: actor.userId,
    }, { transaction });
    await AuditLog.create({
      user_id: actor.userId, action: "ARCHIVE_USER", target_table: "users", target_id: user.id,
      old_values: { email: previousEmail, member_id: user.member_id },
      new_values: { is_deleted: 1, is_active: 0, member_profile_preserved: true },
    }, { transaction });
    return { message: "User account archived. Its login, member link, and leadership history can be restored." };
  });
};
