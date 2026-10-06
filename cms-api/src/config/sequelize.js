"use strict";

// Sequelize CLI expects a config object keyed by NODE_ENV. Keep it aligned with
// the runtime database options so deploy migrations use the same TLS/pool setup.
require("dotenv").config();

const { getDatabaseOptions } = require("./databaseOptions");

const getCliOptions = () => getDatabaseOptions({ logging: false });

module.exports = {
  development: getCliOptions(),
  test: getCliOptions(),
  production: getCliOptions(),
};
