"use strict";

jest.mock("../src/config/db", () => ({}));
jest.mock("../src/models", () => ({
  Event: { findOne: jest.fn() },
  EventCategory: {}, EventRegistration: {}, Member: {}, User: {}, CellGroup: {}, Group: {},
}));
jest.mock("../src/helpers/scopedLeader.helper", () => ({ getMemberScopeWhere: jest.fn() }));
jest.mock("../src/helpers/eventRegistrationReservation.helper", () => ({
  assertEventReservationLimits: jest.fn(), registerEventMember: jest.fn(), updateEventRegistrationReservation: jest.fn(),
}));
jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({}));

const { Event } = require("../src/models");
const eventsService = require("../src/services/events.service");

describe("event image member visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Event.findOne.mockResolvedValue({ id: 18, image_key: "event-images/18/poster.jpg" });
  });

  test("restricts Member image reads to events currently announced to members", async () => {
    await expect(eventsService.getEventImageKey(18, { memberVisibleOnly: true }))
      .resolves.toBe("event-images/18/poster.jpg");

    expect(Event.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        is_deleted: 0,
        status: { [require("sequelize").Op.in]: ["Upcoming", "Ongoing"] },
      }),
      attributes: ["id", "image_key"],
    }));
  });

  test("keeps existing staff image access from filtering by member publication status", async () => {
    await expect(eventsService.getEventImageKey(18)).resolves.toBe("event-images/18/poster.jpg");
    expect(Event.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 18, is_deleted: 0 },
    }));
  });
});
