"use strict";

const PERMISSIONS = [
  { module: "qr_attendance", action: "read", description: "Read QR attendance sessions within the user's scope" },
  { module: "qr_attendance", action: "check_in", description: "Confirm individual member attendance" },
  { module: "qr_attendance", action: "record_batch", description: "Record draft attendance for assigned members" },
  { module: "qr_attendance", action: "submit_batch", description: "Submit a leader attendance batch for review" },
  { module: "qr_attendance", action: "review_batch", description: "Approve or reject leader attendance batches" },
  { module: "qr_attendance", action: "correct", description: "Void or reinstate a confirmed attendance record with a reason" },
  { module: "qr_attendance", action: "configure_session", description: "Configure QR attendance sessions" },
  { module: "member_qr", action: "manage", description: "Issue or reissue member QR codes within operational member access" },
];

const ROLE_GRANTS = {
  "System Admin": [
    ["qr_attendance", "read"],
    ["qr_attendance", "check_in"],
    ["qr_attendance", "record_batch"],
    ["qr_attendance", "submit_batch"],
    ["qr_attendance", "review_batch"],
    ["qr_attendance", "correct"],
    ["qr_attendance", "configure_session"],
    ["member_qr", "manage"],
  ],
  Pastor: [["qr_attendance", "read"]],
  "Ministry Leader": [["qr_attendance", "read"]],
  "Registration Team": [
    ["qr_attendance", "read"],
    ["qr_attendance", "check_in"],
    ["qr_attendance", "review_batch"],
    ["qr_attendance", "correct"],
    ["qr_attendance", "configure_session"],
    ["member_qr", "manage"],
  ],
  "Cell Group Leader": [
    ["qr_attendance", "read"],
    ["qr_attendance", "record_batch"],
    ["qr_attendance", "submit_batch"],
  ],
  "Group Leader": [
    ["qr_attendance", "read"],
    ["qr_attendance", "record_batch"],
    ["qr_attendance", "submit_batch"],
  ],
};

module.exports = { PERMISSIONS, ROLE_GRANTS };
