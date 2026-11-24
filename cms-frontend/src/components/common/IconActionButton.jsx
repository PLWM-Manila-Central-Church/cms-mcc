import MonoIcon from './MonoIcon';

export default function IconActionButton({
  icon,
  label,
  title,
  onClick,
  disabled = false,
  tone = 'neutral',
  size = 'sm',
  type = 'button',
  href,
  download,
  className = '',
  style,
  iconSize,
  ...rest
}) {
  const tooltip = title || label;
  const resolvedIconSize = iconSize ?? (size === 'xs' ? 14 : size === 'md' ? 17 : 15);
  const classes = `mcc-icon-btn mcc-icon-btn--${tone} mcc-icon-btn--${size}${className ? ` ${className}` : ''}`;

  if (href) {
    return (
      <a
        href={href}
        download={download}
        aria-label={label}
        title={tooltip}
        className={classes}
        style={style}
        {...rest}
      >
        <MonoIcon name={icon} size={resolvedIconSize} />
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={tooltip}
      className={classes}
      style={style}
      {...rest}
    >
      <MonoIcon name={icon} size={resolvedIconSize} />
    </button>
  );
}
