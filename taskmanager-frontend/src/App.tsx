import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import type { RefObject, TouchEvent } from 'react';
import './App.css';
import type { RecurrenceRule, Task } from './types/task';
import {
  getTasks, getTask, createTask, updateTask, deleteTask, patchTaskStatus,
  patchReminderDate,
  addTagToTask, removeTagFromTask,
  getRecurrence, setRepeat,
} from './api/tasks';
import {
  formatDateTime as formatDateTimeDisplay,
  parseLocalDateTime,
  toLocalDateTimeString,
} from './utils/dateTime';
import { isTaskOverdue } from './utils/taskUtils';
import { compactText, normalizeTaskStatus } from './utils/taskDisplay';
import { convertHourForTimeMode, validateTaskTimeRange } from './utils/taskForm';
import type { Ampm } from './utils/taskForm';
import { nextCopyTitle } from './utils/taskCopyTitle';
import { deriveTaskEditDraft } from './utils/taskEditDraft';
import { buildRecurringTaskSchedule } from './utils/taskRecurrence';
import { buildTaskSchedule, getDefaultEndTime } from './utils/taskScheduling';
import { calculateTaskTimeShift } from './utils/taskTimeShift';
import {
  findProjectById,
  findTagsByIds,
  formatCreateDateDisplayLabel,
  formatPriorityLabel,
  formatTaskDateRange,
} from './utils/taskDisplayHelpers';
import Calendar from './components/Calendar';
import { formatRepeatFrequency } from './components/create-task/RecurrenceControl';
import type { RepeatFrequency } from './components/create-task/RecurrenceControl';
import { SelectedTagChips } from './components/create-task/TagProjectChips';
import TaskEditorFields from './components/create-task/TaskEditorFields';
import StatsModal from './components/settings/StatsModal';
import StatusMoveDialog from './components/dialogs/StatusMoveDialog';
import SettingsPanel from './components/settings/SettingsPanel';
import TaskListControls from './components/task-list/TaskListControls';
import type { FilterStatus, SortBy, ViewTab } from './components/task-list/TaskListControls';
import AddTaskPreview from './components/create-task/AddTaskPreview';
import ToastList from './components/shared/ToastList';
import type { ToastListItem } from './components/shared/ToastList';
import ConfirmDelete from './components/shared/ConfirmDelete';
import DetailSectionShell from './components/shared/DetailSectionShell';
import TagColorPicker from './components/forms/TagColorPicker';
import InlineProjectForm from './components/forms/InlineProjectForm';
import InlineTagForm from './components/forms/InlineTagForm';
import RemindersSection from './components/detail-panel/RemindersSection';
import DetailStatusBadges from './components/detail-panel/DetailStatusBadges';
import DetailHeader from './components/detail-panel/DetailHeader';
import DetailRepeatRow from './components/detail-panel/DetailRepeatRow';
import DetailDescriptionField from './components/detail-panel/DetailDescriptionField';
import DetailScheduleFields from './components/detail-panel/DetailScheduleFields';
import { DetailLinksPanel, DetailNotesPanel, DetailSubtasksPanel } from './components/detail-panel/DetailAuxiliaryPanels';
import ErrorBanner from './components/shared/ErrorBanner';
import SelectedProjectChip from './components/create-task/SelectedProjectChip';
import TaskCardMain from './components/task-list/TaskCardMain';
import { DoneDivider, TaskListDateLabel, TaskListEmptyState, TaskListLoading } from './components/task-list/TaskListPresentation';
import useTaskDetailResources from './hooks/useTaskDetailResources';
import useProjectTagCatalog from './hooks/useProjectTagCatalog';
import useTaskListViewModel from './hooks/useTaskListViewModel';
import useBulkSelection from './hooks/useBulkSelection';

declare global {
  interface Window {
    __taskManagerTextFocusDebug?: boolean;
  }
}

type Theme = 'system' | 'light' | 'dark';
type MobilePage = 'add' | 'tasks' | 'calendar';
type CreateOpenControl = string | null;

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

function shouldIgnoreSwipeStart(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(SWIPE_IGNORE_SELECTOR));
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

