"use strict";

const transport = require("../src/modules/outreach/mocean.transport");
const { transportState } = require("../src/modules/outreach/configuration");

describe("SMS no-send safety", () => {
  const keys = ["SMS_DELIVERY_ENABLED", "SMS_ALLOWED_RECIPIENTS", "SMS_ALLOW_ALL_OPTED_IN", "MOCEAN_API_KEY", "MOCEAN_API_SECRET", "MOCEAN_SENDER_ID"];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalFetch = global.fetch;

  beforeEach(() => {
    for (const key of keys) delete process.env[key];
    global.fetch = jest.fn();
  });

  afterAll(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    global.fetch = originalFetch;
  });

  test("keeps live SMS unavailable when delivery is disabled", async () => {
    process.env.MOCEAN_API_KEY = "test-key";
    process.env.MOCEAN_API_SECRET = "test-secret";
    process.env.MOCEAN_SENDER_ID = "PLWMMCC";
    process.env.SMS_ALLOWED_RECIPIENTS = "+639171234567";

    expect(transportState()).toMatchObject({
      sms_delivery_enabled: false,
      provider_configured: true,
      recipient_restriction_configured: true,
    });
    await expect(transport.send({ phone: "+639171234567", message: "test only" }))
      .rejects.toMatchObject({ code: "LIVE_SMS_DISABLED" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("does not contact a provider when keys or recipient restrictions are missing", async () => {
    process.env.SMS_DELIVERY_ENABLED = "true";
    await expect(transport.send({ phone: "+639171234567", message: "test only" }))
      .rejects.toMatchObject({ code: "LIVE_SMS_DISABLED" });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
