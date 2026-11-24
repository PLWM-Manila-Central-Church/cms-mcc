import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { displayMemberName } from '../../utils/displayIdentity';

export default function SearchableMemberPicker({
  members = [],
  searchMembers,
  excludeIds = [],
  value = '',
  onChange,
  placeholder = 'Search members…',
  ariaLabel = 'Search members',
  disabled = false,
  maxResults = 8,
  style = {},
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const requestRef = useRef(0);
  const editingSearchRef = useRef(false);
  const excluded = useMemo(() => new Set(excludeIds.map(Number)), [excludeIds]);
  const [query, setQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteMembers, setRemoteMembers] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const selected = members.find((member) => Number(member.id) === Number(value));
    if (!value) {
      if (editingSearchRef.current) {
        editingSearchRef.current = false;
      } else {
        setSelectedMember(null);
        setQuery('');
      }
      return;
    }
    if (selected) {
      setSelectedMember(selected);
      setQuery(displayMemberName(selected));
    } else if (Number(selectedMember?.id) !== Number(value)) {
      setQuery('');
    }
  }, [members, selectedMember?.id, value]);

  useEffect(() => {
    const closeOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  useEffect(() => {
    if (!searchMembers || !open || !query.trim()) {
      setRemoteMembers([]);
      setSearching(false);
      return undefined;
    }
    const requestId = ++requestRef.current;
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchMembers(query.trim());
        if (active && requestRef.current === requestId) setRemoteMembers(Array.isArray(results) ? results : []);
      } catch {
        if (active && requestRef.current === requestId) setRemoteMembers([]);
      } finally {
        if (active && requestRef.current === requestId) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, searchMembers]);

  const available = searchMembers ? remoteMembers : members;
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return available
      .filter((member) => !excluded.has(Number(member.id)))
      .filter((member) => {
        if (!needle) return true;
        const haystack = [displayMemberName(member), member.email, member.phone, member.barcode]
          .filter(Boolean).join(' ').toLocaleLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, maxResults);
  }, [available, excluded, maxResults, query]);

  const choose = (member) => {
    setSelectedMember(member);
    setQuery(displayMemberName(member));
    onChange?.(String(member.id));
    setOpen(false);
    setActiveIndex(0);
  };

  const clear = () => {
    setSelectedMember(null);
    setQuery('');
    onChange?.('');
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery(value ? displayMemberName(selectedMember || {}) : '');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' && open && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  };

  const selectedId = value ? `member-option-${listId}-${value}` : undefined;
  return (
    <div ref={rootRef} style={{ position: 'relative', minWidth: 0, ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && results[activeIndex] ? `member-option-${listId}-${results[activeIndex].id}` : undefined}
          aria-busy={searching}
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            setActiveIndex(0);
            if (value) {
              editingSearchRef.current = true;
              onChange?.('');
            }
          }}
          onKeyDown={onKeyDown}
          style={{
            width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 40,
            padding: '9px 38px 9px 11px', border: '1px solid #cbd5e1', borderRadius: 8,
            background: 'var(--mcc-surface, #fff)', color: 'var(--mcc-ink, #0f172a)',
            font: 'inherit', fontSize: 14, outlineOffset: 2,
          }}
        />
        {value && !disabled && (
          <button
            type="button"
            aria-label={`Clear ${ariaLabel.toLowerCase()}`}
            onClick={clear}
            style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: '#52647a', cursor: 'pointer', minWidth: 28, minHeight: 28, borderRadius: 6 }}
          >×</button>
        )}
      </div>
      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          aria-label={`${ariaLabel} results`}
          style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: 240, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 8, background: 'var(--mcc-surface, #fff)', boxShadow: '0 8px 20px #0f172a1a' }}
        >
          {searching ? <div role="status" style={{ padding: '10px 12px', color: '#52647a', fontSize: 13 }}>Searching…</div>
            : results.length ? results.map((member, index) => (
              <div
                id={`member-option-${listId}-${member.id}`}
                key={member.id}
                role="option"
                aria-selected={Number(value) === Number(member.id) || activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(member)}
                style={{ padding: '9px 11px', borderBottom: index < results.length - 1 ? '1px solid #f1f5f9' : 0, background: activeIndex === index ? '#eff6ff' : 'var(--mcc-surface, #fff)', color: 'var(--mcc-ink, #0f172a)', cursor: 'pointer', fontSize: 13.5 }}
              >
                <strong>{displayMemberName(member)}</strong>
                {(member.group?.name || member.cellGroup?.name || member.email) && <span style={{ display: 'block', marginTop: 2, color: '#64748b', fontSize: 11.5 }}>{[member.group?.name, member.cellGroup?.name, member.email].filter(Boolean).join(' · ')}</span>}
              </div>
            ))
              : query.trim() ? <div role="status" style={{ padding: '10px 12px', color: '#64748b', fontSize: 13 }}>{searchMembers ? 'No members found. Check the name and try again.' : 'No members match that search.'}</div>
                : <div role="status" style={{ padding: '10px 12px', color: '#64748b', fontSize: 13 }}>Type a name to search.</div>}
        </div>
      )}
    </div>
  );
}
