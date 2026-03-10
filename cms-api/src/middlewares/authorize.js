"use strict";

const { RolePermission, Permission } = require("../models");

module.exports = (module, action) => async (req, res, next) => {
  try {
    // System Admin bypasses all permission checks
    if (req.user.roleName === "System Admin") return next();

    // Check if the user's role has the required permission
    const permission = await Permission.findOne({
      where: { module, action },
    });

    if (!permission)
      return res.status(403).json({ message: "Permission not found" });

    const rolePermission = await RolePermission.findOne({
      where: {
        role_id: req.user.roleId,
        permission_id: permission.id,
      },
    });

    if (!rolePermission)
      return res.status(403).json({ message: "Access forbidden" });

    next();
  } catch (err) {
    next(err);
  }
};
