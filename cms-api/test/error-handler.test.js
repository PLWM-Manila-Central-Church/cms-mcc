"use strict";

jest.mock("../src/helpers/logger", () => ({ error: jest.fn() }));

const logger = require("../src/helpers/logger");
const errorHandler = require("../src/middlewares/errorHandler");

describe("API error logging", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  const response = () => {
    const res = {
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    return res;
  };

  test("logs structured database error metadata in test mode", () => {
    process.env.NODE_ENV = "test";
    const err = Object.assign(new Error("QA connection timed out"), {
      name: "SequelizeConnectionError",
      parent: Object.assign(new Error("connection lost"), { code: "ETIMEDOUT" }),
    });
    const res = response();

    errorHandler(err, {
      requestId: "qa-request-17",
      method: "POST",
      baseUrl: "/api/member-portal",
      route: { path: "/profile/photo" },
    }, res, jest.fn());

    expect(logger.error).toHaveBeenCalledWith("Unhandled error", expect.objectContaining({
      requestId: "qa-request-17",
      method: "POST",
      route: "/api/member-portal/profile/photo",
      errorName: "SequelizeConnectionError",
      errorCode: "ETIMEDOUT",
      errorMessage: "QA connection timed out",
      errorStack: expect.stringContaining("Error: QA connection timed out"),
    }));
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Internal server error");
  });

  test("does not log internal message or stack in production", () => {
    process.env.NODE_ENV = "production";
    const res = response();

    errorHandler(new Error("private database details"), {
      requestId: "prod-request-18",
      method: "GET",
      baseUrl: "/api/notifications",
      route: { path: "/" },
    }, res, jest.fn());

    const [, details] = logger.error.mock.calls[0];
    expect(details).toMatchObject({ requestId: "prod-request-18", method: "GET", route: "/api/notifications/" });
    expect(details).not.toHaveProperty("errorMessage");
    expect(details).not.toHaveProperty("errorStack");
    expect(res.body.message).toBe("Internal server error");
  });
});
