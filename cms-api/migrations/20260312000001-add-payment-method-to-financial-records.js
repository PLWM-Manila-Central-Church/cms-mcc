"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("financial_records", "payment_method", {
      type: Sequelize.ENUM("cash", "gcash", "bank_transfer"),
      allowNull: true,
      defaultValue: "cash",
      after: "amount",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("financial_records", "payment_method");
  },
};
