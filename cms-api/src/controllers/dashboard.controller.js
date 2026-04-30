"use strict";
const dashboardService = require("../services/dashboard.service");

exports.getStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getStats({
      userId: req.user.userId,
      memberId: req.user.memberId,
      roleName: req.user.roleName,
      leadsMinistryId: req.user.leadsMinistryId,
      leadsMinistryName: req.user.leadsMinistryName,
      leadsCellGroupId: req.user.leadsCellGroupId,
      leadsCellGroupName: req.user.leadsCellGroupName,
      leadsGroupId: req.user.leadsGroupId,
      leadsGroupName: req.user.leadsGroupName,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
