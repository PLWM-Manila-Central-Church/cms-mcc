"use strict";

const { Op } = require("sequelize");
const { Attendance, Service, ServiceAttendanceSummary } = require("../models");

const getAttendanceModel = async () => {
  try {
    const { getQrSchemaReadiness } = require("../modules/qr-attendance/featureSettings");
    if ((await getQrSchemaReadiness()).ready) {
      return require("../modules/qr-attendance/models").QrServiceAttendance;
    }
  } catch {
    // Legacy attendance must continue to work if optional QR tables are absent.
  }
  return Attendance;
};

const syncServiceAttendanceSummary = async (serviceId, transaction) => {
  const AttendanceModel = await getAttendanceModel();
  const schemaReady = AttendanceModel !== Attendance;
  const countOptions = {
    where: {
      service_id: serviceId,
      check_in_method: { [Op.ne]: "pre-reg" },
      ...(schemaReady && { voided_at: null }),
    },
    ...(transaction && { transaction }),
  };
  const total_attended = await AttendanceModel.count(countOptions);
  const service = await Service.findByPk(serviceId, {
    attributes: ["capacity"],
    ...(transaction && { transaction }),
  });
  const total_expected = Number(service?.capacity || 0);
  const total_absent = Math.max(0, total_expected - total_attended);

  await ServiceAttendanceSummary.upsert({
    service_id: serviceId,
    total_attended,
    total_expected,
    total_absent,
  }, { ...(transaction && { transaction }) });
  return { total_attended, total_expected, total_absent };
};

module.exports = { getAttendanceModel, syncServiceAttendanceSummary };
