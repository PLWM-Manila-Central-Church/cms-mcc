const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2;
const DEFAULT_COLORS = ['#005599', '#13b5ea', '#5c9dc4', '#9dc0d8', '#cfe0ea'];

const share = (value, sum) => (sum > 0 ? (Number(value) || 0) / sum : 0);
const percentLabel = (value, sum) => {
  const pct = share(value, sum) * 100;
  const rounded = Number(pct.toFixed(1));
  return `${Number.isInteger(rounded) ? rounded : rounded}%`;
};

export default function DonutBreakdown({
  rows = [],
  total,
  centerLabel = '',
  colors = DEFAULT_COLORS,
  ariaLabel = 'Breakdown',
  emptyLabel = 'No records for this period.',
}) {
  if (rows.length === 0) return <p className="ar-empty">{emptyLabel}</p>;

  const sum = rows.reduce((accumulator, row) => accumulator + (Number(row.total) || 0), 0);
  const displayTotal = Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : sum;
  const hasData = sum > 0;

  let offset = 0;
  const slices = rows.map((row, index) => {
    const value = Number(row.total) || 0;
    const fraction = share(value, sum);
    const length = fraction > 0 ? Math.max(0, fraction * CIRCUMFERENCE - GAP) : 0;
    const startOffset = -offset;
    offset += fraction * CIRCUMFERENCE;
    if (length <= 0) return null;
    return {
      key: `${row.label}-${index}`,
      label: row.label,
      color: colors[index % colors.length],
      dashArray: `${length} ${CIRCUMFERENCE - length}`,
      dashOffset: startOffset,
    };
  }).filter(Boolean);

  return (
    <div className="ar-donut" role="group" aria-label={ariaLabel}>
      <div className="ar-donut-figure">
        <svg className="ar-donut-svg" viewBox="0 0 160 160" role="presentation" aria-hidden="true" focusable="false">
          <circle
            className="ar-donut-ring"
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="18"
          />
          {hasData ? slices.map((slice) => (
            <circle
              key={slice.key}
              className="ar-donut-slice"
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth="18"
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              transform="rotate(-90 80 80)"
            />
          )) : null}
        </svg>
        <div className="ar-donut-center">
          <span className="ar-donut-total">{displayTotal.toLocaleString('en-PH')}</span>
          <span className="ar-donut-caption">{centerLabel}</span>
        </div>
      </div>

      <ul className="ar-legend">
        {rows.map((row, index) => (
          <li className="ar-legend-row" key={`${row.label}-legend-${index}`}>
            <span
              className="ar-legend-swatch"
              style={{ background: colors[index % colors.length] }}
              aria-hidden="true"
            />
            <span className="ar-legend-label">{row.label}</span>
            <span className="ar-legend-value">{(Number(row.total) || 0).toLocaleString('en-PH')}</span>
            <span className="ar-legend-share">{percentLabel(row.total, sum)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
