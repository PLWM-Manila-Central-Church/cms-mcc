"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columns = await queryInterface.describeTable("financial_records");
    if (!columns.is_anonymous) {
      await queryInterface.addColumn("financial_records", "is_anonymous", {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
      });
    }

    if (columns.member_id && columns.member_id.allowNull === false) {
      await queryInterface.changeColumn("financial_records", "member_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const rows = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM financial_records WHERE is_anonymous = 1 OR member_id IS NULL",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (Number(rows[0]?.count || 0) > 0) {
      throw new Error("Cannot restore required member links while anonymous financial records exist.");
    }

    const columns = await queryInterface.describeTable("financial_records");
    if (columns.member_id?.allowNull) {
      await queryInterface.changeColumn("financial_records", "member_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
    }
    if (columns.is_anonymous) await queryInterface.removeColumn("financial_records", "is_anonymous");
  },
};
