export default function MetricRail({ items = [], orientation = 'vertical' }) {
  return (
    <dl className={`ar-rail ar-rail--${orientation}`}>
      {items.map((item) => (
        <div className="ar-rail-item" key={`${item.label}-${item.value}`}>
          <dt className="ar-rail-label">{item.label}</dt>
          <dd className="ar-rail-value" title={item.title || undefined}>{item.value}</dd>
          {item.hint ? <span className="ar-rail-hint">{item.hint}</span> : null}
        </div>
      ))}
    </dl>
  );
}
