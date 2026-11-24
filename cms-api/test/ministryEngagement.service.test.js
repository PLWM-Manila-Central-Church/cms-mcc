"use strict";

jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/models", () => ({
  MinistryGroup: {},
  MinistryActivity: { findAll: jest.fn(), create: jest.fn() },
  MinistryAttendanceResponse: { findAll: jest.fn(), findOrCreate: jest.fn() },
  MinistryActivityAttendance: { findAll: jest.fn(), findOrCreate: jest.fn() },
  MinistryAnnouncement: { findAll: jest.fn(), create: jest.fn() },
  MemberMessage: { findAll: jest.fn(), create: jest.fn() },
  MemberFeedback: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  PastoralVisitation: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  MinistryMembership: { findAll: jest.fn() },
  MinistryRole: {},
  Attendance: { findAll: jest.fn() },
  Member: { findAll: jest.fn(), findByPk: jest.fn() },
  User: {},
}));

const models = require("../src/models");
const engSvc = require("../src/services/ministryEngagement.service");

describe("Phase 5 — Ministry Engagement, RSVP vs Actual Attendance & Portal Care", () => {
  beforeEach(() => jest.clearAllMocks());

  test("submitPortalRsvp saves Yes/No/Maybe + optional decline reason strictly separate from physical attendance", async () => {
    const update = jest.fn();
    models.MinistryAttendanceResponse.findOrCreate.mockResolvedValue([{ id: 3, update }, true]);

    await engSvc.submitPortalRsvp(12, { response: "no", decline_reason: "Work shift" }, { memberId: 55 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ response: "no", decline_reason: "Work shift" }));
    expect(models.MinistryActivityAttendance.findOrCreate).not.toHaveBeenCalled();
  });

  test("recordActivityAttendance deduplicates member check-ins (zero double-counting)", async () => {
    models.MinistryActivityAttendance.findOrCreate
      .mockResolvedValueOnce([{ id: 1 }, true])
      .mockResolvedValueOnce([{ id: 2 }, false]); // already present

    const res = await engSvc.recordActivityAttendance(12, { member_ids: [10, 10, 11], source: "manual" }, { userId: 1 });
    expect(models.MinistryActivityAttendance.findOrCreate).toHaveBeenCalledTimes(2);
    expect(res.recorded_new).toBe(1);
  });

  test("updateVisitationStage validates 5-stage pastoral follow-up enum", async () => {
    const update = jest.fn();
    models.PastoralVisitation.findOne.mockResolvedValue({ id: 4, update });
    await engSvc.updateVisitationStage(4, "visitation_scheduled");
    expect(update).toHaveBeenCalledWith({ care_stage: "visitation_scheduled" });

    await expect(engSvc.updateVisitationStage(4, "invalid_stage")).rejects.toMatchObject({ status: 400 });
  });
});
