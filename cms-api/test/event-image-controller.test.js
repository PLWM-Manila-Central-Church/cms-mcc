"use strict";

jest.mock("../src/services/events.service", () => ({ getEventImageKey: jest.fn() }));
jest.mock("../src/middlewares/upload-s3", () => ({ sendStoredFile: jest.fn() }));

const eventsService = require("../src/services/events.service");
const uploadStorage = require("../src/middlewares/upload-s3");
const eventsController = require("../src/controllers/events.controller");

describe("event image visibility rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventsService.getEventImageKey.mockResolvedValue("event-images/18/poster.jpg");
    uploadStorage.sendStoredFile.mockResolvedValue(undefined);
  });

  test("limits Member images to currently visible Upcoming and Ongoing events", async () => {
    await eventsController.getEventImage({ params: { id: "18" }, user: { roleName: "Member" } }, {}, jest.fn());

    expect(eventsService.getEventImageKey).toHaveBeenCalledWith("18", { memberVisibleOnly: true });
    expect(uploadStorage.sendStoredFile).toHaveBeenCalledWith("event-images/18/poster.jpg", {});
  });

  test("keeps staff event-image visibility under the existing event permission", async () => {
    await eventsController.getEventImage({ params: { id: "18" }, user: { roleName: "Pastor" } }, {}, jest.fn());

    expect(eventsService.getEventImageKey).toHaveBeenCalledWith("18", { memberVisibleOnly: false });
  });
});
