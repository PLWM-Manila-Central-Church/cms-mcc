import { displayMemberName } from './displayIdentity';
import { CHURCH_REPORT_NAME } from './reportBranding';

export const FINANCE_STATEMENT_CHURCH_NAME = CHURCH_REPORT_NAME;

const toDateOnly = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const toCents = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

const fromCents = (cents) => cents / 100;

const paymentLabel = (value) => {
  const label = String(value || '').trim();
  if (!label) return '';
  return label.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
};

function mapIncome(record) {
  const amountCents = toCents(record.amount);
  return {
    id: Number(record.id) || 0,
    date: toDateOnly(record.transaction_date),
    type: 'Income',
    category: record.category?.name || 'Uncategorized',
    particulars: record.is_anonymous ? 'Anonymous giving' : displayMemberName(record.Member),
    reference: record.receipt_number || '',
    paymentMethod: paymentLabel(record.payment_method),
    incomeCents: amountCents,
    expenseCents: 0,
  };
}

function mapExpense(expense) {
  const category = expense.category?.category_name || expense.category?.name || 'Uncategorized';
  return {
    id: Number(expense.id) || 0,
    date: toDateOnly(expense.date),
    type: 'Expense',
    category,
    particulars: String(expense.description || '').trim() || category,
    reference: '',
    paymentMethod: paymentLabel(expense.paymentMethod?.method_name || expense.payment_method),
    incomeCents: 0,
    expenseCents: toCents(expense.amount),
  };
}

export function buildFinanceStatement(incomeRecords = [], expenses = [], dateFrom = '', dateTo = '') {
  const from = toDateOnly(dateFrom);
  const to = toDateOnly(dateTo);
  if (from && to && from > to) throw new Error('The statement start date must be on or before the end date.');

  const entries = [
    ...incomeRecords.map(mapIncome),
    ...expenses.map(mapExpense),
  ].filter((entry) => entry.date);

  const openingBalanceCents = from
    ? entries.reduce((total, entry) => total + (entry.date < from ? entry.incomeCents - entry.expenseCents : 0), 0)
    : 0;

  const periodEntries = entries.filter((entry) => (
    (!from || entry.date >= from) && (!to || entry.date <= to)
  ));
  periodEntries.sort((a, b) => (
    a.date.localeCompare(b.date)
      || (a.type === b.type ? 0 : a.type === 'Income' ? -1 : 1)
      || a.id - b.id
  ));

  const incomeCents = periodEntries.reduce((total, entry) => total + entry.incomeCents, 0);
  const expenseCents = periodEntries.reduce((total, entry) => total + entry.expenseCents, 0);
  let runningBalanceCents = openingBalanceCents;
  const transactions = periodEntries.map((entry) => {
    runningBalanceCents += entry.incomeCents - entry.expenseCents;
    return { ...entry, runningBalanceCents };
  });

  return {
    dateFrom: from,
    dateTo: to,
    openingBalanceCents,
    incomeCents,
    expenseCents,
    closingBalanceCents: openingBalanceCents + incomeCents - expenseCents,
    transactions,
  };
}

const csvAmount = (cents) => fromCents(cents);

export function buildFinanceStatementCsvRows(statement, generatedAt = new Date()) {
  const generatedLabel = generatedAt instanceof Date
    ? new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    }).format(generatedAt)
    : String(generatedAt || '');

  return [
    [FINANCE_STATEMENT_CHURCH_NAME],
    ['FINANCE STATEMENT OF ACCOUNT'],
    ['Data included', 'Recorded church income and expenses'],
    ['Statement period', statement.dateFrom || 'All available records', statement.dateTo || 'No end date'],
    ['Currency', 'PHP'],
    ['Prepared by', 'PLWM-MCC Finance'],
    ['Generated', generatedLabel],
    [],
    ['ACCOUNT SUMMARY'],
    ['Opening recorded balance (PHP)', csvAmount(statement.openingBalanceCents)],
    ['Income received (PHP)', csvAmount(statement.incomeCents)],
    ['Expenses recorded (PHP)', csvAmount(statement.expenseCents)],
    ['Closing recorded balance (PHP)', csvAmount(statement.closingBalanceCents)],
    ['Transactions included', statement.transactions.length],
    [],
    ['TRANSACTIONS'],
    ['Date', 'Record type', 'Category', 'Name / description', 'Reference', 'Payment method', 'Income (PHP)', 'Expense (PHP)', 'Running recorded balance (PHP)'],
    ...statement.transactions.map((entry) => [
      entry.date,
      entry.type,
      entry.category,
      entry.particulars,
      entry.reference,
      entry.paymentMethod,
      csvAmount(entry.incomeCents),
      csvAmount(entry.expenseCents),
      csvAmount(entry.runningBalanceCents),
    ]),
    [],
    ['Note', 'Balances reflect active income and expense records entered in PLWM-MCC. This statement is not a bank reconciliation.'],
  ];
}
