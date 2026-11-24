import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import {
  blockInvalidDecimalKeys,
  blockInvalidIntegerKeys,
  blockInvalidSignedIntegerKeys,
  sanitizeCurrency,
  sanitizePersonName,
  sanitizeSignedInteger,
  sanitizeWholeNumber,
} from '../../utils/inputConstraints';

const php = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InventoryOperationsPanel({ items = [], canManage = false, onStockChanged }) {
  const [tab, setTab] = useState('ledger');
  const [transactions, setTransactions] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [extReports, setExtReports] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [txForm, setTxForm] = useState({ item_id: '', quantity_delta: '', unit_cost: '', supplier: '', notes: '', create_finance_purchase_request: false });
  const [borForm, setBorForm] = useState({ item_id: '', borrower_name: '', quantity: '1', due_return_date: '', notes: '' });
  const [maintForm, setMaintForm] = useState({ item_id: '', maintenance_type: 'repair', vendor: '', cost: '0', notes: '' });

  const loadAll = useCallback(async () => {
    try {
      const [tRes, bRes, mRes, rRes] = await Promise.all([
        axiosInstance.get('/inventory/transactions'),
        axiosInstance.get('/inventory/borrowings'),
        axiosInstance.get('/inventory/maintenance'),
        axiosInstance.get('/inventory/reports/extended'),
      ]);
      setTransactions(Array.isArray(tRes.data?.data) ? tRes.data.data : []);
      setBorrowings(Array.isArray(bRes.data?.data) ? bRes.data.data : []);
      setMaintenance(Array.isArray(mRes.data?.data) ? mRes.data.data : []);
      setExtReports(rRes.data?.data || null);
    } catch {}
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const submitStock = async (e) => {
    e.preventDefault();
    if (!txForm.item_id || !Number(txForm.quantity_delta)) return;
    setError('');
    try {
      const res = await axiosInstance.post('/inventory/transactions', {
        item_id: Number(txForm.item_id),
        quantity_delta: parseInt(txForm.quantity_delta, 10),
        unit_cost: txForm.unit_cost !== '' ? Number(txForm.unit_cost) : null,
        supplier: txForm.supplier.trim() || null,
        notes: txForm.notes.trim() || null,
        create_finance_purchase_request: Boolean(txForm.create_finance_purchase_request),
      });
      setTxForm({ item_id: '', quantity_delta: '', unit_cost: '', supplier: '', notes: '', create_finance_purchase_request: false });
      setNotice(res.data?.data?.finance_expense_id
        ? 'Stock movement recorded & Finance purchase expense request submitted for approval.'
        : 'Stock movement logged in authoritative ledger.');
      await loadAll();
      onStockChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to record stock movement.');
    }
  };

  const submitBorrow = async (e) => {
    e.preventDefault();
    if (!borForm.item_id || !borForm.borrower_name.trim()) return;
    setError('');
    try {
      await axiosInstance.post('/inventory/borrowings', {
        item_id: Number(borForm.item_id),
        borrower_name: borForm.borrower_name.trim(),
        quantity: parseInt(borForm.quantity, 10) || 1,
        due_return_date: borForm.due_return_date || null,
        notes: borForm.notes.trim() || null,
      });
      setBorForm({ item_id: '', borrower_name: '', quantity: '1', due_return_date: '', notes: '' });
      setNotice('Borrowing recorded and stock updated.');
      await loadAll();
      onStockChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to borrow item.');
    }
  };

  const handleReturn = async (borrowing) => {
    const remaining = Number(borrowing.quantity) - Number(borrowing.quantity_returned || 0);
    const qtyStr = window.prompt(`Quantity returning (remaining: ${remaining}):`, String(remaining));
    if (!qtyStr) return;
    const cond = window.prompt('Return condition (Good, Fair, Poor, Damaged, Lost):', 'Good') || 'Good';
    setError('');
    try {
      await axiosInstance.post(`/inventory/borrowings/${borrowing.id}/return`, {
        quantity_returned: parseInt(qtyStr, 10),
        return_condition: cond,
      });
      setNotice('Item return reconciled in stock ledger.');
      await loadAll();
      onStockChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process return.');
    }
  };

  const submitMaint = async (e) => {
    e.preventDefault();
    if (!maintForm.item_id) return;
    setError('');
    try {
      await axiosInstance.post('/inventory/maintenance', {
        item_id: Number(maintForm.item_id),
        maintenance_type: maintForm.maintenance_type,
        vendor: maintForm.vendor.trim() || null,
        cost: Number(maintForm.cost || 0),
        notes: maintForm.notes.trim() || null,
      });
      setMaintForm({ item_id: '', maintenance_type: 'repair', vendor: '', cost: '0', notes: '' });
      setNotice('Maintenance / repair logged.');
      await loadAll();
      onStockChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to log maintenance.');
    }
  };

  const completeMaint = async (id) => {
    try {
      await axiosInstance.post(`/inventory/maintenance/${id}/complete`);
      setNotice('Maintenance marked completed and item restored to Available.');
      await loadAll();
      onStockChanged?.();
    } catch {}
  };

  const sum = extReports?.summary || {};

  return (
    <section style={S.card} aria-label="Inventory operations ledger, borrowing and maintenance">
      <div style={S.head}>
        <div>
          <h2 style={S.title}>Asset Operations: Stock Ledger, Borrowing &amp; Maintenance</h2>
          <p style={S.subtitle}>
            Transactional stock movements (non-negative stock guard), equipment borrowing &amp; return reconciliation, repair tracking, and valuation summary.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ledger', label: `Stock Ledger (${transactions.length})` },
            { id: 'borrowing', label: `Borrowing (${borrowings.length})` },
            { id: 'maintenance', label: `Maintenance (${maintenance.length})` },
            { id: 'reports', label: 'Valuation & Summary' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{ ...S.tabBtn, ...(tab === t.id ? S.tabBtnActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Operations KPI Strip */}
      <div style={S.kpiRow}>
        <Stat label="Reusable Assets" value={String(sum.reusable_assets ?? 0)} />
        <Stat label="Consumables" value={String(sum.consumables ?? 0)} />
        <Stat label="Total Valuation" value={php(sum.total_valuation_php)} />
        <Stat label="Active / Overdue Loans" value={`${sum.active_borrowings ?? 0} / ${sum.overdue_borrowings ?? 0}`} />
        <Stat label="Under Repair" value={String(sum.under_repair ?? 0)} />
      </div>

      {error && <div style={S.errorBox} role="alert">{error}</div>}
      {notice && <div style={S.noticeBox}>{notice}</div>}

      {tab === 'ledger' && (
        <div style={S.stack}>
          {canManage && (
            <form onSubmit={submitStock} style={S.box}>
              <div style={S.subTitle}>Record Stock In / Out or Purchase Additional Materials</div>
              <div style={S.row}>
                <select value={txForm.item_id} onChange={(e) => setTxForm({ ...txForm, item_id: e.target.value })} style={S.input} required>
                  <option value="">Select item…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name} (qty: {i.quantity})</option>)}
                </select>
                <input type="text" inputMode="numeric" value={txForm.quantity_delta} onKeyDown={blockInvalidSignedIntegerKeys} onChange={(e) => setTxForm({ ...txForm, quantity_delta: sanitizeSignedInteger(e.target.value, 6) })} placeholder="+Stock In / -Out" style={{ ...S.input, maxWidth: 140 }} required />
                <input type="number" step="0.01" min="0" value={txForm.unit_cost} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setTxForm({ ...txForm, unit_cost: sanitizeCurrency(e.target.value) })} placeholder="Unit cost (PHP)" style={{ ...S.input, maxWidth: 130 }} />
                <input value={txForm.supplier} maxLength={120} onChange={(e) => setTxForm({ ...txForm, supplier: e.target.value })} placeholder="Supplier (optional)" style={S.input} />
                <input value={txForm.notes} maxLength={250} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} placeholder="Notes" style={S.input} />
                <button type="submit" style={S.primaryBtn}>Post Movement</button>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5, color: '#003d70' }}>
                <input type="checkbox" checked={txForm.create_finance_purchase_request} onChange={(e) => setTxForm({ ...txForm, create_finance_purchase_request: e.target.checked })} />
                Also submit Finance Expense Approval Request for this material purchase
              </label>
            </form>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr><th style={S.th}>Date</th><th style={S.th}>Item</th><th style={S.th}>Type</th><th style={S.th}>Change</th><th style={S.th}>Balance</th><th style={S.th}>Notes</th></tr></thead>
              <tbody>
                {transactions.length === 0 ? <tr><td colSpan={6} style={S.empty}>No stock ledger movements recorded yet.</td></tr> : transactions.map((t) => (
                  <tr key={t.id} style={S.tr}>
                    <td style={S.td}>{String(t.occurred_at || '').slice(0, 10)}</td>
                    <td style={S.td}><strong>{t.item?.name || `Item #${t.item_id}`}</strong></td>
                    <td style={S.td}><span style={S.pill}>{t.transaction_type}</span></td>
                    <td style={{ ...S.td, fontWeight: 700, color: t.quantity_delta >= 0 ? '#005599' : '#b91c1c' }}>{t.quantity_delta >= 0 ? `+${t.quantity_delta}` : t.quantity_delta}</td>
                    <td style={S.td}>{t.balance_after ?? '—'}</td>
                    <td style={S.td}>{t.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'borrowing' && (
        <div style={S.stack}>
          {canManage && (
            <form onSubmit={submitBorrow} style={S.box}>
              <div style={S.subTitle}>Issue Borrowed Equipment / Asset</div>
              <div style={S.row}>
                <select value={borForm.item_id} onChange={(e) => setBorForm({ ...borForm, item_id: e.target.value })} style={S.input} required>
                  <option value="">Select item…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name} (avail: {i.quantity})</option>)}
                </select>
                <input value={borForm.borrower_name} maxLength={80} onChange={(e) => setBorForm({ ...borForm, borrower_name: sanitizePersonName(e.target.value, 80) })} placeholder="Borrower name *" style={S.input} required />
                <input type="number" min="1" value={borForm.quantity} onKeyDown={blockInvalidIntegerKeys} onChange={(e) => setBorForm({ ...borForm, quantity: sanitizeWholeNumber(e.target.value, { maxLength: 6 }) })} placeholder="Qty" style={{ ...S.input, maxWidth: 80 }} />
                <input type="date" value={borForm.due_return_date} onChange={(e) => setBorForm({ ...borForm, due_return_date: e.target.value })} style={{ ...S.input, maxWidth: 150 }} />
                <button type="submit" style={S.primaryBtn}>Issue Borrow</button>
              </div>
            </form>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr><th style={S.th}>Item</th><th style={S.th}>Borrower</th><th style={S.th}>Qty (Returned)</th><th style={S.th}>Due Date</th><th style={S.th}>Status</th><th style={S.th}>Action</th></tr></thead>
              <tbody>
                {borrowings.length === 0 ? <tr><td colSpan={6} style={S.empty}>No borrowing records yet.</td></tr> : borrowings.map((b) => (
                  <tr key={b.id} style={S.tr}>
                    <td style={S.td}><strong>{b.item?.name || `Item #${b.item_id}`}</strong></td>
                    <td style={S.td}>{b.borrower_name}</td>
                    <td style={S.td}>{b.quantity} ({b.quantity_returned || 0} returned)</td>
                    <td style={S.td}>{b.due_return_date || '—'}</td>
                    <td style={S.td}><span style={b.is_overdue ? S.pillWarn : S.pill}>{b.effective_status || b.status}</span></td>
                    <td style={S.td}>
                      {canManage && ['borrowed', 'partially_returned', 'overdue'].includes(b.effective_status || b.status) && (
                        <button type="button" onClick={() => handleReturn(b)} style={S.smallBtn}>Record Return</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <div style={S.stack}>
          {canManage && (
            <form onSubmit={submitMaint} style={S.box}>
              <div style={S.subTitle}>Log Equipment Maintenance / Repair</div>
              <div style={S.row}>
                <select value={maintForm.item_id} onChange={(e) => setMaintForm({ ...maintForm, item_id: e.target.value })} style={S.input} required>
                  <option value="">Select item…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <select value={maintForm.maintenance_type} onChange={(e) => setMaintForm({ ...maintForm, maintenance_type: e.target.value })} style={{ ...S.input, maxWidth: 140 }}>
                  <option value="repair">Repair</option>
                  <option value="inspection">Inspection</option>
                  <option value="servicing">Servicing</option>
                  <option value="calibration">Calibration</option>
                </select>
                <input value={maintForm.vendor} maxLength={120} onChange={(e) => setMaintForm({ ...maintForm, vendor: e.target.value })} placeholder="Technician / Shop" style={S.input} />
                <input type="number" step="0.01" min="0" value={maintForm.cost} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setMaintForm({ ...maintForm, cost: sanitizeCurrency(e.target.value) })} placeholder="Cost (PHP)" style={{ ...S.input, maxWidth: 120 }} />
                <input value={maintForm.notes} maxLength={250} onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })} placeholder="Issue / repair notes" style={S.input} />
                <button type="submit" style={S.primaryBtn}>Log Repair</button>
              </div>
            </form>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr><th style={S.th}>Date</th><th style={S.th}>Item</th><th style={S.th}>Type / Vendor</th><th style={S.th}>Cost</th><th style={S.th}>Status</th><th style={S.th}>Action</th></tr></thead>
              <tbody>
                {maintenance.length === 0 ? <tr><td colSpan={6} style={S.empty}>No maintenance logs yet.</td></tr> : maintenance.map((m) => (
                  <tr key={m.id} style={S.tr}>
                    <td style={S.td}>{m.maintenance_date}</td>
                    <td style={S.td}><strong>{m.item?.name || `Item #${m.item_id}`}</strong></td>
                    <td style={S.td}>{m.maintenance_type} · {m.vendor || 'In-house'}</td>
                    <td style={S.td}>{php(m.cost)}</td>
                    <td style={S.td}><span style={S.pill}>{m.status}</span></td>
                    <td style={S.td}>
                      {canManage && m.status !== 'completed' && (
                        <button type="button" onClick={() => completeMaint(m.id)} style={S.smallBtn}>Mark Completed</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && extReports && (
        <div style={S.stack}>
          <div>
            <h3 style={S.subTitle}>Items by Storage Location</h3>
            <table style={S.table}>
              <thead><tr><th style={S.th}>Location</th><th style={S.th}>Items Count</th></tr></thead>
              <tbody>
                {(extReports.by_location || []).map((loc) => (
                  <tr key={loc.location} style={S.tr}>
                    <td style={S.td}>{loc.location}</td>
                    <td style={S.td}><strong>{loc.count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderTop: '3px solid #005599', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#52647a', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{value}</div>
    </div>
  );
}

const S = {
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 17, fontWeight: 700, color: '#003d70' },
  subtitle: { margin: '3px 0 0', fontSize: 13, color: '#52647a' },
  tabBtn: { background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  tabBtnActive: { background: '#005599', color: '#fff', border: '1px solid #005599' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 },
  stack: { display: 'flex', flexDirection: 'column', gap: 12 },
  box: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
  subTitle: { margin: '0 0 8px', fontSize: 13.5, fontWeight: 700, color: '#003d70' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { flex: '1 1 130px', minWidth: 0, boxSizing: 'border-box', padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 13, background: '#fff' },
  primaryBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  smallBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
  noticeBox: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 11.5, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '8px 10px', color: '#0f172a' },
  empty: { padding: 18, textAlign: 'center', color: '#64748b' },
  pill: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600, textTransform: 'capitalize' },
  pillWarn: { background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' },
};
