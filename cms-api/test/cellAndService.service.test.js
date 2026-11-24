"use strict";

jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/models", () => ({
  CellGroup: { findAll: jest.fn() },
  CellGroupMeeting: { findAll: jest.fn(), create: jest.fn(), findOne: jest.fn() },
  CellGroupMeetingAttendance: { findOrCreate: jest.fn() },
  Service: { findOne: jest.fn(), create: jest.fn() },
  ServiceRecurrenceRule: { findAll: jest.fn(), create: jest.fn(), findOne: jest.fn() },
  ServiceProgramItem: { findAll: jest.fn(), create: jest.fn(), findOne: jest.fn() },
  MinistryAssignment: { findAll: jest.fn(), findByPk: jest.fn() },
  MinistryRole: {},
  Member: {},
}));

const models = require("../src/models");
const cellMeetings = require("../src/services/cellMeetings.service");
const servicePrograms = require("../src/services/servicePrograms.service");

describe("Phase 6 — Cell Group Meetings & Service Programs / Conflict Detection", () => {
  beforeEach(() => jest.clearAllMocks());

  test("getCellGroupHealthAlerts identifies leaderless and quiet cell groups", async () => {
    models.CellGroup.findAll.mockResolvedValue([
      { id: 1, name: "Lakefront A", area: "South", leader_user_id: 2 },
      { id: 2, name: "Eastbrook", area: "East", leader_user_id: null },
    ]);
    models.CellGroupMeeting.findAll.mockResolvedValue([{ cell_group_id: 1 }]);

    const res = await cellMeetings.getCellGroupHealthAlerts();
    expect(res.leaderless_count).toBe(1);
    expect(res.quiet_30d_count).toBe(1);
    expect(res.quiet_30d[0].name).toBe("Eastbrook");
  });

  test("getServiceServantsWithConflicts flags double-booked members in the same service", async () => {
    models.MinistryAssignment.findAll.mockResolvedValue([
      { toJSON: () => ({ id: 1, member_id: 10, confirmation_status: "confirmed", confirmed: 1 }) },
      { toJSON: () => ({ id: 2, member_id: 10, confirmation_status: "pending", confirmed: 0 }) },
      { toJSON: () => ({ id: 3, member_id: 20, confirmation_status: "confirmed", confirmed: 1 }) },
    ]);

    const res = await servicePrograms.getServiceServantsWithConflicts(5);
    expect(res.conflict_member_ids).toEqual([10]);
    expect(res.assignments[0].has_conflict).toBe(true);
    expect(res.assignments[2].has_conflict).toBe(false);
    expect(res.summary).toEqual({ total: 3, confirmed: 2, pending: 1, declined: 0 });
  });

  test("generateFromRule generates weekly draft services while skipping existing duplicates", async () => {
    models.ServiceRecurrenceRule.findOne.mockResolvedValue({
      id: 3, title: "Lord's Day Service", gathering_type: "lords_day", day_of_week: 0, start_time: "09:00:00", venue: "Sanctuary",
    });
    models.Service.findOne
      .mockResolvedValueOnce({ id: 99 }) // week 1 exists -> skip
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    models.Service.create.mockResolvedValue({ id: 100 });

    const res = await servicePrograms.generateFromRule(3, 3, { userId: 1 });
    expect(res.generated_count).toBe(2);
    expect(models.Service.create).toHaveBeenCalledTimes(2);
  });
});
