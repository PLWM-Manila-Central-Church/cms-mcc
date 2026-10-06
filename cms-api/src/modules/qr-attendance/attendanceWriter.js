"use strict";

const AppError = require("../../helpers/AppError");
const cache = require("../../helpers/cache.helper");
const { EventAttendance, QrServiceAttendance } = require("./models");
const { writeQrAudit } = require("./audit");
const { syncServiceAttendanceSummary } = require("../../helpers/attendanceSummary.helper");
const { sequelize } = require("./models");

const createServiceAttendance = async ({
  session,
  member,
  recordedBy,
  confirmedBy = null,
  method,
  entrySource,
  batchId = null,
  checkedInAt,
  transaction: outerTransaction,
}) => {
  if (!session.service_id) {
    throw new TypeError("A service attendance session is required");
  }
  const write = async (transaction) => {
    const confirmedAt = new Date();
    const existing = await QrServiceAttendance.findOne({
      where: { service_id: session.service_id, member_id: member.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing?.voided_at) {
      throw AppError.conflict("ATTENDANCE_VOIDED", "This service check-in needs an authorized correction before it can be confirmed again");
    }
    if (existing && existing.check_in_method !== "pre-reg") {
      return { record: existing, created: false, outcome: "already_confirmed" };
    }

    const checkInValues = {
      check_in_method: method === "qr" ? "barcode" : "manual",
      checked_in_at: checkedInAt,
      recorded_by: recordedBy || null,
      entry_source: entrySource,
      source_batch_id: batchId,
      confirmed_by: confirmedBy,
      confirmed_at: confirmedAt,
      cell_group_id_at_check_in: member.cell_group_id || null,
      group_id_at_check_in: member.group_id || null,
    };
    const record = existing
      ? await existing.update(checkInValues, { transaction })
      : await QrServiceAttendance.create({
        service_id: session.service_id,
        member_id: member.id,
        ...checkInValues,
      }, { transaction });

    if (record) {
      await writeQrAudit({
        actorId: recordedBy,
        action: entrySource === "leader_batch" ? "QR_SERVICE_BATCH_CHECK_IN" : "QR_SERVICE_CHECK_IN",
        table: "attendances",
        recordId: record.id,
        newValues: {
          service_id: session.service_id,
          session_id: session.id,
          member_id: member.id,
          entry_source: entrySource,
          batch_id: batchId,
        },
        transaction,
      });
    }
    return { record, created: true, outcome: "confirmed" };
  };

  if (outerTransaction) return write(outerTransaction);
  const result = await sequelize.transaction((transaction) => write(transaction));
  await syncServiceAttendanceSummary(session.service_id);
  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  return result;
};

const createEventAttendance = async ({
  session,
  member,
  recordedBy,
  confirmedBy,
  method,
  entrySource,
  batchId = null,
  checkedInAt,
  transaction: outerTransaction,
}) => {
  if (!session.event_id) {
    throw new TypeError("An event attendance session is required");
  }
  const write = async (transaction) => {
    const existing = await EventAttendance.findOne({
      where: { session_id: session.id, member_id: member.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      if (existing.voided_at) {
        throw AppError.conflict("ATTENDANCE_VOIDED", "This event check-in needs an authorized correction before it can be confirmed again");
      }
      return { record: existing, created: false, outcome: "already_confirmed" };
    }
    const record = await EventAttendance.create({
      session_id: session.id,
      member_id: member.id,
      check_in_method: method,
      entry_source: entrySource,
      checked_in_at: checkedInAt,
      recorded_by: recordedBy,
      confirmed_by: confirmedBy,
      confirmed_at: new Date(),
      source_batch_id: batchId,
      cell_group_id_at_check_in: member.cell_group_id || null,
      group_id_at_check_in: member.group_id || null,
    }, { transaction });
    await writeQrAudit({
      actorId: recordedBy,
      action: entrySource === "leader_batch" ? "QR_EVENT_BATCH_CHECK_IN" : "QR_EVENT_CHECK_IN",
      table: "event_attendances",
      recordId: record.id,
      newValues: {
        event_id: session.event_id,
        session_id: session.id,
        member_id: member.id,
        entry_source: entrySource,
        batch_id: batchId,
        confirmed_by: confirmedBy,
      },
      transaction,
    });
    return { record, created: true, outcome: "confirmed" };
  };

  return outerTransaction ? write(outerTransaction) : sequelize.transaction(write);
};

module.exports = { createEventAttendance, createServiceAttendance };
