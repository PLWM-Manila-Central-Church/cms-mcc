"use strict";

jest.mock("../src/helpers/logger", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const mailer = require("../src/utils/mailer");

describe("notification mail content", () => {
  const originalFetch = global.fetch;
  const originalEnv = { key: process.env.BREVO_API_KEY, sender: process.env.SMTP_FROM };

  beforeEach(() => {
    process.env.BREVO_API_KEY = "mock-brevo-key";
    process.env.SMTP_FROM = "PLWM-MCC <qa@example.com>";
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ messageId: "qa-message" }) }));
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalEnv.key === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalEnv.key;
    if (originalEnv.sender === undefined) delete process.env.SMTP_FROM;
    else process.env.SMTP_FROM = originalEnv.sender;
  });

  it("escapes notification text before embedding it in HTML email", async () => {
    await mailer.sendNotification({ to: "qa-member@example.com", message: "<script>alert(1)</script>" });
    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);

    expect(payload.to).toEqual([{ email: "qa-member@example.com" }]);
    expect(payload.htmlContent).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(payload.htmlContent).not.toContain("<script>");
  });
});
