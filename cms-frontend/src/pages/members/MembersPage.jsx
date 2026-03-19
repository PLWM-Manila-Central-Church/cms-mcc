import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

/* ── Status colours (admin view only) ─────────────────────────── */
const STATUS_COLORS = {
  New:           { bg: '#eff6ff', color: '#3b82f6' },
  Active:        { bg: '#dcfce7', color: '#16a34a' },
  'Semi-Active': { bg: '#fef9c3', color: '#ca8a04' },
  Inactive:      { bg: '#f3f4f6', color: '#6b7280' },
};

/* ── Avatar gradient pool ───────────────────────────────────────── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#005599,#13B5EA)',
  'linear-gradient(135deg,#0891b2,#06b6d4)',
  'linear-gradient(135deg,#1d4ed8,#3b82f6)',
  'linear-gradient(135deg,#0369a1,#0ea5e9)',
  'linear-gradient(135deg,#075985,#38bdf8)',
];
const avatarGradient = (name) =>
  AVATAR_GRADIENTS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_GRADIENTS.length];

/* ── Member Directory Card ──────────────────────────────────────── */
function MemberCard({ m, onView, onEdit, canEdit, isMember }) {
  const [hov, setHov] = useState(false);
  const grad = avatarGradient(m.first_name + m.last_name);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onView(m.id)}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: `1.5px solid ${hov ? '#bfdbfe' : '#e8edf2'}`,
        padding: '16px 18px',
        boxShadow: hov ? '0 4px 18px rgba(0,85,153,0.10)' : '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'all 0.18s ease',
        cursor: 'pointer',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
        background: grad, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px',
        boxShadow: '0 2px 8px rgba(0,85,153,0.18)',
      }}>
        {m.first_name[0]}{m.last_name[0]}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {m.first_name} {m.last_name}
          </div>
          {!isMember && (
            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0, background: STATUS_COLORS[m.status]?.bg, color: STATUS_COLORS[m.status]?.color }}>
              {m.status}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {m.email || ''}
        </div>
        {m.cellGroup?.name && (
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
            📍 {m.cellGroup.name}
          </div>
        )}
      </div>

      {/* Chevron / actions */}
      {isMember ? (
        <div style={{ color: '#cbd5e1', fontSize: 20, flexShrink: 0 }}>›</div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onView(m.id)} style={actionBtnSm('#e8f4fd', '#0066b3')}>View</button>
          {canEdit && <button onClick={() => onEdit(m.id)} style={actionBtnSm('#f0fdf4', '#16a34a')}>Edit</button>}
        </div>
      )}
    </div>
  );
}

/* ── Age / date helpers ──────────────────────────────────────────── */
const calcAge = (d) => {
  if (!d) return null;
  const b = new Date(d), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
};
const fmtBday = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

/* ── Admin Table Row  (masterfile / spreadsheet style) ──────────── */
function TableRow({ m, idx, rowNum, canEdit, onView, onEdit }) {
  const [hov, setHov] = useState(false);
  const sc = STATUS_COLORS[m.status] || { bg: '#f3f4f6', color: '#6b7280' };
  const fleshAge = calcAge(m.birthdate);
  const spiritAge = calcAge(m.spiritual_birthday);
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onView(m.id)}
      style={{ background: hov ? '#e8f4fd' : idx % 2 === 0 ? '#fff' : '#fafbfc', transition: 'background 0.12s', cursor: 'pointer' }}
    >
      <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontSize: 12, width: 40 }}>{rowNum}</td>
      <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
        {m.last_name}, {m.first_name}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center', width: 50 }}>
        {m.gender ? m.gender.charAt(0) : '—'}
      </td>
      <td style={{ ...tdStyle, fontSize: 13 }}>{m.cellGroup?.name || '—'}</td>
      <td style={{ ...tdStyle, fontSize: 13 }}>{m.group?.name || '—'}</td>
      <td style={tdStyle}>
        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {m.status}
        </span>
      </td>
      <td style={{ ...tdStyle, textAlign: 'center', fontSize: 13 }}>
        {fleshAge !== null ? fleshAge : '—'}
      </td>
      <td style={{ ...tdStyle, fontSize: 13, whiteSpace: 'nowrap' }}>{fmtBday(m.birthdate)}</td>
      <td style={{ ...tdStyle, textAlign: 'center', fontSize: 13 }}>
        {spiritAge !== null ? spiritAge : '—'}
      </td>
      <td style={{ ...tdStyle, fontSize: 13, whiteSpace: 'nowrap' }}>{fmtBday(m.spiritual_birthday)}</td>
      <td style={{ ...tdStyle, fontSize: 13 }}>{m.phone || '—'}</td>
      <td style={tdStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onView(m.id)} style={actionBtnSm('#e8f4fd', '#0066b3')}>View</button>
          {canEdit && <button onClick={() => onEdit(m.id)} style={actionBtnSm('#f0fdf4', '#16a34a')}>Edit</button>}
        </div>
      </td>
    </tr>
  );
}

