import { Children, cloneElement, isValidElement } from 'react';

const textOf = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : isValidElement(node) ? Children.toArray(node.props.children).map(textOf).join(' ') : '';
const hasCheckbox = node => isValidElement(node) && (node.type === 'input' && node.props.type === 'checkbox'
  || Children.toArray(node.props.children).some(hasCheckbox));
const labelCheckboxes = (node, label) => {
  if (!isValidElement(node)) return node;
  if (node.type === 'input' && node.props.type === 'checkbox') return cloneElement(node, { 'aria-label': node.props['aria-label'] || label });
  return node.props.children ? cloneElement(node, {}, Children.toArray(node.props.children).map(child => labelCheckboxes(child, label))) : node;
};

/** Keep the same records, handlers and table semantics; label cells for phone cards. */
export default function ResponsiveTable({ children, className = '', ...props }) {
  const sections = Children.toArray(children);
  const head = sections.find(section => isValidElement(section) && section.type === 'thead');
  const headerRow = head && Children.toArray(head.props.children).find(row => isValidElement(row) && row.type === 'tr');
  const headers = headerRow ? Children.toArray(headerRow.props.children) : [];
  const labels = headers.map(header => textOf(header).replace(/[⇅↑↓↕]/g, '').trim() || 'Select');
  const transform = node => {
    if (!isValidElement(node)) return node;
    if (node.type === 'tr') return cloneElement(node, { role: 'row' }, Children.toArray(node.props.children).map((cell,index) => {
      if (!isValidElement(cell)) return cell;
      const selection = cell.type === 'th' && hasCheckbox(cell);
      const labeledCell = labelCheckboxes(cell, cell.type === 'th' ? 'Select all displayed records' : 'Select this record');
      return cloneElement(labeledCell, {
        ...(cell.type === 'td' ? { 'data-label': labels[index] || '', role: 'cell' } : { role: 'columnheader' }),
        className: `${cell.props.className || ''}${selection ? ' mcc-selection-header' : ''}`,
      });
    }));
    if (node.type === 'thead' || node.type === 'tbody') return cloneElement(node, { role: 'rowgroup' }, Children.toArray(node.props.children).map(transform));
    return node;
  };
  return <table {...props} role="table" className={`mcc-responsive-table ${className}`}>{sections.map(transform)}</table>;
}
