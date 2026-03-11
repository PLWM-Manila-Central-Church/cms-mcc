import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const CONDITION_STYLE = {
  'Good':         { bg: '#f0fdf4', color: '#16a34a' },
  'Fair':         { bg: '#fffbeb', color: '#d97706' },
  'Poor':         { bg: '#fef2f2', color: '#dc2626' },
  'For Disposal': { bg: '#f1f5f9', color: '#64748b' },
};

const STATUS_STYLE = {
  pending:  { bg: '#fffbeb', color: '#d97706' },
  approved: { bg: '#f0fdf4', color: '#16a34a' },
  rejected: { bg: '#fef2f2', color: '#dc2626' },
};

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('inventory', 'manage');

  const [tab, setTab] = useState('items'); // items | requests

  // ── Items state ───────────────────────────────────────────
  const [items, setItems]           = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [itemPage, setItemPage]     = useState(1);
  const [itemPages, setItemPages]   = useState(1);
  const [itemSearch, setItemSearch] = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemError, setItemError]   = useState('');

  // ── Categories ────────────────────────────────────────────
  const [categories, setCategories] = useState([]);

  // ── Item form ─────────────────────────────────────────────
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', category_id: '', quantity: '', unit: '', condition: 'Good', low_stock_threshold: '' });
  const [savingItem, setSavingItem]     = useState(false);
  const [itemFormErr, setItemFormErr]   = useState('');

  // ── Requests state ────────────────────────────────────────
  const [requests, setRequests]       = useState([]);
  const [_totalReqs, setTotalReqs]     = useState(0);
  const [reqPage, setReqPage]         = useState(1);
  const [reqPages, setReqPages]       = useState(1);
  const [reqFilter, setReqFilter]     = useState('');
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [reqError, setReqError]       = useState('');
  const [myRequests, setMyRequests]   = useState([]);

  // ── Request form ──────────────────────────────────────────
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm, setReqForm]         = useState({ item_id: '', quantity: '', purpose: '' });
  const [savingReq, setSavingReq]     = useState(false);
  const [reqFormErr, setReqFormErr]   = useState('');

  const limit = 15;

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/inventory/categories');
      setCategories(res.data.data);
    } catch {}
  }, []);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true); setItemError('');
    try {
      const params = new URLSearchParams({ page: itemPage, limit });
      if (filterCat)  params.append('category_id', filterCat);
      if (itemSearch) params.append('search', itemSearch);
      const res = await axiosInstance.get(`/inventory?${params}`);
      const d   = res.data.data;
      setItems(d.items); setTotalItems(d.total);
      setItemPages(d.total_pages);
    } catch { setItemError('Failed to load items.'); }
    finally { setLoadingItems(false); }
  }, [itemPage, filterCat, itemSearch]);

  const fetchRequests = useCallback(async () => {
    setLoadingReqs(true); setReqError('');
    try {
      if (canManage) {
        const params = new URLSearchParams({ page: reqPage, limit });
        if (reqFilter) params.append('status', reqFilter);
        const res = await axiosInstance.get(`/inventory/requests/all?${params}`);
        const d   = res.data.data;
        setRequests(d.requests); setTotalReqs(d.total); setReqPages(d.total_pages);
      } else {
        const res = await axiosInstance.get('/inventory/requests/mine');
        setMyRequests(res.data.data.requests);
      }
    } catch { setReqError('Failed to load requests.'); }
    finally { setLoadingReqs(false); }
  }, [canManage, reqPage, reqFilter]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { if (tab === 'items') fetchItems(); }, [tab, fetchItems]);
  useEffect(() => { if (tab === 'requests') fetchRequests(); }, [tab, fetchRequests]);

  const resetItemForm = () => {
    setItemForm({ name: '', category_id: '', quantity: '', unit: '', condition: 'Good', low_stock_threshold: '' });
    setEditItem(null); setItemFormErr('');
  };

  const openEditItem = (item) => {
    setEditItem(item);
    setItemForm({
      name:                item.name,
      category_id:         item.category_id || '',
      quantity:            item.quantity,
      unit:                item.unit || '',
      condition:           item.condition || 'Good',
      low_stock_threshold: item.low_stock_threshold || ''
    });
    setShowItemForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault(); setSavingItem(true); setItemFormErr('');
    try {
      const payload = { ...itemForm, quantity: parseInt(itemForm.quantity) };
      if (!payload.low_stock_threshold) delete payload.low_stock_threshold;
      if (editItem) await axiosInstance.put(`/inventory/${editItem.id}`, payload);
      else          await axiosInstance.post('/inventory', payload);
      setShowItemForm(false); resetItemForm(); fetchItems();
    } catch (err) { setItemFormErr(err.response?.data?.message || 'Failed to save item.'); }
    finally { setSavingItem(false); }
  };

  const handleReviewRequest = async (id, status) => {
    const note = status === 'rejected' ? window.prompt('Reason for rejection (optional):') : null;
    try {
      await axiosInstance.patch(`/inventory/requests/${id}/review`, { status, review_note: note });
      fetchRequests();
    } catch (err) { setReqError(err.response?.data?.message || 'Failed to review request.'); }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault(); setSavingReq(true); setReqFormErr('');
    try {
      await axiosInstance.post('/inventory/requests', { ...reqForm, quantity: parseInt(reqForm.quantity) });
      setShowReqForm(false);
      setReqForm({ item_id: '', quantity: '', purpose: '' });
      fetchRequests();
    } catch (err) { setReqFormErr(err.response?.data?.message || 'Failed to submit request.'); }
    finally { setSavingReq(false); }
  };

  const isLowStock = (item) => item.low_stock_threshold && item.quantity <= item.low_stock_threshold;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Inventory</h1>
          <p style={s.subtitle}>{totalItems} items in stock</p>
        </div>
        <div style={s.headerActions}>
          {tab === 'items' && canManage && (
            <button onClick={() => { setShowItemForm(!showItemForm); if (showItemForm) resetItemForm(); }} style={s.addBtn}>
              {showItemForm ? '✕ Cancel' : '+ Add Item'}
            </button>
          )}
          {tab === 'requests' && !canManage && (
            <button onClick={() => setShowReqForm(!showReqForm)} style={s.addBtn}>
              {showReqForm ? '✕ Cancel' : '+ Request Item'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {['items', 'requests'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...s.tab, background: tab === t ? '#005599' : '#f1f5f9', color: tab === t ? '#fff' : '#475569' }}>
            {t === 'items' ? '📦 Items' : '📋 Requests'}
          </button>
        ))}
      </div>

      {/* ── ITEMS TAB ──────────────────────────────────────── */}
      {tab === 'items' && (
        <>
          {/* Item form */}
          {showItemForm && (
            <div style={s.formCard}>
              <h3 style={s.formTitle}>{editItem ? 'Edit Item' : 'Add Inventory Item'}</h3>
              {itemFormErr && <div style={s.errorBox}>{itemFormErr}</div>}
              <form onSubmit={handleItemSubmit} style={s.form}>
                <div style={s.formRow}>
                  <div style={{ ...s.field, flex: 2 }}>
                    <label style={s.label}>Item Name *</label>
                    <input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Plastic Chair" required style={s.input} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Category *</label>
                    <select value={itemForm.category_id} onChange={e => setItemForm(f => ({ ...f, category_id: e.target.value }))} required style={s.select}>
                      <option value="">— Select —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name} {c.is_returnable ? '(Returnable)' : '(Consumable)'}</option>)}
                    </select>
                  </div>
                </div>
                <div style={s.formRow}>
                  <div style={s.field}>
                    <label style={s.label}>Quantity *</label>
                    <input type="number" min="0" value={itemForm.quantity}
                      onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} required style={s.input} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Unit</label>
                    <input value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder="pcs, sets, boxes..." style={s.input} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Condition</label>
                    <select value={itemForm.condition} onChange={e => setItemForm(f => ({ ...f, condition: e.target.value }))} style={s.select}>
                      <option>Good</option><option>Fair</option><option>Poor</option><option>For Disposal</option>
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Low Stock Alert</label>
                    <input type="number" min="0" value={itemForm.low_stock_threshold}
                      onChange={e => setItemForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                      placeholder="e.g. 5" style={s.input} />
                  </div>
                </div>
                <div style={s.formActions}>
                  <button type="button" onClick={() => { setShowItemForm(false); resetItemForm(); }} style={s.cancelBtn}>Cancel</button>
                  <button type="submit" disabled={savingItem} style={{ ...s.submitBtn, opacity: savingItem ? 0.7 : 1 }}>
                    {savingItem ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div style={s.filterBar}>
            <input value={itemSearch} onChange={e => { setItemSearch(e.target.value); setItemPage(1); }}
              placeholder="Search items..." style={s.filterInput} />
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setItemPage(1); }} style={s.filterSelect}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {itemError && <div style={s.errorBox}>{itemError}</div>}

          {/* Items table */}
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Item</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Qty</th>
                  <th style={s.th}>Unit</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Condition</th>
                  {canManage && <th style={s.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loadingItems ? (
                  <tr><td colSpan={7} style={s.centerCell}>Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} style={s.centerCell}>No items found.</td></tr>
                ) : items.map((item, i) => {
                  const condStyle = CONDITION_STYLE[item.condition] || CONDITION_STYLE['Good'];
                  const lowStock  = isLowStock(item);
                  return (
                    <tr key={item.id}
                      style={{ ...s.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e8f4fd'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}
                    >
                      <td style={s.td}>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{item.name}</span>
                        {lowStock && <span style={s.lowStockTag}> ⚠ Low</span>}
                      </td>
                      <td style={s.td}>{item.category?.name || '—'}</td>
                      <td style={{ ...s.td, fontWeight: '700', color: lowStock ? '#dc2626' : '#0f172a', fontSize: '16px' }}>{item.quantity}</td>
                      <td style={{ ...s.td, color: '#64748b' }}>{item.unit || '—'}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: item.category?.is_returnable ? '#e8f4fd' : '#f0fdf4', color: item.category?.is_returnable ? '#0066b3' : '#16a34a' }}>
                          {item.category?.is_returnable ? 'Returnable' : 'Consumable'}
                        </span>
                      </td>
                      <td style={s.td}>
                        {item.condition && <span style={{ ...s.badge, background: condStyle.bg, color: condStyle.color }}>{item.condition}</span>}
                      </td>
                      {canManage && (
                        <td style={s.td}>
                          <button onClick={() => openEditItem(item)} style={s.editBtn}>Edit</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {itemPages > 1 && (
            <div style={s.pagination}>
              <button onClick={() => setItemPage(p => Math.max(1, p - 1))} disabled={itemPage === 1} style={s.pageBtn}>← Prev</button>
              <span style={s.pageInfo}>Page {itemPage} of {itemPages}</span>
              <button onClick={() => setItemPage(p => Math.min(itemPages, p + 1))} disabled={itemPage === itemPages} style={s.pageBtn}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── REQUESTS TAB ───────────────────────────────────── */}
      {tab === 'requests' && (
        <>
          {/* Non-admin request form */}
          {!canManage && showReqForm && (
            <div style={s.formCard}>
              <h3 style={s.formTitle}>Request an Item</h3>
              {reqFormErr && <div style={s.errorBox}>{reqFormErr}</div>}
              <form onSubmit={handleSubmitRequest} style={s.form}>
                <div style={s.formRow}>
                  <div style={{ ...s.field, flex: 2 }}>
                    <label style={s.label}>Item *</label>
                    <select value={reqForm.item_id} onChange={e => setReqForm(f => ({ ...f, item_id: e.target.value }))} required style={s.select}>
                      <option value="">— Select Item —</option>
                      {items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit || 'available'})</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Quantity *</label>
                    <input type="number" min="1" value={reqForm.quantity}
                      onChange={e => setReqForm(f => ({ ...f, quantity: e.target.value }))} required style={s.input} />
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Purpose</label>
                  <input value={reqForm.purpose} onChange={e => setReqForm(f => ({ ...f, purpose: e.target.value }))}
                    placeholder="What is this for?" style={s.input} />
                </div>
                <div style={s.formActions}>
                  <button type="button" onClick={() => setShowReqForm(false)} style={s.cancelBtn}>Cancel</button>
                  <button type="submit" disabled={savingReq} style={{ ...s.submitBtn, opacity: savingReq ? 0.7 : 1 }}>
                    {savingReq ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admin filter */}
          {canManage && (
            <div style={s.filterBar}>
              {['', 'pending', 'approved', 'rejected'].map(st => (
                <button key={st} onClick={() => { setReqFilter(st); setReqPage(1); }}
                  style={{ ...s.filterChip, background: reqFilter === st ? '#005599' : '#f1f5f9', color: reqFilter === st ? '#fff' : '#475569' }}>
                  {st ? st.charAt(0).toUpperCase() + st.slice(1) : 'All'}
                </button>
              ))}
            </div>
          )}

          {reqError && <div style={s.errorBox}>{reqError}</div>}

          {/* Requests table */}
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Item</th>
                  <th style={s.th}>Requested By</th>
                  <th style={s.th}>Qty</th>
                  <th style={s.th}>Purpose</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Date</th>
                  {canManage && <th style={s.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loadingReqs ? (
                  <tr><td colSpan={7} style={s.centerCell}>Loading...</td></tr>
                ) : (canManage ? requests : myRequests).length === 0 ? (
                  <tr><td colSpan={7} style={s.centerCell}>No requests found.</td></tr>
                ) : (canManage ? requests : myRequests).map((r, i) => {
                  const stStyle = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                  return (
                    <tr key={r.id}
                      style={{ ...s.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e8f4fd'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}
                    >
                      <td style={{ ...s.td, fontWeight: '600', color: '#0f172a' }}>{r.item?.name}</td>
                      <td style={{ ...s.td, fontSize: '13px', color: '#64748b' }}>{r.requestedByUser?.email}</td>
                      <td style={s.td}>{r.quantity} {r.item?.unit || ''}</td>
                      <td style={{ ...s.td, color: '#64748b', fontSize: '13px' }}>{r.purpose || '—'}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: stStyle.bg, color: stStyle.color }}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ ...s.td, color: '#64748b', fontSize: '13px' }}>
                        {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      {canManage && (
                        <td style={s.td}>
                          {r.status === 'pending' && (
                            <div style={s.actions}>
                              <button onClick={() => handleReviewRequest(r.id, 'approved')} style={s.approveBtn}>Approve</button>
                              <button onClick={() => handleReviewRequest(r.id, 'rejected')} style={s.rejectBtn}>Reject</button>
                            </div>
                          )}
                          {r.status !== 'pending' && (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                              by {r.reviewedBy?.email || '—'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canManage && reqPages > 1 && (
            <div style={s.pagination}>
              <button onClick={() => setReqPage(p => Math.max(1, p - 1))} disabled={reqPage === 1} style={s.pageBtn}>← Prev</button>
              <span style={s.pageInfo}>Page {reqPage} of {reqPages}</span>
              <button onClick={() => setReqPage(p => Math.min(reqPages, p + 1))} disabled={reqPage === reqPages} style={s.pageBtn}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  page:         { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title:        { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  subtitle:     { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  headerActions:{ display: 'flex', gap: '10px' },
  addBtn:       { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  tabBar:       { display: 'flex', gap: '8px', marginBottom: '24px' },
  tab:          { border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  formCard:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle:    { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0' },
  form:         { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow:      { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  field:        { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '140px' },
  label:        { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input:        { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:       { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#fff' },
  formActions:  { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn:    { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  submitBtn:    { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  filterBar:    { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  filterInput:  { padding: '8px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none', flex: 1, minWidth: '160px' },
  filterSelect: { padding: '8px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none', background: '#fff' },
  filterChip:   { border: 'none', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  errorBox:     { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' },
  tableWrap:    { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  thead:        { background: '#f8fafc' },
  th:           { padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
  row:          { transition: 'background 0.15s' },
  td:           { padding: '14px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  centerCell:   { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  badge:        { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  lowStockTag:  { color: '#dc2626', fontSize: '11px', fontWeight: '700', marginLeft: '4px' },
  actions:      { display: 'flex', gap: '6px' },
  editBtn:      { background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  approveBtn:   { background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  rejectBtn:    { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  pagination:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px' },
  pageBtn:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' },
  pageInfo:     { fontSize: '14px', color: '#64748b' },
};
