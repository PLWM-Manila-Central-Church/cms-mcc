const { Sequelize } = require("sequelize");
require("dotenv").config();

const { getDatabaseOptions } = require("./databaseOptions");

const { database, username, password, ...options } = getDatabaseOptions({
  logging: process.env.NODE_ENV === "development" ? console.log : false,
});

const sequelize = new Sequelize(database, username, password, options);

module.exports = sequelize;
