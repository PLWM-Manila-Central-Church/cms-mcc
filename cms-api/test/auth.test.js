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

describe("POST /api/auth/refresh", () => {
  it("accepts an HttpOnly refresh cookie with an empty request body", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=not-a-valid-refresh-token")
      .send({});

    // Cookie passed validation and reached server-side token verification.
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Invalid or expired refresh token");
  });

  it("still accepts body-based refresh token requests", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refresh_token: "not-a-valid-refresh-token" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Invalid or expired refresh token");
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
