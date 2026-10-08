"use strict";

const LEGACY_CURRENT_STATUSES = ["New", "Semi-Active", "Visitor"];
const HISTORY_STATUSES = ["New", "Active", "Semi-Active", "Inactive", "Visitor"];
const NORMALIZATION_REASON = "Legacy member status normalized to Active under the two-status policy.";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const history = await queryInterface.describeTable("member_status_history");
    for (const column of ["old_status", "new_status"]) {
      if (history[column]) {
        await queryInterface.changeColumn("member_status_history", column, {
          type: Sequelize.ENUM(...HISTORY_STATUSES),
          allowNull: false,
        });
      }
    }

    const members = await queryInterface.describeTable("members");
    if (!members.status) throw new Error("members.status is required for status normalization");

    const oldStatusSql = LEGACY_CURRENT_STATUSES.map((status) => `'${status}'`).join(", ");
    await queryInterface.sequelize.query(
      `INSERT INTO member_status_history
        (member_id, old_status, new_status, changed_by, reason, created_at)
       SELECT m.id, m.status, 'Active', NULL, :reason, CURRENT_TIMESTAMP
       FROM members AS m
       WHERE m.status IN (${oldStatusSql})
         AND NOT EXISTS (
           SELECT 1 FROM member_status_history AS h
           WHERE h.member_id = m.id
             AND h.old_status = m.status
             AND h.new_status = 'Active'
             AND h.reason = :reason
         )`,
      { replacements: { reason: NORMALIZATION_REASON } },
    );

    await queryInterface.sequelize.query(
      `UPDATE members SET status = 'Active' WHERE status IN (${oldStatusSql})`,
    );
    await queryInterface.changeColumn("members", "status", {
      type: Sequelize.ENUM("Active", "Inactive"),
      allowNull: false,
      defaultValue: "Active",
    });
  },

  async down() {
    throw new Error(
      "Member statuses were normalized with an audited data mapping. Restore from a backup or write a forward migration; do not infer prior statuses.",
    );
  },
};
