export default function RankedBars({
  rows = [],
  limit = 10,
  color = '#005599',
  emptyLabel = 'No records for this period.',
}) {
  const sorted = [...rows].sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  const isOther = (row) => /^Other\b/i.test(String(row.label || ''));
  const ordered = [...sorted.filter((row) => !isOther(row)), ...sorted.filter(isOther)];
  const shown = ordered.slice(0, limit);

  if (shown.length === 0) return <p className="ar-empty">{emptyLabel}</p>;

  const max = Math.max(1, ...shown.map((row) => Number(row.total || 0)));

  return (
    <ol className="ar-ranked">
      {shown.map((row) => {
        const total = Number(row.total || 0);
        const width = Math.min(100, (total / max) * 100);
        return (
          <li className="ar-ranked-row" key={`${row.id ?? ''}-${row.label}`}>
            <span className="ar-ranked-label" title={row.label}>{row.label}</span>
            <span className="ar-ranked-track">
              <span
                className="ar-ranked-bar"
                style={{ width: `${width}%`, background: color }}
              />
            </span>
            <span className="ar-ranked-value">{total.toLocaleString('en-PH')}</span>
          </li>
        );
      })}
    </ol>
  );
}
