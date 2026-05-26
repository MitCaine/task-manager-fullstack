import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import type { CSSProperties, Dispatch, RefObject, SetStateAction, TouchEvent } from 'react';
import './App.css';
import type { Attachment, Note, Project, RecurrenceRule, Reminder, Subtask, Tag, Task } from './types/task';
import {
  getTasks, getTask, createTask, updateTask, deleteTask, patchTaskStatus,
  getSubtasks, createSubtask, updateSubtask as updateSubtaskAPI, patchSubtaskStatus, deleteSubtask as deleteSubtaskAPI,
  getNotes, createNote, deleteNote as deleteNoteAPI,
  getReminders, createReminder, deleteReminder as deleteReminderAPI, patchReminderDate,
  getProjects, createProject, deleteProject as deleteProjectAPI,
  getTags, createTag, updateTag as updateTagAPI, deleteTag as deleteTagAPI, addTagToTask, removeTagFromTask,
  getAttachments, createAttachment, deleteAttachment as deleteAttachmentAPI,
  getRecurrence, setRepeat,
} from './api/tasks';
import { buildDateTimeString, formatDate, formatDateTime as formatDateTimeDisplay, formatTime, extractDateParts } from './utils/dateTime';
import { isTaskOverdue } from './utils/taskUtils';
import Calendar from './components/Calendar';

type Ampm = 'AM' | 'PM';
type Theme = 'system' | 'light' | 'dark';
type SortBy = 'dueAsc' | 'dueDesc' | 'titleAsc' | 'overdueFirst' | 'priorityDesc';
type FilterStatus = 'all' | 'active' | 'completed' | 'overdue' | 'high' | 'medium' | 'low';
type MobilePage = 'add' | 'tasks' | 'calendar';
type ViewTab = 'all' | 'today' | 'week' | 'month';
type CreateOpenControl = string | null;
type RepeatFrequency = '' | 'daily' | 'weekly' | 'monthly';

function tagAccentStyle(color?: string | null): CSSProperties {
  return { '--tag-color': color ?? '#6366f1' } as CSSProperties;
}

const TASK_TIME_RANGE_ERROR = 'End time must be after start time.';

function validateTaskTimeRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  return new Date(end).getTime() > new Date(start).getTime() ? null : TASK_TIME_RANGE_ERROR;
}

function convertHourForTimeMode(hourValue: string, ampmValue: Ampm, to24Hour: boolean): { hour: string; ampm: Ampm } {
  const parsed = parseInt(hourValue, 10);
  const hour = Number.isNaN(parsed) ? 0 : parsed;
  if (to24Hour) {
    let hour24 = hour;
    if (ampmValue === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampmValue === 'AM' && hour24 === 12) hour24 = 0;
    return { hour: String(hour24).padStart(2, '0'), ampm: ampmValue };
  }
  const normalized = ((hour % 24) + 24) % 24;
  return {
    hour: String(normalized % 12 || 12).padStart(2, '0'),
    ampm: normalized >= 12 ? 'PM' : 'AM',
  };
}

function isCreateControlGroupActive(current: CreateOpenControl, control: Exclude<CreateOpenControl, null>): boolean {
  if (control === 'start') return current === 'start' || current === 'start-hour' || current === 'start-minute' || current === 'start-ampm';
  if (control === 'end') return current === 'end' || current === 'end-hour' || current === 'end-minute' || current === 'end-ampm';
  return current === control;
}

const TAG_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

const TAG_MAX_LENGTH = 18;
const PROJECT_MAX_LENGTH = 24;
const VISIBLE_TASK_TAGS = 2;

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const PRIORITY_COLOR: Record<string, string> = { LOW: '#4ade80', MEDIUM: '#fbbf24', HIGH: '#f87171' };
const MOBILE_PAGES: MobilePage[] = ['add', 'tasks', 'calendar'];
const SWIPE_IGNORE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  'label',
  '[role="button"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="listbox"]',
  '[role="dialog"]',
  '[data-create-menu-boundary]',
  '[data-create-menu-trigger]',
  '.time-select__dropdown',
  '.tag-select__dropdown',
  '.datetime-row__editor',
  '.dropdown',
  '.menu',
  '.modal',
  '.modal-overlay',
  '.item__action-menu',
  '.status-move',
].join(',');
const TASK_STATUS_OPTIONS = [
  { label: 'Active', statusID: null as number | null },
  { label: 'In Progress', statusID: 3 as number | null },
  { label: 'Done', statusID: 2 as number | null },
];
const REPEAT_OPTIONS: Array<{ value: RepeatFrequency; label: string }> = [
  { value: '', label: 'Do not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function normalizeTaskStatus(statusID: number | null | undefined): number | null {
  return statusID === 1 ? null : statusID ?? null;
}

function compactText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function shouldIgnoreSwipeStart(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(SWIPE_IGNORE_SELECTOR));
}

function formatRepeatFrequency(value: RepeatFrequency): string {
  return REPEAT_OPTIONS.find(option => option.value === value)?.label ?? 'Do not repeat';
}

function useOutsideClick(ref: RefObject<HTMLElement | null>, isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, isOpen, onClose]);
}

function getNow(): { date: string; hour: string; minute: string; ampm: Ampm } {
  const now = new Date();
  const h = now.getHours();
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    hour: String(h % 12 || 12).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0'),
    ampm: h >= 12 ? 'PM' : 'AM',
  };
}

type CloseFloatingControls = (options?: { timeEditors?: boolean; createControls?: boolean }) => void;

type TimeSelectProps = {
  id: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  sharedOpenId?: string | null;
  setSharedOpenId?: Dispatch<SetStateAction<string | null>>;
  fallbackOpenId?: string;
};

