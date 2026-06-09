"use strict";

const winston = require("winston");
const path    = require("path");

const logDir = path.join(__dirname, "../../logs");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "plwm-mcc-api" },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production"
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
              const metaStr = Object.keys(meta).length > 1
                ? ` ${JSON.stringify(meta)}`
                : "";
              return `${timestamp} ${level}: ${message}${metaStr}${stack ? `\n${stack}` : ""}`;
            }),
          ),
    }),
  ],
});

// Always write to rotating files (helps debug issues even in development)
const fs = require("fs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const fileTransport = new winston.transports.File({
  filename: path.join(logDir, "app.log"),
  maxsize: 10 * 1024 * 1024, // 10 MB
  maxFiles: 5,
});
logger.add(fileTransport);

const errorTransport = new winston.transports.File({
  filename: path.join(logDir, "error.log"),
  level: "error",
  maxsize: 10 * 1024 * 1024,
  maxFiles: 5,
});
logger.add(errorTransport);

module.exports = logger;
