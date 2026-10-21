import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import MonoIcon from '../common/MonoIcon';
import ResponsiveTable from '../common/ResponsiveTable';

const formatArchivedAt = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function SystemArchivesPanel() {
  const [records, setRecords] = useState([]);
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [restoringKey, setRestoringKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (type) params.set('type', type);
      if (search.trim()) params.set('search', search.trim());
      const response = await axiosInstance.get(`/archives/system-records?${params}`);
      const data = response.data.data;
      setRecords(data.records || []);
      setTypes(data.types || []);
      setTotal(Number(data.total || 0));
      setTotalPages(Math.max(1, Number(data.total_pages || 1)));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Archived system records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [page, search, type]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const restore = async (record) => {
    const key = `${record.entity_type}:${record.entity_id}`;
    setRestoringKey(key);
    setError('');
    setNotice('');
    try {
      const response = await axiosInstance.post(`/archives/system-records/${record.entity_type}/${record.entity_id}/restore`);
      setNotice(response.data.data?.message || 'Record restored.');
      await fetchRecords();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Record could not be restored.');
    } finally {
      setRestoringKey('');
    }
  };

  return (
    <section aria-label="Archived system records" style={{ background: 'var(--mcc-surface, #fff)', border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: 'var(--mcc-ink, #0f172a)' }}>System records</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--mcc-secondary, #52647a)', fontSize: 13 }}>{total} archived record{total === 1 ? '' : 's'} · restore to return a record to its module</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: '1 1 360px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <input
            aria-label="Search archived system records"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search archived records"
            style={controlStyle}
          />
          <select aria-label="Filter by record type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} style={controlStyle}>
            <option value="">All record types</option>
            {types.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
          </select>
        </div>
      </div>
      {error && <div role="alert" style={messageStyle('error')}>{error}</div>}
      {notice && <div role="status" style={messageStyle('success')}>{notice}</div>}
      <div style={{ overflowX: 'auto' }}>
        <ResponsiveTable style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Record type', 'Record', 'Archived', ''].map((label) => <th key={label || 'action'} scope="col" style={headStyle}>{label}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} style={emptyStyle}>Loading archived records…</td></tr>
              : records.length === 0 ? <tr><td colSpan={4} style={emptyStyle}>No archived system records found.</td></tr>
                : records.map((record) => {
                  const key = `${record.entity_type}:${record.entity_id}`;
                  return <tr key={key}>
                    <td style={cellStyle}><span style={typeBadge}>{record.entity_label}</span></td>
                    <td style={{ ...cellStyle, fontWeight: 650, color: 'var(--mcc-ink, #0f172a)' }}>{record.title || `Record #${record.entity_id}`}</td>
                    <td style={cellStyle}>{formatArchivedAt(record.archived_at)}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <button type="button" onClick={() => restore(record)} disabled={Boolean(restoringKey)} style={restoreButton}>
                        <MonoIcon name="refresh" size={14} /> {restoringKey === key ? 'Restoring…' : 'Restore'}
                      </button>
                    </td>
                  </tr>;
                })}
          </tbody>
        </ResponsiveTable>
      </div>
      {totalPages > 1 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16 }}>
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || loading} style={pageButton}>← Prev</button>
        <span style={{ fontSize: 13, color: 'var(--mcc-secondary, #52647a)' }}>Page {page} of {totalPages}</span>
        <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages || loading} style={pageButton}>Next →</button>
      </div>}
    </section>
  );
}

const controlStyle = { minWidth: 160, flex: '1 1 160px', border: '1px solid #dbe4ee', borderRadius: 8, padding: '9px 11px', background: 'var(--mcc-surface, #fff)', font: 'inherit', fontSize: 13, color: 'var(--mcc-ink, #0f172a)' };
const headStyle = { padding: '10px 12px', textAlign: 'left', color: 'var(--mcc-secondary, #52647a)', fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' };
const cellStyle = { padding: '12px', fontSize: 13, borderBottom: '1px solid #f1f5f9', color: 'var(--mcc-secondary, #52647a)' };
const emptyStyle = { padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 };
const typeBadge = { display: 'inline-block', padding: '3px 8px', borderRadius: 20, background: '#e8f4fd', color: '#0066b3', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' };
const restoreButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 0, borderRadius: 7, padding: '7px 10px', background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
const pageButton = { border: '1px solid var(--mcc-border, #e2e8f0)', borderRadius: 8, padding: '7px 12px', background: 'var(--mcc-surface, #fff)', color: 'var(--mcc-ink, #0f172a)', cursor: 'pointer' };
const messageStyle = (kind) => kind === 'error'
  ? { marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }
  : { marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#f0fdf4', color: '#166534', fontSize: 13 };
