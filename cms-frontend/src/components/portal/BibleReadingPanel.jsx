import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import PortalDialog from './PortalDialog';

const manilaMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7);
const manilaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const monthLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-PH', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
});
const fullDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PH', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

const shiftMonth = (month, delta) => {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

export default function BibleReadingPanel({ c, f, labels = {}, showToast }) {
  const t = labels;
  const [month, setMonth] = useState(manilaMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await axiosInstance.get('/member-portal/bible-reading', { params: { month } });
      setData(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The reading plan could not be loaded.');
    } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const completed = useMemo(() => new Set(data?.completed || []), [data]);
  const today = data?.today || manilaToday();
  const firstWeekday = data?.days?.length
    ? new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay()
    : 0;

  const activeDay = data?.days.find((day) => day.date === selected) || null;
  const isRead = Boolean(activeDay) && completed.has(activeDay.date);
  const canToggle = Boolean(activeDay) && !activeDay.placeholder && activeDay.date <= today;

  const toggle = async () => {
    if (!activeDay || !canToggle || busy) return;
    setBusy(true);
    try {
      const response = await axiosInstance.post(`/member-portal/bible-reading/${activeDay.date}`);
      const nowRead = response.data.data.completed;
      setData((current) => {
        const next = new Set(current.completed);
        if (nowRead) next.add(activeDay.date); else next.delete(activeDay.date);
        const list = [...next];
        return {
          ...current,
          completed: list,
          count: list.length,
          percent: current.target > 0 ? Math.round((list.length / current.target) * 100) : 0,
        };
      });
    } catch (requestError) {
      showToast?.(requestError.response?.data?.message || 'That reading could not be updated.', 'error');
    } finally { setBusy(false); }
  };

  const memory = data?.memoryVerse;
  const verse = memory?.verse;
  const formattedSunday = memory?.upcomingSunday
    ? new Date(`${memory.upcomingSunday}T00:00:00Z`).toLocaleDateString('en-PH', {
      weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC',
    })
    : '';

  const card = {
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden',
  };
  const iconButton = {
    width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 8,
    border: `1px solid ${c.border}`, background: c.surface, color: c.t2, cursor: 'pointer',
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section style={{ ...card, padding: '16px 18px' }} aria-label={t.memoryVerse || 'Memory verse'}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span style={{ fontSize: f.xs, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: c.t3 }}>
            {t.memoryVerse || 'Memory verse'}
          </span>
          {verse && (
            <span style={{ fontSize: f.xs, color: c.t3 }}>
              {(data.group || 'My group') + ' · ' + formattedSunday}
            </span>
          )}
        </div>
        {verse ? (
          <blockquote style={{ margin: '10px 0 0' }}>
            <p style={{ margin: 0, fontSize: f.md, lineHeight: 1.6, color: c.t1 }}>{verse.verse_text}</p>
            <footer style={{ marginTop: 6, fontSize: f.sm, fontWeight: 700, color: c.accentT }}>{verse.reference}</footer>
          </blockquote>
        ) : (
          <p style={{ margin: '10px 0 0', fontSize: f.sm, color: c.t3 }}>{t.noVerse || 'No memory verse is assigned to your group yet.'}</p>
        )}
      </section>

      <section style={{ ...card }} aria-label={t.readingPlan || 'Bible reading plan'}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${c.borderL}`, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: f.base, fontWeight: 700, color: c.t1 }}>{t.readingPlan || 'Bible reading'}</div>
            <div style={{ fontSize: f.xs, color: c.t3 }}>
              {data ? `${data.count} / ${data.target || 0} ${t.daysDone || 'days'} · ${data.percent}%` : ' '}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" style={iconButton} onClick={() => setMonth((value) => shiftMonth(value, -1))} aria-label={t.previousMonth || 'Previous month'}>‹</button>
            <span style={{ minWidth: 118, textAlign: 'center', fontSize: f.sm, fontWeight: 700, color: c.t1 }}>{monthLabel(month)}</span>
            <button type="button" style={iconButton} onClick={() => setMonth((value) => shiftMonth(value, 1))} aria-label={t.nextMonth || 'Next month'}>›</button>
          </div>
        </div>

        <div style={{ padding: '12px 16px 16px' }}>
          {error && <p role="alert" style={{ margin: '0 0 10px', color: c.danger, fontSize: f.sm }}>{error}</p>}
          {loading && !data ? <p style={{ margin: 0, color: c.t3, fontSize: f.sm }}>{t.loading || 'Loading…'}</p> : data && (
            <>
              <div style={{ height: 6, borderRadius: 99, background: c.borderL, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${Math.min(100, data.percent || 0)}%`, background: c.accent }} />
              </div>

              {data.target === 0 ? (
                <p style={{ margin: 0, fontSize: f.sm, color: c.t3 }}>
                  {t.planPending || 'The reading plan for this month has not been published yet.'}
                </p>
              ) : (
                <>
                  <div role="grid" aria-label={monthLabel(month)} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <span key={`head-${index}`} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: c.t3, padding: '2px 0' }} aria-hidden="true">{day}</span>
                    ))}
                    {Array.from({ length: firstWeekday }, (_, index) => <span key={`pad-${index}`} />)}
                    {data.days.map((day) => {
                      const dayRead = completed.has(day.date);
                      const isToday = day.date === today;
                      const isActive = day.date === selected;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          role="gridcell"
                          aria-pressed={isActive}
                          aria-label={`${day.date}${dayRead ? ', completed' : ''}`}
                          onClick={() => setSelected(day.date)}
                          style={{
                            height: 54, minWidth: 0, padding: '3px 4px', borderRadius: 8,
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                            cursor: 'pointer', font: 'inherit', textAlign: 'left',
                            border: isActive ? `1.5px solid ${c.accent}` : `1px solid ${isToday ? c.accent : c.borderL}`,
                            background: dayRead ? c.accentL : 'transparent',
                            color: dayRead ? c.accentT : day.placeholder ? c.t3 : c.t1,
                          }}
                        >
                          <span style={{ fontSize: f.xs, fontWeight: dayRead || isToday || isActive ? 800 : 500 }}>{Number(day.date.slice(8, 10))}</span>
                          {!day.placeholder && (
                            <>
                              <span style={{ fontSize: 8, lineHeight: 1.15, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>{day.ot}</span>
                              <span style={{ fontSize: 8, lineHeight: 1.15, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>{day.nt}</span>
                              <span style={{ fontSize: 8, lineHeight: 1.15, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>{day.ps}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>

                </>
              )}
            </>
          )}
        </div>
      </section>
      {activeDay && (
        <PortalDialog onClose={() => selected === activeDay.date && setSelected('')} label={fullDate(activeDay.date)} width={520}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '20px 22px 14px', borderBottom: `1px solid ${c.borderL}` }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.t3 }}>{t.selectedDay || 'Selected day'}</div>
              <div style={{ fontSize: f.lg || 17, fontWeight: 700, color: c.t1, marginTop: 2 }}>{fullDate(activeDay.date)}</div>
            </div>
            <button type="button" onClick={() => setSelected('')} aria-label={t.closeDay || 'Close day readings'} style={{ width: 36, height: 36, borderRadius: '50%', border: 0, background: c.surfaceAlt, color: c.t2, cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>×</span>
            </button>
          </div>
          <div style={{ padding: '16px 22px 20px', display: 'grid', gap: 12 }}>
            {activeDay.placeholder ? (
              <p style={{ margin: 0, fontSize: f.sm, color: c.t3 }}>{t.noReading || 'No reading is published for this day.'}</p>
            ) : (
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, margin: 0 }}>
                {[
                  [t.oldTestament || 'Old Testament', activeDay.ot],
                  [t.newTestament || 'New Testament', activeDay.nt],
                  [t.psalmsProverbs || 'Psalms / Proverbs', activeDay.ps],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: c.surfaceAlt, border: `1px solid ${c.borderL}`, borderRadius: 10, padding: '10px 12px' }}>
                    <dt style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: c.t3 }}>{label}</dt>
                    <dd style={{ margin: '3px 0 0', fontSize: f.md || 14, fontWeight: 650, color: c.t1 }}>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: `1px solid ${c.borderL}`, paddingTop: 14 }}>
              <span style={{ fontSize: f.xs, color: c.t3 }}>
                {t.referencesNote || 'References from the 2026 reading plan. Chapter text is not stored here.'}
              </span>
              {canToggle && (
                <button
                  type="button"
                  onClick={toggle}
                  disabled={busy}
                  style={{
                    minHeight: 38, padding: '9px 16px', borderRadius: 9, fontSize: f.xs, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                    border: `1px solid ${isRead ? c.border : c.accent}`,
                    background: isRead ? c.surface : c.accent,
                    color: isRead ? c.t2 : '#fff',
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? '…' : isRead ? (t.markUnread || 'Mark as unread') : (t.markRead || 'Mark as read')}
                </button>
              )}
            </div>
            {!activeDay.placeholder && !canToggle && activeDay.date > today && (
              <p style={{ margin: 0, fontSize: f.xs, color: c.t3 }}>
                {t.futureDay || 'You can mark this day once it arrives.'}
              </p>
            )}
          </div>
        </PortalDialog>
      )}
    </div>
  );
}
