import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

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
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user?.roleName === 'Member') navigate('/finance/my-giving', { replace: true });
  }, [user, navigate]);

  const canCreate = hasPermission('finance', 'create');
  const canUpdate = hasPermission('finance', 'update');
  const canDelete = hasPermission('finance', 'delete');

  const formatAmount = (a) => parseFloat(a || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '\u2014';

  const [incomeRecords, setIncomeRecords] = useState([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [incomePage, setIncomePage] = useState(1);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeError, setIncomeError] = useState('');
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [allTimeSummary, setAllTimeSummary] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [incFilterCategory, setIncFilterCategory] = useState('');
  const [incFilterDateFrom, setIncFilterDateFrom] = useState('');
  const [incFilterDateTo, setIncFilterDateTo] = useState('');
  const [incFilterSearch, setIncFilterSearch] = useState('');

  const [showIncForm, setShowIncForm] = useState(false);
  const [editIncRecord, setEditIncRecord] = useState(null);
  const [incForm, setIncForm] = useState({
    member_id: '', category_id: '', amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    receipt_number: '', notes: ''
  });
  const [incSaving, setIncSaving] = useState(false);
  const [incFormError, setIncFormError] = useState('');

  const [incMemberSearch, setIncMemberSearch] = useState('');
  const [incMemberResults, setIncMemberResults] = useState([]);

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

  let searchTimeoutRef = null;
  const handleIncMemberSearch = (val) => {
    setIncMemberSearch(val);
    setIncForm(f => ({ ...f, member_id: '' }));
    clearTimeout(searchTimeoutRef);
    if (!val.trim()) { setIncMemberResults([]); return; }
    searchTimeoutRef = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(`/members?search=${encodeURIComponent(val)}&limit=6`);
        setIncMemberResults(res.data.data.members || []);
      } catch {}
    }, 300);
  };

  const selectIncMember = (m) => {
    setIncForm(f => ({ ...f, member_id: m.id }));
    setIncMemberSearch(`${m.last_name}, ${m.first_name}`);
    setIncMemberResults([]);
  };

  const resetIncForm = () => {
    setIncForm({ member_id: '', category_id: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), receipt_number: '', notes: '' });
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
    if (!window.confirm('Delete this record?')) return;
    try {
      await axiosInstance.delete(`/finance/records/${id}`);
      fetchIncomeRecords();
      fetchAllTimeSummary();
    } catch (err) {
      setIncomeError(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} record(s)?`)) return;
    for (const id of selectedIds) {
      try { await axiosInstance.delete(`/finance/records/${id}`); } catch {}
    }
    setSelectedIds([]);
    fetchIncomeRecords();
    fetchAllTimeSummary();
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
    <div style={{ fontFamily: 'inherit' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>Finance Records</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Record and monitor offerings, tithes, donations, and other church income in one place.</p>
        </div>
        {canCreate && (
          <button onClick={() => { resetIncForm(); setShowIncForm(true); }} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Financial Record
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
          { label: 'Total Collected', value: totalAll, icon: CARD_ICONS.total },
          { label: 'Tithes', value: tithesAll, icon: CARD_ICONS.tithes },
          { label: 'Offerings', value: offeringsAll, icon: CARD_ICONS.offerings },
          { label: 'Other Giving', value: otherAll, icon: CARD_ICONS.gift },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {cards.map((card, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Type</span>
          <select
            value={incFilterCategory}
            onChange={e => { setIncFilterCategory(e.target.value); setIncomePage(1); }}
            style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', fontFamily: 'inherit', minWidth: 130, cursor: 'pointer' }}
          >
            <option value="">All Types</option>
            {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Date Range</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              value={incFilterDateFrom}
              onChange={e => { setIncFilterDateFrom(e.target.value); setIncomePage(1); }}
              style={{ padding: '10px 10px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
            />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>&ndash;</span>
            <input
              type="date"
              value={incFilterDateTo}
              onChange={e => { setIncFilterDateTo(e.target.value); setIncomePage(1); }}
              style={{ padding: '10px 10px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
            />
          </div>
        </div>

        {hasActiveFilter && (
          <button
            onClick={() => { setIncFilterCategory(''); setIncFilterDateFrom(''); setIncFilterDateTo(''); setIncFilterSearch(''); setIncomePage(1); }}
            style={{ background: 'none', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
          >
            &#8634; Clear Filters
          </button>
        )}
      </div>

      {/* Bulk Delete Bar */}
      {selectedIds.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#991b1b' }}>{selectedIds.length} record(s) selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSelectedIds([])} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
            {canDelete && (
              <button onClick={handleBulkDelete} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Delete Selected</button>
            )}
          </div>
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
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', width: 40 }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id))}
                  onChange={e => setSelectedIds(e.target.checked ? filtered.map(r => r.id) : [])}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              {['Name / Reference', 'Type', 'Amount', 'Date', 'Encoded By', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 22px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incomeLoading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading records...</td></tr>
            ) : incomeRecords.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No records found.</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No records match your search.</td></tr>
            ) : filtered.map((r, i) => {
              const memberName = `${r.Member?.last_name || ''}, ${r.Member?.first_name || ''}`;
              const badge = TYPE_BADGE[r.category?.name] || TYPE_BADGE.default;
              return (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, r.id] : prev.filter(id => id !== r.id))}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
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
                      {r.category?.name || '\u2014'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 22px', fontWeight: 700, color: '#059669', fontSize: 15 }}>{formatAmount(r.amount)}</td>
                  <td style={{ padding: '14px 22px', fontSize: 14, color: '#475569' }}>{formatDate(r.transaction_date)}</td>
                  <td style={{ padding: '14px 22px', fontSize: 13, color: '#64748b' }}>{r.recorder?.email || '\u2014'}</td>
                  <td style={{ padding: '14px 22px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {canUpdate && (
                        <button
                          onClick={() => {
                            setEditIncRecord(r);
                            setIncForm({ member_id: r.member_id, category_id: r.category_id, amount: r.amount, transaction_date: r.transaction_date, receipt_number: r.receipt_number || '', notes: r.notes || '' });
                            setIncMemberSearch(memberName);
                            setShowIncForm(true);
                          }}
                          style={{ background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleIncDelete(r.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
              onClick={() => setIncomePage(1)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage <= 1 ? '#f8fafc' : '#fff', color: incomePage <= 1 ? '#cbd5e1' : '#475569', cursor: incomePage <= 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              &laquo;
            </button>
            <button
              disabled={incomePage <= 1}
              onClick={() => setIncomePage(p => p - 1)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage <= 1 ? '#f8fafc' : '#fff', color: incomePage <= 1 ? '#cbd5e1' : '#475569', cursor: incomePage <= 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
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
              disabled={incomePage >= totalPages}
              onClick={() => setIncomePage(p => p + 1)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage >= totalPages ? '#f8fafc' : '#fff', color: incomePage >= totalPages ? '#cbd5e1' : '#475569', cursor: incomePage >= totalPages ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              &rsaquo;
            </button>
            <button
              disabled={incomePage >= totalPages}
              onClick={() => setIncomePage(totalPages)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: incomePage >= totalPages ? '#f8fafc' : '#fff', color: incomePage >= totalPages ? '#cbd5e1' : '#475569', cursor: incomePage >= totalPages ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              &raquo;
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showIncForm && (
        <div onClick={() => { resetIncForm(); setShowIncForm(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{editIncRecord ? 'Edit Giving Log' : 'New Giving Record'}</h3>
              <button onClick={() => { resetIncForm(); setShowIncForm(false); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>&times;</button>
            </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={F.label}>Income Category *</label>
                  <select value={incForm.category_id} onChange={e => setIncForm(f => ({ ...f, category_id: e.target.value }))} required style={{ padding: '11px 12px', fontSize: 15, border: '1.5px solid #d1d5db', borderRadius: 9, outline: 'none', background: '#fff', width: '100%', fontFamily: 'inherit' }}>
                    <option value="">\u2014 Select \u2014</option>
                    {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={F.label}>Amount (PHP) *</label>
                  <input type="number" step="0.01" value={incForm.amount} onChange={e => setIncForm(f => ({ ...f, amount: e.target.value }))} required style={F.input} />
                </div>
                <div>
                  <label style={F.label}>Date *</label>
                  <input type="date" value={incForm.transaction_date} onChange={e => setIncForm(f => ({ ...f, transaction_date: e.target.value }))} required style={F.input} />
                </div>
                <div>
                  <label style={F.label}>Receipt Number</label>
                  <input value={incForm.receipt_number || ''} onChange={e => setIncForm(f => ({ ...f, receipt_number: e.target.value }))} placeholder="Optional" style={F.input} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => { resetIncForm(); setShowIncForm(false); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Cancel</button>
                <button type="submit" style={{ background: '#059669', color: '#fff', padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {incSaving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
