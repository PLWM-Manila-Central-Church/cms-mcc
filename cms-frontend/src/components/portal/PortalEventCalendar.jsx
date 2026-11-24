import { useMemo, useState } from 'react';
import PortalDialog from './PortalDialog';

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

function DayDialog({ date, events, onClose, onEventClick, c, f, labels }) {
  const t = labels;
  return (
    <PortalDialog onClose={onClose} label={dayLabel(date)} width={560}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '20px 22px 14px', borderBottom: `1px solid ${c.borderL}` }}>
        <div>
          <div style={{ fontSize: f.xs || 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.t3 }}>
            {t.selectedDay || 'Selected day'}
          </div>
          <div style={{ fontSize: f.lg || 17, fontWeight: 700, color: c.t1, marginTop: 2 }}>{dayLabel(date)}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeDay || 'Close day details'}
          style={{ width: 36, height: 36, borderRadius: '50%', border: 0, background: c.surfaceAlt, color: c.t2, cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
        >
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>×</span>
        </button>
      </div>

      <div style={{ padding: '16px 22px 20px', display: 'grid', gap: 10 }}>
        {events.length === 0 ? (
          <p style={{ margin: 0, fontSize: f.sm, color: c.t3 }}>{t.emptyDay || 'Nothing scheduled for this day.'}</p>
        ) : events.map((event) => {
          const multiDay = endOf(event) !== dateOf(event);
          const meta = [
            multiDay ? `${dateOf(event)} – ${endOf(event)}` : '',
            event.location,
          ].filter(Boolean).join(' · ');
          return (
            <article key={event.id} style={{ border: `1px solid ${c.border}`, borderRadius: 12, padding: '13px 15px', display: 'grid', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: f.sm || 13, fontWeight: 700, color: c.t2, minWidth: 62 }}>
                  {event.start_time ? timeLabel(event.start_time) : (t.allDay || 'All day')}
                </span>
                <span style={{ fontSize: f.sm, fontWeight: 650, color: c.t1, flex: 1, minWidth: 0 }}>{event.title}</span>
              </div>
              {meta && <div style={{ fontSize: f.xs, color: c.t3, paddingLeft: 74 }}>{meta}</div>}
              {event.description && <p style={{ margin: 0, fontSize: f.xs, lineHeight: 1.55, color: c.t2, paddingLeft: 74 }}>{event.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingLeft: 74, marginTop: 2 }}>
                <span>
                  {event.is_registered && (
                    <span style={{ fontSize: f.xs || 12, fontWeight: 700, color: c.success, background: c.successL, borderRadius: 99, padding: '2px 8px' }}>
                      {t.registered || 'Registered'}
                    </span>
                  )}
                </span>
                {onEventClick && (
                  <button
                    type="button"
                    onClick={() => {
                      const dayButton = document.querySelector(`[aria-label="Open ${dayLabel(date)}"]`);
                      dayButton?.focus();
                      onClose();
                      onEventClick(event);
                    }}
                    style={{ border: 0, background: 'transparent', color: c.accentT, fontSize: f.xs, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    {t.viewDetails || 'View details'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </PortalDialog>
  );
}

export default function PortalEventCalendar({ events = [], onEventClick, c, f, isMobile = false, labels = {}, initialMonth }) {
  const t = labels;
  const [month, setMonth] = useState(initialMonth || manilaMonth);
  const [openDay, setOpenDay] = useState('');
  const [today] = useState(manilaToday);

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
  const openDayEvents = cells.days.find((day) => day.date === openDay)?.events || [];

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
              <span key={`head-${index}`} style={{ textAlign: 'center', fontSize: f.xs || 12, fontWeight: 700, color: c.t3, padding: '2px 0' }}>{day}</span>
            ))}
          </div>
          <div role="grid" aria-label={monthLabel(month)} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3 }}>
            {Array.from({ length: cells.offset }, (_, index) => <span key={`pad-${index}`} />)}
            {cells.days.map((day) => {
              const isToday = day.date === today;
              const isOpen = day.date === openDay;
              const hasEvents = day.events.length > 0;
              return (
                <div
                  key={day.date}
                  className="portal-cal-cell"
                  role="gridcell"
                  aria-label={`${dayLabel(day.date)}, ${day.events.length} ${day.events.length === 1 ? 'event' : 'events'}`}
                  onClick={() => setOpenDay(day.date)}
                  style={{
                    height: isMobile ? 46 : 82, minWidth: 0, padding: isMobile ? '4px 3px' : '5px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'stretch', gap: 3,
                    borderRadius: 7, textAlign: 'left', cursor: 'pointer', overflow: 'hidden',
                    border: isOpen ? `1.5px solid ${c.accent}` : `1px solid ${isToday ? c.accent : c.borderL}`,
                    background: hasEvents ? c.accentL : 'transparent',
                    color: c.t1,
                  }}
                >
                  <button
                    type="button"
                    onClick={(clickEvent) => { clickEvent.stopPropagation(); setOpenDay(day.date); }}
                    aria-pressed={isOpen}
                    aria-label={`Open ${dayLabel(day.date)}`}
                    style={{
                      border: 0, background: 'transparent', padding: 0, margin: 0, cursor: 'pointer', font: 'inherit',
                      fontSize: f.xs, fontWeight: isToday || isOpen ? 800 : 600, minHeight: 0, lineHeight: 1.2,
                      color: isToday || isOpen ? c.accentT : c.t2,
                      alignSelf: isMobile ? 'center' : 'flex-start', flexShrink: 0,
                    }}
                  >
                    {day.number}
                  </button>
                  {hasEvents && !isMobile && day.events.slice(0, 2).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(clickEvent) => { clickEvent.stopPropagation(); onEventClick?.(event); }}
                      style={{
                        border: 0, padding: '1px 4px', margin: 0, background: 'rgba(0,85,153,0.08)', borderRadius: 4,
                        cursor: 'pointer', textAlign: 'left', minHeight: 0, flexShrink: 0,
                        font: 'inherit', fontSize: f.xs || 12, lineHeight: 1.3, color: c.accentT,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
                      }}
                    >
                      {event.title.replace(/^MCC \| /, '')}
                    </button>
                  ))}
                  {hasEvents && !isMobile && day.events.length > 2 && (
                    <span style={{ fontSize: f.xs || 12, color: c.t3 }}>+{day.events.length - 2}</span>
                  )}
                  {hasEvents && isMobile && (
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: c.accent, marginTop: 1 }} aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {openDay && (
        <DayDialog
          date={openDay}
          events={openDayEvents}
          onClose={() => setOpenDay('')}
          onEventClick={onEventClick}
          c={c}
          f={f}
          labels={t}
        />
      )}
    </div>
  );
}
