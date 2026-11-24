import { useEffect, useRef, useState } from 'react';
import MonoIcon from './MonoIcon';

/**
 * Lightweight searchable combobox for selecting from large lists (100-5000+
 * members, events, inventory items) without freezing native <select> menus.
 */
export default function SearchableSelect({
  id,
  value,
  selectedLabel = '',
  onChange,
  options = [],
  loadOptions = null,
  placeholder = 'Search and select...',
  disabled = false,
  allowClear = true,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [asyncOptions, setAsyncOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    if (!open || !loadOptions) return undefined;
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await loadOptions(query);
        if (active) setAsyncOptions(Array.isArray(res) ? res : []);
      } catch {
        if (active) setAsyncOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 220);
    return () => { active = false; clearTimeout(timer); };
  }, [open, query, loadOptions]);

  const source = loadOptions ? asyncOptions : options;
  const filtered = loadOptions
    ? source
    : source.filter((opt) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return String(opt.label || '').toLowerCase().includes(q)
          || String(opt.meta || '').toLowerCase().includes(q);
      }).slice(0, 60);

  const currentOpt = [...options, ...asyncOptions].find((opt) => String(opt.value) === String(value));
  const display = currentOpt?.label || selectedLabel || '';

  return (
    <div ref={rootRef} className="mcc-searchable-select">
      <div className="mcc-searchable-trigger-wrap">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel || placeholder}
          disabled={disabled}
          value={open ? query : display}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={(e) => { setOpen(true); setQuery(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && open && filtered.length > 0) {
              e.preventDefault();
              onChange?.(filtered[0].value, filtered[0]);
              setOpen(false);
            }
          }}
          className="mcc-searchable-input"
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            className="mcc-search-clear"
            onClick={() => { onChange?.('', null); setQuery(''); }}
          >
            <MonoIcon name="close" size={12} />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div role="listbox" className="mcc-searchable-menu">
          {loading ? (
            <div className="mcc-searchable-empty">Searching...</div>
          ) : filtered.length === 0 ? (
            <div className="mcc-searchable-empty">No matches found</div>
          ) : (
            filtered.map((opt) => {
              const selected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`mcc-searchable-option${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange?.(opt.value, opt);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="mcc-searchable-option-label">{opt.label}</span>
                  {opt.meta && <span className="mcc-searchable-option-meta">{opt.meta}</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
