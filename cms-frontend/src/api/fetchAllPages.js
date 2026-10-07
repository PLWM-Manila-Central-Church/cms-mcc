import axiosInstance from './axiosInstance';

const PAGE_SIZE = 100;
const PAGE_BATCH_SIZE = 5;
const MAX_PAGES = 100;

export async function fetchAllPages(endpoint, collectionKey, params = {}) {
  const firstResponse = await axiosInstance.get(endpoint, {
    params: { ...params, page: 1, limit: PAGE_SIZE },
  });
  const firstPage = firstResponse.data?.data || {};
  const records = Array.isArray(firstPage[collectionKey]) ? [...firstPage[collectionKey]] : [];
  const totalPages = Math.max(1, Number(firstPage.total_pages) || 1);

  if (totalPages > MAX_PAGES) {
    throw new Error(`The ${collectionKey} list exceeds the supported dropdown size. Narrow the list before loading it.`);
  }

  for (let startPage = 2; startPage <= totalPages; startPage += PAGE_BATCH_SIZE) {
    const pages = Array.from(
      { length: Math.min(PAGE_BATCH_SIZE, totalPages - startPage + 1) },
      (_, index) => startPage + index,
    );
    const responses = await Promise.all(pages.map((page) => axiosInstance.get(endpoint, {
      params: { ...params, page, limit: PAGE_SIZE },
    })));
    responses.forEach((response) => {
      const pageRecords = response.data?.data?.[collectionKey];
      if (Array.isArray(pageRecords)) records.push(...pageRecords);
    });
  }

  return records;
}
