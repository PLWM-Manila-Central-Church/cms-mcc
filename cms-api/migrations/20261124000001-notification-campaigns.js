"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notification_campaigns", {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      title: { type: Sequelize.STRING(150), allowNull: false },
      audience_type: { type: Sequelize.ENUM("event", "ministry", "cell_group", "all_members"), allowNull: false },
      event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      ministry_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      cell_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      message: { type: Sequelize.STRING(480), allowNull: false },
      status: {
        type: Sequelize.ENUM("draft", "pending_approval", "approved", "scheduled", "sending", "completed", "cancelled", "rejected", "failed"),
        allowNull: false, defaultValue: "draft",
      },
      scheduled_at: { type: Sequelize.DATE, allowNull: true },
      window_end: { type: Sequelize.DATE, allowNull: true },
      recipient_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      segment_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      estimated_cost_php: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      actual_cost_php: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      budget_cap_php: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      approval_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      approved_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      rejected_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      rejected_at: { type: Sequelize.DATE, allowNull: true },
      rejection_reason: { type: Sequelize.STRING(500), allowNull: true },
      cancelled_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      cancel_reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("notification_campaigns", ["status", "scheduled_at"], { name: "idx_campaign_status_schedule" });
    await queryInterface.addIndex("notification_campaigns", ["audience_type", "created_by"], { name: "idx_campaign_audience_creator" });

    await queryInterface.addColumn("outreach_deliveries", "campaign_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.addColumn("outreach_deliveries", "cost_php", { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    await queryInterface.sequelize.query(
      "ALTER TABLE outreach_deliveries MODIFY COLUMN kind ENUM('activity_reminder','absence_followup','campaign') NOT NULL",
    );
    await queryInterface.addIndex("outreach_deliveries", ["campaign_id", "status"], { name: "idx_delivery_campaign_status" });
    await queryInterface.addIndex("outreach_deliveries", ["member_id", "created_at"], { name: "idx_delivery_member_created" });

    await queryInterface.addColumn("outreach_preferences", "campaign_notifications", {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true,
    });
    await queryInterface.addColumn("outreach_preferences", "guardian_name", { type: Sequelize.STRING(120), allowNull: true });
    await queryInterface.addColumn("outreach_preferences", "guardian_phone", { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn("outreach_preferences", "guardian_consent_at", { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn("outreach_preferences", "guardian_consent_note", { type: Sequelize.STRING(500), allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("outreach_deliveries", "idx_delivery_campaign_status");
    await queryInterface.removeIndex("outreach_deliveries", "idx_delivery_member_created");
    await queryInterface.removeColumn("outreach_deliveries", "campaign_id");
    await queryInterface.removeColumn("outreach_deliveries", "cost_php");
    await queryInterface.sequelize.query(
      "ALTER TABLE outreach_deliveries MODIFY COLUMN kind ENUM('activity_reminder','absence_followup') NOT NULL",
    );
    await queryInterface.removeColumn("outreach_preferences", "campaign_notifications");
    await queryInterface.removeColumn("outreach_preferences", "guardian_name");
    await queryInterface.removeColumn("outreach_preferences", "guardian_phone");
    await queryInterface.removeColumn("outreach_preferences", "guardian_consent_at");
    await queryInterface.removeColumn("outreach_preferences", "guardian_consent_note");
    await queryInterface.dropTable("notification_campaigns");
  },
};
