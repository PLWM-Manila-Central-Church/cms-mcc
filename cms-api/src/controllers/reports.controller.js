"use strict";

const reportsService = require("../services/reports.service");

exports.tithingStatement = async (req, res, next) => {
  try {
    const pdf = await reportsService.generateTithingStatement(req.query.member_id, req.query.year);
    const pdfBuffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tithing-${req.query.year || "all"}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};