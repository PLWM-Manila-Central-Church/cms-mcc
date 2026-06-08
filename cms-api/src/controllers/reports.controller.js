"use strict";

const reportsService = require("../services/reports.service");

exports.tithingStatement = async (req, res, next) => {
  try {
    const pdf = await reportsService.generateTithingStatement(req.query.member_id, req.query.year);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tithing-${req.query.year || "all"}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
};