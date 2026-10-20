"use strict";

jest.mock("../src/middlewares/verifyToken", () => (req, _res, next) => { req.user = { userId: 1, roleName: "Finance Team" }; next(); });
jest.mock("../src/middlewares/authorize", () => () => (_req, _res, next) => next());
jest.mock("../src/controllers/finance.controller", () => new Proxy({}, { get: () => (_req, res) => res.json({ success: true }) }));
jest.mock("../src/middlewares/upload-s3", () => ({
  receiptUpload: { single: () => (_req, _res, next) => next() },
  requireDurableUploadStorage: (_req, _res, next) => next(),
}));

const express = require("express");
const request = require("supertest");
const app = express();
app.use("/finance", require("../src/routes/finance.routes"));

test.each(["expenses", "expenses/12", "expense-categories", "accounts", "funds", "balance"])("retires %s for reads and writes without reaching financial handlers", async (path) => {
  for (const method of ["get", "post", "put", "delete"]) {
    const response = await request(app)[method](`/finance/${path}`);
    expect(response.status).toBe(410);
    expect(response.body.code).toBe("FEATURE_RETIRED");
  }
});

test("retains received-income endpoints", async () => {
  expect((await request(app).get("/finance/records")).status).toBe(200);
  expect((await request(app).get("/finance/summary")).status).toBe(200);
});
