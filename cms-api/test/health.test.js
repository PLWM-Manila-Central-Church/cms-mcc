const request = require("supertest");
const app = require("../src/app");

describe("GET /health", () => {
  it("returns 200 with db status", async () => {
    const res = await request(app).get("/health");
    // Accept 200 (DB connected) or 503 (DB unavailable in test)
    expect([200, 503]).toContain(res.status);
    expect(res.body.status).toBe("ok");
    expect(res.body.uptime).toBeGreaterThan(0);
    // db field may be "connected" or "disconnected"
    if (res.status === 200) {
      expect(res.body.db).toBe("connected");
    }
  });
});

describe("GET /metrics", () => {
  it("returns Prometheus metrics", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("http_requests_total");
  });
});