"use strict";

jest.mock("../src/middlewares/verifyToken", () => (req, res, next) => next());
jest.mock("../src/middlewares/authorize", () => (moduleName, action) => {
  const guard = (req, res, next) => next();
  guard.permission = `${moduleName}:${action}`;
  return guard;
});
jest.mock("../src/controllers/archives.controller", () => new Proxy({}, {
  get: () => jest.fn(),
}));
jest.mock("../src/middlewares/upload-s3", () => ({
  archiveUpload: { single: () => (req, res, next) => next() },
  requireDurableUploadStorage: (req, res, next) => next(),
}));
jest.mock("../src/middlewares/validateQuery", () => () => (req, res, next) => next());

const router = require("../src/routes/archives.routes");

const permissionFor = (path, method) => {
  const layer = router.stack.find((candidate) => candidate.route?.path === path && candidate.route.methods[method]);
  if (!layer) throw new Error(`Missing ${method.toUpperCase()} ${path} route`);
  return layer.route.stack.map((entry) => entry.handle.permission).filter(Boolean);
};

describe("archive route permission contracts", () => {
  test("limits access-log identity data to archive approvers", () => {
    expect(permissionFor("/:id/access-logs", "get")).toEqual(["archives:read", "archives:update"]);
    expect(permissionFor("/:id/logs", "get")).toEqual(["archives:read", "archives:update"]);
  });

  test("keeps category administration behind archive update permission", () => {
    expect(permissionFor("/categories", "post")).toEqual(["archives:update"]);
  });

  test("keeps archive file and version endpoints behind archive read permission", () => {
    expect(permissionFor("/:id/file", "get")).toEqual(["archives:read"]);
    expect(permissionFor("/:id/versions/:versionId/file", "get")).toEqual(["archives:read"]);
    expect(permissionFor("/:id/versions", "get")).toEqual(["archives:read"]);
  });

  test("routes archive and restore through the corresponding archive permissions", () => {
    expect(permissionFor("/:id/archive", "patch")).toEqual(["archives:delete"]);
    expect(permissionFor("/:id/restore", "patch")).toEqual(["archives:update"]);
    expect(router.stack.some((layer) => layer.route?.methods?.delete)).toBe(false);
  });
});