const tdStyle = { padding: '13px 16px', fontSize: 14, color: '#374151', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const actionBtnSm = (bg, color) => ({ background: bg, color, border: 'none', borderRadius: 6, padding: '5px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' });

/* ════════════════════════════════════════════════════════════════ */
export default function MembersPage() {
  const navigate    = useNavigate();
  const { hasPermission, user } = useAuth();
  const isMobile    = useIsMobile();
  const isMember    = user?.roleName === 'Member';
  const canCreate   = hasPermission('members', 'create');
  const canEdit     = hasPermission('members', 'update');

  const [members, setMembers]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [cgFilter, setCgFilter]       = useState('');
  const [cellGroups, setCellGroups]   = useState([]);
  const [searchInput, setSearchInput] = useState('');

  const limit = isMobile ? 15 : 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search)       params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (cgFilter)     params.append('cell_group_id', cgFilter);
      const res = await axiosInstance.get(`/members?${params}`);
      const d   = res.data.data;
      setMembers(d.members); setTotal(d.total); setTotalPages(d.total_pages);
    } catch { setError('Failed to load members.'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, cgFilter, limit]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Load cell groups for filter dropdown
  useEffect(() => {
    axiosInstance.get('/cellgroups')
      .then(res => setCellGroups(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const handleKey    = (e) => { if (e.key === 'Enter') handleSearch(); };
  const clearFilters = () => { setSearchInput(''); setSearch(''); setStatus(''); setCgFilter(''); setPage(1); };

  /* ── Shared pagination ──────────────────────────────────────── */
  const Pagination = () => totalPages > 1 ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
        style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 18px', fontSize: 14, cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit', color: '#374151', opacity: page === 1 ? 0.4 : 1 }}>
        ← Prev
      </button>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Page {page} of {totalPages}</span>
      <button
        onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
        style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 18px', fontSize: 14, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit', color: '#374151', opacity: page === totalPages ? 0.4 : 1 }}>
        Next →
      </button>
    </div>
  ) : null;

  /* ── MEMBER view ─────────────────────────────────────────────── */
  if (isMember) {
    return (
      <div>
        <style>{`
          @keyframes fadeUp {
            from { opacity:0; transform:translateY(10px); }
            to   { opacity:1; transform:translateY(0); }
          }
          .dir-entry { animation: fadeUp 0.24s ease both; }
          .dir-search:focus { border-color: #005599 !important; box-shadow: 0 0 0 3px rgba(0,85,153,0.10); }
        `}</style>

        {/* Warm, friendly header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            Church Directory
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            {total} {total === 1 ? 'member' : 'members'} in your church family
          </p>
        </div>

        {/* Clean search — no separate button, inline icon feel */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#94a3b8', pointerEvents: 'none', userSelect: 'none' }}>🔍</span>
          <input
            className="dir-search"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); if (e.target.value === '') clearFilters(); }}
            onKeyDown={handleKey}
            placeholder="Search by name or email…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '11px 40px 11px 40px',
              fontSize: 15, border: '1.5px solid #e2e8f0', borderRadius: 12,
              outline: 'none', fontFamily: 'inherit', background: '#fff',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              color: '#0f172a',
            }}
          />
          {searchInput && (
            <button onClick={clearFilters}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 15, padding: 4, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>

        {error && <div className="cms-error-box">{error}</div>}

        {/* Result list */}
        {loading ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 14 }}>Loading members…</div>
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1.5px solid #e8edf2' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>No members found</div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>Try a different search term</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map((m, i) => (
              <div key={m.id} className="dir-entry" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                <MemberCard
                  m={m} canEdit={false} isMember={true}
                  onView={id => navigate(`/members/${id}`)}
                  onEdit={() => {}}
                />
              </div>
            ))}
          </div>
        )}

        <Pagination />
      </div>
    );
  }

  /* ── ADMIN / STAFF view ──────────────────────────────────────── */
  const tableCols = ['#', 'Name', 'M/F', 'Cell Group', 'Group', 'Status', 'Flesh Age', 'Flesh Birthday', 'Spirit Age', 'Spiritual Birthday', 'Mobile', 'Actions'];

  return (
    <div>
      {/* Page header */}
      <div className="cms-page-header">
        <div>
          <h1 className="cms-page-title">Members</h1>
          <p className="cms-page-sub">{total} total members</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/members/new')} className="cms-add-btn">+ Add Member</button>
        )}
      </div>

      {/* Filter bar */}
      <div className="cms-filter-bar">
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: isMobile ? '100%' : 280 }}>
          <input
            value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Search name, email, phone…"
            style={{ flex: 1, padding: '10px 14px', fontSize: 15, border: '1.5px solid #e2e8f0', borderRadius: 9, outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
            onFocus={e => e.target.style.borderColor = '#0066b3'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <button onClick={handleSearch} style={{ background: '#005599', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            Search
          </button>
        </div>

        {/* Cell group filter */}
        <select
          value={cgFilter}
          onChange={e => { setPage(1); setCgFilter(e.target.value); }}
          style={{ padding: '8px 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 9, outline: 'none', background: '#fff', fontFamily: 'inherit', color: cgFilter ? '#005599' : '#64748b', fontWeight: cgFilter ? 600 : 400, minHeight: 38 }}
        >
          <option value="">All Cell Groups</option>
          {cellGroups.map(cg => (
            <option key={cg.id} value={cg.id}>{cg.name}</option>
          ))}
        </select>

        {/* Status filter buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['', 'New', 'Active', 'Semi-Active', 'Inactive'].map(s => (
            <button key={s} onClick={() => { setPage(1); setStatus(s); }}
              style={{ border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: statusFilter === s ? '#005599' : '#f1f5f9', color: statusFilter === s ? '#fff' : '#475569', minHeight: 38 }}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {(search || statusFilter || cgFilter) && (
          <button onClick={clearFilters} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 14px', fontSize: 13, color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', minHeight: 38 }}>✕ Clear</button>
        )}
      </div>

      {error && <div className="cms-error-box">{error}</div>}

      {/* Mobile cards */}
      {isMobile ? (
        <div className="mobile-card-list">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
          ) : members.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 14 }}>No members found.</div>
          ) : members.map(m => (
            <MemberCard key={m.id} m={m} canEdit={canEdit} isMember={false}
              onView={id => navigate(`/members/${id}`)}
              onEdit={id => navigate(`/members/${id}/edit`)}
            />
          ))}
        </div>
      ) : (
        <div className="desktop-table" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {tableCols.map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={tableCols.length} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Loading…</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={tableCols.length} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No members found.</td></tr>
                ) : members.map((m, i) => (
                  <TableRow key={m.id} m={m} idx={i} rowNum={(page - 1) * limit + i + 1} canEdit={canEdit}
                    onView={id => navigate(`/members/${id}`)}
                    onEdit={id => navigate(`/members/${id}/edit`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination />
    </div>
  );
}