// Custom time dropdown keeps the selected option visible when opened.
function TimeSelect({
  id,
  value,
  options,
  onChange,
  openId,
  setOpenId,
  sharedOpenId,
  setSharedOpenId,
  fallbackOpenId,
}: TimeSelectProps): JSX.Element {
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const controlled = Boolean(setSharedOpenId);
  const open = controlled ? sharedOpenId === id : openId === id;

  const closeSelect = () => {
    setOpenId(null);
    setSharedOpenId?.(fallbackOpenId ?? null);
  };

  const handleOpen = () => {
    setOpenId(open ? null : id);
    setSharedOpenId?.(open ? (fallbackOpenId ?? null) : id);
  };

  useEffect(() => {
    if (!open || controlled) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) closeSelect();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, controlled, closeSelect]);

  useEffect(() => {
    if (!open || !dropRef.current) return;
    const selected = dropRef.current.querySelector('.time-select__item--on');
    if (selected instanceof HTMLElement && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  return (
    <div className="time-select">
      <button type="button" className="select time-select__btn" ref={btnRef} onClick={handleOpen} data-create-menu-trigger>
        {value}
      </button>
      {open && (
        <div className="time-select__dropdown" ref={dropRef} data-create-menu-boundary>
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              className={`time-select__item${opt === value ? ' time-select__item--on' : ''}`}
              onClick={() => { onChange(opt); closeSelect(); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type DateTimeRowProps = {
  editorScope: string;
  openTimeEditorScope: string | null;
  setOpenTimeEditorScope: Dispatch<SetStateAction<string | null>>;
  closeFloatingControls: CloseFloatingControls;
  is24Hour: boolean;
  hourOptions: string[];
  openControl?: string | null;
  setOpenControl?: Dispatch<SetStateAction<string | null>>;
  controlIds?: {
    date: string;
    start: string;
    end: string;
    startHour: string;
    startMinute: string;
    startAmpm: string;
    endHour: string;
    endMinute: string;
    endAmpm: string;
  };
  dateVal: string;
  hourVal: string;
  minuteVal: string;
  ampmVal: Ampm;
  onDate: (v: string) => void;
  onHour: (v: string) => void;
  onMinute: (v: string) => void;
  onAmpm: (v: Ampm) => void;
  showTime?: boolean;
  onToggleTime?: () => void;
  onRemoveStart?: () => void;
  showEndTime?: boolean;
  onToggleEndTime?: () => void;
  endHourVal?: string;
  endMinuteVal?: string;
  endAmpmVal?: Ampm;
  onEndHour?: (v: string) => void;
  onEndMinute?: (v: string) => void;
  onEndAmpm?: (v: Ampm) => void;
};

// Shared date and optional start/end time controls.
function DateTimeRow({
  editorScope,
  openTimeEditorScope,
  setOpenTimeEditorScope,
  closeFloatingControls,
  is24Hour,
  hourOptions,
  openControl,
  setOpenControl,
  controlIds,
  dateVal, hourVal, minuteVal, ampmVal,
  onDate, onHour, onMinute, onAmpm,
  showTime, onToggleTime, onRemoveStart,
  showEndTime, onToggleEndTime,
  endHourVal, endMinuteVal, endAmpmVal,
  onEndHour, onEndMinute, onEndAmpm,
}: DateTimeRowProps): JSX.Element {
  const [openTimeSelect, setOpenTimeSelect] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const dateControl = controlIds?.date ?? `${editorScope}:date`;
  const startControl = controlIds?.start ?? `${editorScope}:start`;
  const endControl = controlIds?.end ?? `${editorScope}:end`;
  const startHourControl = controlIds?.startHour ?? 'start-hour';
  const startMinuteControl = controlIds?.startMinute ?? 'start-minute';
  const startAmpmControl = controlIds?.startAmpm ?? 'start-ampm';
  const endHourControl = controlIds?.endHour ?? 'end-hour';
  const endMinuteControl = controlIds?.endMinute ?? 'end-minute';
  const endAmpmControl = controlIds?.endAmpm ?? 'end-ampm';
  const ownedControls = [
    dateControl,
    startControl,
    endControl,
    startHourControl,
    startMinuteControl,
    startAmpmControl,
    endHourControl,
    endMinuteControl,
    endAmpmControl,
  ];
  const controlledCreateRow = Boolean(controlIds && setOpenControl);
  const activeEditor: 'start' | 'end' | null =
    controlledCreateRow
      ? (openControl === startControl || openControl === startHourControl || openControl === startMinuteControl || openControl === startAmpmControl ? 'start' :
        openControl === endControl || openControl === endHourControl || openControl === endMinuteControl || openControl === endAmpmControl ? 'end' :
        null)
      : (openTimeEditorScope === `${editorScope}:start` ? 'start' :
        openTimeEditorScope === `${editorScope}:end` ? 'end' :
        null);

  const timeSummary = (h: string, m: string, a?: Ampm) =>
    is24Hour ? `${h}:${m}` : `${h}:${m} ${a ?? 'AM'}`;

  const setScopedTimeSelect = (next: string | null) => {
    setOpenTimeSelect(next);
  };
  const canRenderActiveEditor =
    activeEditor === 'start' ||
    (activeEditor === 'end' && Boolean(showEndTime && onEndHour && onEndMinute && onEndAmpm));

  const openDateControl = () => {
    closeFloatingControls({ createControls: false });
    setOpenTimeEditorScope(current => current?.startsWith(`${editorScope}:`) ? null : current);
    setOpenControl?.(dateControl);
  };

  const handleDateChange = (nextDate: string) => {
    onDate(nextDate);
    if (controlledCreateRow) setOpenControl?.(dateControl);
  };

  const closeTimeEditor = () => {
    setOpenTimeSelect(null);
    setOpenTimeEditorScope(current => current?.startsWith(`${editorScope}:`) ? null : current);
    setOpenControl?.(current => current && ownedControls.includes(current) ? null : current);
  };

  const openStartEditor = () => {
    if (controlledCreateRow && activeEditor === 'start') {
      closeTimeEditor();
      return;
    }
    if (!controlledCreateRow && activeEditor === 'start') {
      closeTimeEditor();
      return;
    }
    closeFloatingControls({ timeEditors: false, createControls: false });
    setOpenControl?.(startControl);
    setOpenTimeEditorScope(`${editorScope}:start`);
    if (showTime === false) onToggleTime?.();
    setOpenTimeSelect(null);
  };

  const openEndEditor = () => {
    if (controlledCreateRow && activeEditor === 'end') {
      closeTimeEditor();
      return;
    }
    if (!controlledCreateRow && activeEditor === 'end') {
      closeTimeEditor();
      return;
    }
    closeFloatingControls({ timeEditors: false, createControls: false });
    setOpenControl?.(endControl);
    setOpenTimeEditorScope(`${editorScope}:end`);
    if (!showEndTime) onToggleEndTime?.();
    setOpenTimeSelect(null);
  };

  useEffect(() => {
    if (!activeEditor || controlledCreateRow) return;
    const scopedOpen = !openControl || ownedControls.includes(openControl);
    if (!openTimeEditorScope?.startsWith(`${editorScope}:`) || !scopedOpen) closeTimeEditor();
  }, [activeEditor, openControl, openTimeEditorScope, editorScope, controlledCreateRow]);

  useEffect(() => {
    if (!activeEditor || controlledCreateRow) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.time-select__dropdown')) return;
      if (!rowRef.current?.contains(target)) closeTimeEditor();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTimeEditor();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeEditor, controlledCreateRow]);

  return (
    <div className="datetime-row" ref={rowRef}>
      <div className="datetime-row__top">
        <input
          className={`input datetime-row__date${openControl === dateControl ? ' datetime-row__date--active' : ''}`}
          type="date"
          value={dateVal}
          aria-label={`Task date ${dateVal}`}
          onClick={openDateControl}
          data-create-menu-trigger
          data-open={openControl === dateControl ? 'true' : undefined}
          onInput={e => handleDateChange((e.target as HTMLInputElement).value)}
          onChange={e => handleDateChange(e.target.value)}
        />
      </div>
      <div className="datetime-row__summary-row">
        {showTime === false ? (
          <button type="button" className="btn btn--ghost btn--sm datetime-row__time-toggle" onClick={openStartEditor} data-create-menu-trigger>
            + Start time
          </button>
        ) : (
          <div className="datetime-row__summary-wrap">
            <button type="button" className={`btn btn--ghost btn--sm datetime-row__time-summary${activeEditor === 'start' ? ' datetime-row__time-summary--active' : ''}`} onClick={openStartEditor} data-create-menu-trigger>
              <span className={`datetime-row__summary-label${activeEditor === 'start' ? ' datetime-row__summary-label--active' : ''}`}>Start:</span>
              {timeSummary(hourVal, minuteVal, ampmVal)}
            </button>
            {onRemoveStart && (
              <button
                type="button"
                className="btn btn--ghost btn--sm datetime-row__clear"
                onClick={() => { onRemoveStart(); if (activeEditor === 'start') closeTimeEditor(); }}
                aria-label="Clear start time"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {showEndTime && onEndHour && onEndMinute && onEndAmpm ? (
          <div className="datetime-row__summary-wrap">
            <button type="button" className={`btn btn--ghost btn--sm datetime-row__time-summary${activeEditor === 'end' ? ' datetime-row__time-summary--active' : ''}`} onClick={openEndEditor} data-create-menu-trigger>
              <span className={`datetime-row__summary-label${activeEditor === 'end' ? ' datetime-row__summary-label--active' : ''}`}>End:</span>
              {timeSummary(endHourVal ?? '12', endMinuteVal ?? '00', endAmpmVal)}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm datetime-row__clear"
              onClick={() => { onToggleEndTime?.(); if (activeEditor === 'end') closeTimeEditor(); }}
              aria-label="Clear end time"
            >
              ✕
            </button>
          </div>
        ) : onToggleEndTime ? (
          <button type="button" className="btn btn--ghost btn--sm datetime-row__time-toggle" onClick={openEndEditor} data-create-menu-trigger>
            + End time
          </button>
        ) : null}
      </div>
      {canRenderActiveEditor && (
        <div className="datetime-row__editor" data-create-menu-boundary>
          {activeEditor === 'start' ? (
            <div className="datetime-row__time datetime-row__time--end">
              <span className="datetime-row__end-label datetime-row__end-label--fixed">Start:</span>
              <TimeSelect
                id={startHourControl}
                value={hourVal}
                options={hourOptions}
                onChange={onHour}
                openId={openTimeSelect}
                setOpenId={setScopedTimeSelect}
                sharedOpenId={openControl}
                setSharedOpenId={setOpenControl}
                fallbackOpenId={startControl}
              />
              <span className="time-sep">:</span>
              <TimeSelect
                id={startMinuteControl}
                value={minuteVal}
                options={MINUTE_OPTIONS}
                onChange={onMinute}
                openId={openTimeSelect}
                setOpenId={setScopedTimeSelect}
                sharedOpenId={openControl}
                setSharedOpenId={setOpenControl}
                fallbackOpenId={startControl}
              />
              {!is24Hour && (
                <TimeSelect
                  id={startAmpmControl}
                  value={ampmVal}
                  options={['AM', 'PM']}
                  onChange={v => onAmpm(v as Ampm)}
                  openId={openTimeSelect}
                  setOpenId={setScopedTimeSelect}
                  sharedOpenId={openControl}
                  setSharedOpenId={setOpenControl}
                  fallbackOpenId={startControl}
                />
              )}
              <button type="button" className="btn btn--ghost btn--sm datetime-row__done" onClick={closeTimeEditor}>
                Done
              </button>
            </div>
          ) : showEndTime && onEndHour && onEndMinute && onEndAmpm ? (
            <div className="datetime-row__time datetime-row__time--end">
              <span className="datetime-row__end-label datetime-row__end-label--fixed">End:</span>
              <TimeSelect
                id={endHourControl}
                value={endHourVal ?? '12'}
                options={hourOptions}
                onChange={onEndHour}
                openId={openTimeSelect}
                setOpenId={setScopedTimeSelect}
                sharedOpenId={openControl}
                setSharedOpenId={setOpenControl}
                fallbackOpenId={endControl}
              />
              <span className="time-sep">:</span>
              <TimeSelect
                id={endMinuteControl}
                value={endMinuteVal ?? '00'}
                options={MINUTE_OPTIONS}
                onChange={onEndMinute}
                openId={openTimeSelect}
                setOpenId={setScopedTimeSelect}
                sharedOpenId={openControl}
                setSharedOpenId={setOpenControl}
                fallbackOpenId={endControl}
              />
              {!is24Hour && (
                <TimeSelect
                  id={endAmpmControl}
                  value={endAmpmVal ?? 'AM'}
                  options={['AM', 'PM']}
                  onChange={v => onEndAmpm(v as Ampm)}
                  openId={openTimeSelect}
                  setOpenId={setScopedTimeSelect}
                  sharedOpenId={openControl}
                  setSharedOpenId={setOpenControl}
                  fallbackOpenId={endControl}
                />
              )}
              <button type="button" className="btn btn--ghost btn--sm datetime-row__done" onClick={closeTimeEditor}>
                Done
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

type RecurrenceControlProps = {
  value: RepeatFrequency;
  onChange: (value: RepeatFrequency) => void;
  openControl: string | null;
  onToggle: () => void;
  onClose: () => void;
  controlId: string;
  menuScope: 'create' | 'inline-edit';
};

function RecurrenceControl({
  value,
  onChange,
  openControl,
  onToggle,
  onClose,
  controlId,
  menuScope,
}: RecurrenceControlProps): JSX.Element {
  const open = openControl === controlId;
  const triggerAttrs = menuScope === 'create'
    ? { 'data-create-menu-trigger': true }
    : { 'data-inline-edit-menu-trigger': true };
  const boundaryAttrs = menuScope === 'create'
    ? { 'data-create-menu-boundary': true }
    : { 'data-inline-edit-menu-boundary': true };

  return (
    <div className="tag-select recurrence-select">
      <button
        type="button"
        className={`select tag-select__btn recurrence-select__btn${value ? ' tag-select__btn--active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        {...triggerAttrs}
      >
        <span className="recurrence-select__label">Repeat</span>
        <span className={`recurrence-select__value${value ? ' recurrence-select__value--active' : ''}`}>{formatRepeatFrequency(value)}</span>
      </button>
      {open && (
        <div className="tag-select__dropdown recurrence-select__dropdown" role="menu" {...boundaryAttrs}>
          {REPEAT_OPTIONS.map(option => (
            <button
              key={option.value || 'none'}
              type="button"
              role="menuitem"
              className={`tag-select__item${value === option.value ? ' tag-select__item--on' : ''}`}
              onClick={() => {
                onChange(option.value);
                onClose();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function App(): JSX.Element {
  // Tasks loaded from the API and top-level request state.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workspace label is persisted locally because it is UI-only.
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem('workspaceName') ?? 'Task Manager');
  const [editingWorkspaceName, setEditingWorkspaceName] = useState(false);

  // Draft values for the task creation form.
  const [input, setInput] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [description, setDescription] = useState('');
  const { date: initDate, hour: initHour, minute: initMinute, ampm: initAmpm } = getNow();
  const [date, setDate] = useState(initDate);
  const [hour, setHour] = useState(initHour);
  const [minute, setMinute] = useState(initMinute);
  const [ampm, setAmpm] = useState<Ampm>(initAmpm);
  const [showAddTime, setShowAddTime] = useState(false);
  const [showAddEndTime, setShowAddEndTime] = useState(false);
  const [endHour, setEndHour] = useState('12');
  const [endMinute, setEndMinute] = useState('00');
  const [endAmpm, setEndAmpm] = useState<Ampm>('AM');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | ''>('');
  const [newRepeatFrequency, setNewRepeatFrequency] = useState<RepeatFrequency>('');

  // UI preferences and transient dropdown state.
  const [is24Hour, setIs24Hour] = useState(false);
  const [isEuropeanDate, setIsEuropeanDate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsRestoreFocusRef = useRef<HTMLElement | null>(null);
  const wasSettingsOpenRef = useRef(false);
  const [showInlineTag, setShowInlineTag] = useState(false);
  const [newTaskTagIDs, setNewTaskTagIDs] = useState<number[]>([]);
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'system'
  );

  // List controls applied before rendering tasks.
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('dueAsc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Draft values for the selected task editor.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editHour, setEditHour] = useState('12');
  const [editMinute, setEditMinute] = useState('00');
  const [editAmpm, setEditAmpm] = useState<Ampm>('AM');
  const [editShowTime, setEditShowTime] = useState(false);
  const [editShowEndTime, setEditShowEndTime] = useState(false);
  const [editEndHour, setEditEndHour] = useState('12');
  const [editEndMinute, setEditEndMinute] = useState('00');
  const [editEndAmpm, setEditEndAmpm] = useState<Ampm>('AM');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | ''>('');
  const [editTaskTagIDs, setEditTaskTagIDs] = useState<number[]>([]);
  const [showEditPriorityDropdown, setShowEditPriorityDropdown] = useState(false);
  const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
  const [showEditTagDropdown, setShowEditTagDropdown] = useState(false);
  const [showInlineEditProject, setShowInlineEditProject] = useState(false);
  const [showInlineEditTag, setShowInlineEditTag] = useState(false);
  const [inlineEditOpenControl, setInlineEditOpenControl] = useState<string | null>(null);

  // Delete confirmation is tracked by task ID.
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Detail panel state for the selected task.
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // Related task data is cached by task ID after a panel section is opened.
  const [subtasks, setSubtasks] = useState<Record<number, Subtask[]>>({});
  const [notes, setNotes] = useState<Record<number, Note[]>>({});
  const [reminders, setReminders] = useState<Record<number, Reminder[]>>({});

  // Draft values for panel section forms.
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderHour, setNewReminderHour] = useState('09');
  const [newReminderMinute, setNewReminderMinute] = useState('00');
  const [newReminderAmpm, setNewReminderAmpm] = useState<Ampm>('AM');
  const [newReminderMessage, setNewReminderMessage] = useState('');

  // Calendar-specific display preferences.
  const [calHideCompleted, setCalHideCompleted] = useState(false);

  // Bulk selection state for list actions.
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
  const [statusMoveTask, setStatusMoveTask] = useState<Task | null>(null);
  const statusFirstActionRef = useRef<HTMLButtonElement>(null);
  const statusRestoreFocusRef = useRef<HTMLElement | null>(null);
  const wasStatusMoveOpenRef = useRef(false);
  const [openActionTaskId, setOpenActionTaskId] = useState<number | null>(null);

  // Stats modal visibility.
  const [showStats, setShowStats] = useState(false);
  const statsTriggerRef = useRef<HTMLButtonElement>(null);
  const statsCloseRef = useRef<HTMLButtonElement>(null);
  const statsRestoreFocusRef = useRef<HTMLElement | null>(null);
  const wasStatsOpenRef = useRef(false);
  const [openTimeEditorScope, setOpenTimeEditorScope] = useState<string | null>(null);
  const [openCreateControl, setOpenCreateControl] = useState<CreateOpenControl>(null);

  // Reminder toasts are queued independently from persisted reminders.
  type Toast = { id: number; reminderID: number; taskID: number; taskTitle: string; message: string };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const [mobilePage, setMobilePage] = useState<MobilePage>('tasks');
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const taskLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskLongPressTriggered = useRef(false);
  const previousIs24HourRef = useRef(is24Hour);

  // Link attachments are loaded lazily per task.
  const [attachments, setAttachments] = useState<Record<number, Attachment[]>>({});
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentLabel, setNewAttachmentLabel] = useState('');

  const rememberCurrentFocus = (targetRef: { current: HTMLElement | null }) => {
    targetRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };

  const restoreFocusIfAppropriate = (targetRef: { current: HTMLElement | null }) => {
    const target = targetRef.current;
    targetRef.current = null;
    const active = document.activeElement;
    const shouldRestore = !active || active === document.body || (active instanceof HTMLElement && !active.isConnected);
    if (shouldRestore && target?.isConnected) target.focus();
  };

  // Repeat editor keeps the persisted value so autosave can detect changes.
  const [editRepeatFrequency, setEditRepeatFrequency] = useState<RepeatFrequency>('');
  const [originalRepeatFrequency, setOriginalRepeatFrequency] = useState<string>('');

  // Project lists and selectors shared by create and edit flows.
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectID, setNewProjectID] = useState<number | ''>('');
  const [editProjectID, setEditProjectID] = useState<number | ''>('');
  const [filterProjectID, setFilterProjectID] = useState<number | ''>('');
  const [showInlineProject, setShowInlineProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  // Tag lists, filters, and inline color editing state.
  const [tags, setTags] = useState<Tag[]>([]);
  const [expandedTagTaskIds, setExpandedTagTaskIds] = useState<Set<number>>(new Set());
  const [filterTagID, setFilterTagID] = useState<number | ''>('');
  const [newTagTitle, setNewTagTitle] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [colorPickerTagId, setColorPickerTagId] = useState<number | null>(null);

  // Element refs used for shortcuts, dropdown positioning, and focus return.
  const titleInputRef = useRef<HTMLInputElement>(null);
  const workspaceInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const createControlsRef = useRef<HTMLDivElement>(null);
  const inlineTagInputRef = useRef<HTMLInputElement>(null);
  const inlineProjectInputRef = useRef<HTMLInputElement>(null);
  const editPriorityDropdownRef = useRef<HTMLDivElement>(null);
  const editProjectDropdownRef = useRef<HTMLDivElement>(null);
  const editTagDropdownRef = useRef<HTMLDivElement>(null);
  const inlineEditProjectInputRef = useRef<HTMLInputElement>(null);
  const inlineEditTagInputRef = useRef<HTMLInputElement>(null);

  // Refs keep the debounced auto-save callback pointed at current state.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const saveEditRef  = useRef<(task: Task) => Promise<void>>(async () => {});
  const tasksRef     = useRef<Task[]>([]);

  // Prevent the same due reminder from opening duplicate toasts.
  const firedReminders = useRef<Set<number>>(new Set());

  // Initial API hydration.
  useEffect(() => {
    getTasks()
      .then(data => { setTasks(data); setLoading(false); })
      .catch(() => { setError('Failed to load tasks. Is the backend running?'); setLoading(false); });
    getProjects().then(setProjects).catch(() => {});
    getTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    const isTextInputFocused = () => {
      const active = document.activeElement;
      if (!active) return false;
      return active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
    };

    const setStableViewportHeight = (force = false) => {
      if (!force && isTextInputFocused()) return;
      document.documentElement.style.setProperty('--app-viewport-height', `${window.innerHeight}px`);
    };

    const handleResize = () => setStableViewportHeight(false);
    const handleOrientationChange = () => {
      window.setTimeout(() => setStableViewportHeight(true), 250);
    };

    setStableViewportHeight(true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        if (statusMoveTask !== null) { setStatusMoveTask(null); return; }
        if (showStats) { setShowStats(false); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (selectedTaskId !== null) { closePanel(); return; }
        if (
          openCreateControl !== null ||
          inlineEditOpenControl !== null ||
          openTimeEditorScope !== null ||
          openActionTaskId !== null ||
          showEditPriorityDropdown ||
          showEditProjectDropdown ||
          showEditTagDropdown
        ) {
          closeFloatingControls();
          return;
        }
        if (search !== '') { setSearch(''); return; }
        if (bulkMode) { setBulkMode(false); setBulkSelectedIds(new Set()); return; }
      }
      if (inInput) return;
      if ((e.key === 'n' || e.key === 'N') && !inInput) {
        e.preventDefault();
        titleInputRef.current?.focus();
      }
      if (e.key === '/' && !inInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    selectedTaskId,
    statusMoveTask,
    search,
    bulkMode,
    showStats,
    showSettings,
    openCreateControl,
    inlineEditOpenControl,
    openTimeEditorScope,
    openActionTaskId,
    showEditPriorityDropdown,
    showEditProjectDropdown,
    showEditTagDropdown,
  ]); // closePanel is intentionally excluded — it's recreated every render

  useOutsideClick(editPriorityDropdownRef, showEditPriorityDropdown, () => setShowEditPriorityDropdown(false));
  useOutsideClick(editProjectDropdownRef,  showEditProjectDropdown,  () => setShowEditProjectDropdown(false));
  useOutsideClick(editTagDropdownRef,      showEditTagDropdown,      () => setShowEditTagDropdown(false));
  useOutsideClick(settingsRef,             showSettings,             () => setShowSettings(false));

  useEffect(() => {
    if (showStats) {
      statsCloseRef.current?.focus();
    } else if (wasStatsOpenRef.current) {
      restoreFocusIfAppropriate(statsRestoreFocusRef);
    }
    wasStatsOpenRef.current = showStats;
  }, [showStats]);

  useEffect(() => {
    if (!showSettings && wasSettingsOpenRef.current) {
      restoreFocusIfAppropriate(settingsRestoreFocusRef);
    }
    wasSettingsOpenRef.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    if (statusMoveTask) {
      statusFirstActionRef.current?.focus();
    } else if (wasStatusMoveOpenRef.current) {
      restoreFocusIfAppropriate(statusRestoreFocusRef);
    }
    wasStatusMoveOpenRef.current = statusMoveTask !== null;
  }, [statusMoveTask]);

  useEffect(() => {
    if (!openCreateControl) return;
    const handler = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-create-menu-trigger]')) return;
      if (target.closest('[data-create-menu-boundary]')) return;
      setOpenCreateControl(null);
      setOpenTimeEditorScope(null);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [openCreateControl]);

  useEffect(() => {
    if (!inlineEditOpenControl) return;
    const handler = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-create-menu-trigger]')) return;
      if (target.closest('[data-create-menu-boundary]')) return;
      if (target.closest('[data-inline-edit-menu-trigger]')) return;
      if (target.closest('[data-inline-edit-menu-boundary]')) return;
      setInlineEditOpenControl(null);
      setOpenTimeEditorScope(null);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [inlineEditOpenControl]);

  useEffect(() => {
    if (openActionTaskId === null) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.item__actions')) setOpenActionTaskId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openActionTaskId]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Poll loaded reminders and enqueue an in-app toast once each reminder is due.
  useEffect(() => {
    const allReminders = Object.values(reminders).flat();
    if (allReminders.length === 0) return;
    const check = () => {
      const now = new Date();
      for (const r of allReminders) {
        if (firedReminders.current.has(r.reminderID)) continue;
        if (new Date(r.dueDate) <= now) {
          const task = tasks.find(t => t.taskID === r.taskID);
          firedReminders.current.add(r.reminderID);
          setToasts(prev => [...prev, {
            id: ++toastIdRef.current,
            reminderID: r.reminderID,
            taskID: r.taskID,
            taskTitle: task?.title ?? 'Task',
            message: r.message || 'Reminder due.',
          }]);
        }
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [reminders, tasks]);

  // Derived view data.
  const hourOptions = useMemo(
    () => is24Hour
      ? Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
      : ['12', ...Array.from({ length: 11 }, (_, i) => String(i + 1).padStart(2, '0'))],
    [is24Hour]
  );

  useEffect(() => {
    if (previousIs24HourRef.current === is24Hour) return;
    previousIs24HourRef.current = is24Hour;

    if (showAddTime) {
      const converted = convertHourForTimeMode(hour, ampm, is24Hour);
      setHour(converted.hour);
      setAmpm(converted.ampm);
    }
    if (showAddEndTime) {
      const converted = convertHourForTimeMode(endHour, endAmpm, is24Hour);
      setEndHour(converted.hour);
      setEndAmpm(converted.ampm);
    }
    if (editShowTime) {
      const converted = convertHourForTimeMode(editHour, editAmpm, is24Hour);
      setEditHour(converted.hour);
      setEditAmpm(converted.ampm);
    }
    if (editShowEndTime) {
      const converted = convertHourForTimeMode(editEndHour, editEndAmpm, is24Hour);
      setEditEndHour(converted.hour);
      setEditEndAmpm(converted.ampm);
    }
    const convertedReminder = convertHourForTimeMode(newReminderHour, newReminderAmpm, is24Hour);
    setNewReminderHour(convertedReminder.hour);
    setNewReminderAmpm(convertedReminder.ampm);
  }, [
    is24Hour,
    showAddTime,
    hour,
    ampm,
    showAddEndTime,
    endHour,
    endAmpm,
    editShowTime,
    editHour,
    editAmpm,
    editShowEndTime,
    editEndHour,
    editEndAmpm,
    newReminderHour,
    newReminderAmpm,
  ]);

  const locale = isEuropeanDate ? 'en-GB' : 'en-US';

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (filterStatus === 'active')         list = list.filter(t => t.statusID !== 2);
    else if (filterStatus === 'completed') list = list.filter(t => t.statusID === 2);
    else if (filterStatus === 'overdue')   list = list.filter(t => isTaskOverdue(t));
    else if (filterStatus === 'high')      list = list.filter(t => t.priority === 'HIGH');
    else if (filterStatus === 'medium')    list = list.filter(t => t.priority === 'MEDIUM');
    else if (filterStatus === 'low')       list = list.filter(t => t.priority === 'LOW');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    }
    const doneToBottom = (sorted: typeof list) => {
      if (filterStatus === 'completed') return sorted; // already filtered to done-only
      return sorted.sort((a, b) => (a.statusID === 2 ? 1 : 0) - (b.statusID === 2 ? 1 : 0));
    };
    if (sortBy === 'dueDesc')       return doneToBottom([...list].sort((a, b) => (b.dateTimeScheduled ?? '').localeCompare(a.dateTimeScheduled ?? '')));
    if (sortBy === 'titleAsc')      return doneToBottom([...list].sort((a, b) => a.title.localeCompare(b.title)));
    if (sortBy === 'priorityDesc')  return doneToBottom([...list].sort((a, b) =>
      (PRIORITY_ORDER[a.priority ?? ''] ?? 3) - (PRIORITY_ORDER[b.priority ?? ''] ?? 3)
    ));
    if (sortBy === 'overdueFirst')  return doneToBottom([...list].sort((a, b) => {
      const aO = isTaskOverdue(a) ? 0 : 1;
      const bO = isTaskOverdue(b) ? 0 : 1;
      return aO - bO || (a.dateTimeScheduled ?? '').localeCompare(b.dateTimeScheduled ?? '');
    }));
    // dueAsc keeps unscheduled tasks behind scheduled work while preserving the done-to-bottom rule.
    return doneToBottom([...list].sort((a, b) => (a.dateTimeScheduled ?? '').localeCompare(b.dateTimeScheduled ?? '')));
  }, [tasks, search, filterStatus, sortBy]);

  const { completedCount, overdueCount } = useMemo(() => {
    let completedCount = 0;
    let overdueCount = 0;
    for (const task of tasks) {
      if (task.statusID === 2) completedCount += 1;
      if (isTaskOverdue(task)) overdueCount += 1;
    }
    return { completedCount, overdueCount };
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    let list = filteredTasks;
    if (filterProjectID !== '') list = list.filter(t => Number(t.projectID) === Number(filterProjectID));
    if (filterTagID !== '')     list = list.filter(t => t.tags?.some(tag => Number(tag.tagID) === Number(filterTagID)));
    return list;
  }, [filteredTasks, filterProjectID, filterTagID]);

  const tabTasks = useMemo(() => {
    const now = new Date();
    if (viewTab === 'today') {
      return displayedTasks.filter(t => {
        if (!t.dateTimeScheduled) return false;
        return new Date(t.dateTimeScheduled).toDateString() === now.toDateString();
      });
    }
    if (viewTab === 'week') {
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 7);
      return displayedTasks.filter(t => {
        if (!t.dateTimeScheduled) return false;
        const d = new Date(t.dateTimeScheduled);
        return d >= mon && d < sun;
      });
    }
    if (viewTab === 'month') {
      return displayedTasks.filter(t => {
        if (!t.dateTimeScheduled) return false;
        const d = new Date(t.dateTimeScheduled);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    return displayedTasks;
  }, [displayedTasks, viewTab]);

  const calTasks = useMemo(
    () => calHideCompleted ? tasks.filter(t => t.statusID !== 2) : tasks,
    [tasks, calHideCompleted]
  );

  const themeLabel: Record<Theme, string> = { system: '💻 System', light: '☀️ Light', dark: '🌙 Dark' };

  // Date and time formatting helpers used by the form controls.
  const fmtDate = (dt: string | null | undefined) => formatDate(dt, locale, is24Hour) || 'No due date';
  const fmtTaskDateRange = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return 'No due date';
    if (!end) return fmtDate(start);
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return fmtDate(start);
    const startLabel = formatDate(start, locale, is24Hour);
    const sameDay = startDate.toDateString() === endDate.toDateString();
    const endLabel = sameDay
      ? formatTime(end, is24Hour)
      : formatDate(end, locale, is24Hour);
    return `${startLabel} - ${endLabel}`;
  };

  const formatDateTime = (dt: string) => formatDateTimeDisplay(dt, locale, is24Hour);

  const draftDateTimeScheduled = date
    ? (showAddTime ? buildDateTimeString(date, hour, minute, ampm, is24Hour) : `${date}T00:00:00`)
    : null;
  const draftEndDateTimeScheduled = date && showAddEndTime
    ? buildDateTimeString(date, endHour, endMinute, endAmpm, is24Hour)
    : null;
  const draftProject = newProjectID !== '' ? projects.find(p => p.projectID === newProjectID) : null;
  const draftTags = tags.filter(tag => newTaskTagIDs.includes(tag.tagID));
  const currentCreateTimeRangeError = validateTaskTimeRange(draftDateTimeScheduled, draftEndDateTimeScheduled);
  const draftEditDateTimeScheduled = editDate
    ? (editShowTime
        ? buildDateTimeString(editDate, editHour, editMinute, editAmpm, is24Hour)
        : `${editDate}T00:00:00`)
    : null;
  const draftEditEndDateTimeScheduled = editDate && editShowEndTime
    ? buildDateTimeString(editDate, editEndHour, editEndMinute, editEndAmpm, is24Hour)
    : null;
  const currentEditTimeRangeError = validateTaskTimeRange(draftEditDateTimeScheduled, draftEditEndDateTimeScheduled);

  const closeFloatingControls = (options: { timeEditors?: boolean; createControls?: boolean } = {}) => {
    setShowEditPriorityDropdown(false);
    setShowEditProjectDropdown(false);
    setShowEditTagDropdown(false);
    setOpenActionTaskId(null);
    setShowSettings(false);
    setShowStats(false);
    setStatusMoveTask(null);
    setInlineEditOpenControl(null);
    if (options.timeEditors !== false) setOpenTimeEditorScope(null);
    if (options.createControls !== false) setOpenCreateControl(null);
  };

  const toggleStatsPanel = () => {
    const next = !showStats;
    if (next) rememberCurrentFocus(statsRestoreFocusRef);
    closeFloatingControls();
    setShowStats(next);
  };

  const toggleSettingsPanel = () => {
    const next = !showSettings;
    if (next) rememberCurrentFocus(settingsRestoreFocusRef);
    closeFloatingControls();
    setShowSettings(next);
  };

  const openStatusMoveDialog = (task: Task) => {
    rememberCurrentFocus(statusRestoreFocusRef);
    closeFloatingControls();
    setStatusMoveTask(task);
  };

  const toggleCreateDropdown = (control: 'priority' | 'project' | 'tags' | 'repeat') => {
    closeFloatingControls({ createControls: false });
    setOpenCreateControl(current => isCreateControlGroupActive(current, control) ? null : control);
  };

  const toggleInlineEditDropdown = (control: 'project' | 'tags' | 'repeat') => {
    closeFloatingControls({ timeEditors: false });
    setOpenTimeEditorScope(null);
    setInlineEditOpenControl(current => current === control ? null : control);
  };

  // Task create, update, completion, and focus handlers.
  const toggleAddEndTime = () => {
    if (showAddEndTime) { setShowAddEndTime(false); return; }
    if (is24Hour) {
      const h = (parseInt(hour, 10) + 1) % 24;
      setEndHour(String(h).padStart(2, '0'));
    } else {
      let h24 = ampm === 'PM' ? (parseInt(hour, 10) % 12) + 12 : parseInt(hour, 10) % 12;
      h24 = (h24 + 1) % 24;
      setEndAmpm(h24 >= 12 ? 'PM' : 'AM');
      setEndHour(String(h24 % 12 || 12).padStart(2, '0'));
    }
    setEndMinute(minute);
    setShowAddEndTime(true);
  };

  const addTask = async () => {
    if (input.trim() === '') {
      setTitleError(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setTitleError(true)));
      return;
    }
    const dateTimeScheduled = date
      ? (showAddTime
          ? buildDateTimeString(date, hour, minute, ampm, is24Hour)
          : `${date}T00:00:00`)
      : null;
    const endDateTimeScheduled = date && showAddEndTime
      ? buildDateTimeString(date, endHour, endMinute, endAmpm, is24Hour)
      : null;
    const rangeError = validateTaskTimeRange(dateTimeScheduled, endDateTimeScheduled);
    if (rangeError) {
      return;
    }
    try {
      const saved = await createTask({ title: input.trim(), description: description.trim(), dateTimeScheduled, endDateTimeScheduled, priority: newPriority || null, projectID: newProjectID !== '' ? newProjectID : null });
      let taskForState = saved;
      if (newRepeatFrequency) {
        const repeated = await setRepeat(saved.taskID, newRepeatFrequency);
        taskForState = { ...saved, recurrenceRuleID: repeated.recurrenceRuleID ?? null };
      }
      if (newTaskTagIDs.length > 0) {
        await Promise.all(newTaskTagIDs.map(tagId => addTagToTask(saved.taskID, tagId)));
        const tagObjects = tags.filter(t => newTaskTagIDs.includes(t.tagID));
        taskForState = { ...taskForState, tags: tagObjects };
      }
      setTasks(prev => [...prev, taskForState]);
      setInput('');
      setDescription('');
      setNewPriority('');
      setNewRepeatFrequency('');
      setNewProjectID('');
      setNewTaskTagIDs([]);
      setShowAddTime(false);
      setShowAddEndTime(false);
      const n = getNow();
      setDate(n.date); setHour(n.hour); setMinute(n.minute); setAmpm(n.ampm);
    } catch {
      setError('Failed to create task.');
    }
  };

  const completeRecurringTask = async (task: Task, rule: RecurrenceRule) => {
    const base = task.dateTimeScheduled ? new Date(task.dateTimeScheduled) : new Date();
    const next = new Date(base);
    const advance = () => {
      if (rule.frequency === 'daily')   next.setDate(next.getDate() + 1);
      if (rule.frequency === 'weekly')  next.setDate(next.getDate() + 7);
      if (rule.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
    };
    advance();
    const now = new Date();
    while (next < now) advance();
    const nextDt = new Date(next.getTime() - next.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    const nextEndDateTimeScheduled = (() => {
      if (!task.endDateTimeScheduled || !task.dateTimeScheduled) return null;
      const durationMs = new Date(task.endDateTimeScheduled).getTime() - new Date(task.dateTimeScheduled).getTime();
      if (!Number.isFinite(durationMs)) return null;
      const nextEnd = new Date(next.getTime() + durationMs);
      return new Date(nextEnd.getTime() - nextEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    })();
    const nextTask = await createTask({
      title: task.title, description: task.description ?? '',
      endDateTimeScheduled: nextEndDateTimeScheduled,
      dateTimeScheduled: nextDt, userID: task.userID, statusID: null,
      priority: task.priority ?? null, projectID: task.projectID ?? null,
    });
    if (task.tags?.length) {
      await Promise.all(task.tags.map(tag => addTagToTask(nextTask.taskID, tag.tagID)));
      nextTask.tags = task.tags;
    }
    await setRepeat(nextTask.taskID, rule.frequency);
    const fresh = await getTask(nextTask.taskID);
    await deleteTask(task.taskID);
    const replacementTask = { ...nextTask, recurrenceRuleID: fresh.recurrenceRuleID };
    setTasks(prev => [
      ...prev.filter(t => t.taskID !== task.taskID),
      replacementTask,
    ]);
    if (selectedTaskId === task.taskID) setSelectedTaskId(null);
    // Highlight the next occurrence after it becomes visible in the list.
    setTimeout(() => {
      const el = document.getElementById(`task-${nextTask.taskID}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('item--highlight');
      setTimeout(() => el.classList.remove('item--highlight'), 1200);
    }, 50);
    return replacementTask;
  };

  const getExistingRecurrenceRule = async (task: Task): Promise<RecurrenceRule | null> => {
    if (task.recurrenceRuleID === null) return null;
    if (task.recurrenceRuleID === undefined) {
      try {
        return await getRecurrence(task.taskID);
      } catch {
        return null;
      }
    }
    return getRecurrence(task.taskID);
  };

  const toggleComplete = async (task: Task) => {
    const currentStatusID = normalizeTaskStatus(task.statusID);
    // Completing an active recurring task creates its next scheduled occurrence.
    if (task.recurrenceRuleID && currentStatusID !== 2) {
      try {
        const rule = await getRecurrence(task.taskID);
        await completeRecurringTask(task, rule);
      } catch {
        setError('Failed to complete recurring task.');
      }
      return;
    }

    // Non-recurring tasks only toggle between active and done.
    const newStatusID = currentStatusID === 2 ? null : 2;
    try {
      const saved = await patchTaskStatus(task.taskID, newStatusID);
      setTasks(prev => prev.map(t => t.taskID === saved.taskID ? saved : t));
    } catch {
      setError('Failed to update task status.');
    }
  };

  const moveTaskToStatus = async (task: Task, statusID: number | null) => {
    setStatusMoveTask(null);
    if (statusID === 2 && task.recurrenceRuleID && normalizeTaskStatus(task.statusID) !== 2) {
      await toggleComplete(task);
      return;
    }
    try {
      const saved = await patchTaskStatus(task.taskID, statusID);
      setTasks(prev => prev.map(t => t.taskID === saved.taskID ? saved : t));
    } catch {
      setError('Failed to move task.');
    }
  };

  const beginTaskLongPress = (task: Task) => {
    if (bulkMode) return;
    if (taskLongPressTimer.current) clearTimeout(taskLongPressTimer.current);
    taskLongPressTriggered.current = false;
    taskLongPressTimer.current = setTimeout(() => {
      taskLongPressTriggered.current = true;
      openStatusMoveDialog(task);
    }, 450);
  };

  const cancelTaskLongPress = () => {
    if (taskLongPressTimer.current) clearTimeout(taskLongPressTimer.current);
    taskLongPressTimer.current = null;
  };

  const handleTaskCardClick = (task: Task) => {
    if (taskLongPressTriggered.current) {
      taskLongPressTriggered.current = false;
      return;
    }
    bulkMode ? toggleBulkSelect(task.taskID) : openPanel(task);
  };

  const handleEditTaskAction = (task: Task) => {
    setOpenActionTaskId(null);
    setSelectedTaskId(null);
    startEdit(task);
  };

  const handleDuplicateTaskAction = (task: Task) => {
    setOpenActionTaskId(null);
    duplicateTask(task);
  };

  const handleDeleteTaskAction = (taskId: number) => {
    setOpenActionTaskId(null);
    setConfirmDeleteId(taskId);
  };

  const startEdit = async (task: Task) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditingId(task.taskID);
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditPriority(task.priority ?? '');
    setEditProjectID(task.projectID ?? '');
    setEditShowEndTime(false);
    setShowEditPriorityDropdown(false);
    setShowEditProjectDropdown(false);
    setShowEditTagDropdown(false);
    setShowInlineEditProject(false);
    setShowInlineEditTag(false);
    setInlineEditOpenControl(null);
    if (task.dateTimeScheduled) {
      const parts = extractDateParts(task.dateTimeScheduled, is24Hour);
      const dt = new Date(task.dateTimeScheduled);
      const isMidnight = dt.getHours() === 0 && dt.getMinutes() === 0 && dt.getSeconds() === 0;
      setEditShowTime(!isMidnight);
      setEditDate(parts.date);
      setEditHour(parts.hour);
      setEditMinute(parts.minute);
      setEditAmpm(parts.ampm);
    } else {
      setEditShowTime(false);
      setEditDate(''); setEditHour('12'); setEditMinute('00'); setEditAmpm('AM');
    }
    if (task.endDateTimeScheduled) {
      const endParts = extractDateParts(task.endDateTimeScheduled, is24Hour);
      setEditShowEndTime(true);
      setEditEndHour(endParts.hour);
      setEditEndMinute(endParts.minute);
      setEditEndAmpm(endParts.ampm);
    } else {
      setEditShowEndTime(false);
      setEditEndHour('12'); setEditEndMinute('00'); setEditEndAmpm('AM');
    }
    // Reload the task so the panel starts with the backend's tag ordering.
    try {
      const fresh = await getTask(task.taskID);
      setEditTaskTagIDs((fresh.tags ?? []).map(t => t.tagID));
      setTasks(prev => prev.map(t => t.taskID === fresh.taskID ? { ...t, tags: fresh.tags } : t));
    } catch {
      setEditTaskTagIDs((task.tags ?? []).map(t => t.tagID));
    }
    // The task only stores a rule ID, so load the rule before editing repeat.
    if (!task.recurrenceRuleID) {
      setEditRepeatFrequency(''); setOriginalRepeatFrequency('');
    } else {
      getRecurrence(task.taskID)
        .then(rule => {
          const freq = rule.frequency as RepeatFrequency;
          setEditRepeatFrequency(freq); setOriginalRepeatFrequency(freq);
        })
        .catch(() => { setEditRepeatFrequency(''); setOriginalRepeatFrequency(''); });
    }
  };

  const cancelEdit = () => setEditingId(null);

  const focusTaskById = (taskId: number) => {
    // Reset list controls before jumping to the opened task.
    setSearch('');
    setFilterStatus('all');
    setFilterProjectID('');
    setFilterTagID('');
    // Wait for React to render the task before scrolling to it.
    setTimeout(() => {
      const el = document.getElementById(`task-${taskId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('item--highlight');
      setTimeout(() => el.classList.remove('item--highlight'), 1200);
    }, 50);
  };

  const toggleEditEndTime = () => {
    if (editShowEndTime) { setEditShowEndTime(false); return; }
    if (is24Hour) {
      const h = (parseInt(editHour, 10) + 1) % 24;
      setEditEndHour(String(h).padStart(2, '0'));
    } else {
      let h24 = editAmpm === 'PM' ? (parseInt(editHour, 10) % 12) + 12 : parseInt(editHour, 10) % 12;
      h24 = (h24 + 1) % 24;
      setEditEndAmpm(h24 >= 12 ? 'PM' : 'AM');
      setEditEndHour(String(h24 % 12 || 12).padStart(2, '0'));
    }
    setEditEndMinute(editMinute);
    setEditShowEndTime(true);
  };

  const shiftTime = (unit: 'hour' | 'day') => {
    // Use the edit form as the base date; fall back to the current clock when empty.
    let base: Date;
    if (editDate) {
      const [ey, em, ed] = editDate.split('-').map(Number);
      if (editShowTime) {
        let hr = parseInt(editHour, 10);
        if (!is24Hour) {
          if (editAmpm === 'PM' && hr !== 12) hr += 12;
          if (editAmpm === 'AM' && hr === 12) hr = 0;
        }
        base = new Date(ey, em - 1, ed, hr, parseInt(editMinute, 10));
      } else {
        // Date-only tasks preserve midnight unless the hour shortcut needs a wall-clock time.
        const now = new Date();
        base = new Date(ey, em - 1, ed, unit === 'hour' ? now.getHours() : 0, unit === 'hour' ? now.getMinutes() : 0);
      }
    } else {
      base = new Date();
    }

    if (unit === 'hour') {
      base = new Date(base.getTime() + 60 * 60 * 1000);
    } else {
      base = new Date(base.getTime() + 24 * 60 * 60 * 1000);
    }

    const newY = base.getFullYear();
    const newMo = base.getMonth() + 1;
    const newD = base.getDate();
    setEditDate(`${newY}-${String(newMo).padStart(2, '0')}-${String(newD).padStart(2, '0')}`);

    if (unit === 'hour') {
      const h24 = base.getHours();
      const mins = String(base.getMinutes()).padStart(2, '0');
      if (is24Hour) {
        setEditHour(String(h24).padStart(2, '0'));
      } else {
        setEditAmpm(h24 >= 12 ? 'PM' : 'AM');
        setEditHour(String(h24 % 12 || 12).padStart(2, '0'));
      }
      setEditMinute(mins);
      setEditShowTime(true);
    }
    // The day shortcut keeps the task's current time selection.

    scheduleAutoSave(0);
  };

  const saveEdit = async (task: Task) => {
    const dateTimeScheduled = editDate
      ? (editShowTime
          ? buildDateTimeString(editDate, editHour, editMinute, editAmpm, is24Hour)
          : `${editDate}T00:00:00`)
      : null;
    const endDateTimeScheduled = editDate && editShowEndTime
      ? buildDateTimeString(editDate, editEndHour, editEndMinute, editEndAmpm, is24Hour)
      : null;
    const rangeError = validateTaskTimeRange(dateTimeScheduled, endDateTimeScheduled);
    if (rangeError) {
      return;
    }
    try {
      const saved = await updateTask(task.taskID, {
        title: editTitle.trim() || task.title,
        description: editDescription.trim(),
        dateTimeScheduled,
        endDateTimeScheduled,
        userID: task.userID,
        statusID: task.statusID,
        priority: editPriority || null,
        projectID: editProjectID !== '' ? editProjectID : null,
      });
      // Reconcile tag assignments after the base task save succeeds.
      const currentTagIDs = (task.tags ?? []).map(t => t.tagID);
      const toAdd = editTaskTagIDs.filter(id => !currentTagIDs.includes(id));
      const toRemove = currentTagIDs.filter(id => !editTaskTagIDs.includes(id));
      await Promise.all([
        ...toAdd.map(tagId => addTagToTask(task.taskID, tagId)),
        ...toRemove.map(tagId => removeTagFromTask(task.taskID, tagId)),
      ]);
      const tagObjects = tags.filter(t => editTaskTagIDs.includes(t.tagID));
      setTasks(prev => prev.map(t => t.taskID === saved.taskID ? { ...saved, tags: tagObjects } : t));
      if (selectedTaskId === null) setEditingId(null);
      // Save repeat changes separately because recurrence is managed by its own endpoint.
      if (editRepeatFrequency !== originalRepeatFrequency) {
        try {
          await setRepeat(task.taskID, editRepeatFrequency || null);
          setOriginalRepeatFrequency(editRepeatFrequency);
          const freshTask = await getTask(task.taskID);
          setTasks(prev => prev.map(t => t.taskID === task.taskID ? { ...t, recurrenceRuleID: freshTask.recurrenceRuleID } : t));
        } catch { /* non-critical */ }
      }
    } catch {
      setError('Failed to update task.');
    }
  };

  const scheduleAutoSave = (delay = 600) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const taskId = selectedTaskId;
    saveTimerRef.current = setTimeout(() => {
      const task = tasksRef.current.find(t => t.taskID === taskId);
      if (task) saveEditRef.current(task);
    }, delay);
  };

  const removeTask = async (id: number) => {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(t => t.taskID !== id));
      setSubtasks(prev => { const n = { ...prev }; delete n[id]; return n; });
      setNotes(prev =>    { const n = { ...prev }; delete n[id]; return n; });
      setReminders(prev => { const n = { ...prev }; delete n[id]; return n; });
      if (selectedTaskId === id) setSelectedTaskId(null);
    } catch {
      setError('Failed to delete task.');
    }
    setConfirmDeleteId(null);
  };

  // Detail panel open and close helpers.
  const loadTaskSections = async (taskId: number) => {
    setNewSubtaskTitle('');
    setNewNoteContent('');
    setNewReminderMessage('');
    setNewAttachmentUrl('');
    setNewAttachmentLabel('');
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
    try {
      const [subData, noteData, reminderData, attachData] = await Promise.all([
        subtasks[taskId]   ? Promise.resolve(subtasks[taskId])   : getSubtasks(taskId),
        notes[taskId]      ? Promise.resolve(notes[taskId])      : getNotes(taskId),
        reminders[taskId]  ? Promise.resolve(reminders[taskId])  : getReminders(taskId),
        attachments[taskId] ? Promise.resolve(attachments[taskId]) : getAttachments(taskId),
      ]);
      setSubtasks(prev    => ({ ...prev, [taskId]: subData }));
      setNotes(prev       => ({ ...prev, [taskId]: noteData }));
      setReminders(prev   => ({ ...prev, [taskId]: reminderData }));
      setAttachments(prev => ({ ...prev, [taskId]: attachData }));
    } catch {
      setError('Failed to load task details.');
    }
  };

  const openPanel = async (task: Task) => {
    if (selectedTaskId === task.taskID) { closePanel(); return; }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (selectedTaskId !== null) {
      const current = tasks.find(t => t.taskID === selectedTaskId);
      if (current) await saveEdit(current);
    }
    setSelectedTaskId(task.taskID);
    setOpenSections(new Set());
    startEdit(task);
    loadTaskSections(task.taskID);
  };

  const openTaskFromCalendar = async (taskId: number) => {
    setMobilePage('tasks');
    focusTaskById(taskId);
    if (selectedTaskId === taskId) return;
    const task = tasks.find(t => t.taskID === taskId);
    if (task) await openPanel(task);
  };

  const togglePanelSection = (name: string) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const closePanel = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const task = tasks.find(t => t.taskID === selectedTaskId);
    if (task) await saveEdit(task);
    setSelectedTaskId(null);
    setEditingId(null);
  };

  // Subtask loading and mutation handlers.
  const addSubtask = async (taskId: number) => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const saved = await createSubtask(taskId, newSubtaskTitle.trim());
      setSubtasks(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewSubtaskTitle('');
    } catch {
      setError('Failed to create subtask.');
    }
  };

  const toggleSubtask = async (taskId: number, subtask: Subtask) => {
    const newStatusID = subtask.statusID === 2 ? 1 : 2;
    try {
      const saved = await patchSubtaskStatus(subtask.subTaskID, newStatusID);
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].map(s => s.subTaskID === saved.subTaskID ? saved : s) }));
    } catch {
      setError('Failed to update subtask.');
    }
  };

  const removeSubtask = async (taskId: number, subTaskID: number) => {
    try {
      await deleteSubtaskAPI(subTaskID);
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].filter(s => s.subTaskID !== subTaskID) }));
    } catch {
      setError('Failed to delete subtask.');
    }
  };

  const updateSubtaskTitle = async (taskId: number, subtask: Subtask) => {
    const trimmed = editingSubtaskTitle.trim();
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
    if (!trimmed || trimmed === subtask.title) return;
    try {
      const saved = await updateSubtaskAPI(subtask.subTaskID, trimmed);
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].map(s => s.subTaskID === saved.subTaskID ? saved : s) }));
    } catch {
      setError('Failed to update subtask.');
    }
  };

  // Note loading and mutation handlers.
  const addNote = async (taskId: number) => {
    if (!newNoteContent.trim()) return;
    try {
      const saved = await createNote(taskId, '', newNoteContent.trim());
      setNotes(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewNoteContent('');
    } catch {
      setError('Failed to create note.');
    }
  };

  const removeNote = async (taskId: number, noteId: number) => {
    try {
      await deleteNoteAPI(noteId);
      setNotes(prev => ({ ...prev, [taskId]: prev[taskId].filter(n => n.noteID !== noteId) }));
    } catch {
      setError('Failed to delete note.');
    }
  };

  // Reminder loading and mutation handlers.
  const addReminder = async (taskId: number) => {
    if (!newReminderDate) return;
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    try {
      const dueDate = buildDateTimeString(newReminderDate, newReminderHour, newReminderMinute, newReminderAmpm, is24Hour);
      const saved = await createReminder(taskId, dueDate, newReminderMessage.trim());
      setReminders(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewReminderDate('');
      setNewReminderMessage('');
      setNewReminderHour('09'); setNewReminderMinute('00'); setNewReminderAmpm('AM');
    } catch {
      setError('Failed to create reminder.');
    }
  };

  const removeReminder = async (taskId: number, reminderId: number) => {
    try {
      await deleteReminderAPI(reminderId);
      setReminders(prev => ({ ...prev, [taskId]: prev[taskId].filter(r => r.reminderID !== reminderId) }));
    } catch {
      setError('Failed to delete reminder.');
    }
  };

  // Project creation, deletion, and task detachment handlers.
  const addProject = async () => {
    if (!newProjectTitle.trim()) return;
    try {
      const saved = await createProject({ title: newProjectTitle.trim() });
      setProjects(prev => [...prev, saved]);
      setNewProjectTitle('');
      setShowInlineProject(false);
    } catch {
      setError('Failed to create project.');
    }
  };

  const changeTagColor = async (tagID: number, color: string) => {
    try {
      await updateTagAPI(tagID, color);
      setTags(prev => prev.map(t => t.tagID === tagID ? { ...t, color } : t));
      setTasks(prev => prev.map(t => ({ ...t, tags: (t.tags ?? []).map(tg => tg.tagID === tagID ? { ...tg, color } : tg) })));
      setColorPickerTagId(null);
    } catch {
      setError('Failed to update tag color.');
    }
  };

  const removeTag = async (tagID: number) => {
    try {
      await deleteTagAPI(tagID);
      setTags(prev => prev.filter(t => t.tagID !== tagID));
      setTasks(prev => prev.map(t => ({ ...t, tags: (t.tags ?? []).filter(tg => tg.tagID !== tagID) })));
      setNewTaskTagIDs(prev => prev.filter(id => id !== tagID));
      setEditTaskTagIDs(prev => prev.filter(id => id !== tagID));
      if (Number(filterTagID) === tagID) setFilterTagID('');
    } catch {
      setError('Failed to delete tag.');
    }
  };

  const removeProject = async (projectID: number) => {
    try {
      await deleteProjectAPI(projectID);
      setProjects(prev => prev.filter(p => p.projectID !== projectID));
      setTasks(prev => prev.map(t => t.projectID === projectID ? { ...t, projectID: null } : t));
      if (Number(filterProjectID) === projectID) setFilterProjectID('');
      if (Number(newProjectID) === projectID) setNewProjectID('');
      if (Number(editProjectID) === projectID) setEditProjectID('');
    } catch {
      setError('Failed to delete project.');
    }
  };

  // Tag creation, color changes, deletion, and task assignment handlers.
  const addTag = async (applyToTaskId?: number) => {
    if (!newTagTitle.trim()) return;
    try {
      const saved = await createTag({ title: newTagTitle.trim(), color: newTagColor });
      setTags(prev => [...prev, saved]);
      setNewTagTitle('');
      if (applyToTaskId != null) {
        await addTagToTask(applyToTaskId, saved.tagID);
        setTasks(prev => prev.map(t => {
          if (t.taskID !== applyToTaskId) return t;
          if (t.tags?.some(tg => tg.tagID === saved.tagID)) return t;
          return { ...t, tags: [...(t.tags ?? []), saved] };
        }));
      }
    } catch {
      setError('Failed to create tag.');
    }
  };

  const addTagInline = async () => {
    if (!newTagTitle.trim()) return;
    try {
      const saved = await createTag({ title: newTagTitle.trim(), color: newTagColor });
      setTags(prev => [...prev, saved]);
      setNewTaskTagIDs(prev => [...prev, saved.tagID]);
      setNewTagTitle(''); setNewTagColor('#6366f1');
      setShowInlineTag(false);
    } catch {
      setError('Failed to create tag.');
    }
  };

  const addProjectInlineEdit = async () => {
    if (!newProjectTitle.trim()) return;
    try {
      const saved = await createProject({ title: newProjectTitle.trim() });
      setProjects(prev => [...prev, saved]);
      setEditProjectID(saved.projectID);
      setNewProjectTitle('');
      setShowInlineEditProject(false);
      scheduleAutoSave(0);
    } catch {
      setError('Failed to create project.');
    }
  };

  const addTagInlineEdit = async () => {
    if (!newTagTitle.trim()) return;
    try {
      const saved = await createTag({ title: newTagTitle.trim(), color: newTagColor });
      setTags(prev => [...prev, saved]);
      setEditTaskTagIDs(prev => [...prev, saved.tagID]);
      setNewTagTitle(''); setNewTagColor('#6366f1');
      setShowInlineEditTag(false);
      scheduleAutoSave(0);
    } catch {
      setError('Failed to create tag.');
    }
  };

  const addTagToTaskHandler = async (taskId: number, tagId: number) => {
    try {
      await addTagToTask(taskId, tagId);
      setTasks(prev => prev.map(t => {
        if (t.taskID !== taskId) return t;
        const tag = tags.find(tg => tg.tagID === tagId);
        if (!tag || t.tags?.some(tg => tg.tagID === tagId)) return t;
        return { ...t, tags: [...(t.tags ?? []), tag] };
      }));
    } catch {
      setError('Failed to add tag.');
    }
  };

  const removeTagFromTaskHandler = async (taskId: number, tagId: number) => {
    try {
      await removeTagFromTask(taskId, tagId);
      setTasks(prev => prev.map(t =>
        t.taskID !== taskId ? t : { ...t, tags: (t.tags ?? []).filter(tg => tg.tagID !== tagId) }
      ));
    } catch {
      setError('Failed to remove tag.');
    }
  };

  // Task duplication preserves metadata that belongs to the task itself.
  const parseCopyTitle = (title: string) => {
    const match = title.match(/^(.*)\s\(copy(?:\s+(\d+))?\)$/);
    if (!match) return null;
    const copyNumber = match[2] ? Number(match[2]) : 1;
    if (!Number.isInteger(copyNumber) || copyNumber < 1) return null;
    return { baseTitle: match[1], copyNumber };
  };

  const nextCopyTitle = (title: string) => {
    const parsedTitle = parseCopyTitle(title);
    const baseTitle = parsedTitle?.baseTitle ?? title;
    const usedCopyNumbers = new Set<number>();

    for (const existingTask of tasks) {
      const parsedExisting = parseCopyTitle(existingTask.title);
      if (parsedExisting?.baseTitle === baseTitle) {
        usedCopyNumbers.add(parsedExisting.copyNumber);
      }
    }

    let copyNumber = 1;
    while (usedCopyNumbers.has(copyNumber)) copyNumber += 1;
    return `${baseTitle} (copy${copyNumber === 1 ? '' : ` ${copyNumber}`})`;
  };

  const duplicateTask = async (task: Task) => {
    try {
      const saved = await createTask({
        title: nextCopyTitle(task.title),
        description: task.description ?? '',
        dateTimeScheduled: task.dateTimeScheduled ?? null,
        endDateTimeScheduled: task.endDateTimeScheduled ?? null,
        userID: task.userID,
        statusID: null,
        priority: task.priority ?? null,
        projectID: task.projectID ?? null,
      });
      const duplicatedTask: Task = { ...saved };
      if (task.tags && task.tags.length > 0) {
        await Promise.all(task.tags.map(tag => addTagToTask(saved.taskID, tag.tagID)));
        duplicatedTask.tags = task.tags;
      }
      if (task.recurrenceRuleID) {
        const rule = await getRecurrence(task.taskID);
        const repeatedTask = await setRepeat(saved.taskID, rule.frequency);
        duplicatedTask.recurrenceRuleID = repeatedTask.recurrenceRuleID ?? null;
      }
      setTasks(prev => [...prev, duplicatedTask]);
    } catch {
      setError('Failed to duplicate task.');
    }
  };

  // Bulk actions operate on the current selected task IDs.
  const toggleBulkSelect = (taskId: number) => {
    setBulkSelectedIds(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const bulkMarkDone = async () => {
    const ids = Array.from(bulkSelectedIds);
    try {
      for (const id of ids) {
        const fallbackTask = tasksRef.current.find(task => task.taskID === id);
        if (!fallbackTask) continue;
        const currentTask = await getTask(id).catch(() => fallbackTask);
        const currentStatusID = normalizeTaskStatus(currentTask.statusID);
        const recurrenceRule = currentStatusID !== 2 ? await getExistingRecurrenceRule(currentTask) : null;
        if (recurrenceRule) {
          await completeRecurringTask(currentTask, recurrenceRule);
        } else {
          const saved = await patchTaskStatus(id, 2);
          setTasks(prev => prev.map(task => task.taskID === saved.taskID ? saved : task));
        }
      }
      const refreshedTasks = await getTasks();
      setTasks(refreshedTasks);
      setBulkSelectedIds(new Set());
      setBulkMode(false);
    } catch {
      setError('Failed to update tasks.');
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(bulkSelectedIds);
    try {
      await Promise.all(ids.map(id => deleteTask(id)));
      setTasks(prev => prev.filter(t => !ids.includes(t.taskID)));
      setBulkSelectedIds(new Set());
      setBulkMode(false);
    } catch {
      setError('Failed to delete tasks.');
    }
  };

  // Reminder toast dismissal and snooze behavior.
  const dismissToast = (toastId: number) =>
    setToasts(prev => prev.filter(t => t.id !== toastId));

  const snoozeToast = async (toast: { id: number; reminderID: number; taskID: number }, minutes: number) => {
    const newDue = new Date(Date.now() + minutes * 60 * 1000);
    const iso = new Date(newDue.getTime() - newDue.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    try {
      await patchReminderDate(toast.reminderID, iso);
      firedReminders.current.delete(toast.reminderID);
      setReminders(prev => {
        const taskRems = prev[toast.taskID] ?? [];
        return { ...prev, [toast.taskID]: taskRems.map(r => r.reminderID === toast.reminderID ? { ...r, dueDate: iso } : r) };
      });
    } catch { /* silently ignore — reminder already deleted */ }
    dismissToast(toast.id);
  };

  // Link attachment loading and mutation handlers.
  const loadAttachments = async (taskId: number) => {
    try {
      const data = await getAttachments(taskId);
      setAttachments(prev => ({ ...prev, [taskId]: data }));
    } catch { /* non-critical */ }
  };

  const addAttachment = async (taskId: number) => {
    const url = newAttachmentUrl.trim();
    if (!url) return;
    try {
      const saved = await createAttachment(taskId, url, newAttachmentLabel.trim());
      setAttachments(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewAttachmentUrl('');
      setNewAttachmentLabel('');
    } catch {
      setError('Failed to add link.');
    }
  };

  const removeAttachment = async (taskId: number, attachmentId: number) => {
    try {
      await deleteAttachmentAPI(attachmentId);
      setAttachments(prev => ({ ...prev, [taskId]: prev[taskId].filter(a => a.attachmentID !== attachmentId) }));
    } catch {
      setError('Failed to remove link.');
    }
  };

  const toggleTaskTags = (taskId: number) => {
    setExpandedTagTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const renderTaskTags = (task: Task, extraClass = '') => {
    const taskTags = task.tags ?? [];
    if (taskTags.length === 0) return null;

    const expanded = expandedTagTaskIds.has(task.taskID);
    const visibleTags = expanded ? taskTags : taskTags.slice(0, VISIBLE_TASK_TAGS);
    const hiddenCount = taskTags.length - visibleTags.length;

    return (
      <div className={`item__chips${extraClass ? ` ${extraClass}` : ''}`}>
        {visibleTags.map(tag => (
          <span key={tag.tagID} className="item__tag-chip" style={tagAccentStyle(tag.color)}>
            {tag.title}
          </span>
        ))}
        {taskTags.length > VISIBLE_TASK_TAGS && (
          <button
            type="button"
            className="item__tag-more"
            onClick={e => { e.stopPropagation(); toggleTaskTags(task.taskID); }}
            aria-expanded={expanded}
          >
            {expanded ? 'Show less ▲' : `+${hiddenCount} ▼`}
          </button>
        )}
      </div>
    );
  };

  const goMobilePage = (page: MobilePage) => setMobilePage(page);

  const handleSwipeStart = (event: TouchEvent<HTMLDivElement>) => {
    if (shouldIgnoreSwipeStart(event.target)) {
      swipeStartX.current = null;
      swipeStartY.current = null;
      return;
    }
    const touch = event.touches[0];
    if (!touch) {
      swipeStartX.current = null;
      swipeStartY.current = null;
      return;
    }
    swipeStartX.current = touch.clientX;
    swipeStartY.current = touch.clientY;
  };

  const handleSwipeEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const touch = event.changedTouches[0];
    const startX = swipeStartX.current;
    const startY = swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (!touch) return;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    setMobilePage(current => {
      const currentIndex = MOBILE_PAGES.indexOf(current);
      const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
      return MOBILE_PAGES[Math.max(0, Math.min(MOBILE_PAGES.length - 1, nextIndex))];
    });
  };

  // Keep auto-save refs fresh for the debounced callback.
  saveEditRef.current = saveEdit;
  tasksRef.current    = tasks;

  // Stats are derived from the loaded task list.
  const statsData = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.statusID === 2).length;
    const active = tasks.filter(t => t.statusID !== 2).length;
    const overdue = tasks.filter(t => isTaskOverdue(t)).length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const doneThisWeek = tasks.filter(t => t.statusID === 2 && t.createdAt && new Date(t.createdAt) >= weekAgo).length;
    const high = tasks.filter(t => t.priority === 'HIGH').length;
    const medium = tasks.filter(t => t.priority === 'MEDIUM').length;
    const low = tasks.filter(t => t.priority === 'LOW').length;
    const noPriority = tasks.filter(t => !t.priority).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, active, overdue, doneThisWeek, high, medium, low, noPriority, completionRate };
  }, [tasks]);

  const hasActiveListFilters =
    search.trim() !== '' ||
    filterStatus !== 'all' ||
    filterProjectID !== '' ||
    filterTagID !== '';
  const hasModifiedListControls = hasActiveListFilters || sortBy !== 'dueAsc';

  const emptyState = (() => {
    if (search.trim() !== '') {
      return {
        title: 'No matching tasks',
        body: 'Try a different search term or reset the current filters.',
      };
    }
    if (filterStatus === 'completed') {
      return {
        title: 'No completed tasks yet',
        body: 'Completed tasks will show here.',
      };
    }
    if (filterStatus === 'overdue') {
      return {
        title: 'No overdue tasks',
        body: "You're all caught up.",
      };
    }
    if (hasActiveListFilters) {
      return {
        title: 'No tasks in this filter',
        body: 'Reset filters to bring the rest of your tasks back into view.',
      };
    }
    if (viewTab !== 'all') {
      return {
        title: `No tasks ${viewTab === 'today' ? 'today' : viewTab === 'week' ? 'this week' : 'this month'}`,
        body: 'Anything scheduled for this view will show up here.',
      };
    }
    return {
      title: 'No tasks yet',
      body: 'Swipe to Add and create your first task.',
    };
  })();

  const showFilterValue: FilterStatus =
    filterStatus === 'high' || filterStatus === 'medium' || filterStatus === 'low'
      ? 'all'
      : filterStatus;
  const priorityFilterValue: FilterStatus =
    filterStatus === 'high' || filterStatus === 'medium' || filterStatus === 'low'
      ? filterStatus
      : 'all';

  return (
    <div className="app">
      {toasts.length > 0 && (
        <div className="toasts">
          {toasts.map(toast => (
            <div key={toast.id} className="toast">
              <div className="toast__header">
                <span className="toast__title">⏰ {toast.taskTitle}</span>
                <button className="toast__close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">×</button>
              </div>
              <p className="toast__msg">{toast.message}</p>
              <div className="toast__actions">
                <button className="btn btn--ghost btn--sm" onClick={() => snoozeToast(toast, 60)}>+1 hr</button>
                <button className="btn btn--ghost btn--sm" onClick={() => snoozeToast(toast, 60 * 24)}>Tomorrow</button>
                <button className="btn btn--sm" onClick={() => dismissToast(toast.id)}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="stats-title" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title" id="stats-title">Stats</h2>
              <button ref={statsCloseRef} className="btn btn--ghost btn--icon" onClick={() => setShowStats(false)} aria-label="Close stats">×</button>
            </div>
            <div className="stats">
              <div className="stats__row">
                <div className="stats__card"><span className="stats__num">{statsData.total}</span><span className="stats__label">Total</span></div>
                <div className="stats__card"><span className="stats__num stats__num--done">{statsData.done}</span><span className="stats__label">Done</span></div>
                <div className="stats__card"><span className="stats__num">{statsData.active}</span><span className="stats__label">Active</span></div>
                <div className="stats__card"><span className="stats__num stats__num--overdue">{statsData.overdue}</span><span className="stats__label">Overdue</span></div>
              </div>
              <div className="stats__row">
                <div className="stats__card stats__card--wide"><span className="stats__num stats__num--done">{statsData.completionRate}%</span><span className="stats__label">Completion rate</span></div>
                <div className="stats__card stats__card--wide"><span className="stats__num">{statsData.doneThisWeek}</span><span className="stats__label">Done this week</span></div>
              </div>
              <div className="stats__section">
                <span className="stats__section-title">By Priority</span>
                {[['High', statsData.high, '#f87171'], ['Medium', statsData.medium, '#fbbf24'], ['Low', statsData.low, '#4ade80'], ['None', statsData.noPriority, 'var(--text-faint)']] .map(([label, count, color]) => (
                  <div key={String(label)} className="stats__bar-row">
                    <span className="stats__bar-label">{label}</span>
                    <div className="stats__bar-track">
                      <div className="stats__bar-fill" style={{ width: statsData.total > 0 ? `${Math.round((Number(count) / statsData.total) * 100)}%` : '0%', background: String(color) }} />
                    </div>
                    <span className="stats__bar-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mobile-page-nav" aria-label="Primary views">
        <button type="button" className={`mobile-page-nav__btn${mobilePage === 'add' ? ' mobile-page-nav__btn--active' : ''}`} onClick={() => goMobilePage('add')}>Add</button>
        <button type="button" className={`mobile-page-nav__btn${mobilePage === 'tasks' ? ' mobile-page-nav__btn--active' : ''}`} onClick={() => goMobilePage('tasks')}>Tasks</button>
        <button type="button" className={`mobile-page-nav__btn${mobilePage === 'calendar' ? ' mobile-page-nav__btn--active' : ''}`} onClick={() => goMobilePage('calendar')}>Calendar</button>
      </div>

      <div
        className={`mobile-pager mobile-pager--${mobilePage}`}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
      <section className="mobile-page mobile-page--add" data-active={mobilePage === 'add'}>
      <div className="card app__add">

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button className="error-banner__close" onClick={() => setError(null)} aria-label="Dismiss error">✕</button>
          </div>
        )}

        <div className="controls" ref={createControlsRef}>
          <input
            ref={titleInputRef}
            className={`input${titleError ? ' input--error' : ''}`}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); if (titleError) setTitleError(false); }}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Task title"
            aria-label="Task title"
          />
          {titleError && <p className="input-error-msg">Title is required.</p>}
          {!titleError && input.trim() !== '' && tasks.some(t => t.title.toLowerCase() === input.trim().toLowerCase()) && (
            <p className="input-warn-msg">A task with this title already exists.</p>
          )}
          <div className="desc-wrap">
            <textarea
              className="input controls__description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
              aria-label="Task description"
              maxLength={1000}
              rows={2}
            />
            <span className="char-count">{description.length}/1000</span>
          </div>
          <DateTimeRow
            editorScope="add-task"
            openTimeEditorScope={openTimeEditorScope}
            setOpenTimeEditorScope={setOpenTimeEditorScope}
            closeFloatingControls={closeFloatingControls}
            is24Hour={is24Hour}
            hourOptions={hourOptions}
            openControl={openCreateControl}
            setOpenControl={setOpenCreateControl}
            controlIds={{
              date: 'date',
              start: 'start',
              end: 'end',
              startHour: 'start-hour',
              startMinute: 'start-minute',
              startAmpm: 'start-ampm',
              endHour: 'end-hour',
              endMinute: 'end-minute',
              endAmpm: 'end-ampm',
            }}
            dateVal={date} hourVal={hour} minuteVal={minute} ampmVal={ampm}
            onDate={setDate} onHour={setHour} onMinute={setMinute} onAmpm={setAmpm}
            showTime={showAddTime} onToggleTime={() => setShowAddTime(p => !p)} onRemoveStart={() => setShowAddTime(false)}
            showEndTime={showAddEndTime} onToggleEndTime={toggleAddEndTime}
            endHourVal={endHour} endMinuteVal={endMinute} endAmpmVal={endAmpm}
            onEndHour={setEndHour} onEndMinute={setEndMinute} onEndAmpm={setEndAmpm}
          />
          <RecurrenceControl
            value={newRepeatFrequency}
            onChange={setNewRepeatFrequency}
            openControl={openCreateControl}
            onToggle={() => toggleCreateDropdown('repeat')}
            onClose={() => setOpenCreateControl(null)}
            controlId="repeat"
            menuScope="create"
          />
          {currentCreateTimeRangeError && <p className="input-error-msg">{currentCreateTimeRangeError}</p>}
          <div className="add-actions-row">
          <div className="form-row">
            <div className="tag-select" ref={priorityDropdownRef}>
              <button
                type="button"
                className={`select tag-select__btn${newPriority !== '' ? ' tag-select__btn--active' : ''}`}
                data-create-menu-trigger
                onClick={() => {
                  toggleCreateDropdown('priority');
                }}
              >
                {newPriority === ''
                  ? 'Priority'
                  : <><span className="priority-dot" style={{ background: PRIORITY_COLOR[newPriority] }} />{newPriority[0] + newPriority.slice(1).toLowerCase()}</>}
              </button>
              {openCreateControl === 'priority' && (
                <div className="tag-select__dropdown" data-create-menu-boundary>
                  <button
                    type="button"
                    className={`tag-select__item tag-select__item--remove${newPriority === '' ? ' tag-select__item--on' : ''}`}
                    onClick={() => { setNewPriority(''); setOpenCreateControl(null); }}
                  >
                    Remove priority
                  </button>
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`tag-select__item${newPriority === p ? ' tag-select__item--on' : ''}`}
                      onClick={() => { setNewPriority(p); setOpenCreateControl(null); }}
                    >
                      <span className="priority-dot" style={{ background: PRIORITY_COLOR[p] }} />
                      {p[0] + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="tag-select" ref={projectDropdownRef}>
              <button
                type="button"
                className={`select tag-select__btn${newProjectID !== '' ? ' tag-select__btn--active' : ''}`}
                data-create-menu-trigger
                onClick={() => {
                  toggleCreateDropdown('project');
                }}
              >
                {newProjectID === ''
                  ? 'Project'
                  : compactText(projects.find(p => p.projectID === newProjectID)?.title ?? 'Project', 10)}
              </button>
              {openCreateControl === 'project' && (
                <div className="tag-select__dropdown" data-create-menu-boundary>
                  <button
                    type="button"
                    className="tag-select__new-btn tag-select__new-btn--top"
                    onClick={() => {
                      setOpenCreateControl(null);
                      if (showInlineProject) { inlineProjectInputRef.current?.focus(); }
                      else { setShowInlineProject(true); }
                    }}
                  >+ New Project</button>
                  {projects.length === 0
                    ? <p className="tag-select__empty">No projects yet.</p>
                    : projects.map(p => {
                      const selected = newProjectID === p.projectID;
                      return (
                        <div key={p.projectID} className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}>
                          <label className="tag-select__item-label">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => setNewProjectID(selected ? '' : p.projectID)}
                            />
                            📁 {p.title}
                          </label>
                          <button
                            type="button"
                            className="tag-select__delete"
                            onClick={e => { e.stopPropagation(); removeProject(p.projectID); }}
                            title="Delete project"
                            aria-label="Delete project"
                          >×</button>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
            <div className="tag-select" ref={tagDropdownRef}>
              <button
                type="button"
                className={`select tag-select__btn${newTaskTagIDs.length > 0 ? ' tag-select__btn--active' : ''}`}
                data-create-menu-trigger
                onClick={() => {
                  toggleCreateDropdown('tags');
                }}
              >
                {newTaskTagIDs.length === 0
                  ? 'Tags'
                  : `${newTaskTagIDs.length} Tag${newTaskTagIDs.length === 1 ? '' : 's'}`}
              </button>
              {openCreateControl === 'tags' && (
                <div className="tag-select__dropdown" data-create-menu-boundary>
                  <button
                    type="button"
                    className="tag-select__new-btn tag-select__new-btn--top"
                    onClick={() => {
                      setOpenCreateControl(null);
                      if (showInlineTag) { inlineTagInputRef.current?.focus(); }
                      else { setShowInlineTag(true); }
                    }}
                  >+ New Tag</button>
                  {tags.length === 0
                    ? <p className="tag-select__empty">No tags yet.</p>
                    : tags.map(tag => {
                      const selected = newTaskTagIDs.includes(tag.tagID);
                      return (
                        <div key={tag.tagID}>
                          <div className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}>
                            <label className="tag-select__item-label">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => setNewTaskTagIDs(prev =>
                                  selected ? prev.filter(id => id !== tag.tagID) : [...prev, tag.tagID]
                                )}
                              />
                              {tag.title}
                            </label>
                            <button
                              type="button"
                              className="tag-dot tag-dot--clickable"
                              style={{ background: tag.color ?? '#6366f1' }}
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setColorPickerTagId(prev => prev === tag.tagID ? null : tag.tagID); }}
                              title="Change color"
                              aria-label="Change tag color"
                            />
                            <button
                              type="button"
                              className="tag-select__delete"
                              onClick={e => { e.stopPropagation(); removeTag(tag.tagID); }}
                              title="Delete tag"
                              aria-label="Delete tag"
                            >×</button>
                          </div>
                          {colorPickerTagId === tag.tagID && (
                            <div className="tag-color-picker">
                              {TAG_COLORS.map(c => (
                                <button key={c} type="button" className={`color-swatch${tag.color === c ? ' color-swatch--selected' : ''}`} style={{ background: c }} onClick={e => { e.stopPropagation(); changeTagColor(tag.tagID, c); }} title={c} aria-label={`Set tag color ${c}`} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
          </div>
          <button className="btn add-task-submit" onClick={addTask}>Add Task</button>
          </div>
          {newProjectID !== '' && (() => {
            const proj = projects.find(p => p.projectID === newProjectID);
            return proj ? (
              <div className="form-selected-chip">
                <span className="item__badge item__project-chip">{proj.title}</span>
                <button type="button" className="form-chip-clear" onClick={() => setNewProjectID('')} aria-label={`Remove project ${proj.title}`}>×</button>
              </div>
            ) : null;
          })()}
          {newTaskTagIDs.length > 0 && (
            <div className="selected-tags">
              {newTaskTagIDs.map(id => {
                const tag = tags.find(t => t.tagID === id);
                if (!tag) return null;
                return (
                  <span key={id} className="selected-tag-chip" style={tagAccentStyle(tag.color)}>
                    <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                    {tag.title}
                    <button
                      type="button"
                      className="selected-tag-chip__remove"
                      onClick={() => setNewTaskTagIDs(prev => prev.filter(i => i !== id))}
                      aria-label={`Remove tag ${tag.title}`}
                    >×</button>
                  </span>
                );
              })}
            </div>
          )}
          {showInlineProject && (
            <div className="project-inline-form">
              <input
                ref={inlineProjectInputRef}
                className="input project-inline-form__input"
                placeholder="Project name…"
                aria-label="Project name"
                value={newProjectTitle}
                maxLength={PROJECT_MAX_LENGTH}
                onChange={e => setNewProjectTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addProject();
                  if (e.key === 'Escape') { setShowInlineProject(false); setNewProjectTitle(''); }
                }}
                autoFocus
              />
              <button className="btn btn--sm" onClick={addProject} disabled={!newProjectTitle.trim()}>Create</button>
              <button type="button" className="inline-form__close" onClick={() => { setShowInlineProject(false); setNewProjectTitle(''); }} title="Close" aria-label="Close project form">×</button>
            </div>
          )}
          {showInlineTag && (
            <div className="project-inline-form project-inline-form--tag">
              <div className="tag-inline-top">
                <input
                  ref={inlineTagInputRef}
                  className="input project-inline-form__input"
                  placeholder="Tag name…"
                  aria-label="Tag name"
                  value={newTagTitle}
                  onChange={e => setNewTagTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addTagInline();
                    if (e.key === 'Escape') { setShowInlineTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }
                  }}
                  maxLength={TAG_MAX_LENGTH}
                  autoFocus
                />
                <button className="btn btn--sm" onClick={addTagInline} disabled={!newTagTitle.trim()}>Create</button>
                <button type="button" className="inline-form__close" onClick={() => { setShowInlineTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }} title="Close" aria-label="Close tag form">×</button>
              </div>
              <div className="color-palette">
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch${newTagColor === c ? ' color-swatch--selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewTagColor(c)}
                    title={c}
                    aria-label={`Set new tag color ${c}`}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="add-assist">
            <div className="add-preview" aria-label="Task preview">
              <div className="add-preview__top">
                <span className={`add-preview__title${input.trim() ? '' : ' add-preview__title--empty'}`}>
                  {input.trim() || 'Task title preview'}
                </span>
                <span className="item__meta item__meta--inline">{fmtTaskDateRange(draftDateTimeScheduled, draftEndDateTimeScheduled)}</span>
              </div>
              {description.trim() && <p className="add-preview__desc">{description.trim()}</p>}
              {(newPriority || draftProject || draftTags.length > 0 || newRepeatFrequency) && (
                <div className="add-preview__chips">
                  {draftProject && <span className="item__badge item__project-chip">{draftProject.title}</span>}
                  {newRepeatFrequency && <span className="item__badge item__badge--repeat">{formatRepeatFrequency(newRepeatFrequency)}</span>}
                  {newPriority && (
                    <span className={`item__badge item__badge--priority item__badge--priority-${newPriority.toLowerCase()}`}>
                      {newPriority[0] + newPriority.slice(1).toLowerCase()}
                    </span>
                  )}
                  {draftTags.slice(0, 3).map(tag => (
                    <span key={tag.tagID} className="item__tag-chip" style={tagAccentStyle(tag.color)}>
                      <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                      {tag.title}
                    </span>
                  ))}
                  {draftTags.length > 3 && <span className="item__tag-more">+{draftTags.length - 3}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      </section>

      <section className="mobile-page mobile-page--tasks" data-active={mobilePage === 'tasks'}>
      <div className={`card app__list${selectedTaskId !== null ? ' app__list--narrow' : ''}`}>

        <div ref={settingsRef}>
        <div className="task-card-toolbar">
          <span className="task-card-toolbar__date">
            {new Date().toLocaleDateString(isEuropeanDate ? 'en-GB' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <div className="header-actions">
            <button
              ref={statsTriggerRef}
              className="btn btn--ghost btn--sm"
              onClick={toggleStatsPanel}
            >
              ▤ Stats
            </button>
            <button
              ref={settingsTriggerRef}
              className="btn btn--ghost btn--sm"
              aria-expanded={showSettings}
              aria-controls="task-card-settings-panel"
              onClick={toggleSettingsPanel}
            >
              ⚙ Settings
            </button>
          </div>
        </div>

        {showSettings && (
          <div id="task-card-settings-panel" className="settings-panel task-card-settings" role="region" aria-label="Settings">
            <button className="btn btn--ghost btn--sm" onClick={() => setIs24Hour(p => !p)}>
              {is24Hour ? '12-hour' : '24-hour'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setIsEuropeanDate(p => !p)}>
              {isEuropeanDate ? 'MM/DD/YYYY' : 'DD/MM/YYYY'}
            </button>
            <div className="settings-theme">
              <span className="settings-label">Theme</span>
              <select className="select select--sm" value={theme} onChange={e => setTheme(e.target.value as Theme)}>
                {(['system', 'light', 'dark'] as Theme[]).map(t => (
                  <option key={t} value={t}>{themeLabel[t]}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        </div>

        <div className="view-tabs">
          {(['all', 'today', 'week', 'month'] as const).map(tab => (
            <button
              key={tab}
              className={`view-tab${viewTab === tab ? ' view-tab--active' : ''}`}
              onClick={() => setViewTab(tab)}
            >
              {tab === 'all' ? 'All' : tab === 'today' ? 'Today' : tab === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        <div className="list-controls list-controls--with-reset">
          <div className="list-controls__row list-controls__row--primary">
            <label className="filter-field">
              <span className="filter-field__label">Sort</span>
              <select className="select select--sm filter-field__select" value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
                <option value="dueAsc">Date ↑</option>
                <option value="dueDesc">Date ↓</option>
                <option value="titleAsc">A-Z</option>
                <option value="priorityDesc">Priority</option>
                <option value="overdueFirst">Overdue first</option>
              </select>
            </label>
            <label className="filter-field">
              <span className="filter-field__label">Show</span>
              <select className="select select--sm filter-field__select" value={showFilterValue} onChange={e => setFilterStatus(e.target.value as FilterStatus)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Done</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
            <label className="filter-field">
              <span className="filter-field__label">Priority</span>
              <select className="select select--sm filter-field__select" value={priorityFilterValue} onChange={e => setFilterStatus(e.target.value as FilterStatus)}>
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>
          <div className="list-controls__row list-controls__row--secondary">
            <label className="filter-field">
              <span className="filter-field__label">Project</span>
              <select
                className="select select--sm filter-field__select"
                value={filterProjectID}
                onChange={e => setFilterProjectID(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">All</option>
                {projects.map(p => (
                  <option key={p.projectID} value={p.projectID}>{p.title}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span className="filter-field__label">Tag</span>
              <select
                className="select select--sm filter-field__select"
                value={filterTagID}
                onChange={e => setFilterTagID(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">All</option>
                {tags.map(tag => (
                  <option key={tag.tagID} value={tag.tagID}>{tag.title}</option>
                ))}
              </select>
            </label>
            <button
              className="btn btn--ghost btn--sm btn--reset-filters"
              onClick={() => { setSortBy('dueAsc'); setFilterStatus('all'); setFilterProjectID(''); setFilterTagID(''); setSearch(''); }}
              disabled={!hasModifiedListControls}
            >
              Reset Filters
            </button>
          </div>
        </div>

        <input
          ref={searchInputRef}
          className="input search mtop"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks"
          aria-label="Search tasks"
        />

        <div className="spread mtop small task-overview">
          <div className="task-count-row">
            <button
              type="button"
              className={`task-count task-count--button${filterStatus === 'all' ? ' task-count--active' : ''}`}
              onClick={() => setFilterStatus('all')}
              aria-pressed={filterStatus === 'all'}
            >
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </button>
            {overdueCount > 0 && (
              <button
                type="button"
                className={`task-count task-count--button task-count--overdue${filterStatus === 'overdue' ? ' task-count--active' : ''}`}
                onClick={() => setFilterStatus('overdue')}
                aria-pressed={filterStatus === 'overdue'}
              >
                {overdueCount} overdue
              </button>
            )}
            {completedCount > 0 && (
              <button
                type="button"
                className={`footer-done task-count--button${filterStatus === 'completed' ? ' task-count--active' : ''}`}
                onClick={() => setFilterStatus('completed')}
                aria-pressed={filterStatus === 'completed'}
              >
                {completedCount} done
              </button>
            )}
          </div>
          <button
            className={`btn btn--ghost btn--sm${bulkMode ? ' btn--active' : ''}`}
            onClick={() => { setBulkMode(p => !p); setBulkSelectedIds(new Set()); }}
          >
            {bulkMode ? 'Cancel' : 'Select'}
          </button>
        </div>

        {bulkMode && bulkSelectedIds.size > 0 && (
          <div className="bulk-bar">
            <span className="bulk-bar__count">{bulkSelectedIds.size} selected</span>
            <button className="btn btn--sm" onClick={bulkMarkDone}>Mark done</button>
            <button className="btn btn--danger btn--sm" onClick={bulkDelete}>Delete</button>
          </div>
        )}

        {loading ? (
          <div className="loading">
            <span className="loading__spinner" />
            Loading tasks…
          </div>
        ) : (
          <ul className="list" aria-label="Task list">
            {tabTasks.length === 0 && (
              <li className="empty">
                <span className="empty__title">{emptyState.title}</span>
                <span className="empty__body">{emptyState.body}</span>
                {hasActiveListFilters && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => { setSortBy('dueAsc'); setFilterStatus('all'); setFilterProjectID(''); setFilterTagID(''); setSearch(''); }}
                  >
                    Reset filters
                  </button>
                )}
              </li>
            )}

            {(() => {
              const firstDoneIdx = filterStatus === 'completed'
                ? -1
                : tabTasks.findIndex(t => t.statusID === 2);
              const doneCount = firstDoneIdx >= 0 ? tabTasks.length - firstDoneIdx : 0;

              return tabTasks.map((task, idx) => {
              const overdue   = isTaskOverdue(task);
              const completed = task.statusID === 2;
              const statusID = normalizeTaskStatus(task.statusID);
              const statusLabel = completed ? 'Done' : statusID === 3 ? 'In progress' : 'Active';
              const isSelected = selectedTaskId === task.taskID;
              const taskSubtasks = subtasks[task.taskID] ?? [];
              const subtaskDone = taskSubtasks.filter(s => s.statusID === 2).length;

              return (
                <Fragment key={task.taskID}>
                  {idx === firstDoneIdx && (
                    <li className="done-divider" aria-hidden="true">
                      <span className="done-divider__label">{doneCount} done</span>
                    </li>
                  )}
                <li
                  key={`task-${task.taskID}`}
                  id={`task-${task.taskID}`}
                  className={[
                    'item',
                    overdue   ? 'item--overdue'   : '',
                    completed ? 'item--completed' : '',
                    isSelected ? 'item--selected' : '',
                    editingId === task.taskID && selectedTaskId !== task.taskID ? 'item--editing' : '',
                    bulkMode && bulkSelectedIds.has(task.taskID) ? 'item--bulk-selected' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <>
                    <div
                      className="item__main"
                      onClick={() => handleTaskCardClick(task)}
                      onTouchStart={() => beginTaskLongPress(task)}
                      onTouchMove={cancelTaskLongPress}
                      onTouchEnd={cancelTaskLongPress}
                      onMouseDown={() => beginTaskLongPress(task)}
                      onMouseLeave={cancelTaskLongPress}
                      onMouseUp={cancelTaskLongPress}
                      onContextMenu={e => { e.preventDefault(); if (!bulkMode) openStatusMoveDialog(task); }}
                      style={{ cursor: 'pointer' }}
                    >
                        {bulkMode && (
                          <input
                            type="checkbox"
                            className="item__checkbox item__bulk-checkbox"
                            checked={bulkSelectedIds.has(task.taskID)}
                            onChange={() => toggleBulkSelect(task.taskID)}
                            onClick={e => e.stopPropagation()}
                            aria-label={`Select task ${task.title}`}
                          />
                        )}
                        {!bulkMode && (
                          <input
                            type="checkbox"
                            className="item__checkbox"
                            checked={completed}
                            onChange={e => { e.stopPropagation(); toggleComplete(task); }}
                            onClick={e => e.stopPropagation()}
                            title={completed ? 'Mark as active' : 'Mark as done'}
                            aria-label={completed ? `Mark ${task.title} as active` : `Mark ${task.title} as done`}
                          />
                        )}
                        <div className="item__body">
                          <div className="item__title-row">
                            <div className="item__title-line">
                              <span className={`item__title${completed ? ' item__title--done' : ''}`}>{task.title}</span>
                              <button
                                type="button"
                                className={`item__status-pill item__status-pill--${completed ? 'done' : statusID === 3 ? 'progress' : 'active'}`}
                                aria-label={`Change status from ${statusLabel}`}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!bulkMode) {
                                    openStatusMoveDialog(task);
                                  }
                                }}
                                onMouseDown={e => e.stopPropagation()}
                                onTouchStart={e => e.stopPropagation()}
                              >
                                {statusLabel}
                              </button>
                              {overdue && <span className="item__badge">Overdue</span>}
                            </div>
                            <span className="item__meta item__meta--inline">{fmtTaskDateRange(task.dateTimeScheduled, task.endDateTimeScheduled)}</span>
                            {(task.priority || task.projectID || completed || taskSubtasks.length > 0) && (
                              <div className="item__badges">
                                {task.projectID && (() => {
                                  const proj = projects.find(p => p.projectID === Number(task.projectID));
                                  return proj ? <span className="item__badge item__project-chip">{proj.title}</span> : null;
                                })()}
                                {task.priority && (
                                  <span className={`item__badge item__badge--priority item__badge--priority-${task.priority.toLowerCase()}`}>
                                    {task.priority[0] + task.priority.slice(1).toLowerCase()}
                                  </span>
                                )}
                                {completed && <span className="item__badge item__badge--done">Done</span>}
                                {taskSubtasks.length > 0 && (
                                  <span className={`item__badge ${subtaskDone === taskSubtasks.length ? 'item__badge--subtasks-done' : 'item__badge--subtasks'}`}>
                                    {subtaskDone}/{taskSubtasks.length}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {task.description && (
                            <p className="item__desc">{task.description}</p>
                          )}
                          {renderTaskTags(task)}
                        </div>
                        <div className="item__actions" onClick={e => e.stopPropagation()}>
                          <button
                            className={`btn btn--ghost btn--icon item__action-toggle${openActionTaskId === task.taskID ? ' item__action-toggle--open' : ''}`}
                            aria-label="Open task actions"
                            aria-expanded={openActionTaskId === task.taskID}
                            onClick={() => {
                              const next = openActionTaskId === task.taskID ? null : task.taskID;
                              closeFloatingControls();
                              setOpenActionTaskId(next);
                            }}
                          >
                            ⋯
                          </button>
                          {openActionTaskId === task.taskID && (
                            <div className="item__action-menu" role="menu">
                              <button type="button" role="menuitem" onClick={() => handleEditTaskAction(task)}>Edit</button>
                              <button type="button" role="menuitem" onClick={() => handleDuplicateTaskAction(task)}>Copy</button>
                              <button type="button" role="menuitem" className="item__action-menu-danger" onClick={() => handleDeleteTaskAction(task.taskID)}>Delete</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingId === task.taskID && selectedTaskId !== task.taskID && (
                        <div className="item__edit-card" onClick={e => e.stopPropagation()}>
                          <input
                            className="input"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            placeholder="Task title"
                            aria-label="Task title"
                          />
                          <div className="desc-wrap">
                            <textarea
                              className="input controls__description"
                              value={editDescription}
                              onChange={e => setEditDescription(e.target.value)}
                              placeholder="Description"
                              aria-label="Task description"
                              maxLength={1000}
                              rows={2}
                            />
                            <span className="char-count">{editDescription.length}/1000</span>
                          </div>
                          <DateTimeRow
                            editorScope={`inline-edit-${task.taskID}`}
                            openTimeEditorScope={openTimeEditorScope}
                            setOpenTimeEditorScope={setOpenTimeEditorScope}
                            closeFloatingControls={closeFloatingControls}
                            is24Hour={is24Hour}
                            hourOptions={hourOptions}
                            openControl={inlineEditOpenControl}
                            setOpenControl={setInlineEditOpenControl}
                            controlIds={{
                              date: `inline-edit-${task.taskID}:date`,
                              start: `inline-edit-${task.taskID}:start`,
                              end: `inline-edit-${task.taskID}:end`,
                              startHour: `inline-edit-${task.taskID}:start-hour`,
                              startMinute: `inline-edit-${task.taskID}:start-minute`,
                              startAmpm: `inline-edit-${task.taskID}:start-ampm`,
                              endHour: `inline-edit-${task.taskID}:end-hour`,
                              endMinute: `inline-edit-${task.taskID}:end-minute`,
                              endAmpm: `inline-edit-${task.taskID}:end-ampm`,
                            }}
                            dateVal={editDate} hourVal={editHour} minuteVal={editMinute} ampmVal={editAmpm}
                            onDate={setEditDate} onHour={setEditHour} onMinute={setEditMinute} onAmpm={setEditAmpm}
                            showTime={editShowTime}
                            onToggleTime={() => setEditShowTime(p => !p)}
                            onRemoveStart={() => setEditShowTime(false)}
                            showEndTime={editShowEndTime}
                            onToggleEndTime={toggleEditEndTime}
                            endHourVal={editEndHour} endMinuteVal={editEndMinute} endAmpmVal={editEndAmpm}
                            onEndHour={setEditEndHour} onEndMinute={setEditEndMinute} onEndAmpm={setEditEndAmpm}
                          />
                          <RecurrenceControl
                            value={editRepeatFrequency}
                            onChange={setEditRepeatFrequency}
                            openControl={inlineEditOpenControl}
                            onToggle={() => toggleInlineEditDropdown('repeat')}
                            onClose={() => setInlineEditOpenControl(null)}
                            controlId="repeat"
                            menuScope="inline-edit"
                          />
                          {currentEditTimeRangeError && <p className="input-error-msg">{currentEditTimeRangeError}</p>}
                          <div className="form-row item__edit-meta-row">
                            <div className="tag-select" ref={editProjectDropdownRef}>
                              <button
                                type="button"
                                className={`select tag-select__btn${editProjectID !== '' ? ' tag-select__btn--active' : ''}`}
                                data-inline-edit-menu-trigger
                                onClick={() => {
                                  toggleInlineEditDropdown('project');
                                }}
                              >
                                {editProjectID === ''
                                  ? 'Project'
                                  : projects.find(p => p.projectID === Number(editProjectID))?.title ?? 'Project'}
                              </button>
                              {inlineEditOpenControl === 'project' && (
                                <div className="tag-select__dropdown" data-inline-edit-menu-boundary>
                                  <button
                                    type="button"
                                    className="tag-select__new-btn tag-select__new-btn--top"
                                    onClick={() => {
                                      setInlineEditOpenControl(null);
                                      if (showInlineEditProject) { inlineEditProjectInputRef.current?.focus(); }
                                      else { setShowInlineEditProject(true); }
                                    }}
                                  >+ New Project</button>
                                  <button
                                    type="button"
                                    className={`tag-select__item tag-select__item--remove${editProjectID === '' ? ' tag-select__item--on' : ''}`}
                                    onClick={() => { setEditProjectID(''); setInlineEditOpenControl(null); }}
                                  >
                                    No project
                                  </button>
                                  {projects.length === 0
                                    ? <p className="tag-select__empty">No projects yet.</p>
                                    : projects.map(p => {
                                      const selected = Number(editProjectID) === p.projectID;
                                      return (
                                        <button
                                          key={p.projectID}
                                          type="button"
                                          className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}
                                          onClick={() => { setEditProjectID(selected ? '' : p.projectID); setInlineEditOpenControl(null); }}
                                        >
                                          {p.title}
                                        </button>
                                      );
                                    })}
                                </div>
                              )}
                            </div>

                            <div className="tag-select" ref={editTagDropdownRef}>
                              <button
                                type="button"
                                className={`select tag-select__btn${editTaskTagIDs.length > 0 ? ' tag-select__btn--active' : ''}`}
                                data-inline-edit-menu-trigger
                                onClick={() => {
                                  toggleInlineEditDropdown('tags');
                                }}
                              >
                                {editTaskTagIDs.length === 0 ? 'Tags' : `${editTaskTagIDs.length} tag${editTaskTagIDs.length !== 1 ? 's' : ''}`}
                              </button>
                              {inlineEditOpenControl === 'tags' && (
                                <div className="tag-select__dropdown" data-inline-edit-menu-boundary>
                                  <button
                                    type="button"
                                    className="tag-select__new-btn tag-select__new-btn--top"
                                    onClick={() => {
                                      setInlineEditOpenControl(null);
                                      if (showInlineEditTag) { inlineEditTagInputRef.current?.focus(); }
                                      else { setShowInlineEditTag(true); }
                                    }}
                                  >+ New Tag</button>
                                  {tags.length === 0
                                    ? <p className="tag-select__empty">No tags yet.</p>
                                    : tags.map(tag => {
                                      const selected = editTaskTagIDs.includes(tag.tagID);
                                      return (
                                        <label key={tag.tagID} className={`tag-select__item tag-select__item-label${selected ? ' tag-select__item--on' : ''}`}>
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => setEditTaskTagIDs(prev => selected ? prev.filter(id => id !== tag.tagID) : [...prev, tag.tagID])}
                                          />
                                          <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                                          {tag.title}
                                        </label>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          </div>
                          {editTaskTagIDs.length > 0 && (
                            <div className="selected-tags item__edit-selected-tags">
                              {editTaskTagIDs.map(id => {
                                const tag = tags.find(t => t.tagID === id);
                                if (!tag) return null;
                                return (
                                  <span key={id} className="selected-tag-chip" style={tagAccentStyle(tag.color)}>
                                    <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                                    {tag.title}
                                    <button
                                      type="button"
                                      className="selected-tag-chip__remove"
                                      onClick={() => setEditTaskTagIDs(prev => prev.filter(i => i !== id))}
                                      aria-label={`Remove tag ${tag.title}`}
                                    >×</button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {showInlineEditProject && (
                            <div className="project-inline-form">
                              <input
                                ref={inlineEditProjectInputRef}
                                className="input project-inline-form__input"
                                placeholder="Project name..."
                                aria-label="Project name"
                                value={newProjectTitle}
                                maxLength={PROJECT_MAX_LENGTH}
                                onChange={e => setNewProjectTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') addProjectInlineEdit();
                                  if (e.key === 'Escape') { setShowInlineEditProject(false); setNewProjectTitle(''); }
                                }}
                                autoFocus
                              />
                              <button className="btn btn--sm" onClick={addProjectInlineEdit} disabled={!newProjectTitle.trim()}>Create</button>
                              <button type="button" className="inline-form__close" onClick={() => { setShowInlineEditProject(false); setNewProjectTitle(''); }} title="Close" aria-label="Close project form">×</button>
                            </div>
                          )}
                          {showInlineEditTag && (
                            <div className="project-inline-form project-inline-form--tag">
                              <div className="tag-inline-top">
                                <input
                                  ref={inlineEditTagInputRef}
                                  className="input project-inline-form__input"
                                  placeholder="Tag name..."
                                  aria-label="Tag name"
                                  value={newTagTitle}
                                  onChange={e => setNewTagTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') addTagInlineEdit();
                                    if (e.key === 'Escape') { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }
                                  }}
                                  maxLength={TAG_MAX_LENGTH}
                                  autoFocus
                                />
                                <button className="btn btn--sm" onClick={addTagInlineEdit} disabled={!newTagTitle.trim()}>Create</button>
                                <button type="button" className="inline-form__close" onClick={() => { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }} title="Close" aria-label="Close tag form">×</button>
                              </div>
                              <div className="color-palette">
                                {TAG_COLORS.map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    className={`color-swatch${newTagColor === c ? ' color-swatch--selected' : ''}`}
                                    style={{ background: c }}
                                    onClick={() => setNewTagColor(c)}
                                    title={c}
                                    aria-label={`Choose tag color ${c}`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="item__edit-actions">
                            <button className="btn btn--sm" onClick={() => saveEdit(task)}>Save</button>
                            <button className="btn btn--ghost btn--sm" onClick={cancelEdit}>Cancel</button>
                          </div>
                        </div>
                      )}

                      {confirmDeleteId === task.taskID && (
                        <div className="confirm-delete">
                          <span>Delete &quot;{task.title}&quot;?</span>
                          <button className="btn btn--danger btn--sm" onClick={() => removeTask(task.taskID)}>Delete</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </div>
                      )}
                  </>
                </li>
                </Fragment>
              );
            });
            })()}
          </ul>
        )}

        </div>
      </section>

      <section className="mobile-page mobile-page--calendar" data-active={mobilePage === 'calendar'}>
      <Calendar
        tasks={calTasks}
        projects={projects}
        is24Hour={is24Hour}
        isEuropeanDate={isEuropeanDate}
        onEditTask={openTaskFromCalendar}
        hideCompleted={calHideCompleted}
        onToggleHideCompleted={() => setCalHideCompleted(p => !p)}
      />
      </section>
      </div>

      {statusMoveTask && (() => {
        const currentTask = tasks.find(t => t.taskID === statusMoveTask.taskID) ?? statusMoveTask;
        const currentStatusID = normalizeTaskStatus(currentTask.statusID);
        const moveOptions = TASK_STATUS_OPTIONS.filter(option => option.statusID !== currentStatusID);
        return (
          <div className="status-move" onClick={() => setStatusMoveTask(null)}>
            <div className="status-move__panel" role="dialog" aria-modal="true" aria-labelledby="status-move-title" onClick={e => e.stopPropagation()}>
              <div className="status-move__header">
                <div className="status-move__title-wrap" id="status-move-title">
                  <span className="status-move__eyebrow">Move task</span>
                  <span className="status-move__title">{currentTask.title}</span>
                </div>
                <button className="btn btn--ghost btn--icon" aria-label="Close move task" onClick={() => setStatusMoveTask(null)}>✕</button>
              </div>
              <div className="status-move__actions">
                {moveOptions.map(option => (
                  <button
                    key={option.label}
                    type="button"
                    ref={moveOptions[0] === option ? statusFirstActionRef : undefined}
                    className="btn status-move__btn"
                    onClick={() => moveTaskToStatus(currentTask, option.statusID)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {selectedTaskId !== null && (() => {
        const panelTask = tasks.find(t => t.taskID === selectedTaskId);
        if (!panelTask) return null;
        const panelOverdue = isTaskOverdue(panelTask);
        const panelSubtasks = subtasks[selectedTaskId] ?? [];
        const panelNotes    = notes[selectedTaskId]    ?? [];
        const panelReminders = reminders[selectedTaskId] ?? [];
        const panelDone = panelSubtasks.filter(s => s.statusID === 2).length;

        return (
          <div className="card app__detail">
            <div className="detail__header">
              <input
                className="input detail__title-input"
                value={editTitle}
                onChange={e => { setEditTitle(e.target.value); scheduleAutoSave(); }}
                placeholder="Task title"
                aria-label="Task title"
              />
              {editTitle.trim() !== '' && tasks.some(t => t.taskID !== panelTask.taskID && t.title.toLowerCase() === editTitle.trim().toLowerCase()) && (
                <p className="input-warn-msg">A task with this title already exists.</p>
              )}
              <button className="btn btn--ghost btn--icon detail__close" onClick={closePanel} title="Close" aria-label="Close task details">×</button>
            </div>
            {(panelOverdue || panelTask.projectID) && (
              <div className="detail__status-row">
                {panelOverdue && <span className="item__badge">Overdue</span>}
                {panelTask.projectID && (() => {
                  const proj = projects.find(p => p.projectID === Number(panelTask.projectID));
                  return proj ? <span className="item__badge item__project-chip">{proj.title}</span> : null;
                })()}
              </div>
            )}

            <div className="detail__fields">
              <div className="desc-wrap">
                <textarea
                  className="input controls__description"
                  value={editDescription}
                  onChange={e => { setEditDescription(e.target.value); scheduleAutoSave(); }}
                  placeholder="Description"
                  aria-label="Task description"
                  maxLength={1000}
                  rows={3}
                />
                <span className="char-count">{editDescription.length}/1000</span>
              </div>

              <DateTimeRow
                editorScope={`detail-edit-${selectedTaskId}`}
                openTimeEditorScope={openTimeEditorScope}
                setOpenTimeEditorScope={setOpenTimeEditorScope}
                closeFloatingControls={closeFloatingControls}
                is24Hour={is24Hour}
                hourOptions={hourOptions}
                dateVal={editDate} hourVal={editHour} minuteVal={editMinute} ampmVal={editAmpm}
                onDate={v => { setEditDate(v); scheduleAutoSave(0); }}
                onHour={v => { setEditHour(v); scheduleAutoSave(0); }}
                onMinute={v => { setEditMinute(v); scheduleAutoSave(0); }}
                onAmpm={v => { setEditAmpm(v); scheduleAutoSave(0); }}
                showTime={editShowTime}
                onToggleTime={() => { setEditShowTime(p => !p); scheduleAutoSave(0); }}
                onRemoveStart={() => { setEditShowTime(false); scheduleAutoSave(0); }}
                showEndTime={editShowEndTime}
                onToggleEndTime={() => { toggleEditEndTime(); scheduleAutoSave(0); }}
                endHourVal={editEndHour} endMinuteVal={editEndMinute} endAmpmVal={editEndAmpm}
                onEndHour={v => { setEditEndHour(v); scheduleAutoSave(0); }}
                onEndMinute={v => { setEditEndMinute(v); scheduleAutoSave(0); }}
                onEndAmpm={v => { setEditEndAmpm(v); scheduleAutoSave(0); }}
              />
              {currentEditTimeRangeError && <p className="input-error-msg">{currentEditTimeRangeError}</p>}
              <div className="time-shift-row">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => shiftTime('hour')}>+1 hr</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => shiftTime('day')}>+1 day</button>
              </div>

              <div className="form-row">
                <div className="tag-select" ref={editPriorityDropdownRef}>
                  <button
                    type="button"
                    className={`select tag-select__btn${editPriority !== '' ? ' tag-select__btn--active' : ''}`}
                    onClick={() => {
                      const next = !showEditPriorityDropdown;
                      closeFloatingControls();
                      setShowEditPriorityDropdown(next);
                    }}
                  >
                    {editPriority === ''
                      ? 'Add priority'
                      : <><span className="priority-dot" style={{ background: PRIORITY_COLOR[editPriority] }} />{editPriority[0] + editPriority.slice(1).toLowerCase()}</>}
                  </button>
                  {showEditPriorityDropdown && (
                    <div className="tag-select__dropdown">
                      <button type="button" className={`tag-select__item${editPriority === '' ? ' tag-select__item--on' : ''}`} onClick={() => { setEditPriority(''); setShowEditPriorityDropdown(false); scheduleAutoSave(0); }}>Remove priority</button>
                      {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                        <button key={p} type="button" className={`tag-select__item${editPriority === p ? ' tag-select__item--on' : ''}`} onClick={() => { setEditPriority(p); setShowEditPriorityDropdown(false); scheduleAutoSave(0); }}>
                          <span className="priority-dot" style={{ background: PRIORITY_COLOR[p] }} />
                          {p[0] + p.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="tag-select" ref={editProjectDropdownRef}>
                  <button
                    type="button"
                    className={`select tag-select__btn${editProjectID !== '' ? ' tag-select__btn--active' : ''}`}
                    onClick={() => {
                      const next = !showEditProjectDropdown;
                      closeFloatingControls();
                      setShowEditProjectDropdown(next);
                    }}
                  >
                    {editProjectID === '' ? 'Add project' : 'Edit project'}
                  </button>
                  {showEditProjectDropdown && (
                    <div className="tag-select__dropdown">
                      <button type="button" className="tag-select__new-btn tag-select__new-btn--top" onClick={() => { setShowEditProjectDropdown(false); if (showInlineEditProject) { inlineEditProjectInputRef.current?.focus(); } else { setShowInlineEditProject(true); } }}>+ New Project</button>
                      {projects.length === 0
                        ? <p className="tag-select__empty">No projects yet.</p>
                        : projects.map(p => {
                          const selected = Number(editProjectID) === p.projectID;
                          return (
                            <div key={p.projectID} className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}>
                              <label className="tag-select__item-label">
                                <input type="checkbox" checked={selected} onChange={() => { setEditProjectID(selected ? '' : p.projectID); scheduleAutoSave(0); }} />
                                📁 {p.title}
                              </label>
                              <button type="button" className="tag-select__delete" onClick={e => { e.stopPropagation(); removeProject(p.projectID); }} title="Delete project" aria-label="Delete project">×</button>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>

                <div className="tag-select" ref={editTagDropdownRef}>
                  <button
                    type="button"
                    className={`select tag-select__btn${editTaskTagIDs.length > 0 ? ' tag-select__btn--active' : ''}`}
                    onClick={() => {
                      const next = !showEditTagDropdown;
                      closeFloatingControls();
                      setShowEditTagDropdown(next);
                    }}
                  >
                    {editTaskTagIDs.length === 0 ? 'Add tags' : `${editTaskTagIDs.length} tag${editTaskTagIDs.length !== 1 ? 's' : ''}`}
                  </button>
                  {showEditTagDropdown && (
                    <div className="tag-select__dropdown">
                      <button type="button" className="tag-select__new-btn tag-select__new-btn--top" onClick={() => { setShowEditTagDropdown(false); if (showInlineEditTag) { inlineEditTagInputRef.current?.focus(); } else { setShowInlineEditTag(true); } }}>+ New Tag</button>
                      {tags.length === 0
                        ? <p className="tag-select__empty">No tags yet.</p>
                        : tags.map(tag => {
                          const selected = editTaskTagIDs.includes(tag.tagID);
                          return (
                            <div key={tag.tagID}>
                              <div className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}>
                                <label className="tag-select__item-label">
                                  <input type="checkbox" checked={selected} onChange={() => { setEditTaskTagIDs(prev => selected ? prev.filter(id => id !== tag.tagID) : [...prev, tag.tagID]); scheduleAutoSave(0); }} />
                                  {tag.title}
                                </label>
                                <button
                                  type="button"
                                  className="tag-dot tag-dot--clickable"
                                  style={{ background: tag.color ?? '#6366f1' }}
                                  onClick={e => { e.preventDefault(); e.stopPropagation(); setColorPickerTagId(prev => prev === tag.tagID ? null : tag.tagID); }}
                                  title="Change color"
                                  aria-label="Change tag color"
                                />
                                <button type="button" className="tag-select__delete" onClick={e => { e.stopPropagation(); removeTag(tag.tagID); }} title="Delete tag" aria-label="Delete tag">×</button>
                              </div>
                              {colorPickerTagId === tag.tagID && (
                                <div className="tag-color-picker">
                                  {TAG_COLORS.map(c => (
                                    <button key={c} type="button" className={`color-swatch${tag.color === c ? ' color-swatch--selected' : ''}`} style={{ background: c }} onClick={e => { e.stopPropagation(); changeTagColor(tag.tagID, c); }} title={c} aria-label={`Set tag color ${c}`} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>
              </div>

              {editTaskTagIDs.length > 0 && (
                <div className="selected-tags">
                  {editTaskTagIDs.map(id => {
                    const tag = tags.find(t => t.tagID === id);
                    if (!tag) return null;
                    return (
                      <span key={id} className="selected-tag-chip" style={tagAccentStyle(tag.color)}>
                        <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                        {tag.title}
                        <button type="button" className="selected-tag-chip__remove" onClick={() => { setEditTaskTagIDs(prev => prev.filter(i => i !== id)); scheduleAutoSave(0); }} aria-label={`Remove tag ${tag.title}`}>×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              {showInlineEditProject && (
                <div className="project-inline-form">
                  <input ref={inlineEditProjectInputRef} className="input project-inline-form__input" placeholder="Project name…" aria-label="Project name" value={newProjectTitle} maxLength={PROJECT_MAX_LENGTH} onChange={e => setNewProjectTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addProjectInlineEdit(); if (e.key === 'Escape') { setShowInlineEditProject(false); setNewProjectTitle(''); } }} autoFocus />
                  <button className="btn btn--sm" onClick={addProjectInlineEdit} disabled={!newProjectTitle.trim()}>Create</button>
                  <button type="button" className="inline-form__close" onClick={() => { setShowInlineEditProject(false); setNewProjectTitle(''); }} title="Close" aria-label="Close project form">×</button>
                </div>
              )}

              {showInlineEditTag && (
                <div className="project-inline-form project-inline-form--tag">
                  <div className="tag-inline-top">
                    <input ref={inlineEditTagInputRef} className="input project-inline-form__input" placeholder="Tag name…" aria-label="Tag name" value={newTagTitle} onChange={e => setNewTagTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTagInlineEdit(); if (e.key === 'Escape') { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); } }} maxLength={TAG_MAX_LENGTH} autoFocus />
                    <button className="btn btn--sm" onClick={addTagInlineEdit} disabled={!newTagTitle.trim()}>Create</button>
                    <button type="button" className="inline-form__close" onClick={() => { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }} title="Close" aria-label="Close tag form">×</button>
                  </div>
                  <div className="color-palette">
                    {TAG_COLORS.map(c => (
                      <button key={c} type="button" className={`color-swatch${newTagColor === c ? ' color-swatch--selected' : ''}`} style={{ background: c }} onClick={() => setNewTagColor(c)} title={c} aria-label={`Set new tag color ${c}`} />
                    ))}
                  </div>
                </div>
              )}

              <div className="detail__repeat-row">
                <span className="detail__field-label">Repeat</span>
                <select
                  className="select select--sm"
                  value={editRepeatFrequency}
                  onChange={e => { setEditRepeatFrequency(e.target.value as RepeatFrequency); scheduleAutoSave(0); }}
                >
                  <option value="">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

            </div>

            <div className="detail__section">
              <button className="detail__section-header detail__section-toggle" onClick={() => togglePanelSection('subtasks')}>
                <span className="detail__section-title">Subtasks</span>
                <div className="detail__section-header-right">
                  {panelSubtasks.length > 0 && (
                    <span className={`item__badge ${panelDone === panelSubtasks.length ? 'item__badge--subtasks-done' : 'item__badge--subtasks'}`}>
                      {panelDone}/{panelSubtasks.length}
                    </span>
                  )}
                  <span className="detail__chevron">{openSections.has('subtasks') ? '▲' : '▼'}</span>
                </div>
              </button>
              {openSections.has('subtasks') && (
                <>
                  <div className="sec-panel__add">
                    <input
                      className="input"
                      placeholder="New subtask…"
                      aria-label="New subtask"
                      value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addSubtask(selectedTaskId); }}
                      autoFocus
                    />
                    <button className="btn btn--sm" onClick={() => addSubtask(selectedTaskId)}>Add</button>
                  </div>
                  {panelSubtasks.length === 0
                    ? <p className="sec-panel__empty">No subtasks yet.</p>
                    : panelSubtasks.map(s => (
                      <div key={s.subTaskID} className="sec-row">
                        <input type="checkbox" className="item__checkbox" checked={s.statusID === 2} onChange={() => toggleSubtask(selectedTaskId, s)} aria-label={`Toggle subtask ${s.title}`} />
                        {editingSubtaskId === s.subTaskID ? (
                          <input
                            className="input sec-row__edit-input"
                            aria-label="Subtask title"
                            autoFocus
                            value={editingSubtaskTitle}
                            onChange={e => setEditingSubtaskTitle(e.target.value)}
                            onBlur={() => updateSubtaskTitle(selectedTaskId, s)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') updateSubtaskTitle(selectedTaskId, s);
                              if (e.key === 'Escape') { setEditingSubtaskId(null); setEditingSubtaskTitle(''); }
                            }}
                          />
                        ) : (
                          <span
                            className={`sec-row__title${s.statusID === 2 ? ' sec-row__title--done' : ''}`}
                            onClick={() => { setEditingSubtaskId(s.subTaskID); setEditingSubtaskTitle(s.title); }}
                            title="Click to edit"
                          >
                            {s.title}
                          </span>
                        )}
                        <button className="btn btn--danger btn--icon" onClick={() => removeSubtask(selectedTaskId, s.subTaskID)} aria-label={`Delete subtask ${s.title}`}>✕</button>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

            <div className="detail__section">
              <button className="detail__section-header detail__section-toggle" onClick={() => togglePanelSection('notes')}>
                <span className="detail__section-title">Notes</span>
                <div className="detail__section-header-right">
                  {panelNotes.length > 0 && <span className="item__badge item__badge--subtasks">{panelNotes.length}</span>}
                  <span className="detail__chevron">{openSections.has('notes') ? '▲' : '▼'}</span>
                </div>
              </button>
              {openSections.has('notes') && (
                <>
                  <div className="sec-panel__add sec-panel__add--col">
                    <textarea className="input controls__description" placeholder="Note content…" aria-label="Note text" value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} rows={2} autoFocus />
                    <button className="btn btn--sm" onClick={() => addNote(selectedTaskId)}>Add Note</button>
                  </div>
                  {panelNotes.length === 0
                    ? <p className="sec-panel__empty">No notes yet.</p>
                    : panelNotes.map(n => (
                      <div key={n.noteID} className="note-row">
                        <div className="note-row__body">
                          <p className="note-row__content">{n.context}</p>
                          <span className="note-row__time">{formatDateTime(n.timestamp)}</span>
                        </div>
                        <button className="btn btn--danger btn--icon" onClick={() => removeNote(selectedTaskId, n.noteID)} aria-label="Delete note">✕</button>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

            <div className="detail__section">
              <button className="detail__section-header detail__section-toggle" onClick={() => togglePanelSection('reminders')}>
                <span className="detail__section-title">Reminders</span>
                <div className="detail__section-header-right">
                  {panelReminders.length > 0 && <span className="item__badge item__badge--subtasks">{panelReminders.length}</span>}
                  <span className="detail__chevron">{openSections.has('reminders') ? '▲' : '▼'}</span>
                </div>
              </button>
              {openSections.has('reminders') && (
                <>
                  <div className="sec-panel__add sec-panel__add--col">
                    <DateTimeRow
                      editorScope={`reminder-${selectedTaskId}`}
                      openTimeEditorScope={openTimeEditorScope}
                      setOpenTimeEditorScope={setOpenTimeEditorScope}
                      closeFloatingControls={closeFloatingControls}
                      is24Hour={is24Hour}
                      hourOptions={hourOptions}
                      dateVal={newReminderDate} hourVal={newReminderHour} minuteVal={newReminderMinute} ampmVal={newReminderAmpm}
                      onDate={setNewReminderDate} onHour={setNewReminderHour} onMinute={setNewReminderMinute} onAmpm={setNewReminderAmpm}
                    />
                    <input className="input" placeholder="Reminder message (optional)…" aria-label="Reminder message" value={newReminderMessage} onChange={e => setNewReminderMessage(e.target.value)} />
                    <button className="btn btn--sm" onClick={() => addReminder(selectedTaskId)}>Add Reminder</button>
                  </div>
                  {panelReminders.length === 0
                    ? <p className="sec-panel__empty">No reminders yet.</p>
                    : panelReminders.map(r => (
                      <div key={r.reminderID} className="sec-row">
                        <div className="sec-row__body">
                          <span className="sec-row__title">{formatDateTime(r.dueDate)}</span>
                          {r.message && <span className="sec-row__sub">{r.message}</span>}
                        </div>
                        <button className="btn btn--danger btn--icon" onClick={() => removeReminder(selectedTaskId, r.reminderID)} aria-label="Delete reminder">✕</button>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

            <div className="detail__section">
              <button className="detail__section-header detail__section-toggle" onClick={() => togglePanelSection('attachments')}>
                <span className="detail__section-title">Links</span>
                <div className="detail__section-header-right">
                  {(attachments[selectedTaskId] ?? []).length > 0 && (
                    <span className="item__badge item__badge--subtasks">{(attachments[selectedTaskId] ?? []).length}</span>
                  )}
                  <span className="detail__chevron">{openSections.has('attachments') ? '▲' : '▼'}</span>
                </div>
              </button>
              {openSections.has('attachments') && (
                <>
                  <div className="sec-panel__add sec-panel__add--col">
                    <input
                      className="input"
                      placeholder="URL…"
                      aria-label="Attachment URL"
                      value={newAttachmentUrl}
                      onChange={e => setNewAttachmentUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addAttachment(selectedTaskId); }}
                      autoFocus
                    />
                    <input
                      className="input"
                      placeholder="Label (optional)…"
                      aria-label="Attachment label"
                      value={newAttachmentLabel}
                      onChange={e => setNewAttachmentLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addAttachment(selectedTaskId); }}
                    />
                    <button className="btn btn--sm" onClick={() => addAttachment(selectedTaskId)}>Add Link</button>
                  </div>
                  {(attachments[selectedTaskId] ?? []).length === 0
                    ? <p className="sec-panel__empty">No links yet.</p>
                    : (attachments[selectedTaskId] ?? []).map(a => (
                      <div key={a.attachmentID} className="sec-row">
                        <div className="sec-row__body">
                          <a href={a.fileORLink} target="_blank" rel="noopener noreferrer" className="attachment-link">
                            {a.metadata || a.fileORLink}
                          </a>
                        </div>
                        <button className="btn btn--danger btn--icon" onClick={() => removeAttachment(selectedTaskId, a.attachmentID)} aria-label="Delete attachment">✕</button>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

          </div>
        );
      })()}

    </div>
  );
}

export default App;
