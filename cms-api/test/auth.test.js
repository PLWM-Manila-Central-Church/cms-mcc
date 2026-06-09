const request = require("supertest");
const app = require("../src/app");

describe("POST /api/auth/login", () => {
  it("rejects empty credentials with 400/422", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "", password: "" });
    expect([400, 422]).toContain(res.status);
  });

  it("rejects missing password with 400/422", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com" });
    expect([400, 422]).toContain(res.status);
  });
});

describe("Protected endpoints without token", () => {
  it("GET /api/members returns 401 without auth", async () => {
    const res = await request(app).get("/api/members");
    expect(res.status).toBe(401);
  });

  it("GET /api/dashboard/stats returns 401 without auth", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(401);
  });
});