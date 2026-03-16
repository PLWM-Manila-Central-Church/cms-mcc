import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';

const PAYMENT_LABELS = {
  cash:          'Cash',
  gcash:         'GCash',
  bank_transfer: 'Bank Transfer'
};

export default function MyGivingPage() {
  const [records, setRecords]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');

  const limit = 20;

  const fetchGiving = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (filterDateFrom) params.append('date_from', filterDateFrom);
      if (filterDateTo)   params.append('date_to',   filterDateTo);
      const res = await axiosInstance.get(`/finance/my-giving?${params}`);
      const d   = res.data.data;
      setRecords(d.records);
      setTotal(d.total);
      setTotalPages(d.total_pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your giving records.');
    } finally {
      setLoading(false);
    }
  }, [page, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchGiving(); }, [fetchGiving]);

  const totalAmount = records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const formatDate   = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const formatAmount = (a) => parseFloat(a).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>My Giving</h1>
          <p style={s.subtitle}>Your personal tithes & offerings history</p>
        </div>
      </div>

      {/* Running total for this view */}
      <div style={s.totalCard}>
        <div style={s.totalLabel}>Total shown below</div>
        <div style={s.totalNum}>{formatAmount(totalAmount)}</div>
        <div style={s.totalSub}>{total} records</div>
      </div>

      {/* Info box for digital payments */}
      <div style={s.infoCard}>
        <div style={s.infoTitle}>💳 Digital Payment Details</div>
        <p style={s.infoText}>
          For GCash and bank transfers, please send your giving to the following and confirm with the church office personally.
        </p>
        <div style={s.paymentDetails}>
          <div style={s.paymentRow}>
            <span style={s.paymentIcon}>📱</span>
            <div>
              <div style={s.paymentName}>GCash</div>
              <div style={s.paymentValue}>09XX XXX XXXX — PLWM-MCC</div>
            </div>
          </div>
          <div style={s.paymentRow}>
            <span style={s.paymentIcon}>🏦</span>
            <div>
              <div style={s.paymentName}>Bank Transfer (BDO)</div>
              <div style={s.paymentValue}>Account No: XXXX-XXXX-XX — PLWM-MCC Church</div>
            </div>
          </div>
        </div>
      </div>

      {/* Date filter */}
      <div style={s.filterBar}>
        <label style={s.filterLabel}>Filter by date:</label>
        <input type="date" value={filterDateFrom}
          onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }}
          style={s.filterInput} />
        <span style={{ color: '#94a3b8', fontSize: '13px' }}>to</span>
        <input type="date" value={filterDateTo}
          onChange={e => { setFilterDateTo(e.target.value); setPage(1); }}
          style={s.filterInput} />
        {(filterDateFrom || filterDateTo) && (
          <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }} style={s.clearBtn}>✕ Clear</button>
        )}
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>Date</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Amount</th>
              <th style={s.th}>Method</th>
              <th style={s.th}>Receipt No.</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={s.centerCell}>Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={5} style={s.centerCell}>No giving records found.</td></tr>
            ) : records.map((r, i) => (
              <tr key={r.id}
                style={{ ...s.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
              >
                <td style={s.td}>{formatDate(r.transaction_date)}</td>
                <td style={s.td}>
                  <span style={s.categoryTag}>{r.FinancialCategory?.name}</span>
                </td>
                <td style={{ ...s.td, fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>
                  {formatAmount(r.amount)}
                </td>
                <td style={s.td}>{PAYMENT_LABELS[r.payment_method] || r.payment_method}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                  {r.receipt_number || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={s.pageBtn}>← Prev</button>
          <span style={s.pageInfo}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={s.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}

const s = {
  page:           { fontFamily: "'Inter', sans-serif" },
  pageHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title:          { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  subtitle:       { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  totalCard:      { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', borderRadius: '16px', padding: '28px 32px', marginBottom: '20px', textAlign: 'center' },
  totalLabel:     { fontSize: '13px', opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  totalNum:       { fontSize: '40px', fontWeight: '800', letterSpacing: '-1px' },
  totalSub:       { fontSize: '13px', opacity: 0.7, marginTop: '6px' },
  infoCard:       { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' },
  infoTitle:      { fontSize: '15px', fontWeight: '700', color: '#92400e', marginBottom: '8px' },
  infoText:       { fontSize: '14px', color: '#78350f', margin: '0 0 16px 0', lineHeight: '1.5' },
  paymentDetails: { display: 'flex', flexDirection: 'column', gap: '12px' },
  paymentRow:     { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  paymentIcon:    { fontSize: '20px' },
  paymentName:    { fontSize: '13px', fontWeight: '700', color: '#78350f' },
  paymentValue:   { fontSize: '14px', color: '#92400e', marginTop: '2px', fontFamily: 'monospace' },
  filterBar:      { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  filterLabel:    { fontSize: '14px', color: '#374151', fontWeight: '500' },
  filterInput:    { padding: '8px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none' },
  clearBtn:       { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  errorBox:       { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' },
  tableWrap:      { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  table:          { width: '100%', borderCollapse: 'collapse' },
  thead:          { background: '#f8fafc' },
  th:             { padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  row:            { transition: 'background 0.15s' },
  td:             { padding: '14px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  centerCell:     { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  categoryTag:    { background: '#e8f4fd', color: '#0066b3', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  pagination:     { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px' },
  pageBtn:        { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' },
  pageInfo:       { fontSize: '14px', color: '#64748b' },
};
