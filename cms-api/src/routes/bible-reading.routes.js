"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/bible-reading.controller");
const auth = require("../middlewares/verifyToken");

// Keep this module deliberately narrower than the general attendance
// permission: the Bible Reading monitor is for Registration and Pastor only.
const allowMonitorRead = (req, res, next) => {
  if (["Registration Team", "Pastor"].includes(req.user?.roleName)) return next();
  return res.status(403).json({ message: "The Bible Reading monitor is limited to Registration Team and Pastor." });
};
const allowMonitorWrite = (req, res, next) => {
  if (req.user?.roleName === "Registration Team") return next();
  return res.status(403).json({ message: "Only Registration Team can manage group memory verses." });
};

router.get("/summary", auth, allowMonitorRead, ctrl.getSummary);
router.get("/verses", auth, allowMonitorRead, ctrl.listVerses);
router.post("/verses", auth, allowMonitorWrite, ctrl.createVerse);
router.post("/verses/:id/archive", auth, allowMonitorWrite, ctrl.deleteVerse);
router.delete("/verses/:id", auth, allowMonitorWrite, ctrl.deleteVerse);

module.exports = router;
