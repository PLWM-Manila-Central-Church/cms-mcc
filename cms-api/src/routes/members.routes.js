"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/members.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/", auth, authorize("members", "read"), ctrl.getAllMembers);
router.get("/:id", auth, authorize("members", "read"), ctrl.getMemberById);
router.post("/", auth, authorize("members", "create"), ctrl.createMember);
router.put("/:id", auth, authorize("members", "update"), ctrl.updateMember);
router.delete("/:id", auth, authorize("members", "delete"), ctrl.deleteMember);

module.exports = router;
