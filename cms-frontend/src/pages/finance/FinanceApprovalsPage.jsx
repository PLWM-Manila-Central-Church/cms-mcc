import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import FinanceNavigation from '../../components/finance/FinanceNavigation';
import IconActionButton from '../../components/common/IconActionButton';
import { blockInvalidDecimalKeys, sanitizeCurrency } from '../../utils/inputConstraints';

const php = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_BADGE = {
  draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  pending_approval: { bg: '#fef3c7', color: '#92400e', label: 'Pending Approval' },
  approved: { bg: '#e8f4fd', color: '#005599', label: 'Approved (Unpaid)' },
  paid: { bg: '#dcfce7', color: '#166534', label: 'Paid' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  cancelled: { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' },
};

export default function FinanceApprovalsPage() {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const canCreate = hasPermission('finance', 'create');
  const canUpdate = hasPermission('finance', 'update');

  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [methods, setMethods] = useState([]);
  const [funds, setFunds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    category_id: '', payment_method_id: '', fund_id: '', account_id: '',
    date: new Date().toISOString().slice(0, 10), amount: '', payee: '', description: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [expRes, catRes, pmRes, fRes, aRes] = await Promise.all([
        axiosInstance.get('/finance/expenses/workflow', { params: { status: statusFilter } }),
        axiosInstance.get('/finance/expense-categories'),
        axiosInstance.get('/finance/payment-methods'),
        axiosInstance.get('/finance/funds/balances').catch(() => ({ data: { data: [] } })),
        axiosInstance.get('/finance/accounts/balances').catch(() => ({ data: { data: [] } })),
      ]);
      setRows(Array.isArray(expRes.data?.data) ? expRes.data.data : []);
      setCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
      setMethods(Array.isArray(pmRes.data?.data) ? pmRes.data.data : []);
      setFunds(Array.isArray(fRes.data?.data) ? fRes.data.data : []);
      setAccounts(Array.isArray(aRes.data?.data) ? aRes.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load expense approval queue.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.status === 'pending_approval').length,
    approvedUnpaid: rows.filter((r) => r.status === 'approved').length,
    paid: rows.filter((r) => r.status === 'paid').length,
    draftOrRejected: rows.filter((r) => ['draft', 'rejected'].includes(r.status)).length,
  }), [rows]);

  const handleCreate = async (submitImmediately) => {
    if (!form.category_id || !form.payment_method_id || !Number(form.amount)) {
      setError('Select a category, payment method, and enter a positive amount.');
      return;
    }
    setError('');
    try {
      await axiosInstance.post('/finance/expenses/workflow', {
        ...form,
        category_id: Number(form.category_id),
        payment_method_id: Number(form.payment_method_id),
        fund_id: form.fund_id ? Number(form.fund_id) : null,
        account_id: form.account_id ? Number(form.account_id) : null,
        amount: Number(form.amount),
        submit_immediately: submitImmediately,
      });
      setForm({
        category_id: '', payment_method_id: '', fund_id: '', account_id: '',
        date: new Date().toISOString().slice(0, 10), amount: '', payee: '', description: '',
      });
      setNotice(submitImmediately ? 'Expense submitted for approval.' : 'Expense saved as draft.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create expense request.');
    }
  };

  const handleAction = async (id, action) => {
    setError('');
    let body = {};
    if (action === 'reject') {
      const reason = window.prompt('Enter rejection reason:');
      if (!reason || !reason.trim()) return;
      body = { reason: reason.trim() };
    } else if (action === 'mark-paid') {
      const ref = window.prompt('Optional payment reference / check # / GCash ref:', '') || '';
      body = { payment_reference: ref.trim() || null };
    }
    try {
      await axiosInstance.post(`/finance/expenses/${id}/${action}`, body);
      setNotice(`Expense updated (${action}).`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || `Action "${action}" failed.`);
    }
  };

  return (
    <div className="mcc-module mcc-module-finance-approvals" style={S.page}>
      <div>
        <h1 className="workspace-page-title" style={S.title}>Expense Approval Workflow</h1>
        <p style={S.subtitle}>
          Controlled disbursement flow: Draft → Pending Approval → Approved → Paid. Approved expenses are only deducted from cash balances once marked Paid.
        </p>
      </div>

      <FinanceNavigation />

      <div style={{ ...S.kpiGrid, gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))' }}>
        <Kpi label="Pending Approval" value={counts.pending} accent="#d97706" />
        <Kpi label="Approved (Awaiting Payment)" value={counts.approvedUnpaid} accent="#005599" />
        <Kpi label="Paid Disbursements" value={counts.paid} accent="#13b5ea" />
        <Kpi label="Draft / Rejected" value={counts.draftOrRejected} accent="#52647a" />
      </div>

      {error && <div style={S.errorBox} role="alert">{error}</div>}
      {notice && <div style={S.noticeBox}>{notice}</div>}

      {canCreate && (
        <section style={S.card}>
          <h2 style={S.cardTitle}>New Expense Request</h2>
          <div style={S.formGrid}>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={S.input} aria-label="Expense category">
              <option value="">Category *</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
            </select>
            <select value={form.payment_method_id} onChange={(e) => setForm({ ...form, payment_method_id: e.target.value })} style={S.input} aria-label="Payment method">
              <option value="">Payment method *</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.method_name}</option>)}
            </select>
            <input type="number" step="0.01" min="0.01" value={form.amount} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setForm({ ...form, amount: sanitizeCurrency(e.target.value) })} placeholder="Amount (PHP) *" style={S.input} />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={S.input} />
            <input value={form.payee} maxLength={120} onChange={(e) => setForm({ ...form, payee: e.target.value })} placeholder="Payee / Vendor" style={S.input} />
            <select value={form.fund_id} onChange={(e) => setForm({ ...form, fund_id: e.target.value })} style={S.input} aria-label="Designated fund">
              <option value="">Designated Fund (optional)</option>
              {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} style={S.input} aria-label="Source account">
              <option value="">Source Account (optional)</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Purpose / description" style={S.input} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => handleCreate(false)} style={S.ghostBtn}>Save Draft</button>
            <button type="button" onClick={() => handleCreate(true)} style={S.primaryBtn}>Submit for Approval</button>
          </div>
        </section>
      )}

      <section style={S.card}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['all', 'pending_approval', 'approved', 'draft', 'paid', 'rejected', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                ...S.filterBtn,
                ...(statusFilter === st ? S.filterBtnActive : {}),
              }}
            >
              {st === 'all' ? 'All' : (STATUS_BADGE[st]?.label || st)}
            </button>
          ))}
        </div>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Ref #</th>
                <th style={S.th}>Date</th>
                <th style={S.th}>Payee &amp; Description</th>
                <th style={S.th}>Category / Fund</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Amount</th>
                <th style={S.th}>Status</th>
                {canUpdate && <th style={S.th}>Workflow Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={S.emptyCell}>Loading approval queue…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={S.emptyCell}>No expense requests in this status.</td></tr>
              ) : rows.map((row) => {
                const badge = STATUS_BADGE[row.status] || STATUS_BADGE.paid;
                return (
                  <tr key={row.id} style={S.tr}>
                    <td style={S.td}><code>{row.transaction_number || `EXP-${row.id}`}</code></td>
                    <td style={S.td}>{row.date}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{row.payee || 'General Payee'}</div>
                      <div style={{ fontSize: 12, color: '#52647a' }}>{row.description || '—'}</div>
                      {row.rejection_reason && <div style={{ fontSize: 12, color: '#b91c1c' }}>Rejected: {row.rejection_reason}</div>}
                    </td>
                    <td style={S.td}>
                      <div>{row.category?.category_name || '—'}</div>
                      {row.fund?.name && <div style={{ fontSize: 12, color: '#005599' }}>{row.fund.name}</div>}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{php(row.amount)}</td>
                    <td style={S.td}>
                      <span style={{ background: badge.bg, color: badge.color, borderRadius: 999, padding: '3px 9px', fontSize: 12, fontWeight: 700 }}>
                        {badge.label}
                      </span>
                    </td>
                    {canUpdate && (
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {['draft', 'rejected'].includes(row.status) && (
                            <button type="button" onClick={() => handleAction(row.id, 'submit')} style={S.smallPrimaryBtn}>Submit</button>
                          )}
                          {row.status === 'pending_approval' && (
                            <>
                              <button type="button" onClick={() => handleAction(row.id, 'approve')} style={S.smallPrimaryBtn}>Approve</button>
                              <IconActionButton icon="close" label="Reject" title="Reject request" tone="danger" onClick={() => handleAction(row.id, 'reject')} />
                            </>
                          )}
                          {row.status === 'approved' && (
                            <button type="button" onClick={() => handleAction(row.id, 'mark-paid')} style={S.smallPrimaryBtn}>Mark Paid</button>
                          )}
                          {!['paid', 'cancelled'].includes(row.status) && (
                            <IconActionButton icon="archive" label="Cancel" title="Cancel request" tone="neutral" onClick={() => handleAction(row.id, 'cancel')} />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: `3px solid ${accent}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#52647a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 13.5, color: '#52647a', maxWidth: 780 },
  kpiGrid: { display: 'grid', gap: 12 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, minWidth: 0 },
  cardTitle: { margin: '0 0 12px', fontSize: 15.5, fontWeight: 700, color: '#003d70' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  input: { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff' },
  primaryBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  ghostBtn: { background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  filterBtn: { background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  filterBtnActive: { background: '#005599', color: '#fff', border: '1px solid #005599' },
  smallPrimaryBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  smallDangerBtn: { background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  smallGhostBtn: { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  noticeBox: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 },
  th: { textAlign: 'left', padding: '9px 10px', fontSize: 11.5, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '9px 10px', color: '#0f172a', verticalAlign: 'middle' },
  emptyCell: { padding: 20, textAlign: 'center', color: '#64748b' },
};
