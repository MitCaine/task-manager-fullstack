import { useEffect, useMemo, useRef, useState } from 'react';
import type { Task, Project } from '../types/task';
import { isTaskOverdue } from '../utils/taskUtils';
import './Calendar.css';

type CalView = 'year' | 'month' | 'week' | 'day';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const YEAR_RANGE_LABELS = ['Jan - Apr', 'May - Aug', 'Sep - Dec'];
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

// Date helpers keep calendar calculations normalized to local day boundaries.

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

function buildFixedMonthGrid(year: number, month: number): (Date | null)[][] {
  const grid = buildMonthGrid(year, month);
  while (grid.length < 6) {
    grid.push(Array(7).fill(null));
  }
  return grid.slice(0, 6);
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

function sameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatWeekLabel(start: Date, locale: string): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ` +
    `${end.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
}

function buildWeekOptions(year: number, month: number, locale: string) {
  return buildMonthGrid(year, month)
    .map(week => week.filter((d): d is Date => d !== null))
    .filter(realDays => realDays.length > 0)
    .map(realDays => {
      const start = weekStart(realDays[0]);
      return { start, label: formatWeekLabel(start, locale) };
    });
}

// Calendar renders year, month, week, and day views over scheduled tasks.

export default function Calendar({ tasks, projects, is24Hour, isEuropeanDate, onEditTask, hideCompleted, onToggleHideCompleted }: Props) {
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear());
  const [view,     setView]     = useState<CalView>('week');
  const [selMonth, setSelMonth] = useState(() => new Date().getMonth());
  const [yearRange, setYearRange] = useState(() => Math.floor(new Date().getMonth() / 4));
  const [selWeek,  setSelWeek]  = useState(() => weekStart(new Date()));
  const [selDay,   setSelDay]   = useState(() => new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showHalfPicker, setShowHalfPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const yearPickerRef = useRef<HTMLDivElement>(null);
  const halfPickerRef = useRef<HTMLDivElement>(null);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const weekPickerRef = useRef<HTMLDivElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);

  const locale   = isEuropeanDate ? 'en-GB' : 'en-US';
  const todayKey = toKey(new Date());

  useEffect(() => {
    const closePickers = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!yearPickerRef.current?.contains(target)) setShowYearPicker(false);
      if (!halfPickerRef.current?.contains(target)) setShowHalfPicker(false);
      if (!monthPickerRef.current?.contains(target)) setShowMonthPicker(false);
      if (!weekPickerRef.current?.contains(target)) setShowWeekPicker(false);
    };

    document.addEventListener('mousedown', closePickers);
    return () => document.removeEventListener('mousedown', closePickers);
  }, []);

  useEffect(() => {
    if (showYearPicker) {
      selectedYearRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [showYearPicker, calYear]);

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

  const goYearView = () => {
    setYearRange(Math.floor(selMonth / 4));
    setView('year');
  };

  // Breadcrumb labels reflect the active calendar scope.
  const renderBreadcrumbs = () => {
    const weekLabel = formatWeekLabel(selWeek, locale);
    const dayLabel = selDay.toLocaleDateString(locale, {
      weekday: 'short', month: 'short', day: 'numeric',
    });

    if (view === 'year') {
      const yearOptions = Array.from({ length: 201 }, (_, i) => calYear - 100 + i)
        .filter(year => year >= 1 && year <= 9999);
      const selectRange = (index: number) => {
        const month = index * 4;
        setYearRange(index);
        setSelMonth(month);
        setSelWeek(weekStart(new Date(calYear, month, 1)));
        setSelDay(new Date(calYear, month, 1));
        setShowHalfPicker(false);
        setShowMonthPicker(false);
        setShowWeekPicker(false);
      };
      const weekOptions = buildWeekOptions(calYear, selMonth, locale);

      return (
        <nav className="cal-breadcrumb">
          <div className="cal-breadcrumb__picker" ref={yearPickerRef}>
            <button
              type="button"
              className="cal-breadcrumb__choice cal-breadcrumb__choice--year"
              onClick={() => setShowYearPicker(open => !open)}
              aria-haspopup="listbox"
              aria-expanded={showYearPicker}
            >
              {calYear}
            </button>
            {showYearPicker && (
              <div className="cal-breadcrumb__menu cal-breadcrumb__menu--year" role="listbox">
                {yearOptions.map(year => (
                  <button
                    key={year}
                    ref={year === calYear ? selectedYearRef : undefined}
                    type="button"
                    className={`cal-breadcrumb__option${year === calYear ? ' cal-breadcrumb__option--active' : ''}`}
                    onClick={() => {
                      setCalYear(year);
                      setShowYearPicker(false);
                    }}
                    role="option"
                    aria-selected={year === calYear}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="cal-breadcrumb__sep">›</span>
          <div className="cal-breadcrumb__picker" ref={halfPickerRef}>
            <button
              type="button"
              className="cal-breadcrumb__choice cal-breadcrumb__choice--half"
              onClick={() => setShowHalfPicker(open => !open)}
              aria-haspopup="listbox"
              aria-expanded={showHalfPicker}
            >
              {YEAR_RANGE_LABELS[yearRange]}
            </button>
            {showHalfPicker && (
              <div className="cal-breadcrumb__menu cal-breadcrumb__menu--half" role="listbox">
                {YEAR_RANGE_LABELS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`cal-breadcrumb__option${index === yearRange ? ' cal-breadcrumb__option--active' : ''}`}
                    onClick={() => selectRange(index)}
                    role="option"
                    aria-selected={index === yearRange}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="cal-breadcrumb__sep">›</span>
          <div className="cal-breadcrumb__picker" ref={weekPickerRef}>
            <button
              type="button"
              className="cal-breadcrumb__choice cal-breadcrumb__choice--week"
              onClick={() => setShowWeekPicker(open => !open)}
              aria-haspopup="listbox"
              aria-expanded={showWeekPicker}
            >
              {weekLabel}
            </button>
            {showWeekPicker && (
              <div className="cal-breadcrumb__menu cal-breadcrumb__menu--week" role="listbox">
                {weekOptions.map(option => (
                  <button
                    key={toKey(option.start)}
                    type="button"
                    className={`cal-breadcrumb__option${sameDate(option.start, selWeek) ? ' cal-breadcrumb__option--active' : ''}`}
                    onClick={() => {
                      setSelWeek(option.start);
                      setSelDay(option.start);
                      setShowWeekPicker(false);
                      setView('week');
                    }}
                    role="option"
                    aria-selected={sameDate(option.start, selWeek)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      );
    }

    if (view === 'month' || view === 'week' || view === 'day') {
      const selectMonth = (month: number) => {
        setSelMonth(month);
        setYearRange(Math.floor(month / 4));
        setSelWeek(weekStart(new Date(calYear, month, 1)));
        setSelDay(new Date(calYear, month, 1));
        setShowMonthPicker(false);
        setShowWeekPicker(false);
        setView('month');
      };

      const monthPicker = view === 'month' ? (
        <div className="cal-breadcrumb__picker" ref={monthPickerRef}>
          <button
            type="button"
            className="cal-breadcrumb__choice cal-breadcrumb__choice--month"
            onClick={() => setShowMonthPicker(open => !open)}
            aria-haspopup="listbox"
            aria-expanded={showMonthPicker}
          >
            {MONTH_NAMES[selMonth]}
          </button>
          {showMonthPicker && (
            <div className="cal-breadcrumb__menu cal-breadcrumb__menu--month" role="listbox">
              {MONTH_NAMES.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  className={`cal-breadcrumb__option${index === selMonth ? ' cal-breadcrumb__option--active' : ''}`}
                  onClick={() => selectMonth(index)}
                  role="option"
                  aria-selected={index === selMonth}
                >
                  {month}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button className="cal-breadcrumb__link" onClick={() => setView('month')}>
          {MONTH_NAMES[selMonth]}
        </button>
      );

      const weekOptions = buildWeekOptions(calYear, selMonth, locale);

      return (
        <nav className="cal-breadcrumb">
          <button className="cal-breadcrumb__link" onClick={goYearView}>{calYear}</button>
          <span className="cal-breadcrumb__sep">›</span>
          {monthPicker}
          <span className="cal-breadcrumb__sep">›</span>
          {view === 'week' ? (
            <div className="cal-breadcrumb__picker" ref={weekPickerRef}>
              <button
                type="button"
                className="cal-breadcrumb__choice cal-breadcrumb__choice--week"
                onClick={() => setShowWeekPicker(open => !open)}
                aria-haspopup="listbox"
                aria-expanded={showWeekPicker}
              >
                {weekLabel}
              </button>
              {showWeekPicker && (
                <div className="cal-breadcrumb__menu cal-breadcrumb__menu--week" role="listbox">
                  {weekOptions.map(option => (
                    <button
                      key={toKey(option.start)}
                      type="button"
                      className={`cal-breadcrumb__option${sameDate(option.start, selWeek) ? ' cal-breadcrumb__option--active' : ''}`}
                      onClick={() => {
                        setSelWeek(option.start);
                        setSelDay(option.start);
                        setShowWeekPicker(false);
                        setView('week');
                      }}
                      role="option"
                      aria-selected={sameDate(option.start, selWeek)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button className="cal-breadcrumb__link" onClick={() => setView('week')}>
              {weekLabel}
            </button>
          )}
          {view === 'day' && (
            <>
              <span className="cal-breadcrumb__sep">›</span>
              <span className="cal-breadcrumb__current">{dayLabel}</span>
            </>
          )}
        </nav>
      );
    }

    return null;
  };

  const fmtDate = (dt: string) =>
    new Date(dt).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });

  const fmtShortDate = (dt: string) =>
    new Date(dt).toLocaleDateString(locale, { month: 'short', day: 'numeric' });

  const upcomingAgenda = useMemo(() => {
    const now = Date.now();
    return [...tasks]
      .filter(t => {
        if (!t.dateTimeScheduled || t.statusID === 2) return false;
        return new Date(t.dateTimeScheduled).getTime() >= now;
      })
      .sort((a, b) => a.dateTimeScheduled!.localeCompare(b.dateTimeScheduled!));
  }, [tasks]);

  // Shared task list markup is reused by smaller calendar scopes.
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

  const renderUpcomingAgenda = () => (
    <div className="cal-section cal-section--agenda">
      <div className="cal-section__hdr">
        Upcoming
        {upcomingAgenda.length > 0 && (
          <span className="cal-badge cal-badge--sm">{upcomingAgenda.length}</span>
        )}
      </div>
      {upcomingAgenda.length === 0 ? (
        <p className="cal-empty">No upcoming scheduled tasks.</p>
      ) : (
        <ul className="cal-agenda">
          {upcomingAgenda.map(task => {
            const project = task.projectID
              ? projects.find(p => p.projectID === Number(task.projectID))
              : null;

            return (
              <li
                key={task.taskID}
                className="cal-agenda__item"
                onClick={() => onEditTask(task.taskID)}
                title="Edit task"
              >
                <span className="cal-agenda__when">
                  <span>{fmtShortDate(task.dateTimeScheduled!)}</span>
                  <span>{fmtTime(task.dateTimeScheduled!)}</span>
                </span>
                <span className="cal-agenda__body">
                  <span className="cal-agenda__title">{task.title}</span>
                  {(task.priority || project) && (
                    <span className="cal-agenda__meta">
                      {task.priority && (
                        <span className={`cal-item__priority cal-item__priority--${task.priority.toLowerCase()}`}>
                          {task.priority[0] + task.priority.slice(1).toLowerCase()}
                        </span>
                      )}
                      {project && <span className="cal-item__project-chip">{project.title}</span>}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // Year view groups each month into a compact task summary.
  if (view === 'year') {
    const rangeMonths = Array.from({ length: 4 }, (_, offset) => yearRange * 4 + offset);

    return (
      <div className="cal-card cal-card--year">
        <div className="cal-nav">
          {renderBreadcrumbs()}
          <div className="cal-nav__ctrl">
            <button className="btn btn--ghost btn--sm" onClick={onToggleHideCompleted}>
              {hideCompleted ? '👁 Show completed' : '🙈 Hide completed'}
            </button>
          </div>
        </div>

        <div className="cal-year-grid">
          {rangeMonths.map(m => {
            const name = MONTH_NAMES[m];
            const grid = buildFixedMonthGrid(calYear, m);
            return (
              <div key={m} className="cal-mini">
                <button
                  className="cal-mini__name"
                  onClick={() => {
                    setSelMonth(m);
                    setSelWeek(weekStart(new Date(calYear, m, 1)));
                    setSelDay(new Date(calYear, m, 1));
                    setView('month');
                  }}
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
                    const firstReal = realDays[0];
                    const hasWkTasks  = realDays.some(d => byDate.has(toKey(d)));
                    const isThisWeek  = realDays.some(d => toKey(d) === todayKey);
                    return (
                      <div
                        key={wi}
                        className={[
                          'cal-mini__week-row',
                          realDays.length === 0 ? 'cal-mini__week-row--empty' : '',
                          hasWkTasks ? 'cal-mini__week-row--tasks' : '',
                          isThisWeek ? 'cal-mini__week-row--current' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => {
                          if (!firstReal) return;
                          setSelMonth(m);
                          setSelWeek(weekStart(firstReal));
                          setView('week');
                        }}
                        role={firstReal ? 'button' : undefined}
                        title={firstReal ? 'View this week' : undefined}
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

        {renderUpcomingAgenda()}
      </div>
    );
  }

  // Month view lays out days in calendar grid order.
  if (view === 'month') {
    const grid = buildMonthGrid(calYear, selMonth);

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
                  onClick={() => { setSelWeek(weekStart(firstReal)); setView('week'); }}
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

  // Week view shows each day from the selected week's Monday start.
  if (view === 'week') {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selWeek);
      d.setDate(d.getDate() + i);
      return d;
    });

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

  // Day view shows tasks scheduled for the selected date.
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
