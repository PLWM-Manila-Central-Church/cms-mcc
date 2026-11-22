"use strict";

const { fillRate, attendanceRate, dayRange, cumulativeSeries } = require("../src/helpers/registrationAnalytics.helper");

test("fill rate never exceeds 100 and is null without capacity", () => {
  expect(fillRate(25, 50)).toBe(50);
  expect(fillRate(120, 100)).toBe(100);
  expect(fillRate(5, 0)).toBeNull();
  expect(fillRate(3, null)).toBeNull();
});

test("attendance rate mirrors the fill rule", () => {
  expect(attendanceRate(80, 100)).toBe(80);
  expect(attendanceRate(2, 0)).toBeNull();
});

test("cumulative series counts each day in range", () => {
  const series = cumulativeSeries(
    [
      { registered_at: "2026-11-01T08:00:00Z" },
      { registered_at: "2026-11-01T09:00:00Z" },
      { registered_at: "2026-11-03T09:00:00Z" },
      { registered_at: "2026-10-31T09:00:00Z" },
    ],
    { from: "2026-11-01", to: "2026-11-03" },
  );

  expect(series).toEqual([
    { date: "2026-11-01", total: 2, cumulative: 2 },
    { date: "2026-11-02", total: 0, cumulative: 2 },
    { date: "2026-11-03", total: 1, cumulative: 3 },
  ]);
  expect(dayRange("2026-11-01", "2026-11-02")).toEqual(["2026-11-01", "2026-11-02"]);
});
