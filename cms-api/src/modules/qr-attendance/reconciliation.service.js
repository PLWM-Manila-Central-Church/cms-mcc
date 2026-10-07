"use strict";

const AppError = require("../../helpers/AppError");
const { getQrSchemaReadiness } = require("./featureSettings");
const { writeQrAudit } = require("./audit");
const { QrAttendanceSession, sequelize } = require("./models");

const invalidateSessionFinalization = async (
  sessionId,
  { transaction, actorId = null, reason = "attendance_changed" } = {},
) => {
  const readiness = await getQrSchemaReadiness();
  if (!readiness.ready) return null;

  if (!transaction) {
    return sequelize.transaction((managedTransaction) => invalidateSessionFinalization(sessionId, {
      transaction: managedTransaction,
      actorId,
      reason,
    }));
  }

  const session = await QrAttendanceSession.findByPk(sessionId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");

  const previousRevision = Number(session.activity_revision || 1);
  const previousFinalizedAt = session.finalized_at;
  const nextRevision = previousRevision + 1;
  const wasFinalized = Boolean(
    session.finalized_at
    && Number(session.finalized_revision) === previousRevision,
  );

  await session.update({
    activity_revision: nextRevision,
    finalized_at: null,
    finalized_by: null,
    finalized_revision: null,
  }, { transaction });

  if (wasFinalized) {
    await writeQrAudit({
      actorId,
      action: "QR_SESSION_FINALIZATION_REOPENED",
      table: "attendance_sessions",
      recordId: session.id,
      oldValues: { finalized_at: previousFinalizedAt, finalized_revision: previousRevision },
      newValues: { activity_revision: nextRevision, reason },
      transaction,
    });
  }

  return { activity_revision: nextRevision, finalization_reopened: wasFinalized };
};

const invalidateServiceFinalization = async (
  serviceId,
  { transaction, actorId = null, reason = "service_attendance_changed" } = {},
) => {
  const readiness = await getQrSchemaReadiness();
  if (!readiness.ready) return null;

  const session = await QrAttendanceSession.findOne({
    where: { service_id: serviceId },
    attributes: ["id"],
    ...(transaction && { transaction }),
  });
  if (!session) return null;
  return invalidateSessionFinalization(session.id, { transaction, actorId, reason });
};

module.exports = { invalidateServiceFinalization, invalidateSessionFinalization };
