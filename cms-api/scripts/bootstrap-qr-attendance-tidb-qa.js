"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const sql = require("mysql2");

const apiDirectory = path.resolve(__dirname, "..");
const bootstrapEnvPath = path.join(apiDirectory, ".env.tidb-qa-bootstrap");
const runtimeEnvPath = path.join(apiDirectory, ".env");
const expectedBranch = "mcc-local-dev";
const expectedDatabase = "qr_attendance_qa";
const expectedHost = "gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com";
const appUserSuffix = "qrqa_app";

const readBootstrapConfig = () => {
  if (!fs.existsSync(bootstrapEnvPath)) {
    throw new Error("Create cms-api/.env.tidb-qa-bootstrap and add the mcc-local-dev branch password before bootstrapping.");
  }

  const config = dotenv.parse(fs.readFileSync(bootstrapEnvPath));
  const rootUserMatch = String(config.TIDB_QA_ROOT_USER || "").match(/^([A-Za-z0-9]+)\.root$/);

  if (config.TIDB_QA_TARGET !== expectedBranch) throw new Error("Bootstrap target must be mcc-local-dev.");
  if (config.TIDB_QA_DATABASE !== expectedDatabase) throw new Error("Bootstrap database must be qr_attendance_qa.");
  if (config.TIDB_QA_HOST !== expectedHost) throw new Error("Bootstrap host must be the approved public TiDB endpoint.");
  if (config.TIDB_QA_PORT !== "4000") throw new Error("Bootstrap port must be 4000.");
  if (config.TIDB_QA_SSL !== "true") throw new Error("Bootstrap must use TLS.");
  if (!rootUserMatch) throw new Error("Bootstrap user must be the branch-specific <prefix>.root user.");
  if (!config.TIDB_QA_ROOT_PASSWORD) throw new Error("TIDB_QA_ROOT_PASSWORD is empty.");

  const appUser = `${rootUserMatch[1]}.${appUserSuffix}`;
  if (appUser.length > 32) throw new Error("The branch-prefixed QR QA user name exceeds TiDB's 32-character limit.");

  return {
    ...config,
    rootPrefix: rootUserMatch[1],
    appUser,
  };
};

const runtimeEnvContents = ({ config, appUser, appPassword }) => {
  const appEnv = {
    DB_HOST: config.TIDB_QA_HOST,
    DB_PORT: config.TIDB_QA_PORT,
    DB_NAME: expectedDatabase,
    DB_USER: appUser,
    DB_PASSWORD: appPassword,
    DB_SSL: "true",
    ...(config.TIDB_QA_CA_PATH ? { DB_CA_PATH: config.TIDB_QA_CA_PATH } : {}),
    JWT_SECRET: crypto.randomBytes(48).toString("base64url"),
    REFRESH_TOKEN_SECRET: crypto.randomBytes(48).toString("base64url"),
    JWT_EXPIRES_IN: "1h",
    REFRESH_TOKEN_EXPIRES_IN: "7d",
    NODE_ENV: "test",
    PORT: "5000",
    ALLOWED_ORIGIN: "http://127.0.0.1:3000",
    LOG_LEVEL: "warn",
    MIGRATE_ON_START: "false",
    BCRYPT_ROUNDS: "10",
    QR_ATTENDANCE_TEST_TARGET: "tidb-mcc-local-dev",
    QR_ATTENDANCE_TEST_CONFIRM: "mcc-local-dev/qr_attendance_qa",
    QR_ATTENDANCE_QA_DB_USER: appUser,
  };

  return [
    "# Local-only QR attendance QA environment. This file is ignored by Git.",
    ...Object.entries(appEnv).map(([name, value]) => `${name}=${value}`),
    "",
  ].join("\n");
};

const main = async () => {
  if (fs.existsSync(runtimeEnvPath)) {
    throw new Error("cms-api/.env already exists; refusing to overwrite local environment settings.");
  }

  const config = readBootstrapConfig();
  const appPassword = crypto.randomBytes(32).toString("base64url");
  const ssl = { minVersion: "TLSv1.2", rejectUnauthorized: true };
  if (config.TIDB_QA_CA_PATH) ssl.ca = fs.readFileSync(config.TIDB_QA_CA_PATH);

  let connection;
  let createdDatabase = false;
  let createdUser = false;
  let runtimeEnvWritten = false;

  try {
    connection = await mysql.createConnection({
      host: config.TIDB_QA_HOST,
      port: Number(config.TIDB_QA_PORT),
      user: config.TIDB_QA_ROOT_USER,
      password: config.TIDB_QA_ROOT_PASSWORD,
      ssl,
    });

    const [identityRows] = await connection.query("SELECT CURRENT_USER() AS connected_identity");
    const currentUser = String(identityRows[0]?.connected_identity || "").split("@")[0];
    if (currentUser !== config.TIDB_QA_ROOT_USER) {
      throw new Error("Connected identity does not match the mcc-local-dev branch root user.");
    }

    const [schemaRows] = await connection.execute(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
      [expectedDatabase],
    );
    if (schemaRows.length > 0) {
      const [tableRows] = await connection.execute(
        "SELECT COUNT(*) AS table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
        [expectedDatabase],
      );
      if (Number(tableRows[0]?.table_count || 0)) {
        throw new Error("qr_attendance_qa already contains tables; refusing to modify it.");
      }
    } else {
      await connection.query(`CREATE DATABASE ${sql.escapeId(expectedDatabase)} CHARACTER SET utf8mb4`);
      createdDatabase = true;
    }

    const account = `${sql.escape(config.appUser)}@'%'`;
    await connection.query(`CREATE USER ${account} IDENTIFIED BY ${sql.escape(appPassword)} REQUIRE SSL`);
    createdUser = true;
    await connection.query(`GRANT ALL PRIVILEGES ON ${sql.escapeId(expectedDatabase)}.* TO ${account}`);

    const contents = runtimeEnvContents({ config, appUser: config.appUser, appPassword });
    fs.writeFileSync(runtimeEnvPath, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
    runtimeEnvWritten = true;
    fs.unlinkSync(bootstrapEnvPath);

    console.log("Created the isolated qr_attendance_qa schema and a TLS-required app user scoped to that schema.");
    console.log("Saved local API configuration to ignored cms-api/.env; the temporary branch-root credential file was removed.");
    console.log("No passwords or tokens were printed. Run migrations explicitly before starting the API.");
  } catch (error) {
    if (connection && createdUser) {
      try {
        await connection.query(`DROP USER IF EXISTS ${sql.escape(config.appUser)}@'%'`);
      } catch {}
    }
    if (connection && createdDatabase) {
      try {
        await connection.query(`DROP DATABASE IF EXISTS ${sql.escapeId(expectedDatabase)}`);
      } catch {}
    }
    if (runtimeEnvWritten && fs.existsSync(runtimeEnvPath)) fs.unlinkSync(runtimeEnvPath);

    const safeMessage = String(error?.message || "unknown error")
      .replaceAll(config.TIDB_QA_ROOT_PASSWORD, "[redacted]")
      .replaceAll(appPassword, "[redacted]");
    console.error(`QR TiDB QA bootstrap failed: ${safeMessage}`);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
};

main().catch((error) => {
  console.error(`QR TiDB QA bootstrap failed: ${String(error?.message || "unknown error")}`);
  process.exitCode = 1;
});
