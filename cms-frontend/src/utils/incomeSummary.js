const amountToCents = (amount) => {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return 0;
  const cents = Math.round((value + Math.sign(value) * Number.EPSILON) * 100);
  return Math.abs(cents) < 1 ? 0 : cents;
};

export const getIncomeSummaryAmounts = (summary = []) => {
  const totalCents = summary.reduce((sum, row) => sum + amountToCents(row.total_amount), 0);
  const tithesCents = amountToCents(summary.find((row) => row.category?.name === 'Tithes')?.total_amount);
  const offeringsCents = amountToCents(summary.find((row) => row.category?.name === 'Offering')?.total_amount);
  const otherCents = totalCents - tithesCents - offeringsCents;

  return {
    total: totalCents / 100,
    tithes: tithesCents / 100,
    offerings: offeringsCents / 100,
    other: (Math.abs(otherCents) < 1 ? 0 : otherCents) / 100,
  };
};
