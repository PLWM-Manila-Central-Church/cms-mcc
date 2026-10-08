"use strict";

const analyticsService = require("../services/analytics.service");

exports.getAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getAnalytics({ user: req.user, ...req.query });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
