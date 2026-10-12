"use strict";

const logger = require("../helpers/logger");

module.exports = (err, req, res, next) => {
  const logDetails = {
    requestId: req.requestId,
    method: req.method,
    route: req.route?.path ? `${req.baseUrl || ""}${req.route.path}` : "<unmatched>",
    errorName: err?.name || "Error",
    errorCode: err?.code || err?.parent?.code || err?.original?.code,
    parentErrorName: err?.parent?.name || err?.original?.name,
  };
  if (process.env.NODE_ENV !== "production") {
    logDetails.errorMessage = err?.message;
    logDetails.errorStack = err?.stack;
  }
  logger.error("Unhandled error", logDetails);

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

  // CORS origin rejections (cors middleware throws plain Error)
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Origin not allowed" });
  }

  // Default server error — never expose internal messages in production
  const isDev = process.env.NODE_ENV === "development";
  return res.status(err.status || 500).json({
    message: isDev ? (err.message || "Internal server error") : "Internal server error",
  });
};
