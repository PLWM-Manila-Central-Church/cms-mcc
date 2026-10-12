"use strict";

const dateOnlyInTimezone = require("../src/helpers/dateOnlyInTimezone");

describe("dateOnlyInTimezone", () => {
  test("uses the prior UTC calendar date when Manila has crossed midnight", () => {
    expect(dateOnlyInTimezone(new Date("2026-10-10T18:47:00.000Z"), "Asia/Manila"))
      .toBe("2026-10-11");
  });

  test("keeps the date before the Manila midnight boundary", () => {
    expect(dateOnlyInTimezone(new Date("2026-10-10T15:59:59.999Z"), "Asia/Manila"))
      .toBe("2026-10-10");
    expect(dateOnlyInTimezone(new Date("2026-10-10T16:00:00.000Z"), "Asia/Manila"))
      .toBe("2026-10-11");
  });
});
