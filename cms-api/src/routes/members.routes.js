"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/members.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const { createMemberSchema, updateMemberSchema } = require("../validators/members.validator");

router.get("/",    auth, authorize("members", "read"),   ctrl.getAllMembers);
router.get("/:id", auth, authorize("members", "read"),   ctrl.getMemberById);
router.post("/",   auth, authorize("members", "create"), validate(createMemberSchema), ctrl.createMember);  // Fix #1
router.put("/:id", auth, authorize("members", "update"), validate(updateMemberSchema), ctrl.updateMember);  // Fix #1
router.delete("/:id", auth, authorize("members", "delete"), ctrl.deleteMember);

module.exports = router;
