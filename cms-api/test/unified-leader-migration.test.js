const migration = require('../migrations/20261007000004-add-unified-leader-role');

describe('unified Leader migration rollback guards', () => {
  it('refuses rollback while Leader accounts still exist', async () => {
    const query = jest.fn().mockResolvedValue([[{ count: 1 }], []]);
    const queryInterface = { sequelize: { query } };

    await expect(migration.down(queryInterface)).rejects.toThrow(
      'Cannot undo unified Leader support while Leader accounts exist',
    );
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('refuses rollback after assignment history has been recorded', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([[{ count: 0 }], []])
      .mockResolvedValueOnce([[{ count: 1 }], []]);
    const queryInterface = { sequelize: { query } };

    await expect(migration.down(queryInterface)).rejects.toThrow(
      'Cannot remove recorded leader-assignment history',
    );
    expect(query).toHaveBeenCalledTimes(2);
  });
});
