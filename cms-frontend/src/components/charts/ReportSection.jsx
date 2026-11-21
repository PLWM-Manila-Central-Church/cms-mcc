export default function ReportSection({ title, hint, actions, children, className = '', ...rest }) {
  return (
    <section className={`ar-section ${className}`.trim()} {...rest}>
      <header className="ar-section-head">
        <h2 className="ar-section-title">{title}</h2>
        {actions ? <div className="ar-section-actions">{actions}</div> : null}
      </header>
      {hint ? <p className="ar-section-hint">{hint}</p> : null}
      <div className="ar-section-body">{children}</div>
    </section>
  );
}
