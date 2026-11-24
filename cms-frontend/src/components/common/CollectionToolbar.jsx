import { useEffect, useState } from 'react';
import MonoIcon from './MonoIcon';

/**
 * Calm, minimal single-row toolbar + optional status/category pill bar for
 * high-volume tables (100-500+ records). Keeps filtering predictable and
 * visually quiet across every module.
 */
export default function CollectionToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  debounceMs = 300,
  filters = [],
  tabs = [],
  activeTab = '',
  onTabChange,
  actions = null,
  summary = null,
}) {
  const [localSearch, setLocalSearch] = useState(searchValue ?? '');

  useEffect(() => {
    setLocalSearch(searchValue ?? '');
  }, [searchValue]);

  useEffect(() => {
    if (!onSearchChange) return undefined;
    if (localSearch === (searchValue ?? '')) return undefined;
    const id = setTimeout(() => onSearchChange(localSearch), debounceMs);
    return () => clearTimeout(id);
  }, [localSearch, debounceMs, onSearchChange, searchValue]);

  return (
    <div className="mcc-collection-toolbar">
      {(onSearchChange || filters.length > 0 || actions) && (
        <div className="mcc-toolbar-row">
          {onSearchChange && (
            <div className="mcc-search-wrap">
              <MonoIcon name="search" size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="mcc-search-input"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => { setLocalSearch(''); onSearchChange(''); }}
                  aria-label="Clear search"
                  className="mcc-search-clear"
                >
                  <MonoIcon name="close" size={12} />
                </button>
              )}
            </div>
          )}

          {filters.map((f, idx) => (
            <select
              key={f.key || f.label || idx}
              aria-label={f.label}
              value={f.value ?? ''}
              onChange={(e) => f.onChange?.(e.target.value)}
              className="mcc-filter-select"
              style={f.minWidth ? { minWidth: f.minWidth } : undefined}
            >
              {(f.options || []).map((opt) => (
                <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}

          {actions && <div className="mcc-toolbar-actions">{actions}</div>}
        </div>
      )}

      {(tabs.length > 0 || summary) && (
        <div className="mcc-toolbar-pills-row">
          {tabs.length > 0 && (
            <div className="mcc-pill-tabs" role="tablist">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onTabChange?.(tab.key)}
                    className={`mcc-pill-tab${active ? ' is-active' : ''}`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count !== null && (
                      <span className="mcc-pill-count">{tab.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {summary && <div className="mcc-toolbar-summary">{summary}</div>}
        </div>
      )}
    </div>
  );
}
