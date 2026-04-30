"use strict";

const fs = require("fs");

const envFlag = (value) => String(value || "").toLowerCase() === "true";

const getSslOptions = () => {
  if (!envFlag(process.env.DB_SSL)) return undefined;

  const options = {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  };

  if (process.env.DB_CA_PATH) {
    options.ca = fs.readFileSync(process.env.DB_CA_PATH);
  }

  return options;
};

const getDatabaseOptions = ({ logging = false } = {}) => {
  const ssl = getSslOptions();

  return {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging,
    pool: { max: 35, min: 2, acquire: 60000, idle: 20000 },
    ...(ssl && { dialectOptions: { ssl } }),
  };
};

module.exports = { getDatabaseOptions };
