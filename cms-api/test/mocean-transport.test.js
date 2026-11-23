"use strict";

const transport = require("../src/modules/outreach/mocean.transport");

const keys = [
  "SMS_DELIVERY_ENABLED", "SMS_ALLOWED_RECIPIENTS", "SMS_ALLOW_ALL_OPTED_IN",
  "MOCEAN_API_TOKEN", "MOCEAN_API_KEY", "MOCEAN_API_SECRET", "MOCEAN_SENDER_ID",
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalFetch = global.fetch;

const enable = () => {
  process.env.SMS_DELIVERY_ENABLED = "true";
  process.env.SMS_ALLOWED_RECIPIENTS = "+639171234567";
  process.env.MOCEAN_SENDER_ID = "MOCEAN";
};

beforeEach(() => {
  for (const key of keys) delete process.env[key];
  enable();
  global.fetch = jest.fn();
});

afterAll(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  global.fetch = originalFetch;
});

test("sends with the Bearer token and without legacy credentials in the body", async () => {
  process.env.MOCEAN_API_TOKEN = "test-token";
  global.fetch.mockResolvedValue({
    ok: true, status: 202,
    json: async () => ({ messages: [{ status: 0, receiver: "639171234567", msgid: "abc.123" }] }),
  });

  await expect(transport.send({ phone: "+639171234567", message: "Hello from the test" }))
    .resolves.toEqual({ provider_message_id: "abc.123" });

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe("https://rest.moceanapi.com/rest/2/sms");
  expect(options.headers.Authorization).toBe("Bearer test-token");
  expect(options.body.get("mocean-from")).toBe("MOCEAN");
  expect(options.body.get("mocean-to")).toBe("639171234567");
  expect(options.body.get("mocean-text")).toBe("Hello from the test");
  expect(options.body.get("mocean-api-key")).toBeNull();
  expect(options.body.get("mocean-resp-format")).toBe("json");
});

test("still supports legacy key and secret accounts", async () => {
  delete process.env.MOCEAN_API_TOKEN;
  process.env.MOCEAN_API_KEY = "legacy-key";
  process.env.MOCEAN_API_SECRET = "legacy-secret";
  global.fetch.mockResolvedValue({
    ok: true, status: 202, json: async () => ({ messages: [{ status: 0, msgid: "legacy.1" }] }),
  });

  await transport.send({ phone: "+639171234567", message: "hello" });

  const [, options] = global.fetch.mock.calls[0];
  expect(options.headers.Authorization).toBeUndefined();
  expect(options.body.get("mocean-api-key")).toBe("legacy-key");
  expect(options.body.get("mocean-api-secret")).toBe("legacy-secret");
});

test("queries delivery status with the token and maps provider codes", async () => {
  process.env.MOCEAN_API_TOKEN = "test-token";
  global.fetch.mockResolvedValue({
    ok: true, status: 202,
    json: async () => ({ status: 0, message_status: 1, msgid: "abc.123", credit_deducted: 1 }),
  });

  await expect(transport.queryStatus("abc.123")).resolves.toBe("delivered");

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toContain("https://rest.moceanapi.com/rest/2/report/message?");
  expect(url).toContain("mocean-msgid=abc.123");
  expect(options.headers.Authorization).toBe("Bearer test-token");
});

test("surfaces a rejected sender ID without pretending it was sent", async () => {
  process.env.MOCEAN_API_TOKEN = "test-token";
  global.fetch.mockResolvedValue({
    ok: true, status: 202, json: async () => ({ messages: [{ status: 8, err_msg: "Sender ID not found" }] }),
  });

  await expect(transport.send({ phone: "+639171234567", message: "hello" }))
    .rejects.toMatchObject({ code: "MOCEAN_REJECTED_8", retryable: false, ambiguous: false });
});

test("rejects a 401 as an auth failure, not an ambiguous result", async () => {
  process.env.MOCEAN_API_TOKEN = "wrong-token";
  global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ status: 1 }) });

  await expect(transport.send({ phone: "+639171234567", message: "hello" }))
    .rejects.toMatchObject({ code: "PROVIDER_AUTH_FAILED", retryable: false });
});
