"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/db");
const AppError = require("./AppError");
const { Service, ServiceResponse, Member, Attendance } = require("../models");

const normalizeSlot = (value, label) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const slot = Number(value);
  if (!Number.isSafeInteger(slot) || slot < 1) {
    throw AppError.badRequest("VALIDATION", `${label} must be a whole number greater than zero`);
  }
  return String(slot);
};

const saveServiceResponse = async ({
  serviceId,
  memberId,
  attendanceStatus,
  seatNumber,
  parkingSlot,
  overrideBy = null,
  overrideReason = null,
}) => {
  const normalizedSeat = normalizeSlot(seatNumber, "Seat number");
  const normalizedParking = normalizeSlot(parkingSlot, "Parking slot");

  return sequelize.transaction(async (transaction) => {
    // Serializing reservations on the service row makes capacity/slot checks
    // safe across both member and staff RSVP paths.
    const service = await Service.findOne({ where: { id: serviceId, is_deleted: 0 },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

    const member = await Member.findByPk(memberId, { transaction });
    if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

    const existing = await ServiceResponse.findOne({
      where: { service_id: serviceId, member_id: memberId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (attendanceStatus === "ATTENDING" && existing?.attendance_status !== "ATTENDING") {
      const attendingCount = await ServiceResponse.count({
        where: { service_id: serviceId, attendance_status: "ATTENDING" },
        transaction,
      });
      if (attendingCount >= Number(service.capacity || 0)) {
        throw AppError.conflict("SERVICE_FULL", "This service has reached its registration capacity");
      }
    }

    let nextSeat = null;
    let nextParking = null;
    if (attendanceStatus === "ATTENDING") {
      nextSeat = normalizedSeat === undefined ? existing?.seat_number || null : normalizedSeat;
      nextParking = normalizedParking === undefined ? existing?.parking_slot || null : normalizedParking;

      if (nextSeat !== null) {
        if (Number(nextSeat) > Number(service.capacity || 0)) {
          throw AppError.badRequest("VALIDATION", `Seat number must be between 1 and ${service.capacity}`);
        }
        const seatConflict = await ServiceResponse.findOne({
          where: {
            service_id: serviceId,
            member_id: { [Op.ne]: memberId },
            attendance_status: "ATTENDING",
            seat_number: nextSeat,
          },
          transaction,
        });
        if (seatConflict) throw AppError.conflict("SEAT_ALREADY_RESERVED", `Seat ${nextSeat} is already reserved`);
      }

      if (nextParking !== null) {
        const parkingLimit = Number(service.total_parking_slots || 0);
        if (parkingLimit < 1 || Number(nextParking) > parkingLimit) {
          throw AppError.badRequest("VALIDATION", parkingLimit < 1
            ? "This service has no parking slots available"
            : `Parking slot must be between 1 and ${parkingLimit}`);
        }
        const parkingConflict = await ServiceResponse.findOne({
          where: {
            service_id: serviceId,
            member_id: { [Op.ne]: memberId },
            attendance_status: "ATTENDING",
            parking_slot: nextParking,
          },
          transaction,
        });
        if (parkingConflict) throw AppError.conflict("PARKING_ALREADY_RESERVED", `Parking slot ${nextParking} is already reserved`);
      }
    }

    const values = {
      attendance_status: attendanceStatus,
      seat_number: nextSeat,
      parking_slot: nextParking,
      ...(overrideBy && { override_by: overrideBy, override_reason: overrideReason || null }),
    };
    const response = existing
      ? await existing.update(values, { transaction })
      : await ServiceResponse.create({ service_id: serviceId, member_id: memberId, ...values }, { transaction });

    if (attendanceStatus === "ATTENDING") {
      const existingAttendance = await Attendance.findOne({
        where: { service_id: serviceId, member_id: memberId, voided_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existingAttendance) return response;

      const archivedPlaceholder = await Attendance.findOne({
        where: { service_id: serviceId, member_id: memberId, check_in_method: "pre-reg", voided_at: { [Op.ne]: null } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (archivedPlaceholder) {
        await archivedPlaceholder.update({ voided_at: null, voided_by: null, void_reason: null }, { transaction });
      } else {
        await Attendance.create({
          service_id: serviceId,
          member_id: memberId,
          check_in_method: "pre-reg",
          entry_source: "legacy",
          checked_in_at: new Date(),
          recorded_by: overrideBy || null,
        }, { transaction });
      }
    } else {
      const placeholders = await Attendance.findAll({
        where: { service_id: serviceId, member_id: memberId, check_in_method: "pre-reg", voided_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      for (const placeholder of placeholders) {
        await placeholder.update({
          voided_at: new Date(),
          voided_by: overrideBy || null,
          void_reason: `Service response changed to ${attendanceStatus}; pre-registration placeholder retained`,
        }, { transaction });
      }
    }

    return response;
  });
};

module.exports = { saveServiceResponse };
