import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

const manilaMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7);
const manilaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const monthLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-PH', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
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
  const [busyDate, setBusyDate] = useState('');

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
  const leader = useMemo(() => (data?.days || []).find((day) => day.date === today), [data, today]);

  const toggle = async (day) => {
    if (day.placeholder || day.date > today || busyDate) return;
    setBusyDate(day.date);
    try {
      const response = await axiosInstance.post(`/member-portal/bible-reading/${day.date}`);
      const isCompleted = response.data.data.completed;
      setData((current) => {
        const next = new Set(current.completed);
        if (isCompleted) next.add(day.date); else next.delete(day.date);
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
    } finally { setBusyDate(''); }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${c.borderL}` }}>
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
                      const isDone = completed.has(day.date);
                      const isToday = day.date === today;
                      const disabled = day.placeholder || day.date > today;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          role="gridcell"
                          aria-pressed={isDone}
                          aria-label={`${day.date}${isDone ? ', completed' : ''}`}
                          disabled={disabled}
                          onClick={() => toggle(day)}
                          style={{
                            height: 40, minWidth: 0, borderRadius: 8, cursor: disabled ? 'default' : 'pointer',
                            border: isToday ? `1.5px solid ${c.accent}` : `1px solid ${isDone ? c.accent : c.borderL}`,
                            background: isDone ? c.accentL : 'transparent',
                            color: isDone ? c.accentT : disabled ? c.t3 : c.t1,
                            fontSize: f.xs, fontWeight: isDone || isToday ? 700 : 500,
                            opacity: busyDate === day.date ? 0.6 : 1,
                          }}
                        >
                          {Number(day.date.slice(8, 10))}
                        </button>
                      );
                    })}
                  </div>

                  {leader && !leader.placeholder && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.borderL}` }}>
                      <div style={{ fontSize: f.xs, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                        {t.todayReading || "Today's reading"}
                      </div>
                      <div style={{ marginTop: 4, fontSize: f.sm, color: c.t1 }}>
                        {leader.ot} · {leader.nt} · {leader.ps}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
