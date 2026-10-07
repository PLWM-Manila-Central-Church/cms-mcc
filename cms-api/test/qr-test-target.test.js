"use strict";

const { assertSafeQrTestTarget, isSafeQrTestTarget } = require("../scripts/qr-test-target");

const localTarget = {
  NODE_ENV: "test",
  DB_HOST: "127.0.0.1",
  DB_NAME: "plwm_mcc",
};

const tidbQaTarget = {
  NODE_ENV: "test",
  QR_ATTENDANCE_TEST_TARGET: "tidb-mcc-local-dev",
  QR_ATTENDANCE_TEST_CONFIRM: "mcc-local-dev/qr_attendance_qa",
  QR_ATTENDANCE_QA_DB_USER: "branchprefix.qrqa_app",
  DB_HOST: "gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com",
  DB_PORT: "4000",
  DB_NAME: "qr_attendance_qa",
  DB_USER: "branchprefix.qrqa_app",
  DB_SSL: "true",
};

describe("QR test database safety guard", () => {
  test("allows only the disposable local CI MySQL target", () => {
    expect(isSafeQrTestTarget(localTarget)).toBe(true);
    expect(() => assertSafeQrTestTarget(localTarget)).not.toThrow();
  });

  test("allows the explicitly confirmed, scoped TiDB QA target", () => {
    expect(isSafeQrTestTarget(tidbQaTarget)).toBe(true);
    expect(() => assertSafeQrTestTarget(tidbQaTarget)).not.toThrow();
  });

  test.each([
    ["production schema", { DB_NAME: "church_cms" }],
    ["root user", { DB_USER: "branchprefix.root", QR_ATTENDANCE_QA_DB_USER: "branchprefix.root" }],
    ["wrong schema", { DB_NAME: "mcc_local_dev" }],
    ["missing confirmation", { QR_ATTENDANCE_TEST_CONFIRM: "" }],
    ["TLS disabled", { DB_SSL: "false" }],
    ["wrong branch marker", { QR_ATTENDANCE_TEST_TARGET: "main" }],
    ["wrong TiDB endpoint", { DB_HOST: "gateway01-privatelink.ap-southeast-1.prod.alicloud.tidbcloud.com" }],
  ])("rejects TiDB target with %s", (_reason, overrides) => {
    expect(isSafeQrTestTarget({ ...tidbQaTarget, ...overrides })).toBe(false);
    expect(() => assertSafeQrTestTarget({ ...tidbQaTarget, ...overrides })).toThrow(
      /unapproved database/,
    );
  });

  test("rejects a local schema when Jest is not in test mode", () => {
    expect(isSafeQrTestTarget({ ...localTarget, NODE_ENV: "development" })).toBe(false);
  });
});
