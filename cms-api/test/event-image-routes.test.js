"use strict";

const mockExecutedPermissions = [];
jest.mock("../src/middlewares/verifyToken", () => (req, res, next) => next());
jest.mock("../src/middlewares/authorize", () => (moduleName, action) => {
  const guard = (req, res, next) => { mockExecutedPermissions.push(`${moduleName}:${action}`); next(); };
  guard.permission = `${moduleName}:${action}`;
  return guard;
});
jest.mock("../src/middlewares/validate", () => () => (req, res, next) => next());
jest.mock("../src/middlewares/validateQuery", () => () => (req, res, next) => next());
jest.mock("../src/middlewares/upload-s3", () => ({
  eventImageUpload: { single: () => (req, res, next) => next() },
  requireDurableUploadStorage: (req, res, next) => next(),
}));
jest.mock("../src/controllers/events.controller", () => new Proxy({}, { get: () => jest.fn() }));
jest.mock("../src/validators/events.validator", () => ({
  createEventSchema: {}, updateEventSchema: {}, updateEventStatusSchema: {},
  registerMemberSchema: {}, updateRegistrationReservationSchema: {},
  bulkRegisterSchema: {}, getEventsQuerySchema: {},
}));

const router = require("../src/routes/events.routes");
mockExecutedPermissions.length = 0;

describe("Member event image route", () => {
  test("allows the Member role to reach only the event-image visibility check", () => {
    const route = router.stack.find((layer) => layer.route?.path === "/:id/image" && layer.route.methods.get);
    const handlers = route.route.stack.map((entry) => entry.handle);
    const memberGate = handlers[1];
    const next = jest.fn();

    memberGate({ user: { roleName: "Member" } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockExecutedPermissions).toEqual([]);
  });

  test("keeps staff image requests behind events:read", () => {
    const route = router.stack.find((layer) => layer.route?.path === "/:id/image" && layer.route.methods.get);
    const memberGate = route.route.stack[1].handle;
    const next = jest.fn();

    memberGate({ user: { roleName: "Pastor" } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockExecutedPermissions).toContain("events:read");
  });
});
