"use strict";

const permissionCache = require("../helpers/permissionCache.helper");

module.exports = (module, action) => async (req, res, next) => {
  try {
    // System Admin bypasses all permission checks
    if (req.user.roleName === "System Admin") return next();

    // Fetch permissions from cache (2 DB queries eliminated after first hit)
    const permissions = await permissionCache.get(req.user.roleId);

    if (!permissions.has(`${module}:${action}`))
      return res.status(403).json({ message: "Access forbidden" });

    next();
  } catch (err) {
    next(err);
  }
};
