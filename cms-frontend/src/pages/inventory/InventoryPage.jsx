import ResponsiveTable from '../../components/common/ResponsiveTable';
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import MonoIcon from '../../components/common/MonoIcon';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { formatDate } from '../../utils/formatDate';
import { createInventoryRequestKey } from '../../utils/inventoryRequestKey';

const CONDITION_STYLE = {
  'Good':         { bg: '#f0fdf4', color: '#16a34a' },
  'Fair':         { bg: '#fffbeb', color: '#d97706' },
  'Poor':         { bg: '#fef2f2', color: '#dc2626' },
  'For Disposal': { bg: '#f1f5f9', color: 'var(--mcc-secondary, #52647a)' },
};

const STATUS_STYLE = {
  pending:  { bg: '#fffbeb', color: '#d97706' },
  approved: { bg: '#f0fdf4', color: '#16a34a' },
  rejected: { bg: '#fef2f2', color: '#dc2626' },
};

const AVAILABILITY_STYLE = {
  Available:        { bg: '#f0fdf4', color: '#15803d' },
  'Low Stock':      { bg: '#fffbeb', color: '#b45309' },
  'Out of Stock':   { bg: '#fef2f2', color: '#b91c1c' },
  'Under Repair':   { bg: '#fff7ed', color: '#c2410c' },
};

