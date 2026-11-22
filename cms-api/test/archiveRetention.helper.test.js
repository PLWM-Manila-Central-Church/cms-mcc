"use strict";

const {
  RETENTION_DAYS,
  AUTO_PURGE_SYSTEM_TYPES,
  PROTECTED_SYSTEM_TYPES,
  computePurgeAfter,
  daysRemaining,
  retentionState,
  decorateRetention,
  systemRetentionState,
} = require("../src/helpers/archiveRetention.helper");

describe("archive retention window", () => {
  test("purge is scheduled exactly 60 days after archiving", () => {
    expect(computePurgeAfter("2026-01-01T00:00:00Z").toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(RETENTION_DAYS).toBe(60);
  });

  test("days remaining counts down and reaches due", () => {
    expect(daysRemaining("2026-02-10T00:00:00Z", new Date("2026-02-01T00:00:00Z"))).toBe(9);
    expect(daysRemaining("2026-02-01T00:00:00Z", new Date("2026-02-01T00:00:01Z"))).toBe(0);
    expect(daysRemaining("2026-02-01T00:00:00Z", new Date("2026-03-01T00:00:00Z"))).toBeLessThan(0);
  });
});

describe("retention state", () => {
  test("active, scheduled, due and held", () => {
    expect(retentionState({ archived: false })).toBe("active");
    expect(retentionState({ purgeAfter: "2026-03-01T00:00:00Z", now: new Date("2026-02-01T00:00:00Z") })).toBe("scheduled");
    expect(retentionState({ purgeAfter: "2026-02-01T00:00:00Z", now: new Date("2026-02-02T00:00:00Z") })).toBe("due");
    expect(retentionState({ purgeAfter: "2026-02-01T00:00:00Z", hold: true })).toBe("held");
  });

  test("decorates an archived record for the API", () => {
    const decorated = decorateRetention({
      id: 7, is_deleted: 1, purge_after: "2026-03-01T00:00:00Z", retention_hold: 0,
    }, new Date("2026-02-01T00:00:00Z"));

    expect(decorated).toMatchObject({ days_remaining: 28, retention: "scheduled", retention_hold: false });
  });

  test("system rows use the same window from their deleted_at", () => {
    expect(systemRetentionState("2026-01-31T00:00:00Z", new Date("2026-02-01T00:00:00Z")))
      .toEqual({ days_remaining: 59, retention: "scheduled" });
  });
});

describe("what may be auto-purged", () => {
  test("secondary retained rows are included", () => {
    expect(AUTO_PURGE_SYSTEM_TYPES).toContain("notifications");
    expect(AUTO_PURGE_SYSTEM_TYPES).toContain("attendance_batch_items");
  });

  test("people, money and core records are protected", () => {
    for (const type of ["users", "members", "finance_records", "events", "services", "attendance_records"]) {
      expect(PROTECTED_SYSTEM_TYPES).toContain(type);
      expect(AUTO_PURGE_SYSTEM_TYPES).not.toContain(type);
    }
  });
});
