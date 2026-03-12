"use strict";

module.exports = (err, req, res, next) => {
  console.error("ERR_NAME:", err.name);
  console.error("ERR_MSG:", err.message);
  if (err.original) console.error("ERR_SQL:", err.original.sqlMessage || err.original.message);
  console.error(err.stack);

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

  // Default server error
  return res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
};