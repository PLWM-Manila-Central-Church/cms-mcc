const migration = require('../migrations/20261007000006-grant-pastor-service-attendance-read');

describe('Pastor attendance read-grant migration', () => {
  it('adds only idempotent Service and attendance read grants', async () => {
    const query = jest.fn().mockResolvedValue([[], []]);
    await migration.up({ sequelize: { query } });

    expect(query).toHaveBeenCalledTimes(4);
    const sqlStatements = query.mock.calls.map(([sql]) => sql);
    expect(sqlStatements.every((sql) => sql.includes('NOT EXISTS'))).toBe(true);
    expect(sqlStatements[1]).toContain("role.role_name = 'Pastor'");
    expect(sqlStatements[3]).toContain("role.role_name = 'Pastor'");
    expect(query.mock.calls[0][1].replacements).toMatchObject({ module: 'services', action: 'read' });
    expect(query.mock.calls[2][1].replacements).toMatchObject({ module: 'attendance', action: 'read' });
  });

  it('does not remove potentially customized grants during rollback', async () => {
    await expect(migration.down()).rejects.toThrow(/forward-only/);
  });
});
