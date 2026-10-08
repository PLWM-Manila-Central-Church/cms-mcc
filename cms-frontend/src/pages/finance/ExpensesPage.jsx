import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);
const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const blankExpense = () => ({ account_id: '', category_id: '', date: today(), amount: '', description: '', payment_method_id: '' });

const buttonStyle = (variant = 'primary') => ({
  border: variant === 'primary' ? 'none' : '1px solid #dbe4ee',
  borderRadius: 9,
  padding: '9px 14px',
  minHeight: 38,
  background: variant === 'primary' ? '#075985' : '#fff',
  color: variant === 'primary' ? '#fff' : '#334155',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const fieldStyle = { width: '100%', minHeight: 40, boxSizing: 'border-box', padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit' };
const labelStyle = { display: 'block', marginBottom: 5, color: '#475569', fontSize: 12, fontWeight: 700 };

export default function ExpensesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('finance', 'create');
  const canUpdate = hasPermission('finance', 'update');
  const canDelete = hasPermission('finance', 'delete');
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [balance, setBalance] = useState({ total_income: 0, total_expense: 0, net_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expenseForm, setExpenseForm] = useState(blankExpense);
  const [showSetup, setShowSetup] = useState(false);
  const [fundForm, setFundForm] = useState({ name: '', description: '' });
  const [accountForm, setAccountForm] = useState({ name: '', fund_id: '', description: '' });
  const [categoryForm, setCategoryForm] = useState({ category_name: '', account_id: '', description: '' });
  const [setupBusy, setSetupBusy] = useState(false);

  const reloadLookups = useCallback(async () => {
    const [fundResponse, accountResponse, categoryResponse, methodResponse] = await Promise.all([
      axiosInstance.get('/finance/funds'),
      axiosInstance.get('/finance/accounts'),
      axiosInstance.get('/finance/expense-categories'),
      axiosInstance.get('/finance/payment-methods'),
    ]);
    setFunds(fundResponse.data.data || []);
    setAccounts(accountResponse.data.data || []);
    setCategories(categoryResponse.data.data || []);
    setPaymentMethods(methodResponse.data.data || []);
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (accountFilter) params.set('account_id', accountFilter);
    if (categoryFilter) params.set('category_id', categoryFilter);
    return params.toString();
  }, [page, dateFrom, dateTo, accountFilter, categoryFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [expenseResponse, balanceResponse] = await Promise.all([
        axiosInstance.get(`/finance/expenses?${query}`),
        axiosInstance.get('/finance/balance', { params: { ...(dateFrom && { date_from: dateFrom }), ...(dateTo && { date_to: dateTo }) } }),
      ]);
      const data = expenseResponse.data.data || {};
      setExpenses(data.expenses || []);
      setTotal(Number(data.total) || 0);
      setBalance(balanceResponse.data.data || { total_income: 0, total_expense: 0, net_balance: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Expense records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, query]);

  useEffect(() => { reloadLookups().catch((requestError) => setError(requestError.response?.data?.message || 'Finance setup could not be loaded.')); }, [reloadLookups]);
  useEffect(() => { loadData(); }, [loadData]);

  const resetExpenseForm = () => { setExpenseForm(blankExpense()); setEditing(null); setError(''); };
  const openCreate = () => { resetExpenseForm(); setShowExpenseForm(true); };
  const openEdit = (row) => {
    setEditing(row);
    setExpenseForm({
      account_id: String(row.account_id || ''),
      category_id: String(row.category_id || ''),
      date: String(row.date || '').slice(0, 10),
      amount: String(row.amount || ''),
      description: row.description || '',
      payment_method_id: String(row.payment_method_id || ''),
    });
    setShowExpenseForm(true);
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        account_id: Number(expenseForm.account_id),
        category_id: Number(expenseForm.category_id),
        date: expenseForm.date,
        amount: Number(expenseForm.amount),
        description: expenseForm.description.trim() || null,
        payment_method_id: Number(expenseForm.payment_method_id),
      };
      if (editing) await axiosInstance.put(`/finance/expenses/${editing.id}`, payload);
      else await axiosInstance.post('/finance/expenses', payload);
      setShowExpenseForm(false); resetExpenseForm();
      setNotice(editing ? 'Expense updated.' : 'Expense recorded.');
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Expense could not be saved.');
    } finally { setBusy(false); }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await axiosInstance.delete(`/finance/expenses/${id}`);
      setNotice('Expense deleted.');
      await loadData();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Expense could not be deleted.'); }
    finally { setBusy(false); }
  };

  const createSetupRecord = async (kind, event) => {
    event.preventDefault(); setSetupBusy(true); setError(''); setNotice('');
    try {
      if (kind === 'fund') {
        await axiosInstance.post('/finance/funds', fundForm);
        setFundForm({ name: '', description: '' });
      } else if (kind === 'account') {
        await axiosInstance.post('/finance/accounts', { ...accountForm, fund_id: Number(accountForm.fund_id) });
        setAccountForm({ name: '', fund_id: '', description: '' });
      } else {
        await axiosInstance.post('/finance/expense-categories', { ...categoryForm, account_id: Number(categoryForm.account_id) });
        setCategoryForm({ category_name: '', account_id: '', description: '' });
      }
      await reloadLookups();
      setNotice('Finance setup saved.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Finance setup could not be saved.'); }
    finally { setSetupBusy(false); }
  };

  const totalPages = Math.ceil(total / 15);
  const visibleCategories = categories.filter((category) => !accountFilter || String(category.account_id) === accountFilter);
  const formCategories = categories.filter((category) => !expenseForm.account_id || String(category.account_id) === String(expenseForm.account_id));

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 18, color: '#0f172a' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Link to="/finance" style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}>Income and giving</Link>
            <span style={{ ...buttonStyle(), display: 'inline-flex', alignItems: 'center' }}>Expenses</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Church Expenses</h1>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 14 }}>Record and review church spending, with totals for the selected date range.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canCreate && <button type="button" style={buttonStyle()} onClick={openCreate}>Add expense</button>}
          {canCreate && <button type="button" style={buttonStyle('secondary')} onClick={() => setShowSetup((value) => !value)}>{showSetup ? 'Close setup' : 'Finance setup'}</button>}
        </div>
      </header>

      {notice && <div role="status" style={{ padding: 12, borderRadius: 9, background: '#ecfdf5', color: '#047857' }}>{notice}</div>}
      {error && <div role="alert" style={{ padding: 12, borderRadius: 9, background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}

      {showSetup && canCreate && (
        <section style={{ padding: 18, border: '1px solid #dbe4ee', borderRadius: 14, background: '#fff' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 18 }}>Expense setup</h2>
          <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>Create the fund, account, and category options used by expense records. Payment methods are maintained by system configuration.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
            <form onSubmit={(event) => createSetupRecord('fund', event)} style={{ display: 'grid', gap: 9, alignContent: 'start' }}>
              <strong>Fund</strong>
              <label style={labelStyle}>Name<input required maxLength={100} value={fundForm.name} onChange={(event) => setFundForm({ ...fundForm, name: event.target.value })} style={fieldStyle} /></label>
              <label style={labelStyle}>Description<input maxLength={500} value={fundForm.description} onChange={(event) => setFundForm({ ...fundForm, description: event.target.value })} style={fieldStyle} /></label>
              <button disabled={setupBusy} style={buttonStyle()}>Add fund</button>
            </form>
            <form onSubmit={(event) => createSetupRecord('account', event)} style={{ display: 'grid', gap: 9, alignContent: 'start' }}>
              <strong>Account</strong>
              <label style={labelStyle}>Name<input required maxLength={100} value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} style={fieldStyle} /></label>
              <label style={labelStyle}>Fund<select required value={accountForm.fund_id} onChange={(event) => setAccountForm({ ...accountForm, fund_id: event.target.value })} style={fieldStyle}><option value="">Choose a fund</option>{funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select></label>
              <label style={labelStyle}>Description<input maxLength={500} value={accountForm.description} onChange={(event) => setAccountForm({ ...accountForm, description: event.target.value })} style={fieldStyle} /></label>
              <button disabled={setupBusy || !funds.length} style={buttonStyle()}>Add account</button>
            </form>
            <form onSubmit={(event) => createSetupRecord('category', event)} style={{ display: 'grid', gap: 9, alignContent: 'start' }}>
              <strong>Expense category</strong>
              <label style={labelStyle}>Name<input required maxLength={100} value={categoryForm.category_name} onChange={(event) => setCategoryForm({ ...categoryForm, category_name: event.target.value })} style={fieldStyle} /></label>
              <label style={labelStyle}>Account<select required value={categoryForm.account_id} onChange={(event) => setCategoryForm({ ...categoryForm, account_id: event.target.value })} style={fieldStyle}><option value="">Choose an account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label style={labelStyle}>Description<input maxLength={500} value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} style={fieldStyle} /></label>
              <button disabled={setupBusy || !accounts.length} style={buttonStyle()}>Add category</button>
            </form>
          </div>
        </section>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }} aria-label="Finance totals">
        {[['Income', balance.total_income], ['Expenses', balance.total_expense], ['Net balance', balance.net_balance]].map(([label, value]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <span style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 700 }}>{label}</span>
            <strong style={{ display: 'block', marginTop: 6, fontSize: 22 }}>{formatMoney(value)}</strong>
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }} aria-label="Expense filters">
        <label style={{ ...labelStyle, minWidth: 150 }}>Account<select value={accountFilter} onChange={(event) => { setAccountFilter(event.target.value); setCategoryFilter(''); setPage(1); }} style={fieldStyle}><option value="">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label style={{ ...labelStyle, minWidth: 160 }}>Category<select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} style={fieldStyle}><option value="">All categories</option>{visibleCategories.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}</select></label>
        <label style={{ ...labelStyle, minWidth: 140 }}>From<input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} style={fieldStyle} /></label>
        <label style={{ ...labelStyle, minWidth: 140 }}>To<input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} style={fieldStyle} /></label>
        <button type="button" style={{ ...buttonStyle('secondary'), alignSelf: 'end' }} onClick={() => { setDateFrom(''); setDateTo(''); setAccountFilter(''); setCategoryFilter(''); setPage(1); }}>Clear filters</button>
      </section>

      <section style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['Date', 'Description', 'Category', 'Account', 'Payment', 'Amount', 'Actions'].map((heading) => <th key={heading} style={{ padding: 12, fontSize: 12, color: '#64748b' }}>{heading}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Loading expenses…</td></tr>
              : expenses.length === 0 ? <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>{accounts.length && categories.length ? 'No expenses match these filters.' : 'Set up a fund, account, and expense category before recording expenses.'}</td></tr>
                : expenses.map((expense) => (
                  <tr key={expense.id} style={{ borderTop: '1px solid #eef2f7' }}>
                    <td style={{ padding: 12 }}>{formatDate(expense.date)}</td>
                    <td style={{ padding: 12 }}>{expense.description || '—'}</td>
                    <td style={{ padding: 12 }}>{expense.category?.category_name || '—'}</td>
                    <td style={{ padding: 12 }}>{expense.account?.name || '—'}</td>
                    <td style={{ padding: 12 }}>{expense.paymentMethod?.method_name || '—'}</td>
                    <td style={{ padding: 12, fontWeight: 700 }}>{formatMoney(expense.amount)}</td>
                    <td style={{ padding: 12, whiteSpace: 'nowrap' }}>
                      {canUpdate && <button type="button" style={buttonStyle('secondary')} onClick={() => openEdit(expense)}>Edit</button>}
                      {canDelete && <button type="button" style={{ ...buttonStyle('secondary'), marginLeft: 6, color: '#b91c1c' }} disabled={busy} onClick={() => deleteExpense(expense.id)}>Delete</button>}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {totalPages > 1 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, alignItems: 'center' }}><span>Page {page} of {totalPages} · {total} expenses</span><div style={{ display: 'flex', gap: 8 }}><button type="button" disabled={page <= 1} style={buttonStyle('secondary')} onClick={() => setPage((current) => current - 1)}>Previous</button><button type="button" disabled={page >= totalPages} style={buttonStyle('secondary')} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}
      </section>

      {showExpenseForm && (
        <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowExpenseForm(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.48)' }}>
          <section role="dialog" aria-modal="true" aria-labelledby="expense-form-title" style={{ width: 'min(100%,620px)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 22 }}>
            <h2 id="expense-form-title" style={{ marginTop: 0 }}>{editing ? 'Edit expense' : 'Add expense'}</h2>
            <form onSubmit={submitExpense} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              <label style={labelStyle}>Account<select required value={expenseForm.account_id} onChange={(event) => setExpenseForm((current) => ({ ...current, account_id: event.target.value, category_id: '' }))} style={fieldStyle}><option value="">Choose an account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label style={labelStyle}>Expense category<select required value={expenseForm.category_id} onChange={(event) => setExpenseForm({ ...expenseForm, category_id: event.target.value })} style={fieldStyle}><option value="">Choose a category</option>{formCategories.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}</select></label>
              <label style={labelStyle}>Date<input type="date" required value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} style={fieldStyle} /></label>
              <label style={labelStyle}>Amount (PHP)<input type="number" step="0.01" min="0.01" required value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} style={fieldStyle} /></label>
              <label style={labelStyle}>Payment method<select required value={expenseForm.payment_method_id} onChange={(event) => setExpenseForm({ ...expenseForm, payment_method_id: event.target.value })} style={fieldStyle}><option value="">Choose a method</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.method_name}</option>)}</select></label>
              <label style={labelStyle}>Description<input maxLength={500} value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} style={fieldStyle} /></label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" style={buttonStyle('secondary')} onClick={() => { setShowExpenseForm(false); resetExpenseForm(); }}>Cancel</button>
                <button type="submit" style={buttonStyle()} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
