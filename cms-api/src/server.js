"use strict";

const app = require("./app");
const sequelize = require("./config/db");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected");
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
  } catch (err) {
    console.error("Unable to connect to database:", err);
    process.exit(1);
  }
})();
