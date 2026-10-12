"use strict";

const { appendOtherGroupSummary } = require("../src/helpers/analyticsDemographics.helper");

describe("analytics demographic group summaries", () => {
  test("adds an Other row so a bounded top-20 chart reconciles to the full member denominator", () => {
    const topRows = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      label: `Group ${index + 1}`,
      total: 5,
    }));

    const rows = appendOtherGroupSummary(topRows, {
      totalMembers: 164,
      totalCategories: 69,
      categoryLabel: "cell groups",
    });

    expect(rows).toHaveLength(21);
    expect(rows.at(-1)).toEqual({ id: null, label: "Other (49 cell groups)", total: 64 });
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(164);
  });

  test("leaves a complete short distribution unchanged", () => {
    const rows = [
      { id: 1, label: "Group A", total: "3" },
      { id: null, label: "Unassigned", total: 2 },
    ];

    expect(appendOtherGroupSummary(rows, {
      totalMembers: 5,
      totalCategories: 2,
      categoryLabel: "groups",
    })).toEqual([
      { id: 1, label: "Group A", total: 3 },
      { id: null, label: "Unassigned", total: 2 },
    ]);
  });
});
