"use strict";

const { CellGroup, Event } = require("../models");
const { Op } = require("sequelize");

// ── Public Stats (no auth — used by the public landing page) ─
exports.getPublicStats = async (req, res, next) => {
  try {
    const totalCellGroups = await CellGroup.count();

    const upcomingEvents = await Event.findAll({
      where: {
        start_date: { [Op.gte]: new Date() },
        status: "published",
        is_deleted: 0,
      },
      attributes: ["id", "title", "start_date", "end_date", "location", "category_id"],
      order: [["start_date", "ASC"]],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        cellGroups: totalCellGroups,
        upcomingEvents,
      },
    });
  } catch (err) {
    next(err);
  }
};
