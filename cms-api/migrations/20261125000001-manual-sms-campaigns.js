"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "notification_campaigns";
    const columns = await queryInterface.describeTable(table);
    await queryInterface.changeColumn(table, "audience_type", {
      type: Sequelize.ENUM("event", "ministry", "cell_group", "all_members", "selected_members"), allowNull: false,
    });
    if (!columns.member_ids) await queryInterface.addColumn(table, "member_ids", { type: Sequelize.JSON, allowNull: true });
    if (!columns.timing_mode) await queryInterface.addColumn(table, "timing_mode", { type: Sequelize.STRING(12), allowNull: false, defaultValue: "scheduled" });
    if (!columns.submission_key) await queryInterface.addColumn(table, "submission_key", { type: Sequelize.STRING(36), allowNull: true });
    const indexes = await queryInterface.showIndex(table);
    if (!indexes.some((index) => index.name === "uq_campaign_submission")) {
      await queryInterface.addIndex(table, ["created_by", "submission_key"], { unique: true, name: "uq_campaign_submission" });
    }
  },
  async down() {
    throw new Error("Manual SMS campaign history requires a forward migration");
  },
};
