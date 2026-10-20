"use strict";

jest.mock("../src/middlewares/verifyToken", () => (req, res, next) => next());
jest.mock("../src/middlewares/authorize", () => (moduleName, action) => {
  const guard = (req, res, next) => next();
  guard.permission = `${moduleName}:${action}`;
  return guard;
});
jest.mock("../src/middlewares/validateQuery", () => () => (req, res, next) => next());
jest.mock("../src/controllers/reports.controller", () => new Proxy({}, { get: () => jest.fn() }));
jest.mock("../src/controllers/analytics.controller", () => new Proxy({}, { get: () => jest.fn() }));
jest.mock("../src/validators/analytics.validator", () => ({}));

const router = require("../src/routes/reports.routes");

const permissionFor = (path, method) => {
  const layer = router.stack.find((candidate) => candidate.route?.path === path && candidate.route.methods[method]);
  if (!layer) throw new Error(`Missing ${method.toUpperCase()} ${path} route`);
  return layer.route.stack.map((entry) => entry.handle.permission).filter(Boolean);
};

describe("analytics report route permissions", () => {
  test("keeps consolidated analytics behind dashboard read", () => {
    expect(permissionFor("/analytics", "get")).toEqual(["dashboard:read"]);
  });

  test("requires attendance read for leader team reports", () => {
    expect(permissionFor("/team-attendance", "get")).toEqual(["attendance:read"]);
  });
});
