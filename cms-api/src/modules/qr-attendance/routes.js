"use strict";

const express = require("express");
const auth = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/authorize");
const validate = require("../../middlewares/validate");
const validateQuery = require("../../middlewares/validateQuery");
const { qrUserLimiter } = require("../../middlewares/rateLimiters");
const { requireQrAttendanceEnabled } = require("./featureSettings");
const { memberQrAdminRoutes } = require("./memberQr.routes");
const ctrl = require("./attendance.controller");
const validators = require("./validators");

const router = express.Router();

router.get("/capabilities", auth, qrUserLimiter, ctrl.getCapabilities);

router.use(memberQrAdminRoutes);
router.use(auth, qrUserLimiter, requireQrAttendanceEnabled);

router.get("/sessions", authorize("qr_attendance", "read"), ctrl.listSessions);
router.post(
  "/sessions",
  authorize("qr_attendance", "configure_session"),
  validate(validators.createSessionSchema),
  ctrl.createSession,
);
router.get("/sessions/:sessionId", authorize("qr_attendance", "read"), ctrl.getSession);
router.get(
  "/sessions/:sessionId/roster",
  authorize("qr_attendance", "read"),
  validateQuery(validators.listQuerySchema),
  ctrl.listRoster,
);
router.post(
  "/sessions/:sessionId/expected-members",
  authorize("qr_attendance", "configure_session"),
  validate(validators.expectedMembersSchema),
  ctrl.addExpectedMembers,
);
router.post(
  "/sessions/:sessionId/open",
  authorize("qr_attendance", "configure_session"),
  ctrl.openSession,
);
router.post(
  "/sessions/:sessionId/close",
  authorize("qr_attendance", "configure_session"),
  ctrl.closeSession,
);
router.post(
  "/sessions/:sessionId/cancel",
  authorize("qr_attendance", "configure_session"),
  validate(validators.cancelSessionSchema),
  ctrl.cancelSession,
);
router.get("/sessions/:sessionId/summary", authorize("qr_attendance", "read"), ctrl.getSummary);
router.get("/sessions/:sessionId/attendance", authorize("qr_attendance", "read"), validateQuery(validators.listQuerySchema), ctrl.listAttendance);
router.post(
  "/sessions/:sessionId/member-preview",
  authorize("qr_attendance", "read"),
  validate(validators.qrPayloadSchema),
  ctrl.previewMember,
);
router.post(
  "/sessions/:sessionId/check-ins",
  authorize("qr_attendance", "check_in"),
  validate(validators.directCheckInSchema),
  ctrl.checkInMember,
);
router.post(
  "/sessions/:sessionId/batches",
  authorize("qr_attendance", "record_batch"),
  validate(validators.createBatchSchema),
  ctrl.createBatch,
);
router.get(
  "/sessions/:sessionId/batches",
  authorize("qr_attendance", "read"),
  validateQuery(validators.listQuerySchema),
  ctrl.listBatches,
);
router.post("/batches/resolve", authorize("qr_attendance", "review_batch"), validate(validators.resolveBatchQrSchema), ctrl.resolveBatchQr);
router.get("/batches/:batchId", authorize("qr_attendance", "read"), ctrl.getBatch);
router.get("/batches/:batchId/image.png", authorize("qr_attendance", "read"), ctrl.getBatchQrImage);
router.post(
  "/batches/:batchId/items",
  authorize("qr_attendance", "record_batch"),
  validate(validators.addBatchItemSchema),
  ctrl.addBatchItem,
);
router.delete(
  "/batches/:batchId/items/:memberId",
  authorize("qr_attendance", "record_batch"),
  validate(validators.removeBatchItemSchema),
  ctrl.removeBatchItem,
);
router.post("/batches/:batchId/submit", authorize("qr_attendance", "submit_batch"), validate(validators.submitBatchSchema), ctrl.submitBatch);
router.post("/batches/:batchId/approve", authorize("qr_attendance", "review_batch"), validate(validators.approveBatchSchema), ctrl.approveBatch);
router.post("/batches/:batchId/reject", authorize("qr_attendance", "review_batch"), validate(validators.rejectBatchSchema), ctrl.rejectBatch);
router.post("/batches/:batchId/withdraw", authorize("qr_attendance", "submit_batch"), validate(validators.withdrawBatchSchema), ctrl.withdrawBatch);
router.post(
  "/sessions/:sessionId/members/:memberId/correction",
  authorize("qr_attendance", "correct"),
  validate(validators.correctAttendanceSchema),
  ctrl.correctAttendance,
);
router.get(
  "/sessions/:sessionId/export.csv",
  authorize("qr_attendance", "read"),
  validateQuery(validators.exportQuerySchema),
  ctrl.exportSessionCsv,
);

module.exports = router;
