import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import useIsMobile from '../../hooks/useIsMobile';
import FinanceNavigation from '../../components/finance/FinanceNavigation';
import MonoIcon from '../../components/common/MonoIcon';

const php = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const REPORT_TYPES = [
  { id: 'monthly_category', label: 'Monthly Category Breakdown' },
  { id: 'detail', label: 'Detailed Expense Transactions' },
  { id: 'annual', label: 'Annual Expense Summary' },
  { id: 'by_ministry', label: 'Expenses by Ministry' },
  { id: 'by_event', label: 'Expenses by Event' },
];

export default function FinanceReportsLedgerPage() {
  const isMobile = useIsMobile();
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(`${today.slice(0, 7)}-01`);
  const [dateTo, setDateTo] = useState(today);
  const [reportType, setReportType] = useState('monthly_category');
  const [ledgerType, setLedgerType] = useState('all');

  const [statement, setStatement] = useState(null);
  const [expReport, setExpReport] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stRes, repRes, ledRes] = await Promise.all([
        axiosInstance.get('/finance/reports/statement', { params: { date_from: dateFrom, date_to: dateTo } }),
        axiosInstance.get('/finance/reports/expenses', { params: { report_type: reportType, date_from: dateFrom, date_to: dateTo, year: dateTo.slice(0, 4) } }),
        axiosInstance.get('/finance/ledger', { params: { date_from: dateFrom, date_to: dateTo, type: ledgerType } }),
      ]);
      setStatement(stRes.data?.data || null);
      setExpReport(repRes.data?.data || null);
      setLedger(Array.isArray(ledRes.data?.data) ? ledRes.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load financial reports.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, reportType, ledgerType]);

  useEffect(() => { loadReports(); }, [loadReports]);

  return (
    <div className="mcc-module mcc-module-finance-reports" style={S.page}>
      <div style={S.header}>
        <div>
          <h1 className="workspace-page-title" style={S.title}>Financial Statements, Expense Reports &amp; Ledger</h1>
          <p style={S.subtitle}>
            Consolidated monthly balance reconciliation, 5 structured expense report views, and chronological audit ledger.
          </p>
        </div>
        <button type="button" onClick={() => window.print()} style={S.primaryBtn}>
          <MonoIcon name="printer" size={15} /> Print / PDF
        </button>
      </div>

      <FinanceNavigation />

      <div style={S.filterBar}>
        <label style={S.field}>
          <span style={S.label}>From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={S.input} />
        </label>
        <label style={S.field}>
          <span style={S.label}>To</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={S.input} />
        </label>
        <button type="button" onClick={loadReports} style={S.ghostBtn}>Refresh</button>
      </div>

      {error && <div style={S.errorBox} role="alert">{error}</div>}

      {/* Consolidated Statement */}
      {statement && (
        <section style={S.card}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>Consolidated Financial Statement ({statement.from} to {statement.to})</h2>
            <span style={S.hint}>Ending Balance = Beginning + Income − Paid Expenses</span>
          </div>
          <div style={{ ...S.kpiGrid, gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))' }}>
            <Stat label="Beginning Balance" value={php(statement.beginning_balance)} accent="#52647a" />
            <Stat label="Total Income" value={php(statement.total_income)} accent="#005599" />
            <Stat label="Paid Expenses" value={php(statement.total_expenses)} accent="#5c9dc4" />
            <Stat label="Ending Balance" value={php(statement.ending_balance)} accent="#003d70" />
          </div>
          {statement.internal_transfers_excluded > 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#52647a' }}>
              Note: {php(statement.internal_transfers_excluded)} in internal transfers occurred during this period and is excluded from Income and Expense totals.
            </p>
          )}
        </section>
      )}

      {/* 5 Expense Reports */}
      <section style={S.card}>
        <div style={S.cardHead}>
          <h2 style={S.cardTitle}>Expense Reports</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.id}
                type="button"
                onClick={() => setReportType(rt.id)}
                style={{ ...S.filterBtn, ...(reportType === rt.id ? S.filterBtnActive : {}) }}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              {reportType === 'detail' ? (
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Ref #</th>
                  <th style={S.th}>Payee / Description</th>
                  <th style={S.th}>Category</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Amount</th>
                </tr>
              ) : (
                <tr>
                  <th style={S.th}>{reportType === 'annual' ? 'Month' : reportType === 'by_ministry' ? 'Ministry' : reportType === 'by_event' ? 'Event' : 'Category'}</th>
                  <th style={S.th}>Transactions</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Total Paid</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={S.emptyCell}>Loading report…</td></tr>
              ) : !(expReport?.rows?.length) ? (
                <tr><td colSpan={5} style={S.emptyCell}>No paid expenses recorded in this period.</td></tr>
              ) : reportType === 'detail' ? (
                expReport.rows.map((r, idx) => (
                  <tr key={r.id ?? idx} style={S.tr}>
                    <td style={S.td}>{r.date}</td>
                    <td style={S.td}><code>{r.transaction_number || `EXP-${r.id}`}</code></td>
                    <td style={S.td}>{r.payee ? `${r.payee} — ` : ''}{r.description || '—'}</td>
                    <td style={S.td}>{r.category?.category_name || '—'}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{php(r.amount)}</td>
                  </tr>
                ))
              ) : (
                expReport.rows.map((r, idx) => (
                  <tr key={idx} style={S.tr}>
                    <td style={S.td}><strong>{r.category || r.month || r.ministry || r.event}</strong></td>
                    <td style={S.td}>{r.count}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{php(r.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {expReport && (
              <tfoot>
                <tr>
                  <td colSpan={reportType === 'detail' ? 4 : 2} style={{ ...S.td, fontWeight: 700 }}>Grand Total</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#003d70' }}>{php(expReport.grand_total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Unified Chronological Audit Ledger */}
      <section style={S.card}>
        <div style={S.cardHead}>
          <h2 style={S.cardTitle}>Unified Audit Ledger</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'income', 'expense', 'transfer'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLedgerType(t)}
                style={{ ...S.filterBtn, ...(ledgerType === t ? S.filterBtnActive : {}) }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Ref #</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Category</th>
                <th style={S.th}>Description</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Amount</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={7} style={S.emptyCell}>No ledger entries in this period.</td></tr>
              ) : ledger.map((item) => (
                <tr key={`${item.entry_type}-${item.id}`} style={S.tr}>
                  <td style={S.td}>{item.date}</td>
                  <td style={S.td}><code>{item.transaction_number}</code></td>
                  <td style={S.td}><span style={S.typePill}>{item.entry_type}</span></td>
                  <td style={S.td}>{item.category}</td>
                  <td style={S.td}>{item.description}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: item.amount < 0 ? '#991b1b' : '#003d70' }}>
                    {php(item.amount)}
                  </td>
                  <td style={S.td}>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52647a', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{value}</div>
    </div>
  );
}

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 13.5, color: '#52647a' },
  filterBar: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#52647a' },
  input: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#005599', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  ghostBtn: { background: '#f8fafc', color: '#003d70', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, minWidth: 0 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  cardTitle: { margin: 0, fontSize: 15.5, fontWeight: 700, color: '#003d70' },
  hint: { fontSize: 12, color: '#52647a' },
  kpiGrid: { display: 'grid', gap: 12 },
  filterBtn: { background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 11px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  filterBtnActive: { background: '#005599', color: '#fff', border: '1px solid #005599' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 },
  th: { textAlign: 'left', padding: '9px 10px', fontSize: 11.5, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '9px 10px', color: '#0f172a', verticalAlign: 'middle' },
  emptyCell: { padding: 20, textAlign: 'center', color: '#64748b' },
  typePill: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600, textTransform: 'capitalize' },
};
