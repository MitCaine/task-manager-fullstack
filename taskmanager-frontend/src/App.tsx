import { useEffect, useLayoutEffect, useMemo, useRef, useState, isValidElement, Children, Fragment } from 'react';
import type { ReactElement, RefObject, SelectHTMLAttributes } from 'react';
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
import { buildDateTimeString, formatDate, extractDateParts } from './utils/dateTime';
import { isTaskOverdue } from './utils/taskUtils';
import Calendar from './components/Calendar';

type Ampm = 'AM' | 'PM';
type Theme = 'system' | 'light' | 'dark';
type SortBy = 'dueAsc' | 'dueDesc' | 'titleAsc' | 'overdueFirst' | 'priorityDesc';
type FilterStatus = 'all' | 'active' | 'completed' | 'overdue' | 'high' | 'medium' | 'low';

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

const TAG_MAX_LENGTH = 25;
const PROJECT_MAX_LENGTH = 25;

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const PRIORITY_COLOR: Record<string, string> = { LOW: '#4ade80', MEDIUM: '#fbbf24', HIGH: '#f87171' };

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

function SizedSelect({ value, onChange, children, className }: SelectHTMLAttributes<HTMLSelectElement>) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const selectedText = Children.toArray(children)
    .filter((c): c is ReactElement => isValidElement(c))
    .find(c => String(c.props.value) === String(value ?? ''))?.props.children ?? '';

  useLayoutEffect(() => {
    if (spanRef.current && selectRef.current) {
      selectRef.current.style.width = spanRef.current.offsetWidth + 'px';
    }
  }, [selectedText]);

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        ref={spanRef}
        className={className}
        aria-hidden="true"
        style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none', top: 0, left: 0 }}
      >
        {selectedText}
      </span>
      <select ref={selectRef} value={value} onChange={onChange} className={className}>
        {children}
      </select>
    </span>
  );
}

