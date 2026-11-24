"use strict";

const tableExists = async (queryInterface, name) => {
  const tables = await queryInterface.showAllTables();
  const names = tables.map((t) => (typeof t === "string" ? t : t.tableName || Object.values(t)[0]));
  return names.some((n) => String(n).toLowerCase() === name.toLowerCase());
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const servicesDesc = await queryInterface.describeTable("services");
    if (!servicesDesc.gathering_type) {
      await queryInterface.addColumn("services", "gathering_type", {
        type: Sequelize.ENUM(
          "lords_day",
          "wednesday_service",
          "hs_ya_service",
          "bible_seminar",
          "prayer_meeting",
          "other"
        ),
        allowNull: false,
        defaultValue: "lords_day",
      });
    }

    if (!(await tableExists(queryInterface, "visitor_records"))) {
      await queryInterface.createTable("visitor_records", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        service_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        full_name: { type: Sequelize.STRING(150), allowNull: false },
        phone: { type: Sequelize.STRING(40), allowNull: true },
        email: { type: Sequelize.STRING(150), allowNull: true },
        visit_type: {
          type: Sequelize.ENUM("first_time", "returning"),
          allowNull: false,
          defaultValue: "first_time",
        },
        visit_date: { type: Sequelize.DATEONLY, allowNull: false },
        invited_by_member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        follow_up_status: {
          type: Sequelize.ENUM("pending", "contacted", "integrated"),
          allowNull: false,
          defaultValue: "pending",
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        recorded_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("visitor_records", ["visit_date"], { name: "idx_visitor_records_date" });
      await queryInterface.addIndex("visitor_records", ["service_id"], { name: "idx_visitor_records_service" });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, "visitor_records")) {
      await queryInterface.dropTable("visitor_records");
    }
    const servicesDesc = await queryInterface.describeTable("services");
    if (servicesDesc.gathering_type) {
      await queryInterface.removeColumn("services", "gathering_type");
    }
  },
};
