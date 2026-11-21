import { useMemo, useState } from 'react';

const pad = (value) => String(value).padStart(2, '0');
const manilaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const manilaMonth = () => manilaToday().slice(0, 7);

const monthLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-PH', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
});
const dayLabel = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PH', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
const dateOf = (event) => String(event.start_date || event.event_date || '').slice(0, 10);
const endOf = (event) => String(event.end_date || event.start_date || event.event_date || '').slice(0, 10);

const timeLabel = (time) => {
  if (!time) return '';
  const [hour, minute] = String(time).split(':');
  const value = new Date();
  value.setHours(Number(hour), Number(minute || 0), 0, 0);
  return value.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
};

const shiftMonth = (month, delta) => {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
};

export default function PortalEventCalendar({ events = [], onEventClick, c, f, isMobile, labels = {}, initialMonth }) {
  const t = labels;
  const [month, setMonth] = useState(initialMonth || manilaMonth);
  const [selected, setSelected] = useState('');

  const today = manilaToday();
  const upcoming = useMemo(() => events
    .filter((event) => event.status !== 'Cancelled')
    .filter((event) => (endOf(event) || today) >= today)
    .sort((left, right) => dateOf(left).localeCompare(dateOf(right))), [events, today]);

  const cells = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number);
    const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const offset = new Date(`${month}-01T00:00:00Z`).getUTCDay();
    const days = Array.from({ length: total }, (_, index) => {
      const date = `${month}-${pad(index + 1)}`;
      return {
        date,
        number: index + 1,
        events: upcoming.filter((event) => dateOf(event) <= date && date <= endOf(event)),
      };
    });
    return { offset, days };
  }, [month, upcoming]);

  const monthEvents = new Set(cells.days.flatMap((day) => day.events.map((event) => event.id))).size;
  const activeDate = selected || (cells.days.find((day) => day.date === today)?.date || cells.days.find((day) => day.events.length)?.date || '');
  const activeEvents = cells.days.find((day) => day.date === activeDate)?.events || [];

  const button = {
    width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 8,
    border: `1px solid ${c.border}`, background: c.surface, color: c.t2, cursor: 'pointer',
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${c.borderL}`, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: f.base, fontWeight: 700, color: c.t1 }}>{t.title || 'Church calendar'}</div>
            <div style={{ fontSize: f.xs, color: c.t3 }}>
              {monthEvents} {monthEvents === 1 ? (t.event || 'event') : (t.events || 'events')} · {t.tapHint || 'Tap a day to see details'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" style={button} aria-label={t.previousMonth || 'Previous month'} onClick={() => setMonth((value) => shiftMonth(value, -1))}>‹</button>
            <button type="button" onClick={() => setMonth(manilaMonth())} style={{ ...button, width: 'auto', padding: '0 10px', fontSize: f.xs, fontWeight: 650 }}>{t.today || 'Today'}</button>
            <span style={{ minWidth: 118, textAlign: 'center', fontSize: f.sm, fontWeight: 700, color: c.t1 }}>{monthLabel(month)}</span>
            <button type="button" style={button} aria-label={t.nextMonth || 'Next month'} onClick={() => setMonth((value) => shiftMonth(value, 1))}>›</button>
          </div>
        </div>

        <div style={{ padding: '10px 12px 14px' }}>
          <div role="row" aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3, marginBottom: 3 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span key={`head-${index}`} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: c.t3, padding: '2px 0' }}>{day}</span>
            ))}
          </div>
          <div role="grid" aria-label={monthLabel(month)} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3 }}>
            {Array.from({ length: cells.offset }, (_, index) => <span key={`pad-${index}`} />)}
            {cells.days.map((day) => {
              const isToday = day.date === today;
              const isActive = day.date === activeDate;
              const hasEvents = day.events.length > 0;
              return (
                <button
                  key={day.date}
                  type="button"
                  role="gridcell"
                  aria-pressed={isActive}
                  aria-label={`${dayLabel(day.date)}, ${day.events.length} ${day.events.length === 1 ? 'event' : 'events'}`}
                  onClick={() => setSelected(day.date)}
                  style={{
                    height: isMobile ? 46 : 78, minWidth: 0, padding: isMobile ? '4px 3px' : '5px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'stretch', gap: 2,
                    borderRadius: 7, textAlign: 'left', cursor: 'pointer', font: 'inherit',
                    border: isActive ? `1.5px solid ${c.accent}` : `1px solid ${isToday ? c.accent : c.borderL}`,
                    background: hasEvents ? c.accentL : 'transparent',
                    color: c.t1,
                  }}
                >
                  <span style={{ fontSize: f.xs, fontWeight: isToday || isActive ? 800 : 600, color: isToday || isActive ? c.accentT : c.t2, alignSelf: isMobile ? 'center' : 'flex-start' }}>
                    {day.number}
                  </span>
                  {hasEvents && !isMobile && day.events.slice(0, 2).map((event) => (
                    <span key={event.id} style={{ fontSize: 10, lineHeight: 1.15, color: c.accentT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.title.replace(/^MCC \| /, '')}
                    </span>
                  ))}
                  {hasEvents && !isMobile && day.events.length > 2 && (
                    <span style={{ fontSize: 10, color: c.t3 }}>+{day.events.length - 2}</span>
                  )}
                  {hasEvents && isMobile && (
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: c.accent, marginTop: 1 }} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: '14px 16px' }} aria-label={activeDate ? dayLabel(activeDate) : 'Selected day'}>
        <div style={{ fontSize: f.xs, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: c.t3 }}>
          {activeDate ? dayLabel(activeDate) : (t.pickDay || 'Pick a day')}
        </div>
        {activeEvents.length === 0 ? (
          <p style={{ margin: '6px 0 0', fontSize: f.sm, color: c.t3 }}>{t.emptyDay || 'Nothing scheduled for this day.'}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
            {activeEvents.map((event) => {
              const multiDay = endOf(event) !== dateOf(event);
              return (
                <li key={event.id} style={{ padding: '9px 0', borderTop: `1px solid ${c.borderL}` }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: f.xs, fontWeight: 700, color: c.t2, minWidth: 58 }}>
                      {event.start_time ? timeLabel(event.start_time) : (t.allDay || 'All day')}
                    </span>
                    <span style={{ fontSize: f.sm, fontWeight: 650, color: c.t1, flex: 1, minWidth: 0 }}>{event.title}</span>
                    {event.is_registered && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.success, background: c.successL, borderRadius: 99, padding: '2px 8px' }}>{t.registered || 'Registered'}</span>
                    )}
                  </div>
                  {(event.location || multiDay) && (
                    <div style={{ fontSize: f.xs, color: c.t3, marginTop: 2, paddingLeft: 66 }}>
                      {[multiDay ? `${dateOf(event)} – ${endOf(event)}` : '', event.location].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {onEventClick && (
                    <div style={{ paddingLeft: 66, marginTop: 4 }}>
                      <button type="button" onClick={() => onEventClick(event)}
                        style={{ border: 0, background: 'transparent', color: c.accentT, fontSize: f.xs, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                        {t.viewDetails || 'View details'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
