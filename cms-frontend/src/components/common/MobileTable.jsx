/**
 * MobileTable
 *
 * Renders a standard <table> on desktop (≥768px) and a stacked
 * card list on mobile (<768px) — without duplicating markup.
 *
 * Usage:
 *
 *   <MobileTable
 *     columns={[
 *       { key: 'name',   label: 'Name' },
 *       { key: 'status', label: 'Status', render: (v) => <Badge>{v}</Badge> },
 *       { key: 'date',   label: 'Date', hideOnCard: true },
 *     ]}
 *     rows={members}          // array of objects
 *     rowKey="id"             // unique key field (default: "id")
 *     onRowClick={(row) => navigate(`/members/${row.id}`)}
 *     emptyText="No members found."
 *     loading={isLoading}
 *   />
 *
 * Column options:
 *   key         — field name in the row object
 *   label       — column header text
 *   render      — optional fn(value, row) => ReactNode
 *   hideOnCard  — hide this column in the mobile card view
 *   primary     — highlight this field as the card title (bold, larger)
 *   secondary   — show as the subtitle line under the primary
 */

import { useState, useEffect } from 'react';

const MOBILE_BP = 768;

function useIsMobile() {
  const [mobile, setMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BP : false
  );
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

export default function MobileTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  onRowClick,
  emptyText = 'No records found.',
  loading = false,
}) {
  const isMobile = useIsMobile();

  const primaryCol   = columns.find(c => c.primary)   || columns[0];
  const secondaryCol = columns.find(c => c.secondary);
  const cardCols     = columns.filter(c => !c.primary && !c.secondary && !c.hideOnCard);

  const getCellValue = (col, row) => {
    const raw = row[col.key];
    return col.render ? col.render(raw, row) : (raw ?? '—');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
        {emptyText}
      </div>
    );
  }

  /* ── DESKTOP TABLE ───────────────────────────────────────── */
  if (!isMobile) {
    return (
      <div className="table-scroll">
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontSize: 14, background: '#fff',
        }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: '11px 16px', textAlign: 'left',
                  fontWeight: 600, color: '#475569', fontSize: 12,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row[rowKey] ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: '12px 16px', color: '#1e293b',
                    fontSize: 14, verticalAlign: 'middle',
                  }}>
                    {getCellValue(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ── MOBILE CARD LIST ────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row, i) => (
        <div
          key={row[rowKey] ?? i}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 16px',
            cursor: onRowClick ? 'pointer' : 'default',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            position: 'relative',
          }}
        >
          {/* Primary — card title */}
          {primaryCol && (
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', lineHeight: 1.3 }}>
              {getCellValue(primaryCol, row)}
            </div>
          )}

          {/* Secondary — subtitle */}
          {secondaryCol && (
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {getCellValue(secondaryCol, row)}
            </div>
          )}

          {/* Remaining columns as label: value pairs */}
          {cardCols.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: cardCols.length === 1 ? '1fr' : '1fr 1fr',
              gap: '6px 12px',
              marginTop: 2,
              paddingTop: 8,
              borderTop: '1px solid #f1f5f9',
            }}>
              {cardCols.map(col => (
                <div key={col.key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                    {col.label}
                  </div>
                  <div style={{ fontSize: 13, color: '#334155' }}>
                    {getCellValue(col, row)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tap arrow hint */}
          {onRowClick && (
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: 16, pointerEvents: 'none' }}>
              ›
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
