"use strict";

const AppError = require("../../helpers/AppError");
const { Member } = require("../../models");
const { ensureMemberInScope, getMemberScopeWhere, getScope } = require("../../helpers/scopedLeader.helper");

const getLeaderBatchScope = (user = {}) => {
  const scope = getScope(user);
  if (!scope || !scope.id) {
    throw AppError.forbidden("A current cell group or group leader assignment is required");
  }

  if (scope.type === "cell_group") return { cell_group_id: scope.id, group_id: null };
  if (scope.type === "group") return { cell_group_id: null, group_id: scope.id };

  throw AppError.forbidden("Only assigned Cell Group or Group Leaders may submit attendance batches");
};

const assertMemberInActorScope = async (memberId, user, transaction) => {
  await ensureMemberInScope(memberId, user);
  const member = await Member.findByPk(memberId, {
    attributes: ["id", "first_name", "last_name", "status", "cell_group_id", "group_id", "profile_photo_url"],
    ...(transaction && { transaction }),
  });
  if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member is not available for attendance");
  return member;
};

const getScopedAttendanceMemberWhere = async (user = {}) => getMemberScopeWhere(user);

const applyCapturedScope = (where = {}, scopeFields = {}, user = {}) => {
  const scope = getScope(user);
  if (!scope) return where;
  if (!scope.id) return { ...where, id: -1 };

  if (scope.type === "cell_group") {
    return { ...where, [scopeFields.cellGroup || "cell_group_id_at_check_in"]: scope.id };
  }
  if (scope.type === "group") {
    return { ...where, [scopeFields.group || "group_id_at_check_in"]: scope.id };
  }

  return { ...where, id: -1 };
};

module.exports = {
  applyCapturedScope,
  assertMemberInActorScope,
  getLeaderBatchScope,
  getScopedAttendanceMemberWhere,
};
