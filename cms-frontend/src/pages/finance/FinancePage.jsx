import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import MonoIcon from '../../components/common/MonoIcon';

const PAYMENT_LABELS = { cash: 'Cash', gcash: 'GCash', bank_transfer: 'Bank Transfer' };
const PAYMENT_STYLE = {
  cash: { bg: '#f0fdf4', color: '#16a34a' },
  gcash: { bg: '#faf5ff', color: '#7c3aed' },
  bank_transfer: { bg: '#e8f4fd', color: '#0066b3' }
};

const TYPE_BADGE = {
  Tithes:    { bg: '#ecfdf5', color: '#059669' },
  Offering:  { bg: '#eff6ff', color: '#2563eb' },
  Pledge:    { bg: '#fef3c7', color: '#d97706' },
  Missions:  { bg: '#fce7f3', color: '#db2777' },
  Others:    { bg: '#f3e8ff', color: '#7c3aed' },
  default:   { bg: '#f1f5f9', color: '#475569' },
};

const PAYMENT_ICON = {
  cash: '💵',
  gcash: '💜',
  bank_transfer: '🏦',
};

function getInitials(name = '') {
  return name.split(', ').map(n => n.trim().charAt(0)).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name = '') {
  const colors = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4f46e5'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function FinancePage() {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Permissions check
  useEffect(() => {
    if (user?.roleName === 'Member') navigate('/finance/my-giving', { replace: true });
  }, [user, navigate]);

  const canCreate = hasPermission('finance', 'create');
  const canUpdate = hasPermission('finance', 'update');
  const canDelete = hasPermission('finance', 'delete');

  // Multi-tab state: 'income' | 'expenses' | 'funds'
  const [activeTab, setActiveTab] = useState('income');

  // Helper: extract filename from full path
  const getAttachmentUrl = (filePath) => {
    if (!filePath) return '';
    const filename = filePath.split(/[/\\]/).pop();
    const base = axiosInstance.defaults.baseURL || '';
    const cleanBase = base.replace(/\/api$/, '').replace(/\/$/, '');
    return `${cleanBase}/uploads/receipts/${filename}`;
  };

  // Format currency/date
  const formatAmount = (a) => parseFloat(a || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  // Modal receipt previewer
  const [previewImage, setPreviewImage] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // ── TAB 1: INCOME STATE & LOGIC ──────────────────────────────
  // ─────────────────────────────────────────────────────────────
  const [incomeRecords, setIncomeRecords] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [incomeTotal, setIncomeTotal] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [incomePages, setIncomePages] = useState(1);
  const [incomePage, setIncomePage] = useState(1);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeError, setIncomeError] = useState('');
  const [incomeCategories, setIncomeCategories] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [incomeSummary, setIncomeSummary] = useState([]);
  const [allTimeSummary, setAllTimeSummary] = useState([]);

  // Income Filters
  const [incFilterCategory, setIncFilterCategory] = useState('');
  const [incFilterPayment, setIncFilterPayment] = useState('');
  const [incFilterDateFrom, setIncFilterDateFrom] = useState('');
  const [incFilterDateTo, setIncFilterDateTo] = useState('');
  const [incFilterSearch, setIncFilterSearch] = useState('');

  // Income Form
  const [showIncForm, setShowIncForm] = useState(false);
  const [editIncRecord, setEditIncRecord] = useState(null);
  const [incForm, setIncForm] = useState({
    member_id: '', member_label: '', category_id: '', amount: '',
    payment_method: 'cash', transaction_date: new Date().toISOString().slice(0, 10),
    receipt_number: '', notes: ''
  });
  const [incSaving, setIncSaving] = useState(false);
  const [incFormError, setIncFormError] = useState('');

  const [incMemberSearch, setIncMemberSearch] = useState('');
  const [incMemberResults, setIncMemberResults] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [incSearchingMember, setIncSearchingMember] = useState(false);
  const incSearchTimeout = useRef(null);

  const fetchIncomeCategories = async () => {
    try {
      const res = await axiosInstance.get('/finance/categories');
      setIncomeCategories(res.data.data);
    } catch {}
  };

  const fetchIncomeSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (incFilterCategory) params.append('category_id', incFilterCategory);
      if (incFilterPayment)  params.append('payment_method', incFilterPayment);
      if (incFilterDateFrom) params.append('date_from', incFilterDateFrom);
      if (incFilterDateTo)   params.append('date_to', incFilterDateTo);
      const res = await axiosInstance.get(`/finance/summary?${params}`);
      setIncomeSummary(res.data.data);
    } catch {}
  }, [incFilterCategory, incFilterPayment, incFilterDateFrom, incFilterDateTo]);

  const fetchAllTimeSummary = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/finance/summary');
      setAllTimeSummary(res.data.data);
    } catch {}
  }, []);

  const fetchIncomeRecords = useCallback(async () => {
    setIncomeLoading(true); setIncomeError('');
    try {
      const params = new URLSearchParams({ page: incomePage, limit: 15 });
      if (incFilterCategory) params.append('category_id', incFilterCategory);
      if (incFilterPayment)  params.append('payment_method', incFilterPayment);
      if (incFilterDateFrom) params.append('date_from', incFilterDateFrom);
      if (incFilterDateTo)   params.append('date_to', incFilterDateTo);
      const res = await axiosInstance.get(`/finance?${params}`);
      const d = res.data.data;
      setIncomeRecords(d.records);
      setIncomeTotal(d.total);
      setIncomePages(d.total_pages);
    } catch {
      setIncomeError('Failed to load income records.');
    } finally {
      setIncomeLoading(false);
    }
  }, [incomePage, incFilterCategory, incFilterPayment, incFilterDateFrom, incFilterDateTo]);

  const handleIncMemberSearch = (val) => {
    setIncMemberSearch(val);
    setIncForm(f => ({ ...f, member_id: '', member_label: '' }));
    clearTimeout(incSearchTimeout.current);
    if (!val.trim()) { setIncMemberResults([]); return; }
    incSearchTimeout.current = setTimeout(async () => {
      setIncSearchingMember(true);
      try {
        const res = await axiosInstance.get(`/members?search=${encodeURIComponent(val)}&limit=6`);
        setIncMemberResults(res.data.data.members || []);
      } catch {}
      finally { setIncSearchingMember(false); }
    }, 300);
  };

  const selectIncMember = (m) => {
    setIncForm(f => ({ ...f, member_id: m.id, member_label: `${m.last_name}, ${m.first_name}` }));
    setIncMemberSearch(`${m.last_name}, ${m.first_name}`);
    setIncMemberResults([]);
  };

  const resetIncForm = () => {
    setIncForm({ member_id: '', member_label: '', category_id: '', amount: '', payment_method: 'cash', transaction_date: new Date().toISOString().slice(0, 10), receipt_number: '', notes: '' });
    setIncMemberSearch('');
    setIncMemberResults([]);
    setEditIncRecord(null);
    setIncFormError('');
  };

  const handleIncSubmit = async (e) => {
    e.preventDefault();
    if (!incForm.member_id) { setIncFormError('Please select a member.'); return; }
    setIncSaving(true); setIncFormError('');
    try {
      const payload = {
        member_id: incForm.member_id,
        category_id: incForm.category_id,
        amount: parseFloat(incForm.amount),
        payment_method: incForm.payment_method,
        transaction_date: incForm.transaction_date,
        receipt_number: incForm.receipt_number || null,
        notes: incForm.notes || null
      };
      if (editIncRecord) {
        await axiosInstance.put(`/finance/records/${editIncRecord.id}`, payload);
      } else {
        await axiosInstance.post('/finance/records', payload);
      }
      setShowIncForm(false);
      resetIncForm();
      fetchIncomeRecords();
      fetchIncomeSummary();
    } catch (err) {
      setIncFormError(err.response?.data?.message || 'Failed to save income record.');
    } finally {
      setIncSaving(false);
    }
  };

  const handleIncDelete = async (id) => {
    if (!window.confirm('Delete this income record?')) return;
    try {
      await axiosInstance.delete(`/finance/records/${id}`);
      fetchIncomeRecords();
      fetchIncomeSummary();
    } catch (err) {
      setIncomeError(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ── TAB 2: EXPENSES STATE & LOGIC ────────────────────────────
  // ─────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [expTotal, setExpTotal] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [expPages, setExpPages] = useState(1);
  const [expPage, setExpPage] = useState(1);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState('');
  const [expSummary, setExpSummary] = useState([]);

  // Expense Filters
  const [expFilterAccount, setExpFilterAccount] = useState('');
  const [expFilterCategory, setExpFilterCategory] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [expFilterPayment, setExpFilterPayment] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [expFilterDateFrom, setExpFilterDateFrom] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [expFilterDateTo, setExpFilterDateTo] = useState('');

  // Expense Form
  const [showExpForm, setShowExpForm] = useState(false);
  const [editExpRecord, setEditExpRecord] = useState(null);
  const [expForm, setExpForm] = useState({
    account_id: '', category_id: '', amount: '', date: new Date().toISOString().slice(0, 10),
    payment_method_id: '', description: '', attachment_id: null, attachment_name: ''
  });
  const [expSaving, setExpSaving] = useState(false);
  const [expFormError, setExpFormError] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const fetchExpensesSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (expFilterAccount)  params.append('account_id', expFilterAccount);
      if (expFilterCategory) params.append('category_id', expFilterCategory);
      if (expFilterDateFrom) params.append('date_from', expFilterDateFrom);
      if (expFilterDateTo)   params.append('date_to', expFilterDateTo);
      const res = await axiosInstance.get(`/finance/expenses/summary?${params}`);
      setExpSummary(res.data.data);
    } catch {}
  }, [expFilterAccount, expFilterCategory, expFilterDateFrom, expFilterDateTo]);

  const fetchExpenses = useCallback(async () => {
    setExpLoading(true); setExpError('');
    try {
      const params = new URLSearchParams({ page: expPage, limit: 15 });
      if (expFilterAccount)  params.append('account_id', expFilterAccount);
      if (expFilterCategory) params.append('category_id', expFilterCategory);
      if (expFilterPayment)  params.append('payment_method_id', expFilterPayment);
      if (expFilterDateFrom) params.append('date_from', expFilterDateFrom);
      if (expFilterDateTo)   params.append('date_to', expFilterDateTo);
      const res = await axiosInstance.get(`/finance/expenses?${params}`);
      const d = res.data.data;
      setExpenses(d.expenses);
      setExpTotal(d.total);
      setExpPages(d.total_pages);
    } catch {
      setExpError('Failed to load expenditures.');
    } finally {
      setExpLoading(false);
    }
  }, [expPage, expFilterAccount, expFilterCategory, expFilterPayment, expFilterDateFrom, expFilterDateTo]);

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingReceipt(true); setExpFormError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axiosInstance.post('/finance/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExpForm(f => ({
        ...f,
        attachment_id: res.data.data.id,
        attachment_name: file.name
      }));
    } catch (err) {
      setExpFormError('Failed to upload receipt attachment.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const resetExpForm = () => {
    setExpForm({ account_id: '', category_id: '', amount: '', date: new Date().toISOString().slice(0, 10), payment_method_id: '', description: '', attachment_id: null, attachment_name: '' });
    setEditExpRecord(null);
    setExpFormError('');
  };

  const handleExpSubmit = async (e) => {
    e.preventDefault();
    setExpSaving(true); setExpFormError('');
    try {
      const payload = {
        account_id: parseInt(expForm.account_id),
        category_id: parseInt(expForm.category_id),
        amount: parseFloat(expForm.amount),
        date: expForm.date,
        payment_method_id: parseInt(expForm.payment_method_id),
        description: expForm.description || null
      };

      let savedExpense;
      if (editExpRecord) {
        const res = await axiosInstance.put(`/finance/expenses/${editExpRecord.id}`, payload);
        savedExpense = res.data.data;
      } else {
        const res = await axiosInstance.post('/finance/expenses', payload);
        savedExpense = res.data.data;
      }

      // Link attachment if freshly uploaded
      if (expForm.attachment_id) {
        const formData = new FormData();
        formData.append('expense_id', savedExpense.id);
        // Link to exist attachment
        await axiosInstance.put(`/finance/expenses/${savedExpense.id}`, {
          ...payload,
          attachment_id: expForm.attachment_id
        });
      }

      setShowExpForm(false);
      resetExpForm();
      fetchExpenses();
      fetchExpensesSummary();
    } catch (err) {
      setExpFormError(err.response?.data?.message || 'Failed to save expenditure.');
    } finally {
      setExpSaving(false);
    }
  };

  const handleExpDelete = async (id) => {
    if (!window.confirm('Delete this expenditure?')) return;
    try {
      await axiosInstance.delete(`/finance/expenses/${id}`);
      fetchExpenses();
      fetchExpensesSummary();
    } catch (err) {
      setExpError(err.response?.data?.message || 'Failed to delete expenditure.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ── TAB 3: SETTINGS STATE & LOGIC ────────────────────────────
  // ─────────────────────────────────────────────────────────────
  const [funds, setFunds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [expCategories, setExpCategories] = useState([]);
  const [payMethods, setPayMethods] = useState([]);

  // Forms
  const [showFundForm, setShowFundForm] = useState(false);
  const [fundForm, setFundForm] = useState({ name: '', description: '' });
  const [editFund, setEditFund] = useState(null);

  const [showAccForm, setShowAccForm] = useState(false);
  const [accForm, setAccForm] = useState({ name: '', fund_id: '', description: '' });
  const [editAcc, setEditAcc] = useState(null);

  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ category_name: '', account_id: '', description: '' });
  const [editCat, setEditCat] = useState(null);

  const [settingsError, setSettingsError] = useState('');

  const fetchSettingsData = async () => {
    try {
      const [rFunds, rAccs, rCats, rPMs] = await Promise.all([
        axiosInstance.get('/finance/funds'),
        axiosInstance.get('/finance/accounts'),
        axiosInstance.get('/finance/expense-categories'),
        axiosInstance.get('/finance/payment-methods')
      ]);
      setFunds(rFunds.data.data);
      setAccounts(rAccs.data.data);
      setExpCategories(rCats.data.data);
      setPayMethods(rPMs.data.data);
    } catch {
      setSettingsError('Failed to load settings schemas.');
    }
  };

  // Fund Handlers
  const handleFundSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editFund) {
        await axiosInstance.put(`/finance/funds/${editFund.id}`, fundForm);
      } else {
        await axiosInstance.post('/finance/funds', fundForm);
      }
      setShowFundForm(false); setFundForm({ name: '', description: '' }); setEditFund(null);
      fetchSettingsData();
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Fund save error');
    }
  };

  const handleFundDelete = async (id) => {
    if (!window.confirm('Delete this fund?')) return;
    try {
      await axiosInstance.delete(`/finance/funds/${id}`);
      fetchSettingsData();
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Fund delete error');
    }
  };

  // Account Handlers
  const handleAccSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editAcc) {
        await axiosInstance.put(`/finance/accounts/${editAcc.id}`, accForm);
      } else {
        await axiosInstance.post('/finance/accounts', accForm);
      }
      setShowAccForm(false); setAccForm({ name: '', fund_id: '', description: '' }); setEditAcc(null);
      fetchSettingsData();
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Account save error');
    }
  };

  const handleAccDelete = async (id) => {
    if (!window.confirm('Delete this account?')) return;
    try {
      await axiosInstance.delete(`/finance/accounts/${id}`);
      fetchSettingsData();
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Account delete error');
    }
  };

  // Expense Category Handlers
  const handleCatSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCat) {
        await axiosInstance.put(`/finance/expense-categories/${editCat.id}`, catForm);
      } else {
        await axiosInstance.post('/finance/expense-categories', catForm);
      }
      setShowCatForm(false); setCatForm({ category_name: '', account_id: '', description: '' }); setEditCat(null);
      fetchSettingsData();
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Category save error');
    }
  };

  // Initial Fetches
  useEffect(() => {
    fetchIncomeCategories();
    fetchSettingsData();
    fetchAllTimeSummary();
  }, [fetchAllTimeSummary]);

  useEffect(() => {
    if (activeTab === 'income') {
      fetchIncomeRecords();
      fetchIncomeSummary();
    } else if (activeTab === 'expenses') {
      fetchExpenses();
      fetchExpensesSummary();
    }
  }, [activeTab, fetchIncomeRecords, fetchIncomeSummary, fetchExpenses, fetchExpensesSummary]);

  // Form Field Styles
  const F = {
    label: { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 },
    input: { padding: '11px 12px', fontSize: 15, border: '1.5px solid #d1d5db', borderRadius: 9, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
    select: { padding: '11px 12px', fontSize: 15, border: '1.5px solid #d1d5db', borderRadius: 9, outline: 'none', background: '#fff', width: '100%', fontFamily: 'inherit' },
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Dynamic Header */}
      <div className="cms-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="cms-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Church Financial Management</span>
            <span style={{ fontSize: 12, background: 'linear-gradient(135deg,#005599,#13B5EA)', color: '#fff', padding: '4px 10px', borderRadius: 20 }}>Capstone Sync</span>
          </h1>
          <p className="cms-page-sub">Centralized audit, double-entry fund and expenditure tracking (Figure 9 ERD Compliance)</p>
        </div>
      </div>

      {/* Premium Tab bar navigation */}
      <div style={{ display: 'flex', borderBottom: '2.5px solid #e2e8f0', gap: 24, marginBottom: 24 }}>
        {[
          { id: 'income', label: 'Income & Giving Records', color: '#10b981' },
          { id: 'expenses', label: 'Advanced Expenditures', color: '#ef4444' },
          { id: 'funds', label: 'Double-Entry Settings', color: '#3b82f6' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 4px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === tab.id ? tab.color : '#64748b',
              borderBottom: activeTab === tab.id ? `3.5px solid ${tab.color}` : '3.5px solid transparent',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              marginBottom: -3
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ── TAB 1 CONTENT: INCOME (TITHE / OFFERINGS / GIVING) ───────
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'income' && (
        <div>
          {/* Page Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>Finance Records</h1>
              <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Record and monitor offerings, tithes, donations, and other church income in one place.</p>
            </div>
            {canCreate && (
              <button onClick={() => setShowIncForm(!showIncForm)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> {showIncForm ? 'Close Form' : 'Add Financial Record'}
              </button>
            )}
          </div>

          {/* Summary Cards */}
          {(() => {
            const totalAll = allTimeSummary.reduce((sum, s) => sum + s.total_amount, 0);
            const tithesAll = allTimeSummary.find(s => s.category?.name === 'Tithes')?.total_amount || 0;
            const offeringsAll = allTimeSummary.find(s => s.category?.name === 'Offering')?.total_amount || 0;
            const otherAll = totalAll - tithesAll - offeringsAll;

            const cards = [
              { label: 'Total Collected', value: totalAll, icon: '🏛️', bg: '#f0fdf4', iconBg: '#dcfce7' },
              { label: 'Tithes', value: tithesAll, icon: '💚', bg: '#f0fdf4', iconBg: '#dcfce7' },
              { label: 'Offerings', value: offeringsAll, icon: '👤', bg: '#f0fdf4', iconBg: '#dcfce7' },
              { label: 'Other Giving', value: otherAll, icon: '🎁', bg: '#f0fdf4', iconBg: '#dcfce7' },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {cards.map((card, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                      {card.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{card.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 2 }}>{formatAmount(card.value)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>All time total</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: '1 1 220px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 15 }}>🔍</span>
              <input
                type="text"
                placeholder="Search name or reference..."
                value={incFilterSearch}
                onChange={e => setIncFilterSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc' }}
              />
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>🏷️ Type</span>
              <select
                value={incFilterCategory}
                onChange={e => { setIncFilterCategory(e.target.value); setIncomePage(1); }}
                style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'inherit', minWidth: 130, cursor: 'pointer' }}
              >
                <option value="">All Types</option>
                {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Payment Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>💳 Payment</span>
              <select
                value={incFilterPayment}
                onChange={e => { setIncFilterPayment(e.target.value); setIncomePage(1); }}
                style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'inherit', minWidth: 140, cursor: 'pointer' }}
              >
                <option value="">All Payments</option>
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>📅 Date Range</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="date"
                  value={incFilterDateFrom}
                  onChange={e => { setIncFilterDateFrom(e.target.value); setIncomePage(1); }}
                  style={{ padding: '10px 10px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                />
                <span style={{ color: '#94a3b8', fontSize: 13 }}>–</span>
                <input
                  type="date"
                  value={incFilterDateTo}
                  onChange={e => { setIncFilterDateTo(e.target.value); setIncomePage(1); }}
                  style={{ padding: '10px 10px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(incFilterCategory || incFilterPayment || incFilterDateFrom || incFilterDateTo || incFilterSearch) && (
              <button
                onClick={() => { setIncFilterCategory(''); setIncFilterPayment(''); setIncFilterDateFrom(''); setIncFilterDateTo(''); setIncFilterSearch(''); setIncomePage(1); }}
                style={{ background: 'none', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                ↺ Clear Filters
              </button>
            )}
          </div>

          {showIncForm && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#059669' }}>{editIncRecord ? 'Edit Giving Log' : 'New Tithe / Giving Record'}</h3>
              {incFormError && <div className="cms-error-box">{incFormError}</div>}
              <form onSubmit={handleIncSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={F.label}>Search Giver (Member) *</label>
                  <div style={{ position: 'relative' }}>
                    <input value={incMemberSearch} onChange={e => handleIncMemberSearch(e.target.value)} placeholder="Type name..." style={F.input} />
                    {incMemberResults.length > 0 && (
                      <div style={{ position: 'absolute', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, left: 0, right: 0, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {incMemberResults.map(m => (
                          <div key={m.id} onClick={() => selectIncMember(m)} style={{ padding: 10, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                            <strong>{m.last_name}, {m.first_name}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={F.label}>Income Category *</label>
                    <select value={incForm.category_id} onChange={e => setIncForm(f => ({ ...f, category_id: e.target.value }))} required style={F.select}>
                      <option value="">— Select —</option>
                      {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={F.label}>Amount (PHP) *</label>
                    <input type="number" step="0.01" value={incForm.amount} onChange={e => setIncForm(f => ({ ...f, amount: e.target.value }))} required style={F.input} />
                  </div>
                  <div>
                    <label style={F.label}>Payment Method *</label>
                    <select value={incForm.payment_method} onChange={e => setIncForm(f => ({ ...f, payment_method: e.target.value }))} style={F.select}>
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label style={F.label}>Date *</label>
                    <input type="date" value={incForm.transaction_date} onChange={e => setIncForm(f => ({ ...f, transaction_date: e.target.value }))} required style={F.input} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={resetIncForm} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Reset</button>
                  <button type="submit" style={{ background: '#059669', color: '#fff', padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                    {incSaving ? 'Saving...' : 'Save Record'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {incomeError && <div className="cms-error-box">{incomeError}</div>}

          {/* Recent Records */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Recent Records</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name / Reference', 'Type', 'Amount', 'Payment', 'Date', 'Encoded By', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 22px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incomeLoading ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading records...</td></tr>
                ) : incomeRecords.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No records found.</td></tr>
                ) : (() => {
                  // Client-side search filtering
                  const searchLower = incFilterSearch.toLowerCase();
                  const filtered = incFilterSearch
                    ? incomeRecords.filter(r => {
                        const name = `${r.Member?.last_name || ''} ${r.Member?.first_name || ''}`.toLowerCase();
                        const receipt = (r.receipt_number || '').toLowerCase();
                        const cat = (r.category?.name || '').toLowerCase();
                        return name.includes(searchLower) || receipt.includes(searchLower) || cat.includes(searchLower);
                      })
                    : incomeRecords;

                  if (filtered.length === 0) {
                    return <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No records match your search.</td></tr>;
                  }

                  return filtered.map((r, i) => {
                    const memberName = `${r.Member?.last_name || ''}, ${r.Member?.first_name || ''}`;
                    const badge = TYPE_BADGE[r.category?.name] || TYPE_BADGE.default;
                    const payStyle = PAYMENT_STYLE[r.payment_method] || PAYMENT_STYLE.cash;
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 22px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: getAvatarColor(memberName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {getInitials(memberName)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{memberName}</div>
                              {r.receipt_number && <div style={{ fontSize: 12, color: '#94a3b8' }}>Ref: {r.receipt_number}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 22px' }}>
                          <span style={{ background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                            {r.category?.name || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 22px', fontWeight: 700, color: '#059669', fontSize: 15 }}>{formatAmount(r.amount)}</td>
                        <td style={{ padding: '14px 22px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: payStyle.bg, color: payStyle.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                            <span>{PAYMENT_ICON[r.payment_method] || '💵'}</span>
                            {PAYMENT_LABELS[r.payment_method] || r.payment_method}
                          </span>
                        </td>
                        <td style={{ padding: '14px 22px', fontSize: 14, color: '#475569' }}>{formatDate(r.transaction_date)}</td>
                        <td style={{ padding: '14px 22px', fontSize: 13, color: '#64748b' }}>{r.recorder?.email || '—'}</td>
                        <td style={{ padding: '14px 22px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {canUpdate && (
                              <button
                                onClick={() => { setEditIncRecord(r); setIncForm({ member_id: r.member_id, member_label: memberName, category_id: r.category_id, amount: r.amount, payment_method: r.payment_method, transaction_date: r.transaction_date, notes: r.notes || '' }); setIncMemberSearch(memberName); setShowIncForm(true); }}
                                style={{ background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                ✏️ Edit
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleIncDelete(r.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {incomeTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 4px' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Showing {((incomePage - 1) * 15) + 1} to {Math.min(incomePage * 15, incomeTotal)} of {incomeTotal} records
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  disabled={incomePage <= 1}
                  onClick={() => setIncomePage(p => p - 1)}
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage <= 1 ? '#f8fafc' : '#fff', color: incomePage <= 1 ? '#cbd5e1' : '#475569', cursor: incomePage <= 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
                >
                  ‹
                </button>
                {(() => {
                  const totalPages = Math.ceil(incomeTotal / 15);
                  const pages = [];
                  for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages || Math.abs(i - incomePage) <= 1) {
                      pages.push(i);
                    } else if (pages[pages.length - 1] !== '...') {
                      pages.push('...');
                    }
                  }
                  return pages.map((p, idx) => (
                    typeof p === 'number' ? (
                      <button
                        key={idx}
                        onClick={() => setIncomePage(p)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: p === incomePage ? '#059669' : 'transparent', color: p === incomePage ? '#fff' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={idx} style={{ color: '#94a3b8', fontSize: 13, padding: '0 4px' }}>...</span>
                    )
                  ));
                })()}
                <button
                  disabled={incomePage >= Math.ceil(incomeTotal / 15)}
                  onClick={() => setIncomePage(p => p + 1)}
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage >= Math.ceil(incomeTotal / 15) ? '#f8fafc' : '#fff', color: incomePage >= Math.ceil(incomeTotal / 15) ? '#cbd5e1' : '#475569', cursor: incomePage >= Math.ceil(incomeTotal / 15) ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ── TAB 2 CONTENT: EXPENSES & EXPENDITURE LOGS ─────────────
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: isMobile ? '100%' : 180 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>
                {formatAmount(expSummary.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0))}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 3, fontWeight: 600 }}>Total Funds Expensed</div>
            </div>
            {expSummary.map(row => (
              <div key={row.category_id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: isMobile ? 'calc(50% - 6px)' : 150 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{formatAmount(row.total_amount)}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{row.category?.name || '—'}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{row.count} logs</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select value={expFilterAccount} onChange={e => { setExpFilterAccount(e.target.value); setExpPage(1); }} style={F.select}>
                <option value="">All Sub-Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.fund?.name})</option>)}
              </select>
              <select value={expFilterCategory} onChange={e => { setExpFilterCategory(e.target.value); setExpPage(1); }} style={F.select}>
                <option value="">All Expense Categories</option>
                {expCategories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
            </div>
            {canCreate && (
              <button onClick={() => setShowExpForm(!showExpForm)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {showExpForm ? <><MonoIcon name="close" size={14} /> Close Form</> : '+ Record Expenditure'}
              </button>
            )}
          </div>

          {showExpForm && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#ef4444' }}>{editExpRecord ? 'Edit Expenditure' : 'Log New Expenditure (Figure 9 compliance)'}</h3>
              {expFormError && <div className="cms-error-box">{expFormError}</div>}
              <form onSubmit={handleExpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={F.label}>Source Sub-Account *</label>
                    <select value={expForm.account_id} onChange={e => setExpForm(f => ({ ...f, account_id: e.target.value }))} required style={F.select}>
                      <option value="">— Select Account —</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.fund?.name})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={F.label}>Expense Category *</label>
                    <select value={expForm.category_id} onChange={e => setExpForm(f => ({ ...f, category_id: e.target.value }))} required style={F.select}>
                      <option value="">— Select Category —</option>
                      {expCategories
                        .filter(c => !expForm.account_id || c.account_id === parseInt(expForm.account_id))
                        .map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={F.label}>Amount Expended (PHP) *</label>
                    <input type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} required style={F.input} />
                  </div>
                  <div>
                    <label style={F.label}>Payment Method *</label>
                    <select value={expForm.payment_method_id} onChange={e => setExpForm(f => ({ ...f, payment_method_id: e.target.value }))} required style={F.select}>
                      <option value="">— Select Method —</option>
                      {payMethods.map(m => <option key={m.id} value={m.id}>{m.method_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={F.label}>Date *</label>
                    <input type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} required style={F.input} />
                  </div>
                  <div>
                    <label style={F.label}>Receipt Upload (Image/PDF) *</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input type="file" onChange={handleReceiptUpload} style={{ display: 'none' }} id="receipt-file-input" />
                      <label htmlFor="receipt-file-input" style={{ background: '#3b82f6', color: '#fff', padding: '9px 15px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                        {uploadingReceipt ? 'Uploading...' : 'Choose File'}
                      </label>
                      <span style={{ fontSize: 13, color: '#64748b' }}>{expForm.attachment_name || 'No attachment linked'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label style={F.label}>Purpose / Description</label>
                  <textarea value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} rows={2} style={F.input} placeholder="Detail the expenditure purpose..." />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={resetExpForm} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ background: '#ef4444', color: '#fff', padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                    {expSaving ? 'Saving...' : 'Save Log'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {expError && <div className="cms-error-box">{expError}</div>}

          {/* Expenses Table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {['Sub-Account', 'Category', 'Amount', 'Payment Method', 'Date', 'Receipt', 'Recorded By', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expLoading ? (
                  <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Loading expenditures...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No expenditures recorded yet.</td></tr>
                ) : expenses.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600 }}>{r.account?.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.account?.fund?.name}</div>
                    </td>
                    <td style={{ padding: 12 }}>{r.category?.category_name}</td>
                    <td style={{ padding: 12, fontWeight: 700, color: '#dc2626' }}>{formatAmount(r.amount)}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0' }}>
                        {r.paymentMethod?.method_name}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{formatDate(r.date)}</td>
                    <td style={{ padding: 12 }}>
                      {r.attachments && r.attachments.length > 0 ? (
                        <button onClick={() => setPreviewImage(getAttachmentUrl(r.attachments[0].file_path))} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MonoIcon name="eye" size={13} /> View Receipt
                        </button>
                      ) : <span style={{ fontSize: 12, color: '#94a3b8' }}>No receipt</span>}
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: '#64748b' }}>{r.creator?.email || '—'}</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canUpdate && <button onClick={() => { setEditExpRecord(r); setExpForm({ account_id: r.account_id, category_id: r.category_id, amount: r.amount, date: r.date, payment_method_id: r.payment_method_id, description: r.description || '', attachment_id: null, attachment_name: '' }); setShowExpForm(true); }} style={{ background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>Edit</button>}
                        {canDelete && <button onClick={() => handleExpDelete(r.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ── TAB 3 CONTENT: DOUBLE-ENTRY SETTINGS (FUNDS / ACCOUNTS) ──
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'funds' && (
        <div>
          {settingsError && <div className="cms-error-box">{settingsError}</div>}

          {/* Row layout for three entities */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 20 }}>
            {/* Column 1: Funds */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>Funds</h3>
                {canCreate && <button onClick={() => setShowFundForm(!showFundForm)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>+ Add</button>}
              </div>

              {showFundForm && (
                <form onSubmit={handleFundSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <input placeholder="Fund Name..." value={fundForm.name} onChange={e => setFundForm(f => ({ ...f, name: e.target.value }))} required style={{ ...F.input, padding: '6px 10px', fontSize: 13 }} />
                  <input placeholder="Description..." value={fundForm.description} onChange={e => setFundForm(f => ({ ...f, description: e.target.value }))} style={{ ...F.input, padding: '6px 10px', fontSize: 13 }} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => { setShowFundForm(false); setEditFund(null); setFundForm({ name: '', description: '' }); }} style={{ padding: '4px 8px', fontSize: 12, border: 'none', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ background: '#3b82f6', color: '#fff', padding: '4px 10px', fontSize: 12, border: 'none', cursor: 'pointer' }}>Save</button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {funds.map(f => (
                  <div key={f.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: 14 }}>{f.name}</strong>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditFund(f); setFundForm({ name: f.name, description: f.description || '' }); setShowFundForm(true); }} style={{ border: 'none', background: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleFundDelete(f.id)} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Del</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.description || 'No description'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Sub-Accounts */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>Sub-Accounts</h3>
                {canCreate && <button onClick={() => setShowAccForm(!showAccForm)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>+ Add</button>}
              </div>

              {showAccForm && (
                <form onSubmit={handleAccSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <input placeholder="Account Name..." value={accForm.name} onChange={e => setAccForm(f => ({ ...f, name: e.target.value }))} required style={{ ...F.input, padding: '6px 10px', fontSize: 13 }} />
                  <select value={accForm.fund_id} onChange={e => setAccForm(f => ({ ...f, fund_id: e.target.value }))} required style={{ ...F.select, padding: '6px 10px', fontSize: 13 }}>
                    <option value="">— Fund parent —</option>
                    {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <input placeholder="Description..." value={accForm.description} onChange={e => setAccForm(f => ({ ...f, description: e.target.value }))} style={{ ...F.input, padding: '6px 10px', fontSize: 13 }} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => { setShowAccForm(false); setEditAcc(null); setAccForm({ name: '', fund_id: '', description: '' }); }} style={{ padding: '4px 8px', fontSize: 12, border: 'none', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ background: '#3b82f6', color: '#fff', padding: '4px 10px', fontSize: 12, border: 'none', cursor: 'pointer' }}>Save</button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {accounts.map(a => (
                  <div key={a.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: 14 }}>{a.name}</strong>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditAcc(a); setAccForm({ name: a.name, fund_id: a.fund_id, description: a.description || '' }); setShowAccForm(true); }} style={{ border: 'none', background: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleAccDelete(a.id)} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Del</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Parent: {a.fund?.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Expense Categories */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>Expense Categories</h3>
                {canCreate && <button onClick={() => setShowCatForm(!showCatForm)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>+ Add</button>}
              </div>

              {showCatForm && (
                <form onSubmit={handleCatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <input placeholder="Category Name..." value={catForm.category_name} onChange={e => setCatForm(f => ({ ...f, category_name: e.target.value }))} required style={{ ...F.input, padding: '6px 10px', fontSize: 13 }} />
                  <select value={catForm.account_id} onChange={e => setCatForm(f => ({ ...f, account_id: e.target.value }))} required style={{ ...F.select, padding: '6px 10px', fontSize: 13 }}>
                    <option value="">— Sub-Account parent —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => { setShowCatForm(false); setEditCat(null); setCatForm({ category_name: '', account_id: '', description: '' }); }} style={{ padding: '4px 8px', fontSize: 12, border: 'none', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ background: '#3b82f6', color: '#fff', padding: '4px 10px', fontSize: 12, border: 'none', cursor: 'pointer' }}>Save</button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {expCategories.map(c => (
                  <div key={c.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: 14 }}>{c.category_name}</strong>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditCat(c); setCatForm({ category_name: c.category_name, account_id: c.account_id }); setShowCatForm(true); }} style={{ border: 'none', background: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Account: {c.account?.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Elegant Receipt Attachment Preview Modal */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)', cursor: 'pointer' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', maxWidth: '90%', maxHeight: '90%', padding: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <img src={previewImage} alt="Receipt Attachment Preview" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Expense Receipt Preview</span>
              <button onClick={() => setPreviewImage(null)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
