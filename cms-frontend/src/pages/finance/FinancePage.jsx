import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

const PAYMENT_LABELS = { cash:'Cash', gcash:'GCash', bank_transfer:'Bank Transfer' };
const PAYMENT_STYLE  = { cash:{bg:'#f0fdf4',color:'#16a34a'}, gcash:{bg:'#faf5ff',color:'#7c3aed'}, bank_transfer:{bg:'#e8f4fd',color:'#0066b3'} };

function FinanceCard({ r, canRecord, onEdit, onDelete, formatAmount, formatDate }) {
  const pmStyle = PAYMENT_STYLE[r.payment_method] || PAYMENT_STYLE.cash;
  return (
    <div style={{ background:'#fff', borderRadius:14, border:'1.5px solid #e8edf2', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>{r.Member?.last_name}, {r.Member?.first_name}</div>
          <div style={{ fontSize:13, color:'#94a3b8', marginTop:2 }}>{r.category?.name || '—'} · {formatDate(r.transaction_date)}</div>
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:'#059669' }}>{formatAmount(r.amount)}</div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ background:pmStyle.bg, color:pmStyle.color, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
          {PAYMENT_LABELS[r.payment_method]}
        </span>
        {canRecord && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => onEdit(r)} style={{ background:'#e8f4fd', color:'#0066b3', border:'none', borderRadius:7, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
            <button onClick={() => onDelete(r.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:7, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Del</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const { hasPermission, user } = useAuth();
  const navigate    = useNavigate();
  const isMobile    = useIsMobile();

  useEffect(() => {
    if (user?.roleName === 'Member') navigate('/finance/my-giving', { replace: true });
  }, [user, navigate]);
  const canRecord = hasPermission('finance', 'create');

  const [records, setRecords]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [categories, setCategories] = useState([]);
  const [summary, setSummary]       = useState([]);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment]   = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');

  const [showForm, setShowForm]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState({ member_id:'', member_label:'', category_id:'', amount:'', payment_method:'cash', transaction_date:new Date().toISOString().slice(0,10), receipt_number:'', notes:'' });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const [memberSearch, setMemberSearch]   = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [searchingMember, setSearchingMember] = useState(false);
  // eslint-disable-next-line no-unused-vars
  let memberSearchTimeout = null;

  const limit = 20;

  const fetchCategories = async () => { try { const res = await axiosInstance.get('/finance/categories'); setCategories(res.data.data); } catch {} };
  const fetchSummary = useCallback(async () => {
    try { const params = new URLSearchParams(); if(filterDateFrom) params.append('date_from',filterDateFrom); if(filterDateTo) params.append('date_to',filterDateTo); const res = await axiosInstance.get(`/finance/summary?${params}`); setSummary(res.data.data); } catch {}
  }, [filterDateFrom, filterDateTo]);
  const fetchRecords = useCallback(async () => {
    setLoading(true); setError('');
    try { const params = new URLSearchParams({page,limit}); if(filterCategory) params.append('category_id',filterCategory); if(filterPayment) params.append('payment_method',filterPayment); if(filterDateFrom) params.append('date_from',filterDateFrom); if(filterDateTo) params.append('date_to',filterDateTo); const res = await axiosInstance.get(`/finance?${params}`); const d=res.data.data; setRecords(d.records); setTotal(d.total); setTotalPages(d.total_pages); }
    catch { setError('Failed to load records.'); } finally { setLoading(false); }
  }, [page, filterCategory, filterPayment, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchRecords(); fetchSummary(); }, [fetchRecords, fetchSummary]);

  const handleMemberSearch = (val) => { setMemberSearch(val); setForm(f=>({...f,member_id:'',member_label:''})); clearTimeout(memberSearchTimeout); if(!val.trim()){setMemberResults([]);return;} memberSearchTimeout=setTimeout(async()=>{ setSearchingMember(true); try{ const res=await axiosInstance.get(`/members?search=${encodeURIComponent(val)}&limit=6`); setMemberResults(res.data.data.members||[]); }catch{} finally{setSearchingMember(false);} },300); };
  const selectMember  = (m) => { setForm(f=>({...f,member_id:m.id,member_label:`${m.last_name}, ${m.first_name}`})); setMemberSearch(`${m.last_name}, ${m.first_name}`); setMemberResults([]); };
  const resetForm     = () => { setForm({member_id:'',member_label:'',category_id:'',amount:'',payment_method:'cash',transaction_date:new Date().toISOString().slice(0,10),receipt_number:'',notes:''}); setMemberSearch(''); setMemberResults([]); setEditRecord(null); setFormError(''); };
  const openEdit      = (r) => { setEditRecord(r); setForm({member_id:r.member_id,member_label:`${r.Member?.last_name}, ${r.Member?.first_name}`,category_id:r.category_id,amount:r.amount,payment_method:r.payment_method,transaction_date:r.transaction_date,receipt_number:r.receipt_number||'',notes:r.notes||''}); setMemberSearch(`${r.Member?.last_name}, ${r.Member?.first_name}`); setShowForm(true); window.scrollTo({top:0,behavior:'smooth'}); };

  const handleSubmit = async (e) => { e.preventDefault(); if(!form.member_id){setFormError('Please select a member.');return;} setSaving(true); setFormError(''); try{ const payload={member_id:form.member_id,category_id:form.category_id,amount:parseFloat(form.amount),payment_method:form.payment_method,transaction_date:form.transaction_date,receipt_number:form.receipt_number||null,notes:form.notes||null}; if(editRecord){await axiosInstance.put(`/finance/${editRecord.id}`,payload);}else{await axiosInstance.post('/finance',payload);} setShowForm(false); resetForm(); fetchRecords(); fetchSummary(); }catch(err){setFormError(err.response?.data?.message||'Failed to save record.');} finally{setSaving(false);} };
  const handleDelete  = async (id) => { if(!window.confirm('Delete this financial record?'))return; try{await axiosInstance.delete(`/finance/${id}`);fetchRecords();fetchSummary();}catch(err){setError(err.response?.data?.message||'Failed to delete record.');} };

  const formatDate   = (d) => d ? new Date(d+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}) : '—';
  const formatAmount = (a) => parseFloat(a).toLocaleString('en-PH',{style:'currency',currency:'PHP'});
  const totalAmount  = summary.reduce((sum,s) => sum+parseFloat(s.total_amount||0), 0);

  const F = { /* common form field styles */
    label: { fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:5 },
    input: { padding:'11px 12px', fontSize:15, border:'1.5px solid #d1d5db', borderRadius:9, outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'inherit' },
    select:{ padding:'11px 12px', fontSize:15, border:'1.5px solid #d1d5db', borderRadius:9, outline:'none', background:'#fff', width:'100%', fontFamily:'inherit' },
  };

  return (
    <div>
      <div className="cms-page-header">
        <div>
          <h1 className="cms-page-title">Finance</h1>
          <p className="cms-page-sub">{total} total records</p>
        </div>
        {canRecord && (
          <button onClick={() => { setShowForm(!showForm); if(showForm) resetForm(); }} className="cms-add-btn">
            {showForm ? '✕ Cancel' : '+ Add Record'}
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', flex:1, minWidth: isMobile ? '100%' : 140 }}>
          <div style={{ fontSize:isMobile?18:22, fontWeight:800, color:'#0f172a' }}>{formatAmount(totalAmount)}</div>
          <div style={{ fontSize:13, color:'#64748b', marginTop:3, fontWeight:500 }}>Total Collected</div>
        </div>
        {summary.map(row => (
          <div key={row.category_id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', flex:1, minWidth: isMobile ? 'calc(50% - 6px)' : 140 }}>
            <div style={{ fontSize:isMobile?16:20, fontWeight:800, color:'#0f172a' }}>{formatAmount(parseFloat(row.total_amount||0))}</div>
            <div style={{ fontSize:13, color:'#64748b', marginTop:3, fontWeight:500 }}>{row.category?.name||'—'}</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{row.count} records</div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding: isMobile?16:24, marginBottom:20, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:'0 0 18px' }}>{editRecord ? 'Edit Record' : 'Add Financial Record'}</h3>
          {formError && <div className="cms-error-box">{formError}</div>}
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={F.label}>Member *</label>
              <div style={{ position:'relative' }}>
                <input value={memberSearch} onChange={e=>handleMemberSearch(e.target.value)} placeholder="Search member by name..." style={F.input} autoComplete="off" />
                {memberResults.length>0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:9, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:100, overflow:'hidden', marginTop:4 }}>
                    {memberResults.map(m=>(
                      <div key={m.id} onClick={()=>selectMember(m)} style={{ padding:'11px 14px', cursor:'pointer', fontSize:14, borderBottom:'1px solid #f1f5f9' }}>
                        <strong>{m.last_name}, {m.first_name}</strong>
                        {m.barcode && <span style={{ color:'#94a3b8', marginLeft:8, fontSize:12 }}>#{m.barcode}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {searchingMember && <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Searching...</div>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:14 }}>
              <div>
                <label style={F.label}>Category *</label>
                <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))} required style={F.select}>
                  <option value="">— Select —</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={F.label}>Amount (PHP) *</label>
                <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" required style={F.input} />
              </div>
              <div>
                <label style={F.label}>Payment Method *</label>
                <select value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))} style={F.select}>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash / E-wallet</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label style={F.label}>Transaction Date *</label>
                <input type="date" value={form.transaction_date} onChange={e=>setForm(f=>({...f,transaction_date:e.target.value}))} required style={F.input} />
              </div>
            </div>
            <div>
              <label style={F.label}>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Optional notes..." style={{...F.input,resize:'vertical'}} />
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <button type="button" onClick={()=>{setShowForm(false);resetForm();}} style={{ background:'#f1f5f9', color:'#475569', border:'none', borderRadius:9, padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background:'linear-gradient(135deg,#005599,#13B5EA)', color:'#fff', border:'none', borderRadius:9, padding:'11px 26px', fontSize:14, fontWeight:600, cursor:'pointer', opacity:saving?0.7:1, fontFamily:'inherit' }}>
                {saving ? 'Saving...' : editRecord ? 'Update Record' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <select value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);setPage(1);}} style={{ padding:'9px 12px', fontSize:14, border:'1.5px solid #e2e8f0', borderRadius:9, background:'#fff', outline:'none', fontFamily:'inherit' }}>
          <option value="">All Categories</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterPayment} onChange={e=>{setFilterPayment(e.target.value);setPage(1);}} style={{ padding:'9px 12px', fontSize:14, border:'1.5px solid #e2e8f0', borderRadius:9, background:'#fff', outline:'none', fontFamily:'inherit' }}>
          <option value="">All Methods</option>
          <option value="cash">Cash</option>
          <option value="gcash">GCash</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
        {!isMobile && <>
          <input type="date" value={filterDateFrom} onChange={e=>{setFilterDateFrom(e.target.value);setPage(1);}} style={{ padding:'9px 12px', fontSize:14, border:'1.5px solid #e2e8f0', borderRadius:9, outline:'none', fontFamily:'inherit' }} />
          <input type="date" value={filterDateTo}   onChange={e=>{setFilterDateTo(e.target.value);setPage(1);}}   style={{ padding:'9px 12px', fontSize:14, border:'1.5px solid #e2e8f0', borderRadius:9, outline:'none', fontFamily:'inherit' }} />
        </>}
        {(filterCategory||filterPayment||filterDateFrom||filterDateTo) && (
          <button onClick={()=>{setFilterCategory('');setFilterPayment('');setFilterDateFrom('');setFilterDateTo('');setPage(1);}} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:9, padding:'9px 14px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✕ Clear</button>
        )}
      </div>

      {error && <div className="cms-error-box">{error}</div>}

      {/* Mobile: card list */}
      {isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {loading ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Loading...</div>
          ) : records.length===0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8', background:'#fff', borderRadius:14 }}>No records found.</div>
          ) : records.map(r => (
            <FinanceCard key={r.id} r={r} canRecord={canRecord} onEdit={openEdit} onDelete={handleDelete} formatAmount={formatAmount} formatDate={formatDate} />
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ background:'#f8fafc' }}>
                <tr>
                  {['Member','Category','Amount','Method','Date','Receipt','Recorded By', ...(canRecord?['Actions']:[])].map(h=>(
                    <th key={h} style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:'#64748b', textAlign:'left', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={canRecord?8:7} style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>Loading...</td></tr>
                ) : records.length===0 ? (
                  <tr><td colSpan={canRecord?8:7} style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>No records found.</td></tr>
                ) : records.map((r,i) => {
                  const pmStyle = PAYMENT_STYLE[r.payment_method]||PAYMENT_STYLE.cash;
                  return (
                    <tr key={r.id} style={{ background:i%2===0?'#fff':'#f8fafc', transition:'background 0.12s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#e8f4fd'}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#f8fafc'}>
                      <td style={{ padding:'13px 16px', fontSize:14, borderBottom:'1px solid #f1f5f9' }}><div style={{ fontWeight:600, color:'#0f172a' }}>{r.Member?.last_name}, {r.Member?.first_name}</div></td>
                      <td style={{ padding:'13px 16px', fontSize:14, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>{r.category?.name}</td>
                      <td style={{ padding:'13px 16px', fontSize:14, fontWeight:700, color:'#0f172a', borderBottom:'1px solid #f1f5f9' }}>{formatAmount(r.amount)}</td>
                      <td style={{ padding:'13px 16px', borderBottom:'1px solid #f1f5f9' }}><span style={{ background:pmStyle.bg, color:pmStyle.color, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>{PAYMENT_LABELS[r.payment_method]}</span></td>
                      <td style={{ padding:'13px 16px', fontSize:14, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>{formatDate(r.transaction_date)}</td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:'#64748b', fontFamily:'monospace', borderBottom:'1px solid #f1f5f9' }}>{r.receipt_number||'—'}</td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:'#64748b', borderBottom:'1px solid #f1f5f9' }}>{r.recorder?.email||'—'}</td>
                      {canRecord && (
                        <td style={{ padding:'13px 16px', borderBottom:'1px solid #f1f5f9' }}>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={()=>openEdit(r)} style={{ background:'#e8f4fd', color:'#0066b3', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
                            <button onClick={()=>handleDelete(r.id)} style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages>1 && (
        <div className="cms-pagination">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="cms-page-btn" style={{opacity:page===1?0.35:1}}>← Prev</button>
          <span style={{fontSize:14,color:'#64748b'}}>Page {page} of {totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="cms-page-btn" style={{opacity:page===totalPages?0.35:1}}>Next →</button>
        </div>
      )}
    </div>
  );
}
