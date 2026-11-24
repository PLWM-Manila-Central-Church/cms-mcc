"use strict";

const { Op } = require("sequelize");
const {
  MONTH_PATTERN,
  readingDateOnly,
  BibleReadingProgress,
  GroupMemoryVerse,
  Member,
  MinistryGroup,
  CellGroup,
} = require("../models");
const AppError = require("../helpers/AppError");
const {
  getMonthDays,
  getMonthTarget,
  getTodayReading,
  resolveMemoryVerse,
  summarizeMonth,
} = require("../helpers/bibleReading.helper");

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const plain = (row) => (row && typeof row.get === "function" ? row.get({ plain: true }) : row);

const manilaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

// Keep the query bounds valid for TiDB/MySQL DATE columns. An upper bound like
// YYYY-MM-31 is invalid for most months and can silently omit saved readings.
const monthRange = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(lastDay).padStart(2, "0")}`];
};

const groupNameFor = async (groupId) => {
  if (!groupId) return null;
  const group = await MinistryGroup.findByPk(groupId, { attributes: ["id", "name"] });
  return group ? plain(group).name : null;
};

exports.getMyMonth = async (memberId, month) => {
  if (!MONTH_PATTERN.test(String(month || ""))) {
    throw AppError.badRequest("VALIDATION_ERROR", "month must be formatted YYYY-MM");
  }

  const member = plain(await Member.findByPk(memberId, { attributes: ["id", "group_id"] }));
  const progress = await BibleReadingProgress.findAll({
    where: { member_id: memberId, reading_date: { [Op.between]: monthRange(month) } },
    attributes: ["reading_date"],
  });
  const completed = progress.map((row) => readingDateOnly(plain(row).reading_date));
  const target = getMonthTarget(month);
  const verses = (await GroupMemoryVerse.findAll()).map(plain);
  const memory = resolveMemoryVerse({ today: manilaToday(), groupId: member?.group_id, verses });

  return {
    month,
    today: manilaToday(),
    days: getMonthDays(month),
    target,
    completed,
    count: completed.length,
    percent: target > 0 ? Math.round((completed.length / target) * 100) : 0,
    group: await groupNameFor(member?.group_id),
    memoryVerse: memory,
  };
};

exports.toggleDay = async (memberId, date) => {
  if (!DATE.test(String(date || ""))) {
    throw AppError.badRequest("VALIDATION_ERROR", "date must be formatted YYYY-MM-DD");
  }
  if (!getTodayReading(date)) {
    throw AppError.badRequest("READING_NOT_PUBLISHED", "That reading is not part of the published plan.");
  }
  if (date > manilaToday()) {
    throw AppError.badRequest("READING_IN_FUTURE", "You can only mark a reading for today or an earlier day.");
  }

  const existing = await BibleReadingProgress.findOne({
    where: { member_id: memberId, reading_date: date },
  });
  if (existing) {
    await existing.destroy();
    return { date, completed: false };
  }

  await BibleReadingProgress.create({
    member_id: memberId,
    reading_date: date,
    completed_at: new Date(),
  });
  return { date, completed: true };
};

exports.getMemoryVerse = async (memberId) => {
  const member = plain(await Member.findByPk(memberId, { attributes: ["id", "group_id"] }));
  const verses = (await GroupMemoryVerse.findAll()).map(plain);
  const memory = resolveMemoryVerse({ today: manilaToday(), groupId: member?.group_id, verses });
  return { today: manilaToday(), group: await groupNameFor(member?.group_id), ...memory };
};

exports.getSummary = async (month, options = {}) => {
  if (!MONTH_PATTERN.test(String(month || ""))) {
    throw AppError.badRequest("VALIDATION_ERROR", "month must be formatted YYYY-MM");
  }
  const memberWhere = { is_deleted: 0, status: "Active" };
  if (options.group_id) memberWhere.group_id = Number(options.group_id);
  if (options.cell_group_id) memberWhere.cell_group_id = Number(options.cell_group_id);
  const members = (
    await Member.findAll({
      where: memberWhere,
      attributes: ["id", "first_name", "last_name", "group_id", "cell_group_id"],
      include: [
        { model: MinistryGroup, as: "group", attributes: ["id", "name"], required: false },
        { model: CellGroup, as: "cellGroup", attributes: ["id", "name"], required: false },
      ],
    })
  ).map(plain);
  const progress = (
    await BibleReadingProgress.findAll({
      where: { reading_date: { [Op.between]: monthRange(month) } },
      attributes: ["member_id", "reading_date"],
    })
  ).map(plain);

  let rows = summarizeMonth({
    members: members.map((member) => ({
      ...member,
      group_name: member.group?.name || null,
      cell_group_name: member.cellGroup?.name || null,
    })),
    progress,
    month,
  });
  const totalMembers = rows.length;
  const finished = rows.filter((row) => row.finished).length;

  const q = String(options.search || "").trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => String(row.name || "").toLowerCase().includes(q));
  }
  if (options.status === "finished") {
    rows = rows.filter((row) => row.finished);
  } else if (options.status === "in_progress") {
    rows = rows.filter((row) => !row.finished);
  }

  rows.sort((left, right) => right.completed - left.completed || left.name.localeCompare(right.name));
  const filteredTotal = rows.length;

  let page = 1;
  let totalPages = 1;
  let pagedRows = rows;
  if (options.page !== undefined) {
    page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 25));
    totalPages = Math.max(1, Math.ceil(filteredTotal / limit));
    const offset = (page - 1) * limit;
    pagedRows = rows.slice(offset, offset + limit);
  }

  return {
    month,
    target: getMonthTarget(month),
    members: pagedRows,
    total: totalMembers,
    filtered_total: filteredTotal,
    page,
    total_pages: totalPages,
    finished,
  };
};

exports.listVerses = async (month) => {
  if (!MONTH_PATTERN.test(String(month || ""))) {
    throw AppError.badRequest("VALIDATION_ERROR", "month must be formatted YYYY-MM");
  }
  const rows = await GroupMemoryVerse.findAll({
    where: { sunday_date: { [Op.between]: monthRange(month) } },
    include: [{ model: MinistryGroup, as: "group", attributes: ["id", "name"], required: false }],
    order: [["sunday_date", "ASC"]],
  });
  return rows.map((row) => {
    const value = plain(row);
    return {
      id: value.id,
      group_id: value.group_id,
      group: value.group?.name || null,
      sunday_date: readingDateOnly(value.sunday_date),
      reference: value.reference,
      verse_text: value.verse_text,
    };
  });
};

exports.saveVerse = async ({ groupId, sundayDate, reference, verseText }, userId) => {
  if (!groupId || !sundayDate || !reference || !verseText) {
    throw AppError.badRequest("VALIDATION_ERROR", "Group, Sunday, reference and verse text are required.");
  }
  if (new Date(`${sundayDate}T00:00:00Z`).getUTCDay() !== 0) {
    throw AppError.badRequest("VALIDATION_ERROR", "Memory verses are assigned to a Sunday.");
  }

  const existing = await GroupMemoryVerse.findOne({
    where: { group_id: groupId, sunday_date: sundayDate },
  });
  if (existing) {
    await existing.update({ reference, verse_text: verseText, created_by: userId });
    return plain(existing);
  }
  return plain(await GroupMemoryVerse.create({
    group_id: groupId,
    sunday_date: sundayDate,
    reference,
    verse_text: verseText,
    created_by: userId,
  }));
};

exports.deleteVerse = async (id) => {
  const verse = await GroupMemoryVerse.findByPk(id);
  if (!verse) throw AppError.notFound("RECORD_NOT_FOUND", "Memory verse not found.");
  await verse.destroy();
  return { id: Number(id) };
};