function App() {
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
  const [detailEditingTaskId, setDetailEditingTaskId] = useState<number | null>(null);
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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const {
    resources: {
      subtasks,
      notes,
      reminders,
      attachments,
    },
    drafts: {
      newSubtaskTitle,
      editingSubtaskId,
      editingSubtaskTitle,
      newNoteContent,
      newReminderDate,
      newReminderHour,
      newReminderMinute,
      newReminderAmpm,
      newReminderMessage,
      newAttachmentUrl,
      newAttachmentLabel,
    },
    draftSetters: {
      setNewSubtaskTitle,
      setEditingSubtaskId,
      setEditingSubtaskTitle,
      setNewNoteContent,
      setNewReminderDate,
      setNewReminderHour,
      setNewReminderMinute,
      setNewReminderAmpm,
      setNewReminderMessage,
      setNewAttachmentUrl,
      setNewAttachmentLabel,
    },
    actions: {
      loadTaskSections,
      clearDeletedTaskResources,
      addSubtask,
      toggleSubtask,
      removeSubtask,
      updateSubtaskTitle,
      addNote,
      removeNote,
      addReminder,
      removeReminder,
      addAttachment,
      removeAttachment,
    },
    externalSetters: {
      setReminders,
    },
  } = useTaskDetailResources({ is24Hour, setError });

  // Calendar-specific display preferences.
  const [calHideCompleted, setCalHideCompleted] = useState(false);

  // Bulk selection state for list actions.
  const {
    bulkMode,
    bulkSelectedIds,
    setBulkMode,
    setBulkSelectedIds,
    clearBulkSelection,
    toggleBulkMode,
    toggleBulkSelection,
  } = useBulkSelection();
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
  const [toasts, setToasts] = useState<ToastListItem[]>([]);
  const toastIdRef = useRef(0);

  const [mobilePage, setMobilePage] = useState<MobilePage>('tasks');
  const [mobileEditLayout, setMobileEditLayout] = useState(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 720px), (pointer: coarse)').matches
  );
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const taskLongPressTimer = useRef<number | null>(null);
  const taskLongPressTriggered = useRef(false);
  const previousIs24HourRef = useRef(is24Hour);

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
  const [newProjectID, setNewProjectID] = useState<number | ''>('');
  const [editProjectID, setEditProjectID] = useState<number | ''>('');
  const [filterProjectID, setFilterProjectID] = useState<number | ''>('');
  const [showInlineProject, setShowInlineProject] = useState(false);

  // Tag lists, filters, and inline color editing state.
  const [expandedTagTaskIds, setExpandedTagTaskIds] = useState<Set<number>>(new Set());
  const [filterTagID, setFilterTagID] = useState<number | ''>('');
  const [colorPickerTagId, setColorPickerTagId] = useState<number | null>(null);
  const {
    catalog: {
      projects,
      tags,
    },
    drafts: {
      newProjectTitle,
      newTagTitle,
      newTagColor,
    },
    draftSetters: {
      setNewProjectTitle,
      setNewTagTitle,
      setNewTagColor,
    },
    actions: {
      loadProjectTagCatalog,
      createProjectFromDraft,
      createTagFromDraft,
      updateTagColor,
      deleteProjectFromCatalog,
      deleteTagFromCatalog,
    },
  } = useProjectTagCatalog({ setError });

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
  const saveTimerRef = useRef<number>();
  const saveEditRef  = useRef<(task: Task) => Promise<void>>(async () => {});
  const tasksRef     = useRef<Task[]>([]);

  // Prevent the same due reminder from opening duplicate toasts.
  const firedReminders = useRef<Set<number>>(new Set());

  const resetDocumentViewportScroll = () => {
    if (window.scrollY !== 0) window.scrollTo(0, 0);
    const scrollingElement = document.scrollingElement;
    if (scrollingElement) scrollingElement.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const prepareInlineEditViewport = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    resetDocumentViewportScroll();
    document.dispatchEvent(new CustomEvent('task-manager:edit-entry-reset'));
    window.requestAnimationFrame(() => resetDocumentViewportScroll());
    window.setTimeout(() => resetDocumentViewportScroll(), 40);
  };

  // Initial API hydration.
  useEffect(() => {
    getTasks()
      .then(data => { setTasks(data); setLoading(false); })
      .catch(() => { setError('Failed to load tasks. Is the backend running?'); setLoading(false); });
    loadProjectTagCatalog();
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 720px), (pointer: coarse)');
    const update = () => setMobileEditLayout(query.matches);
    update();
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  useEffect(() => {
    const textInputTypesWithoutKeyboard = ['button', 'checkbox', 'color', 'date', 'file', 'radio', 'range', 'time'];
    const isTextInput = (target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement => target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLInputElement && !textInputTypesWithoutKeyboard.includes(target.type));
    const getActiveTextElement = () => isTextInput(document.activeElement) ? document.activeElement : null;
    const isTextInputFocused = () => getActiveTextElement() !== null;
    const getTextFocusScope = (element: HTMLInputElement | HTMLTextAreaElement) =>
      element.closest<HTMLElement>('[data-text-focus-scope]') ?? element.closest<HTMLElement>('.card');
    const textFocusDebugEnabled = () => {
      try {
        return window.localStorage.getItem('taskManagerTextFocusDebug') === '1' ||
          window.__taskManagerTextFocusDebug === true;
      } catch {
        return false;
      }
    };
    const describeElement = (element: EventTarget | Element | null) => {
      if (!(element instanceof Element)) return 'null';
      const className = typeof element.className === 'string' ? `.${element.className.trim().replace(/\s+/g, '.')}` : '';
      const label = element.getAttribute('aria-label') ?? element.getAttribute('name') ?? element.getAttribute('placeholder') ?? '';
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${className}${label ? `[${label}]` : ''}`;
    };
    const isMobileTouchEnvironment = () =>
      (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
    const getScrollSnapshot = () => {
      const root = document.getElementById('root');
      const app = document.querySelector('.app');
      const pager = document.querySelector('.mobile-pager');
      const activeElement = getActiveTextElement();
      const scope = activeElement ? getTextFocusScope(activeElement) : null;
      const mobilePage = activeElement?.closest('.mobile-page');
      const controls = scope?.querySelector('.controls');
      const taskList = document.querySelector('.app__list');
      const editCard = activeElement?.closest('.item__edit-card');
      return {
        windowY: window.scrollY,
        documentElement: document.documentElement.scrollTop,
        body: document.body.scrollTop,
        root: root?.scrollTop ?? null,
        app: app instanceof HTMLElement ? app.scrollTop : null,
        pager: pager instanceof HTMLElement ? pager.scrollTop : null,
        mobilePage: mobilePage instanceof HTMLElement ? mobilePage.scrollTop : null,
        scope: scope?.scrollTop ?? null,
        controls: controls instanceof HTMLElement ? controls.scrollTop : null,
        taskList: taskList instanceof HTMLElement ? taskList.scrollTop : null,
        editCard: editCard instanceof HTMLElement ? editCard.scrollTop : null,
        activeText: activeElement?.scrollTop ?? null,
      };
    };
    const getVisualViewportSnapshot = () => window.visualViewport ? {
      height: window.visualViewport.height,
      offsetTop: window.visualViewport.offsetTop,
      pageTop: window.visualViewport.pageTop,
      scale: window.visualViewport.scale,
    } : null;
    const logTextFocusDebug = (event: string, details: Record<string, unknown> = {}) => {
      if (!textFocusDebugEnabled()) return;
      const activeElement = getActiveTextElement();
      const scope = activeElement ? getTextFocusScope(activeElement) : null;
      console.debug('[text-focus-guard]', {
        event,
        keyboardTextMode,
        activeTextElement: describeElement(activeTextElement),
        documentActiveElement: describeElement(document.activeElement),
        activeTextScope: describeElement(activeTextScope),
        currentScope: describeElement(scope),
        transitionId,
        focusSequence,
        correctionMode: 'document',
        scroll: getScrollSnapshot(),
        visualViewport: getVisualViewportSnapshot(),
        ...details,
      });
    };
    const logTextFocusSummary = (details: Record<string, unknown>) => {
      if (!textFocusDebugEnabled()) return;
      const scroll = getScrollSnapshot();
      const visualViewport = getVisualViewportSnapshot();
      console.info('[text-focus-summary]', {
        ...details,
        documentActiveElement: describeElement(document.activeElement),
        keyboardTextMode,
        windowScrollY: scroll.windowY,
        docScrollTop: scroll.documentElement,
        bodyScrollTop: scroll.body,
        rootScrollTop: scroll.root,
        appScrollTop: scroll.app,
        mobilePageScrollTop: scroll.mobilePage,
        controlsScrollTop: scroll.controls,
        visualViewportOffsetTop: visualViewport?.offsetTop ?? null,
        visualViewportPageTop: visualViewport?.pageTop ?? null,
        visualViewportScale: visualViewport?.scale ?? null,
      });
    };
    const logTextFocusCorrectionSummary = (details: Record<string, unknown>) => {
      if (!textFocusDebugEnabled()) return;
      console.info(
        '[text-focus-correction-summary] ' +
        `transitionId=${details.transitionId} ` +
        `event=${details.event} ` +
        `source=${details.source} ` +
        `active=${details.active} ` +
        `scope=${details.scope} ` +
        `windowY=${details.beforeWindowY}->${details.afterWindowY} ` +
        `docTop=${details.beforeDocTop}->${details.afterDocTop} ` +
        `bodyTop=${details.beforeBodyTop}->${details.afterBodyTop} ` +
        `viewportOffset=${details.beforeViewportOffsetTop}->${details.afterViewportOffsetTop} ` +
        `viewportPageTop=${details.beforeViewportPageTop}->${details.afterViewportPageTop} ` +
        `viewportHeight=${details.beforeViewportHeight}->${details.afterViewportHeight} ` +
        `viewportScale=${details.beforeViewportScale}->${details.afterViewportScale} ` +
        `taskList=${details.beforeTaskListTop}->${details.afterTaskListTop} ` +
        `scopeTop=${details.beforeScopeTop}->${details.afterScopeTop} ` +
        `field=${details.beforeActiveTextTop}->${details.afterActiveTextTop} ` +
        `changed=${Array.isArray(details.changed) ? details.changed.join('|') : details.changed} ` +
        `scrollTo=${details.windowScrollToCalled} ` +
        `docAssign=${details.documentElementAssignmentCalled} ` +
        `bodyAssign=${details.bodyAssignmentCalled} ` +
        `scrollToIgnored=${details.windowScrollIgnored} ` +
        `docAssignIgnored=${details.documentElementAssignmentIgnored} ` +
        `bodyAssignIgnored=${details.bodyAssignmentIgnored} ` +
        `viewportStillOffset=${details.visualViewportStillOffset} ` +
        `viewportStillPaged=${details.visualViewportStillPaged} ` +
        `stillDrifted=${details.stillDrifted}`
      );
    };
    const logTextFocusInfo = (message: string, details: Record<string, unknown> = {}) => {
      if (!textFocusDebugEnabled()) return;
      console.info(`[text-focus-debug] ${message}`, details);
    };
    const logTextFocusLayout = (phase: string) => {
      if (!textFocusDebugEnabled()) return;
      const activeElement = getActiveTextElement();
      const scope = activeElement ? getTextFocusScope(activeElement) : activeTextScope;
      const card = scope;
      const fieldRect = activeElement?.getBoundingClientRect();
      const cardRect = card?.getBoundingClientRect();
      const visualViewport = getVisualViewportSnapshot();
      console.info(
        '[text-focus-layout] ' +
        `phase=${phase} ` +
        `scope=${describeElement(scope)} ` +
        `active=${describeElement(activeElement)} ` +
        `cardRectTop=${cardRect?.top ?? 'null'} ` +
        `cardRectBottom=${cardRect?.bottom ?? 'null'} ` +
        `fieldRectTop=${fieldRect?.top ?? 'null'} ` +
        `fieldRectBottom=${fieldRect?.bottom ?? 'null'} ` +
        `viewportHeight=${visualViewport?.height ?? window.innerHeight} ` +
        `viewportOffset=${visualViewport?.offsetTop ?? 'null'} ` +
        `pageTop=${visualViewport?.pageTop ?? 'null'} ` +
        `windowY=${window.scrollY} ` +
        `docTop=${document.documentElement.scrollTop}`
      );
    };

    let keyboardTextMode = false;
    let activeTextElement: HTMLInputElement | HTMLTextAreaElement | null = null;
    let activeTextScope: HTMLElement | null = null;
    let focusSequence = 0;
    let transitionId = 0;
    let currentTransition: { transitionId: number; from: string; scopeFrom: string; to: string; scopeTo: string } | undefined;
    let pendingNonTextTransition: { transitionId: number; from: string; scopeFrom: string; timer: number; } | undefined;
    const scheduledTransitionSummaries = new Set<string>();
    const transitionSummaryTimers: number[] = [];
    let blurCleanupTimer: number | undefined;

    const clearPendingNonTextTransition = () => {
      if (!pendingNonTextTransition) return;
      window.clearTimeout(pendingNonTextTransition.timer);
      pendingNonTextTransition = undefined;
    };

    const createTransition = (reason: string, from: string, scopeFrom: string, to: string, scopeTo: string) => {
      if (currentTransition?.to === to && currentTransition.scopeTo === scopeTo) {
        logTextFocusDebug('transition-deduped', {
          transitionCreationReason: reason,
          transitionTime: performance.now(),
          existingTransitionId: currentTransition.transitionId,
          from,
          to,
          scopeFrom,
          scopeTo,
        });
        return currentTransition;
      }
      transitionId += 1;
      currentTransition = { transitionId, from, scopeFrom, to, scopeTo };
      logTextFocusDebug('transition-created', {
        transitionCreationReason: reason,
        transitionTime: performance.now(),
        transitionId,
        from,
        to,
        scopeFrom,
        scopeTo,
      });
      return currentTransition;
    };

    const scheduleTransitionSummaries = (
      reason: string,
      transition: { transitionId: number; from: string; scopeFrom: string },
      initialChangedValues: string[],
    ) => {
      if (!textFocusDebugEnabled()) return;
      [40, 120, 300].forEach(delay => {
        const summaryKey = `${transition.transitionId}:${delay}`;
        if (scheduledTransitionSummaries.has(summaryKey)) {
          logTextFocusDebug('summary-deduped', {
            transitionId: transition.transitionId,
            settledAtMs: delay,
            reason,
          });
          return;
        }
        scheduledTransitionSummaries.add(summaryKey);
        const timer = window.setTimeout(() => {
          const activeElement = getActiveTextElement();
          logTextFocusSummary({
            transitionId: transition.transitionId,
            settledAtMs: delay,
            from: transition.from,
            to: describeElement(activeElement),
            scopeFrom: transition.scopeFrom,
            scopeTo: activeElement ? describeElement(getTextFocusScope(activeElement)) : 'null',
            correctionChangedValues: delay === 40 ? initialChangedValues : [],
          });
        }, delay);
        transitionSummaryTimers.push(timer);
      });
    };

    const scheduleNonTextTransition = (from: string, scopeFrom: string) => {
      clearPendingNonTextTransition();
      const nonTextTransitionId = transitionId + 1;
      const timer = window.setTimeout(() => {
        pendingNonTextTransition = undefined;
        const activeElement = getActiveTextElement();
        if (activeElement) return;
        transitionId = nonTextTransitionId;
        currentTransition = { transitionId, from, scopeFrom, to: 'null', scopeTo: 'null' };
        logTextFocusDebug('transition-created', {
          transitionCreationReason: 'blur-to-non-text-debounced',
          transitionTime: performance.now(),
          transitionId,
          from,
          to: 'null',
          scopeFrom,
          scopeTo: 'null',
        });
        resetDocumentScrollBurst('focusout-settled', currentTransition);
      }, 80);
      pendingNonTextTransition = { transitionId: nonTextTransitionId, from, scopeFrom, timer };
      logTextFocusDebug('transition-pending-non-text', {
        transitionCreationReason: 'focusout-body-gap',
        transitionTime: performance.now(),
        pendingTransitionId: nonTextTransitionId,
        from,
        scopeFrom,
        documentActiveElement: describeElement(document.activeElement),
      });
    };

    const resetDocumentScrollDetailed = () => {
      const changedValues: string[] = [];
      const assignment = {
        windowScrollToCalled: false,
        documentScrollingElementAssignmentCalled: false,
        documentElementAssignmentCalled: false,
        bodyAssignmentCalled: false,
      };
      const scrollingElement = document.scrollingElement;
      if (window.scrollY !== 0) {
        assignment.windowScrollToCalled = true;
        changedValues.push('window.scrollY');
        window.scrollTo(0, 0);
      }
      if (scrollingElement && scrollingElement.scrollTop !== 0) {
        assignment.documentScrollingElementAssignmentCalled = true;
        changedValues.push('document.scrollingElement.scrollTop');
        scrollingElement.scrollTop = 0;
      }
      if (document.documentElement.scrollTop !== 0) {
        assignment.documentElementAssignmentCalled = true;
        changedValues.push('document.documentElement.scrollTop');
        document.documentElement.scrollTop = 0;
      }
      if (document.body.scrollTop !== 0) {
        assignment.bodyAssignmentCalled = true;
        changedValues.push('document.body.scrollTop');
        document.body.scrollTop = 0;
      }
      return { changedValues, assignment };
    };

    const resetDocumentScroll = () => {
      return resetDocumentScrollDetailed().changedValues;
    };

    let lastTextFocusTouchY: number | null = null;

    const visualViewportDriftDetected = (
      scroll: ReturnType<typeof getScrollSnapshot>,
      visualViewport: ReturnType<typeof getVisualViewportSnapshot>,
    ) => Boolean(
      keyboardTextMode &&
      getActiveTextElement() &&
      scroll.windowY === 0 &&
      scroll.documentElement === 0 &&
      scroll.body === 0 &&
      ((visualViewport?.offsetTop ?? 0) !== 0 || (visualViewport?.pageTop ?? 0) !== 0)
    );

    const resetTextFocusScroll = (reason = 'scroll-correction', source = 'null') => {
      const beforeScroll = getScrollSnapshot();
      const beforeVisualViewport = getVisualViewportSnapshot();
      const { changedValues, assignment } = resetDocumentScrollDetailed();
      const afterScroll = getScrollSnapshot();
      const afterVisualViewport = getVisualViewportSnapshot();
      const visualViewportDrifted =
        (afterVisualViewport?.offsetTop ?? 0) !== 0 ||
        (afterVisualViewport?.pageTop ?? 0) !== 0;
      const stillDrifted = afterScroll.windowY !== 0 ||
        afterScroll.documentElement !== 0 ||
        afterScroll.body !== 0 ||
        visualViewportDrifted;
      logTextFocusDebug('correction-result', {
        correctionEvent: reason,
        source,
        before: {
          scroll: beforeScroll,
          visualViewport: beforeVisualViewport,
        },
        after: {
          scroll: afterScroll,
          visualViewport: afterVisualViewport,
        },
        changed: changedValues,
        windowScrollToAttempted: beforeScroll.windowY !== 0,
        stillDrifted,
      });
      logTextFocusCorrectionSummary({
        transitionId,
        event: reason,
        source,
        active: describeElement(getActiveTextElement()),
        scope: describeElement(activeTextScope),
        beforeWindowY: beforeScroll.windowY,
        afterWindowY: afterScroll.windowY,
        beforeDocTop: beforeScroll.documentElement,
        afterDocTop: afterScroll.documentElement,
        beforeBodyTop: beforeScroll.body,
        afterBodyTop: afterScroll.body,
        beforeTaskListTop: beforeScroll.taskList,
        afterTaskListTop: afterScroll.taskList,
        beforeScopeTop: beforeScroll.scope,
        afterScopeTop: afterScroll.scope,
        beforeActiveTextTop: beforeScroll.activeText,
        afterActiveTextTop: afterScroll.activeText,
        beforeViewportOffsetTop: beforeVisualViewport?.offsetTop ?? null,
        afterViewportOffsetTop: afterVisualViewport?.offsetTop ?? null,
        beforeViewportPageTop: beforeVisualViewport?.pageTop ?? null,
        afterViewportPageTop: afterVisualViewport?.pageTop ?? null,
        beforeViewportHeight: beforeVisualViewport?.height ?? null,
        afterViewportHeight: afterVisualViewport?.height ?? null,
        beforeViewportScale: beforeVisualViewport?.scale ?? null,
        afterViewportScale: afterVisualViewport?.scale ?? null,
        changed: changedValues,
        stillDrifted,
        windowScrollToCalled: assignment.windowScrollToCalled,
        documentScrollingElementAssignmentCalled: assignment.documentScrollingElementAssignmentCalled,
        documentElementAssignmentCalled: assignment.documentElementAssignmentCalled,
        bodyAssignmentCalled: assignment.bodyAssignmentCalled,
        windowScrollIgnored: assignment.windowScrollToCalled && afterScroll.windowY !== 0,
        documentElementAssignmentIgnored: assignment.documentElementAssignmentCalled && afterScroll.documentElement !== 0,
        bodyAssignmentIgnored: assignment.bodyAssignmentCalled && afterScroll.body !== 0,
        visualViewportStillOffset: (afterVisualViewport?.offsetTop ?? 0) !== 0,
        visualViewportStillPaged: (afterVisualViewport?.pageTop ?? 0) !== 0,
      });
      const delayedCorrection = /:(raf|40|120|300)$/.test(reason);
      if (!delayedCorrection || changedValues.length > 0) {
        logTextFocusDebug(reason, { correctionChangedValues: changedValues });
      }
      if (visualViewportDriftDetected(afterScroll, afterVisualViewport)) {
        logTextFocusDebug('visual-viewport-drift-detected', {
          correctionEvent: reason,
          visualViewport: afterVisualViewport,
        });
      }
      return changedValues;
    };

    const resetDocumentScrollBurst = (
      reason = 'scroll-burst',
      transition?: { transitionId: number; from: string; scopeFrom: string },
      source = 'null',
    ) => {
      const changedValues = resetTextFocusScroll(reason, source);
      window.requestAnimationFrame(() => resetTextFocusScroll(`${reason}:raf`, source));
      [40, 120, 300].forEach(delay => {
        window.setTimeout(() => resetTextFocusScroll(`${reason}:${delay}`, source), delay);
      });
      if (transition) scheduleTransitionSummaries(reason, transition, changedValues);
    };

    const setStableViewportHeight = (force = false) => {
      if (!force && isTextInputFocused()) return;
      document.documentElement.style.setProperty('--app-viewport-height', `${window.innerHeight}px`);
      resetDocumentScroll();
    };

    const clearBlurCleanupTimer = () => {
      if (!blurCleanupTimer) return;
      window.clearTimeout(blurCleanupTimer);
      blurCleanupTimer = undefined;
    };

    const syncTextModeFromActiveElement = () => {
      const currentTextElement = getActiveTextElement();
      if (!currentTextElement) return false;
      keyboardTextMode = true;
      activeTextElement = currentTextElement;
      activeTextScope = getTextFocusScope(currentTextElement);
      return true;
    };

    const restoreFullHeight = () => {
      if (syncTextModeFromActiveElement()) {
        resetDocumentScrollBurst('restore-kept-active');
        return;
      }
      keyboardTextMode = false;
      activeTextElement = null;
      activeTextScope = null;
      setStableViewportHeight(true);
      resetDocumentScrollBurst('restore-full-height');
    };

    const handleResize = () => {
      if (keyboardTextMode) return;
      setStableViewportHeight(false);
    };
    const handleOrientationChange = () => {
      window.setTimeout(() => setStableViewportHeight(true), 250);
    };
    const handleTextFocus = (event: FocusEvent) => {
      if (!isTextInput(event.target)) return;
      const previousActiveTextElement = activeTextElement;
      const previousScope = activeTextScope;
      const previousActiveTextElementLabel = describeElement(previousActiveTextElement);
      const previousScopeLabel = describeElement(previousScope);
      clearBlurCleanupTimer();
      clearPendingNonTextTransition();
      focusSequence += 1;
      syncTextModeFromActiveElement();
      if (activeTextElement !== event.target) {
        keyboardTextMode = true;
        activeTextElement = event.target;
        activeTextScope = getTextFocusScope(event.target);
      }
      const nextActiveTextElement = activeTextElement;
      const nextScope = activeTextScope;
      const eventTargetScope = getTextFocusScope(event.target);
      const eventTargetIsCurrentActiveGuardedElement = activeTextElement === event.target && activeTextScope === eventTargetScope;
      const transition = createTransition(
        event.type,
        previousActiveTextElementLabel,
        previousScopeLabel,
        describeElement(nextActiveTextElement),
        describeElement(nextScope),
      );
      logTextFocusDebug(event.type, {
        eventTarget: describeElement(event.target),
        relatedTarget: describeElement(event.relatedTarget),
        previousActiveTextElement: previousActiveTextElementLabel,
        nextActiveTextElement: describeElement(nextActiveTextElement),
        previousScope: previousScopeLabel,
        nextScope: describeElement(nextScope),
        eventTargetIsCurrentActiveGuardedElement,
        transitionCreationReason: event.type,
        transitionTime: performance.now(),
      });
      logTextFocusLayout('focusin');
      resetDocumentScrollBurst('focusin', transition);
    };
    const handleTextBlur = (event: FocusEvent) => {
      if (!isTextInput(event.target)) return;
      const previousActiveTextElement = activeTextElement;
      const previousScope = activeTextScope;
      const previousActiveTextElementLabel = describeElement(previousActiveTextElement);
      const previousScopeLabel = describeElement(previousScope);
      focusSequence += 1;
      const blurredScope = getTextFocusScope(event.target);
      const blurredActiveText = activeTextElement === event.target && activeTextScope === blurredScope;
      const eventTargetIsCurrentActiveGuardedElement = blurredActiveText;
      const relatedTextTarget = isTextInput(event.relatedTarget) ? event.relatedTarget : null;
      const transition = relatedTextTarget
        ? createTransition(
            event.type,
            describeElement(event.target),
            describeElement(blurredScope),
            describeElement(relatedTextTarget),
            describeElement(getTextFocusScope(relatedTextTarget)),
          )
        : currentTransition;
      logTextFocusDebug(event.type, {
        eventTarget: describeElement(event.target),
        relatedTarget: describeElement(event.relatedTarget),
        previousActiveTextElement: previousActiveTextElementLabel,
        nextActiveTextElement: describeElement(getActiveTextElement()),
        previousScope: previousScopeLabel,
        nextScope: event.relatedTarget && isTextInput(event.relatedTarget) ? describeElement(getTextFocusScope(event.relatedTarget)) : describeElement(activeTextScope),
        eventTargetIsCurrentActiveGuardedElement,
        blurredActiveText,
        transitionCreationReason: relatedTextTarget ? event.type : 'intermediate-non-text',
        transitionTime: performance.now(),
        transitionId: transition?.transitionId ?? transitionId,
      });
      if (transition) resetDocumentScrollBurst('focusout', transition);
      if (relatedTextTarget) {
        clearBlurCleanupTimer();
        keyboardTextMode = true;
        activeTextElement = relatedTextTarget;
        activeTextScope = getTextFocusScope(relatedTextTarget);
        return;
      }
      scheduleNonTextTransition(describeElement(event.target), describeElement(blurredScope));
      clearBlurCleanupTimer();
      const blurSequence = focusSequence;
      logTextFocusDebug('restore-scheduled', { blurSequence, transitionId });
      blurCleanupTimer = window.setTimeout(() => {
        logTextFocusDebug('restore-fired', { blurSequence, transitionId });
        if (blurSequence !== focusSequence) return;
        if (!blurredActiveText && syncTextModeFromActiveElement()) {
          if (currentTransition) resetDocumentScrollBurst('restore-stale-blur-active', currentTransition);
          return;
        }
        restoreFullHeight();
      }, 300);
    };
    const handleScroll = (event: Event) => {
      const nestedScroll = event.target !== document && event.target !== window;
      if (nestedScroll && !textFocusDebugEnabled()) return;
      if (!keyboardTextMode && !syncTextModeFromActiveElement()) return;
      syncTextModeFromActiveElement();
      const source = describeElement(event.target);
      logTextFocusDebug('scroll', { source });
      logTextFocusLayout('scroll');
      resetDocumentScrollBurst('scroll', undefined, source);
    };
    const textareaCanScrollInTouchDirection = (textarea: HTMLTextAreaElement, event: globalThis.TouchEvent) => {
      const maxScrollTop = textarea.scrollHeight - textarea.clientHeight;
      if (maxScrollTop <= 0) return false;
      const currentTouchY = event.touches?.[0]?.clientY ?? null;
      if (currentTouchY === null || lastTextFocusTouchY === null) return true;
      const scrollDelta = lastTextFocusTouchY - currentTouchY;
      if (scrollDelta < 0 && textarea.scrollTop <= 0) return false;
      if (scrollDelta > 0 && textarea.scrollTop >= maxScrollTop) return false;
      return true;
    };
    const handleTextFocusTouchStart = (event: globalThis.TouchEvent) => {      if (!isMobileTouchEnvironment()) return;
      lastTextFocusTouchY = event.touches?.[0]?.clientY ?? null;
    };
    const handleTextFocusTouchMove = (event: globalThis.TouchEvent) => {      if (!isMobileTouchEnvironment()) return;
      const activeElement = getActiveTextElement();
      if (!activeElement && !keyboardTextMode && !syncTextModeFromActiveElement()) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!activeElement) return;
      if (activeElement instanceof HTMLTextAreaElement && target && (target === activeElement || activeElement.contains(target))) {
        if (textareaCanScrollInTouchDirection(activeElement, event)) {
          lastTextFocusTouchY = event.touches?.[0]?.clientY ?? lastTextFocusTouchY;
          logTextFocusDebug('prevent-vv-drag:touchmove-allowed', {
            reason: 'textarea-internal-scroll',
            eventTarget: describeElement(event.target),
            active: describeElement(activeElement),
            scrollTop: activeElement.scrollTop,
            scrollHeight: activeElement.scrollHeight,
            clientHeight: activeElement.clientHeight,
          });
          return;
        }
        event.preventDefault();
        logTextFocusDebug('prevent-vv-drag:touchmove-prevented', {
          reason: 'textarea-no-scroll-or-overscroll',
          eventTarget: describeElement(event.target),
          active: describeElement(activeElement),
          scrollTop: activeElement.scrollTop,
          scrollHeight: activeElement.scrollHeight,
          clientHeight: activeElement.clientHeight,
        });
        lastTextFocusTouchY = event.touches?.[0]?.clientY ?? lastTextFocusTouchY;
        return;
      }
      if (target && (target === activeElement || activeElement.contains(target))) return;
      event.preventDefault();
      logTextFocusDebug('prevent-vv-drag:touchmove-prevented', {
        eventTarget: describeElement(event.target),
        active: describeElement(activeElement),
      });
    };
    const handleVisualViewportChange = (event: Event) => {
      logTextFocusDebug(`visualViewport:${event.type}`);
      logTextFocusLayout(`vv-${event.type}`);
      const scroll = getScrollSnapshot();
      const visualViewport = getVisualViewportSnapshot();
      if (visualViewportDriftDetected(scroll, visualViewport)) {
        logTextFocusDebug('visual-viewport-drift-detected', {
          correctionEvent: `visualViewport:${event.type}`,
          visualViewport,
        });
      }
    };
    const handleEditEntryReset = () => {
      clearBlurCleanupTimer();
      clearPendingNonTextTransition();
      if (syncTextModeFromActiveElement()) {
        logTextFocusDebug('edit-entry-reset-kept-active');
        resetDocumentScrollBurst('edit-entry-reset-kept-active');
        return;
      }
      keyboardTextMode = false;
      activeTextElement = null;
      activeTextScope = null;
      currentTransition = undefined;
      logTextFocusDebug('edit-entry-reset');
      logTextFocusLayout('edit-open');
      resetDocumentScrollBurst('edit-entry-reset');
    };

    logTextFocusInfo('enabled', { href: window.location.href });
    setStableViewportHeight(true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('touchstart', handleTextFocusTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', handleTextFocusTouchMove, { capture: true, passive: false });
    document.addEventListener('focusin', handleTextFocus);
    document.addEventListener('focusout', handleTextBlur);
    document.addEventListener('blur', handleTextBlur, true);
    document.addEventListener('task-manager:edit-entry-reset', handleEditEntryReset);
    window.visualViewport?.addEventListener('resize', handleVisualViewportChange);
    window.visualViewport?.addEventListener('scroll', handleVisualViewportChange);
    logTextFocusInfo('listeners attached');

    return () => {
      clearBlurCleanupTimer();
      clearPendingNonTextTransition();
      transitionSummaryTimers.forEach(window.clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('touchstart', handleTextFocusTouchStart, true);
      document.removeEventListener('touchmove', handleTextFocusTouchMove, true);
      document.removeEventListener('focusin', handleTextFocus);
      document.removeEventListener('focusout', handleTextBlur);
      document.removeEventListener('blur', handleTextBlur, true);
      document.removeEventListener('task-manager:edit-entry-reset', handleEditEntryReset);
      window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleVisualViewportChange);
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
        if (parseLocalDateTime(r.dueDate) <= now) {
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

  const {
    completedCount, overdueCount, tabTasks, calTasks, statsData,
    hasActiveListFilters, hasModifiedListControls, emptyState, showFilterValue, priorityFilterValue,
  } = useTaskListViewModel({
    tasks, search, viewTab, filterStatus, filterProjectID, filterTagID, sortBy, calHideCompleted,
  });

  const themeLabel: Record<Theme, string> = { system: '💻 System', light: '☀️ Light', dark: '🌙 Dark' };

  const formatDateTime = (dt: string) => formatDateTimeDisplay(dt, locale, is24Hour);
  const createDateDisplayLabel = formatCreateDateDisplayLabel(date, locale, is24Hour);

  const { dateTimeScheduled: draftDateTimeScheduled, endDateTimeScheduled: draftEndDateTimeScheduled } = buildTaskSchedule({
    date,
    showTime: showAddTime,
    hour,
    minute,
    ampm,
    showEndTime: showAddEndTime,
    endHour,
    endMinute,
    endAmpm,
    is24Hour,
  });
  const draftProject = findProjectById(projects, newProjectID);
  const draftTags = findTagsByIds(tags, newTaskTagIDs);
  const currentCreateTimeRangeError = validateTaskTimeRange(draftDateTimeScheduled, draftEndDateTimeScheduled);
  const { dateTimeScheduled: draftEditDateTimeScheduled, endDateTimeScheduled: draftEditEndDateTimeScheduled } = buildTaskSchedule({
    date: editDate,
    showTime: editShowTime,
    hour: editHour,
    minute: editMinute,
    ampm: editAmpm,
    showEndTime: editShowEndTime,
    endHour: editEndHour,
    endMinute: editEndMinute,
    endAmpm: editEndAmpm,
    is24Hour,
  });
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
    const nextEnd = getDefaultEndTime({ hour, minute, ampm, is24Hour });
    setEndHour(nextEnd.endHour);
    setEndMinute(nextEnd.endMinute);
    setEndAmpm(nextEnd.endAmpm);
    setShowAddEndTime(true);
  };

  const addTask = async () => {
    if (input.trim() === '') {
      setTitleError(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setTitleError(true)));
      return;
    }
    const { dateTimeScheduled, endDateTimeScheduled } = buildTaskSchedule({
      date,
      showTime: showAddTime,
      hour,
      minute,
      ampm,
      showEndTime: showAddEndTime,
      endHour,
      endMinute,
      endAmpm,
      is24Hour,
    });
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
      setToasts(prev => [...prev, {
        id: ++toastIdRef.current,
        taskTitle: taskForState.title,
        message: 'Task added.',
        kind: 'confirmation',
        autoDismissMs: 3500,
      }]);
    } catch {
      setError('Failed to create task.');
    }
  };

  const completeRecurringTask = async (task: Task, rule: RecurrenceRule) => {
    const nextSchedule = buildRecurringTaskSchedule({
      dateTimeScheduled: task.dateTimeScheduled,
      endDateTimeScheduled: task.endDateTimeScheduled,
      frequency: rule.frequency,
    });
    const nextTask = await createTask({
      title: task.title, description: task.description ?? '',
      endDateTimeScheduled: nextSchedule.endDateTimeScheduled,
      dateTimeScheduled: nextSchedule.dateTimeScheduled, userID: task.userID, statusID: null,
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
    window.setTimeout(() => {
      const el = document.getElementById(`task-${nextTask.taskID}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('item--highlight');
      window.setTimeout(() => el.classList.remove('item--highlight'), 1200);
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
    if (taskLongPressTimer.current) window.clearTimeout(taskLongPressTimer.current);
    taskLongPressTriggered.current = false;
    taskLongPressTimer.current = window.setTimeout(() => {
      taskLongPressTriggered.current = true;
      openStatusMoveDialog(task);
    }, 450);
  };

  const cancelTaskLongPress = () => {
    if (taskLongPressTimer.current) window.clearTimeout(taskLongPressTimer.current);
    taskLongPressTimer.current = null;
  };

  const handleTaskCardClick = (task: Task) => {
    if (taskLongPressTriggered.current) {
      taskLongPressTriggered.current = false;
      return;
    }
    if (bulkMode) {
      toggleBulkSelection(task.taskID);
      return;
    }
    if (mobileEditLayout) {
      openPanel(task);
      return;
    }
    closeFloatingControls();
    setOpenActionTaskId(null);
    setDetailEditingTaskId(null);
    setSelectedTaskId(current => current === task.taskID ? null : task.taskID);
  };

  const handleEditTaskAction = (task: Task) => {
    prepareInlineEditViewport();
    setOpenActionTaskId(null);
    setSelectedTaskId(null);
    setDetailEditingTaskId(null);
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
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const draft = deriveTaskEditDraft(task, is24Hour);
    setEditingId(task.taskID);
    setEditTitle(draft.title);
    setEditDescription(draft.description);
    setEditPriority(draft.priority);
    setEditProjectID(draft.projectID);
    setEditShowTime(draft.showTime);
    setEditDate(draft.date);
    setEditHour(draft.hour);
    setEditMinute(draft.minute);
    setEditAmpm(draft.ampm);
    setEditShowEndTime(draft.showEndTime);
    setEditEndHour(draft.endHour);
    setEditEndMinute(draft.endMinute);
    setEditEndAmpm(draft.endAmpm);
    setShowEditPriorityDropdown(false);
    setShowEditProjectDropdown(false);
    setShowEditTagDropdown(false);
    setShowInlineEditProject(false);
    setShowInlineEditTag(false);
    setInlineEditOpenControl(null);
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
    window.setTimeout(() => {
      const el = document.getElementById(`task-${taskId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('item--highlight');
      window.setTimeout(() => el.classList.remove('item--highlight'), 1200);
    }, 50);
  };

  const toggleEditEndTime = () => {
    if (editShowEndTime) { setEditShowEndTime(false); return; }
    const nextEnd = getDefaultEndTime({ hour: editHour, minute: editMinute, ampm: editAmpm, is24Hour });
    setEditEndHour(nextEnd.endHour);
    setEditEndMinute(nextEnd.endMinute);
    setEditEndAmpm(nextEnd.endAmpm);
    setEditShowEndTime(true);
  };

  const shiftTime = (unit: 'hour' | 'day') => {
    const shifted = calculateTaskTimeShift({
      unit,
      date: editDate,
      showTime: editShowTime,
      hour: editHour,
      minute: editMinute,
      ampm: editAmpm,
      is24Hour,
    });
    setEditDate(shifted.date);
    if (unit === 'hour') {
      if (shifted.hour) setEditHour(shifted.hour);
      if (shifted.minute) setEditMinute(shifted.minute);
      if (shifted.ampm) setEditAmpm(shifted.ampm);
      if (shifted.showTime) setEditShowTime(true);
    }

    scheduleAutoSave(0);
  };

  const saveEdit = async (task: Task) => {
    const { dateTimeScheduled, endDateTimeScheduled } = buildTaskSchedule({
      date: editDate,
      showTime: editShowTime,
      hour: editHour,
      minute: editMinute,
      ampm: editAmpm,
      showEndTime: editShowEndTime,
      endHour: editEndHour,
      endMinute: editEndMinute,
      endAmpm: editEndAmpm,
      is24Hour,
    });
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
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const taskId = selectedTaskId;
    saveTimerRef.current = window.setTimeout(() => {
      const task = tasksRef.current.find(t => t.taskID === taskId);
      if (task) saveEditRef.current(task);
    }, delay);
  };

  const removeTask = async (id: number) => {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(t => t.taskID !== id));
      clearDeletedTaskResources(id);
      if (selectedTaskId === id) setSelectedTaskId(null);
      if (detailEditingTaskId === id) setDetailEditingTaskId(null);
    } catch {
      setError('Failed to delete task.');
    }
    setConfirmDeleteId(null);
  };

  // Detail panel open and close helpers.
  const openPanel = async (task: Task) => {
    if (selectedTaskId === task.taskID) { closePanel(); return; }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    if (selectedTaskId !== null) {
      const current = tasks.find(t => t.taskID === selectedTaskId);
      if (current) await saveEdit(current);
    }
    setSelectedTaskId(task.taskID);
    setDetailEditingTaskId(task.taskID);
    setOpenSections(new Set());
    startEdit(task);
    loadTaskSections(task.taskID);
  };

  const openTaskFromCalendar = async (taskId: number) => {
    setMobilePage('tasks');
    focusTaskById(taskId);
    if (selectedTaskId === taskId) return;
    const task = tasks.find(t => t.taskID === taskId);
    if (!task) return;
    if (mobileEditLayout) {
      await openPanel(task);
      return;
    }
    closeFloatingControls();
    setOpenActionTaskId(null);
    setDetailEditingTaskId(null);
    setSelectedTaskId(taskId);
  };

  const togglePanelSection = (name: string) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const closePanel = async () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const task = tasks.find(t => t.taskID === selectedTaskId);
    if (task) await saveEdit(task);
    setSelectedTaskId(null);
    setDetailEditingTaskId(null);
    setEditingId(null);
  };

  // Project creation, deletion, and task detachment handlers.
  const addProject = async () => {
    const saved = await createProjectFromDraft();
    if (saved) setShowInlineProject(false);
  };

  const changeTagColor = async (tagID: number, color: string) => {
    const updated = await updateTagColor(tagID, color);
    if (!updated) return;
    setTasks(prev => prev.map(t => ({ ...t, tags: (t.tags ?? []).map(tg => tg.tagID === tagID ? { ...tg, color } : tg) })));
    setColorPickerTagId(null);
  };

  const removeTag = async (tagID: number) => {
    const deleted = await deleteTagFromCatalog(tagID);
    if (!deleted) return;
    setTasks(prev => prev.map(t => ({ ...t, tags: (t.tags ?? []).filter(tg => tg.tagID !== tagID) })));
    setNewTaskTagIDs(prev => prev.filter(id => id !== tagID));
    setEditTaskTagIDs(prev => prev.filter(id => id !== tagID));
    if (Number(filterTagID) === tagID) setFilterTagID('');
  };

  const removeProject = async (projectID: number) => {
    const deleted = await deleteProjectFromCatalog(projectID);
    if (!deleted) return;
    setTasks(prev => prev.map(t => t.projectID === projectID ? { ...t, projectID: null } : t));
    if (Number(filterProjectID) === projectID) setFilterProjectID('');
    if (Number(newProjectID) === projectID) setNewProjectID('');
    if (Number(editProjectID) === projectID) setEditProjectID('');
  };

  // Tag creation, color changes, deletion, and task assignment handlers.
  const addTagInline = async () => {
    const saved = await createTagFromDraft();
    if (!saved) return;
    setNewTaskTagIDs(prev => [...prev, saved.tagID]);
    setShowInlineTag(false);
  };

  const addProjectInlineEdit = async () => {
    const saved = await createProjectFromDraft();
    if (!saved) return;
    setEditProjectID(saved.projectID);
    setShowInlineEditProject(false);
    scheduleAutoSave(0);
  };

  const addTagInlineEdit = async () => {
    const saved = await createTagFromDraft();
    if (!saved) return;
    setEditTaskTagIDs(prev => [...prev, saved.tagID]);
    setShowInlineEditTag(false);
    scheduleAutoSave(0);
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
  const duplicateTask = async (task: Task) => {
    try {
      const saved = await createTask({
        title: nextCopyTitle(task.title, tasks.map(existingTask => existingTask.title)),
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
      clearBulkSelection();
    } catch {
      setError('Failed to update tasks.');
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(bulkSelectedIds);
    try {
      await Promise.all(ids.map(id => deleteTask(id)));
      setTasks(prev => prev.filter(t => !ids.includes(t.taskID)));
      clearBulkSelection();
    } catch {
      setError('Failed to delete tasks.');
    }
  };

  // Reminder toast dismissal and snooze behavior.
  const dismissToast = (toastId: number) =>
    setToasts(prev => prev.filter(t => t.id !== toastId));

  const snoozeToast = async (toast: { id: number; reminderID: number; taskID: number }, minutes: number) => {
    const newDue = new Date(Date.now() + minutes * 60 * 1000);
    const iso = toLocalDateTimeString(newDue);
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

  const toggleTaskTags = (taskId: number) => {
    setExpandedTagTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
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

  const renderInlineEditForm = (task: Task, variant: 'inline' | 'mobile' = 'inline') => {
    const scopeId = `${variant === 'mobile' ? 'mobile-edit' : 'inline-edit'}-${task.taskID}`;
    return (
      <div
        className={`item__edit-card${variant === 'mobile' ? ' mobile-edit-panel' : ''}`}
        data-text-focus-scope={scopeId}
        data-edit-layout={variant}
        onClick={e => e.stopPropagation()}
      >
        <div className="mobile-edit-panel__header">
          <span className="mobile-edit-panel__title">Edit task</span>
        </div>
        <TaskEditorFields
          titleValue={editTitle}
          onTitleChange={setEditTitle}
          descriptionValue={editDescription}
          onDescriptionChange={setEditDescription}
          descriptionPlaceholder="Description"
          descriptionRows={2}
          descriptionTitleStyleInput={variant === 'mobile'}
          dateTimeRowProps={{
            editorScope: scopeId,
            openTimeEditorScope,
            setOpenTimeEditorScope,
            closeFloatingControls,
            is24Hour,
            hourOptions,
            openControl: inlineEditOpenControl,
            setOpenControl: setInlineEditOpenControl,
            controlIds: {
              date: `${scopeId}:date`,
              start: `${scopeId}:start`,
              end: `${scopeId}:end`,
              startHour: `${scopeId}:start-hour`,
              startMinute: `${scopeId}:start-minute`,
              startAmpm: `${scopeId}:start-ampm`,
              endHour: `${scopeId}:end-hour`,
              endMinute: `${scopeId}:end-minute`,
              endAmpm: `${scopeId}:end-ampm`,
            },
            dateVal: editDate,
            hourVal: editHour,
            minuteVal: editMinute,
            ampmVal: editAmpm,
            onDate: setEditDate,
            onHour: setEditHour,
            onMinute: setEditMinute,
            onAmpm: setEditAmpm,
            showTime: editShowTime,
            onToggleTime: () => setEditShowTime(p => !p),
            onRemoveStart: () => setEditShowTime(false),
            showEndTime: editShowEndTime,
            onToggleEndTime: toggleEditEndTime,
            endHourVal: editEndHour,
            endMinuteVal: editEndMinute,
            endAmpmVal: editEndAmpm,
            onEndHour: setEditEndHour,
            onEndMinute: setEditEndMinute,
            onEndAmpm: setEditEndAmpm,
          }}
          recurrenceControlProps={{
            value: editRepeatFrequency,
            onChange: setEditRepeatFrequency,
            openControl: inlineEditOpenControl,
            onToggle: () => toggleInlineEditDropdown('repeat'),
            onClose: () => setInlineEditOpenControl(null),
            controlId: 'repeat',
            menuScope: scopeId,
          }}
          timeRangeError={currentEditTimeRangeError}
        />
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
                : findProjectById(projects, editProjectID)?.title ?? 'Project'}
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
        <SelectedTagChips
          tagIds={editTaskTagIDs}
          tags={tags}
          className="item__edit-selected-tags"
          onRemove={id => setEditTaskTagIDs(prev => prev.filter(i => i !== id))}
        />
        {showInlineEditProject && (
          <InlineProjectForm
            inputRef={inlineEditProjectInputRef}
            value={newProjectTitle}
            maxLength={PROJECT_MAX_LENGTH}
            placeholder="Project name..."
            onChange={setNewProjectTitle}
            onSubmit={addProjectInlineEdit}
            onCancel={() => { setShowInlineEditProject(false); setNewProjectTitle(''); }}
          />
        )}
        {showInlineEditTag && (
          <InlineTagForm
            inputRef={inlineEditTagInputRef}
            value={newTagTitle}
            selectedColor={newTagColor}
            colors={TAG_COLORS}
            maxLength={TAG_MAX_LENGTH}
            placeholder="Tag name..."
            onChange={setNewTagTitle}
            onSubmit={addTagInlineEdit}
            onCancel={() => { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }}
            onSelectColor={setNewTagColor}
            getColorAriaLabel={c => `Choose tag color ${c}`}
          />
        )}
        <div className="item__edit-actions">
          <button className="btn btn--sm" onClick={() => saveEdit(task)}>Save</button>
          <button className="btn btn--ghost btn--sm" onClick={cancelEdit}>Cancel</button>
        </div>
      </div>
    );
  };
  return (
    <div className="app">
      <ToastList toasts={toasts} onDismiss={dismissToast} onSnooze={snoozeToast} />

      {showStats && (
        <StatsModal
          statsData={statsData}
          onClose={() => setShowStats(false)}
          closeButtonRef={statsCloseRef}
        />
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
      <div className="card app__add" data-text-focus-scope="create-task">

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="controls" ref={createControlsRef}>
          <TaskEditorFields
            titleValue={input}
            onTitleChange={value => { setInput(value); if (titleError) setTitleError(false); }}
            titleInputRef={titleInputRef}
            titleClassName={`input${titleError ? ' input--error' : ''}`}
            titleType="text"
            onTitleKeyDown={e => e.key === 'Enter' && addTask()}
            titleErrorMessage={titleError ? 'Title is required.' : null}
            titleWarningMessage={!titleError && input.trim() !== '' && tasks.some(t => t.title.toLowerCase() === input.trim().toLowerCase()) ? 'A task with this title already exists.' : null}
            descriptionValue={description}
            onDescriptionChange={setDescription}
            descriptionPlaceholder="Description (optional)"
            descriptionRows={2}
            dateTimeRowProps={{
              editorScope: 'add-task',
              openTimeEditorScope,
              setOpenTimeEditorScope,
              closeFloatingControls,
              is24Hour,
              hourOptions,
              openControl: openCreateControl,
              setOpenControl: setOpenCreateControl,
              controlIds: {
                date: 'date',
                start: 'start',
                end: 'end',
                startHour: 'start-hour',
                startMinute: 'start-minute',
                startAmpm: 'start-ampm',
                endHour: 'end-hour',
                endMinute: 'end-minute',
                endAmpm: 'end-ampm',
              },
              dateVal: date,
              hourVal: hour,
              minuteVal: minute,
              ampmVal: ampm,
              onDate: setDate,
              onHour: setHour,
              onMinute: setMinute,
              onAmpm: setAmpm,
              useDateDisplayProxy: true,
              dateDisplayLabel: createDateDisplayLabel,
              showTime: showAddTime,
              onToggleTime: () => setShowAddTime(p => !p),
              onRemoveStart: () => setShowAddTime(false),
              showEndTime: showAddEndTime,
              onToggleEndTime: toggleAddEndTime,
              endHourVal: endHour,
              endMinuteVal: endMinute,
              endAmpmVal: endAmpm,
              onEndHour: setEndHour,
              onEndMinute: setEndMinute,
              onEndAmpm: setEndAmpm,
            }}
            recurrenceControlProps={{
              value: newRepeatFrequency,
              onChange: setNewRepeatFrequency,
              openControl: openCreateControl,
              onToggle: () => toggleCreateDropdown('repeat'),
              onClose: () => setOpenCreateControl(null),
              controlId: 'repeat',
              menuScope: 'create',
            }}
            timeRangeError={currentCreateTimeRangeError}
          />
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
                  : <><span className="priority-dot" style={{ background: PRIORITY_COLOR[newPriority] }} />{formatPriorityLabel(newPriority)}</>}
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
                      {formatPriorityLabel(p)}
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
                  : compactText(findProjectById(projects, newProjectID)?.title ?? 'Project', 10)}
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
            <div className="tag-select tag-select--create-tags" ref={tagDropdownRef}>
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
                            <TagColorPicker
                              colors={TAG_COLORS}
                              selectedColor={tag.color}
                              onSelectColor={(c, e) => { e.stopPropagation(); changeTagColor(tag.tagID, c); }}
                              className="tag-color-picker"
                              getAriaLabel={c => `Set tag color ${c}`}
                            />
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
          <SelectedProjectChip
            project={newProjectID !== '' ? findProjectById(projects, newProjectID) ?? null : null}
            onRemove={() => setNewProjectID('')}
          />
          <SelectedTagChips
            tagIds={newTaskTagIDs}
            tags={tags}
            onRemove={id => setNewTaskTagIDs(prev => prev.filter(i => i !== id))}
          />
          {showInlineProject && (
            <InlineProjectForm
              inputRef={inlineProjectInputRef}
              value={newProjectTitle}
              maxLength={PROJECT_MAX_LENGTH}
              placeholder="Project name…"
              onChange={setNewProjectTitle}
              onSubmit={addProject}
              onCancel={() => { setShowInlineProject(false); setNewProjectTitle(''); }}
            />
          )}
          {showInlineTag && (
            <InlineTagForm
              inputRef={inlineTagInputRef}
              value={newTagTitle}
              selectedColor={newTagColor}
              colors={TAG_COLORS}
              maxLength={TAG_MAX_LENGTH}
              placeholder="Tag name…"
              onChange={setNewTagTitle}
              onSubmit={addTagInline}
              onCancel={() => { setShowInlineTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }}
              onSelectColor={setNewTagColor}
              getColorAriaLabel={c => `Set new tag color ${c}`}
            />
          )}
          <AddTaskPreview
            title={input}
            description={description}
            dateTimeLabel={formatTaskDateRange(draftDateTimeScheduled, draftEndDateTimeScheduled, locale, is24Hour)}
            repeatLabel={newRepeatFrequency ? formatRepeatFrequency(newRepeatFrequency) : null}
            priority={newPriority || null}
            priorityLabel={newPriority ? formatPriorityLabel(newPriority) : null}
            project={draftProject}
            tags={draftTags}
          />
        </div>

      </div>

      </section>

      <section className="mobile-page mobile-page--tasks" data-active={mobilePage === 'tasks'}>
      <div className={`card app__list${selectedTaskId !== null && detailEditingTaskId === selectedTaskId ? ' app__list--narrow' : ''}`}>

        <div ref={settingsRef}>
        <div className="task-card-toolbar">
          <TaskListDateLabel isEuropeanDate={isEuropeanDate} />
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
          <SettingsPanel
            is24Hour={is24Hour}
            isEuropeanDate={isEuropeanDate}
            theme={theme}
            themeLabel={themeLabel}
            themeOptions={['system', 'light', 'dark'] as Theme[]}
            onToggleTimeFormat={() => setIs24Hour(p => !p)}
            onToggleDateFormat={() => setIsEuropeanDate(p => !p)}
            onThemeChange={setTheme}
          />
        )}
        </div>

        <TaskListControls
          viewTab={viewTab}
          onViewTabChange={setViewTab}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          showFilterValue={showFilterValue}
          priorityFilterValue={priorityFilterValue}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          filterProjectID={filterProjectID}
          onFilterProjectChange={setFilterProjectID}
          filterTagID={filterTagID}
          onFilterTagChange={setFilterTagID}
          projects={projects}
          tags={tags}
          hasModifiedListControls={hasModifiedListControls}
          onResetFilters={() => { setSortBy('dueAsc'); setFilterStatus('all'); setFilterProjectID(''); setFilterTagID(''); setSearch(''); }}
          search={search}
          onSearchChange={setSearch}
          searchInputRef={searchInputRef}
          totalTaskCount={tasks.length}
          completedCount={completedCount}
          overdueCount={overdueCount}
          bulkMode={bulkMode}
          selectedBulkCount={bulkSelectedIds.size}
          onToggleBulkMode={toggleBulkMode}
          onBulkMarkDone={bulkMarkDone}
          onBulkDelete={bulkDelete}
        />

        {loading ? (
          <TaskListLoading />
        ) : (
          <ul className="list" aria-label="Task list">
            {tabTasks.length === 0 && (
              <TaskListEmptyState
                title={emptyState.title}
                body={emptyState.body}
                showReset={hasActiveListFilters}
                onResetFilters={() => { setSortBy('dueAsc'); setFilterStatus('all'); setFilterProjectID(''); setFilterTagID(''); setSearch(''); }}
              />
            )}

            {(() => {
              const firstDoneIdx = filterStatus === 'completed'
                ? -1
                : tabTasks.findIndex(t => t.statusID === 2);
              const doneCount = firstDoneIdx >= 0 ? tabTasks.length - firstDoneIdx : 0;

              return tabTasks.map((task, idx) => {
                const overdue = isTaskOverdue(task);
                const completed = task.statusID === 2;
                const statusID = normalizeTaskStatus(task.statusID);
                const statusLabel = completed ? 'Done' : statusID === 3 ? 'In progress' : 'Active';
                const isSelected = selectedTaskId === task.taskID;
                const isEditingTask =
                  editingId === task.taskID &&
                  selectedTaskId === null &&
                  detailEditingTaskId === null;
                const taskSubtasks = subtasks[task.taskID] ?? [];
                const subtaskDone = taskSubtasks.filter(s => s.statusID === 2).length;
                const taskProjectTitle = task.projectID ? findProjectById(projects, task.projectID)?.title ?? null : null;

                return (
                  <Fragment key={task.taskID}>
                    {idx === firstDoneIdx && <DoneDivider doneCount={doneCount} />}
                    {!(isEditingTask && mobileEditLayout) && (
                      <li
                        key={`task-${task.taskID}`}
                        id={`task-${task.taskID}`}
                        className={[
                          'item',
                          overdue ? 'item--overdue' : '',
                          completed ? 'item--completed' : '',
                          isSelected ? 'item--selected' : '',
                          isEditingTask ? 'item--editing' : '',
                          bulkMode && bulkSelectedIds.has(task.taskID) ? 'item--bulk-selected' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <>
                          {!isEditingTask && (
                            <TaskCardMain
                              task={task}
                              completed={completed}
                              overdue={overdue}
                              statusID={statusID}
                              statusLabel={statusLabel}
                              dateTimeLabel={formatTaskDateRange(task.dateTimeScheduled, task.endDateTimeScheduled, locale, is24Hour)}
                              projectTitle={taskProjectTitle}
                              priorityLabel={task.priority ? formatPriorityLabel(task.priority) : null}
                              subtaskDone={subtaskDone}
                              subtaskTotal={taskSubtasks.length}
                              bulkMode={bulkMode}
                              bulkSelected={bulkSelectedIds.has(task.taskID)}
                              tagsExpanded={expandedTagTaskIds.has(task.taskID)}
                              visibleTagCount={VISIBLE_TASK_TAGS}
                              actionMenuOpen={openActionTaskId === task.taskID}
                              onOpenTask={() => handleTaskCardClick(task)}
                              onLongPressStart={() => beginTaskLongPress(task)}
                              onLongPressCancel={cancelTaskLongPress}
                              onOpenStatusMove={() => openStatusMoveDialog(task)}
                              onToggleBulkSelect={() => toggleBulkSelection(task.taskID)}
                              onToggleComplete={() => toggleComplete(task)}
                              onToggleTags={toggleTaskTags}
                              onToggleActions={() => {
                                const next = openActionTaskId === task.taskID ? null : task.taskID;
                                closeFloatingControls();
                                setOpenActionTaskId(next);
                              }}
                              onEdit={() => handleEditTaskAction(task)}
                              onDuplicate={() => handleDuplicateTaskAction(task)}
                              onDelete={() => handleDeleteTaskAction(task.taskID)}
                            />
                          )}

                          {isEditingTask && !mobileEditLayout && renderInlineEditForm(task)}

                          {confirmDeleteId === task.taskID && (
                            <ConfirmDelete
                              taskTitle={task.title}
                              onConfirm={() => removeTask(task.taskID)}
                              onCancel={() => setConfirmDeleteId(null)}
                            />
                          )}
                        </>
                      </li>
                    )}
                    {isEditingTask && mobileEditLayout && (
                      <li className="mobile-edit-row">
                        {renderInlineEditForm(task, 'mobile')}
                      </li>
                    )}
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

      {selectedTaskId !== null && detailEditingTaskId === selectedTaskId && (() => {
        const panelTask = tasks.find(t => t.taskID === selectedTaskId);
        if (!panelTask) return null;
        const panelOverdue = isTaskOverdue(panelTask);
        const panelSubtasks = subtasks[selectedTaskId] ?? [];
        const panelNotes    = notes[selectedTaskId]    ?? [];
        const panelReminders = reminders[selectedTaskId] ?? [];
        const panelDone = panelSubtasks.filter(s => s.statusID === 2).length;
        const panelProjectTitle = panelTask.projectID ? findProjectById(projects, panelTask.projectID)?.title ?? null : null;
        const showDuplicateTitleWarning = editTitle.trim() !== '' && tasks.some(t => t.taskID !== panelTask.taskID && t.title.toLowerCase() === editTitle.trim().toLowerCase());

        return (
          <div className="card app__detail" data-text-focus-scope={`detail-edit-${selectedTaskId}`}>
            <DetailHeader
              title={editTitle}
              onTitleChange={value => { setEditTitle(value); scheduleAutoSave(); }}
              showDuplicateWarning={showDuplicateTitleWarning}
              onClose={closePanel}
            />
            <DetailStatusBadges overdue={panelOverdue} projectTitle={panelProjectTitle} />

            <div className="detail__fields">
              <DetailDescriptionField
                value={editDescription}
                onValue={value => { setEditDescription(value); scheduleAutoSave(); }}
              />

              <DetailScheduleFields
                dateTimeRowProps={{
                  editorScope: `detail-edit-${selectedTaskId}`,
                  openTimeEditorScope,
                  setOpenTimeEditorScope,
                  closeFloatingControls,
                  is24Hour,
                  hourOptions,
                  dateVal: editDate,
                  hourVal: editHour,
                  minuteVal: editMinute,
                  ampmVal: editAmpm,
                  onDate: v => { setEditDate(v); scheduleAutoSave(0); },
                  onHour: v => { setEditHour(v); scheduleAutoSave(0); },
                  onMinute: v => { setEditMinute(v); scheduleAutoSave(0); },
                  onAmpm: v => { setEditAmpm(v); scheduleAutoSave(0); },
                  showTime: editShowTime,
                  onToggleTime: () => { setEditShowTime(p => !p); scheduleAutoSave(0); },
                  onRemoveStart: () => { setEditShowTime(false); scheduleAutoSave(0); },
                  showEndTime: editShowEndTime,
                  onToggleEndTime: () => { toggleEditEndTime(); scheduleAutoSave(0); },
                  endHourVal: editEndHour,
                  endMinuteVal: editEndMinute,
                  endAmpmVal: editEndAmpm,
                  onEndHour: v => { setEditEndHour(v); scheduleAutoSave(0); },
                  onEndMinute: v => { setEditEndMinute(v); scheduleAutoSave(0); },
                  onEndAmpm: v => { setEditEndAmpm(v); scheduleAutoSave(0); },
                }}
                timeRangeError={currentEditTimeRangeError}
                onShiftHour={() => shiftTime('hour')}
                onShiftDay={() => shiftTime('day')}
              />

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
                      : <><span className="priority-dot" style={{ background: PRIORITY_COLOR[editPriority] }} />{formatPriorityLabel(editPriority)}</>}
                  </button>
                  {showEditPriorityDropdown && (
                    <div className="tag-select__dropdown">
                      <button type="button" className={`tag-select__item${editPriority === '' ? ' tag-select__item--on' : ''}`} onClick={() => { setEditPriority(''); setShowEditPriorityDropdown(false); scheduleAutoSave(0); }}>Remove priority</button>
                      {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                        <button key={p} type="button" className={`tag-select__item${editPriority === p ? ' tag-select__item--on' : ''}`} onClick={() => { setEditPriority(p); setShowEditPriorityDropdown(false); scheduleAutoSave(0); }}>
                          <span className="priority-dot" style={{ background: PRIORITY_COLOR[p] }} />
                          {formatPriorityLabel(p)}
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
                                <TagColorPicker
                                  colors={TAG_COLORS}
                                  selectedColor={tag.color}
                                  onSelectColor={(c, e) => { e.stopPropagation(); changeTagColor(tag.tagID, c); }}
                                  className="tag-color-picker"
                                  getAriaLabel={c => `Set tag color ${c}`}
                                />
                              )}
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>
              </div>

              <SelectedTagChips
                tagIds={editTaskTagIDs}
                tags={tags}
                onRemove={id => { setEditTaskTagIDs(prev => prev.filter(i => i !== id)); scheduleAutoSave(0); }}
              />

              {showInlineEditProject && (
                <InlineProjectForm
                  inputRef={inlineEditProjectInputRef}
                  value={newProjectTitle}
                  maxLength={PROJECT_MAX_LENGTH}
                  placeholder="Project name…"
                  onChange={setNewProjectTitle}
                  onSubmit={addProjectInlineEdit}
                  onCancel={() => { setShowInlineEditProject(false); setNewProjectTitle(''); }}
                />
              )}

              {showInlineEditTag && (
                <InlineTagForm
                  inputRef={inlineEditTagInputRef}
                  value={newTagTitle}
                  selectedColor={newTagColor}
                  colors={TAG_COLORS}
                  maxLength={TAG_MAX_LENGTH}
                  placeholder="Tag name…"
                  onChange={setNewTagTitle}
                  onSubmit={addTagInlineEdit}
                  onCancel={() => { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }}
                  onSelectColor={setNewTagColor}
                  getColorAriaLabel={c => `Set new tag color ${c}`}
                />
              )}

              <DetailRepeatRow
                value={editRepeatFrequency}
                onChange={value => { setEditRepeatFrequency(value); scheduleAutoSave(0); }}
              />

            </div>

            <DetailSubtasksPanel
              isOpen={openSections.has('subtasks')}
              onToggle={() => togglePanelSection('subtasks')}
              subtasks={panelSubtasks}
              doneCount={panelDone}
              newSubtaskTitle={newSubtaskTitle}
              editingSubtaskId={editingSubtaskId}
              editingSubtaskTitle={editingSubtaskTitle}
              onNewSubtaskTitleChange={setNewSubtaskTitle}
              onAddSubtask={() => addSubtask(selectedTaskId)}
              onToggleSubtask={subtask => toggleSubtask(selectedTaskId, subtask)}
              onRemoveSubtask={subtaskId => removeSubtask(selectedTaskId, subtaskId)}
              onStartEditSubtask={subtask => { setEditingSubtaskId(subtask.subTaskID); setEditingSubtaskTitle(subtask.title); }}
              onEditingSubtaskTitleChange={setEditingSubtaskTitle}
              onSaveSubtaskTitle={subtask => updateSubtaskTitle(selectedTaskId, subtask)}
              onCancelEditSubtask={() => { setEditingSubtaskId(null); setEditingSubtaskTitle(''); }}
            />

            <DetailNotesPanel
              isOpen={openSections.has('notes')}
              onToggle={() => togglePanelSection('notes')}
              notes={panelNotes}
              newNoteContent={newNoteContent}
              onNoteContentChange={setNewNoteContent}
              onAddNote={() => addNote(selectedTaskId)}
              onRemoveNote={noteId => removeNote(selectedTaskId, noteId)}
              formatDateTime={formatDateTime}
            />

            <DetailSectionShell
              title="Reminders"
              isOpen={openSections.has('reminders')}
              onToggle={() => togglePanelSection('reminders')}
              badgeContent={panelReminders.length > 0 ? panelReminders.length : null}
            >
              <RemindersSection
                reminders={panelReminders}
                dateTimeRowProps={{
                  editorScope: `reminder-${selectedTaskId}`,
                  openTimeEditorScope,
                  setOpenTimeEditorScope,
                  closeFloatingControls,
                  is24Hour,
                  hourOptions,
                  dateVal: newReminderDate,
                  hourVal: newReminderHour,
                  minuteVal: newReminderMinute,
                  ampmVal: newReminderAmpm,
                  onDate: setNewReminderDate,
                  onHour: setNewReminderHour,
                  onMinute: setNewReminderMinute,
                  onAmpm: setNewReminderAmpm,
                }}
                newReminderMessage={newReminderMessage}
                onReminderMessageChange={setNewReminderMessage}
                onAddReminder={() => addReminder(selectedTaskId)}
                onRemoveReminder={reminderId => removeReminder(selectedTaskId, reminderId)}
                formatDateTime={formatDateTime}
              />
            </DetailSectionShell>

            <DetailLinksPanel
              isOpen={openSections.has('attachments')}
              onToggle={() => togglePanelSection('attachments')}
              attachments={attachments[selectedTaskId] ?? []}
              newAttachmentUrl={newAttachmentUrl}
              newAttachmentLabel={newAttachmentLabel}
              onAttachmentUrlChange={setNewAttachmentUrl}
              onAttachmentLabelChange={setNewAttachmentLabel}
              onAddAttachment={() => addAttachment(selectedTaskId)}
              onRemoveAttachment={attachmentId => removeAttachment(selectedTaskId, attachmentId)}
            />

          </div>
        );
      })()}

      </div>

      {statusMoveTask && (() => {
        const currentTask = tasks.find(t => t.taskID === statusMoveTask.taskID) ?? statusMoveTask;
        const currentStatusID = normalizeTaskStatus(currentTask.statusID);
        const moveOptions = TASK_STATUS_OPTIONS.filter(option => option.statusID !== currentStatusID);
        return (
          <StatusMoveDialog
            taskTitle={currentTask.title}
            options={moveOptions}
            onClose={() => setStatusMoveTask(null)}
            onMove={statusID => moveTaskToStatus(currentTask, statusID)}
            firstActionRef={statusFirstActionRef}
          />
        );
      })()}

    </div>
  );
}

export default App;
