import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import MonoIcon from '../common/MonoIcon';
import { displayMemberName } from '../../utils/displayIdentity';
import {
  blockInvalidDecimalKeys,
  blockInvalidIntegerKeys,
  sanitizeCurrency,
  sanitizePersonName,
  sanitizeReference,
  sanitizeWholeNumber,
} from '../../utils/inputConstraints';

const php = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EventWorkspacePanel({ eventId }) {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const canEditEvent = hasPermission('events', 'update');
  const canApproveFinance = hasPermission('finance', 'update');

  const [tab, setTab] = useState('program');
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Quick add forms
  const [progForm, setProgForm] = useState({ start_time: '', end_time: '', title: '', lead_person: '' });
  const [commForm, setCommForm] = useState({ name: '', responsibilities: '' });
  const [budgetForm, setBudgetForm] = useState({ title: 'Event Budget Proposal', category_name: 'Food & Hospitality', description: '', quantity: '1', unit_cost: '' });
  const [advForm, setAdvForm] = useState({ recipient_name: '', amount_released: '', notes: '' });
  const [liqForm, setLiqForm] = useState({ cash_advance_id: '', vendor: '', description: '', receipt_number: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) });

  const loadWorkspace = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/events/${eventId}/workspace`);
      setWs(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load event workspace.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const addProgram = async (e) => {
    e.preventDefault();
    if (!progForm.title.trim()) return;
    try {
      await axiosInstance.post(`/events/${eventId}/program`, progForm);
      setProgForm({ start_time: '', end_time: '', title: '', lead_person: '' });
      setNotice('Program item added.');
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add program item.');
    }
  };

  const addCommittee = async (e) => {
    e.preventDefault();
    if (!commForm.name.trim()) return;
    try {
      await axiosInstance.post(`/events/${eventId}/committees`, commForm);
      setCommForm({ name: '', responsibilities: '' });
      setNotice('Committee added.');
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add committee.');
    }
  };

  const addBudget = async (e) => {
    e.preventDefault();
    if (!Number(budgetForm.unit_cost)) return;
    const qty = Number(budgetForm.quantity || 1);
    const est = qty * Number(budgetForm.unit_cost);
    try {
      await axiosInstance.post(`/events/${eventId}/budgets`, {
        title: budgetForm.title.trim() || 'Event Budget',
        total_requested: est,
        submit_immediately: true,
        items: [{
          category_name: budgetForm.category_name.trim() || 'General',
          description: budgetForm.description.trim() || null,
          quantity: qty,
          unit_cost: Number(budgetForm.unit_cost),
          estimated_amount: est,
        }],
      });
      setBudgetForm({ title: 'Event Budget Proposal', category_name: 'Food & Hospitality', description: '', quantity: '1', unit_cost: '' });
      setNotice('Budget proposal submitted for approval.');
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create budget proposal.');
    }
  };

  const budgetAction = async (budgetId, action) => {
    try {
      const body = action === 'reject' ? { reason: window.prompt('Rejection reason:') || 'Revision required' } : {};
      await axiosInstance.post(`/events/${eventId}/budgets/${budgetId}/${action}`, body);
      setNotice(`Budget ${action}ed.`);
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Budget action failed.');
    }
  };

  const addCashAdvance = async (e) => {
    e.preventDefault();
    if (!advForm.recipient_name.trim() || !Number(advForm.amount_released)) return;
    try {
      await axiosInstance.post(`/events/${eventId}/cash-advances`, {
        recipient_name: advForm.recipient_name.trim(),
        amount_released: Number(advForm.amount_released),
        notes: advForm.notes.trim() || null,
      });
      setAdvForm({ recipient_name: '', amount_released: '', notes: '' });
      setNotice('Cash advance requested (tracked in Finance without counting as an expense).');
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to request cash advance.');
    }
  };

  const releaseAdvance = async (advId) => {
    try {
      const ref = window.prompt('Release reference / voucher # (optional):', '') || '';
      await axiosInstance.post(`/events/${eventId}/cash-advances/${advId}/release`, { reference_number: ref || null });
      setNotice('Cash advance released and tracked for liquidation.');
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to release cash advance.');
    }
  };

  const addLiquidation = async (e) => {
    e.preventDefault();
    if (!liqForm.description.trim() || !Number(liqForm.amount)) return;
    try {
      await axiosInstance.post(`/events/${eventId}/liquidations`, {
        cash_advance_id: liqForm.cash_advance_id ? Number(liqForm.cash_advance_id) : null,
        submit_immediately: true,
        items: [{
          vendor: liqForm.vendor.trim() || null,
          description: liqForm.description.trim(),
          receipt_number: liqForm.receipt_number.trim() || null,
          amount: Number(liqForm.amount),
          expense_date: liqForm.expense_date,
        }],
      });
      setLiqForm({ cash_advance_id: '', vendor: '', description: '', receipt_number: '', amount: '', expense_date: new Date().toISOString().slice(0, 10) });
      setNotice('Liquidation submitted for Finance verification & posting.');
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit liquidation.');
    }
  };

  const verifyPostLiquidation = async (liqId) => {
    try {
      await axiosInstance.post(`/events/${eventId}/liquidations/${liqId}/verify-and-post`, {});
      setNotice('Liquidation verified and posted to Finance Expenses (zero double-counting).');
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to post liquidation.');
    }
  };

  if (loading && !ws) return <section style={S.card}><p style={S.muted}>Loading Event Workspace…</p></section>;
  if (!ws) return null;

  const fin = ws.financial_summary || {};
  const tabs = [
    { id: 'program', label: `Program & Committees (${(ws.program?.length || 0) + (ws.committees?.length || 0)})` },
    { id: 'budget', label: `Budget & Advances (${(ws.budgets?.length || 0) + (ws.cash_advances?.length || 0)})` },
    { id: 'liquidation', label: `Liquidation & Posting (${ws.liquidations?.length || 0})` },
    { id: 'resources', label: `Resources (${ws.inventory_requests?.length || 0})` },
    { id: 'report', label: 'Completion Checklist & Report' },
  ];

  return (
    <section style={S.card} aria-label="Event planning and finance workspace">
      <div style={S.head}>
        <div>
          <h2 style={S.title}>Event Planning, Finance &amp; Resource Workspace</h2>
          <p style={S.subtitle}>
            Hybrid Finance integration: budgets and released cash advances are tracked immediately; verified liquidations post actual expenses once to Church Finance.
          </p>
        </div>
        <button type="button" onClick={() => window.print()} style={S.ghostBtn}>
          <MonoIcon name="printer" size={14} /> Print Report
        </button>
      </div>

      {/* Financial Reconciliation Strip */}
      <div style={{ ...S.kpiGrid, gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))' }}>
        <MiniStat label="Approved Budget" value={php(fin.approved_budget)} accent="#005599" />
        <MiniStat label="Cash Advanced" value={php(fin.cash_advanced)} accent="#13b5ea" />
        <MiniStat label="Posted Expenses" value={php(fin.actual_posted_expenses)} accent="#003d70" />
        <MiniStat label="Budget Variance" value={php(fin.variance)} accent="#52647a" />
        <MiniStat label="Returned / Reimbursed" value={`${php(fin.returned_cash)} / ${php(fin.reimbursement_due)}`} accent="#5c9dc4" />
      </div>

      {error && <div style={S.errorBox} role="alert">{error}</div>}
      {notice && <div style={S.noticeBox}>{notice}</div>}

      <div style={S.tabRow} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{ ...S.tabBtn, ...(tab === t.id ? S.tabBtnActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'program' && (
        <div style={{ ...S.twoCol, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
          <div>
            <h3 style={S.subTitle}>Program Run-Sheet</h3>
            {canEditEvent && (
              <form onSubmit={addProgram} style={S.inlineBox}>
                <div style={S.row}>
                  <input value={progForm.title} maxLength={120} onChange={(e) => setProgForm({ ...progForm, title: e.target.value })} placeholder="Segment title (e.g. Opening Prayer)" style={S.input} required />
                  <input type="time" value={progForm.start_time} onChange={(e) => setProgForm({ ...progForm, start_time: e.target.value })} style={{ ...S.input, maxWidth: 120 }} />
                  <input value={progForm.lead_person} maxLength={80} onChange={(e) => setProgForm({ ...progForm, lead_person: sanitizePersonName(e.target.value, 80) })} placeholder="In-charge" style={S.input} />
                  <button type="submit" style={S.primaryBtn}>Add</button>
                </div>
              </form>
            )}
            {(ws.program || []).length === 0 ? <p style={S.muted}>No program segments drafted yet.</p> : (
              <table style={S.table}>
                <thead><tr><th style={S.th}>Time</th><th style={S.th}>Segment</th><th style={S.th}>Lead</th></tr></thead>
                <tbody>
                  {ws.program.map((p) => (
                    <tr key={p.id} style={S.tr}>
                      <td style={S.td}>{p.start_time || '—'}</td>
                      <td style={S.td}><strong>{p.title}</strong></td>
                      <td style={S.td}>{p.lead_person || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <h3 style={S.subTitle}>Event Committees &amp; Volunteer Assignments</h3>
            {canEditEvent && (
              <form onSubmit={addCommittee} style={S.inlineBox}>
                <div style={S.row}>
                  <input value={commForm.name} onChange={(e) => setCommForm({ ...commForm, name: e.target.value })} placeholder="Committee (e.g. Food & Logistics)" style={S.input} required />
                  <input value={commForm.responsibilities} onChange={(e) => setCommForm({ ...commForm, responsibilities: e.target.value })} placeholder="Responsibilities" style={S.input} />
                  <button type="submit" style={S.primaryBtn}>Add</button>
                </div>
              </form>
            )}
            {(ws.committees || []).length === 0 ? <p style={S.muted}>No committees added yet.</p> : (
              <table style={S.table}>
                <thead><tr><th style={S.th}>Committee</th><th style={S.th}>Chair</th><th style={S.th}>Scope</th></tr></thead>
                <tbody>
                  {ws.committees.map((c) => (
                    <tr key={c.id} style={S.tr}>
                      <td style={S.td}><strong>{c.name}</strong></td>
                      <td style={S.td}>{c.chair ? displayMemberName(c.chair) : '—'}</td>
                      <td style={S.td}>{c.responsibilities || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h3 style={S.subTitle}>Budget Proposals</h3>
            {canEditEvent && (
              <form onSubmit={addBudget} style={S.inlineBox}>
                <div style={S.row}>
                  <input value={budgetForm.title} maxLength={120} onChange={(e) => setBudgetForm({ ...budgetForm, title: e.target.value })} placeholder="Budget title" style={S.input} />
                  <input value={budgetForm.category_name} maxLength={80} onChange={(e) => setBudgetForm({ ...budgetForm, category_name: e.target.value })} placeholder="Line item category" style={S.input} />
                  <input type="number" min="1" value={budgetForm.quantity} onKeyDown={blockInvalidIntegerKeys} onChange={(e) => setBudgetForm({ ...budgetForm, quantity: sanitizeWholeNumber(e.target.value, { maxLength: 6 }) })} placeholder="Qty" style={{ ...S.input, maxWidth: 80 }} />
                  <input type="number" step="0.01" min="0.01" value={budgetForm.unit_cost} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setBudgetForm({ ...budgetForm, unit_cost: sanitizeCurrency(e.target.value) })} placeholder="Unit cost (PHP)" style={{ ...S.input, maxWidth: 140 }} required />
                  <button type="submit" style={S.primaryBtn}>Submit Budget</button>
                </div>
              </form>
            )}
            <table style={S.table}>
              <thead><tr><th style={S.th}>Proposal</th><th style={S.th}>Requested</th><th style={S.th}>Approved</th><th style={S.th}>Status</th><th style={S.th}>Action</th></tr></thead>
              <tbody>
                {(ws.budgets || []).length === 0 ? <tr><td colSpan={5} style={S.emptyCell}>No budget proposals submitted yet.</td></tr> : ws.budgets.map((b) => (
                  <tr key={b.id} style={S.tr}>
                    <td style={S.td}><strong>{b.title}</strong></td>
                    <td style={S.td}>{php(b.total_requested)}</td>
                    <td style={S.td}>{b.total_approved != null ? php(b.total_approved) : '—'}</td>
                    <td style={S.td}><span style={S.pill}>{b.status}</span></td>
                    <td style={S.td}>
                      {canApproveFinance && b.status === 'submitted' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => budgetAction(b.id, 'approve')} style={S.smallBtn}>Approve</button>
                          <button type="button" onClick={() => budgetAction(b.id, 'reject')} style={S.smallGhostBtn}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={S.subTitle}>Cash Advances (Tracked Immediately — Not Counted as Expense Until Liquidated)</h3>
            {canEditEvent && (
              <form onSubmit={addCashAdvance} style={S.inlineBox}>
                <div style={S.row}>
                  <input value={advForm.recipient_name} maxLength={80} onChange={(e) => setAdvForm({ ...advForm, recipient_name: sanitizePersonName(e.target.value, 80) })} placeholder="Recipient coordinator name" style={S.input} required />
                  <input type="number" step="0.01" min="0.01" value={advForm.amount_released} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setAdvForm({ ...advForm, amount_released: sanitizeCurrency(e.target.value) })} placeholder="Advance amount (PHP)" style={{ ...S.input, maxWidth: 160 }} required />
                  <input value={advForm.notes} maxLength={200} onChange={(e) => setAdvForm({ ...advForm, notes: e.target.value })} placeholder="Purpose / notes" style={S.input} />
                  <button type="submit" style={S.primaryBtn}>Request Advance</button>
                </div>
              </form>
            )}
            <table style={S.table}>
              <thead><tr><th style={S.th}>Recipient</th><th style={S.th}>Amount</th><th style={S.th}>Release Date</th><th style={S.th}>Status</th><th style={S.th}>Action</th></tr></thead>
              <tbody>
                {(ws.cash_advances || []).length === 0 ? <tr><td colSpan={5} style={S.emptyCell}>No cash advances requested.</td></tr> : ws.cash_advances.map((a) => (
                  <tr key={a.id} style={S.tr}>
                    <td style={S.td}><strong>{a.recipient_name}</strong></td>
                    <td style={S.td}>{php(a.amount_released)}</td>
                    <td style={S.td}>{a.release_date || '—'}</td>
                    <td style={S.td}><span style={S.pill}>{a.status}</span></td>
                    <td style={S.td}>
                      {canApproveFinance && ['requested', 'approved'].includes(a.status) && (
                        <button type="button" onClick={() => releaseAdvance(a.id)} style={S.smallBtn}>Release Cash</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'liquidation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {canEditEvent && (
            <form onSubmit={addLiquidation} style={S.inlineBox}>
              <div style={S.subTitle}>Submit Receipt Liquidation</div>
              <div style={S.row}>
                <select value={liqForm.cash_advance_id} onChange={(e) => setLiqForm({ ...liqForm, cash_advance_id: e.target.value })} style={S.input} aria-label="Cash advance">
                  <option value="">Direct Reimbursement (no advance)</option>
                  {(ws.cash_advances || []).filter((a) => a.status === 'released').map((a) => (
                    <option key={a.id} value={a.id}>{a.recipient_name} — {php(a.amount_released)}</option>
                  ))}
                </select>
                <input value={liqForm.vendor} maxLength={120} onChange={(e) => setLiqForm({ ...liqForm, vendor: e.target.value })} placeholder="Vendor / Store" style={S.input} />
                <input value={liqForm.description} maxLength={250} onChange={(e) => setLiqForm({ ...liqForm, description: e.target.value })} placeholder="Expense item description *" style={S.input} required />
                <input value={liqForm.receipt_number} maxLength={50} onChange={(e) => setLiqForm({ ...liqForm, receipt_number: sanitizeReference(e.target.value, 50) })} placeholder="OR / Receipt #" style={{ ...S.input, maxWidth: 130 }} />
                <input type="number" step="0.01" min="0.01" value={liqForm.amount} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setLiqForm({ ...liqForm, amount: sanitizeCurrency(e.target.value) })} placeholder="Amount *" style={{ ...S.input, maxWidth: 130 }} required />
                <button type="submit" style={S.primaryBtn}>Submit Liquidation</button>
              </div>
            </form>
          )}
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Liquidation #</th>
                <th style={S.th}>Advanced</th>
                <th style={S.th}>Actual Spent</th>
                <th style={S.th}>Returned / Reimbursed</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Finance Posting</th>
              </tr>
            </thead>
            <tbody>
              {(ws.liquidations || []).length === 0 ? <tr><td colSpan={6} style={S.emptyCell}>No liquidations submitted yet.</td></tr> : ws.liquidations.map((l) => (
                <tr key={l.id} style={S.tr}>
                  <td style={S.td}><strong>LIQ-{l.id}</strong> ({l.items?.length || 0} receipt lines)</td>
                  <td style={S.td}>{php(l.total_advanced)}</td>
                  <td style={S.td}><strong>{php(l.total_spent)}</strong></td>
                  <td style={S.td}>Return {php(l.amount_returned)} · Reimburse {php(l.amount_reimbursed)}</td>
                  <td style={S.td}><span style={S.pill}>{l.status}</span></td>
                  <td style={S.td}>
                    {canApproveFinance && l.status !== 'posted' ? (
                      <button type="button" onClick={() => verifyPostLiquidation(l.id)} style={S.smallBtn}>Verify &amp; Post to Finance</button>
                    ) : (
                      <span style={S.muted}>{l.status === 'posted' ? 'Posted once to Finance' : 'Awaiting Finance'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'resources' && (
        <div>
          <h3 style={S.subTitle}>Inventory &amp; Equipment Requests for this Event</h3>
          {(ws.inventory_requests || []).length === 0 ? (
            <p style={S.muted}>No inventory requests linked to this event yet. Create requests from the Inventory module and link this event.</p>
          ) : (
            <table style={S.table}>
              <thead><tr><th style={S.th}>Item</th><th style={S.th}>Requested Qty</th><th style={S.th}>Status</th></tr></thead>
              <tbody>
                {ws.inventory_requests.map((r) => (
                  <tr key={r.id} style={S.tr}>
                    <td style={S.td}><strong>{r.item?.name || `Item #${r.item_id}`}</strong></td>
                    <td style={S.td}>{r.quantity} {r.item?.unit || ''}</td>
                    <td style={S.td}><span style={S.pill}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={S.subTitle}>Event Completion Checklist</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {(ws.checklist || []).map((c) => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: c.done ? '#e8f4fd' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 700, color: c.done ? '#005599' : '#64748b' }}>{c.done ? '✓' : '○'}</span>
                <span style={{ fontSize: 13.5, color: '#0f172a', fontWeight: c.done ? 600 : 400 }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#52647a', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{value}</div>
    </div>
  );
}

const S = {
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: '#003d70' },
  subtitle: { margin: '4px 0 0', fontSize: 13, color: '#52647a' },
  kpiGrid: { display: 'grid', gap: 10 },
  tabRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  tabBtn: { background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  tabBtnActive: { background: '#005599', color: '#fff', border: '1px solid #005599' },
  twoCol: { display: 'grid', gap: 16, alignItems: 'start' },
  subTitle: { margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#003d70' },
  inlineBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, marginBottom: 10 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { flex: '1 1 130px', minWidth: 0, boxSizing: 'border-box', padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 13, background: '#fff' },
  primaryBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', color: '#003d70', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  smallBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  smallGhostBtn: { background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 9px', fontSize: 11, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '8px 9px', color: '#0f172a', verticalAlign: 'middle' },
  emptyCell: { padding: 18, textAlign: 'center', color: '#64748b' },
  pill: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600, textTransform: 'capitalize' },
  muted: { fontSize: 13, color: '#64748b', margin: '4px 0' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
  noticeBox: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 9, padding: '8px 12px', fontSize: 13 },
};
