import { displayMemberName, displayAccount } from '../../utils/displayIdentity';
import useDialogFocus from '../../hooks/useDialogFocus';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import useIsMobile from '../../hooks/useIsMobile';
import { archiveRecordsWithResults } from '../../utils/bulkArchive';
import { localDateInputValue } from '../../utils/localDateInput';
import { getDateRangeError } from '../../utils/dateRange';
import { getIncomeSummaryAmounts } from '../../utils/incomeSummary';
import FinanceAttachments from '../../components/finance/FinanceAttachments';
import FinanceNavigation from '../../components/finance/FinanceNavigation';
import FinanceStatementDialog from './FinanceStatementDialog';

const TYPE_BADGE = {
  Tithes:    { bg: '#ecfdf5', color: '#059669' },
  Offering:  { bg: '#eff6ff', color: '#2563eb' },
  Pledge:    { bg: '#fef3c7', color: '#d97706' },
  Missions:  { bg: '#fce7f3', color: '#db2777' },
  Others:    { bg: '#f3e8ff', color: '#7c3aed' },
  default:   { bg: '#f1f5f9', color: '#475569' },
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

const svgIcon = (d) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const CARD_ICONS = {
  total: svgIcon('M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3'),
  tithes: svgIcon('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'),
  offerings: svgIcon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'),
  gift: svgIcon('M20 12v10H4V12M2 7h20v5H2zM12 22V12M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'),
};

export default function FinancePage() {
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user?.roleName === 'Member') navigate('/portal?tab=tithes', { replace: true });
  }, [user, navigate]);

  const canCreate = hasPermission('finance', 'create');
  const canUpdate = hasPermission('finance', 'update');
  const canArchive = hasPermission('finance', 'archive');

  const formatAmount = (a) => parseFloat(a || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const [incomeRecords, setIncomeRecords] = useState([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [incomePage, setIncomePage] = useState(1);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeError, setIncomeError] = useState('');
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [allTimeSummary, setAllTimeSummary] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [incFilterCategory, setIncFilterCategory] = useState('');
  const [incFilterDateFrom, setIncFilterDateFrom] = useState('');
  const [incFilterDateTo, setIncFilterDateTo] = useState('');
  const [incFilterSearch, setIncFilterSearch] = useState('');

  const [showIncForm, setShowIncForm] = useState(false);
  const [showFinanceStatement, setShowFinanceStatement] = useState(false);
  const givingDialogRef = useRef(null);
  useDialogFocus(showIncForm, givingDialogRef, () => { if (!incSaving) { resetIncForm(); setShowIncForm(false); } });
  const [editIncRecord, setEditIncRecord] = useState(null);
  const [incForm, setIncForm] = useState({
    member_id: '', category_id: '', amount: '',
    transaction_date: localDateInputValue(),
    receipt_number: '', notes: '', is_anonymous: false,
  });
  const [incSaving, setIncSaving] = useState(false);
  const [incFormError, setIncFormError] = useState('');

  const [incMemberSearch, setIncMemberSearch] = useState('');
  const [incMemberResults, setIncMemberResults] = useState([]);
  const [incMemberSearchError, setIncMemberSearchError] = useState('');
  const [incMemberSearchLoading, setIncMemberSearchLoading] = useState(false);
  const [incMemberSearchComplete, setIncMemberSearchComplete] = useState(false);
  const incMemberSearchTimeout = useRef(null);
  const incMemberSearchController = useRef(null);

  useEffect(() => () => {
    clearTimeout(incMemberSearchTimeout.current);
    incMemberSearchController.current?.abort();
  }, []);

  const fetchIncomeCategories = async () => {
    try {
      const res = await axiosInstance.get('/finance/categories');
      setIncomeCategories(res.data.data);
    } catch {}
  };

  const fetchAllTimeSummary = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/finance/summary');
      setAllTimeSummary(res.data.data);
    } catch {}
  }, []);

  const fetchIncomeRecords = useCallback(async () => {
    const dateRangeError = getDateRangeError(incFilterDateFrom, incFilterDateTo);
    if (dateRangeError) {
      setIncomeRecords([]);
      setIncomeTotal(0);
      setIncomeError(dateRangeError);
      setIncomeLoading(false);
      return;
    }
    setIncomeLoading(true); setIncomeError('');
    try {
      const params = new URLSearchParams({ page: incomePage, limit: 15 });
      if (incFilterCategory) params.append('category_id', incFilterCategory);
      if (incFilterDateFrom) params.append('date_from', incFilterDateFrom);
      if (incFilterDateTo)   params.append('date_to', incFilterDateTo);
      const res = await axiosInstance.get(`/finance?${params}`);
      const d = res.data.data;
      setIncomeRecords(d.records);
      setIncomeTotal(d.total);
    } catch {
      setIncomeError('Failed to load records.');
    } finally {
      setIncomeLoading(false);
    }
  }, [incomePage, incFilterCategory, incFilterDateFrom, incFilterDateTo]);

  const handleIncMemberSearch = (val) => {
    setIncMemberSearch(val);
    setIncForm(f => ({ ...f, member_id: '' }));
    setIncMemberSearchError('');
    setIncMemberSearchComplete(false);
    setIncMemberSearchLoading(false);
    setIncMemberResults([]);
    clearTimeout(incMemberSearchTimeout.current);
    incMemberSearchController.current?.abort();
    const query = val.trim();
    if (query.length < 2) return;
    incMemberSearchTimeout.current = setTimeout(async () => {
      const controller = new AbortController();
      incMemberSearchController.current = controller;
      setIncMemberSearchLoading(true);
      try {
        const res = await axiosInstance.get('/finance/members/search', {
          params: { q: query, limit: 6 },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setIncMemberResults(res.data.data || []);
        setIncMemberSearchComplete(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          setIncMemberSearchError(error.response?.data?.message || 'Could not search members. Please try again.');
          setIncMemberSearchComplete(true);
        }
      } finally {
        if (!controller.signal.aborted) setIncMemberSearchLoading(false);
      }
    }, 300);
  };

  const selectIncMember = (m) => {
    setIncForm(f => ({ ...f, member_id: m.id, is_anonymous: false }));
    setIncMemberSearch(`${m.last_name}, ${m.first_name}`);
    setIncMemberResults([]);
    setIncMemberSearchError('');
    setIncMemberSearchComplete(false);
    setIncMemberSearchLoading(false);
  };

  const resetIncForm = () => {
    setIncForm({ member_id: '', category_id: '', amount: '', transaction_date: localDateInputValue(), receipt_number: '', notes: '', is_anonymous: false });
    setIncMemberSearch('');
    setIncMemberResults([]);
    setIncMemberSearchError('');
    setIncMemberSearchComplete(false);
    setIncMemberSearchLoading(false);
    clearTimeout(incMemberSearchTimeout.current);
    incMemberSearchController.current?.abort();
    setEditIncRecord(null);
    setIncFormError('');
  };

  useEffect(() => {
    if (new URLSearchParams(location.search).get('new') === 'giving' && canCreate) {
      setShowIncForm(true);
      navigate('/finance', { replace: true });
    }
  }, [location.search, canCreate, navigate]);

  const handleIncSubmit = async (e) => {
    e.preventDefault();
    if (!incForm.is_anonymous && !incForm.member_id) { setIncFormError('Select a member or mark this record as anonymous.'); return; }
    setIncSaving(true); setIncFormError('');
    try {
      const payload = {
        member_id: incForm.is_anonymous ? null : incForm.member_id,
        is_anonymous: Boolean(incForm.is_anonymous),
        category_id: incForm.category_id,
        amount: parseFloat(incForm.amount),
        payment_method: 'cash',
        transaction_date: incForm.transaction_date,
        receipt_number: incForm.receipt_number || null,
        notes: incForm.notes || null
      };
      if (editIncRecord) {
        await axiosInstance.put(`/finance/records/${editIncRecord.id}`, payload);
      } else {
        await axiosInstance.post('/finance/records', payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'], refetchType: 'all' });
      setShowIncForm(false);
      resetIncForm();
      fetchIncomeRecords();
      fetchAllTimeSummary();
    } catch (err) {
      setIncFormError(err.response?.data?.message || 'Failed to save record.');
    } finally {
      setIncSaving(false);
    }
  };

  const handleIncDelete = async (id) => {
    if (!(await confirm({
      title: 'Archive giving record?',
      message: 'This record will leave active giving reports. The original entry and receipt attachments are retained and can be restored from Archives.',
      confirmLabel: 'Archive record',
    }))) return;
    try {
      await axiosInstance.patch(`/finance/records/${id}/archive`);
      await Promise.all([
        fetchIncomeRecords(),
        fetchAllTimeSummary(),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'], refetchType: 'all' }),
      ]);
    } catch (err) {
      setIncomeError(err.response?.data?.message || 'Failed to archive record.');
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!(await confirm({
      title: `Archive ${ids.length} giving record${ids.length === 1 ? '' : 's'}?`,
      message: 'Selected records will leave active giving reports. Their details and receipt attachments are retained and can be restored from Archives.',
      confirmLabel: `Archive ${ids.length} record${ids.length === 1 ? '' : 's'}`,
    }))) return;

    setIncomeError('');
    setBulkDeleting(true);
    try {
      const result = await archiveRecordsWithResults(
        ids,
        (id) => axiosInstance.patch(`/finance/records/${id}/archive`),
      );
      const failedIds = result.failures.map(({ id }) => id);
      setSelectedIds(failedIds);
      await Promise.all([
        fetchIncomeRecords(),
        fetchAllTimeSummary(),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'], refetchType: 'all' }),
      ]);

      if (result.failures.length > 0) {
        const firstError = result.failures[0].error?.response?.data?.message
          || result.failures[0].error?.message;
        const failureDetails = firstError ? ` ${firstError}` : '';
        setIncomeError(
          `${result.archivedCount} record(s) archived. ${result.failures.length} could not be archived and remain selected for retry.${failureDetails}`,
        );
      }
    } catch (error) {
      setIncomeError(error.response?.data?.message || 'Bulk archive could not finish. Refresh the records before retrying.');
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    fetchIncomeCategories();
    fetchAllTimeSummary();
  }, [fetchAllTimeSummary]);

  useEffect(() => {
    fetchIncomeRecords();
  }, [fetchIncomeRecords]);

  const F = {
    label: { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 },
    input: { padding: '11px 12px', fontSize: 15, border: '1.5px solid #d1d5db', borderRadius: 9, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  };

  const totalPages = Math.ceil(incomeTotal / 15);
  const hasActiveFilter = incFilterCategory || incFilterDateFrom || incFilterDateTo || incFilterSearch;

  const filtered = (() => {
    if (!incFilterSearch) return incomeRecords;
    const q = incFilterSearch.toLowerCase();
    return incomeRecords.filter(r => {
      const name = `${r.Member?.last_name || ''} ${r.Member?.first_name || ''}`.toLowerCase();
      const receipt = (r.receipt_number || '').toLowerCase();
      const cat = (r.category?.name || '').toLowerCase();
      return name.includes(q) || receipt.includes(q) || cat.includes(q);
    });
  })();

  return (
    <div className="mcc-module mcc-module-finance-page" style={{ fontFamily: 'inherit' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="workspace-page-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--mcc-ink, #0f172a)', margin: 0 }}>Finance Records</h1>
          <p style={{ fontSize: 14, color: 'var(--mcc-secondary, #52647a)', margin: '4px 0 0' }}>Record and monitor offerings, tithes, donations, and other church income in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowFinanceStatement(true)}
            style={{ background: 'var(--mcc-brand, #005599)', color: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-brand, #005599)', borderRadius: 10, padding: '11px 16px', minHeight: 44, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Finance Statement
          </button>
          {canCreate && (
            <button onClick={() => { resetIncForm(); setShowIncForm(true); }} style={{ background: '#059669', color: 'var(--mcc-surface, #fff)', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Financial Record
            </button>
          )}
        </div>
      </div>

      <FinanceNavigation />

      {/* Summary Cards */}
      {(() => {
        const { total: totalAll, tithes: tithesAll, offerings: offeringsAll, other: otherAll } = getIncomeSummaryAmounts(allTimeSummary);

        const cards = [
          { label: 'Total Collected', value: totalAll, icon: CARD_ICONS.total },
          { label: 'Tithes', value: tithesAll, icon: CARD_ICONS.tithes },
          { label: 'Offerings', value: offeringsAll, icon: CARD_ICONS.offerings },
          { label: 'Other Giving', value: otherAll, icon: CARD_ICONS.gift },
        ];
        return (
          <div className="mcc-finance-stats" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
            {cards.map((card, i) => (
              <div className="mcc-finance-card" key={i} style={{ background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 'var(--mcc-radius, 16px)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--mcc-radius, 16px)', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {card.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--mcc-secondary, #52647a)', fontWeight: 500 }}>{card.label}</div>
                  <div className="mcc-finance-card-value" style={{ fontSize: 22, fontWeight: 700, color: '#059669', marginTop: 2 }}>{formatAmount(card.value)}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>All time total</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filter Bar */}
      <div style={{ background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 'var(--mcc-radius, 16px)', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 15 }}>&#128269;</span>
          <input
            type="text"
            placeholder="Search name or reference..."
            value={incFilterSearch}
            onChange={e => setIncFilterSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
          <span style={{ fontSize: 13, color: 'var(--mcc-secondary, #52647a)', fontWeight: 500 }}>Type</span>
          <select
            value={incFilterCategory}
            onChange={e => { setIncFilterCategory(e.target.value); setIncomePage(1); }}
            style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', background: 'var(--mcc-surface, #fff)', fontFamily: 'inherit', minWidth: 130, cursor: 'pointer' }}
          >
            <option value="">All Types</option>
            {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : undefined, alignItems: isMobile ? 'stretch' : 'center', gap: 8, flex: isMobile ? '1 1 100%' : '0 0 auto', minWidth: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--mcc-secondary, #52647a)', fontWeight: 500 }}>Date Range</span>
          <div style={{ display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : undefined, alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 8 : 6, minWidth: 0 }}>
            <label htmlFor="finance-income-date-from" style={{ fontSize: 12, color: 'var(--mcc-secondary, #52647a)' }}>From</label>
            <input
              id="finance-income-date-from"
              type="date"
              value={incFilterDateFrom}
              max={incFilterDateTo || undefined}
              onChange={e => { setIncFilterDateFrom(e.target.value); setIncomePage(1); }}
              style={{ padding: '10px 10px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', width: isMobile ? '100%' : undefined, minWidth: isMobile ? 0 : undefined, boxSizing: 'border-box' }}
            />
            <span style={{ color: '#94a3b8', fontSize: 13, display: isMobile ? 'none' : undefined }}>&ndash;</span>
            <label htmlFor="finance-income-date-to" style={{ fontSize: 12, color: 'var(--mcc-secondary, #52647a)' }}>To</label>
            <input
              id="finance-income-date-to"
              type="date"
              value={incFilterDateTo}
              min={incFilterDateFrom || undefined}
              onChange={e => { setIncFilterDateTo(e.target.value); setIncomePage(1); }}
              style={{ padding: '10px 10px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', width: isMobile ? '100%' : undefined, minWidth: isMobile ? 0 : undefined, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {hasActiveFilter && (
          <button
            onClick={() => { setIncFilterCategory(''); setIncFilterDateFrom(''); setIncFilterDateTo(''); setIncFilterSearch(''); setIncomePage(1); }}
            style={{ background: 'none', color: 'var(--mcc-secondary, #52647a)', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
          >
            &#8634; Clear Filters
          </button>
        )}
      </div>

      {/* Bulk Archive Bar */}
      {selectedIds.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#991b1b' }}>{selectedIds.length} record(s) selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSelectedIds([])} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--mcc-border, #e2e8f0)', background: 'var(--mcc-surface, #fff)', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
            {canArchive && (
              <button onClick={handleBulkDelete} disabled={bulkDeleting} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: bulkDeleting ? '#94a3b8' : '#dc2626', color: 'var(--mcc-surface, #fff)', fontWeight: 600, fontSize: 13, cursor: bulkDeleting ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{bulkDeleting ? 'Archiving…' : 'Archive Selected'}</button>
            )}
          </div>
        </div>
      )}

      {incomeError && <div className="cms-error-box">{incomeError}</div>}

      {/* Recent Records */}
      <div style={{ background: 'var(--mcc-surface, #fff)', borderRadius: 'var(--mcc-radius, 16px)', border: '1px solid var(--mcc-border, #e2e8f0)', overflowX: 'auto' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--mcc-ink, #0f172a)' }}>Recent Records</h2>
        </div>
        <ResponsiveTable style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ display: canArchive ? 'table-cell' : 'none', padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--mcc-secondary, #52647a)', borderBottom: '1px solid var(--mcc-border, #e2e8f0)', width: 40 }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id))}
                  onChange={e => setSelectedIds(e.target.checked ? filtered.map(r => r.id) : [])}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              {['Name / Reference', 'Type', 'Amount', 'Date', 'Encoded By', 'Receipts', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 22px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--mcc-secondary, #52647a)', borderBottom: '1px solid var(--mcc-border, #e2e8f0)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incomeLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading records...</td></tr>
            ) : incomeRecords.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No records found.</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No records match your search.</td></tr>
            ) : filtered.map((r, i) => {
              const memberName = r.is_anonymous
                ? 'Anonymous giving'
                : displayMemberName(r.Member);
              const badge = TYPE_BADGE[r.category?.name] || TYPE_BADGE.default;
              return (
                <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--mcc-surface, #fff)' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ display: canArchive ? 'table-cell' : 'none', padding: '14px 14px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, r.id] : prev.filter(id => id !== r.id))}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '14px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: getAvatarColor(memberName), color: 'var(--mcc-surface, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(memberName)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--mcc-ink, #0f172a)' }}>{memberName}</div>
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
                  <td style={{ padding: '14px 22px', fontSize: 14, color: '#475569' }}>{formatDate(r.transaction_date)}</td>
                  <td style={{ padding: '14px 22px', fontSize: 13, color: 'var(--mcc-secondary, #52647a)' }}>{displayAccount(r.recorder?.email)}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                    <FinanceAttachments
                      attachments={r.attachments || []}
                      targetType="income"
                      targetId={r.id}
                      canUpload={canCreate}
                      canArchive={canArchive}
                      onChanged={fetchIncomeRecords}
                      compact
                    />
                  </td>
                  <td style={{ padding: '14px 22px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {canUpdate && (
                        <button
                          onClick={() => {
                            setEditIncRecord(r);
                            setIncForm({ member_id: r.member_id || '', is_anonymous: Boolean(r.is_anonymous), category_id: r.category_id, amount: r.amount, transaction_date: r.transaction_date, receipt_number: r.receipt_number || '', notes: r.notes || '' });
                            setIncMemberSearch(r.is_anonymous ? '' : memberName);
                            setShowIncForm(true);
                          }}
                          style={{ background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Edit
                        </button>
                      )}
                      {canArchive && (
                        <button onClick={() => handleIncDelete(r.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ResponsiveTable>
      </div>

      {/* Pagination */}
      {incomeTotal > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 4px' }}>
          <span style={{ fontSize: 13, color: 'var(--mcc-secondary, #52647a)' }}>
            Showing {((incomePage - 1) * 15) + 1} to {Math.min(incomePage * 15, incomeTotal)} of {incomeTotal} records
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              disabled={incomePage <= 1}
              onClick={() => setIncomePage(1)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage <= 1 ? '#f8fafc' : 'var(--mcc-surface, #fff)', color: incomePage <= 1 ? '#cbd5e1' : '#475569', cursor: incomePage <= 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              &laquo;
            </button>
            <button
              disabled={incomePage <= 1}
              onClick={() => setIncomePage(p => p - 1)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage <= 1 ? '#f8fafc' : 'var(--mcc-surface, #fff)', color: incomePage <= 1 ? '#cbd5e1' : '#475569', cursor: incomePage <= 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              &lsaquo;
            </button>
            {(() => {
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
                    style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: p === incomePage ? '#059669' : 'transparent', color: p === incomePage ? 'var(--mcc-surface, #fff)' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={idx} style={{ color: '#94a3b8', fontSize: 13, padding: '0 4px' }}>...</span>
                )
              ));
            })()}
            <button
              disabled={incomePage >= totalPages}
              onClick={() => setIncomePage(p => p + 1)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage >= totalPages ? '#f8fafc' : 'var(--mcc-surface, #fff)', color: incomePage >= totalPages ? '#cbd5e1' : '#475569', cursor: incomePage >= totalPages ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              &rsaquo;
            </button>
            <button
              disabled={incomePage >= totalPages}
              onClick={() => setIncomePage(totalPages)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage >= totalPages ? '#f8fafc' : 'var(--mcc-surface, #fff)', color: incomePage >= totalPages ? '#cbd5e1' : '#475569', cursor: incomePage >= totalPages ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              &raquo;
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showIncForm && (
        <div onClick={() => { if (!incSaving) { resetIncForm(); setShowIncForm(false); } }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div ref={givingDialogRef} role="dialog" aria-modal="true" aria-labelledby="giving-dialog-title" tabIndex={-1} onClick={e => e.stopPropagation()} style={{ background: 'var(--mcc-surface, #fff)', borderRadius: 'var(--mcc-radius, 16px)', padding: 28, maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 id="giving-dialog-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--mcc-ink, #0f172a)' }}>{editIncRecord ? 'Edit Giving Log' : 'New Giving Record'}</h3>
              <button disabled={incSaving} aria-label="Close giving form" onClick={() => { resetIncForm(); setShowIncForm(false); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>&times;</button>
            </div>
            {incFormError && <div className="cms-error-box">{incFormError}</div>}
            <form onSubmit={handleIncSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', border: '1px solid #dbe4ee', borderRadius: 9, background: '#f8fafc', fontSize: 14, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={Boolean(incForm.is_anonymous)}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setIncForm((current) => ({ ...current, is_anonymous: enabled, member_id: enabled ? '' : current.member_id }));
                    setIncMemberSearch('');
                    setIncMemberResults([]);
                    setIncFormError('');
                  }}
                />
                Record as anonymous giving
              </label>
              {!incForm.is_anonymous && (
                <div>
                  <label htmlFor="finance-giver-search" style={F.label}>Search Giver (Member) *</label>
                  <div style={{ position: 'relative' }}>
                    <input id="finance-giver-search" value={incMemberSearch} onChange={e => handleIncMemberSearch(e.target.value)} placeholder="Type name..." style={F.input} />
                    {incMemberResults.length > 0 && (
                      <ul aria-label="Matching members" style={{ position: 'absolute', background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 8, left: 0, right: 0, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', listStyle:'none', margin:0, padding:0, maxHeight:240, overflowY:'auto' }}>
                        {incMemberResults.map(m => (
                          <li key={m.id}>
                            <button type="button" onClick={() => selectIncMember(m)} style={{ display:'block',width:'100%',padding:10,textAlign:'left',border:0,background:'var(--mcc-surface, #fff)',cursor:'pointer',borderBottom:'1px solid #f1f5f9',fontFamily:'inherit',fontSize:14,color:'var(--mcc-ink, #0f172a)' }}>
                              <strong>{m.last_name}, {m.first_name}</strong>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {incMemberSearchLoading && <div role="status" style={{fontSize:12,color:'var(--mcc-secondary, #52647a)',marginTop:6}}>Searching members…</div>}
                    {incMemberSearchError && <div role="alert" style={{fontSize:12,color:'#dc2626',marginTop:6}}>{incMemberSearchError}</div>}
                    {!incMemberSearchLoading && !incMemberSearchError && incMemberSearchComplete && incMemberResults.length === 0 && <div role="status" style={{fontSize:12,color:'var(--mcc-secondary, #52647a)',marginTop:6}}>No matching members found.</div>}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={F.label}>Income Category *</label>
                  <select aria-label="Income Category" value={incForm.category_id} onChange={e => setIncForm(f => ({ ...f, category_id: e.target.value }))} required style={{ padding: '11px 12px', fontSize: 15, border: '1.5px solid #d1d5db', borderRadius: 9, outline: 'none', background: 'var(--mcc-surface, #fff)', width: '100%', fontFamily: 'inherit' }}>
                    <option value="">Choose a category</option>
                    {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={F.label}>Amount (PHP) *</label>
                  <input aria-label="Amount (PHP)" type="number" min="0.01" step="0.01" value={incForm.amount} onChange={e => setIncForm(f => ({ ...f, amount: e.target.value }))} required style={F.input} />
                </div>
                <div>
                  <label style={F.label}>Date *</label>
                  <input aria-label="Transaction date" type="date" value={incForm.transaction_date} onChange={e => setIncForm(f => ({ ...f, transaction_date: e.target.value }))} required style={F.input} />
                </div>
                <div>
                  <label style={F.label}>Receipt Number</label>
                  <input aria-label="Receipt Number" value={incForm.receipt_number || ''} onChange={e => setIncForm(f => ({ ...f, receipt_number: e.target.value }))} placeholder="Optional" style={F.input} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button disabled={incSaving} type="button" onClick={() => { resetIncForm(); setShowIncForm(false); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'var(--mcc-surface, #fff)', color: '#475569', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Cancel</button>
                <button disabled={incSaving} type="submit" style={{ background: '#059669', color: 'var(--mcc-surface, #fff)', padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {incSaving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showFinanceStatement && (
        <FinanceStatementDialog
          dateFrom={incFilterDateFrom}
          dateTo={incFilterDateTo}
          onClose={() => setShowFinanceStatement(false)}
        />
      )}
    </div>
  );
}
