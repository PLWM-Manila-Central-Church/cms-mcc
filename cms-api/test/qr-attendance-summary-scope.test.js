const { Op } = require('sequelize');
const {
  getHistoricalScopeWhere,
  getPendingBatchWhere,
  getSnapshotScopeQuery,
} = require('../src/modules/qr-attendance/summary.service');

describe('QR attendance combined leader summary scope', () => {
  const scope = {
    type: 'all',
    assignments: [
      { type: 'cell_group', id: 8 },
      { type: 'group', id: 3 },
    ],
  };

  it('uses the persisted snapshot column names for both assigned team types', () => {
    expect(getSnapshotScopeQuery(scope, '_id_at_check_in')).toEqual({
      [Op.or]: [
        { cell_group_id_at_check_in: 8 },
        { group_id_at_check_in: 3 },
      ],
    });

    const where = getHistoricalScopeWhere(scope, '_id_at_check_in', [14, 15]);
    const [snapshot, fallback] = where[Op.or];
    expect(snapshot[Op.or]).toEqual([
      { cell_group_id_at_check_in: 8 },
      { group_id_at_check_in: 3 },
    ]);
    expect(fallback[Op.and]).toEqual([
      { cell_group_id_at_check_in: null },
      { group_id_at_check_in: null },
      { member_id: { [Op.in]: [14, 15] } },
    ]);
  });

  it('counts pending batches only from the leader’s assigned teams', () => {
    expect(getPendingBatchWhere(scope)).toEqual({
      [Op.or]: [
        { cell_group_id: 8 },
        { group_id: 3 },
      ],
    });
  });
});
