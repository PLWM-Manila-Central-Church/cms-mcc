import { toCsv } from './csv.js';
import { CHURCH_REPORT_NAME } from './reportBranding.js';

export async function downloadReportCsv(filename, title, metadata, sections, format = "csv") {
  const generated = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
  }).format(new Date());
  const rows = [
    [CHURCH_REPORT_NAME], [title], ...metadata, ['Generated (Asia/Manila)', generated],
    ...sections.flatMap(({ title: heading, columns, records }) => [[], [heading], columns, ...records]),
  ];
  const width = Math.max(...rows.map((row) => row.length));
  const rectangular = rows.map((row) => [...row, ...Array(width - row.length).fill('')]);
  const blob = format === 'xlsx'
    ? new Blob([await buildReportWorkbook(title, metadata, sections, generated)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    : new Blob(['\uFEFF', toCsv(rectangular)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = format === 'xlsx' ? filename.replace(/\.csv$/i, '.xlsx') : filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function buildReportWorkbook(title, metadata, sections, generated) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const width = Math.max(3, ...sections.map((section) => section.columns.length));
  for (let index = 1; index <= width; index++) sheet.getColumn(index).width = index === 1 ? 30 : 24;
  const band = (text, size, color, background) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, width);
    row.height = size + 12;
    row.getCell(1).font = { name: 'Calibri', bold: true, size, color: { argb: color } };
    if (background) row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: background } };
  };
  band(CHURCH_REPORT_NAME, 12, 'FFFFFFFF', 'FF003D70');
  band(title, 22, 'FF003D70');
  for (const [label, ...values] of [...metadata, ['Generated (Asia/Manila)', generated]]) {
    const row = sheet.addRow([label, values.join(' ')]);
    sheet.mergeCells(row.number, 2, row.number, width);
    row.getCell(1).font = { bold: true, color: { argb: 'FF003D70' } };
    row.getCell(2).alignment = { wrapText: true };
    row.height = Math.max(19, 16 * Math.ceil(values.join(' ').length / ((width - 1) * 24)));
  }
  for (const { title: heading, columns, records } of sections) {
    sheet.addRow([]);
    band(heading, 15, 'FF003D70', 'FFE7F1F9');
    const headers = sheet.addRow(columns);
    headers.height = 31;
    headers.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF003D70' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    records.forEach((record, index) => {
      const row = sheet.addRow(record.map((value) => value ?? ''));
      let lines = 1;
      row.eachCell((cell, column) => {
        cell.alignment = { wrapText: true, vertical: 'top' };
        if (index % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F7FA' } };
        if (typeof cell.value === 'number' && columns[column - 1]?.includes('(PHP)')) cell.numFmt = '#,##0.00;[Red](#,##0.00)';
        const chars = sheet.getColumn(column).width - 3;
        lines = Math.max(lines, String(cell.value).split(/\r?\n/).reduce((total, text) => total + Math.max(1, Math.ceil(text.length / chars)), 0));
      });
      row.height = Math.min(409, Math.max(20, 16 * lines + 4));
    });
  }
  return workbook.xlsx.writeBuffer();
}

// Existing server exports quote every field, including embedded newlines.
export async function downloadServerReportExcel(filename, title, blob) {
  const source = (await blob.text()).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\r' || char === '\n')) {
      row.push(field); field = '';
      if (char !== ',') {
        rows.push(row); row = [];
        if (char === '\r' && source[index + 1] === '\n') index++;
      }
    } else field += char;
  }
  if (quoted) throw new Error('The server returned an incomplete report.');
  if (row.length || field) rows.push([...row, field]);
  const detail = rows.findIndex(([name]) => ['Attendance details', 'Confirmed attendance'].includes(name));
  const columns = rows[detail + 1];
  if (detail < 0 || !columns?.[0]) throw new Error('The server report format is unavailable.');
  return downloadReportCsv(filename, title, rows.slice(2, detail).filter((values) => values[1] && !values[0].startsWith('Generated'))
    .map(([label, ...values]) => [label, values.filter(Boolean).join(' to ')]), [{
    title: rows[detail][0], columns,
    records: rows.slice(detail + 2).map((values) => values.map((value, index) =>
      /count|visits|attendees|^Member ID$/i.test(columns[index] || '') && /^\d+$/.test(value) ? Number(value) : value)),
  }], 'xlsx');
}
