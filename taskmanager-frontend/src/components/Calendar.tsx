import { useMemo, useState } from 'react';
import type { Task, Project } from '../types/task';
import { isTaskOverdue } from '../utils/taskUtils';
import './Calendar.css';

type CalView = 'year' | 'month' | 'week' | 'day';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_ABBR  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_SHORT = ['S','M','T','W','T','F','S'];

interface Props {
  tasks: Task[];
  projects: Project[];
  is24Hour: boolean;
  isEuropeanDate: boolean;
  onEditTask: (taskId: number) => void;
  hideCompleted: boolean;
  onToggleHideCompleted: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7)
  );
}

type DayTaskStatus = 'none' | 'upcoming' | 'overdue' | 'mixed' | 'completed';

function getDayTaskStatus(dayTasks: Task[]): DayTaskStatus {
  if (dayTasks.length === 0) return 'none';
  const allCompleted = dayTasks.every(t => t.statusID === 2);
  if (allCompleted) return 'completed';
  const hasOverdue  = dayTasks.some(t => isTaskOverdue(t));
  const hasUpcoming = dayTasks.some(t => !isTaskOverdue(t));
  if (hasOverdue && hasUpcoming) return 'mixed';
  return hasOverdue ? 'overdue' : 'upcoming';
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Calendar({ tasks, projects, is24Hour, isEuropeanDate, onEditTask, hideCompleted, onToggleHideCompleted }: Props) {
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear());
  const [view,     setView]     = useState<CalView>('week');
  const [selMonth, setSelMonth] = useState(() => new Date().getMonth());
  const [selWeek,  setSelWeek]  = useState(() => weekStart(new Date()));
  const [selDay,   setSelDay]   = useState(() => new Date());

  const locale   = isEuropeanDate ? 'en-GB' : 'en-US';
  const todayKey = toKey(new Date());

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dateTimeScheduled) continue;
      const key = t.dateTimeScheduled.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const fmtTime = (dt: string) =>
    new Date(dt).toLocaleTimeString(locale, {
      hour: '2-digit', minute: '2-digit', hour12: !is24Hour,
    });

  const sorted = (ts: Task[]) =>
    [...ts].sort((a, b) => {
      if (!a.dateTimeScheduled && !b.dateTimeScheduled) return 0;
      if (!a.dateTimeScheduled) return 1;
      if (!b.dateTimeScheduled) return -1;
      return a.dateTimeScheduled.localeCompare(b.dateTimeScheduled);
    });

  const goDay = (date: Date, month = date.getMonth()) => {
    setSelDay(date);
    setSelWeek(weekStart(date));
    setSelMonth(month);
    setView('day');
  };

  // ── Breadcrumb trail ───────────────────────────────────────────────────────
  const renderBreadcrumbs = () => {
    const weekEnd = new Date(selWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekLabel =
      `${selWeek.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ` +
      `${weekEnd.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
    const dayLabel = selDay.toLocaleDateString(locale, {
      weekday: 'short', month: 'short', day: 'numeric',
    });

    type Crumb = { label: string; action?: () => void };
    const crumbs: Crumb[] = [];

    // Year crumb — always present, clickable unless we're already in year view
    crumbs.push({
      label: String(calYear),
      action: view !== 'year' ? () => setView('year') : undefined,
    });

    if (view === 'month' || view === 'week' || view === 'day') {
      crumbs.push({
        label: MONTH_NAMES[selMonth],
        action: view !== 'month' ? () => setView('month') : undefined,
      });
    }

    if (view === 'week' || view === 'day') {
      crumbs.push({
        label: weekLabel,
        action: view === 'day' ? () => setView('week') : undefined,
      });
    }

    if (view === 'day') {
      crumbs.push({ label: dayLabel });
    }

    return (
      <nav className="cal-breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="cal-breadcrumb__item">
            {i > 0 && <span className="cal-breadcrumb__sep">›</span>}
            {c.action
              ? <button className="cal-breadcrumb__link" onClick={c.action}>{c.label}</button>
              : <span className="cal-breadcrumb__current">{c.label}</span>
            }
          </span>
        ))}
      </nav>
    );
  };

  const fmtDate = (dt: string) =>
    new Date(dt).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });

  const fmtShortDate = (dt: string) =>
    new Date(dt).toLocaleDateString(locale, { month: 'short', day: 'numeric' });

  // ── Shared task list ───────────────────────────────────────────────────────
  const renderTasks = (items: Task[], showDate = false) => {
    if (items.length === 0) return <p className="cal-empty">No tasks.</p>;
    return (
      <ul className="cal-list">
        {items.map(t => {
          const overdue    = isTaskOverdue(t);
          const completed  = t.statusID === 2;
          const timeLabel = t.dateTimeScheduled ? fmtTime(t.dateTimeScheduled) : '—';
          const dateLabel = t.dateTimeScheduled ? fmtShortDate(t.dateTimeScheduled) : null;
          return (
            <li
              key={t.taskID}
              className={[
                'cal-item cal-item--clickable',
                overdue   ? 'cal-item--overdue'    : '',
                completed ? 'cal-item--completed'  : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onEditTask(t.taskID)}
              title="Edit task"
            >
              <span className="cal-item__time">
                {showDate && dateLabel
                  ? <><span className="cal-item__time-date">{dateLabel}</span><span>{timeLabel}</span></>
                  : timeLabel}
              </span>
              <div className="cal-item__body">
                <div className="cal-item__title-line">
                  <span className={`cal-item__title${completed ? ' cal-item__title--done' : ''}`}>{t.title}</span>
                  {t.priority && (
                    <span className={`cal-item__priority cal-item__priority--${t.priority.toLowerCase()}`}>
                      {t.priority[0] + t.priority.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
                {t.projectID && (() => {
                  const proj = projects.find(p => p.projectID === Number(t.projectID));
                  return proj ? (
                    <span className="cal-item__project-chip">{proj.title}</span>
                  ) : null;
                })()}
                {t.description && (
                  <span className="cal-item__desc">{t.description}</span>
                )}
              </div>
              <div className="cal-item__badges">
                {(t.tags ?? []).map(tag => (
                  <span key={tag.tagID} className="cal-item__tag-chip" style={{ borderColor: tag.color ?? '#6366f1', color: tag.color ?? '#6366f1' }}>
                    {tag.title}
                  </span>
                ))}
                {completed && <span className="cal-item__done-badge">Done</span>}
                {overdue   && <span className="cal-item__overdue-badge">Overdue</span>}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  // ── Year view ──────────────────────────────────────────────────────────────
  if (view === 'year') {
    return (
      <div className="cal-card">
        <div className="cal-nav">
          {renderBreadcrumbs()}
          <div className="cal-nav__ctrl">
            <button className="btn btn--ghost btn--sm" onClick={onToggleHideCompleted}>
              {hideCompleted ? '👁 Show completed' : '🙈 Hide completed'}
            </button>
            <button className="btn btn--ghost btn--icon" onClick={() => setCalYear(y => y - 1)}>‹</button>
            <button className="btn btn--ghost btn--icon" onClick={() => setCalYear(y => y + 1)}>›</button>
          </div>
        </div>

        <div className="cal-year-grid">
          {MONTH_NAMES.map((name, m) => {
            const grid = buildMonthGrid(calYear, m);
            return (
              <div key={m} className="cal-mini">
                <button
                  className="cal-mini__name"
                  onClick={() => { setSelMonth(m); setView('month'); }}
                >
                  {name}
                </button>

                <div className="cal-mini__rows">
                  <div className="cal-mini__dh-row">
                    {DAY_SHORT.map((d, i) => (
                      <span key={i} className="cal-mini__dh">{d}</span>
                    ))}
                  </div>

                  {grid.map((week, wi) => {
                    const realDays  = week.filter((d): d is Date => d !== null);
                    if (realDays.length === 0) return null;
                    const firstReal = realDays[0];
                    const hasWkTasks  = realDays.some(d => byDate.has(toKey(d)));
                    const isThisWeek  = realDays.some(d => toKey(d) === todayKey);
                    return (
                      <div
                        key={wi}
                        className={[
                          'cal-mini__week-row',
                          hasWkTasks ? 'cal-mini__week-row--tasks' : '',
                          isThisWeek ? 'cal-mini__week-row--current' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => { setSelMonth(m); setSelWeek(firstReal); setView('week'); }}
                        role="button"
                        title="View this week"
                      >
                        {week.map((date, di) => {
                          if (!date) return <span key={`p${di}`} className="cal-mini__day" />;
                          const key    = toKey(date);
                          const dTasks = byDate.get(key) ?? [];
                          const n      = dTasks.length;
                          const status = getDayTaskStatus(dTasks);
                          const isT    = key === todayKey;
                          return (
                            <button
                              key={key}
                              className={[
                                'cal-mini__day',
                                status === 'upcoming'  ? 'cal-mini__day--tasks'      : '',
                                status === 'overdue'   ? 'cal-mini__day--overdue'    : '',
                                status === 'mixed'     ? 'cal-mini__day--mixed'      : '',
                                status === 'completed' ? 'cal-mini__day--completed'  : '',
                                isT                    ? 'cal-mini__day--today'      : '',
                              ].filter(Boolean).join(' ')}
                              onClick={e => { e.stopPropagation(); goDay(date, m); }}
                              title={n > 0 ? `${n} task${n !== 1 ? 's' : ''}` : undefined}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Month view ─────────────────────────────────────────────────────────────
  if (view === 'month') {
    const grid = buildMonthGrid(calYear, selMonth);

    const shiftMonth = (delta: number) => {
      let m = selMonth + delta;
      let y = calYear;
      if (m < 0)  { m = 11; y--; }
      if (m > 11) { m = 0;  y++; }
      setSelMonth(m);
      setCalYear(y);
    };

    const monthTasks = sorted(tasks.filter(t => {
      if (!t.dateTimeScheduled) return false;
      const d = new Date(t.dateTimeScheduled);
      return d.getFullYear() === calYear && d.getMonth() === selMonth;
    }));
    const overdueMonthTasks  = monthTasks.filter(t => isTaskOverdue(t));
    const upcomingMonthTasks = monthTasks.filter(t => !isTaskOverdue(t));

    return (
      <div className="cal-card">
        <div className="cal-nav">
          {renderBreadcrumbs()}
          <div className="cal-nav__ctrl">
            <button className="btn btn--ghost btn--sm" onClick={onToggleHideCompleted}>
              {hideCompleted ? '👁 Show completed' : '🙈 Hide completed'}
            </button>
            <button className="btn btn--ghost btn--icon" onClick={() => shiftMonth(-1)}>‹</button>
            <button className="btn btn--ghost btn--icon" onClick={() => shiftMonth(+1)}>›</button>
          </div>
        </div>

        <table className="cal-table">
          <thead>
            <tr>
              {DAY_ABBR.map(d => <th key={d}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => {
              const realDays   = week.filter((d): d is Date => d !== null);
              const weekTasks  = sorted(realDays.flatMap(d => byDate.get(toKey(d)) ?? []));
              const firstReal  = realDays[0];
              const isThisWeek = realDays.some(d => toKey(d) === todayKey);

              return (
                <tr
                  key={wi}
                  className={[
                    'cal-table__row',
                    isThisWeek            ? 'cal-table__row--current' : '',
                    weekTasks.length > 0  ? 'cal-table__row--tasks'   : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => { setSelWeek(firstReal); setView('week'); }}
                  role="button"
                  title="View this week"
                >
                  {week.map((date, di) => {
                    if (!date) return <td key={di} />;
                    const key    = toKey(date);
                    const dTasks = byDate.get(key) ?? [];
                    const n      = dTasks.length;
                    const status = getDayTaskStatus(dTasks);
                    const isT    = key === todayKey;
                    return (
                      <td key={key}>
                        <button
                          className={[
                            'cal-day-btn',
                            status === 'upcoming'  ? 'cal-day-btn--tasks'      : '',
                            status === 'overdue'   ? 'cal-day-btn--overdue'    : '',
                            status === 'mixed'     ? 'cal-day-btn--mixed'      : '',
                            status === 'completed' ? 'cal-day-btn--completed'  : '',
                            isT                    ? 'cal-day-btn--today'      : '',
                          ].filter(Boolean).join(' ')}
                          onClick={e => { e.stopPropagation(); goDay(date, selMonth); }}
                          title={n > 0 ? `${n} task${n !== 1 ? 's' : ''}` : undefined}
                        >
                          {date.getDate()}
                          {n > 0 && <span className="cal-day-count">{n}</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {overdueMonthTasks.length > 0 && (
          <div className="cal-section">
            <div className="cal-section__hdr cal-section__hdr--overdue">
              Overdue
              <span className="cal-badge cal-badge--overdue">{overdueMonthTasks.length}</span>
            </div>
            {renderTasks(overdueMonthTasks, true)}
          </div>
        )}

        <div className="cal-section">
          <div className="cal-section__hdr">
            {MONTH_NAMES[selMonth]} tasks
            {upcomingMonthTasks.length > 0 && (
              <span className="cal-badge">{upcomingMonthTasks.length}</span>
            )}
          </div>
          {renderTasks(upcomingMonthTasks, true)}
        </div>
      </div>
    );
  }

  // ── Week view ──────────────────────────────────────────────────────────────
  if (view === 'week') {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selWeek);
      d.setDate(d.getDate() + i);
      return d;
    });

    const shiftWeek = (delta: number) => {
      const w = new Date(selWeek);
      w.setDate(w.getDate() + delta * 7);
      setSelWeek(w);
      setSelMonth(w.getMonth());
    };

    const allWeekTasks  = days.flatMap(d => byDate.get(toKey(d)) ?? []);
    const overdueThisWeek  = sorted(allWeekTasks.filter(t => isTaskOverdue(t)));
    const upcomingThisWeek = new Set(overdueThisWeek.map(t => t.taskID));

    return (
      <div className="cal-card">
        <div className="cal-nav">
          {renderBreadcrumbs()}
          <div className="cal-nav__ctrl">
            <button className="btn btn--ghost btn--sm" onClick={onToggleHideCompleted}>
              {hideCompleted ? '👁 Show completed' : '🙈 Hide completed'}
            </button>
            <button className="btn btn--ghost btn--icon" onClick={() => shiftWeek(-1)}>‹</button>
            <button className="btn btn--ghost btn--icon" onClick={() => shiftWeek(+1)}>›</button>
          </div>
        </div>

        {overdueThisWeek.length > 0 && (
          <div className="cal-section">
            <div className="cal-section__hdr cal-section__hdr--overdue">
              Overdue
              <span className="cal-badge cal-badge--overdue">{overdueThisWeek.length}</span>
            </div>
            {renderTasks(overdueThisWeek, true)}
          </div>
        )}

        <div className="cal-section">
          <div className="cal-section__hdr">
            Week tasks
            {allWeekTasks.length - overdueThisWeek.length > 0 && (
              <span className="cal-badge">{allWeekTasks.length - overdueThisWeek.length}</span>
            )}
          </div>

          {days.map(day => {
            const key      = toKey(day);
            const dayTasks = sorted((byDate.get(key) ?? []).filter(t => !upcomingThisWeek.has(t.taskID)));
            const isT      = key === todayKey;
            return (
              <div key={key} className="cal-week-row">
                <button
                  className={[
                    'cal-week-row__lbl',
                    isT             ? 'cal-week-row__lbl--today' : '',
                    dayTasks.length ? 'cal-week-row__lbl--tasks' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => goDay(day, day.getMonth())}
                >
                  {day.toLocaleDateString(locale, {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                  {dayTasks.length > 0 && (
                    <span className="cal-badge cal-badge--sm">{dayTasks.length}</span>
                  )}
                </button>
                {dayTasks.length > 0 && renderTasks(dayTasks)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Day view ───────────────────────────────────────────────────────────────
  const dayKey          = toKey(selDay);
  const dayTasks        = sorted(byDate.get(dayKey) ?? []);
  const overdueDayTasks  = dayTasks.filter(t => isTaskOverdue(t));
  const upcomingDayTasks = dayTasks.filter(t => !isTaskOverdue(t));
  const isTDay          = dayKey === todayKey;

  const shiftDay = (delta: number) => {
    const d = new Date(selDay);
    d.setDate(d.getDate() + delta);
    setSelDay(d);
    setSelWeek(weekStart(d));
    setSelMonth(d.getMonth());
  };

  return (
    <div className="cal-card">
      <div className="cal-nav">
        {renderBreadcrumbs()}
        <div className="cal-nav__ctrl">
          <button className="btn btn--ghost btn--sm" onClick={onToggleHideCompleted}>
            {hideCompleted ? '👁 Show completed' : '🙈 Hide completed'}
          </button>
          <button className="btn btn--ghost btn--icon" onClick={() => shiftDay(-1)}>‹</button>
          <button className="btn btn--ghost btn--icon" onClick={() => shiftDay(+1)}>›</button>
        </div>
      </div>

      {overdueDayTasks.length > 0 && (
        <div className="cal-section">
          <div className="cal-section__hdr cal-section__hdr--overdue">
            {isTDay && <span className="cal-today-pill">Today</span>}
            Overdue
            <span className="cal-badge cal-badge--overdue">{overdueDayTasks.length}</span>
          </div>
          {renderTasks(overdueDayTasks)}
        </div>
      )}

      <div className="cal-section">
        <div className="cal-section__hdr">
          {isTDay && overdueDayTasks.length === 0 && <span className="cal-today-pill">Today</span>}
          Day tasks
          {upcomingDayTasks.length > 0 && <span className="cal-badge">{upcomingDayTasks.length}</span>}
        </div>
        {renderTasks(upcomingDayTasks)}
      </div>
    </div>
  );
}
