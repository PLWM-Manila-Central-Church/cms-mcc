"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/members.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const { createMemberSchema, updateMemberSchema } = require("../validators/members.validator");

router.get("/scope/search", auth, authorize("scope_assignments", "manage"), ctrl.searchAssignableForScope);
router.post("/scope/assign", auth, authorize("scope_assignments", "manage"), ctrl.assignMemberToScope);

router.get("/",    auth, authorize("members", "read"),   ctrl.getAllMembers);
router.get("/:id", auth, authorize("members", "read"),   ctrl.getMemberById);
router.post("/",   auth, authorize("members", "create"), validate(createMemberSchema), ctrl.createMember);  // Fix #1
router.put("/:id", auth, authorize("members", "update"), validate(updateMemberSchema), ctrl.updateMember);  // Fix #1
router.patch("/:id/unassign-scope", auth, authorize("scope_assignments", "manage"), ctrl.unassignMemberFromScope);
router.delete("/:id", auth, authorize("members", "delete"), ctrl.deleteMember);

module.exports = router;
