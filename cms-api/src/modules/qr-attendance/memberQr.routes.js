"use strict";

const express = require("express");
const auth = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");
const validate = require("../../middlewares/validate");
const ctrl = require("./memberQr.controller");
const { requireQrAttendanceEnabled } = require("./featureSettings");
const { qrUserLimiter } = require("../../middlewares/rateLimiters");
const { reissueQrSchema } = require("./validators");
const operationalQrAccess = [auth, qrUserLimiter, requireQrAttendanceEnabled];

const memberQrSelfRoutes = express.Router();
memberQrSelfRoutes.use(auth, qrUserLimiter, requireQrAttendanceEnabled);
memberQrSelfRoutes.get("/history", ctrl.getMyEventAttendanceHistory);
memberQrSelfRoutes.get("/", ctrl.getMyQr);
memberQrSelfRoutes.post("/", ctrl.issueMyQr);
memberQrSelfRoutes.get("/image.png", ctrl.getMyQrImage);

const memberQrAdminRoutes = express.Router();

memberQrAdminRoutes.get(
  "/members/:memberId/qr",
  ...operationalQrAccess,
  authorize("member_qr", "manage"),
  ctrl.getOperationalQr,
);
memberQrAdminRoutes.post(
  "/members/:memberId/qr",
  ...operationalQrAccess,
  authorize("member_qr", "manage"),
  ctrl.issueOperationalQr,
);
memberQrAdminRoutes.post(
  "/members/:memberId/qr/reissue",
  ...operationalQrAccess,
  authorize("member_qr", "manage"),
  validate(reissueQrSchema),
  ctrl.reissueOperationalQr,
);
memberQrAdminRoutes.get(
  "/members/:memberId/qr/image.png",
  ...operationalQrAccess,
  authorize("member_qr", "manage"),
  ctrl.getOperationalQrImage,
);

module.exports = { memberQrAdminRoutes, memberQrSelfRoutes };
