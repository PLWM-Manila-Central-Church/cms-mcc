import MonoIcon from './MonoIcon';

/**
 * Consistent minimal pagination bar for all 100+ record tables.
 */
export default function CompactPagination({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 20,
  onPageChange,
  onLimitChange,
  pageSizes = [15, 25, 50],
  itemLabel = 'items',
}) {
  const safeTotal = Number(total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);

  if (safeTotal === 0 && safeTotalPages <= 1) return null;

  const start = safeTotal === 0 ? 0 : (safePage - 1) * safeLimit + 1;
  const end = Math.min(safeTotal, safePage * safeLimit);

  return (
    <div className="mcc-pagination-bar" role="navigation" aria-label="Pagination">
      <div className="mcc-pagination-meta">
        <span>
          Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{safeTotal}</strong> {itemLabel}
        </span>
        {onLimitChange && (
          <label className="mcc-pagination-size">
            <span>Rows</span>
            <select
              aria-label="Rows per page"
              value={safeLimit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              {pageSizes.map((sz) => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {safeTotalPages > 1 && (
        <div className="mcc-pagination-controls">
          <button
            type="button"
            className="mcc-page-btn"
            onClick={() => onPageChange?.(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            aria-label="Previous page"
          >
            <MonoIcon name="chevronLeft" size={14} /> Prev
          </button>
          <span className="mcc-page-indicator">
            Page <strong>{safePage}</strong> of <strong>{safeTotalPages}</strong>
          </span>
          <button
            type="button"
            className="mcc-page-btn"
            onClick={() => onPageChange?.(Math.min(safeTotalPages, safePage + 1))}
            disabled={safePage >= safeTotalPages}
            aria-label="Next page"
          >
            Next <MonoIcon name="chevronRight" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
