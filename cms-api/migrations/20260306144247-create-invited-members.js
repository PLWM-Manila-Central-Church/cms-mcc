"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("invited_members", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      invite_token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      invited_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM("pending", "accepted", "expired"),
        allowNull: false,
        defaultValue: "pending",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeConstraint(
      "invited_members",
      "fk_im_invited_by",
    );
    await queryInterface.dropTable("invited_members");
  },
};
