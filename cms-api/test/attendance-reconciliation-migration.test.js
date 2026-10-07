const Sequelize = require("sequelize");
const migration = require("../migrations/20261008000001-add-session-reconciliation-state");

describe("attendance session reconciliation migration", () => {
  const queryInterface = () => ({
    sequelize: {
      QueryTypes: { SELECT: "SELECT" },
      query: jest.fn().mockResolvedValue([]),
    },
    describeTable: jest.fn().mockResolvedValue({ id: { type: "INTEGER" } }),
    addColumn: jest.fn().mockResolvedValue(undefined),
    addConstraint: jest.fn().mockResolvedValue(undefined),
    showIndex: jest.fn().mockResolvedValue([]),
    addIndex: jest.fn().mockResolvedValue(undefined),
  });

  it("adds revision, actual-close and finalization fields with a report index", async () => {
    const qi = queryInterface();
    await migration.up(qi, Sequelize);

    expect(qi.addColumn).toHaveBeenCalledTimes(6);
    expect(qi.addColumn).toHaveBeenCalledWith("attendance_sessions", "activity_revision", expect.objectContaining({ defaultValue: 1 }));
    expect(qi.addColumn).toHaveBeenCalledWith("attendance_sessions", "finalized_at", expect.objectContaining({ allowNull: true }));
    expect(qi.addConstraint).toHaveBeenCalledWith("attendance_sessions", expect.objectContaining({
      name: "fk_attendance_sessions_finalized_by",
      fields: ["finalized_by"],
      onDelete: "SET NULL",
    }));
    expect(qi.addIndex).toHaveBeenCalledWith("attendance_sessions", expect.objectContaining({
      name: "idx_attendance_sessions_finalized_status",
    }));
  });

  it("is safe to rerun after partial application", async () => {
    const qi = queryInterface();
    qi.describeTable.mockResolvedValue({
      id: { type: "INTEGER" },
      config_revision: { type: "INTEGER" },
      activity_revision: { type: "INTEGER" },
      capture_closed_at: { type: "DATE" },
      finalized_at: { type: "DATE" },
      finalized_by: { type: "INTEGER" },
      finalized_revision: { type: "INTEGER" },
    });
    qi.sequelize.query.mockResolvedValue([{ CONSTRAINT_NAME: "fk_attendance_sessions_finalized_by" }]);
    qi.showIndex.mockResolvedValue([{ name: "idx_attendance_sessions_finalized_status" }]);

    await migration.up(qi, Sequelize);

    expect(qi.addColumn).not.toHaveBeenCalled();
    expect(qi.addConstraint).not.toHaveBeenCalled();
    expect(qi.addIndex).not.toHaveBeenCalled();
  });

  it("preserves reconciliation history on rollback", async () => {
    await expect(migration.down()).rejects.toThrow(/forward-only/);
  });
});
