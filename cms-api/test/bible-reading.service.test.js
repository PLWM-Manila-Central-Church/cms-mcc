"use strict";

jest.mock("../src/models", () => ({
  BibleReadingProgress: { findAll: jest.fn() },
  GroupMemoryVerse: { findAll: jest.fn() },
  Member: { findAll: jest.fn(), findByPk: jest.fn() },
  MinistryGroup: {},
  CellGroup: {},
}));

const { Op } = require("sequelize");
const { BibleReadingProgress, GroupMemoryVerse, Member } = require("../src/models");
const { getMyMonth, getSummary, listVerses } = require("../src/services/bibleReading.service");

test("portal and monitor count the same stored reading through the last day of November", async () => {
  const member = { id: 7, first_name: "Ana", last_name: "Reyes" };
  Member.findByPk.mockResolvedValue(member);
  Member.findAll.mockResolvedValue([member]);
  BibleReadingProgress.findAll.mockResolvedValue([{ member_id: 7, reading_date: new Date("2026-11-30T00:00:00Z") }]);
  GroupMemoryVerse.findAll.mockResolvedValue([{ id: 1, sunday_date: new Date("2026-11-29T00:00:00Z") }]);
  expect((await getMyMonth(7, "2026-11")).completed).toEqual(["2026-11-30"]);
  expect((await getSummary("2026-11")).members[0].completed).toBe(1);
  expect((await listVerses("2026-11"))[0].sunday_date).toBe("2026-11-29");
  for (const [query] of BibleReadingProgress.findAll.mock.calls)
    expect(query.where.reading_date[Op.between]).toEqual(["2026-11-01", "2026-11-30"]);
});
