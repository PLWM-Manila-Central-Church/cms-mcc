"use strict";

module.exports = (req, res, next) => {
  if (req.user?.roleName !== "System Admin") {
    return res.status(403).json({ message: "Account management requires System Admin access" });
  }
  return next();
};
