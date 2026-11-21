const WIDTH = 640;
const PAD = { top: 18, right: 14, bottom: 28, left: 14 };

const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function LineTrend({
  points = [],
  series = [],
  height = 220,
  valueFormat = String,
  ariaLabel = 'Trend',
  emptyLabel = 'No records for this period.',
}) {
  if (points.length === 0 || series.length === 0) {
    return <p className="ar-empty">{emptyLabel}</p>;
  }

  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => series.map((entry) => numberOrZero(point.values?.[entry.key]))),
  );
  const yMax = Math.max(1, maxValue * 1.12);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;
  const baseline = height - PAD.bottom;
  const isSinglePoint = points.length === 1;

  const xFor = (index) => (
    isSinglePoint
      ? WIDTH / 2
      : PAD.left + index * (plotWidth / (points.length - 1))
  );
  const yFor = (value) => Number(
    (height - PAD.bottom - (numberOrZero(value) / yMax) * plotHeight).toFixed(2),
  );

  const coordsFor = (entry) => points.map((point, index) => ({
    x: Number(xFor(index).toFixed(2)),
    y: yFor(point.values?.[entry.key]),
  }));

  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const showDots = points.length <= 24;
  const yTicks = [0, 0.5, 1];

  return (
    <div className="ar-line-wrap">
      <svg
        className="ar-line-chart"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        {yTicks.map((tick) => {
          const y = Number((baseline - tick * plotHeight).toFixed(2));
          return (
            <g key={tick}>
              <line className="ar-grid-line" x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} />
              <text className="ar-axis-label" x={WIDTH - PAD.right} y={y - 4} textAnchor="end">
                {valueFormat(Math.round(yMax * tick))}
              </text>
            </g>
          );
        })}

        {series.map((entry, seriesIndex) => {
          const coords = coordsFor(entry);
          const linePath = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x} ${coord.y}`).join(' ');
          const areaPath = coords.length > 1
            ? `${linePath} L${coords[coords.length - 1].x} ${baseline} L${coords[0].x} ${baseline} Z`
            : null;

          return (
            <g key={entry.key} className="ar-line-group">
              {seriesIndex === 0 && areaPath ? (
                <path className="ar-area" d={areaPath} fill={entry.color} fillOpacity="0.08" />
              ) : null}
              <path className="ar-line" d={linePath} fill="none" stroke={entry.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {isSinglePoint ? (
                <line
                  className="ar-line-stub"
                  x1={coords[0].x - 10}
                  x2={coords[0].x + 10}
                  y1={baseline}
                  y2={baseline}
                  stroke={entry.color}
                  strokeWidth="2"
                />
              ) : null}
              {showDots ? coords.map((coord, index) => (
                <circle
                  key={`${entry.key}-${points[index].label}`}
                  className="ar-dot"
                  cx={coord.x}
                  cy={coord.y}
                  r="3.2"
                  fill="#fff"
                  stroke={entry.color}
                  strokeWidth="2"
                >
                  <title>{`${points[index].label} · ${entry.label}: ${valueFormat(points[index].values?.[entry.key] ?? 0)}`}</title>
                </circle>
              )) : null}
            </g>
          );
        })}

        {points.map((point, index) => (
          index % labelStep === 0 || index === points.length - 1 ? (
            <text
              key={`x-${point.label}`}
              className="ar-axis-label"
              x={Number(xFor(index).toFixed(2))}
              y={height - 8}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
            >
              {point.label}
            </text>
          ) : null
        ))}
      </svg>

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((entry) => <th key={entry.key} scope="col">{entry.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={`row-${point.label}`}>
              <th scope="row">{point.label}</th>
              {series.map((entry) => (
                <td key={`${entry.key}-${point.label}`}>
                  {String(numberOrZero(point.values?.[entry.key]))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
