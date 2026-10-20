"use strict";

const READ_ROLES = ["System Admin", "Pastor", "Registration Team", "Leader", "Cell Group Leader", "Group Leader", "Ministry Leader"];
const STAFF_ROLES = ["System Admin", "Registration Team"];
const GLOBAL_ROLES = ["System Admin", "Pastor", "Registration Team"];
const AppError = require("../../helpers/AppError");
const requireRole = (roles) => (req, _res, next) => roles.includes(req.user?.roleName)
  ? next() : next(AppError.forbidden("This workspace is outside your assigned role"));
module.exports = { READ_ROLES, STAFF_ROLES, GLOBAL_ROLES, requireRole };
