import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

const STATUS_COLORS = {
  Active:   { bg: '#dcfce7', color: '#16a34a' },
  Inactive: { bg: '#f3f4f6', color: '#6b7280' },
  Visitor:  { bg: '#fef9c3', color: '#ca8a04' },
};

function MemberCard({ m, onView, onEdit, canEdit, isMember }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1.5px solid #e8edf2',
      padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#005599,#13B5EA)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 800,
      }}>
        {m.first_name[0]}{m.last_name[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', lineHeight: 1.3 }}>
            {m.last_name}, {m.first_name}
          </div>
          {/* Hide status badge for member view — it's an admin concept */}
          {!isMember && (
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0, background: STATUS_COLORS[m.status]?.bg, color: STATUS_COLORS[m.status]?.color }}>
              {m.status}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 3 }}>{m.email || '—'}</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
          {m.cellGroup?.name ? `📍 ${m.cellGroup.name}` : ''}
          {m.cellGroup?.name && m.phone ? ' · ' : ''}
          {m.phone || ''}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onView(m.id)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#e8f4fd', color: '#0066b3', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
          {canEdit && <button onClick={() => onEdit(m.id)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>}
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const navigate    = useNavigate();
  const { hasPermission, user } = useAuth();
  const isMobile    = useIsMobile();
  const isMember    = user?.roleName === 'Member';
  const canCreate   = hasPermission('members', 'create');
  const canEdit     = hasPermission('members', 'update');

  const [members, setMembers]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const limit = isMobile ? 15 : 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search)       params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await axiosInstance.get(`/members?${params}`);
      const d   = res.data.data;
      setMembers(d.members); setTotal(d.total); setTotalPages(d.total_pages);
    } catch { setError('Failed to load members.'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, limit]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const handleKey    = (e) => { if (e.key === 'Enter') handleSearch(); };
  const clearFilters = () => { setSearchInput(''); setSearch(''); setStatus(''); setPage(1); };

  // Desktop table column definitions — members see a simplified, people-focused view
  const adminCols   = ['Name', 'Email', 'Phone', 'Cell Group', 'Group', 'Status', 'Barcode', 'Actions'];
  const memberCols  = ['Name', 'Email', 'Phone', 'Cell Group', 'Group', 'Actions'];
  const tableCols   = isMember ? memberCols : adminCols;

  return (
    <div>
      {/* Page header */}
      <div className="cms-page-header">
        <div>
          {/* Members see "Church Directory" — feels like a community resource, not an admin panel */}
          <h1 className="cms-page-title">{isMember ? 'Church Directory' : 'Members'}</h1>
          <p className="cms-page-sub">{total} {isMember ? 'members in your church family' : 'total members'}</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/members/new')} className="cms-add-btn">+ Add Member</button>
        )}
      </div>

      {/* Search + filters */}
      <div className="cms-filter-bar">
        <div style={{ display:'flex', gap:8, flex:1, minWidth: isMobile ? '100%' : 280 }}>
          <input
            value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={handleKey}
            placeholder={isMember ? 'Search by name, email...' : 'Search name, email, phone...'}
            style={{ flex:1, padding:'10px 14px', fontSize:15, border:'1.5px solid #e2e8f0', borderRadius:9, outline:'none', fontFamily:'inherit', minWidth:0 }}
          />
          <button onClick={handleSearch} style={{ background:'#005599', color:'#fff', border:'none', borderRadius:9, padding:'10px 16px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
            Search
          </button>
        </div>

        {/* Status tabs are admin concepts (Inactive, Visitor) — hide them for member view */}
        {!isMember && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['','Active','Inactive','Visitor'].map(s => (
              <button key={s} onClick={() => { setPage(1); setStatus(s); }}
                style={{ border:'none', borderRadius:20, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background: statusFilter===s ? '#005599' : '#f1f5f9', color: statusFilter===s ? '#fff' : '#475569', minHeight:38 }}>
                {s || 'All'}
              </button>
            ))}
          </div>
        )}

        {(search || statusFilter) && (
          <button onClick={clearFilters} style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:9, padding:'7px 14px', fontSize:13, color:'#94a3b8', cursor:'pointer', fontFamily:'inherit', minHeight:38 }}>✕ Clear</button>
        )}
      </div>

      {error && <div className="cms-error-box">{error}</div>}

      {/* Mobile: card list */}
      {isMobile ? (
        <div className="mobile-card-list">
          {loading ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Loading...</div>
          ) : members.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8', background:'#fff', borderRadius:14 }}>No members found.</div>
          ) : members.map(m => (
            <MemberCard key={m.id} m={m} canEdit={canEdit} isMember={isMember}
              onView={id => navigate(`/members/${id}`)}
              onEdit={id => navigate(`/members/${id}/edit`)}
            />
          ))}
        </div>
      ) : (
        /* Desktop: table */
        <div className="desktop-table" style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 8px rgba(0,0,0,0.06)', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ background:'#f8fafc' }}>
                <tr>
                  {tableCols.map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={tableCols.length} style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>Loading...</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={tableCols.length} style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>No members found.</td></tr>
                ) : members.map((m, i) => (
                  <tr key={m.id} style={{ background: i%2===0 ? '#fff' : '#f8fafc', transition:'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#e8f4fd'}
                    onMouseLeave={e => e.currentTarget.style.background = i%2===0 ? '#fff' : '#f8fafc'}>
                    {/* Name */}
                    <td style={{ padding:'13px 16px', borderBottom:'1px solid #f1f5f9' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#005599,#13B5EA)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {m.first_name[0]}{m.last_name[0]}
                        </div>
                        <span style={{ fontWeight:600, color:'#0f172a', fontSize:14 }}>{m.last_name}, {m.first_name}</span>
                      </div>
                    </td>
                    {/* Email */}
                    <td style={{ padding:'13px 16px', fontSize:14, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>{m.email || '—'}</td>
                    {/* Phone */}
                    <td style={{ padding:'13px 16px', fontSize:14, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>{m.phone || '—'}</td>
                    {/* Cell Group */}
                    <td style={{ padding:'13px 16px', fontSize:14, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>{m.cellGroup?.name || '—'}</td>
                    {/* Group */}
                    <td style={{ padding:'13px 16px', fontSize:14, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>{m.group?.name || '—'}</td>
                    {/* Status — admin only */}
                    {!isMember && (
                      <td style={{ padding:'13px 16px', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ background:STATUS_COLORS[m.status]?.bg, color:STATUS_COLORS[m.status]?.color, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{m.status}</span>
                      </td>
                    )}
                    {/* Barcode — admin only */}
                    {!isMember && (
                      <td style={{ padding:'13px 16px', fontSize:12, color:'#374151', fontFamily:'monospace', borderBottom:'1px solid #f1f5f9' }}>{m.barcode}</td>
                    )}
                    {/* Actions */}
                    <td style={{ padding:'13px 16px', borderBottom:'1px solid #f1f5f9' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => navigate(`/members/${m.id}`)} style={{ background:'#e8f4fd', color:'#0066b3', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>View</button>
                        {canEdit && <button onClick={() => navigate(`/members/${m.id}/edit`)} style={{ background:'#f0fdf4', color:'#16a34a', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Edit</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="cms-pagination">
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="cms-page-btn" style={{ opacity: page===1 ? 0.35 : 1 }}>← Prev</button>
          <span style={{ fontSize:14, color:'#64748b' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="cms-page-btn" style={{ opacity: page===totalPages ? 0.35 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
