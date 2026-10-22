export const archiveRecordsWithResults = async (ids, archiveRecord) => {
  let archivedCount = 0;
  const failures = [];

  for (const id of ids) {
    try {
      await archiveRecord(id);
      archivedCount += 1;
    } catch (error) {
      failures.push({ id, error });
    }
  }

  return { archivedCount, failures };
};
