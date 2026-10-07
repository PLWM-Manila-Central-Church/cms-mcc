"use strict";

const jwt = require("jsonwebtoken");
const { getGlobalRateLimitKey } = require("../src/middlewares/rateLimiters");

describe("global API rate-limit identity", () => {
  const previousSecret = process.env.JWT_SECRET;
  const testSecret = "global-rate-limit-test-secret-only";

  beforeAll(() => { process.env.JWT_SECRET = testSecret; });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const request = ({ ip = "2001:db8::7", cookie, authorization } = {}) => ({
    ip,
    cookies: cookie ? { accessToken: cookie } : {},
    headers: authorization ? { authorization } : {},
  });

  it("uses a verified cookie token to isolate authenticated users behind one IP", () => {
    const first = jwt.sign({ userId: 101 }, testSecret, { algorithm: "HS256" });
    const second = jwt.sign({ userId: 202 }, testSecret, { algorithm: "HS256" });

    expect(getGlobalRateLimitKey(request({ cookie: first }))).toBe("user:101");
    expect(getGlobalRateLimitKey(request({ cookie: second }))).toBe("user:202");
  });

  it("uses a verified bearer token when cookie authentication is absent", () => {
    const token = jwt.sign({ userId: 303 }, testSecret, { algorithm: "HS256" });

    expect(getGlobalRateLimitKey(request({ authorization: `Bearer ${token}` }))).toBe("user:303");
  });

  it("keeps anonymous and invalid-token traffic in the IP bucket", () => {
    const invalid = jwt.sign({ userId: 404 }, "different-secret", { algorithm: "HS256" });
    const anonymousKey = getGlobalRateLimitKey(request());

    expect(anonymousKey).toMatch(/^ip:/);
    expect(getGlobalRateLimitKey(request({ cookie: invalid }))).toBe(anonymousKey);
  });
});
