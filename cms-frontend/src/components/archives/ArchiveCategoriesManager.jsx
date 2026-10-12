import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import useIsMobile from '../../hooks/useIsMobile';

const RESERVED_FINANCE_CATEGORY = 'Financial Records';

export default function ArchiveCategoriesManager({ categories = [], canManage, canDelete, onChanged }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const nameRef = useRef(null);
  const cancelDeleteRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open && !editing) nameRef.current?.focus();
  }, [open, editing]);

  useEffect(() => {
    if (categoryToDelete) cancelDeleteRef.current?.focus();
  }, [categoryToDelete]);

  useEffect(() => {
    if (!open || categoryToDelete) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || busy) return;
      setOpen(false);
      setEditing(null);
      setForm({ name: '', description: '' });
      setError('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, categoryToDelete, busy]);

  useEffect(() => {
    if (!categoryToDelete) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) setCategoryToDelete(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [categoryToDelete, busy]);

  if (!canManage) return null;

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setError('');
  };

  const closeManager = () => {
    if (busy) return;
    setOpen(false);
    setCategoryToDelete(null);
    resetForm();
  };

  const startEdit = (category) => {
    setEditing(category);
    setForm({ name: category.name || '', description: category.description || '' });
    setError('');
    setNotice('');
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    const name = String(form.name || '').trim();
    if (!name) {
      setError('Enter a category name.');
      return;
    }
    if (name.length > 100) {
      setError('Category names must be 100 characters or fewer.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = { name, description: String(form.description || '').trim() || null };
      if (editing) await axiosInstance.put(`/archives/categories/${editing.id}`, payload);
      else await axiosInstance.post('/archives/categories', payload);
      await onChanged?.();
      setNotice(editing ? 'Category updated.' : 'Category created.');
      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Category could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await axiosInstance.delete(`/archives/categories/${categoryToDelete.id}`);
      setCategoryToDelete(null);
      setNotice('Category deleted.');
      await onChanged?.();
      if (editing?.id === categoryToDelete.id) resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Category could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit', color: '#0f172a', background: '#fff' };
  const secondaryButton = { minHeight: 36, padding: '7px 11px', border: '1px solid #dbe4ee', borderRadius: 8, background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setNotice(''); setError(''); }}
        style={{ ...secondaryButton, whiteSpace: 'nowrap' }}
      >
        Manage categories
      </button>

      {open && (
        <div
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && closeManager()}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.48)' }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="archive-category-manager-title" style={{ width: 'min(100%,760px)', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', borderRadius: 16, background: '#fff', padding: 22, boxShadow: '0 24px 70px rgba(15,23,42,0.28)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div>
                <h2 id="archive-category-manager-title" style={{ margin: 0, fontSize: 21, color: '#0f172a' }}>Archive categories</h2>
                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>Manage categories used by archive records.</p>
              </div>
              <button type="button" onClick={closeManager} disabled={busy} aria-label="Close category manager" style={{ ...secondaryButton, minWidth: 38, padding: '6px 10px', fontSize: 18 }}>×</button>
            </div>

            {error && !categoryToDelete && <div role="alert" style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
            {notice && <div role="status" style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: '#f0fdf4', color: '#166534' }}>{notice}</div>}

            <form onSubmit={saveCategory} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(180px,1fr) minmax(220px,2fr) auto', minWidth: 0, alignItems: 'end', gap: 10, marginBottom: 18, padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
              <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                Category name
                <input
                  ref={nameRef}
                  required
                  maxLength={100}
                  value={form.name}
                  readOnly={editing?.name === RESERVED_FINANCE_CATEGORY}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  style={{ ...inputStyle, background: editing?.name === RESERVED_FINANCE_CATEGORY ? '#f1f5f9' : '#fff' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                Description
                <input
                  maxLength={1000}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  style={inputStyle}
                />
              </label>
              <div style={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 7 }}>
                {editing && <button type="button" disabled={busy} onClick={resetForm} style={secondaryButton}>Cancel edit</button>}
                <button type="submit" disabled={busy} style={{ ...secondaryButton, border: 0, background: '#075985', color: '#fff' }}>{busy ? 'Saving…' : editing ? 'Save' : 'Add'}</button>
              </div>
            </form>

            <div style={{ display: 'grid', gap: 8 }}>
              {categories.length === 0 ? (
                <p style={{ margin: 0, padding: 18, textAlign: 'center', color: '#64748b' }}>No categories yet. Add one above.</p>
              ) : categories.map((category) => {
                const reserved = category.name === RESERVED_FINANCE_CATEGORY;
                return (
                  <div key={category.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 12px', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>{category.name}{reserved && <span style={{ marginLeft: 8, color: '#64748b', fontWeight: 500, fontSize: 12 }}>Required by Finance</span>}</div>
                      {category.description && <div style={{ marginTop: 3, color: '#64748b', fontSize: 13, whiteSpace: 'pre-wrap' }}>{category.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                      <button type="button" disabled={busy} onClick={() => startEdit(category)} style={secondaryButton}>Edit</button>
                      {canDelete && !reserved && <button type="button" disabled={busy} onClick={() => { setError(''); setCategoryToDelete(category); }} style={{ ...secondaryButton, color: '#b91c1c' }}>Delete</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {categoryToDelete && (
        <div
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && !busy && setCategoryToDelete(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.52)' }}
        >
          <section role="alertdialog" aria-modal="true" aria-labelledby="archive-category-delete-title" aria-describedby="archive-category-delete-description" style={{ width: 'min(100%,430px)', background: '#fff', borderRadius: 14, padding: 22 }}>
            <h2 id="archive-category-delete-title" style={{ margin: '0 0 10px', fontSize: 19 }}>Delete archive category?</h2>
            <p id="archive-category-delete-description" style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
              {categoryToDelete.name}. Categories that have records cannot be deleted.
            </p>
            {error && <div role="alert" style={{ marginTop: 12, color: '#b91c1c', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button ref={cancelDeleteRef} type="button" disabled={busy} onClick={() => setCategoryToDelete(null)} style={secondaryButton}>Keep category</button>
              <button type="button" disabled={busy} onClick={deleteCategory} style={{ ...secondaryButton, border: 0, background: '#b91c1c', color: '#fff' }}>{busy ? 'Deleting…' : 'Delete category'}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
