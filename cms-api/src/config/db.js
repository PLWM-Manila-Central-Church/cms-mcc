const { Sequelize } = require("sequelize");
const logger       = require("../helpers/logger");
require("dotenv").config();

const { getDatabaseOptions } = require("./databaseOptions");

const { database, username, password, ...options } = getDatabaseOptions({
  logging: process.env.NODE_ENV === "development" ? (sql) => logger.debug(sql) : false,
});

const sequelize = new Sequelize(database, username, password, options);

module.exports = sequelize;
