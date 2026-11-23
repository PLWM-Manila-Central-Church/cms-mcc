"use strict";

const READ_ROLES = ["System Admin", "Pastor", "Registration Team", "Leader", "Cell Group Leader", "Group Leader", "Ministry Leader"];
const STAFF_ROLES = ["System Admin", "Registration Team"];
const GLOBAL_ROLES = ["System Admin", "Pastor", "Registration Team"];
const CAMPAIGN_ROLES = ["System Admin", "Pastor", "Registration Team", "Ministry Leader", "Cell Group Leader", "Group Leader", "Leader"];
const BROADCAST_ROLES = ["System Admin", "Pastor"];
const AppError = require("../../helpers/AppError");
const requireRole = (roles) => (req, _res, next) => roles.includes(req.user?.roleName)
  ? next() : next(AppError.forbidden("This workspace is outside your assigned role"));
const canBroadcast = (user) => BROADCAST_ROLES.includes(user?.roleName);
const canApprove = (user) => BROADCAST_ROLES.includes(user?.roleName);
module.exports = { READ_ROLES, STAFF_ROLES, GLOBAL_ROLES, CAMPAIGN_ROLES, BROADCAST_ROLES, requireRole, canBroadcast, canApprove };
