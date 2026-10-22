"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("expense_categories", "account_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.changeColumn("expenses", "account_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
  },

  // Existing account links are preserved; rollback would only re-tighten the
  // fields and can fail for new account-free categories and expense records.
  down: async () => {
    throw new Error("Account-free expense entries are forward-only; do not require account assignments again.");
  },
};
