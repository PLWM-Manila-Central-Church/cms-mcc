import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import useDialogFocus from '../../hooks/useDialogFocus';
import { localDateInputValue } from '../../utils/localDateInput';
import { getDateRangeError } from '../../utils/dateRange';
import FinanceAttachments from '../../components/finance/FinanceAttachments';
import FinanceNavigation from '../../components/finance/FinanceNavigation';

const PAGE_SIZE = 20;
const EMPTY_EXPENSE = () => ({ category_id: '', amount: '', date: localDateInputValue(), payment_method_id: '', description: '' });
const getData = (response) => response?.data?.data;
const getError = (error, fallback) => error?.response?.data?.message || fallback;
const money = (amount) => Number(amount || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const categoryPath = '/finance/expense-categories';

const fieldStyle = {
  width: '100%', minHeight: 42, border: '1px solid var(--mcc-border, #d7e0e8)', borderRadius: 9,
  padding: '9px 11px', color: 'var(--mcc-ink, #172033)', background: '#fff', font: 'inherit', boxSizing: 'border-box',
};
const labelStyle = { display: 'grid', gap: 6, color: 'var(--mcc-secondary, #52647a)', fontSize: 12, fontWeight: 700 };
const cardStyle = { background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 14, padding: 18 };
const primaryButton = { minHeight: 40, border: 0, borderRadius: 9, background: '#16834b', color: '#fff', padding: '9px 14px', fontWeight: 700, cursor: 'pointer', font: 'inherit' };
const quietButton = { minHeight: 36, border: '1px solid var(--mcc-border, #d7e0e8)', borderRadius: 8, background: '#fff', color: '#334155', padding: '7px 11px', fontWeight: 650, cursor: 'pointer', font: 'inherit' };

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { confirm } = useConfirmation();
  const canCreate = hasPermission('finance', 'create');
  const canUpdate = hasPermission('finance', 'update');
  const canArchive = hasPermission('finance', 'archive');
  const [view, setView] = useState('records');
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [balance, setBalance] = useState({ total_income: 0, total_expense: 0, net_balance: 0 });
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [setupDialog, setSetupDialog] = useState(null);
  const [setupForm, setSetupForm] = useState({});
  const expenseDialogRef = useRef(null);
  const setupDialogRef = useRef(null);
  const closeExpenseDialog = () => { if (!saving) setExpenseDialog(false); };
  const closeSetupDialog = () => { if (!saving) setSetupDialog(null); };
  useDialogFocus(expenseDialog, expenseDialogRef, closeExpenseDialog);
  useDialogFocus(Boolean(setupDialog), setupDialogRef, closeSetupDialog);

  const dateError = getDateRangeError(dateFrom, dateTo);
  const params = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (dateFrom) query.set('date_from', dateFrom);
    if (dateTo) query.set('date_to', dateTo);
    if (categoryFilter) query.set('category_id', categoryFilter);
    return query.toString();
  }, [page, dateFrom, dateTo, categoryFilter]);

  const loadPage = useCallback(async () => {
    if (dateError) {
      setError(dateError);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const balanceQuery = new URLSearchParams();
      if (dateFrom) balanceQuery.set('date_from', dateFrom);
      if (dateTo) balanceQuery.set('date_to', dateTo);
      const [expenseResponse, categoryResponse, paymentResponse, balanceResponse] = await Promise.all([
        axiosInstance.get(`/finance/expenses?${params}`),
        axiosInstance.get('/finance/expense-categories'),
        axiosInstance.get('/finance/payment-methods'),
        axiosInstance.get(`/finance/balance${balanceQuery.size ? `?${balanceQuery}` : ''}`),
      ]);
      const expenseData = getData(expenseResponse) || {};
      setRecords(expenseData.expenses || []);
      setTotal(Number(expenseData.total || 0));
      setTotalPages(Number(expenseData.total_pages || 0));
      setCategories(getData(categoryResponse) || []);
      setPaymentMethods(getData(paymentResponse) || []);
      setBalance(getData(balanceResponse) || { total_income: 0, total_expense: 0, net_balance: 0 });
    } catch (requestError) {
      setError(getError(requestError, 'Finance records could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [dateError, dateFrom, dateTo, params]);

  useEffect(() => { loadPage(); }, [loadPage]);

  const refreshAll = async () => {
    await loadPage();
    await queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'], refetchType: 'all' });
  };

  const openExpenseForm = (record = null) => {
    setError('');
    setNotice('');
    setEditingExpense(record);
    setExpenseForm(record ? {
      category_id: String(record.category_id || ''),
      amount: String(record.amount || ''),
      date: record.date || localDateInputValue(),
      payment_method_id: String(record.payment_method_id || ''),
      description: record.description || '',
    } : EMPTY_EXPENSE());
    setExpenseDialog(true);
  };

  const saveExpense = async (event) => {
    event.preventDefault();
    if (!expenseForm.category_id || !expenseForm.payment_method_id) {
      setError('Choose an expense category and payment method.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        category_id: Number(expenseForm.category_id),
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
        payment_method_id: Number(expenseForm.payment_method_id),
        description: expenseForm.description.trim() || null,
      };
      if (editingExpense) await axiosInstance.put(`/finance/expenses/${editingExpense.id}`, payload);
      else await axiosInstance.post('/finance/expenses', payload);
      setExpenseDialog(false);
      setNotice(editingExpense ? 'Expense updated.' : 'Expense recorded.');
      await refreshAll();
    } catch (saveError) {
      setError(getError(saveError, 'Expense could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const archiveExpense = async (record) => {
    if (!(await confirm({
      title: 'Archive expense record?',
      message: `PHP ${Number(record.amount || 0).toFixed(2)} from ${dateLabel(record.date)} will leave active totals. Its record and receipts will be retained; a System Admin can restore it from System Archives.`,
      confirmLabel: 'Archive record',
    }))) return;
    setError('');
    try {
      await axiosInstance.patch(`/finance/expenses/${record.id}/archive`);
      setNotice('Expense archived. Its history and receipts remain available for a System Admin to restore from System Archives.');
      await refreshAll();
    } catch (archiveError) {
      setError(getError(archiveError, 'Expense could not be archived.'));
    }
  };

  const openSetupForm = (item = null) => {
    setError('');
    setNotice('');
    setSetupDialog({ item });
    const source = item || {};
    setSetupForm({ category_name: source.category_name || '', description: source.description || '' });
  };

  const saveSetup = async (event) => {
    event.preventDefault();
    if (!setupDialog) return;
    const { item } = setupDialog;
    const payload = { category_name: setupForm.category_name.trim(), description: setupForm.description.trim() || null };
    setSaving(true);
    setError('');
    try {
      if (item) await axiosInstance.put(`${categoryPath}/${item.id}`, payload);
      else await axiosInstance.post(categoryPath, payload);
      setSetupDialog(null);
      setNotice(`Expense category ${item ? 'updated' : 'created'}.`);
      await loadPage();
    } catch (saveError) {
      setError(getError(saveError, 'Expense category could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const archiveSetupItem = async (item, displayName) => {
    if (!(await confirm({
      title: 'Archive expense category?',
      message: `${displayName} will be hidden from new entries. Existing finance history will be retained and can be restored by a System Admin.`,
      confirmLabel: 'Archive expense category',
    }))) return;
    try {
      await axiosInstance.patch(`${categoryPath}/${item.id}/archive`);
      setNotice('Expense category archived. A System Admin can restore it from System Archives.');
      await loadPage();
    } catch (archiveError) {
      setError(getError(archiveError, 'Expense category could not be archived.'));
    }
  };

  return (
    <div className="mcc-module mcc-module-finance-expenses" style={{ fontFamily: 'inherit', display: 'grid', gap: 18 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="workspace-page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--mcc-ink, #0f172a)', margin: 0 }}>Expenses</h1>
          <p style={{ fontSize: 14, color: 'var(--mcc-secondary, #52647a)', margin: '5px 0 0', maxWidth: 700 }}>Record and review outgoing funds by category, date, payment method and amount.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canCreate && view === 'records' && <button type="button" onClick={() => openExpenseForm()} disabled={!categories.length || !paymentMethods.length} style={primaryButton}>+ Add expense</button>}
          {(canCreate || canUpdate || canArchive) && <button type="button" onClick={() => setView((current) => current === 'setup' ? 'records' : 'setup')} style={quietButton}>{view === 'setup' ? 'Back to expenses' : 'Expense setup'}</button>}
        </div>
      </header>

      <FinanceNavigation />

      {error && <div role="alert" className="cms-error-box">{error}</div>}
      {notice && <div role="status" style={{ ...cardStyle, borderColor: '#bbdfc8', color: '#176b3a', padding: '11px 14px' }}>{notice}</div>}

      {view === 'records' ? <>
        <section aria-label="Finance totals" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {[
            ['Received income', balance.total_income],
            ['Expenses', balance.total_expense],
            ['Net balance', balance.net_balance],
          ].map(([label, amount]) => <article key={label} style={cardStyle}>
            <div style={{ color: 'var(--mcc-secondary, #52647a)', fontSize: 12, fontWeight: 650 }}>{label}</div>
            <div style={{ marginTop: 7, color: label === 'Expenses' ? '#9a3412' : '#176b3a', fontSize: 22, fontWeight: 800 }}>{money(amount)}</div>
            <div style={{ marginTop: 4, color: '#64748b', fontSize: 11 }}>{dateFrom || dateTo ? 'Selected period' : 'All-time active records'}</div>
          </article>)}
        </section>

        {!categories.length && <section style={{ ...cardStyle, borderColor: '#f3d18c', background: '#fffbeb' }}>
          <strong style={{ color: '#713f12' }}>Expense categories need setup</strong>
          <p style={{ margin: '7px 0 12px', color: '#854d0e', fontSize: 13 }}>Create at least one expense category before recording expenses.</p>
          {(canCreate || canUpdate || canArchive) && <button type="button" style={quietButton} onClick={() => setView('setup')}>Open expense setup</button>}
        </section>}

        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ ...labelStyle, minWidth: 155 }}>From<input aria-label="From date" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} style={fieldStyle} /></label>
            <label style={{ ...labelStyle, minWidth: 155 }}>To<input aria-label="To date" type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} style={fieldStyle} /></label>
            <label style={{ ...labelStyle, minWidth: 190 }}>Category<select aria-label="Expense category filter" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} style={fieldStyle}>
              <option value="">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.category_name}</option>)}
            </select></label>
            <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); setCategoryFilter(''); setPage(1); }} style={quietButton}>Clear filters</button>
          </div>
          <div style={{ marginTop: 18, border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 10, overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 820 }}>
              <thead><tr>{['Date', 'Description', 'Category', 'Method', 'Amount', 'Receipt', 'Actions'].map((heading) => <th key={heading} scope="col" style={{ textAlign: 'left', padding: '11px 12px', background: '#f8fafc', color: '#52647a', borderBottom: '1px solid #e2e8f0', fontSize: 11, letterSpacing: '.03em', textTransform: 'uppercase' }}>{heading}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Loading expenses…</td></tr>
                  : records.length === 0 ? <tr><td colSpan={7} style={{ padding: 26, textAlign: 'center', color: '#64748b' }}>No expense records in this period.</td></tr>
                    : records.map((record) => <tr key={record.id}>
                      <td style={cellStyle}>{dateLabel(record.date)}</td>
                      <td style={{ ...cellStyle, maxWidth: 220, whiteSpace: 'normal' }}>{record.description || '—'}</td>
                      <td style={cellStyle}>{record.category?.category_name || '—'}</td>
                      <td style={cellStyle}>{record.paymentMethod?.method_name || '—'}</td>
                      <td style={{ ...cellStyle, color: '#9a3412', fontWeight: 750 }}>{money(record.amount)}</td>
                      <td style={{ ...cellStyle, minWidth: 150 }}><FinanceAttachments attachments={record.attachments || []} targetType="expense" targetId={record.id} canUpload={canCreate} canArchive={canArchive} onChanged={loadPage} labels={{ title: 'Receipts', empty: 'No receipts', add: 'Add receipt' }} compact /></td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                        {canUpdate && <button type="button" onClick={() => openExpenseForm(record)} style={quietButton}>Edit</button>}
                        {canArchive && <button type="button" onClick={() => archiveExpense(record)} style={{ ...quietButton, marginLeft: 6, color: '#9a3412' }}>Archive</button>}
                      </td>
                    </tr>)}
              </tbody>
            </table>
          </div>
          {total > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 14, color: '#64748b', fontSize: 13 }}>
            <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 8 }}><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} style={quietButton}>Previous</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} style={quietButton}>Next</button></div>
          </div>}
        </section>
      </> : <section style={{ display: 'grid', gap: 14 }}>
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 5px', color: '#172033', fontSize: 18 }}>Expense categories</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Use categories to group outgoing payments. Expense records have no account assignment.</p>
        </div>
        <SetupSection title="Categories" description="Choose a clear label that helps finance reporting." onAdd={() => openSetupForm()} canCreate={canCreate}>
          {categories.map((item) => <SetupRow key={item.id} title={item.category_name} subtitle={item.description || '—'} canUpdate={canUpdate} canArchive={canArchive} onEdit={() => openSetupForm(item)} onArchive={() => archiveSetupItem(item, item.category_name)} />)}
        </SetupSection>
        {categories.length === 0 && <p style={{ color: '#64748b', margin: '0 4px' }}>No expense categories exist yet. Add a category to enable expense entry.</p>}
      </section>}

      {expenseDialog && <Modal title={editingExpense ? 'Edit expense' : 'Add expense'} dialogRef={expenseDialogRef} onClose={closeExpenseDialog}>
        <form onSubmit={saveExpense} style={{ display: 'grid', gap: 13 }}>
          {error && <div role="alert" className="cms-error-box">{error}</div>}
          <label style={labelStyle}>Expense category<select required aria-label="Expense category" value={expenseForm.category_id} onChange={(event) => setExpenseForm((form) => ({ ...form, category_id: event.target.value }))} style={fieldStyle}>
            <option value="">Select a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.category_name}</option>)}
          </select></label>
          <label style={labelStyle}>Amount (PHP)<input required aria-label="Amount (PHP)" type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm((form) => ({ ...form, amount: event.target.value }))} style={fieldStyle} /></label>
          <label style={labelStyle}>Date<input required aria-label="Expense date" type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((form) => ({ ...form, date: event.target.value }))} style={fieldStyle} /></label>
          <label style={labelStyle}>Payment method<select required aria-label="Payment method" value={expenseForm.payment_method_id} onChange={(event) => setExpenseForm((form) => ({ ...form, payment_method_id: event.target.value }))} style={fieldStyle}>
            <option value="">Select payment method</option>{paymentMethods.map((method) => <option value={method.id} key={method.id}>{method.method_name}</option>)}
          </select></label>
          <label style={labelStyle}>Description<input aria-label="Description" maxLength={500} value={expenseForm.description} onChange={(event) => setExpenseForm((form) => ({ ...form, description: event.target.value }))} style={fieldStyle} /></label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 5 }}><button type="button" onClick={closeExpenseDialog} disabled={saving} style={quietButton}>Cancel</button><button type="submit" disabled={saving} style={primaryButton}>{saving ? 'Saving…' : editingExpense ? 'Save changes' : 'Record expense'}</button></div>
        </form>
      </Modal>}

      {setupDialog && <Modal title={`${setupDialog.item ? 'Edit' : 'Add'} expense category`} dialogRef={setupDialogRef} onClose={closeSetupDialog}>
        <form onSubmit={saveSetup} style={{ display: 'grid', gap: 13 }}>
          {error && <div role="alert" className="cms-error-box">{error}</div>}
          <label style={labelStyle}>Category name<input required maxLength={100} value={setupForm.category_name || ''} onChange={(event) => setSetupForm((form) => ({ ...form, category_name: event.target.value }))} style={fieldStyle} /></label>
          <label style={labelStyle}>Description<textarea maxLength={500} rows={3} value={setupForm.description || ''} onChange={(event) => setSetupForm((form) => ({ ...form, description: event.target.value }))} style={{ ...fieldStyle, resize: 'vertical' }} /></label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" onClick={closeSetupDialog} disabled={saving} style={quietButton}>Cancel</button><button type="submit" disabled={saving} style={primaryButton}>{saving ? 'Saving…' : setupDialog.item ? 'Save changes' : 'Add category'}</button></div>
        </form>
      </Modal>}
    </div>
  );
}

