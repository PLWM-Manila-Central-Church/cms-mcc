import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import FinanceNavigation from '../../components/finance/FinanceNavigation';
import MonoIcon from '../../components/common/MonoIcon';
import IconActionButton from '../../components/common/IconActionButton';
import { blockInvalidDecimalKeys, sanitizeCode, sanitizeCurrency, sanitizeMaskedAccount } from '../../utils/inputConstraints';

const php = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinanceFundsAccountsPage() {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const canCreate = hasPermission('finance', 'create');
  const canArchive = hasPermission('finance', 'archive');

  const [funds, setFunds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [fundForm, setFundForm] = useState({ name: '', fund_code: '', opening_balance: '0', is_restricted: false, description: '' });
  const [accForm, setAccForm] = useState({ name: '', account_type: 'bank', account_number_masked: '', opening_balance: '0', description: '' });
  const [trfForm, setTrfForm] = useState({
    transfer_date: new Date().toISOString().slice(0, 10),
    amount: '',
    from_account_id: '',
    to_account_id: '',
    from_fund_id: '',
    to_fund_id: '',
    reference_number: '',
    remarks: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fRes, aRes, tRes] = await Promise.all([
        axiosInstance.get('/finance/funds/balances'),
        axiosInstance.get('/finance/accounts/balances'),
        axiosInstance.get('/finance/transfers'),
      ]);
      setFunds(Array.isArray(fRes.data?.data) ? fRes.data.data : []);
      setAccounts(Array.isArray(aRes.data?.data) ? aRes.data.data : []);
      setTransfers(Array.isArray(tRes.data?.data) ? tRes.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load funds and accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const totals = useMemo(() => ({
    accountsBalance: accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0),
    restrictedBalance: funds.filter((f) => f.is_restricted).reduce((s, f) => s + Number(f.current_balance || 0), 0),
    unrestrictedBalance: funds.filter((f) => !f.is_restricted).reduce((s, f) => s + Number(f.current_balance || 0), 0),
    transfersCount: transfers.length,
  }), [accounts, funds, transfers]);

  const handleCreateFund = async (e) => {
    e.preventDefault();
    if (!fundForm.name.trim()) return;
    setError('');
    try {
      await axiosInstance.post('/finance/funds', {
        name: fundForm.name.trim(),
        fund_code: fundForm.fund_code.trim() || null,
        opening_balance: Number(fundForm.opening_balance || 0),
        is_restricted: Boolean(fundForm.is_restricted),
        description: fundForm.description.trim() || null,
      });
      setFundForm({ name: '', fund_code: '', opening_balance: '0', is_restricted: false, description: '' });
      setNotice('Designated fund added.');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add fund.');
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accForm.name.trim()) return;
    setError('');
    try {
      await axiosInstance.post('/finance/accounts', {
        name: accForm.name.trim(),
        account_type: accForm.account_type,
        account_number_masked: accForm.account_number_masked.trim() || null,
        opening_balance: Number(accForm.opening_balance || 0),
        description: accForm.description.trim() || null,
      });
      setAccForm({ name: '', account_type: 'bank', account_number_masked: '', opening_balance: '0', description: '' });
      setNotice('Financial account added.');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add account.');
    }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!Number(trfForm.amount)) return;
    setError('');
    try {
      await axiosInstance.post('/finance/transfers', {
        transfer_date: trfForm.transfer_date,
        amount: Number(trfForm.amount),
        from_account_id: trfForm.from_account_id ? Number(trfForm.from_account_id) : null,
        to_account_id: trfForm.to_account_id ? Number(trfForm.to_account_id) : null,
        from_fund_id: trfForm.from_fund_id ? Number(trfForm.from_fund_id) : null,
        to_fund_id: trfForm.to_fund_id ? Number(trfForm.to_fund_id) : null,
        reference_number: trfForm.reference_number.trim() || null,
        remarks: trfForm.remarks.trim() || null,
      });
      setTrfForm({
        transfer_date: new Date().toISOString().slice(0, 10),
        amount: '', from_account_id: '', to_account_id: '',
        from_fund_id: '', to_fund_id: '', reference_number: '', remarks: '',
      });
      setNotice('Internal transfer recorded. Income and expense totals remain unaffected.');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to record transfer.');
    }
  };

  const handleArchiveTransfer = async (id) => {
    try {
      await axiosInstance.post(`/finance/transfers/${id}/archive`);
      setNotice('Transfer archived.');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to archive transfer.');
    }
  };

  return (
    <div className="mcc-module mcc-module-finance-funds" style={S.page}>
      <div>
        <h1 className="workspace-page-title" style={S.title}>Funds, Accounts &amp; Internal Transfers</h1>
        <p style={S.subtitle}>
          Separate designated purpose (Funds) from where money is held (Cash, Petty Cash, Bank, GCash). Internal transfers adjust balances without inflating Income or Expenses.
        </p>
      </div>

      <FinanceNavigation />

      <div style={{ ...S.kpiGrid, gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))' }}>
        <Kpi label="Total Account Cash" value={php(totals.accountsBalance)} accent="#005599" />
        <Kpi label="Unrestricted Funds" value={php(totals.unrestrictedBalance)} accent="#003d70" />
        <Kpi label="Restricted / Designated" value={php(totals.restrictedBalance)} accent="#13b5ea" />
        <Kpi label="Recorded Transfers" value={String(totals.transfersCount)} accent="#52647a" />
      </div>

      {error && <div style={S.errorBox} role="alert">{error}</div>}
      {notice && <div style={S.noticeBox}>{notice}</div>}

      <div style={{ ...S.twoCol, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
        {/* Designated Funds */}
        <section style={S.card}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}><MonoIcon name="wallet" size={16} /> Designated Funds</h2>
            <span style={S.pill}>{funds.length}</span>
          </div>
          {canCreate && (
            <form onSubmit={handleCreateFund} style={S.inlineBox}>
              <div style={S.formRow}>
                <input value={fundForm.name} maxLength={100} onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })} placeholder="Fund name (e.g. Missions Fund)" style={S.input} required />
                <input value={fundForm.fund_code} maxLength={16} onChange={(e) => setFundForm({ ...fundForm, fund_code: sanitizeCode(e.target.value, 16) })} placeholder="Code (MISS)" style={{ ...S.input, maxWidth: 110 }} />
                <input type="number" step="0.01" min="0" value={fundForm.opening_balance} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setFundForm({ ...fundForm, opening_balance: sanitizeCurrency(e.target.value) })} placeholder="Opening" style={{ ...S.input, maxWidth: 120 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#334155' }}>
                  <input type="checkbox" checked={fundForm.is_restricted} onChange={(e) => setFundForm({ ...fundForm, is_restricted: e.target.checked })} />
                  Restricted fund
                </label>
                <button type="submit" style={S.primaryBtn}>Add Fund</button>
              </div>
            </form>
          )}
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Fund</th>
                  <th style={S.th}>Type</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={S.emptyCell}>Loading funds…</td></tr>
                ) : funds.length === 0 ? (
                  <tr><td colSpan={3} style={S.emptyCell}>No designated funds created yet.</td></tr>
                ) : funds.map((f) => (
                  <tr key={f.id} style={S.tr}>
                    <td style={S.td}><strong>{f.name}</strong>{f.fund_code ? ` (${f.fund_code})` : ''}</td>
                    <td style={S.td}><span style={f.is_restricted ? S.tagBlue : S.tagMuted}>{f.is_restricted ? 'Restricted' : 'General'}</span></td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{php(f.current_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Financial Accounts */}
        <section style={S.card}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}><MonoIcon name="bank" size={16} /> Financial Accounts</h2>
            <span style={S.pill}>{accounts.length}</span>
          </div>
          {canCreate && (
            <form onSubmit={handleCreateAccount} style={S.inlineBox}>
              <div style={S.formRow}>
                <input value={accForm.name} maxLength={100} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} placeholder="Account (e.g. BPI Main Checking)" style={S.input} required />
                <select value={accForm.account_type} onChange={(e) => setAccForm({ ...accForm, account_type: e.target.value })} style={{ ...S.input, maxWidth: 130 }}>
                  <option value="cash">Cash on Hand</option>
                  <option value="petty_cash">Petty Cash</option>
                  <option value="bank">Bank Account</option>
                  <option value="gcash">GCash / E-Wallet</option>
                  <option value="other">Other</option>
                </select>
                <input type="number" step="0.01" min="0" value={accForm.opening_balance} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setAccForm({ ...accForm, opening_balance: sanitizeCurrency(e.target.value) })} placeholder="Opening" style={{ ...S.input, maxWidth: 120 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                <input value={accForm.account_number_masked} maxLength={30} onChange={(e) => setAccForm({ ...accForm, account_number_masked: sanitizeMaskedAccount(e.target.value, 30) })} placeholder="Masked account # (optional, e.g. ****4821)" style={{ ...S.input, maxWidth: 260 }} />
                <button type="submit" style={S.primaryBtn}>Add Account</button>
              </div>
            </form>
          )}
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Account</th>
                  <th style={S.th}>Channel</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={S.emptyCell}>Loading accounts…</td></tr>
                ) : accounts.length === 0 ? (
                  <tr><td colSpan={3} style={S.emptyCell}>No financial accounts created yet.</td></tr>
                ) : accounts.map((a) => (
                  <tr key={a.id} style={S.tr}>
                    <td style={S.td}><strong>{a.name}</strong>{a.account_number_masked ? ` · ${a.account_number_masked}` : ''}</td>
                    <td style={S.td}><span style={S.tagMuted}>{a.account_type || 'cash'}</span></td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{php(a.current_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Internal Transfers */}
      <section style={S.card}>
        <div style={S.cardHead}>
          <h2 style={S.cardTitle}><MonoIcon name="transfer" size={16} /> Internal Fund &amp; Account Transfers</h2>
          <span style={S.hint}>Excluded from Church Income and Expense totals</span>
        </div>

        {canCreate && (
          <form onSubmit={handleCreateTransfer} style={S.inlineBox}>
            <div style={S.formRow}>
              <input type="date" value={trfForm.transfer_date} onChange={(e) => setTrfForm({ ...trfForm, transfer_date: e.target.value })} style={{ ...S.input, maxWidth: 150 }} />
              <input type="number" step="0.01" min="0.01" value={trfForm.amount} onKeyDown={blockInvalidDecimalKeys} onChange={(e) => setTrfForm({ ...trfForm, amount: sanitizeCurrency(e.target.value) })} placeholder="Amount (PHP)" style={{ ...S.input, maxWidth: 140 }} required />
              <select value={trfForm.from_account_id} onChange={(e) => setTrfForm({ ...trfForm, from_account_id: e.target.value })} style={S.input} aria-label="From account">
                <option value="">From Account (optional)</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={trfForm.to_account_id} onChange={(e) => setTrfForm({ ...trfForm, to_account_id: e.target.value })} style={S.input} aria-label="To account">
                <option value="">To Account (optional)</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={trfForm.from_fund_id} onChange={(e) => setTrfForm({ ...trfForm, from_fund_id: e.target.value })} style={S.input} aria-label="From fund">
                <option value="">From Fund (optional)</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select value={trfForm.to_fund_id} onChange={(e) => setTrfForm({ ...trfForm, to_fund_id: e.target.value })} style={S.input} aria-label="To fund">
                <option value="">To Fund (optional)</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input value={trfForm.remarks} onChange={(e) => setTrfForm({ ...trfForm, remarks: e.target.value })} placeholder="Reference / reason (e.g. Deposit Sunday cash to bank)" style={S.input} />
              <button type="submit" style={S.primaryBtn}>Record Transfer</button>
            </div>
          </form>
        )}

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Ref #</th>
                <th style={S.th}>Date</th>
                <th style={S.th}>From → To</th>
                <th style={S.th}>Remarks</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Amount</th>
                {canArchive && <th style={S.th}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr><td colSpan={canArchive ? 6 : 5} style={S.emptyCell}>No internal transfers recorded yet.</td></tr>
              ) : transfers.map((t) => (
                <tr key={t.id} style={S.tr}>
                  <td style={S.td}><code>{t.transaction_number || `TRF-${t.id}`}</code></td>
                  <td style={S.td}>{t.transfer_date}</td>
                  <td style={S.td}>
                    {t.fromAccount?.name || t.fromFund?.name || '—'} → {t.toAccount?.name || t.toFund?.name || '—'}
                  </td>
                  <td style={S.td}>{t.remarks || t.reference_number || '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{php(t.amount)}</td>
                  {canArchive && (
                    <td style={S.td}>
                      <IconActionButton icon="archive" label="Archive" title="Archive transfer" tone="danger" onClick={() => handleArchiveTransfer(t.id)} />
                    </td>
                  )}
                </tr>
              ))}
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
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{value}</div>
    </div>
  );
}

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: 13.5, color: '#52647a', maxWidth: 780 },
  kpiGrid: { display: 'grid', gap: 12 },
  twoCol: { display: 'grid', gap: 16, alignItems: 'start' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, minWidth: 0 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' },
  cardTitle: { margin: 0, fontSize: 15.5, fontWeight: 700, color: '#003d70', display: 'inline-flex', alignItems: 'center', gap: 8 },
  pill: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700 },
  hint: { fontSize: 12, color: '#52647a' },
  inlineBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 14 },
  formRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { flex: '1 1 140px', minWidth: 0, boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff' },
  primaryBtn: { background: '#005599', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  ghostBtn: { background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  noticeBox: { background: '#e8f4fd', border: '1px solid #bae6fd', color: '#003d70', borderRadius: 10, padding: '10px 14px', fontSize: 13.5 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 },
  th: { textAlign: 'left', padding: '9px 10px', fontSize: 11.5, fontWeight: 700, color: '#52647a', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '9px 10px', color: '#0f172a', verticalAlign: 'middle' },
  emptyCell: { padding: 20, textAlign: 'center', color: '#64748b' },
  tagBlue: { background: '#e8f4fd', color: '#005599', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 },
  tagMuted: { background: '#f1f5f9', color: '#475569', borderRadius: 999, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 },
};
