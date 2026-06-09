// Consistent pagination response builder.
// Usage:
//   const { rows, count } = await Model.findAndCountAll({ ... });
//   res.json(paginate("members", rows, { page, limit }, count));

exports.paginate = (key, rows, query, totalItems) => {
  const page  = parseInt(query.page)  || 1;
  const limit = parseInt(query.limit) || 20;

  return {
    [key]: rows,
    pagination: {
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalItems / limit) || 0,
      totalItems,
    },
  };
};