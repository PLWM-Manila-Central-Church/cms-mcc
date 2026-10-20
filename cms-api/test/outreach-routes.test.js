"use strict";
const express = require("express");
const request = require("supertest");
jest.mock("../src/middlewares/verifyToken", () => (req, res, next) => {
  if (!req.get("x-test-role")) return res.status(401).json({ message: "No token provided" });
  req.user = { roleName: req.get("x-test-role"), userId: 1, memberId: 5 }; next();
});
jest.mock("../src/middlewares/authorize", () => () => (_req, _res, next) => next());
jest.mock("../src/modules/outreach/readiness", () => ({ readiness: jest.fn().mockResolvedValue(true), requireSchema: (_req, _res, next) => next() }));
jest.mock("../src/modules/outreach/configuration", () => ({
  getConfiguration: jest.fn().mockResolvedValue({ enabled: false, mode: "disabled" }),
  saveConfiguration: jest.fn(), transportState: () => ({ sms_delivery_enabled: false, provider_configured: false }),
}));
jest.mock("../src/modules/outreach/repository", () => ({
  overview: jest.fn().mockResolvedValue({ followups: {}, deliveries: {} }),
  getPreference: jest.fn().mockResolvedValue({ sms_enabled: false }),
  setPreference: jest.fn().mockResolvedValue({ sms_enabled: false }), listMembers: jest.fn(),
}));
jest.mock("../src/modules/outreach/evaluation", () => ({ evaluatePage: jest.fn(), historyForMembers: jest.fn() }));
jest.mock("../src/modules/outreach/dispatcher", () => ({ processQueue: jest.fn(), retryDelivery: jest.fn() }));
const repo = require("../src/modules/outreach/repository");
const app = express();
app.use(express.json());
app.use("/api/outreach", require("../src/modules/outreach/routes"));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ code: error.code, message: error.message }));
beforeEach(() => jest.clearAllMocks());
test("outreach requires an authenticated account", async () => expect((await request(app).get("/api/outreach/overview")).status).toBe(401));
test.each(["Finance Team", "Member", "Unknown"])("%s cannot read staff cases or delivery history", async (role) => {
  expect((await request(app).get("/api/outreach/overview").set("x-test-role", role)).status).toBe(403);
  expect((await request(app).get("/api/outreach/deliveries").set("x-test-role", role)).status).toBe(403);
});
test.each(["System Admin", "Pastor", "Registration Team", "Cell Group Leader", "Group Leader", "Ministry Leader", "Leader"])("%s enters scoped outreach reads", async (role) => {
  expect((await request(app).get("/api/outreach/overview").set("x-test-role", role)).status).toBe(200);
});
test("a linked member manages only the self preference endpoint", async () => {
  expect((await request(app).get("/api/outreach/me/preferences").set("x-test-role", "Member")).status).toBe(200);
  expect(repo.getPreference).toHaveBeenCalledWith(5, expect.objectContaining({ memberId: 5 }), { self: true });
  expect((await request(app).get("/api/outreach/members/9/preferences").set("x-test-role", "Member")).status).toBe(403);
});
test("staff roles with a linked Member may manage their own consent without staff outreach access", async () => {
  expect((await request(app).get("/api/outreach/me/preferences").set("x-test-role", "Finance Team")).status).toBe(200);
});
test.each(["Pastor", "Cell Group Leader", "Leader"])("%s cannot configure or process the global queue", async (role) => {
  expect((await request(app).put("/api/outreach/configuration").set("x-test-role", role).send({ enabled: true })).status).toBe(403);
  expect((await request(app).post("/api/outreach/process").set("x-test-role", role).send({})).status).toBe(403);
});
test("rejects caller-supplied evaluation clocks and arbitrary fields", async () => {
  expect((await request(app).post("/api/outreach/evaluate").set("x-test-role", "System Admin").send({ now: "2099-01-01" })).status).toBe(400);
  expect((await request(app).put("/api/outreach/me/preferences").set("x-test-role", "Member")
    .send({ member_id: 9, sms_enabled: false, activity_reminders: true, attendance_followups: true })).status).toBe(400);
});
test("scheduler endpoint is closed when no strong secret is configured", async () => {
  delete process.env.OUTREACH_JOB_TOKEN;
  expect((await request(app).post("/api/outreach/jobs/run").send({})).status).toBe(403);
});

test("scheduler rejects an equal-character-length multibyte token without a server error", async () => {
  process.env.OUTREACH_JOB_TOKEN = "a".repeat(32);
  try {
    expect((await request(app).post("/api/outreach/jobs/run").set("Authorization", "Bearer " + "é".repeat(32)).send({})).status).toBe(403);
  } finally { delete process.env.OUTREACH_JOB_TOKEN; }
});
