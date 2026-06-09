"use strict";

const app = require("./app");
const sequelize = require("./config/db");
const logger = require("./helpers/logger");
const { execSync } = require("child_process");

const PORT = process.env.PORT || 5000;
const MIGRATE_ON_START = process.env.MIGRATE_ON_START !== "false";
const SHUTDOWN_TIMEOUT_MS = 30_000;

(async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connected");

    if (MIGRATE_ON_START) {
      try {
        logger.info("Running pending database migrations...");
        execSync("npx sequelize-cli db:migrate", {
          cwd: __dirname + "/..",
          stdio: "pipe",
          timeout: 120_000,
        });
        logger.info("Migrations completed");
      } catch (migErr) {
        logger.error(migErr.stderr?.toString() || migErr.message, "Migration warning");
      }
    }

    const server = app.listen(PORT, () =>
      logger.info("API running on port", { port: PORT })
    );

    // ── Graceful Shutdown ──────────────────────────────────────
    let shuttingDown = false;

    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info(`Received ${signal} — shutting down gracefully`);

      server.close(() => logger.info("HTTP server closed"));

      setTimeout(() => {
        logger.error("Shutdown timeout — forcing exit");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS).unref();

      sequelize.close()
        .then(() => {
          logger.info("Database pool closed");
          process.exit(0);
        })
        .catch((err) => {
          logger.error(err, "Error closing DB pool");
          process.exit(1);
        });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT",  () => shutdown("SIGINT"));

        // ── Global Crash Handlers ─────────────────────────────────
        // Catch unhandled rejections anywhere in the app (missed try/catch,
        // unawaited promises, third-party library rejections).  Log and exit
        // so the Render/PM2 process manager can restart cleanly.
        process.on("unhandledRejection", (reason) => {
          logger.error("Unhandled rejection — server will exit", {
            error: reason?.message || String(reason),
            stack: reason?.stack?.split("\n").slice(0, 6).join("\n"),
          });
          process.exit(1);
        });

        process.on("uncaughtException", (err) => {
          logger.error("Uncaught exception — server will exit", {
            error: err.message,
            stack: err.stack?.split("\n").slice(0, 6).join("\n"),
          });
          process.exit(1);
        });
  } catch (err) {
    logger.error(err, "Unable to connect to database");
    process.exit(1);
  }
})();