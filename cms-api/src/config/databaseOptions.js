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
    // Cloud DB gateways can expire idle TCP connections. Keep the pool empty
    // while idle and retire released sockets promptly before they can go stale.
    pool: { max: 15, min: 0, acquire: 30000, idle: 60000, evict: 1000 },
    dialectOptions: {
      connectTimeout: 15000,
      ...(ssl && { ssl }),
    },
  };
};

module.exports = { getDatabaseOptions };
