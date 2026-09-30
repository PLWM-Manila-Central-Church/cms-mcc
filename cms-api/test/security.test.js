const request = require("supertest");
const app = require("../src/app");

describe("Cross-site mutation defenses (CORS + CSRF origin check)", () => {
  const ORIGINAL_ALLOWED = process.env.ALLOWED_ORIGIN;

  beforeEach(() => {
    process.env.ALLOWED_ORIGIN = "http://good.example";
  });

  afterAll(() => {
    process.env.ALLOWED_ORIGIN = ORIGINAL_ALLOWED;
  });

  it("blocks a mutation from a non-allowlisted origin (CORS layer)", async () => {
    const res = await request(app)
      .post("/api/members")
      .set("Origin", "http://evil.example")
      .set("Cookie", "accessToken=anything")
      .send({});
    expect(res.status).toBe(403);
  });

  it("lets an allowlisted origin through the origin gates (auth then applies)", async () => {
    const res = await request(app)
      .post("/api/members")
      .set("Origin", "http://good.example")
      .set("Cookie", "accessToken=anything")
      .send({});
    expect(res.status).toBe(401); // passes CORS/CSRF, fails JWT verification
  });

  it("passes non-cookie requests through to normal auth", async () => {
    const res = await request(app)
      .post("/api/members")
      .set("Origin", "http://good.example")
      .send({});
    expect(res.status).toBe(401);
  });
});

describe("GET /metrics guard", () => {
  const ORIGINAL_TOKEN = process.env.METRICS_TOKEN;

  afterEach(() => {
    delete process.env.METRICS_TOKEN;
    process.env.METRICS_TOKEN = ORIGINAL_TOKEN;
  });

  it("is open when METRICS_TOKEN is unset", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
  });

  it("requires the token when METRICS_TOKEN is set", async () => {
    process.env.METRICS_TOKEN = "secret-metrics-token";
    const denied = await request(app).get("/metrics");
    expect(denied.status).toBe(403);

    const viaHeader = await request(app)
      .get("/metrics")
      .set("Authorization", "Bearer secret-metrics-token");
    expect(viaHeader.status).toBe(200);

    const viaQuery = await request(app).get("/metrics?token=secret-metrics-token");
    expect(viaQuery.status).toBe(200);
  });
});
