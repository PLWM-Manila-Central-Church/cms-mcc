"use strict";

const asNumber = (value) => Number(value || 0);

const appendOtherGroupSummary = (rows, { totalMembers, totalCategories, categoryLabel }) => {
  const normalized = rows.map((row) => ({ ...row, total: asNumber(row.total) }));
  const otherCategoryCount = Math.max(0, asNumber(totalCategories) - normalized.length);
  if (!otherCategoryCount) return normalized;

  const visibleMembers = normalized.reduce((sum, row) => sum + row.total, 0);
  const otherMembers = Math.max(0, asNumber(totalMembers) - visibleMembers);
  return [
    ...normalized,
    { id: null, label: `Other (${otherCategoryCount} ${categoryLabel})`, total: otherMembers },
  ];
};

module.exports = { appendOtherGroupSummary };
