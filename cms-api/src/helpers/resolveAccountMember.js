"use strict";
const { Member, User } = require("../models");
const AppError = require("./AppError");

module.exports = async (data, transaction) => {
  const options = transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {};
  if (data.member_id) {
    const member = await Member.findOne({ where: { id: data.member_id, is_deleted: 0 }, ...options });
    if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member profile is not available");
    const linked = await User.findOne({ where: { member_id: member.id, is_deleted: 0 }, ...options });
    if (linked) throw AppError.conflict("MEMBER_LOGIN_EXISTS", "This Member already has a login. Manage that account instead.");
    return member.id;
  }
  const existing = await Member.findOne({ where: { email: data.email }, ...options });
  if (existing) {
    if (Number(existing.is_deleted)) throw AppError.conflict("MEMBER_ARCHIVED", "This email belongs to an archived Member profile. Review it in Members first.");
    throw AppError.conflict("MEMBER_PROFILE_EXISTS", "A Member profile already uses this email. Link the existing profile to create its fresh login.", {
      member: { id: existing.id, first_name: existing.first_name, last_name: existing.last_name },
    });
  }
  if (!data.first_name || !data.last_name) return null;
  const member = await Member.create({
    first_name: data.first_name.trim(), last_name: data.last_name.trim(), email: data.email,
    phone: data.phone || null, gender: data.gender || null,
    birthdate: data.birthdate || null, spiritual_birthday: data.spiritual_birthday || null,
    address: data.address || null, cell_group_id: Number(data.cell_group_id) || null,
    group_id: Number(data.group_id) || null, status: "Active", is_deleted: 0,
  }, transaction ? { transaction } : {});
  return member.id;
};
