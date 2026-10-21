"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Op } = require("sequelize");
const sequelize = require("../src/config/db");
const { assertSafeQrTestTarget } = require("./qr-test-target");

assert.equal(process.env.QR_SERVICE_DELETE_QA_TEST, "true", "Set QR_SERVICE_DELETE_QA_TEST=true to run this destructive QA check");
assert.equal(process.env.QR_ATTENDANCE_BROWSER_E2E, "true", "Use only the isolated QR browser E2E fixture database");
assertSafeQrTestTarget(process.env);

const fixturePath = path.resolve(process.env.QR_E2E_FIXTURE_PATH || "");
const tempRoot = path.resolve(os.tmpdir()) + path.sep;
assert.ok(fixturePath.startsWith(tempRoot), "Fixture must be stored under the OS temp directory");
assert.match(path.basename(fixturePath), /^mcc-qr-browser-e2e-qa-[a-z0-9-]+\.json$/i, "Unexpected QA fixture filename");
assert.ok(fs.existsSync(fixturePath), "QR browser E2E fixture is missing");

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const serviceId = Number(fixture.createdIds?.serviceId);
assert.ok(Number.isSafeInteger(serviceId) && serviceId > 0, "Fixture Service ID is invalid");
assert.match(fixture.service?.title || "", /^QR Browser E2E Service /, "Refusing to delete a non-fixture Service");
assert.match(fixture.admin?.email || "", /^qr-browser-admin-[a-z0-9-]+@example\.com$/i, "Refusing to use a non-fixture actor");

const { Attendance, Service, ServiceAttendanceSummary, ServiceResponse, User } = require("../src/models");
const {
  AttendanceBatch,
  AttendanceExpectedMember,
  QrAttendanceSession,
} = require("../src/modules/qr-attendance/models");
const servicesService = require("../src/services/services.service");

const run = async () => {
  await sequelize.authenticate();
  const [admin, service] = await Promise.all([
    User.findOne({ where: { email: fixture.admin.email, is_deleted: 0 }, attributes: ["id"] }),
    Service.findByPk(serviceId),
  ]);
  assert.ok(admin, "Fixture Admin is missing");
  assert.ok(service, "Fixture Service is missing");
  assert.equal(service.title, fixture.service.title, "Fixture Service title changed");

  const sessionsBefore = await QrAttendanceSession.findAll({
    where: { service_id: serviceId },
    attributes: ["id"],
    raw: true,
  });
  const sessionIds = sessionsBefore.map((session) => session.id);
  assert.ok(sessionIds.length > 0, "Create the synthetic QR session in the QA UI before running this check");

  await servicesService.deleteService(serviceId, admin.id);

  const [remainingService, remainingSessions, remainingAttendance, remainingResponses, remainingSummary, remainingBatches, remainingExpected] = await Promise.all([
    Service.findByPk(serviceId),
    QrAttendanceSession.count({ where: { service_id: serviceId } }),
    Attendance.count({ where: { service_id: serviceId } }),
    ServiceResponse.count({ where: { service_id: serviceId } }),
    ServiceAttendanceSummary.count({ where: { service_id: serviceId } }),
    AttendanceBatch.count({ where: { session_id: { [Op.in]: sessionIds } } }),
    AttendanceExpectedMember.count({ where: { session_id: { [Op.in]: sessionIds } } }),
  ]);

  assert.equal(remainingService, null);
  assert.equal(remainingSessions, 0);
  assert.equal(remainingAttendance, 0);
  assert.equal(remainingResponses, 0);
  assert.equal(remainingSummary, 0);
  assert.equal(remainingBatches, 0);
  assert.equal(remainingExpected, 0);
  console.log("Isolated QA Service QR deletion: PASS");
};

run()
  .catch((error) => {
    console.error(`Isolated QA Service QR deletion failed: ${error.code || error.name}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
