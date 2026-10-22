import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';
import {
  buildFinanceStatement,
  buildFinanceStatementCsvRows,
  FINANCE_STATEMENT_CHURCH_NAME,
} from './financeStatement';

describe('finance statement', () => {
  const income = [
    { id: 1, transaction_date: '2026-01-15', amount: '100.00', category: { name: 'Tithes' }, Member: { last_name: 'Sarmiento', first_name: 'Christian' }, payment_method: 'bank_transfer' },
    { id: 2, transaction_date: '2026-02-01', amount: '25.50', category: { name: 'Offering' }, is_anonymous: true, receipt_number: 'R-2' },
    { id: 3, transaction_date: '2026-02-03', amount: '500.00', category: { name: 'Tithes' }, Member: { last_name: 'Doe', first_name: 'Alex' } },
  ];
  const expenses = [
    { id: 1, date: '2026-01-20', amount: '20.00', category: { category_name: 'Supplies' }, paymentMethod: { method_name: 'Cash' }, description: 'Paper' },
    { id: 2, date: '2026-02-02', amount: '10.25', category: { category_name: 'Utilities' }, paymentMethod: { method_name: 'Bank transfer' } },
  ];

  it('calculates a date-bounded statement with opening and chronological running balances', () => {
    const statement = buildFinanceStatement(income, expenses, '2026-02-01', '2026-02-02');

    expect(statement.openingBalanceCents).toBe(8000);
    expect(statement.incomeCents).toBe(2550);
    expect(statement.expenseCents).toBe(1025);
    expect(statement.closingBalanceCents).toBe(9525);
    expect(statement.transactions.map(({ date, type, particulars, runningBalanceCents }) => ({ date, type, particulars, runningBalanceCents }))).toEqual([
      { date: '2026-02-01', type: 'Income', particulars: 'Anonymous giving', runningBalanceCents: 10550 },
      { date: '2026-02-02', type: 'Expense', particulars: 'Utilities', runningBalanceCents: 9525 },
    ]);
  });

  it('formats named givers as Surname, Given name and labels statement type in CSV', () => {
    const statement = buildFinanceStatement(income, expenses, '', '2026-01-31');
    const rows = buildFinanceStatementCsvRows(statement, new Date('2026-02-01T00:00:00.000Z'));

    expect(rows[0]).toEqual([FINANCE_STATEMENT_CHURCH_NAME]);
    expect(rows[1]).toEqual(['FINANCE STATEMENT OF ACCOUNT']);
    expect(rows[2]).toEqual(['Statement period', 'All available records', '2026-01-31']);
    expect(rows[12]).toEqual(['Date', 'Record type', 'Category', 'Name / description', 'Reference', 'Payment method', 'Income (PHP)', 'Expense (PHP)', 'Running recorded balance (PHP)']);
    expect(rows[13]).toEqual(['2026-01-15', 'Income', 'Tithes', 'Sarmiento, Christian', '', 'Bank Transfer', 100, 0, 100]);
    expect(rows[14]).toEqual(['2026-01-20', 'Expense', 'Supplies', 'Paper', '', 'Cash', 0, 20, 80]);

    const csv = toCsv(rows);
    expect(csv).toContain('"PLWM - MANILA CENTRAL CHURCH"');
    expect(csv).toContain('"FINANCE STATEMENT OF ACCOUNT"');
    expect(csv).toContain('"Income received (PHP)","100"');
    expect(csv).toContain('"Sarmiento, Christian"');
    expect(csv).toContain('"Running recorded balance (PHP)"');
  });

  it('rejects an inverted report period', () => {
    expect(() => buildFinanceStatement(income, expenses, '2026-02-03', '2026-02-01'))
      .toThrow('The statement start date must be on or before the end date.');
  });
});