const cellStyle = { padding: '11px 12px', borderBottom: '1px solid #eef2f6', color: '#334155', fontSize: 13, verticalAlign: 'top' };

function SetupSection({ title, description, onAdd, canCreate, children }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return <section style={cardStyle}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
      <div><h3 style={{ margin: 0, fontSize: 16, color: '#172033' }}>{title}</h3><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>{description}</p></div>
      {canCreate && <button type="button" onClick={onAdd} style={quietButton}>Add</button>}
    </div>
    <div style={{ display: 'grid', gap: 7, marginTop: 12 }}>{rows.length ? rows : <div style={{ color: '#94a3b8', fontSize: 13 }}>No active {title.toLowerCase()}.</div>}</div>
  </section>;
}

function SetupRow({ title, subtitle, canUpdate, canArchive, onEdit, onArchive }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid #edf1f5', borderRadius: 9, padding: '10px 12px' }}>
    <div style={{ minWidth: 0 }}><strong style={{ display: 'block', color: '#1f2937', fontSize: 13 }}>{title}</strong><span style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: 12 }}>{subtitle}</span></div>
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{canUpdate && <button type="button" onClick={onEdit} style={quietButton}>Edit</button>}{canArchive && <button type="button" onClick={onArchive} style={{ ...quietButton, color: '#9a3412' }}>Archive</button>}</div>
  </div>;
}

function Modal({ title, dialogRef, onClose, children }) {
  return <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,.48)' }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} style={{ width: 'min(100%, 520px)', maxHeight: 'min(90vh, 760px)', overflowY: 'auto', background: '#fff', borderRadius: 15, padding: 22, boxShadow: '0 24px 70px rgba(15,23,42,.28)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 17 }}><h2 style={{ margin: 0, fontSize: 19, color: '#172033' }}>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} style={quietButton}>×</button></div>
      {children}
    </section>
  </div>;
}
