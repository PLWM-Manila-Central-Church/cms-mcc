"use strict";

const { readFileSync } = require("node:fs");
const { parse } = require("csv-parse/sync");
const { Op } = require("sequelize");
const sequelize = require("../src/config/db");
const { Event, Service, EventRegistration, Attendance, ServiceResponse, User } = require("../src/models");
const { QrAttendanceSession } = require("../src/modules/qr-attendance/models");
const { isSafeQrTestTarget } = require("./qr-test-target");

async function main() {
  const filename = process.argv[2];
  const apply = process.argv.includes("--apply");
  const actor = Number(process.env.CALENDAR_ACTOR_ID);
  if (!filename) throw new Error("Pass the calendar preview CSV path.");
  if (apply && !isSafeQrTestTarget() && process.env.CALENDAR_CONFIRM_DATABASE !== sequelize.config.database) {
    throw new Error("Review the preview and set CALENDAR_CONFIRM_DATABASE to the target database before applying.");
  }
  if (apply && (!actor || !await User.findOne({ where: { id: actor, is_active: 1, is_deleted: 0 } }))) {
    throw new Error("An active CALENDAR_ACTOR_ID is required.");
  }
  const rows = parse(readFileSync(filename), { bom: true, columns: true, skip_empty_lines: true });
  const keys = new Set();
  for (const row of rows) {
    const source = row["Source cell"];
    const title = (row.Title || row["Workbook entry"]).trim();
    const start = row["Start date"];
    const end = row["End date"];
    const time = row["Manila time"] || null;
    const type = row["Proposed record type"];
    const action = (row.Action || "").trim().toLowerCase();
    if (!/^December![B-H]\d+$/.test(source) || keys.has(source) || !title || title.length > 150 ||
      !/^202[67]-\d{2}-\d{2}$/.test(start) || !/^202[67]-\d{2}-\d{2}$/.test(end) || end < start ||
      (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || !["Event", "Service"].includes(type)) {
      throw new Error("Invalid calendar row: " + source);
    }
    keys.add(source);
    const key = "December-2026.xlsx:" + source;
    const isService = type === "Service";
    const Model = isService ? Service : Event;
    const keyField = isService ? "service_date" : "start_date";
    const values = isService
      ? { title, service_date: start, service_time: time, ...(row.Location ? { venue: row.Location } : {}), gathering_type: title.includes("Wednesday") ? "wednesday_service" : "lords_day" }
      : { title, start_date: start, end_date: end, start_time: time, ...(row.Location ? { location: row.Location } : {}) };
    const review = async (transaction) => {
      const options = transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {};
      const matching = await Model.findAll({
        where: { is_deleted: 0, [Op.or]: [{ calendar_source_key: key }, { title, [keyField]: start }] }, ...options,
      });
      const existingId = Number(row["Existing ID"]);
      if (action === "update" && existingId && !matching.some((item) => Number(item.id) === existingId)) {
        const selected = await Model.findOne({ where: { id: existingId, is_deleted: 0 }, ...options });
        if (selected) matching.push(selected);
      }
      if (matching.length > 1) return "conflicting matches";
      const existing = matching[0];
      if (!apply || action === "skip" || !action) return existing ? "review existing #" + existing.id : "review new draft";
      if (action === "create" && existing?.calendar_source_key === key) return "already imported #" + existing.id;
      if (action === "create" && !existing) {
        await Model.create({ ...values, calendar_source_key: key,
          ...(isService ? { status: "draft" } : { lifecycle_status: "draft", created_by: actor }) }, { transaction });
        return "created draft";
      }
      if (!existing || (action === "create" && existing.calendar_source_key !== key) || (action !== "create" && action !== "update")) {
        return "review action or match";
      }
      if (String(existing[keyField]) !== start || (isService ? String(existing.service_time || "").slice(0, 5) !== (time || "") :
        String(existing.end_date || existing.start_date) !== end || String(existing.start_time || "").slice(0, 5) !== (time || ""))) {
        const id = existing.id;
        const counts = await Promise.all([
          isService ? Attendance.count({ where: { service_id: id }, transaction }) : EventRegistration.count({ where: { event_id: id }, transaction }),
          isService ? ServiceResponse.count({ where: { service_id: id }, transaction }) : Service.count({ where: { event_id: id }, transaction }),
          QrAttendanceSession.count({ where: { [isService ? "service_id" : "event_id"]: id }, transaction }),
        ]);
        if (counts.some(Boolean)) return "date or time change has linked activity";
      }
      await existing.update({ ...values, calendar_source_key: key }, { transaction });
      return "updated #" + existing.id;
    };
    const result = apply ? await sequelize.transaction(review) : await review();
    console.log(JSON.stringify({ source, title, start, end, time, type, result }));
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
