export default function RankedBars({
  rows = [],
  limit = 10,
  color = '#005599',
  emptyLabel = 'No records for this period.',
}) {
  const sorted = [...rows].sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  const isOther = (row) => /^Other\b/i.test(String(row.label || ''));
  const ordered = [...sorted.filter((row) => !isOther(row)), ...sorted.filter(isOther)];
  const others = ordered.filter(isOther);
  const named = ordered.filter((row) => !isOther(row));
  const reserveForOther = others.length > 0 ? 1 : 0;
  const shown = [
    ...named.slice(0, Math.max(0, limit - reserveForOther)),
    ...others.slice(0, 1),
  ];
  const truncated = rows.length > shown.length;

  if (shown.length === 0) return <p className="ar-empty">{emptyLabel}</p>;

  const namedShown = shown.filter((row) => !isOther(row));
  const max = Math.max(1, ...(namedShown.length ? namedShown : shown).map((row) => Number(row.total || 0)));

  return (
    <>
      <ol className="ar-ranked">
      {shown.map((row) => {
        const total = Number(row.total || 0);
        const otherRow = isOther(row);
        const width = Math.min(100, (total / max) * 100);
        return (
          <li
            className={`ar-ranked-row${otherRow ? ' ar-ranked-row--other' : ''}`}
            key={`${row.id ?? ''}-${row.label}`}
            style={otherRow ? { borderTop: '1px dashed #e2e8f0', paddingTop: 8, marginTop: 2 } : undefined}
          >
            <span className="ar-ranked-label" title={row.label}>{row.label}</span>
            <span className="ar-ranked-track">
              <span
                className="ar-ranked-bar"
                style={{ width: `${width}%`, background: otherRow ? '#9dc0d8' : color }}
              />
            </span>
            <span className="ar-ranked-value">{total.toLocaleString('en-PH')}</span>
          </li>
        );
      })}
      </ol>
      {truncated ? (
        <p className="ar-ranked-note">
          {`Showing top ${shown.length - reserveForOther} of ${rows.length} groups; the rest are ${
            reserveForOther ? 'combined in the Other total' : 'not shown'
          }.`}
        </p>
      ) : null}
    </>
  );
}
