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
const rejectHardDelete = require("../src/middlewares/rejectHardDelete");
const app = express();
app.use(rejectHardDelete);
app.use("/finance", require("../src/routes/finance.routes"));

test.each(["expenses", "expenses/12", "expenses/summary", "expense-categories", "accounts", "funds", "balance"])("restores %s as a readable finance endpoint", async (path) => {
  const response = await request(app).get(`/finance/${path}`);
  expect(response.status).toBe(200);
});

test("retains received-income endpoints alongside expenses", async () => {
  expect((await request(app).get("/finance/records")).status).toBe(200);
  expect((await request(app).get("/finance/summary")).status).toBe(200);
});

test.each(["expenses/12", "expense-categories/12", "accounts/12", "funds/12"])("does not reintroduce hard-delete route %s", async (path) => {
  const response = await request(app).delete(`/finance/${path}`);
  expect(response.status).toBe(405);
  expect(response.body.code).toBe("HARD_DELETE_DISABLED");
});
