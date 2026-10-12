"use strict";

const authorize = require("./authorize");

// Members may reach only the self-scoped substitute-request routes that attach
// this middleware. All other roles still need the ordinary services:create grant.
module.exports = (req, res, next) => {
  if (req.user?.roleName === "Member") return next();
  return authorize("services", "create")(req, res, next);
};
