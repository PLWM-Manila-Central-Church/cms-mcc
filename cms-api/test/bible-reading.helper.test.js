"use strict";

const {
  getMonthDays,
  getMonthTarget,
  latestSunday,
  resolveMemoryVerse,
  summarizeMonth,
} = require("../src/helpers/bibleReading.helper");

describe("bible reading plan", () => {
  test("returns a full published month with the sheet readings", () => {
    const days = getMonthDays("2026-02");
    expect(days).toHaveLength(28);
    expect(days.every((day) => day.placeholder === false)).toBe(true);
    expect(days[0]).toMatchObject({ date: "2026-02-01", ot: "Ex13/14", nt: "Mark4", ps: "Ps37" });
    expect(getMonthTarget("2026-02")).toBe(28);
  });

  test("publishes every day in 2026 with the source year-end reading", () => {
    const year = Array.from({ length: 12 }, (_, i) => getMonthDays(`2026-${String(i + 1).padStart(2, "0")}`)).flat();
    expect(year).toHaveLength(365);
    expect(year.every(({ ot, nt, ps, placeholder }) => !placeholder && ot && nt && ps)).toBe(true);
    expect(year.at(-1)).toMatchObject({ date: "2026-12-31", ot: "Mal3/4", nt: "Rev22", ps: "Prov31" });
  });

  test("leaves months outside the published plan as placeholders", () => {
    const days = getMonthDays("2027-08");
    expect(days).toHaveLength(31);
    expect(days.every((day) => day.placeholder === true)).toBe(true);
    expect(days[0].ot).toBeNull();
    expect(getMonthTarget("2027-08")).toBe(0);
  });

  test("rejects a malformed month", () => {
    expect(() => getMonthDays("2026-8")).toThrow("YYYY-MM");
  });
});

describe("memory verse resolution", () => {
  const verses = [
    { group_id: 2, sunday_date: "2026-03-01", reference: "Psalm 23", verse_text: "The LORD is my shepherd." },
    { group_id: 2, sunday_date: "2026-03-08", reference: "John 3:16", verse_text: "For God so loved the world." },
    { group_id: 3, sunday_date: "2026-03-08", reference: "Romans 8:28", verse_text: "All things work together." },
  ];

  test("shows next Sunday's verse after the latest Sunday, only for the member's group", () => {
    const result = resolveMemoryVerse({ today: "2026-03-03", groupId: 2, verses });
    expect(result.latestSunday).toBe("2026-03-01");
    expect(result.upcomingSunday).toBe("2026-03-08");
    expect(result.verse.reference).toBe("John 3:16");
    expect(result.thisSundayVerse.reference).toBe("Psalm 23");
  });

  test("does not borrow another group's verse", () => {
    const result = resolveMemoryVerse({ today: "2026-03-03", groupId: 9, verses });
    expect(result.verse).toBeNull();
  });

  test("a Sunday is still the latest Sunday on the day itself", () => {
    expect(latestSunday("2026-03-08")).toBe("2026-03-08");
  });
});

describe("monthly summary", () => {
  test("counts only the requested month and flags finished members", () => {
    const rows = summarizeMonth({
      month: "2026-02",
      members: [
        { id: 1, first_name: "Ana", last_name: "Cruz" },
        { id: 2, first_name: "Ben", last_name: "Reyes" },
      ],
      progress: [
        ...Array.from({ length: 28 }, (_, i) => ({ member_id: 1, reading_date: `2026-02-${String(i + 1).padStart(2, "0")}` })),
        { member_id: 2, reading_date: new Date("2026-02-01T00:00:00Z") },
        { member_id: 2, reading_date: new Date("2026-03-01T00:00:00Z") },
      ],
    });

    expect(rows[0]).toMatchObject({ name: "Ana Cruz", completed: 28, target: 28, percent: 100, finished: true });
    expect(rows[1]).toMatchObject({ name: "Ben Reyes", completed: 1, target: 28, percent: 4, finished: false });
  });
});
