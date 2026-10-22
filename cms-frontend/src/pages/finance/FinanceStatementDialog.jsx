import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { fetchAllPages } from '../../api/fetchAllPages';
import { toCsv } from '../../utils/csv';
import { buildFinanceStatement, buildFinanceStatementCsvRows, FINANCE_STATEMENT_CHURCH_NAME } from '../../utils/financeStatement';
import './financeStatement.css';

const formatMoney = (cents) => (Number(cents || 0) / 100).toLocaleString('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

const formatDate = (value) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  : '';

const periodLabel = (from, to) => {
  if (!from && !to) return 'All available records';
  if (!from) return `Through ${formatDate(to)}`;
  if (!to) return `From ${formatDate(from)}`;
  return `${formatDate(from)} – ${formatDate(to)}`;
};

export default function FinanceStatementDialog({ dateFrom = '', dateTo = '', onClose }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [downloadNotice, setDownloadNotice] = useState('');

  useEffect(() => {
    let active = true;
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setStatement(null);
      setError('The statement start date must be on or before the end date.');
      setLoading(false);
      return () => { active = false; };
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = dateTo ? { date_to: dateTo } : {};
        const [incomeRecords, expenses] = await Promise.all([
          fetchAllPages('/finance/records', 'records', params),
          fetchAllPages('/finance/expenses', 'expenses', params),
        ]);
        const nextStatement = buildFinanceStatement(incomeRecords, expenses, dateFrom, dateTo);
        if (active) setStatement(nextStatement);
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.message || loadError.message || 'The finance statement could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [dateFrom, dateTo, reloadVersion]);

  const downloadCsv = () => {
    if (!statement) return;
    const rows = buildFinanceStatementCsvRows(statement);
    const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plwm-mcc-finance-statement-${dateFrom || 'all'}-to-${dateTo || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDownloadNotice('CSV download requested.');
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="finance-statement-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="finance-statement-dialog" role="dialog" aria-modal="true" aria-labelledby="finance-statement-title">
        <div className="finance-statement-actions">
          <div className="finance-statement-export-copy">
            <span role="status" aria-live="polite">{downloadNotice || 'Finance statement preview'}</span>
            <small>CSV includes church and report labels. Print / Save PDF preserves the logo and color theme.</small>
          </div>
          <div>
            <button type="button" onClick={downloadCsv} disabled={!statement || loading}>Download CSV</button>
            <button type="button" onClick={() => window.print()} disabled={!statement || loading}>Print / Save PDF</button>
            <button type="button" className="finance-statement-close" onClick={onClose} aria-label="Close finance statement">Close</button>
          </div>
        </div>

        <div className="finance-statement-paper">
          <header className="finance-statement-header">
            <img src="/logo.jpg" alt="PLWM-MCC church logo" />
            <div>
              <p className="finance-statement-brand">{FINANCE_STATEMENT_CHURCH_NAME}</p>
              <h1 id="finance-statement-title">Finance Statement of Account</h1>
              <p className="finance-statement-period">{periodLabel(dateFrom, dateTo)}</p>
              <p className="finance-statement-period-note">Includes all active income categories and expenses for this date range.</p>
            </div>
            <span className="finance-statement-tag">FINANCE RECORD</span>
          </header>

          {loading ? <div className="finance-statement-state" role="status">Loading active finance records…</div> : error ? (
            <div className="finance-statement-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => setReloadVersion((version) => version + 1)}>Try again</button>
            </div>
          ) : statement && <>
            <section className="finance-statement-summary" aria-label="Statement summary">
              {[
                ['Opening recorded balance', statement.openingBalanceCents],
                ['Income received', statement.incomeCents],
                ['Expenses recorded', statement.expenseCents],
                ['Closing recorded balance', statement.closingBalanceCents],
              ].map(([label, value], index) => (
                <article className={index === 3 ? 'finance-statement-total' : ''} key={label}>
                  <span>{label}</span>
                  <strong>{formatMoney(value)}</strong>
                </article>
              ))}
            </section>

            <div className="finance-statement-table-wrap">
              <table className="finance-statement-table">
                <caption>Active income and expense transactions, in date order</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Category</th>
                    <th scope="col">Name / description</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Method</th>
                    <th scope="col" className="finance-statement-number">Income</th>
                    <th scope="col" className="finance-statement-number">Expense</th>
                    <th scope="col" className="finance-statement-number">Running balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.transactions.map((entry, index) => (
                    <tr key={`${entry.type}-${entry.id}-${index}`}>
                      <td>{formatDate(entry.date)}</td>
                      <td><span className={`finance-statement-type finance-statement-type-${entry.type.toLowerCase()}`}>{entry.type}</span></td>
                      <td>{entry.category}</td>
                      <td>{entry.particulars}</td>
                      <td>{entry.reference || '—'}</td>
                      <td>{entry.paymentMethod || '—'}</td>
                      <td className="finance-statement-number">{entry.incomeCents ? formatMoney(entry.incomeCents) : '—'}</td>
                      <td className="finance-statement-number">{entry.expenseCents ? formatMoney(entry.expenseCents) : '—'}</td>
                      <td className="finance-statement-number">{formatMoney(entry.runningBalanceCents)}</td>
                    </tr>
                  ))}
                  {statement.transactions.length === 0 && <tr><td className="finance-statement-empty" colSpan={9}>No active transactions in this period.</td></tr>}
                </tbody>
                {statement.transactions.length > 0 && <tfoot>
                  <tr>
                    <th scope="row" colSpan={6}>Period totals</th>
                    <td className="finance-statement-number">{formatMoney(statement.incomeCents)}</td>
                    <td className="finance-statement-number">{formatMoney(statement.expenseCents)}</td>
                    <td className="finance-statement-number">{formatMoney(statement.closingBalanceCents)}</td>
                  </tr>
                </tfoot>}
              </table>
            </div>

            <footer className="finance-statement-footer">
              <span>Prepared by PLWM-MCC Finance</span>
              <span>Values reflect active records entered in the system. This statement is not a bank reconciliation.</span>
            </footer>
          </>}
        </div>
      </section>
    </div>
  );
}
