"use strict";
const dashboardService = require("../services/dashboard.service");

exports.getStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};