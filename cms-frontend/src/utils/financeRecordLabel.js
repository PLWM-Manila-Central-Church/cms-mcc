export const getFinanceRecordLabel = (record) => {
  if (record?.is_anonymous === true || Number(record?.is_anonymous) === 1) {
    return 'Anonymous giving';
  }

  return record?.Member
    ? `${record.Member.first_name} ${record.Member.last_name}`
    : 'Member record';
};
