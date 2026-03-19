const { Sequelize } = require("sequelize");
require("dotenv").config();

// DB_SSL=true is set on Render+TiDB. Leave unset or false for Railway.
const useSSL = process.env.DB_SSL === "true";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST,
    port:    process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: { max: 35, min: 2, acquire: 60000, idle: 20000 },
    ...(useSSL && {
      dialectOptions: {
        ssl: { rejectUnauthorized: true },
      },
    }),
  },
);

module.exports = sequelize;
