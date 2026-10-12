"use strict";

const { EventAttendance } = require("../src/modules/qr-attendance/models");

describe("EventAttendance model compatibility", () => {
  test("retains the live schema's legacy leader_batch method while tracking current provenance separately", () => {
    const methodType = EventAttendance.rawAttributes.check_in_method.type;

    expect(methodType.key).toBe("ENUM");
    expect(methodType.values).toEqual(["qr", "manual", "leader_batch"]);
    expect(EventAttendance.rawAttributes.entry_source.type.values).toEqual(["direct", "leader_batch"]);
  });
});
