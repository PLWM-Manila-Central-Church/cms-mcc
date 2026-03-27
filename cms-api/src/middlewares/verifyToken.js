"use strict";

const jwt = require("jsonwebtoken");
const { User, Role, Member } = require("../models");

module.exports = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.userId, {
      attributes: ["id", "email", "role_id", "member_id", "is_active", "force_password_change", "leads_cell_group_id", "leads_group_id", "ministry_role_id"],
      include: [
        { model: Role, as: "role", attributes: ["id", "role_name", "is_system"] },
        { model: Member, as: "member", attributes: ["id", "cell_group_id", "group_id"], required: false },
      ],
    });

    if (!user) return res.status(401).json({ message: "User not found" });
    if (!user.is_active) return res.status(401).json({ message: "Account deactivated" });

    req.user = {
      userId:             user.id,
      email:              user.email,
      roleId:             user.role_id,
      roleName:           user.role.role_name,
      isSystem:           user.role.is_system,
      memberId:           user.member_id || null,
      cellGroupId:        user.member?.cell_group_id || null,
      groupId:            user.member?.group_id || null,
      forcePasswordChange: user.force_password_change,
      leadsCellGroupId:   user.leads_cell_group_id || null,
      leadsGroupId:       user.leads_group_id      || null,
      ministryRoleId:     user.ministry_role_id    || null,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
