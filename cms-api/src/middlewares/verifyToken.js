"use strict";

const jwt = require("jsonwebtoken");
const { User, Role } = require("../models");

module.exports = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch user on every request to check is_active and get role
    const user = await User.findByPk(decoded.userId, {
      attributes: [
        "id",
        "email",
        "role_id",
        "is_active",
        "force_password_change",
      ],
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "role_name", "is_system"],
        },
      ],
    });

    if (!user) return res.status(401).json({ message: "User not found" });

    if (!user.is_active)
      return res.status(401).json({ message: "Account deactivated" });

    // Attach full user info to req.user
    req.user = {
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role.role_name,
      isSystem: user.role.is_system,
      forcePasswordChange: user.force_password_change,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
