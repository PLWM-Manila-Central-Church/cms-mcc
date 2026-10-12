export const deleteRecordsWithResults = async (ids, deleteRecord) => {
  let deletedCount = 0;
  const failures = [];

  for (const id of ids) {
    try {
      await deleteRecord(id);
      deletedCount += 1;
    } catch (error) {
      failures.push({ id, error });
    }
  }

  return { deletedCount, failures };
};
