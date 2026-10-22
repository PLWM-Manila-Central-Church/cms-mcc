"use strict";

const request = require("supertest");
const app = require("../src/app");

describe("hard-delete retention guard", () => {
  test.each([
    "/api/events/999",
    "/api/services/999",
    "/api/notifications/clear-all",
    "/api/archives/999",
    "/api/qr-attendance/batches/999/items/999",
    "/api/finance/records/999",
    "/api/finance/expenses/999",
    "/api/finance/expense-categories/999",
    "/api/finance/accounts/999",
    "/api/finance/funds/999",
    "/api/finance/attachments/999",
  ])("rejects DELETE %s before route handlers run", async (path) => {
    const response = await request(app).delete(path);
    expect(response.status).toBe(405);
    expect(response.body.code).toBe("HARD_DELETE_DISABLED");
    expect(response.headers.allow).toContain("PATCH");
  });
});
