"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable("financial_records");
    if (!tableDesc.payment_method) {
      await queryInterface.addColumn("financial_records", "payment_method", {
        type: Sequelize.ENUM("cash", "gcash", "bank_transfer"),
        allowNull: true,
        defaultValue: "cash",
        after: "amount",
      });
      console.log("payment_method column added successfully");
    } else {
      console.log("payment_method column already exists, skipping");
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("financial_records", "payment_method");
  },
};
