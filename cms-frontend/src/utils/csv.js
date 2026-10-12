export const escapeCsvCell = (value) => {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export const toCsv = (rows) => rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