function App(): JSX.Element {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Workspace name ──────────────────────────────────────────────────────────
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem('workspaceName') ?? 'Task Manager');
  const [editingWorkspaceName, setEditingWorkspaceName] = useState(false);

  // ── Add form state ──────────────────────────────────────────────────────────
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

  // ── UI preferences ──────────────────────────────────────────────────────────
  const [is24Hour, setIs24Hour] = useState(false);
  const [isEuropeanDate, setIsEuropeanDate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showInlineTag, setShowInlineTag] = useState(false);
  const [newTaskTagIDs, setNewTaskTagIDs] = useState<number[]>([]);
  const [viewTab, setViewTab] = useState<'all' | 'today' | 'week' | 'month' | 'board'>('all');
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'system'
  );

  // ── Search / sort / filter ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('dueAsc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // ── Edit state ──────────────────────────────────────────────────────────────
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

  // ── Delete confirmation ─────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // ── Detail panel ────────────────────────────────────────────────────────────
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // ── Expanded sections data (subtasks / notes / reminders) ───────────────────
  const [subtasks, setSubtasks] = useState<Record<number, Subtask[]>>({});
  const [notes, setNotes] = useState<Record<number, Note[]>>({});
  const [reminders, setReminders] = useState<Record<number, Reminder[]>>({});

  // ── New subtask / note / reminder forms ─────────────────────────────────────
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderHour, setNewReminderHour] = useState('09');
  const [newReminderMinute, setNewReminderMinute] = useState('00');
  const [newReminderAmpm, setNewReminderAmpm] = useState<Ampm>('AM');
  const [newReminderMessage, setNewReminderMessage] = useState('');

  // ── Calendar preferences ────────────────────────────────────────────────────
  const [calHideCompleted, setCalHideCompleted] = useState(false);

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());

  // ── Stats panel ──────────────────────────────────────────────────────────────
  const [showStats, setShowStats] = useState(false);

  // ── In-app reminder toasts ───────────────────────────────────────────────────
  type Toast = { id: number; reminderID: number; taskID: number; taskTitle: string; message: string };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // ── Kanban drag ──────────────────────────────────────────────────────────────
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);

  // ── Attachments ──────────────────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<Record<number, Attachment[]>>({});
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentLabel, setNewAttachmentLabel] = useState('');

  // ── Recurring tasks ──────────────────────────────────────────────────────────
  const [editRepeatFrequency, setEditRepeatFrequency] = useState<'daily' | 'weekly' | 'monthly' | ''>('');
  const [originalRepeatFrequency, setOriginalRepeatFrequency] = useState<string>('');

  // ── Projects ────────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectID, setNewProjectID] = useState<number | ''>('');
  const [editProjectID, setEditProjectID] = useState<number | ''>('');
  const [filterProjectID, setFilterProjectID] = useState<number | ''>('');
  const [showInlineProject, setShowInlineProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  // ── Tags ────────────────────────────────────────────────────────────────────
  const [tags, setTags] = useState<Tag[]>([]);
  const [filterTagID, setFilterTagID] = useState<number | ''>('');
  const [newTagTitle, setNewTagTitle] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [colorPickerTagId, setColorPickerTagId] = useState<number | null>(null);

  // ── Keyboard shortcut ref ───────────────────────────────────────────────────
  const titleInputRef = useRef<HTMLInputElement>(null);
  const workspaceInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const inlineTagInputRef = useRef<HTMLInputElement>(null);
  const inlineProjectInputRef = useRef<HTMLInputElement>(null);
  const editPriorityDropdownRef = useRef<HTMLDivElement>(null);
  const editProjectDropdownRef = useRef<HTMLDivElement>(null);
  const editTagDropdownRef = useRef<HTMLDivElement>(null);
  const inlineEditProjectInputRef = useRef<HTMLInputElement>(null);
  const inlineEditTagInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-save refs ───────────────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const saveEditRef  = useRef<(task: Task) => Promise<void>>(async () => {});
  const tasksRef     = useRef<Task[]>([]);

  // ── Reminder notification dedup ─────────────────────────────────────────────
  const firedReminders = useRef<Set<number>>(new Set());

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    getTasks()
      .then(data => { setTasks(data); setLoading(false); })
      .catch(() => { setError('Failed to load tasks. Is the backend running?'); setLoading(false); });
    getProjects().then(setProjects).catch(() => {});
    getTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        if (selectedTaskId !== null) { closePanel(); return; }
        if (search !== '') { setSearch(''); return; }
        if (bulkMode) { setBulkMode(false); setBulkSelectedIds(new Set()); return; }
        if (showStats) { setShowStats(false); return; }
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
  }, [selectedTaskId, search, bulkMode, showStats]); // closePanel is intentionally excluded — it's recreated every render

  useOutsideClick(tagDropdownRef,          showTagDropdown,          () => setShowTagDropdown(false));
  useOutsideClick(projectDropdownRef,      showProjectDropdown,      () => setShowProjectDropdown(false));
  useOutsideClick(priorityDropdownRef,     showPriorityDropdown,     () => setShowPriorityDropdown(false));
  useOutsideClick(editPriorityDropdownRef, showEditPriorityDropdown, () => setShowEditPriorityDropdown(false));
  useOutsideClick(editProjectDropdownRef,  showEditProjectDropdown,  () => setShowEditProjectDropdown(false));
  useOutsideClick(editTagDropdownRef,      showEditTagDropdown,      () => setShowEditTagDropdown(false));

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Reminder polling — shows in-app toasts when a reminder's time arrives
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

  // ── Computed ────────────────────────────────────────────────────────────────
  const hourOptions = useMemo(
    () => is24Hour
      ? Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
      : ['12', ...Array.from({ length: 11 }, (_, i) => String(i + 1).padStart(2, '0'))],
    [is24Hour]
  );

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
    // Default: dueAsc
    return doneToBottom([...list].sort((a, b) => (a.dateTimeScheduled ?? '').localeCompare(b.dateTimeScheduled ?? '')));
  }, [tasks, search, filterStatus, sortBy]);

  const completedCount = useMemo(() => tasks.filter(t => t.statusID === 2).length, [tasks]);
  const overdueCount   = useMemo(() => tasks.filter(t => isTaskOverdue(t)).length, [tasks]);

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

  // ── Formatters ───────────────────────────────────────────────────────────────
  const fmtDate = (dt: string | null | undefined) => formatDate(dt, locale, is24Hour) || 'No due date';

  const formatDateTime = (dt: string) =>
    new Date(dt).toLocaleString(locale, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: !is24Hour,
    });

  // ── Task handlers ────────────────────────────────────────────────────────────
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
    try {
      const saved = await createTask({ title: input.trim(), description: description.trim(), dateTimeScheduled, priority: newPriority || null, projectID: newProjectID !== '' ? newProjectID : null });
      setTasks(prev => [...prev, saved]);
      if (newTaskTagIDs.length > 0) {
        await Promise.all(newTaskTagIDs.map(tagId => addTagToTask(saved.taskID, tagId)));
        const tagObjects = tags.filter(t => newTaskTagIDs.includes(t.tagID));
        setTasks(prev => prev.map(t => t.taskID === saved.taskID ? { ...t, tags: tagObjects } : t));
      }
      setInput('');
      setDescription('');
      setNewPriority('');
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

  const toggleComplete = async (task: Task) => {
    // ── Recurring: spawn next occurrence → delete original ───────────────────
    if (task.recurrenceRuleID) {
      try {
        const rule = await getRecurrence(task.taskID);
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
        const nextTask = await createTask({
          title: task.title, description: task.description ?? '',
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
        setTasks(prev => [
          ...prev.filter(t => t.taskID !== task.taskID),
          { ...nextTask, recurrenceRuleID: fresh.recurrenceRuleID },
        ]);
        if (selectedTaskId === task.taskID) setSelectedTaskId(null);
        // Flash the newly spawned card so the user can track it
        setTimeout(() => {
          const el = document.getElementById(`task-${nextTask.taskID}`);
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('item--highlight');
          setTimeout(() => el.classList.remove('item--highlight'), 1200);
        }, 50);
      } catch {
        setError('Failed to complete recurring task.');
      }
      return;
    }

    // ── Non-recurring: toggle done ↔ active ──────────────────────────────────
    const newStatusID = task.statusID === 2 ? null : 2;
    try {
      const saved = await patchTaskStatus(task.taskID, newStatusID);
      setTasks(prev => prev.map(t => t.taskID === saved.taskID ? saved : t));
    } catch {
      setError('Failed to update task status.');
    }
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
    // Fetch fresh task from backend to get authoritative tag list
    try {
      const fresh = await getTask(task.taskID);
      setEditTaskTagIDs((fresh.tags ?? []).map(t => t.tagID));
      setTasks(prev => prev.map(t => t.taskID === fresh.taskID ? { ...t, tags: fresh.tags } : t));
    } catch {
      setEditTaskTagIDs((task.tags ?? []).map(t => t.tagID));
    }
    // Load recurrence rule for repeat dropdown
    if (!task.recurrenceRuleID) {
      setEditRepeatFrequency(''); setOriginalRepeatFrequency('');
    } else {
      getRecurrence(task.taskID)
        .then(rule => {
          const freq = rule.frequency as 'daily' | 'weekly' | 'monthly';
          setEditRepeatFrequency(freq); setOriginalRepeatFrequency(freq);
        })
        .catch(() => { setEditRepeatFrequency(''); setOriginalRepeatFrequency(''); });
    }
  };

  const cancelEdit = () => setEditingId(null);

  const focusTaskById = (taskId: number) => {
    // Clear all filters so the task is guaranteed to be visible in the list
    setSearch('');
    setFilterStatus('all');
    setFilterProjectID('');
    setFilterTagID('');
    // Scroll and flash after state settles
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
    // Build a Date from current edit state (or now if no date set)
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
        // No time shown — for +1 hour use current wall-clock time; for +1 day keep midnight
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
    // +1 day: preserve whatever time state already exists

    scheduleAutoSave(0);
  };

  const saveEdit = async (task: Task) => {
    const dateTimeScheduled = editDate
      ? (editShowTime
          ? buildDateTimeString(editDate, editHour, editMinute, editAmpm, is24Hour)
          : `${editDate}T00:00:00`)
      : null;
    try {
      const saved = await updateTask(task.taskID, {
        title: editTitle.trim() || task.title,
        description: editDescription.trim(),
        dateTimeScheduled,
        userID: task.userID,
        statusID: task.statusID,
        priority: editPriority || null,
        projectID: editProjectID !== '' ? editProjectID : null,
      });
      // Sync tags
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
      // Persist repeat if changed
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

  // ── Panel open / close ───────────────────────────────────────────────────────
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

  // ── Subtask handlers ─────────────────────────────────────────────────────────
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

  // ── Note handlers ────────────────────────────────────────────────────────────
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

  // ── Reminder handlers ────────────────────────────────────────────────────────
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

  // ── Project handlers ─────────────────────────────────────────────────────────
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

  // ── Tag handlers ─────────────────────────────────────────────────────────────
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

  // ── Task duplication ─────────────────────────────────────────────────────────
  const duplicateTask = async (task: Task) => {
    try {
      const saved = await createTask({
        title: task.title + ' (copy)',
        description: task.description ?? '',
        dateTimeScheduled: task.dateTimeScheduled ?? null,
        userID: task.userID,
        statusID: null,
        priority: task.priority ?? null,
        projectID: task.projectID ?? null,
      });
      if (task.tags && task.tags.length > 0) {
        await Promise.all(task.tags.map(tag => addTagToTask(saved.taskID, tag.tagID)));
        saved.tags = task.tags;
      }
      setTasks(prev => [...prev, saved]);
    } catch {
      setError('Failed to duplicate task.');
    }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────────
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
      await Promise.all(ids.map(id => patchTaskStatus(id, 2)));
      setTasks(prev => prev.map(t => ids.includes(t.taskID) ? { ...t, statusID: 2 } : t));
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

  // ── Toast (snooze reminders) ─────────────────────────────────────────────────
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

  // ── Kanban drag ──────────────────────────────────────────────────────────────
  const handleKanbanDrop = async (statusID: number | null) => {
    if (dragTaskId === null) return;
    try {
      const saved = await patchTaskStatus(dragTaskId, statusID);
      setTasks(prev => prev.map(t => t.taskID === saved.taskID ? saved : t));
    } catch {
      setError('Failed to move task.');
    }
    setDragTaskId(null);
  };

  // ── Attachments ──────────────────────────────────────────────────────────────
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

  // ── Time select (custom dropdown to avoid Chrome native-select rendering bug) ─
  const TimeSelect = ({ value, options, onChange }: {
    value: string; options: string[]; onChange: (v: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    const handleOpen = () => {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
      setOpen(p => !p);
    };

    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (
          btnRef.current && !btnRef.current.contains(e.target as Node) &&
          dropRef.current && !dropRef.current.contains(e.target as Node)
        ) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    useEffect(() => {
      if (!open || !dropRef.current) return;
      const selected = dropRef.current.querySelector('.time-select__item--on');
      selected?.scrollIntoView({ block: 'center' });
    }, [open]);

    return (
      <div className="time-select">
        <button type="button" className="select time-select__btn" ref={btnRef} onClick={handleOpen}>
          {value}
        </button>
        {open && (
          <div className="time-select__dropdown" ref={dropRef} style={{ top: pos.top, left: pos.left, width: pos.width }}>
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                className={`time-select__item${opt === value ? ' time-select__item--on' : ''}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Shared date + time row ───────────────────────────────────────────────────
  const DateTimeRow = ({
    dateVal, hourVal, minuteVal, ampmVal,
    onDate, onHour, onMinute, onAmpm,
    showTime, onToggleTime, onRemoveStart,
    showEndTime, onToggleEndTime,
    endHourVal, endMinuteVal, endAmpmVal,
    onEndHour, onEndMinute, onEndAmpm,
  }: {
    dateVal: string; hourVal: string; minuteVal: string; ampmVal: Ampm;
    onDate: (v: string) => void; onHour: (v: string) => void;
    onMinute: (v: string) => void; onAmpm: (v: Ampm) => void;
    showTime?: boolean; onToggleTime?: () => void; onRemoveStart?: () => void;
    showEndTime?: boolean; onToggleEndTime?: () => void;
    endHourVal?: string; endMinuteVal?: string; endAmpmVal?: Ampm;
    onEndHour?: (v: string) => void; onEndMinute?: (v: string) => void; onEndAmpm?: (v: Ampm) => void;
  }) => (
    <div className="datetime-row">
      <div className="datetime-row__top">
        <input className="input datetime-row__date" type="date" value={dateVal} onChange={e => onDate(e.target.value)} />
        {onToggleTime && (!showTime && !showEndTime ? (
          <>
            <button type="button" className="btn btn--ghost btn--sm datetime-row__time-toggle" onClick={onToggleTime}>
              + Start time
            </button>
            {onToggleEndTime && (
              <button type="button" className="btn btn--ghost btn--sm datetime-row__time-toggle" onClick={onToggleEndTime}>
                + End time
              </button>
            )}
          </>
        ) : !showTime && showEndTime ? (
          <button type="button" className="btn btn--ghost btn--sm datetime-row__time-toggle" onClick={onToggleTime}>
            + Start time
          </button>
        ) : showTime && !showEndTime && onToggleEndTime ? (
          <button type="button" className="btn btn--ghost btn--sm datetime-row__time-toggle" onClick={onToggleEndTime}>
            + End time
          </button>
        ) : null)}
      </div>
      {showTime !== false && (
        <div className="datetime-row__time datetime-row__time--end">
          <span className="datetime-row__end-label datetime-row__end-label--fixed">Start:</span>
          <TimeSelect value={hourVal} options={hourOptions} onChange={onHour} />
          <span className="time-sep">:</span>
          <TimeSelect value={minuteVal} options={MINUTE_OPTIONS} onChange={onMinute} />
          {!is24Hour && (
            <select className="select" value={ampmVal} onChange={e => onAmpm(e.target.value as Ampm)}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          )}
          {onRemoveStart && (
            <button type="button" className="btn btn--ghost btn--sm datetime-row__end-toggle" onClick={onRemoveStart}>
              ✕
            </button>
          )}
        </div>
      )}
      {showEndTime && onEndHour && onEndMinute && onEndAmpm && (
        <div className="datetime-row__time datetime-row__time--end">
          <span className="datetime-row__end-label datetime-row__end-label--fixed">End:</span>
          <TimeSelect value={endHourVal ?? '12'} options={hourOptions} onChange={onEndHour} />
          <span className="time-sep">:</span>
          <TimeSelect value={endMinuteVal ?? '00'} options={MINUTE_OPTIONS} onChange={onEndMinute} />
          {!is24Hour && (
            <select className="select" value={endAmpmVal} onChange={e => onEndAmpm(e.target.value as Ampm)}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          )}
          <button type="button" className="btn btn--ghost btn--sm datetime-row__end-toggle" onClick={onToggleEndTime}>
            ✕
          </button>
        </div>
      )}
    </div>
  );

  // ── Keep auto-save refs fresh every render ───────────────────────────────────
  saveEditRef.current = saveEdit;
  tasksRef.current    = tasks;

  // ── Computed stats ───────────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── In-app reminder toasts ───────────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div className="toasts">
          {toasts.map(toast => (
            <div key={toast.id} className="toast">
              <div className="toast__header">
                <span className="toast__title">⏰ {toast.taskTitle}</span>
                <button className="toast__close" onClick={() => dismissToast(toast.id)}>×</button>
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

      {/* ── Stats modal ──────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Stats</h2>
              <button className="btn btn--ghost btn--icon" onClick={() => setShowStats(false)}>×</button>
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

      <div className="card app__add">

        {/* Header */}
        <div className="spread">
          {editingWorkspaceName ? (
            <input
              ref={workspaceInputRef}
              className="app__title-input"
              value={workspaceName}
              autoFocus
              onChange={e => setWorkspaceName(e.target.value)}
              onBlur={() => {
                const trimmed = workspaceName.trim() || 'Task Manager';
                setWorkspaceName(trimmed);
                localStorage.setItem('workspaceName', trimmed);
                setEditingWorkspaceName(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') { workspaceInputRef.current?.blur(); }
                if (e.key === 'Escape') {
                  setWorkspaceName(localStorage.getItem('workspaceName') ?? 'Task Manager');
                  setEditingWorkspaceName(false);
                }
              }}
            />
          ) : (
            <h1 className="app__title" onClick={() => setEditingWorkspaceName(true)} title="Click to rename">
              {workspaceName}
            </h1>
          )}
          <div className="header-actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setShowStats(true)}>
              ▤ Stats
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowSettings(p => !p)}>
              ⚙ Settings
            </button>
          </div>
        </div>
        <p className="app__subtitle">
          {new Date().toLocaleDateString(isEuropeanDate ? 'en-GB' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          {' '}
          <span className="task-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
          {overdueCount > 0 && (
            <> <span className="task-count task-count--overdue">{overdueCount} overdue</span></>
          )}
        </p>

        {/* Settings panel */}
        {showSettings && (
          <div className="settings-panel">
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

        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button className="error-banner__close" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Add form */}
        <div className="controls">
          <input
            ref={titleInputRef}
            className={`input${titleError ? ' input--error' : ''}`}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); if (titleError) setTitleError(false); }}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Task title… (press N to focus)"
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
              maxLength={1000}
              rows={2}
            />
            <span className="char-count">{description.length}/1000</span>
          </div>
          <DateTimeRow
            dateVal={date} hourVal={hour} minuteVal={minute} ampmVal={ampm}
            onDate={setDate} onHour={setHour} onMinute={setMinute} onAmpm={setAmpm}
            showTime={showAddTime} onToggleTime={() => setShowAddTime(p => !p)} onRemoveStart={() => setShowAddTime(false)}
            showEndTime={showAddEndTime} onToggleEndTime={toggleAddEndTime}
            endHourVal={endHour} endMinuteVal={endMinute} endAmpmVal={endAmpm}
            onEndHour={setEndHour} onEndMinute={setEndMinute} onEndAmpm={setEndAmpm}
          />
          <div className="form-row">
            <div className="tag-select" ref={priorityDropdownRef}>
              <button
                type="button"
                className={`select tag-select__btn${newPriority !== '' ? ' tag-select__btn--active' : ''}`}
                onClick={() => setShowPriorityDropdown(p => !p)}
              >
                {newPriority === ''
                  ? 'Add priority'
                  : <><span className="priority-dot" style={{ background: PRIORITY_COLOR[newPriority] }} />{newPriority[0] + newPriority.slice(1).toLowerCase()}</>}
              </button>
              {showPriorityDropdown && (
                <div className="tag-select__dropdown">
                  <label
                    className={`tag-select__item${newPriority === '' ? ' tag-select__item--on' : ''}`}
                    onClick={() => { setNewPriority(''); setShowPriorityDropdown(false); }}
                  >
                    Remove priority
                  </label>
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                    <label
                      key={p}
                      className={`tag-select__item${newPriority === p ? ' tag-select__item--on' : ''}`}
                      onClick={() => { setNewPriority(p); setShowPriorityDropdown(false); }}
                    >
                      <span className="priority-dot" style={{ background: PRIORITY_COLOR[p] }} />
                      {p[0] + p.slice(1).toLowerCase()}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="tag-select" ref={projectDropdownRef}>
              <button
                type="button"
                className={`select tag-select__btn${newProjectID !== '' ? ' tag-select__btn--active' : ''}`}
                onClick={() => setShowProjectDropdown(p => !p)}
              >
                {newProjectID === '' ? 'Add project' : 'Edit project'}
              </button>
              {showProjectDropdown && (
                <div className="tag-select__dropdown">
                  <button
                    type="button"
                    className="tag-select__new-btn tag-select__new-btn--top"
                    onClick={() => {
                      setShowProjectDropdown(false);
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
                onClick={() => setShowTagDropdown(p => !p)}
              >
                {newTaskTagIDs.length === 0
                  ? 'Add tags'
                  : `${newTaskTagIDs.length} tag${newTaskTagIDs.length === 1 ? '' : 's'}`}
              </button>
              {showTagDropdown && (
                <div className="tag-select__dropdown">
                  <button
                    type="button"
                    className="tag-select__new-btn tag-select__new-btn--top"
                    onClick={() => {
                      setShowTagDropdown(false);
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
                              <span
                                className="tag-dot tag-dot--clickable"
                                style={{ background: tag.color ?? '#6366f1' }}
                                onClick={e => { e.preventDefault(); e.stopPropagation(); setColorPickerTagId(prev => prev === tag.tagID ? null : tag.tagID); }}
                                title="Change color"
                              />
                              {tag.title}
                            </label>
                            <button
                              type="button"
                              className="tag-select__delete"
                              onClick={e => { e.stopPropagation(); removeTag(tag.tagID); }}
                              title="Delete tag"
                            >×</button>
                          </div>
                          {colorPickerTagId === tag.tagID && (
                            <div className="tag-color-picker">
                              {TAG_COLORS.map(c => (
                                <button key={c} type="button" className={`color-swatch${tag.color === c ? ' color-swatch--selected' : ''}`} style={{ background: c }} onClick={e => { e.stopPropagation(); changeTagColor(tag.tagID, c); }} title={c} />
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
          {newProjectID !== '' && (() => {
            const proj = projects.find(p => p.projectID === newProjectID);
            return proj ? (
              <div className="form-selected-chip">
                <span className="item__badge item__project-chip">{proj.title}</span>
                <button type="button" className="form-chip-clear" onClick={() => setNewProjectID('')}>×</button>
              </div>
            ) : null;
          })()}
          {newTaskTagIDs.length > 0 && (
            <div className="selected-tags">
              {newTaskTagIDs.map(id => {
                const tag = tags.find(t => t.tagID === id);
                if (!tag) return null;
                return (
                  <span key={id} className="selected-tag-chip" style={{ borderColor: tag.color ?? '#6366f1', color: tag.color ?? '#6366f1' }}>
                    <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                    {tag.title}
                    <button
                      type="button"
                      className="selected-tag-chip__remove"
                      onClick={() => setNewTaskTagIDs(prev => prev.filter(i => i !== id))}
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
              <button type="button" className="inline-form__close" onClick={() => { setShowInlineProject(false); setNewProjectTitle(''); }} title="Close">×</button>
            </div>
          )}
          {showInlineTag && (
            <div className="project-inline-form project-inline-form--tag">
              <div className="tag-inline-top">
                <input
                  ref={inlineTagInputRef}
                  className="input project-inline-form__input"
                  placeholder="Tag name…"
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
                <button type="button" className="inline-form__close" onClick={() => { setShowInlineTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }} title="Close">×</button>
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
                  />
                ))}
              </div>
            </div>
          )}
          <button className="btn" onClick={addTask}>Add Task</button>
        </div>

      </div>{/* /app__add */}

      <div className={`card app__list${selectedTaskId !== null ? ' app__list--narrow' : ''}`}>

        {/* View tabs */}
        <div className="view-tabs">
          {(['all', 'today', 'week', 'month', 'board'] as const).map(tab => (
            <button
              key={tab}
              className={`view-tab${viewTab === tab ? ' view-tab--active' : ''}`}
              onClick={() => setViewTab(tab)}
            >
              {tab === 'all' ? 'All' : tab === 'today' ? 'Today' : tab === 'week' ? 'This Week' : tab === 'month' ? 'This Month' : 'Board'}
            </button>
          ))}
        </div>

        {/* Sort / filter controls */}
        <div className="list-controls list-controls--with-reset">
          <div className="list-controls__group">
            <span className="list-controls__label">Sort</span>
            {([
              ['dueAsc',       '↑ Date'],
              ['dueDesc',      '↓ Date'],
              ['titleAsc',     'A–Z'],
              ['priorityDesc', 'Priority'],
              ['overdueFirst', 'Overdue first'],
            ] as [SortBy, string][]).map(([val, label]) => (
              <button
                key={val}
                className={`btn btn--ghost btn--sm${sortBy === val ? ' btn--active' : ''}`}
                onClick={() => setSortBy(val)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="list-controls__group">
            <span className="list-controls__label">Show</span>
            {([
              ['all',       'All'],
              ['active',    'Active'],
              ['completed', 'Done'],
              ['overdue',   'Overdue'],
            ] as [FilterStatus, string][]).map(([val, label]) => (
              <button
                key={val}
                className={`btn btn--ghost btn--sm${filterStatus === val ? ' btn--active' : ''}`}
                onClick={() => setFilterStatus(val)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="list-controls__group">
            <span className="list-controls__label">Priority</span>
            {([
              ['all',    null,      'All'],
              ['high',   '#f87171', 'High'],
              ['medium', '#fbbf24', 'Med'],
              ['low',    '#4ade80', 'Low'],
            ] as [FilterStatus, string | null, string][]).map(([val, color, label]) => (
              <button
                key={val}
                className={`btn btn--ghost btn--sm${filterStatus === val ? ' btn--active' : ''}`}
                onClick={() => setFilterStatus(val)}
              >
                {color && <span className="priority-dot" style={{ background: color }} />}{label}
              </button>
            ))}
          </div>
          <div className="list-controls__group">
            <span className="list-controls__label">Project</span>
            <SizedSelect
              className="select select--sm"
              value={filterProjectID}
              onChange={e => setFilterProjectID(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">All</option>
              {projects.map(p => (
                <option key={p.projectID} value={p.projectID}>{p.title}</option>
              ))}
            </SizedSelect>
            <span className="list-controls__label">Tag</span>
            <SizedSelect
              className="select select--sm"
              value={filterTagID}
              onChange={e => setFilterTagID(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">All</option>
              {tags.map(tag => (
                <option key={tag.tagID} value={tag.tagID}>{tag.title}</option>
              ))}
            </SizedSelect>
          </div>
          {(sortBy !== 'dueAsc' || filterStatus !== 'all' || filterProjectID !== '' || filterTagID !== '' || search !== '') && (
            <button
              className="btn btn--ghost btn--sm btn--reset-filters"
              onClick={() => { setSortBy('dueAsc'); setFilterStatus('all'); setFilterProjectID(''); setFilterTagID(''); setSearch(''); }}
            >
              ✕ Reset filters
            </button>
          )}
        </div>

        {/* Search */}
        <input
          ref={searchInputRef}
          className="input search mtop"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks… (press / to focus)"
        />

        {/* Task count */}
        <div className="spread mtop small">
          <div className="task-count-row">
            <span className="task-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            {overdueCount > 0 && (
              <span className="task-count task-count--overdue">{overdueCount} overdue</span>
            )}
            {completedCount > 0 && <span className="footer-done">{completedCount} done</span>}
          </div>
          <div className="task-count-row">
            {viewTab !== 'board' && (
              <button
                className={`btn btn--ghost btn--sm${bulkMode ? ' btn--active' : ''}`}
                onClick={() => { setBulkMode(p => !p); setBulkSelectedIds(new Set()); }}
              >
                {bulkMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {bulkMode && bulkSelectedIds.size > 0 && (
          <div className="bulk-bar">
            <span className="bulk-bar__count">{bulkSelectedIds.size} selected</span>
            <button className="btn btn--sm" onClick={bulkMarkDone}>Mark done</button>
            <button className="btn btn--danger btn--sm" onClick={bulkDelete}>Delete</button>
          </div>
        )}

        {/* Kanban board */}
        {viewTab === 'board' && !loading && (
          <div className="kanban">
            {([
              { label: 'To Do',       statusIDs: [null, 1] as (number | null)[], dropStatus: null as number | null },
              { label: 'In Progress', statusIDs: [3]       as (number | null)[], dropStatus: 3 as number | null   },
              { label: 'Done',        statusIDs: [2]       as (number | null)[], dropStatus: 2 as number | null   },
            ]).map(col => {
              const colTasks = displayedTasks.filter(t => col.statusIDs.includes(t.statusID ?? null));
              return (
                <div
                  key={col.label}
                  className="kanban__col"
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleKanbanDrop(col.dropStatus)}
                >
                  <div className="kanban__col-header">
                    <span className="kanban__col-title">{col.label}</span>
                    <span className="kanban__col-count">{colTasks.length}</span>
                  </div>
                  {colTasks.map(task => (
                    <div
                      key={task.taskID}
                      className={`kanban__card${dragTaskId === task.taskID ? ' kanban__card--dragging' : ''}${isTaskOverdue(task) ? ' kanban__card--overdue' : ''}`}
                      draggable
                      onDragStart={() => setDragTaskId(task.taskID)}
                      onDragEnd={() => setDragTaskId(null)}
                      onClick={() => openPanel(task)}
                    >
                      <div className="kanban__card-top">
                        {task.priority && (
                          <span className="priority-dot" style={{ background: PRIORITY_COLOR[task.priority] }} />
                        )}
                        <span className="kanban__card-title">{task.title}</span>
                      </div>
                      {task.dateTimeScheduled && (
                        <span className="kanban__card-date">{fmtDate(task.dateTimeScheduled)}</span>
                      )}
                      {(task.tags && task.tags.length > 0) && (
                        <div className="item__chips kanban__card-chips">
                          {(task.tags ?? []).map(tag => (
                            <span key={tag.tagID} className="item__tag-chip" style={{ borderColor: tag.color ?? '#6366f1', color: tag.color ?? '#6366f1' }}>
                              {tag.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="loading">
            <span className="loading__spinner" />
            Loading tasks…
          </div>
        ) : viewTab !== 'board' && (
          <ul className="list">
            {tabTasks.length === 0 && (
              <li className="empty">
                {search ? 'No tasks match your search.' : viewTab !== 'all' ? `No tasks for ${viewTab === 'today' ? 'today' : viewTab === 'week' ? 'this week' : 'this month'}.` : 'No tasks yet — add one above!'}
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
                    bulkMode && bulkSelectedIds.has(task.taskID) ? 'item--bulk-selected' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <>
                    {/* Main row */}
                    <div className="item__main" onClick={() => bulkMode ? toggleBulkSelect(task.taskID) : openPanel(task)} style={{ cursor: 'pointer' }}>
                        {bulkMode && (
                          <input
                            type="checkbox"
                            className="item__checkbox item__bulk-checkbox"
                            checked={bulkSelectedIds.has(task.taskID)}
                            onChange={() => toggleBulkSelect(task.taskID)}
                            onClick={e => e.stopPropagation()}
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
                          />
                        )}
                        <div className="item__body">
                          <div className="item__title-row">
                            <div className="item__title-line">
                              <span className={`item__title${completed ? ' item__title--done' : ''}`}>{task.title}</span>
                              {task.projectID && (() => {
                                const proj = projects.find(p => p.projectID === Number(task.projectID));
                                return proj ? <span className="item__badge item__project-chip">{proj.title}</span> : null;
                              })()}
                            </div>
                            <span className="item__meta item__meta--inline">{fmtDate(task.dateTimeScheduled)}</span>
                            {(task.priority || overdue || completed || taskSubtasks.length > 0) && (
                              <div className="item__badges">
                                {overdue && <span className="item__badge">Overdue</span>}
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
                          {(task.tags && task.tags.length > 0) && (
                            <div className="item__chips">
                              {(task.tags ?? []).map(tag => (
                                <span key={tag.tagID} className="item__tag-chip" style={{ borderColor: tag.color ?? '#6366f1', color: tag.color ?? '#6366f1' }}>
                                  {tag.title}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="item__actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn--ghost btn--icon"
                            aria-label="Duplicate task"
                            title="Duplicate"
                            onClick={() => duplicateTask(task)}
                          >
                            ⎘
                          </button>
                          <button
                            className="btn btn--danger btn--icon"
                            aria-label="Delete task"
                            onClick={() => setConfirmDeleteId(task.taskID)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Delete confirmation */}
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

      </div>{/* /app__list */}

      {/* ── Detail panel ──────────────────────────────────────────────────────── */}
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
            {/* Header */}
            <div className="detail__header">
              <input
                className="input detail__title-input"
                value={editTitle}
                onChange={e => { setEditTitle(e.target.value); scheduleAutoSave(); }}
                placeholder="Task title"
              />
              {editTitle.trim() !== '' && tasks.some(t => t.taskID !== panelTask.taskID && t.title.toLowerCase() === editTitle.trim().toLowerCase()) && (
                <p className="input-warn-msg">A task with this title already exists.</p>
              )}
              <button className="btn btn--ghost btn--icon detail__close" onClick={closePanel} title="Close">×</button>
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

            {/* Editable fields */}
            <div className="detail__fields">
              <div className="desc-wrap">
                <textarea
                  className="input controls__description"
                  value={editDescription}
                  onChange={e => { setEditDescription(e.target.value); scheduleAutoSave(); }}
                  placeholder="Description"
                  maxLength={1000}
                  rows={3}
                />
                <span className="char-count">{editDescription.length}/1000</span>
              </div>

              <DateTimeRow
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
              <div className="time-shift-row">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => shiftTime('hour')}>+1 hr</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => shiftTime('day')}>+1 day</button>
              </div>

              <div className="form-row">
                {/* Priority */}
                <div className="tag-select" ref={editPriorityDropdownRef}>
                  <button
                    type="button"
                    className={`select tag-select__btn${editPriority !== '' ? ' tag-select__btn--active' : ''}`}
                    onClick={() => setShowEditPriorityDropdown(p => !p)}
                  >
                    {editPriority === ''
                      ? 'Add priority'
                      : <><span className="priority-dot" style={{ background: PRIORITY_COLOR[editPriority] }} />{editPriority[0] + editPriority.slice(1).toLowerCase()}</>}
                  </button>
                  {showEditPriorityDropdown && (
                    <div className="tag-select__dropdown">
                      <label className={`tag-select__item${editPriority === '' ? ' tag-select__item--on' : ''}`} onClick={() => { setEditPriority(''); setShowEditPriorityDropdown(false); scheduleAutoSave(0); }}>Remove priority</label>
                      {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                        <label key={p} className={`tag-select__item${editPriority === p ? ' tag-select__item--on' : ''}`} onClick={() => { setEditPriority(p); setShowEditPriorityDropdown(false); scheduleAutoSave(0); }}>
                          <span className="priority-dot" style={{ background: PRIORITY_COLOR[p] }} />
                          {p[0] + p.slice(1).toLowerCase()}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project */}
                <div className="tag-select" ref={editProjectDropdownRef}>
                  <button
                    type="button"
                    className={`select tag-select__btn${editProjectID !== '' ? ' tag-select__btn--active' : ''}`}
                    onClick={() => setShowEditProjectDropdown(p => !p)}
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
                              <button type="button" className="tag-select__delete" onClick={e => { e.stopPropagation(); removeProject(p.projectID); }} title="Delete project">×</button>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="tag-select" ref={editTagDropdownRef}>
                  <button
                    type="button"
                    className={`select tag-select__btn${editTaskTagIDs.length > 0 ? ' tag-select__btn--active' : ''}`}
                    onClick={() => setShowEditTagDropdown(p => !p)}
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
                                  <span
                                    className="tag-dot tag-dot--clickable"
                                    style={{ background: tag.color ?? '#6366f1' }}
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); setColorPickerTagId(prev => prev === tag.tagID ? null : tag.tagID); }}
                                    title="Change color"
                                  />
                                  {tag.title}
                                </label>
                                <button type="button" className="tag-select__delete" onClick={e => { e.stopPropagation(); removeTag(tag.tagID); }} title="Delete tag">×</button>
                              </div>
                              {colorPickerTagId === tag.tagID && (
                                <div className="tag-color-picker">
                                  {TAG_COLORS.map(c => (
                                    <button key={c} type="button" className={`color-swatch${tag.color === c ? ' color-swatch--selected' : ''}`} style={{ background: c }} onClick={e => { e.stopPropagation(); changeTagColor(tag.tagID, c); }} title={c} />
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
                      <span key={id} className="selected-tag-chip" style={{ borderColor: tag.color ?? '#6366f1', color: tag.color ?? '#6366f1' }}>
                        <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                        {tag.title}
                        <button type="button" className="selected-tag-chip__remove" onClick={() => { setEditTaskTagIDs(prev => prev.filter(i => i !== id)); scheduleAutoSave(0); }}>×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              {showInlineEditProject && (
                <div className="project-inline-form">
                  <input ref={inlineEditProjectInputRef} className="input project-inline-form__input" placeholder="Project name…" value={newProjectTitle} maxLength={PROJECT_MAX_LENGTH} onChange={e => setNewProjectTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addProjectInlineEdit(); if (e.key === 'Escape') { setShowInlineEditProject(false); setNewProjectTitle(''); } }} autoFocus />
                  <button className="btn btn--sm" onClick={addProjectInlineEdit} disabled={!newProjectTitle.trim()}>Create</button>
                  <button type="button" className="inline-form__close" onClick={() => { setShowInlineEditProject(false); setNewProjectTitle(''); }} title="Close">×</button>
                </div>
              )}

              {showInlineEditTag && (
                <div className="project-inline-form project-inline-form--tag">
                  <div className="tag-inline-top">
                    <input ref={inlineEditTagInputRef} className="input project-inline-form__input" placeholder="Tag name…" value={newTagTitle} onChange={e => setNewTagTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTagInlineEdit(); if (e.key === 'Escape') { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); } }} maxLength={TAG_MAX_LENGTH} autoFocus />
                    <button className="btn btn--sm" onClick={addTagInlineEdit} disabled={!newTagTitle.trim()}>Create</button>
                    <button type="button" className="inline-form__close" onClick={() => { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }} title="Close">×</button>
                  </div>
                  <div className="color-palette">
                    {TAG_COLORS.map(c => (
                      <button key={c} type="button" className={`color-swatch${newTagColor === c ? ' color-swatch--selected' : ''}`} style={{ background: c }} onClick={() => setNewTagColor(c)} title={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Repeat */}
              <div className="detail__repeat-row">
                <span className="detail__field-label">Repeat</span>
                <select
                  className="select select--sm"
                  value={editRepeatFrequency}
                  onChange={e => { setEditRepeatFrequency(e.target.value as 'daily' | 'weekly' | 'monthly' | ''); scheduleAutoSave(0); }}
                >
                  <option value="">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

            </div>

            {/* Subtasks section */}
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
                        <input type="checkbox" className="item__checkbox" checked={s.statusID === 2} onChange={() => toggleSubtask(selectedTaskId, s)} />
                        {editingSubtaskId === s.subTaskID ? (
                          <input
                            className="input sec-row__edit-input"
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
                        <button className="btn btn--danger btn--icon" onClick={() => removeSubtask(selectedTaskId, s.subTaskID)}>✕</button>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

            {/* Notes section */}
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
                    <textarea className="input controls__description" placeholder="Note content…" value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} rows={2} autoFocus />
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
                        <button className="btn btn--danger btn--icon" onClick={() => removeNote(selectedTaskId, n.noteID)}>✕</button>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

            {/* Reminders section */}
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
                      dateVal={newReminderDate} hourVal={newReminderHour} minuteVal={newReminderMinute} ampmVal={newReminderAmpm}
                      onDate={setNewReminderDate} onHour={setNewReminderHour} onMinute={setNewReminderMinute} onAmpm={setNewReminderAmpm}
                    />
                    <input className="input" placeholder="Reminder message (optional)…" value={newReminderMessage} onChange={e => setNewReminderMessage(e.target.value)} />
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
                        <button className="btn btn--danger btn--icon" onClick={() => removeReminder(selectedTaskId, r.reminderID)}>✕</button>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

            {/* Links / Attachments section */}
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
                      value={newAttachmentUrl}
                      onChange={e => setNewAttachmentUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addAttachment(selectedTaskId); }}
                      autoFocus
                    />
                    <input
                      className="input"
                      placeholder="Label (optional)…"
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
                        <button className="btn btn--danger btn--icon" onClick={() => removeAttachment(selectedTaskId, a.attachmentID)}>✕</button>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

          </div>
        );
      })()}

      <Calendar
        tasks={calTasks}
        projects={projects}
        is24Hour={is24Hour}
        isEuropeanDate={isEuropeanDate}
        onEditTask={focusTaskById}
        hideCompleted={calHideCompleted}
        onToggleHideCompleted={() => setCalHideCompleted(p => !p)}
      />
    </div>
  );
}

export default App;
