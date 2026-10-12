"use strict";

require("dotenv").config();

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Op } = require("sequelize");
const sequelize = require("../src/config/db");
const { assertSafeQrTestTarget } = require("./qr-test-target");
const uploadStorage = require("../src/middlewares/upload-s3");
const { ArchiveAccessLog, ArchiveRecord, ArchiveVersion, AuditLog, User } = require("../src/models");

const isPositiveId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const dryRun = process.argv.includes("--dry-run");

const run = async () => {
  assert.equal(process.env.NODE_ENV, "test", "Refusing archive cleanup outside test mode");
  assert.equal(process.env.ARCHIVE_QA_CLEANUP, "true", "Set ARCHIVE_QA_CLEANUP=true for the exact QA cleanup action");
  assertSafeQrTestTarget(process.env);
  assert.equal(process.env.DB_NAME, "qr_attendance_qa", "Refusing archive cleanup outside qr_attendance_qa");
  assert.ok(process.env.ARCHIVE_QA_FIXTURE_PATH, "ARCHIVE_QA_FIXTURE_PATH is required");

  const fixturePath = path.resolve(process.env.ARCHIVE_QA_FIXTURE_PATH);
  const tempRoot = path.resolve(os.tmpdir()) + path.sep;
  assert.ok(fixturePath.startsWith(tempRoot), "Archive fixture manifest must be stored in the OS temp directory");
  assert.match(path.basename(fixturePath), /^mcc-archive-qa-[a-z0-9-]+\.json$/i, "Unexpected archive manifest filename");
  assert.ok(fs.existsSync(fixturePath), "Archive fixture manifest is missing");

  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const recordId = Number(fixture.recordId);
  const uploaderId = Number(fixture.uploaderId);
  const versionIds = Array.isArray(fixture.versionIds) ? fixture.versionIds.map(Number) : [];
  const auditLogIds = Array.isArray(fixture.auditLogIds) ? fixture.auditLogIds.map(Number) : [];
  const title = String(fixture.recordTitle || "");
  const uploaderEmail = String(fixture.uploaderEmail || "");
  const storageKeys = Array.isArray(fixture.storageKeys) ? fixture.storageKeys : [];

  assert.ok(isPositiveId(recordId), "Archive record ID is invalid");
  assert.ok(isPositiveId(uploaderId), "Archive uploader ID is invalid");
  assert.ok(versionIds.length > 0 && versionIds.every(isPositiveId), "Archive version IDs are invalid");
  assert.equal(new Set(versionIds).size, versionIds.length, "Archive version IDs must be unique");
  assert.ok(auditLogIds.every(isPositiveId), "Archive audit-log IDs are invalid");
  assert.equal(new Set(auditLogIds).size, auditLogIds.length, "Archive audit-log IDs must be unique");
  assert.match(title, /^QA archive JPEG normalization /, "Archive record title is outside this QA fixture");
  assert.match(uploaderEmail, /^qr-browser-admin-[0-9-]+@example\.com$/i, "Archive uploader is not a synthetic QA Admin");
  assert.ok(storageKeys.length > 0 && new Set(storageKeys).size === storageKeys.length, "Archive storage keys must be present and unique");
  for (const key of storageKeys) {
    assert.equal(uploadStorage.getStoredFileKey(key, "archives"), key, "Archive storage key is outside the archives folder");
  }

  await sequelize.authenticate();
  const uploader = await User.findByPk(uploaderId, { attributes: ["id", "email"] });
  assert.equal(uploader?.email, uploaderEmail, "Archive fixture uploader identity changed");

  await sequelize.transaction(async (transaction) => {
    const record = await ArchiveRecord.unscoped().findByPk(recordId, {
      attributes: ["id", "title", "uploaded_by", "file_url", "current_version_id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const versions = await ArchiveVersion.findAll({
      where: { record_id: recordId },
      attributes: ["id", "record_id", "file_url"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const logs = await ArchiveAccessLog.findAll({
      where: { record_id: recordId },
      attributes: ["id"],
      transaction,
    });
    const auditLogs = auditLogIds.length ? await AuditLog.findAll({
      where: { id: { [Op.in]: auditLogIds } },
      attributes: ["id", "user_id", "action", "target_table", "target_id"],
      transaction,
    }) : [];

    if (record) {
      assert.equal(record.title, title, "Archive record title changed before cleanup");
      assert.equal(Number(record.uploaded_by), uploaderId, "Archive record uploader changed before cleanup");
    }
    assert.equal(auditLogs.length, auditLogIds.length, "Archive audit-log scope changed before cleanup");
    assert.ok(auditLogs.every((entry) =>
      Number(entry.user_id) === uploaderId
      && entry.action === "UPLOAD_ARCHIVE"
      && entry.target_table === "archive_records"
      && Number(entry.target_id) === recordId,
    ), "Archive audit-log cleanup scope changed");
    assert.deepEqual(versions.map((version) => Number(version.id)).sort((a, b) => a - b), versionIds.sort((a, b) => a - b), "Archive version set changed before cleanup");
    const databaseKeys = [...new Set([
      ...(record ? [uploadStorage.getStoredFileKey(record.file_url, "archives")] : []),
      ...versions.map((version) => uploadStorage.getStoredFileKey(version.file_url, "archives")),
    ].filter(Boolean))].sort();
    assert.deepEqual(databaseKeys, storageKeys.slice().sort(), "Archive file-key set changed before cleanup");

    if (record && !dryRun) {
      await ArchiveRecord.unscoped().update({ current_version_id: null }, { where: { id: recordId }, transaction });
      await ArchiveAccessLog.destroy({ where: { record_id: recordId }, transaction });
      await ArchiveVersion.destroy({ where: { id: { [Op.in]: versionIds }, record_id: recordId }, transaction });
      const removedRecords = await ArchiveRecord.unscoped().destroy({ where: { id: recordId }, transaction });
      assert.equal(removedRecords, 1, "The exact ArchiveRecord was not deleted");
    } else if (!record) {
      assert.equal(versions.length, 0, "Archive versions remain without the parent record");
      assert.equal(logs.length, 0, "Archive access logs remain without the parent record");
    }
    if (!dryRun && auditLogIds.length) {
      await AuditLog.destroy({ where: { id: { [Op.in]: auditLogIds } }, transaction });
    }
  });

  if (dryRun) {
    console.log(`Validated archive QA cleanup for record ${recordId}; no database or file changes were made.`);
    return;
  }

  for (const key of storageKeys) await uploadStorage.deleteStoredFile(key);
  if (!uploadStorage.s3Enabled) {
    for (const key of storageKeys) {
      const filePath = path.resolve(__dirname, "..", "..", "uploads", key);
      assert.equal(fs.existsSync(filePath), false, `Archive QA file remains after cleanup: ${key}`);
    }
  }

  assert.equal(await ArchiveRecord.unscoped().count({ where: { id: recordId } }), 0, "Archive QA record remains");
  assert.equal(await ArchiveVersion.count({ where: { id: { [Op.in]: versionIds } } }), 0, "Archive QA version remains");
  assert.equal(await ArchiveAccessLog.count({ where: { record_id: recordId } }), 0, "Archive QA access log remains");
  if (auditLogIds.length) assert.equal(await AuditLog.count({ where: { id: { [Op.in]: auditLogIds } } }), 0, "Archive QA audit log remains");
  fs.rmSync(fixturePath, { force: false });
  console.log("Removed only the manifest-verified synthetic archive record, its versions/logs, and its QA upload files.");
};

run()
  .catch((error) => {
    console.error("Archive QA cleanup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
