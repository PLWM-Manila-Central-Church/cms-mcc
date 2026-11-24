"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const rows = await sequelize.query(
        `SELECT id, name FROM cell_groups
         WHERE is_deleted = 0 AND LOWER(TRIM(name)) IN
           ('cell group 54 (name pending)', 'cell group 54', 'cellgroup 54', 'sample cell group', 'sample cellgroup')
         FOR UPDATE`,
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      for (const { id, name } of rows) {
        const [usage] = await sequelize.query(
          `SELECT EXISTS (SELECT 1 FROM members WHERE cell_group_id = :id) AS has_members,
                  EXISTS (SELECT 1 FROM user_leader_assignments WHERE scope_type = 'cell_group' AND scope_id = :id)
                    OR EXISTS (SELECT 1 FROM users WHERE leads_cell_group_id = :id AND is_deleted = 0) AS has_leaders`,
          { replacements: { id }, type: Sequelize.QueryTypes.SELECT, transaction },
        );
        if (Number(usage.has_members) || Number(usage.has_leaders)) {
          console.warn(`Cell group cleanup skipped ${name} (#${id}) because it has member or leader assignments.`);
          continue;
        }
        await queryInterface.bulkUpdate(
          "cell_groups", { is_deleted: 1, deleted_at: new Date() }, { id, is_deleted: 0 }, { transaction },
        );
        console.info(`Cell group cleanup archived ${name} (#${id}).`);
      }
    });
  },

  // Historical records remain available. Restoring a group is a separate archive action.
  async down() {},
};
