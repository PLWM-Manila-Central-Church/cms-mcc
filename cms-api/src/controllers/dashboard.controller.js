"use strict";
const dashboardService = require("../services/dashboard.service");

exports.getStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getStats({
      memberId: req.user.memberId,
      roleId:   req.user.roleId,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
