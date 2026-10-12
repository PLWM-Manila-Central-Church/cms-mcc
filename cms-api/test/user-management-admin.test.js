"use strict";

const express = require("express");
const request = require("supertest");
jest.mock("../src/middlewares/verifyToken", () => (req, res, next) => {
  req.user = { roleName: req.get("x-test-role"), userId: 1 };
  next();
});
// Simulate a mistaken database grant. The independent admin boundary must
// still prevent account listing, privilege escalation and account removal.
jest.mock("../src/middlewares/authorize", () => () => (req, res, next) => next());
jest.mock("../src/middlewares/validate", () => () => (req, res, next) => next());
jest.mock("../src/controllers/users.controller", () => new Proxy({}, {
  get: () => (_req, res) => res.json({ success: true }),
}));
const app = express();
app.use("/users", require("../src/routes/users.routes"));

test.each(["Registration Team", "Pastor", "Finance Team", "Member", "Leader", "Cell Group Leader", "Group Leader", "Ministry Leader"])(
  "%s cannot manage accounts even with an accidental permission grant", async (role) => {
    for (const [method, url] of [["get", "/users"], ["post", "/users"], ["put", "/users/2"], ["put", "/users/2/deactivate"], ["delete", "/users/2"]]) {
      expect((await request(app)[method](url).set("x-test-role", role)).status).toBe(403);
    }
  },
);
test("System Admin retains account management access", async () => {
  expect((await request(app).get("/users").set("x-test-role", "System Admin")).status).toBe(200);
});
