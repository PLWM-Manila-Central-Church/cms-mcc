"use strict";

const app = require("./app");
const sequelize = require("./config/db");
const logger = require("./helpers/logger");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connected");
    app.listen(PORT, () => logger.info("API running on port", { port: PORT }));
  } catch (err) {
    logger.error(err, "Unable to connect to database");
    process.exit(1);
  }
})();
