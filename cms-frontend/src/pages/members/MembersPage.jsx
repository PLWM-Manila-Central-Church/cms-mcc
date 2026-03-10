import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  Active:   { bg: '#dcfce7', color: '#16a34a' },
  Inactive: { bg: '#f3f4f6', color: '#6b7280' },
  Visitor:  { bg: '#fef9c3', color: '#ca8a04' },
};

export default function MembersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [members, setMembers]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [searchInput, setSearchInput] = useState('');

  const limit = 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search)       params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await axiosInstance.get(`/members?${params}`);
      const d   = res.data.data;
      setMembers(d.members);
      setTotal(d.total);
      setTotalPages(d.total_pages);
    } catch (err) {
      setError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleStatusFilter = (val) => {
    setPage(1);
    setStatus(val);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setPage(1);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Members</h1>
          <p style={styles.pageSubtitle}>{total} total members</p>
        </div>
        {hasPermission('members', 'create') && (
          <button onClick={() => navigate('/members/new')} style={styles.addBtn}>
            + Add Member
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.searchWrap}>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, email, phone, barcode..."
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchBtn}>Search</button>
        </div>

        <div style={styles.filterGroup}>
          {['', 'Active', 'Inactive', 'Visitor'].map(s => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              style={{
                ...styles.filterChip,
                background: statusFilter === s ? '#1e3a5f' : '#f1f5f9',
                color:      statusFilter === s ? '#fff'    : '#475569',
              }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {(search || statusFilter) && (
          <button onClick={clearFilters} style={styles.clearBtn}>✕ Clear</button>
        )}
      </div>

      {/* Error */}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Cell Group</th>
              <th style={styles.th}>Group</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Barcode</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={styles.centerCell}>Loading...</td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={8} style={styles.centerCell}>No members found.</td>
              </tr>
            ) : members.map((m, i) => (
              <tr
                key={m.id}
                style={{ ...styles.row, background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}
              >
                <td style={styles.td}>
                  <div style={styles.nameCell}>
                    <div style={styles.avatar}>
                      {m.first_name[0]}{m.last_name[0]}
                    </div>
                    <span style={styles.fullName}>
                      {m.last_name}, {m.first_name}
                    </span>
                  </div>
                </td>
                <td style={styles.td}>{m.email || '—'}</td>
                <td style={styles.td}>{m.phone || '—'}</td>
                <td style={styles.td}>{m.CellGroup?.name || '—'}</td>
                <td style={styles.td}>{m.Group?.name || '—'}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    background: STATUS_COLORS[m.status]?.bg,
                    color:      STATUS_COLORS[m.status]?.color,
                  }}>
                    {m.status}
                  </span>
                </td>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px' }}>
                  {m.barcode}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      onClick={() => navigate(`/members/${m.id}`)}
                      style={styles.viewBtn}
                    >
                      View
                    </button>
                    {hasPermission('members', 'update') && (
                      <button
                        onClick={() => navigate(`/members/${m.id}/edit`)}
                        style={styles.editBtn}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...styles.pageBtn, opacity: page === 1 ? 0.4 : 1 }}
          >
            ← Prev
          </button>
          <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...styles.pageBtn, opacity: page === totalPages ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '24px'
  },
  pageTitle:    { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 },
  pageSubtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  addBtn: {
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    color: '#fff', border: 'none', borderRadius: '8px',
    padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
  },
  filterBar: {
    display: 'flex', gap: '12px', alignItems: 'center',
    marginBottom: '20px', flexWrap: 'wrap'
  },
  searchWrap:  { display: 'flex', gap: '8px', flex: 1, minWidth: '280px' },
  searchInput: {
    flex: 1, padding: '10px 14px', fontSize: '14px',
    border: '1.5px solid #e2e8f0', borderRadius: '8px', outline: 'none'
  },
  searchBtn: {
    background: '#1e3a5f', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '10px 16px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer'
  },
  filterGroup: { display: 'flex', gap: '6px' },
  filterChip: {
    border: 'none', borderRadius: '20px', padding: '6px 14px',
    fontSize: '13px', fontWeight: '500', cursor: 'pointer'
  },
  clearBtn: {
    background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
    padding: '6px 12px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer'
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
    borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px'
  },
  tableWrap: {
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden'
  },
  table:      { width: '100%', borderCollapse: 'collapse' },
  thead:      { background: '#f8fafc' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
    fontWeight: '600', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0'
  },
  row:        { transition: 'background 0.15s' },
  td:         { padding: '14px 16px', fontSize: '14px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  centerCell: { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  nameCell:   { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '34px', height: '34px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700', flexShrink: 0
  },
  fullName:   { fontWeight: '600', color: '#0f172a' },
  badge: {
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '600'
  },
  actions:    { display: 'flex', gap: '6px' },
  viewBtn: {
    background: '#eff6ff', color: '#2563eb', border: 'none',
    borderRadius: '6px', padding: '5px 12px', fontSize: '12px',
    fontWeight: '600', cursor: 'pointer'
  },
  editBtn: {
    background: '#f0fdf4', color: '#16a34a', border: 'none',
    borderRadius: '6px', padding: '5px 12px', fontSize: '12px',
    fontWeight: '600', cursor: 'pointer'
  },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '16px', marginTop: '24px'
  },
  pageBtn: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
    padding: '8px 16px', fontSize: '14px', cursor: 'pointer', fontWeight: '500'
  },
  pageInfo: { fontSize: '14px', color: '#64748b' }
};