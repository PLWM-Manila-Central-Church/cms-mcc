"use strict";

const service = require("../services/registrationAnalytics.service");
const AppError = require("../helpers/AppError");

exports.getOverview = async (req, res, next) => {
  try {
    const data = await service.getOverview({ from: req.query.from, to: req.query.to });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getEvent = async (req, res, next) => {
  try {
    const data = await service.getEvent(req.params.id);
    if (!data) throw AppError.notFound("RECORD_NOT_FOUND", "Event not found");
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
