"use strict";

const reportsService = require("../services/reports.service");
const { User, Member } = require("../models");

exports.tithingStatement = async (req, res, next) => {
  try {
    const { member_id: requestedId, year } = req.query;
    const perms = req.user.permissions || [];

    // IDOR protection: only admin:all and finance:write can view other members' data
    const canViewOthers = perms.includes("admin:all") || perms.includes("finance:write");

    let targetMemberId = requestedId;

    if (!targetMemberId) {
      // No member_id specified — default to the requesting user's own record
      const user = await User.findByPk(req.user.userId, { attributes: ["member_id"] });
      targetMemberId = user?.member_id;
      if (!targetMemberId) {
        return res.status(404).json({ success: false, message: "No member record linked to your account" });
      }
    } else if (!canViewOthers) {
      // User requested a specific member but doesn't have finance:write or admin:all
      // Verify the requested member_id matches their own
      const user = await User.findByPk(req.user.userId, { attributes: ["member_id"] });
      const ownMemberId = user?.member_id;
      if (!ownMemberId || String(ownMemberId) !== String(targetMemberId)) {
        return res.status(403).json({ success: false, message: "You can only view your own tithing statement" });
      }
    }

    const pdf = await reportsService.generateTithingStatement(targetMemberId, year);
    const pdfBuffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tithing-${year || "all"}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};