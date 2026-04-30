require("dotenv").config();

const { getDatabaseOptions } = require("./databaseOptions");

const makeConfig = () => {
  const { database, username, password, ...options } = getDatabaseOptions();
  return { database, username, password, ...options };
};

module.exports = {
  development: makeConfig(),
  production: makeConfig(),
};
