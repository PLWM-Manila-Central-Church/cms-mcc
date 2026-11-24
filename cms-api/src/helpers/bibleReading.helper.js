"use strict";

const PLAN = require("../data/bible-reading-2026.json");

const MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

const iso = (year, month, day) => (
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
);

const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const latestSunday = (today) => {
  const value = new Date(`${today}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - value.getUTCDay());
  return value.toISOString().slice(0, 10);
};

const readingDateOnly = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10));

const getMonthDays = (month) => {
  if (!MONTH_PATTERN.test(String(month || ""))) {
    throw new Error("month must be formatted YYYY-MM");
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const readings = PLAN.months[month] || {};

  return Array.from({ length: total }, (_, index) => {
    const date = iso(year, monthNumber, index + 1);
    const entry = readings[date];
    return {
      date,
      day: entry ? entry.day : new Date(`${date}T00:00:00Z`).toLocaleDateString("en-PH", {
        weekday: "short",
        timeZone: "UTC",
      }),
      ot: entry ? entry.ot : null,
      nt: entry ? entry.nt : null,
      ps: entry ? entry.ps : null,
      placeholder: !entry,
    };
  });
};

const getMonthTarget = (month) => getMonthDays(month).filter((day) => !day.placeholder).length;

const getTodayReading = (date) => (PLAN.months[String(date).slice(0, 7)] || {})[date] || null;

const resolveMemoryVerse = ({ today, groupId, verses = [] }) => {
  const currentSunday = latestSunday(today);
  const upcomingSunday = addDays(currentSunday, 7);
  const belongs = (verse, sunday) => (
    Number(verse.group_id) === Number(groupId) && readingDateOnly(verse.sunday_date) === sunday
  );

  return {
    latestSunday: currentSunday,
    upcomingSunday,
    verse: verses.find((item) => belongs(item, upcomingSunday)) || null,
    thisSundayVerse: verses.find((item) => belongs(item, currentSunday)) || null,
  };
};

const summarizeMonth = ({ members = [], progress = [], month }) => {
  const target = getMonthTarget(month);
  const completedByMember = new Map();

  for (const row of progress) {
    if (readingDateOnly(row.reading_date).slice(0, 7) !== month) continue;
    const memberId = Number(row.member_id);
    completedByMember.set(memberId, (completedByMember.get(memberId) || 0) + 1);
  }

  return members.map((member) => {
    const completed = completedByMember.get(Number(member.id)) || 0;
    const percent = target > 0 ? Math.round((completed / target) * 100) : 0;
    return {
      member_id: Number(member.id),
      name: [member.first_name, member.last_name].filter(Boolean).join(" ") || "Member",
      group: member.group_name || null,
      group_id: member.group_id || null,
      cell_group: member.cell_group_name || null,
      cell_group_id: member.cell_group_id || null,
      completed,
      target,
      percent,
      finished: target > 0 && completed >= target,
    };
  });
};

module.exports = {
  MONTH_PATTERN,
  readingDateOnly,
  getMonthDays,
  getMonthTarget,
  getTodayReading,
  latestSunday,
  resolveMemoryVerse,
  summarizeMonth,
};
