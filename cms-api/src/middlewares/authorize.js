"use strict";

const permissionCache = require("../helpers/permissionCache.helper");
const { getLeaderProfilePermissions } = require("../services/leader-access.service");
const { requireLeaderScope } = require("../helpers/leaderAssignments.helper");

module.exports = (module, action) => async (req, res, next) => {
  try {
    // System Admin bypasses all permission checks
    if (req.user.roleName === "System Admin") return next();

    // A unified Leader must be authorized against the selected assignment
    // profile. The "all teams" context is read-only, even where the shared
    // Leader role has a common permission grant.
    if (req.user.roleName === "Leader") {
      if (action !== "read") requireLeaderScope(req.user);
      const scopedPermissions = await getLeaderProfilePermissions(req.user);
      if (!scopedPermissions.has(`${module}:${action}`)) {
        return res.status(403).json({ message: "Access forbidden for the selected team" });
      }
      return next();
    }

    // Fetch permissions from cache (2 DB queries eliminated after first hit)
    const permissions = await permissionCache.get(req.user.roleId);

    if (!permissions.has(`${module}:${action}`))
      return res.status(403).json({ message: "Access forbidden" });

    next();
  } catch (err) {
    next(err);
  }
};
