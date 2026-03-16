import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const PAYMENT_LABELS = {
  cash:          'Cash',
  gcash:         'GCash',
  bank_transfer: 'Bank Transfer'
};

const PAYMENT_STYLE = {
  cash:          { bg: '#f0fdf4', color: '#16a34a' },
  gcash:         { bg: '#faf5ff', color: '#7c3aed' },
  bank_transfer: { bg: '#e8f4fd', color: '#0066b3' }
};

export default function FinancePage() {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.roleName === 'Member') navigate('/finance/my-giving', { replace: true });
  }, [user, navigate]);
  const canRecord = hasPermission('finance', 'create');

  const [records, setRecords]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const [categories, setCategories]   = useState([]);
  const [summary, setSummary]         = useState([]);

  // Filters
  const [filterCategory, setFilterCategory]   = useState('');
  const [filterPayment, setFilterPayment]     = useState('');
  const [filterDateFrom, setFilterDateFrom]   = useState('');
  const [filterDateTo, setFilterDateTo]       = useState('');

  // Form
  const [showForm, setShowForm]       = useState(false);
  const [editRecord, setEditRecord]   = useState(null);
  const [form, setForm]               = useState({
    member_id: '', member_label: '',
    category_id: '', amount: '', payment_method: 'cash',
    transaction_date: new Date().toISOString().slice(0, 10),
    receipt_number: '', notes: ''
  });
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');

  // Member search inside form
  const [memberSearch, setMemberSearch]     = useState('');
  const [memberResults, setMemberResults]   = useState([]);
  const [searchingMember, setSearchingMember] = useState(false);
  let memberSearchTimeout = null;

  const limit = 20;

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get('/finance/categories');
      setCategories(res.data.data);
    } catch {}
  };

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDateFrom) params.append('date_from', filterDateFrom);
      if (filterDateTo)   params.append('date_to',   filterDateTo);
      const res = await axiosInstance.get(`/finance/summary?${params}`);
      setSummary(res.data.data);
    } catch {}
  }, [filterDateFrom, filterDateTo]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (filterCategory) params.append('category_id',    filterCategory);
      if (filterPayment)  params.append('payment_method', filterPayment);
      if (filterDateFrom) params.append('date_from',      filterDateFrom);
      if (filterDateTo)   params.append('date_to',        filterDateTo);
      const res = await axiosInstance.get(`/finance?${params}`);
      const d   = res.data.data;
      setRecords(d.records);
      setTotal(d.total);
      setTotalPages(d.total_pages);
    } catch {
      setError('Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, [page, filterCategory, filterPayment, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchSummary();
  }, [fetchRecords, fetchSummary]);

  const handleMemberSearch = (val) => {
    setMemberSearch(val);
    setForm(f => ({ ...f, member_id: '', member_label: '' }));
    clearTimeout(memberSearchTimeout);
    if (!val.trim()) { setMemberResults([]); return; }
    memberSearchTimeout = setTimeout(async () => {
      setSearchingMember(true);
      try {
        const res = await axiosInstance.get(`/members?search=${encodeURIComponent(val)}&limit=6`);
        setMemberResults(res.data.data.members || []);
      } catch {}
      finally { setSearchingMember(false); }
    }, 300);
  };

  const selectMember = (m) => {
    setForm(f => ({ ...f, member_id: m.id, member_label: `${m.last_name}, ${m.first_name}` }));
    setMemberSearch(`${m.last_name}, ${m.first_name}`);
    setMemberResults([]);
  };

  const resetForm = () => {
    setForm({ member_id: '', member_label: '', category_id: '', amount: '', payment_method: 'cash',
      transaction_date: new Date().toISOString().slice(0, 10), receipt_number: '', notes: '' });
    setMemberSearch('');
    setMemberResults([]);
    setEditRecord(null);
    setFormError('');
  };

  const openEdit = (r) => {
    setEditRecord(r);
    setForm({
      member_id:        r.member_id,
      member_label:     `${r.Member?.last_name}, ${r.Member?.first_name}`,
      category_id:      r.category_id,
      amount:           r.amount,
      payment_method:   r.payment_method,
      transaction_date: r.transaction_date,
      receipt_number:   r.receipt_number || '',
      notes:            r.notes || ''
    });
    setMemberSearch(`${r.Member?.last_name}, ${r.Member?.first_name}`);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.member_id) { setFormError('Please select a member.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        member_id:        form.member_id,
        category_id:      form.category_id,
        amount:           parseFloat(form.amount),
        payment_method:   form.payment_method,
        transaction_date: form.transaction_date,
        receipt_number:   form.receipt_number || null,
        notes:            form.notes || null
      };
      if (editRecord) {
        await axiosInstance.put(`/finance/${editRecord.id}`, payload);
      } else {
        await axiosInstance.post('/finance', payload);
      }
      setShowForm(false);
      resetForm();
      fetchRecords();
      fetchSummary();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this financial record?')) return;
    try {
      await axiosInstance.delete(`/finance/${id}`);
      fetchRecords();
      fetchSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const formatAmount = (a) => parseFloat(a).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

  const totalAmount = summary.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Finance</h1>
          <p style={s.subtitle}>{total} total records</p>
        </div>
        {canRecord && (
          <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} style={s.addBtn}>
            {showForm ? '✕ Cancel' : '+ Add Record'}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={s.summaryRow}>
        <div style={s.summaryCard}>
          <div style={s.summaryNum}>{formatAmount(totalAmount)}</div>
          <div style={s.summaryLabel}>Total Collected</div>
        </div>
        {summary.map(row => {
          const name  = row.category?.name || '—';
          const total = parseFloat(row.total_amount || 0);
          const count = parseInt(row.count || 0);
          return (
            <div key={row.category_id} style={s.summaryCard}>
              <div style={{ ...s.summaryNum, fontSize: '20px' }}>{formatAmount(total)}</div>
              <div style={s.summaryLabel}>{name}</div>
              <div style={s.summaryCount}>{count} records</div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>{editRecord ? 'Edit Record' : 'Add Financial Record'}</h3>
          {formError && <div style={s.errorBox}>{formError}</div>}
          <form onSubmit={handleSubmit} style={s.form}>
            {/* Member search */}
            <div style={s.field}>
              <label style={s.label}>Member *</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={memberSearch}
                  onChange={e => handleMemberSearch(e.target.value)}
                  placeholder="Search member by name..."
                  style={s.input}
                  autoComplete="off"
                />
                {memberResults.length > 0 && (
                  <div style={s.dropdown}>
                    {memberResults.map(m => (
                      <div key={m.id} onClick={() => selectMember(m)} style={s.dropdownItem}>
                        <strong>{m.last_name}, {m.first_name}</strong>
                        {m.barcode && <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '12px' }}>#{m.barcode}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {searchingMember && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Searching...</div>}
              </div>
            </div>

            <div style={s.formRow}>
              <div style={s.field}>
                <label style={s.label}>Category *</label>
                <select name="category_id" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required style={s.select}>
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Amount (PHP) *</label>
                <input type="number" min="0.01" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00" required style={s.input} />
              </div>
            </div>

            <div style={s.formRow}>
              <div style={s.field}>
                <label style={s.label}>Payment Method *</label>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={s.select}>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash / E-wallet</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Transaction Date *</label>
                <input type="date" value={form.transaction_date}
                  onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} required style={s.input} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Receipt No.</label>
                <input value={form.receipt_number} onChange={e => setForm(f => ({ ...f, receipt_number: e.target.value }))}
                  placeholder="Optional" style={s.input} />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Optional notes..." style={{ ...s.input, resize: 'vertical' }} />
            </div>

            <div style={s.formActions}>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={s.cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...s.submitBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editRecord ? 'Update Record' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={s.filterBar}>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} style={s.filterSelect}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setPage(1); }} style={s.filterSelect}>
          <option value="">All Methods</option>
          <option value="cash">Cash</option>
          <option value="gcash">GCash</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
        <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} style={s.filterInput} placeholder="From" />
        <input type="date" value={filterDateTo}   onChange={e => { setFilterDateTo(e.target.value);   setPage(1); }} style={s.filterInput} placeholder="To" />
        {(filterCategory || filterPayment || filterDateFrom || filterDateTo) && (
          <button onClick={() => { setFilterCategory(''); setFilterPayment(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }} style={s.clearBtn}>✕ Clear</button>
        )}
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>Member</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Amount</th>
              <th style={s.th}>Method</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Receipt</th>
              <th style={s.th}>Recorded By</th>
              {canRecord && <th style={s.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canRecord ? 8 : 7} style={s.centerCell}>Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={canRecord ? 8 : 7} style={s.centerCell}>No records found.</td></tr>
            ) : records.map((r, i) => {
              const pmStyle = PAYMENT_STYLE[r.payment_method] || PAYMENT_STYLE.cash;
              return (
                <tr key={r.id}
                  style={{ ...s.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e8f4fd'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}
                >
                  <td style={s.td}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>
                      {r.Member?.last_name}, {r.Member?.first_name}
                    </div>
                  </td>
                  <td style={s.td}>{r.category?.name}</td>
                  <td style={{ ...s.td, fontWeight: '700', color: '#0f172a' }}>{formatAmount(r.amount)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: pmStyle.bg, color: pmStyle.color }}>
                      {PAYMENT_LABELS[r.payment_method]}
                    </span>
                  </td>
                  <td style={s.td}>{formatDate(r.transaction_date)}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                    {r.receipt_number || '—'}
                  </td>
                  <td style={{ ...s.td, fontSize: '12px', color: '#64748b' }}>
                    {r.recorder?.email || '—'}
                  </td>
                  {canRecord && (
                    <td style={s.td}>
                      <div style={s.actions}>
                        <button onClick={() => openEdit(r)} style={s.editBtn}>Edit</button>
                        <button onClick={() => handleDelete(r.id)} style={s.deleteBtn}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
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
      <style>{`
        /* ── Responsive tables ── */
        table { width: 100%; border-collapse: collapse; }
        .table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        @media (max-width: 768px) {
          table td, table th { font-size: 12px !important; padding: 8px 10px !important; white-space: nowrap; }
        }
        @media (max-width: 480px) {
          table td, table th { font-size: 11px !important; padding: 6px 8px !important; }
        }

      `}</style>
    </div>
  );
}

const s = {
  page:         { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title:        { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  subtitle:     { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  addBtn:       { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  summaryRow:   { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  summaryCard:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', flex: 1, minWidth: '140px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  summaryNum:   { fontSize: '24px', fontWeight: '800', color: '#0f172a' },
  summaryLabel: { fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '500' },
  summaryCount: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  formCard:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle:    { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0' },
  form:         { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow:      { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  field:        { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '160px' },
  label:        { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input:        { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:       { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#fff' },
  formActions:  { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn:    { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  submitBtn:    { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  dropdown:     { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden', marginTop: '4px' },
  dropdownItem: { padding: '10px 14px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f1f5f9' },
  filterBar:    { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  filterSelect: { padding: '8px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', outline: 'none' },
  filterInput:  { padding: '8px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none' },
  clearBtn:     { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  errorBox:     { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' },
  tableWrap:    { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  thead:        { background: '#f8fafc' },
  th:           { padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  row:          { transition: 'background 0.15s' },
  td:           { padding: '14px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  centerCell:   { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  badge:        { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  actions:      { display: 'flex', gap: '6px' },
  editBtn:      { background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn:    { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  pagination:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px' },
  pageBtn:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' },
  pageInfo:     { fontSize: '14px', color: '#64748b' },
};
