"use strict";

const {
  MAX_QR_PAYLOAD_LENGTH,
  createPublicId,
  formatQrPayload,
  parseQrPayload,
} = require("../src/modules/qr-attendance/qrPayload");

describe("QR attendance payloads", () => {
  it("creates a reusable versioned member payload", () => {
    const memberId = createPublicId();
    const payload = formatQrPayload("member", memberId);

    expect(payload).toMatch(/^MCC:MEMBER:1:[0-9a-f-]{36}$/);
    expect(parseQrPayload(payload)).toEqual({ kind: "member", publicId: memberId });
    expect(parseQrPayload(payload)).toEqual(parseQrPayload(payload));
  });

  it("distinguishes a leader batch from a member code", () => {
    const payload = formatQrPayload("BATCH", createPublicId());

    expect(parseQrPayload(payload)?.kind).toBe("batch");
    expect(parseQrPayload(payload)?.kind).not.toBe("member");
  });

  it.each([
    "https://example.com",
    "MCC:MEMBER:2:91a9de05-a4e7-435a-92f7-7994937eb1c0",
    "MCC:BATCH:1:91a9de05-a4e7-435a-12f7-7994937eb1c0",
    "MCC:MEMBER:1:not-a-uuid",
    "",
    null,
    42,
  ])("rejects unsupported or non-identifier payloads: %s", (payload) => {
    expect(parseQrPayload(payload)).toBeNull();
  });

  it("rejects an oversized payload before a database lookup", () => {
    expect(parseQrPayload(`MCC:MEMBER:1:${"a".repeat(MAX_QR_PAYLOAD_LENGTH)}`)).toBeNull();
  });

  it("formats only valid member or batch identifiers", () => {
    expect(() => formatQrPayload("ATTENDANCE", createPublicId())).toThrow("Invalid QR attendance identifier");
    expect(() => formatQrPayload("MEMBER", "123")).toThrow("Invalid QR attendance identifier");
  });
});