const localDateTimeValue = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function InventoryPage() {
  const { hasPermission, user } = useAuth();
  const { confirm } = useConfirmation();
  const scopedRequestOnly = ['Ministry Leader', 'Cell Group Leader', 'Group Leader', 'Leader'].includes(user?.roleName);
  const canCreate = hasPermission('inventory', 'create') && !scopedRequestOnly;
  const canUpdate = hasPermission('inventory', 'update') && !scopedRequestOnly;
  const canManage = canUpdate;
  const canDelete = hasPermission('inventory', 'delete') && !scopedRequestOnly;
  const canRequest = !canManage;
  const canViewReports = hasPermission('inventory', 'read') && !scopedRequestOnly;
  const canViewUsage = hasPermission('inventory', 'read') && !scopedRequestOnly;

  const [tab, setTab] = useState('items'); // items | requests | usage | reports

  // ── Items state ───────────────────────────────────────────
  const [items, setItems]           = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [itemPage, setItemPage]     = useState(1);
  const [itemPages, setItemPages]   = useState(1);
  const [itemSearch, setItemSearch] = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemError, setItemError]   = useState('');

  // ── Categories ────────────────────────────────────────────
  const [categories, setCategories] = useState([]);

  // ── Item form ─────────────────────────────────────────────
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', category_id: '', quantity: '', unit: '', condition: 'Good', status: 'Available', low_stock_threshold: '' });
  const [savingItem, setSavingItem]     = useState(false);
  const [itemFormErr, setItemFormErr]   = useState('');

  // ── Requests state ────────────────────────────────────────
  const [requests, setRequests]       = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [_totalReqs, setTotalReqs]     = useState(0);
  const [reqPage, setReqPage]         = useState(1);
  const [reqPages, setReqPages]       = useState(1);
  const [reqFilter, setReqFilter]     = useState('');
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [reqError, setReqError]       = useState('');
  const [myRequests, setMyRequests]   = useState([]);

  // ── Inventory reports ─────────────────────────────────────
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  // ── Inventory usage ───────────────────────────────────────
  const [usages, setUsages] = useState([]);
  const [usagePage, setUsagePage] = useState(1);
  const [usagePages, setUsagePages] = useState(1);
  const [loadingUsages, setLoadingUsages] = useState(false);
  const [usageError, setUsageError] = useState('');
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [usageForm, setUsageForm] = useState({ item_id: '', quantity_used: '', used_for: '', used_at: localDateTimeValue() });
  const [usageItemSearch, setUsageItemSearch] = useState('');
  const [usageItems, setUsageItems] = useState([]);
  const [savingUsage, setSavingUsage] = useState(false);
  const [usageFormError, setUsageFormError] = useState('');

  // ── Request form ──────────────────────────────────────────
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm, setReqForm]         = useState({ item_id: '', quantity: '', purpose: '', context_type: '', context_id: '' });
  const [requestKey, setRequestKey]   = useState(createInventoryRequestKey);
  const [requestContexts, setRequestContexts] = useState({ events: [], services: [], ministries: [] });
  const [savingReq, setSavingReq]     = useState(false);
  const [reqFormErr, setReqFormErr]   = useState('');
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const updateRequestField = (field, value, extra = {}) => {
    setReqForm((current) => ({ ...current, ...extra, [field]: value }));
    setRequestKey(createInventoryRequestKey());
  };

  const limit = 15;

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/inventory/categories');
      setCategories(res.data.data);
    } catch {}
  }, []);

  const fetchRequestContexts = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/inventory/request-contexts');
      setRequestContexts(res.data.data || { events: [], services: [], ministries: [] });
    } catch {
      setRequestContexts({ events: [], services: [], ministries: [] });
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true); setItemError('');
    try {
      const params = new URLSearchParams({ page: itemPage, limit });
      if (!scopedRequestOnly && filterCat)  params.append('category_id', filterCat);
      if (!scopedRequestOnly && itemSearch) params.append('search', itemSearch);
      if (filterStatus) params.append('status', filterStatus);
      const res = await axiosInstance.get(`/inventory/items?${params}`);
      const d   = res.data.data;
      setItems(d.items); setTotalItems(d.total);
      setItemPages(d.total_pages);
    } catch { setItemError('Failed to load items.'); }
    finally { setLoadingItems(false); }
  }, [itemPage, filterCat, filterStatus, itemSearch, scopedRequestOnly]);

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

  const fetchReport = useCallback(async () => {
    setLoadingReport(true); setReportError('');
    try {
      const res = await axiosInstance.get('/inventory/reports');
      setReport(res.data.data);
    } catch (err) {
      setReportError(apiErrorMessage(err, 'Failed to load inventory report.'));
    } finally { setLoadingReport(false); }
  }, []);

  const fetchUsages = useCallback(async (page = 1) => {
    setLoadingUsages(true); setUsageError('');
    try {
      const params = new URLSearchParams({ page, limit });
      const res = await axiosInstance.get(`/inventory/usage?${params}`);
      const data = res.data.data;
      setUsages(data.records || []);
      setUsagePages(data.total_pages || 1);
      setUsagePage(page);
    } catch (err) {
      setUsageError(apiErrorMessage(err, 'Failed to load inventory usage.'));
    } finally { setLoadingUsages(false); }
  }, [limit]);

  const fetchUsageItems = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: 1, limit: 100 });
      if (usageItemSearch.trim()) params.set('search', usageItemSearch.trim());
      const res = await axiosInstance.get(`/inventory/items?${params}`);
      setUsageItems(res.data.data.items || []);
    } catch {
      setUsageItems([]);
    }
  }, [usageItemSearch]);

  const resetUsageForm = () => {
    setUsageForm({ item_id: '', quantity_used: '', used_for: '', used_at: localDateTimeValue() });
    setUsageItemSearch('');
    setUsageFormError('');
  };

  const handleUsageSubmit = async (event) => {
    event.preventDefault(); setSavingUsage(true); setUsageFormError('');
    try {
      await axiosInstance.post('/inventory/usage', {
        item_id: Number(usageForm.item_id),
        quantity_used: Number.parseInt(usageForm.quantity_used, 10),
        used_for: usageForm.used_for.trim() || null,
        used_at: new Date(usageForm.used_at).toISOString(),
      });
      setShowUsageForm(false);
      resetUsageForm();
      await fetchUsages(1);
      fetchItems();
      fetchReport();
    } catch (err) {
      setUsageFormError(apiErrorMessage(err, 'Failed to record inventory usage.'));
    } finally { setSavingUsage(false); }
  };

  const handleDeleteUsage = async (usage) => {
    if (!(await confirm({
      title: 'Reverse inventory usage?',
      message: `Delete this usage record and restore ${usage.quantity_used} ${usage.item?.unit || 'unit(s)'} to stock?`,
      confirmLabel: 'Restore stock',
      tone: 'warning',
    }))) return;
    try {
      await axiosInstance.delete(`/inventory/usage/${usage.id}`);
      await fetchUsages(usagePage);
      fetchItems();
      fetchReport();
    } catch (err) {
      setUsageError(apiErrorMessage(err, 'Failed to reverse inventory usage.'));
    }
  };

  const downloadInventoryReport = async () => {
    setExportingReport(true); setReportError('');
    try {
      const response = await axiosInstance.get('/inventory/reports/export.csv', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plwm-mcc-inventory-report.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setReportError(apiErrorMessage(err, 'Failed to export inventory report.'));
    } finally { setExportingReport(false); }
  };

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchRequestContexts(); }, [fetchRequestContexts]);
  useEffect(() => { if (tab === 'items') fetchItems(); }, [tab, fetchItems]);
  useEffect(() => { if (tab === 'requests') fetchRequests(); }, [tab, fetchRequests]);
  useEffect(() => { if (tab === 'usage' && canViewUsage) fetchUsages(1); }, [tab, canViewUsage, fetchUsages]);
  useEffect(() => { if (tab === 'usage' && showUsageForm) fetchUsageItems(); }, [tab, showUsageForm, fetchUsageItems]);
  useEffect(() => { if (tab === 'reports' && canViewReports) fetchReport(); }, [tab, canViewReports, fetchReport]);

  const resetItemForm = () => {
    setItemForm({ name: '', category_id: '', quantity: '', unit: '', condition: 'Good', status: 'Available', low_stock_threshold: '' });
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
      status:              item.status === 'Under Repair' ? 'Under Repair' : 'Available',
      low_stock_threshold: item.low_stock_threshold ?? ''
    });
    setShowItemForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault(); setSavingItem(true); setItemFormErr('');
    try {
      const payload = { ...itemForm, quantity: parseInt(itemForm.quantity) };
      payload.low_stock_threshold = itemForm.low_stock_threshold === '' ? null : parseInt(itemForm.low_stock_threshold, 10);
      if (editItem) await axiosInstance.put(`/inventory/items/${editItem.id}`, payload);
      else          await axiosInstance.post('/inventory/items', payload);
      setShowItemForm(false); resetItemForm(); fetchItems();
    } catch (err) { setItemFormErr(apiErrorMessage(err, 'Failed to save item.')); }
    finally { setSavingItem(false); }
  };

  const handleDeleteItem = async (item) => {
    if (!(await confirm({
      title: 'Delete inventory item?',
      message: `Delete "${item.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete item',
      tone: 'danger',
    }))) return;
    try {
      await axiosInstance.delete(`/inventory/items/${item.id}`);
      fetchItems();
    } catch (err) { setItemError(apiErrorMessage(err, 'Failed to delete item.')); }
  };

  const openRejectDialog = (request) => {
    setReviewDialog(request);
    setReviewNote('');
    setReviewError('');
  };

  const closeRejectDialog = () => {
    if (savingReview) return;
    setReviewDialog(null);
    setReviewNote('');
    setReviewError('');
  };

  const handleReviewRequest = async (id, status, note = null) => {
    setSavingReview(true);
    setReviewError('');
    try {
      await axiosInstance.patch(`/inventory/requests/${id}/review`, { status, review_note: note });
      if (status === 'rejected') {
        setReviewDialog(null);
        setReviewNote('');
      }
      await fetchRequests();
    } catch (err) {
      const message = apiErrorMessage(err, 'Failed to review request.');
      if (status === 'rejected') setReviewError(message);
      else setReqError(message);
    } finally {
      setSavingReview(false);
    }
  };

  const handleRejectSubmit = async (event) => {
    event.preventDefault();
    if (!reviewDialog) return;
    await handleReviewRequest(reviewDialog.id, 'rejected', reviewNote.trim() || null);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault(); setSavingReq(true); setReqFormErr('');
    try {
      const contextKey = reqForm.context_type === 'ministry' ? 'ministry_role_id' : `${reqForm.context_type}_id`;
      const contextPayload = reqForm.context_type && reqForm.context_id ? { [contextKey]: Number(reqForm.context_id) } : {};
      await axiosInstance.post('/inventory/requests', {
        item_id: Number(reqForm.item_id), quantity: parseInt(reqForm.quantity, 10), purpose: reqForm.purpose, request_key: requestKey, ...contextPayload,
      });
      setShowReqForm(false);
      setReqForm({ item_id: '', quantity: '', purpose: '', context_type: '', context_id: '' });
      setRequestKey(createInventoryRequestKey());
      fetchRequests();
    } catch (err) { setReqFormErr(apiErrorMessage(err, 'Failed to submit request.')); }
    finally { setSavingReq(false); }
  };

  const isLowStock = (item) => item.status === 'Low Stock' || item.status === 'Out of Stock';
  const getFormAvailability = () => {
    if (itemForm.status === 'Under Repair') return 'Under Repair';
    const quantity = Number(itemForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return 'Out of Stock';
    const threshold = itemForm.low_stock_threshold === '' ? null : Number(itemForm.low_stock_threshold);
    if (threshold != null && quantity <= threshold) return 'Low Stock';
    return 'Available';
  };

  return (
    <div className="mcc-module mcc-module-inventory-page" style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 className="workspace-page-title" style={s.title}>Inventory</h1>
          <p style={s.subtitle}>{totalItems} items tracked</p>
        </div>
        <div style={s.headerActions}>
          {tab === 'items' && canCreate && (
            <button onClick={() => { setShowItemForm(!showItemForm); if (showItemForm) resetItemForm(); }} style={s.addBtn}>
              {showItemForm ? <><MonoIcon name="close" size={14} /> Cancel</> : '+ Add Item'}
            </button>
          )}
          {tab === 'requests' && canRequest && (
            <button disabled={savingReq} onClick={() => { setReqFormErr(''); setRequestKey(createInventoryRequestKey()); setShowReqForm((current) => !current); }} style={s.addBtn}>
              {showReqForm ? <><MonoIcon name="close" size={14} /> Cancel</> : '+ Request Item'}
            </button>
          )}
          {tab === 'usage' && canCreate && (
            <button onClick={() => { setShowUsageForm(!showUsageForm); if (showUsageForm) resetUsageForm(); }} style={s.addBtn}>
              {showUsageForm ? <><MonoIcon name="close" size={14} /> Cancel</> : '+ Record Usage'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {['items', 'requests', ...(canViewUsage ? ['usage'] : []), ...(canViewReports ? ['reports'] : [])].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...s.tab, background: tab === t ? '#005599' : '#f1f5f9', color: tab === t ? 'var(--mcc-surface, #fff)' : '#475569' }}>
            <MonoIcon name={t === 'items' ? 'inventory' : t === 'requests' ? 'clipboard' : t === 'usage' ? 'document' : 'dashboard'} size={15} /> {t === 'items' ? 'Items' : t === 'requests' ? 'Requests' : t === 'usage' ? 'Usage' : 'Reports'}
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
                    <label htmlFor="inventory-item-status" style={s.label}>Availability override</label>
                    <select id="inventory-item-status" value={itemForm.status} onChange={e => setItemForm(f => ({ ...f, status: e.target.value }))} style={s.select}>
                      <option value="Available">Automatic</option><option value="Under Repair">Under Repair</option>
                    </select>
                    <small style={{ color: 'var(--mcc-secondary, #52647a)' }}>Quantity and the low-stock alert determine availability: <strong>{getFormAvailability()}</strong>.</small>
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
          {!scopedRequestOnly && <div style={s.filterBar}>
            <input value={itemSearch} onChange={e => { setItemSearch(e.target.value); setItemPage(1); }}
              placeholder="Search items..." style={s.filterInput} />
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setItemPage(1); }} style={s.filterSelect}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select aria-label="Filter by availability" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setItemPage(1); }} style={s.filterSelect}>
              <option value="">All Availability</option>
              {['Available', 'Low Stock', 'Out of Stock', 'Under Repair'].map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>}

          {itemError && <div style={s.errorBox}>{itemError}</div>}

          {/* Items table */}
          <div style={s.tableWrap}>
            <div style={s.tableScroll}><ResponsiveTable style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Item</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Qty</th>
                  <th style={s.th}>Unit</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Condition</th>
                  <th style={s.th}>Availability</th>
                  {(canManage || canDelete) && <th style={s.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loadingItems ? (
                  <tr><td colSpan={canManage || canDelete ? 8 : 7} style={s.centerCell}>Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={canManage || canDelete ? 8 : 7} style={s.centerCell}>No items found.</td></tr>
                ) : items.map((item, i) => {
                  const condStyle = CONDITION_STYLE[item.condition] || CONDITION_STYLE['Good'];
                  const lowStock  = isLowStock(item);
                  return (
                    <tr key={item.id}
                      style={{ ...s.row, background: i % 2 === 0 ? 'var(--mcc-surface, #fff)' : '#f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e8f4fd'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--mcc-surface, #fff)' : '#f8fafc'}
                    >
                      <td style={s.td}>
                        <span style={{ fontWeight: '600', color: 'var(--mcc-ink, #0f172a)' }}>{item.name}</span>
                        {lowStock && <span style={s.lowStockTag}><MonoIcon name="warning" size={12} /> {item.status === 'Out of Stock' ? 'Out' : 'Low'}</span>}
                      </td>
                      <td style={s.td}>{item.category?.name || '—'}</td>
                      <td style={{ ...s.td, fontWeight: '700', color: lowStock ? '#dc2626' : 'var(--mcc-ink, #0f172a)', fontSize: '16px' }}>{item.quantity}</td>
                      <td style={{ ...s.td, color: 'var(--mcc-secondary, #52647a)' }}>{item.unit || '—'}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: item.category?.is_returnable ? '#e8f4fd' : '#f0fdf4', color: item.category?.is_returnable ? '#0066b3' : '#16a34a' }}>
                          {item.category?.is_returnable ? 'Returnable' : 'Consumable'}
                        </span>
                      </td>
                      <td style={s.td}>
                        {item.condition && <span style={{ ...s.badge, background: condStyle.bg, color: condStyle.color }}>{item.condition}</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, ...(AVAILABILITY_STYLE[item.status] || AVAILABILITY_STYLE.Available) }}>
                          {item.status || 'Available'}
                        </span>
                      </td>
                      {(canManage || canDelete) && (
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {canUpdate && <button onClick={() => openEditItem(item)} style={s.editBtn}>Edit</button>}
                            {canDelete && <button onClick={() => handleDeleteItem(item)} style={{ ...s.editBtn, background: '#fef2f2', color: '#dc2626' }}>Delete</button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </ResponsiveTable></div>
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
                    <select value={reqForm.item_id} onChange={e => updateRequestField('item_id', e.target.value)} required style={s.select}>
                      <option value="">— Select Item —</option>
                      {items.map(item => {
                        const unavailable = item.status === 'Under Repair' || item.status === 'Out of Stock' || Number(item.quantity) <= 0;
                        return <option key={item.id} value={item.id} disabled={unavailable}>{item.name} ({item.status === 'Under Repair' || item.status === 'Out of Stock' ? item.status : `${item.quantity} ${item.unit || 'available'}`})</option>;
                      })}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Quantity *</label>
                    <input type="number" min="1" value={reqForm.quantity}
                      onChange={e => updateRequestField('quantity', e.target.value)} required style={s.input} />
                  </div>
                </div>
                <div style={s.formRow}>
                  <div style={s.field}>
                    <label htmlFor="inventory-request-context-type" style={s.label}>Link to event, service, or ministry</label>
                    <select id="inventory-request-context-type" value={reqForm.context_type} onChange={e => updateRequestField('context_type', e.target.value, { context_id: '' })} style={s.select}>
                      <option value="">General request</option><option value="event">Event</option><option value="service">Service</option><option value="ministry">Ministry</option>
                    </select>
                  </div>
                  {reqForm.context_type && (() => {
                    const choices = reqForm.context_type === 'event' ? requestContexts.events : reqForm.context_type === 'service' ? requestContexts.services : requestContexts.ministries;
                    const title = reqForm.context_type === 'ministry' ? 'name' : 'title';
                    return <div style={s.field}>
                      <label htmlFor="inventory-request-context" style={s.label}>{reqForm.context_type === 'ministry' ? 'Ministry' : `${reqForm.context_type[0].toUpperCase()}${reqForm.context_type.slice(1)}`} *</label>
                      <select id="inventory-request-context" value={reqForm.context_id} onChange={e => updateRequestField('context_id', e.target.value)} required style={s.select}>
                        <option value="">— Select —</option>
                        {choices.map(choice => <option key={choice.id} value={choice.id}>{choice[title]}{choice.start_date ? ` · ${choice.start_date}` : choice.service_date ? ` · ${choice.service_date}` : ''}</option>)}
                      </select>
                    </div>;
                  })()}
                </div>
                <div style={s.field}>
                  <label style={s.label}>Purpose</label>
                  <input value={reqForm.purpose} onChange={e => updateRequestField('purpose', e.target.value)}
                    placeholder="What is this for?" style={s.input} />
                </div>
                <div style={s.formActions}>
                    <button type="button" disabled={savingReq} onClick={() => { setShowReqForm(false); setReqForm({ item_id: '', quantity: '', purpose: '', context_type: '', context_id: '' }); setReqFormErr(''); setRequestKey(createInventoryRequestKey()); }} style={s.cancelBtn}>Cancel</button>
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
                  style={{ ...s.filterChip, background: reqFilter === st ? '#005599' : '#f1f5f9', color: reqFilter === st ? 'var(--mcc-surface, #fff)' : '#475569' }}>
                  {st ? st.charAt(0).toUpperCase() + st.slice(1) : 'All'}
                </button>
              ))}
            </div>
          )}

          {reqError && <div style={s.errorBox}>{reqError}</div>}

          {/* Requests table */}
          <div style={s.tableWrap}>
            <div style={s.tableScroll}><ResponsiveTable style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Item</th>
                  <th style={s.th}>Requested By</th>
                  <th style={s.th}>Qty</th>
                  <th style={s.th}>Purpose / Context</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Date</th>
                  {canManage && <th style={s.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loadingReqs ? (
                  <tr><td colSpan={8} style={s.centerCell}>Loading...</td></tr>
                ) : (canManage ? requests : myRequests).length === 0 ? (
                  <tr><td colSpan={8} style={s.centerCell}>No requests found.</td></tr>
                ) : (canManage ? requests : myRequests).map((r, i) => {
                  const stStyle = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                  return (
                    <tr key={r.id}
                      style={{ ...s.row, background: i % 2 === 0 ? 'var(--mcc-surface, #fff)' : '#f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e8f4fd'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--mcc-surface, #fff)' : '#f8fafc'}
                    >
                      <td style={{ ...s.td, fontWeight: '600', color: 'var(--mcc-ink, #0f172a)' }}>{r.item?.name}</td>
                      <td style={{ ...s.td, fontSize: '13px', color: 'var(--mcc-secondary, #52647a)' }}>{r.requestedByUser?.email}</td>
                      <td style={s.td}>{r.quantity} {r.item?.unit || ''}</td>
                      <td style={{ ...s.td, color: 'var(--mcc-secondary, #52647a)', fontSize: '13px' }}>
                        <div>{r.purpose || '—'}</div>
                        {(r.event || r.service || r.ministryRole) && <small style={{ color: '#005599' }}>{r.event ? `Event: ${r.event.title}` : r.service ? `Service: ${r.service.title}` : `Ministry: ${r.ministryRole.name}`}</small>}
                        {r.review_note && <small style={{ display: 'block', marginTop: '4px', color: 'var(--mcc-secondary, #52647a)' }}>Review note: {r.review_note}</small>}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: stStyle.bg, color: stStyle.color }}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ ...s.td, color: 'var(--mcc-secondary, #52647a)', fontSize: '13px' }}>
                        {formatDate(r.created_at ?? r.createdAt)}
                      </td>
                      {canManage && (
                        <td style={s.td}>
                          {r.status === 'pending' && (
                            <div style={s.actions}>
                              <button onClick={() => handleReviewRequest(r.id, 'approved')} style={s.approveBtn}>Approve</button>
                              <button onClick={() => openRejectDialog(r)} style={s.rejectBtn}>Reject</button>
                            </div>
                          )}
                          {r.status !== 'pending' && (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                              by {r.reviewedByUser?.email || r.reviewedBy?.email || '—'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </ResponsiveTable></div>
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

      {tab === 'usage' && canViewUsage && (
        <>
          {showUsageForm && canCreate && (
            <div style={s.formCard}>
              <h3 style={s.formTitle}>Record Inventory Usage</h3>
              {usageFormError && <div role="alert" style={s.errorBox}>{usageFormError}</div>}
              <form onSubmit={handleUsageSubmit} style={s.form}>
                <div style={s.formRow}>
                  <div style={{ ...s.field, flex: 2 }}>
                    <label htmlFor="inventory-usage-search" style={s.label}>Find item</label>
                    <input id="inventory-usage-search" value={usageItemSearch}
                      onChange={e => { setUsageItemSearch(e.target.value); setUsageForm(f => ({ ...f, item_id: '' })); }}
                      placeholder="Search inventory items..." style={s.input} />
                    <label htmlFor="inventory-usage-item" style={s.label}>Item *</label>
                    <select id="inventory-usage-item" value={usageForm.item_id}
                      onChange={e => setUsageForm(f => ({ ...f, item_id: e.target.value, quantity_used: '' }))}
                      required style={s.select}>
                      <option value="">— Select available item —</option>
                      {usageItems.map(item => {
                        const unavailable = item.status === 'Under Repair' || item.status === 'Out of Stock' || Number(item.quantity) <= 0;
                        return <option key={item.id} value={item.id} disabled={unavailable}>
                          {item.name} · {item.quantity} {item.unit || 'available'}{unavailable ? ` · ${item.status || 'Unavailable'}` : ''}
                        </option>;
                      })}
                    </select>
                    {usageItems.length === 0 && <small style={{ color: 'var(--mcc-secondary, #52647a)' }}>No items matched. Try another search.</small>}
                  </div>
                  <div style={s.field}>
                    <label htmlFor="inventory-usage-quantity" style={s.label}>Quantity used *</label>
                    <input id="inventory-usage-quantity" type="number" min="1" step="1"
                      max={usageItems.find(item => String(item.id) === String(usageForm.item_id))?.quantity}
                      value={usageForm.quantity_used} required
                      onChange={e => setUsageForm(f => ({ ...f, quantity_used: e.target.value }))} style={s.input} />
                    <small style={{ color: 'var(--mcc-secondary, #52647a)' }}>
                      {usageItems.find(item => String(item.id) === String(usageForm.item_id))
                        ? `Available: ${usageItems.find(item => String(item.id) === String(usageForm.item_id)).quantity}`
                        : 'Select an item first.'}
                    </small>
                  </div>
                  <div style={s.field}>
                    <label htmlFor="inventory-usage-date" style={s.label}>Used at *</label>
                    <input id="inventory-usage-date" type="datetime-local" value={usageForm.used_at} required
                      onChange={e => setUsageForm(f => ({ ...f, used_at: e.target.value }))} style={s.input} />
                  </div>
                </div>
                <div style={s.field}>
                  <label htmlFor="inventory-usage-purpose" style={s.label}>Purpose / event</label>
                  <input id="inventory-usage-purpose" value={usageForm.used_for}
                    onChange={e => setUsageForm(f => ({ ...f, used_for: e.target.value }))}
                    maxLength={300} placeholder="e.g. Sunday service setup" style={s.input} />
                </div>
                <div style={s.formActions}>
                  <button type="button" onClick={() => { setShowUsageForm(false); resetUsageForm(); }} style={s.cancelBtn}>Cancel</button>
                  <button type="submit" disabled={savingUsage || !usageForm.item_id} style={{ ...s.submitBtn, opacity: savingUsage || !usageForm.item_id ? 0.7 : 1 }}>
                    {savingUsage ? 'Saving...' : 'Record Usage'}
                  </button>
                </div>
              </form>
            </div>
          )}
          {usageError && <div role="alert" style={s.errorBox}>{usageError}</div>}
          <div style={s.tableWrap}>
            <div style={s.tableScroll}><ResponsiveTable style={s.table}>
              <thead><tr style={s.thead}>
                <th style={s.th}>Used At</th><th style={s.th}>Item</th><th style={s.th}>Quantity</th>
                <th style={s.th}>Purpose / Event</th><th style={s.th}>Recorded By</th>
                {canDelete && <th style={s.th}>Actions</th>}
              </tr></thead>
              <tbody>
                {loadingUsages ? <tr><td colSpan={canDelete ? 6 : 5} style={s.centerCell}>Loading usage records...</td></tr>
                  : usages.length === 0 ? <tr><td colSpan={canDelete ? 6 : 5} style={s.centerCell}>No inventory usage records found.</td></tr>
                    : usages.map((usage, index) => (
                      <tr key={usage.id} style={{ ...s.row, background: index % 2 === 0 ? 'var(--mcc-surface, #fff)' : '#f8fafc' }}>
                        <td style={s.td}>{new Date(usage.used_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td style={{ ...s.td, fontWeight: '600', color: 'var(--mcc-ink, #0f172a)' }}>{usage.item?.name || `Item #${usage.item_id}`}</td>
                        <td style={s.td}>{usage.quantity_used} {usage.item?.unit || ''}</td>
                        <td style={s.td}>{usage.used_for || '—'}</td>
                        <td style={s.td}>{usage.usedByUser?.email || '—'}</td>
                        {canDelete && <td style={s.td}><button onClick={() => handleDeleteUsage(usage)} style={{ ...s.editBtn, background: '#fef2f2', color: '#dc2626' }}>Reverse</button></td>}
                      </tr>
                    ))}
              </tbody>
            </ResponsiveTable></div>
          </div>
          {usagePages > 1 && (
            <div style={s.pagination}>
              <button onClick={() => fetchUsages(Math.max(1, usagePage - 1))} disabled={usagePage === 1 || loadingUsages} style={s.pageBtn}>← Prev</button>
              <span style={s.pageInfo}>Page {usagePage} of {usagePages}</span>
              <button onClick={() => fetchUsages(Math.min(usagePages, usagePage + 1))} disabled={usagePage === usagePages || loadingUsages} style={s.pageBtn}>Next →</button>
            </div>
          )}
        </>
      )}

      {tab === 'reports' && canViewReports && (
        <section aria-label="Inventory reports" style={s.reportSection}>
          <div style={s.reportHeader}>
            <div>
              <h2 style={s.reportTitle}>Inventory overview</h2>
              <p style={s.subtitle}>Stock availability, usage, and request totals.</p>
            </div>
            <button onClick={downloadInventoryReport} disabled={exportingReport || loadingReport} style={{ ...s.addBtn, opacity: exportingReport || loadingReport ? 0.7 : 1 }}>
              {exportingReport ? 'Preparing CSV…' : 'Download CSV'}
            </button>
          </div>
          {reportError && <div role="alert" style={s.errorBox}>{reportError}</div>}
          {loadingReport ? <div style={s.centerCell}>Loading inventory report…</div> : report && (
            <>
              <div style={s.reportCards}>
                <ReportMetric label="Items tracked" value={report.total_items} />
                <ReportMetric label="Units in stock" value={report.total_quantity} />
                <ReportMetric label="Usage records" value={report.usage?.records || 0} />
                <ReportMetric label="Units used" value={report.usage?.quantity_used || 0} />
              </div>
              <div style={s.reportColumns}>
                <div style={s.reportCard}>
                  <h3 style={s.reportCardTitle}>Availability</h3>
                  {report.statuses?.map(entry => (
                    <div key={entry.status} style={s.reportRow}>
                      <span><span style={{ ...s.statusDot, background: AVAILABILITY_STYLE[entry.status]?.color || 'var(--mcc-secondary, #52647a)' }} />{entry.status}</span>
                      <strong>{entry.count}</strong>
                    </div>
                  ))}
                </div>
                <div style={s.reportCard}>
                  <h3 style={s.reportCardTitle}>Requests</h3>
                  {report.requests?.map(entry => (
                    <div key={entry.status} style={s.reportRow}>
                      <span>{entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}</span>
                      <strong>{entry.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <p style={s.reportGenerated}>Updated {new Date(report.generated_at).toLocaleString()}</p>
            </>
          )}
        </section>
      )}

      {reviewDialog && (
        <div style={s.reviewOverlay}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-reject-title"
            aria-describedby="inventory-reject-description"
            style={s.reviewDialog}
          >
            <h2 id="inventory-reject-title" style={s.reviewTitle}>Reject inventory request</h2>
            <p id="inventory-reject-description" style={s.reviewDescription}>
              Reject the request for <strong>{reviewDialog.item?.name || `Item #${reviewDialog.item_id}`}</strong>? The requester will see it as rejected.
            </p>
            <form onSubmit={handleRejectSubmit} style={s.form}>
              <div style={s.field}>
                <label htmlFor="inventory-rejection-note" style={s.label}>Reason for rejection (optional)</label>
                <textarea
                  id="inventory-rejection-note"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  autoFocus
                  placeholder="Add a short explanation for the requester."
                  style={s.reviewTextarea}
                />
                <small style={s.reviewHint}>{reviewNote.length}/1000 characters</small>
              </div>
              {reviewError && <div role="alert" style={s.errorBox}>{reviewError}</div>}
              <div style={s.formActions}>
                <button type="button" onClick={closeRejectDialog} disabled={savingReview} style={s.cancelBtn}>Cancel</button>
                <button type="submit" disabled={savingReview} style={{ ...s.rejectBtn, opacity: savingReview ? 0.7 : 1 }}>
                  {savingReview ? 'Rejecting…' : 'Reject request'}
                </button>
              </div>
            </form>
          </section>
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

function ReportMetric({ label, value }) {
  return <div style={s.reportCard}><span style={s.reportMetricLabel}>{label}</span><strong style={s.reportMetricValue}>{Number(value || 0).toLocaleString()}</strong></div>;
}

const s = {
  page:         { fontFamily: "'Inter', sans-serif" },
  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title:        { fontSize: '24px', fontWeight: '700', color: 'var(--mcc-ink, #0f172a)', margin: 0 },
  subtitle:     { fontSize: '14px', color: 'var(--mcc-secondary, #52647a)', margin: '4px 0 0 0' },
  headerActions:{ display: 'flex', gap: '10px' },
  addBtn:       { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: 'var(--mcc-surface, #fff)', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  tabBar:       { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tab:          { border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  formCard:     { background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 'var(--mcc-radius, 16px)', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formTitle:    { fontSize: '16px', fontWeight: '700', color: 'var(--mcc-ink, #0f172a)', margin: '0 0 16px 0' },
  form:         { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow:      { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  field:        { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '140px' },
  label:        { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input:        { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:       { padding: '10px 12px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none', background: 'var(--mcc-surface, #fff)' },
  formActions:  { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn:    { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  submitBtn:    { background: 'linear-gradient(135deg, #005599, #13B5EA)', color: 'var(--mcc-surface, #fff)', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  filterBar:    { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  filterInput:  { padding: '8px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none', flex: 1, minWidth: '160px' },
  filterSelect: { padding: '8px 12px', fontSize: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none', background: 'var(--mcc-surface, #fff)' },
  filterChip:   { border: 'none', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  errorBox:     { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' },
  tableWrap:    { background: 'var(--mcc-surface, #fff)', borderRadius: 'var(--mcc-radius, 16px)', border: '1px solid var(--mcc-border, #e2e8f0)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  tableScroll:  { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  thead:        { background: '#f8fafc' },
  th:           { padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--mcc-secondary, #52647a)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--mcc-border, #e2e8f0)' },
  row:          { transition: 'background 0.15s' },
  td:           { padding: '14px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  centerCell:   { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  badge:        { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  lowStockTag:  { color: '#dc2626', fontSize: '11px', fontWeight: '700', marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' },
  actions:      { display: 'flex', gap: '6px' },
  editBtn:      { background: '#e8f4fd', color: '#0066b3', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  approveBtn:   { background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  rejectBtn:    { background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  pagination:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px' },
  pageBtn:      { background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer' },
  pageInfo:     { fontSize: '14px', color: 'var(--mcc-secondary, #52647a)' },
  reportSection:{ display: 'flex', flexDirection: 'column', gap: '18px' },
  reportHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  reportTitle:  { fontSize: '18px', fontWeight: '700', color: 'var(--mcc-ink, #0f172a)', margin: '0 0 4px' },
  reportCards:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' },
  reportCard:   { background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 'var(--mcc-radius, 16px)', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  reportMetricLabel: { display: 'block', color: 'var(--mcc-secondary, #52647a)', fontSize: '13px', marginBottom: '8px' },
  reportMetricValue: { color: 'var(--mcc-ink, #0f172a)', fontSize: '24px' },
  reportColumns:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' },
  reportCardTitle: { margin: '0 0 14px', color: 'var(--mcc-ink, #0f172a)', fontSize: '15px' },
  reportRow:    { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderTop: '1px solid #f1f5f9', color: '#475569', fontSize: '14px' },
  statusDot:    { display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginRight: '8px' },
  reportGenerated: { margin: 0, color: '#94a3b8', fontSize: '12px' },
  reviewOverlay: { position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(15, 23, 42, 0.48)' },
  reviewDialog: { width: '100%', maxWidth: '520px', padding: '24px', borderRadius: 'var(--mcc-radius, 16px)', background: 'var(--mcc-surface, #fff)', boxShadow: '0 20px 48px rgba(15, 23, 42, 0.22)' },
  reviewTitle: { margin: '0 0 8px', color: 'var(--mcc-ink, #0f172a)', fontSize: '18px', fontWeight: '700' },
  reviewDescription: { margin: '0 0 18px', color: '#475569', fontSize: '14px', lineHeight: 1.5 },
  reviewTextarea: { minHeight: '104px', padding: '10px 12px', font: 'inherit', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '8px', resize: 'vertical' },
  reviewHint: { color: 'var(--mcc-secondary, #52647a)', fontSize: '12px', textAlign: 'right' },
};
