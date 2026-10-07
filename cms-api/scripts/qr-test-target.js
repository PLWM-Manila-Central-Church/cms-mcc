"use strict";

const QR_QA_DATABASE = "qr_attendance_qa";
const QR_QA_USER_SUFFIX = ".qrqa_app";
const QR_QA_CONFIRMATION = "mcc-local-dev/qr_attendance_qa";
const QR_QA_HOST = "gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com";

const isLoopbackHost = (host) => ["127.0.0.1", "localhost"].includes(String(host || "").toLowerCase());

const isLocalCiTarget = (env) =>
  env.NODE_ENV === "test" &&
  isLoopbackHost(env.DB_HOST) &&
  env.DB_NAME === "plwm_mcc";

const isTiDbQaTarget = (env) => {
  const databaseUser = String(env.DB_USER || "");
  const sslEnabled = String(env.DB_SSL || "").toLowerCase() === "true";

  return env.NODE_ENV === "test" &&
    env.QR_ATTENDANCE_TEST_TARGET === "tidb-mcc-local-dev" &&
    env.QR_ATTENDANCE_TEST_CONFIRM === QR_QA_CONFIRMATION &&
    String(env.DB_HOST || "").toLowerCase() === QR_QA_HOST &&
    String(env.DB_PORT || "") === "4000" &&
    env.DB_NAME === QR_QA_DATABASE &&
    sslEnabled &&
    databaseUser === env.QR_ATTENDANCE_QA_DB_USER &&
    databaseUser.endsWith(QR_QA_USER_SUFFIX) &&
    !databaseUser.endsWith(".root");
};

const isSafeQrTestTarget = (env = process.env) =>
  isLocalCiTarget(env) || isTiDbQaTarget(env);

const assertSafeQrTestTarget = (env = process.env) => {
  if (isSafeQrTestTarget(env)) return;

  throw new Error(
    "Refusing QR test writes to an unapproved database. Use disposable loopback MySQL (plwm_mcc) or explicitly configure the TLS-only mcc-local-dev qr_attendance_qa schema with its scoped qrqa_app user and confirmation marker.",
  );
};

module.exports = {
  assertSafeQrTestTarget,
  isSafeQrTestTarget,
};
