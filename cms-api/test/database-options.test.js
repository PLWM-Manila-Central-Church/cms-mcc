"use strict";

const originalEnvironment = { ...process.env };

const restoreEnvironment = () => {
  for (const key of Object.keys(process.env)) {
    if (!Object.hasOwn(originalEnvironment, key)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
  jest.resetModules();
};

afterEach(restoreEnvironment);

describe("database connection options", () => {
  it("uses a small, non-pinned pool with idle eviction for cloud database gateways", () => {
    delete process.env.DB_SSL;
    delete process.env.DB_CA_PATH;
    jest.resetModules();

    const { getDatabaseOptions } = require("../src/config/databaseOptions");
    const options = getDatabaseOptions();

    expect(options.pool).toEqual({
      max: 15,
      min: 0,
      acquire: 30000,
      idle: 60000,
      evict: 1000,
    });
    expect(options.dialectOptions.connectTimeout).toBe(15000);
    expect(options.dialectOptions.ssl).toBeUndefined();
  });

  it("requires certificate validation when database TLS is enabled", () => {
    process.env.DB_SSL = "true";
    delete process.env.DB_CA_PATH;
    jest.resetModules();

    const { getDatabaseOptions } = require("../src/config/databaseOptions");
    const options = getDatabaseOptions();

    expect(options.dialectOptions.ssl).toEqual({
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    });
  });
});
