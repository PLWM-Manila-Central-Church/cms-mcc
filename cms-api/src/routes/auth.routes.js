"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const auth = require("../middlewares/verifyToken");

router.post("/login", ctrl.login);
router.post("/refresh-token", ctrl.refreshToken);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.put("/change-password", auth, ctrl.changePassword);
router.post("/logout", auth, ctrl.logout);

module.exports = router;
