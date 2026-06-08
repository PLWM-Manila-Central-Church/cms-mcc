"use strict";

const logger = require("../helpers/logger");

module.exports = (err, req, res, next) => {
  logger.error({ err, reqId: req.requestId, req: { method: req.method, url: req.url } }, "Unhandled error");

  // Sequelize validation errors
  if (err.name === "SequelizeValidationError") {
    return res.status(422).json({
      message: "Validation error",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Custom AppError
  if (err.name === "AppError") {
    return res.status(err.status || 500).json({
      error: {
        code: err.code || "UNKNOWN_ERROR",
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Sequelize unique constraint errors
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      message: "Duplicate entry",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Sequelize foreign key constraint errors
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(409).json({
      message: "Referenced record does not exist or cannot be deleted",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" });
  }

  // Default server error — never expose internal messages in production
  const isDev = process.env.NODE_ENV === "development";
  return res.status(err.status || 500).json({
    message: isDev ? (err.message || "Internal server error") : "Internal server error",
  });
};