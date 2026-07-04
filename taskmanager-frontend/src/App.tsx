import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction, TouchEvent } from 'react';
import './App.css';
import type { RecurrenceRule, Task } from './types/task';
import { toDomainEntityId, toDomainStatusId, toLegacyRecurrenceRule, toLegacyTask, useRepositories } from './repositories';
import {
  parseLocalDateTime,
  toLocalDateTimeString,
} from './utils/dateTime';
import { convertHourForTimeMode } from './utils/taskForm';
import { nextCopyTitle } from './utils/taskCopyTitle';
import {
  buildRecurringTaskSchedule,
  formatRecurrenceInterval,
  normalizeRecurrenceRule,
} from './utils/taskRecurrence';
import {
  formatCreateDateDisplayLabel,
  formatTaskDateRange,
} from './utils/taskDisplayHelpers';
import { normalizeTaskStatus, TASK_STATUS } from './utils/taskUtils';
import Calendar from './components/Calendar';
import CreateTaskCard from './components/create-task/CreateTaskCard';
import StatsModal from './components/settings/StatsModal';
import StatusMoveDialog from './components/dialogs/StatusMoveDialog';
import TaskListControls from './components/task-list/TaskListControls';
import type { FilterStatus, SortBy, ViewTab } from './components/task-list/TaskListControls';
import TaskListToolbar from './components/task-list/TaskListToolbar';
import ToastList from './components/shared/ToastList';
import type { ToastListItem } from './components/shared/ToastList';
import ConfirmDelete from './components/shared/ConfirmDelete';
import InlineTaskEditCard from './components/task-list/InlineTaskEditCard';
import TaskListItems from './components/task-list/TaskListItems';
import { TaskListLoading } from './components/task-list/TaskListPresentation';
import useTaskDetailResources from './hooks/useTaskDetailResources';
import useProjectTagCatalog from './hooks/useProjectTagCatalog';
import useTaskListViewModel from './hooks/useTaskListViewModel';
import useBulkSelection from './hooks/useBulkSelection';
import useFloatingControlCoordinator from './hooks/useFloatingControlCoordinator';
import useModalFocusReturn from './hooks/useModalFocusReturn';
import useCreateTaskWorkflow from './hooks/useCreateTaskWorkflow';
import useInlineEditWorkflow from './hooks/useInlineEditWorkflow';

declare global {
  interface Window {
    __taskManagerTextFocusDebug?: boolean;
  }
}

type Theme = 'system' | 'light' | 'dark';
type MobilePage = 'add' | 'tasks' | 'calendar';

function mediaQueryMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return Boolean(window.matchMedia(query)?.matches);
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
  { label: 'Not started', statusID: null as number | null },
  { label: 'In Progress', statusID: TASK_STATUS.IN_PROGRESS as number | null },
  { label: 'Done', statusID: TASK_STATUS.DONE as number | null },
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

function App() {
  const repositories = useRepositories();
  // Tasks loaded from the API and top-level request state.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recurrenceLabels, setRecurrenceLabels] = useState<Record<number, string>>({});

  // UI preferences and transient dropdown state.
  const [is24Hour, setIs24Hour] = useState(false);
  const [isEuropeanDate, setIsEuropeanDate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [catalogManagerSection, setCatalogManagerSection] = useState<'projects' | 'tags' | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'system'
  );

  // List controls applied before rendering tasks.
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('dueAsc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Delete confirmation is tracked by task ID.
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Selected task state drives list highlighting.
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const {
    resources: {
      subtasks,
      reminders,
    },
    actions: {
      clearDeletedTaskResources,
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
    clearBulkSelection,
    toggleBulkMode,
    cancelBulkMode,
    toggleBulkSelection,
  } = useBulkSelection();
  const [statusMoveTask, setStatusMoveTask] = useState<Task | null>(null);

  // Stats modal visibility.
  const [showStats, setShowStats] = useState(false);
  const {
    settingsRef,
    settingsTriggerRef,
    statsTriggerRef,
    statsCloseRef,
    statusFirstActionRef,
    rememberSettingsFocus,
    rememberStatsFocus,
    rememberStatusMoveFocus,
  } = useModalFocusReturn({
    showStats,
    showSettings,
    statusMoveOpen: statusMoveTask !== null,
  });
  const {
    openTimeEditorScope,
    setOpenTimeEditorScope,
    openCreateControl,
    setOpenCreateControl,
    inlineEditOpenControl,
    setInlineEditOpenControl,
    openActionTaskId,
    setOpenActionTaskId,
    closeFloatingControls,
    toggleCreateDropdown,
    toggleInlineEditDropdown,
  } = useFloatingControlCoordinator({
    closeSettings: () => setShowSettings(false),
    closeStats: () => setShowStats(false),
    closeStatusMove: () => setStatusMoveTask(null),
  });

  // Reminder toasts are queued independently from persisted reminders.
  const [toasts, setToasts] = useState<ToastListItem[]>([]);
  const toastIdRef = useRef(0);

  const [mobilePage, setMobilePage] = useState<MobilePage>('tasks');
  const [mobileEditLayout, setMobileEditLayout] = useState(() => mediaQueryMatches('(max-width: 720px), (pointer: coarse)'));
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const ignoreInlineEditPullActions = useRef(false);
  const ignoreInlineEditPullTimer = useRef<number | null>(null);
  const taskLongPressTimer = useRef<number | null>(null);
  const taskLongPressTriggered = useRef(false);
  const previousIs24HourRef = useRef(is24Hour);

  // Project lists and selectors shared by create and edit flows.
  const [filterProjectID, setFilterProjectID] = useState<number | ''>('');

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
      createProjectInCatalog,
      createTagInCatalog,
      updateProjectTitle,
      updateTagDetails,
      updateTagColor,
      deleteProjectFromCatalog,
      deleteTagFromCatalog,
    },
  } = useProjectTagCatalog({ setError });
  const {
    draft: {
      input,
      setInput,
      titleError,
      setTitleError,
      description,
      setDescription,
      date,
      setDate,
      hour,
      setHour,
      minute,
      setMinute,
      ampm,
      setAmpm,
      showAddTime,
      setShowAddTime,
      showAddEndTime,
      endHour,
      setEndHour,
      endMinute,
      setEndMinute,
      endAmpm,
      setEndAmpm,
      newPriority,
      setNewPriority,
      newRepeat,
      setNewRepeat,
      newProjectID,
      setNewProjectID,
      newTaskTagIDs,
      setNewTaskTagIDs,
      showInlineProject,
      setShowInlineProject,
      showInlineTag,
      setShowInlineTag,
    },
    derived: {
      draftDateTimeScheduled,
      draftEndDateTimeScheduled,
      currentCreateTimeRangeError,
      draftProject,
      draftTags,
    },
    actions: {
      addTask,
      addProject,
      addTagInline,
      toggleAddEndTime,
    },
  } = useCreateTaskWorkflow({
    is24Hour,
    projects,
    tags,
    setTasks,
    setError,
    setToasts,
    toastIdRef,
    createProjectFromDraft,
    createTagFromDraft,
  });
  const {
    draft: {
      editingId,
      setEditingId,
      editTitle,
      setEditTitle,
      editDescription,
      setEditDescription,
      editDate,
      setEditDate,
      editHour,
      setEditHour,
      editMinute,
      setEditMinute,
      editAmpm,
      setEditAmpm,
      editShowTime,
      setEditShowTime,
      editShowEndTime,
      setEditShowEndTime,
      editEndHour,
      setEditEndHour,
      editEndMinute,
      setEditEndMinute,
      editEndAmpm,
      setEditEndAmpm,
      editPriority,
      setEditPriority,
      editTaskTagIDs,
      setEditTaskTagIDs,
      editProjectID,
      setEditProjectID,
      editRepeat,
      setEditRepeat,
      showInlineEditProject,
      setShowInlineEditProject,
      showInlineEditTag,
      setShowInlineEditTag,
    },
    derived: {
      currentEditTimeRangeError,
    },
    actions: {
      startEdit,
      saveEdit,
      cancelEdit,
      toggleEditEndTime,
      addProjectInlineEdit,
      addTagInlineEdit,
    },
  } = useInlineEditWorkflow({
    is24Hour,
    tags,
    setTasks,
    setError,
    createProjectFromDraft,
    createTagFromDraft,
    setInlineEditOpenControl,
    selectedTaskId,
  });

  // Element refs used for shortcuts, dropdown positioning, and focus return.
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const createControlsRef = useRef<HTMLDivElement>(null);
  const inlineTagInputRef = useRef<HTMLInputElement>(null);
  const inlineProjectInputRef = useRef<HTMLInputElement>(null);
  const editProjectDropdownRef = useRef<HTMLDivElement>(null);
  const editTagDropdownRef = useRef<HTMLDivElement>(null);
  const inlineEditProjectInputRef = useRef<HTMLInputElement>(null);
  const inlineEditTagInputRef = useRef<HTMLInputElement>(null);

  // Keep asynchronous list handlers pointed at current task state.
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
    ignoreInlineEditPullActions.current = true;
    if (ignoreInlineEditPullTimer.current !== null) window.clearTimeout(ignoreInlineEditPullTimer.current);
    ignoreInlineEditPullTimer.current = window.setTimeout(() => {
      ignoreInlineEditPullActions.current = false;
      ignoreInlineEditPullTimer.current = null;
    }, 250);
    resetDocumentViewportScroll();
    document.dispatchEvent(new CustomEvent('task-manager:edit-entry-reset'));
    window.requestAnimationFrame(() => resetDocumentViewportScroll());
    window.setTimeout(() => resetDocumentViewportScroll(), 40);
  };

  // Initial API hydration.
  useEffect(() => {
    repositories.tasks.list()
      .then(data => { setTasks(data.map(toLegacyTask)); setLoading(false); })
      .catch(() => { setError('Failed to load tasks. Is the backend running?'); setLoading(false); });
    loadProjectTagCatalog();
  }, [repositories]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 720px), (pointer: coarse)');
    if (!query) return;
    const update = () => setMobileEditLayout(query.matches);
    update();
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  useEffect(() => () => {
    if (ignoreInlineEditPullTimer.current !== null) window.clearTimeout(ignoreInlineEditPullTimer.current);
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
      mediaQueryMatches('(pointer: coarse)') ||
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
      // Post-focus cleanup only. The confirmed iOS pre-focus pull fix for
      // mobile inline edit/catalog rename is the proxy-input focus assist, not
      // this burst or touch-action/overscroll CSS.
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
        if (catalogManagerSection !== null) { setCatalogManagerSection(null); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (
          openCreateControl !== null ||
          inlineEditOpenControl !== null ||
          openTimeEditorScope !== null ||
          openActionTaskId !== null
        ) {
          closeFloatingControls();
          return;
        }
        if (search !== '') { setSearch(''); return; }
        if (bulkMode) { cancelBulkMode(); return; }
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
    statusMoveTask,
    search,
    bulkMode,
    cancelBulkMode,
    showStats,
    catalogManagerSection,
    showSettings,
    openCreateControl,
    inlineEditOpenControl,
    openTimeEditorScope,
    openActionTaskId,
  ]);

  useOutsideClick(settingsRef,             showSettings,             () => setShowSettings(false));

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
  ]);

  const locale = isEuropeanDate ? 'en-GB' : 'en-US';

  const {
    currentTaskCount, completedCount, overdueCount, tabTasks, calTasks, statsData,
    hasActiveListFilters, hasModifiedListControls, emptyState, showFilterValue, priorityFilterValue,
  } = useTaskListViewModel({
    tasks, search, viewTab, filterStatus, filterProjectID, filterTagID, sortBy, calHideCompleted,
  });

  const themeLabel: Record<Theme, string> = { system: '💻 System', light: '☀️ Light', dark: '🌙 Dark' };

  const createDateDisplayLabel = formatCreateDateDisplayLabel(date, locale, is24Hour);

  const toggleStatsPanel = () => {
    const next = !showStats;
    if (next) rememberStatsFocus();
    closeFloatingControls();
    setShowStats(next);
  };

  const toggleSettingsPanel = () => {
    const next = !showSettings;
    if (next) rememberSettingsFocus();
    closeFloatingControls();
    setShowSettings(next);
  };

  const openStatusMoveDialog = (task: Task) => {
    const sameTaskOpen = statusMoveTask?.taskID === task.taskID;
    rememberStatusMoveFocus();
    if (!sameTaskOpen) closeFloatingControls();
    setStatusMoveTask(sameTaskOpen ? null : task);
  };

  const resetListControls = () => {
    setSortBy('dueAsc');
    setFilterStatus('all');
    setFilterProjectID('');
    setFilterTagID('');
    setSearch('');
  };

  // Task update, completion, and focus handlers.
  const completeRecurringTask = async (task: Task, rule: RecurrenceRule) => {
    const nextSchedule = buildRecurringTaskSchedule({
      dateTimeScheduled: task.dateTimeScheduled,
      endDateTimeScheduled: task.endDateTimeScheduled,
      interval: normalizeRecurrenceRule(rule) ?? { intervalUnit: 'day', intervalValue: 1 },
    });
    const nextTask = toLegacyTask(await repositories.tasks.create({
      title: task.title, description: task.description ?? '',
      endDateTimeScheduled: nextSchedule.endDateTimeScheduled,
      dateTimeScheduled: nextSchedule.dateTimeScheduled,
      statusId: null,
      priority: task.priority ?? null, projectId: task.projectID == null ? null : toDomainEntityId(task.projectID),
    }));
    if (task.tags?.length) {
      await Promise.all(task.tags.map(tag => repositories.tasks.addTag(toDomainEntityId(nextTask.taskID), toDomainEntityId(tag.tagID))));
      nextTask.tags = task.tags;
    }
    await repositories.recurrence.setForTask(toDomainEntityId(nextTask.taskID), normalizeRecurrenceRule(rule));
    const fresh = toLegacyTask(await repositories.tasks.get(toDomainEntityId(nextTask.taskID)));
    await repositories.tasks.delete(toDomainEntityId(task.taskID));
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
        return toLegacyRecurrenceRule(await repositories.recurrence.getByTask(toDomainEntityId(task.taskID)));
      } catch {
        return null;
      }
    }
    return toLegacyRecurrenceRule(await repositories.recurrence.getByTask(toDomainEntityId(task.taskID)));
  };

  const loadRecurrenceLabel = async (taskId: number) => {
    if (recurrenceLabels[taskId]) return;
    try {
      const rule = toLegacyRecurrenceRule(await repositories.recurrence.getByTask(toDomainEntityId(taskId)));
      const label = formatRecurrenceInterval(normalizeRecurrenceRule(rule));
      setRecurrenceLabels(prev => prev[taskId] ? prev : { ...prev, [taskId]: label });
    } catch {
      setRecurrenceLabels(prev => prev[taskId] ? prev : { ...prev, [taskId]: 'Repeats' });
    }
  };

  const toggleComplete = async (task: Task) => {
    const currentStatusID = normalizeTaskStatus(task.statusID);
    // Completing an active recurring task creates its next scheduled occurrence.
    if (task.recurrenceRuleID && currentStatusID !== TASK_STATUS.DONE) {
      try {
        const rule = toLegacyRecurrenceRule(await repositories.recurrence.getByTask(toDomainEntityId(task.taskID)));
        await completeRecurringTask(task, rule);
      } catch {
        setError('Failed to complete recurring task.');
      }
      return;
    }

    // Non-recurring tasks only toggle between active and done.
    const newStatusID = currentStatusID === TASK_STATUS.DONE ? null : TASK_STATUS.DONE;
    try {
      const saved = toLegacyTask(await repositories.tasks.updateStatus(toDomainEntityId(task.taskID), toDomainStatusId(newStatusID)));
      setTasks(prev => prev.map(t => t.taskID === saved.taskID ? saved : t));
    } catch {
      setError('Failed to update task status.');
    }
  };

  const moveTaskToStatus = async (task: Task, statusID: number | null) => {
    setStatusMoveTask(null);
    if (statusID === TASK_STATUS.DONE && task.recurrenceRuleID && normalizeTaskStatus(task.statusID) !== TASK_STATUS.DONE) {
      await toggleComplete(task);
      return;
    }
    try {
      const saved = toLegacyTask(await repositories.tasks.updateStatus(toDomainEntityId(task.taskID), toDomainStatusId(statusID)));
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
    closeFloatingControls();
    setOpenActionTaskId(null);
    openStatusMoveDialog(task);
  };

  const handleEditTaskAction = (task: Task) => {
    prepareInlineEditViewport();
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

  const renderStatusMovePanel = (task: Task) => {
    if (statusMoveTask?.taskID !== task.taskID) return null;
    const currentTask = tasks.find(t => t.taskID === task.taskID) ?? task;
    const currentStatusID = normalizeTaskStatus(currentTask.statusID);
    const moveOptions = TASK_STATUS_OPTIONS.filter(option => option.statusID !== currentStatusID);
    return (
      <li className="status-move-item" aria-label={`Move task actions for ${currentTask.title}`}>
        <StatusMoveDialog
          inline
          taskTitle={currentTask.title}
          options={moveOptions}
          onClose={() => setStatusMoveTask(null)}
          onMove={statusID => moveTaskToStatus(currentTask, statusID)}
          firstActionRef={statusFirstActionRef}
        />
      </li>
    );
  };

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

  const removeTask = async (id: number) => {
    try {
      await repositories.tasks.delete(toDomainEntityId(id));
      setTasks(prev => prev.filter(t => t.taskID !== id));
      clearDeletedTaskResources(id);
      if (selectedTaskId === id) setSelectedTaskId(null);
    } catch {
      setError('Failed to delete task.');
    }
    setConfirmDeleteId(null);
  };

  const openTaskFromCalendar = async (taskId: number) => {
    setMobilePage('tasks');
    focusTaskById(taskId);
    if (selectedTaskId === taskId) return;
    const task = tasks.find(t => t.taskID === taskId);
    if (!task) return;
    closeFloatingControls();
    setOpenActionTaskId(null);
    setSelectedTaskId(taskId);
  };

  // Project deletion and task detachment handlers.
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

  const updateManagedTag = async (tagID: number, title: string, color: string) => {
    const updated = await updateTagDetails(tagID, { title: title.trim(), color });
    if (!updated) return false;
    setTasks(prev => prev.map(task => ({
      ...task,
      tags: (task.tags ?? []).map(tag => tag.tagID === tagID ? { ...tag, title: title.trim(), color } : tag),
    })));
    return true;
  };

  const projectUsage = useMemo(() => {
    const counts = new Map<number, number>();
    tasks.forEach(task => {
      if (task.projectID != null) counts.set(Number(task.projectID), (counts.get(Number(task.projectID)) ?? 0) + 1);
    });
    return counts;
  }, [tasks]);

  const tagUsage = useMemo(() => {
    const counts = new Map<number, number>();
    tasks.forEach(task => {
      (task.tags ?? []).forEach(tag => counts.set(tag.tagID, (counts.get(tag.tagID) ?? 0) + 1));
    });
    return counts;
  }, [tasks]);

  // Task duplication preserves metadata that belongs to the task itself.
  const duplicateTask = async (task: Task) => {
    try {
      const saved = toLegacyTask(await repositories.tasks.create({
        title: nextCopyTitle(task.title, tasks.map(existingTask => existingTask.title)),
        description: task.description ?? '',
        dateTimeScheduled: task.dateTimeScheduled ?? null,
        endDateTimeScheduled: task.endDateTimeScheduled ?? null,
        statusId: null,
        priority: task.priority ?? null,
        projectId: task.projectID == null ? null : toDomainEntityId(task.projectID),
      }));
      const duplicatedTask: Task = { ...saved };
      if (task.tags && task.tags.length > 0) {
        await Promise.all(task.tags.map(tag => repositories.tasks.addTag(toDomainEntityId(saved.taskID), toDomainEntityId(tag.tagID))));
        duplicatedTask.tags = task.tags;
      }
      if (task.recurrenceRuleID) {
        const rule = toLegacyRecurrenceRule(await repositories.recurrence.getByTask(toDomainEntityId(task.taskID)));
        const repeatedTask = toLegacyTask(await repositories.recurrence.setForTask(toDomainEntityId(saved.taskID), normalizeRecurrenceRule(rule)));
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
        const loadedTask = await repositories.tasks.get(toDomainEntityId(id)).then(toLegacyTask).catch(() => fallbackTask);
        const currentTask = fallbackTask.recurrenceRuleID === undefined && loadedTask.recurrenceRuleID === null
          ? { ...loadedTask, recurrenceRuleID: undefined }
          : loadedTask;
        const currentStatusID = normalizeTaskStatus(currentTask.statusID);
        const recurrenceRule = currentStatusID !== TASK_STATUS.DONE ? await getExistingRecurrenceRule(currentTask) : null;
        if (recurrenceRule) {
          await completeRecurringTask(currentTask, recurrenceRule);
        } else {
          const saved = toLegacyTask(await repositories.tasks.updateStatus(toDomainEntityId(id), toDomainStatusId(TASK_STATUS.DONE)));
          setTasks(prev => prev.map(task => task.taskID === saved.taskID ? saved : task));
        }
      }
      const refreshedTasks = await repositories.tasks.list();
      setTasks(refreshedTasks.map(toLegacyTask));
      clearBulkSelection();
    } catch {
      setError('Failed to update tasks.');
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(bulkSelectedIds);
    try {
      await Promise.all(ids.map(id => repositories.tasks.delete(toDomainEntityId(id))));
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
      await repositories.reminders.updateDueDate(toDomainEntityId(toast.reminderID), iso);
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
    if (ignoreInlineEditPullActions.current || shouldIgnoreSwipeStart(event.target)) {
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

  // Keep asynchronous callbacks pointed at current task state.
  tasksRef.current    = tasks;

  const renderInlineEditForm = (task: Task, variant: 'inline' | 'mobile' = 'inline') => {
    return (
      <InlineTaskEditCard
        task={task}
        variant={variant}
        actions={{
          saveEdit,
          cancelEdit,
        }}
        catalog={{
          projects,
          tags,
          priorityColors: PRIORITY_COLOR,
          tagColors: TAG_COLORS,
          projectMaxLength: PROJECT_MAX_LENGTH,
          tagMaxLength: TAG_MAX_LENGTH,
        }}
        refs={{
          editProjectDropdownRef,
          editTagDropdownRef,
          inlineEditProjectInputRef,
          inlineEditTagInputRef,
        }}
        inlineProjectCreation={{
          showInlineEditProject,
          setShowInlineEditProject,
          newProjectTitle,
          setNewProjectTitle,
          addProjectInlineEdit,
        }}
        inlineTagCreation={{
          showInlineEditTag,
          setShowInlineEditTag,
          newTagTitle,
          setNewTagTitle,
          newTagColor,
          setNewTagColor,
          addTagInlineEdit,
        }}
        draft={{
          editTitle,
          setEditTitle,
          editDescription,
          setEditDescription,
          editPriority,
          setEditPriority,
          editProjectID,
          setEditProjectID,
          editTaskTagIDs,
          setEditTaskTagIDs,
          editRepeat,
          setEditRepeat,
        }}
        schedule={{
          editDate,
          setEditDate,
          editHour,
          setEditHour,
          editMinute,
          setEditMinute,
          editAmpm,
          setEditAmpm,
          editShowTime,
          setEditShowTime,
          editShowEndTime,
          toggleEditEndTime,
          editEndHour,
          setEditEndHour,
          editEndMinute,
          setEditEndMinute,
          editEndAmpm,
          setEditEndAmpm,
          currentEditTimeRangeError,
          is24Hour,
          hourOptions,
        }}
        openTimeEditorScope={openTimeEditorScope}
        setOpenTimeEditorScope={setOpenTimeEditorScope}
        closeFloatingControls={closeFloatingControls}
        inlineEditOpenControl={inlineEditOpenControl}
        setInlineEditOpenControl={setInlineEditOpenControl}
        toggleInlineEditDropdown={toggleInlineEditDropdown}
      />
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
      <CreateTaskCard
        error={error}
        onDismissError={() => setError(null)}
        controlsRef={createControlsRef}
        titleValue={input}
        onTitleChange={value => { setInput(value); if (titleError) setTitleError(false); }}
        titleInputRef={titleInputRef}
        titleHasError={titleError}
        titleWarningMessage={!titleError && input.trim() !== "" && tasks.some(t => t.title.toLowerCase() === input.trim().toLowerCase()) ? "A task with this title already exists." : null}
        onTitleKeyDown={e => e.key === "Enter" && addTask()}
        descriptionValue={description}
        onDescriptionChange={setDescription}
        date={date}
        hour={hour}
        minute={minute}
        ampm={ampm}
        onDateChange={setDate}
        onHourChange={setHour}
        onMinuteChange={setMinute}
        onAmpmChange={setAmpm}
        showTime={showAddTime}
        onToggleTime={() => setShowAddTime(p => !p)}
        onRemoveStartTime={() => setShowAddTime(false)}
        showEndTime={showAddEndTime}
        onToggleEndTime={toggleAddEndTime}
        endHour={endHour}
        endMinute={endMinute}
        endAmpm={endAmpm}
        onEndHourChange={setEndHour}
        onEndMinuteChange={setEndMinute}
        onEndAmpmChange={setEndAmpm}
        openTimeEditorScope={openTimeEditorScope}
        setOpenTimeEditorScope={setOpenTimeEditorScope}
        closeFloatingControls={closeFloatingControls}
        is24Hour={is24Hour}
        hourOptions={hourOptions}
        openCreateControl={openCreateControl}
        setOpenCreateControl={setOpenCreateControl}
        dateDisplayLabel={createDateDisplayLabel}
        repeatValue={newRepeat}
        onRepeatChange={setNewRepeat}
        onToggleRepeat={() => toggleCreateDropdown("repeat")}
        timeRangeError={currentCreateTimeRangeError}
        priority={newPriority}
        priorityColors={PRIORITY_COLOR}
        onTogglePriority={() => toggleCreateDropdown("priority")}
        onPriorityChange={setNewPriority}
        priorityDropdownRef={priorityDropdownRef}
        projects={projects}
        selectedProjectID={newProjectID}
        onToggleProject={() => toggleCreateDropdown("project")}
        onProjectChange={setNewProjectID}
        onRequestNewProject={() => {
          setOpenCreateControl(null);
          if (showInlineProject) { inlineProjectInputRef.current?.focus(); }
          else { setShowInlineProject(true); }
        }}
        onDeleteProject={removeProject}
        projectDropdownRef={projectDropdownRef}
        tags={tags}
        selectedTagIDs={newTaskTagIDs}
        onToggleTags={() => toggleCreateDropdown("tags")}
        onTagIDsChange={setNewTaskTagIDs}
        onRequestNewTag={() => {
          setOpenCreateControl(null);
          if (showInlineTag) { inlineTagInputRef.current?.focus(); }
          else { setShowInlineTag(true); }
        }}
        onDeleteTag={removeTag}
        tagDropdownRef={tagDropdownRef}
        colorPickerTagId={colorPickerTagId}
        onToggleTagColorPicker={tagID => setColorPickerTagId(prev => prev === tagID ? null : tagID)}
        onChangeTagColor={(tagID, color, event) => { event.stopPropagation(); changeTagColor(tagID, color); }}
        tagColors={TAG_COLORS}
        showInlineProject={showInlineProject}
        inlineProjectInputRef={inlineProjectInputRef}
        newProjectTitle={newProjectTitle}
        projectMaxLength={PROJECT_MAX_LENGTH}
        onNewProjectTitleChange={setNewProjectTitle}
        onSubmitProject={addProject}
        onCancelProject={() => { setShowInlineProject(false); setNewProjectTitle(""); }}
        showInlineTag={showInlineTag}
        inlineTagInputRef={inlineTagInputRef}
        newTagTitle={newTagTitle}
        newTagColor={newTagColor}
        tagMaxLength={TAG_MAX_LENGTH}
        onNewTagTitleChange={setNewTagTitle}
        onSubmitTag={addTagInline}
        onCancelTag={() => { setShowInlineTag(false); setNewTagTitle(""); setNewTagColor("#6366f1"); }}
        onNewTagColorChange={setNewTagColor}
        onAddTask={addTask}
        previewDateTimeLabel={formatTaskDateRange(draftDateTimeScheduled, draftEndDateTimeScheduled, locale, is24Hour)}
        previewRepeatLabel={newRepeat ? formatRecurrenceInterval(newRepeat) : null}
        previewProject={draftProject}
        previewTags={draftTags}
      />

      </section>

      <section className="mobile-page mobile-page--tasks" data-active={mobilePage === 'tasks'}>
      <div className="card app__list">

        <TaskListToolbar
          isEuropeanDate={isEuropeanDate}
          settingsRef={settingsRef}
          statsTriggerRef={statsTriggerRef}
          settingsTriggerRef={settingsTriggerRef}
          showSettings={showSettings}
          is24Hour={is24Hour}
          theme={theme}
          themeLabel={themeLabel}
          themeOptions={['system', 'light', 'dark'] as Theme[]}
          catalogManagerSection={catalogManagerSection}
          projects={projects}
          tags={tags}
          projectUsage={projectUsage}
          tagUsage={tagUsage}
          onToggleStats={toggleStatsPanel}
          onToggleSettings={toggleSettingsPanel}
          onToggleTimeFormat={() => setIs24Hour(p => !p)}
          onToggleDateFormat={() => setIsEuropeanDate(p => !p)}
          onThemeChange={setTheme}
          onManageProjects={() => { setShowSettings(false); setCatalogManagerSection('projects'); }}
          onManageTags={() => { setShowSettings(false); setCatalogManagerSection('tags'); }}
          onCloseCatalogManager={() => setCatalogManagerSection(null)}
          onCreateProject={async title => Boolean(await createProjectInCatalog(title))}
          onCreateTag={async (title, color) => Boolean(await createTagInCatalog(title, color))}
          onRenameProject={updateProjectTitle}
          onUpdateTag={updateManagedTag}
          onDeleteProject={removeProject}
          onDeleteTag={removeTag}
        />

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
          onResetFilters={resetListControls}
          search={search}
          onSearchChange={setSearch}
          searchInputRef={searchInputRef}
          totalTaskCount={currentTaskCount}
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
          <TaskListItems
            tasks={tabTasks}
            emptyState={emptyState}
            hasActiveListFilters={hasActiveListFilters}
            selectedTaskId={selectedTaskId}
            editingId={editingId}
            mobileEditLayout={mobileEditLayout}
            bulkMode={bulkMode}
            bulkSelectedIds={bulkSelectedIds}
            expandedTagTaskIds={expandedTagTaskIds}
            openActionTaskId={openActionTaskId}
            confirmDeleteId={confirmDeleteId}
            subtasks={subtasks}
            projects={projects}
            locale={locale}
            is24Hour={is24Hour}
            recurrenceLabels={recurrenceLabels}
            visibleTagCount={VISIBLE_TASK_TAGS}
            onResetFilters={resetListControls}
            onOpenTask={handleTaskCardClick}
            onLongPressStart={beginTaskLongPress}
            onLongPressCancel={cancelTaskLongPress}
            onOpenStatusMove={openStatusMoveDialog}
            onToggleBulkSelect={toggleBulkSelection}
            onLoadRecurrenceLabel={loadRecurrenceLabel}
            onToggleTags={toggleTaskTags}
            onToggleActions={taskId => {
              const next = openActionTaskId === taskId ? null : taskId;
              closeFloatingControls();
              setOpenActionTaskId(next);
            }}
            onEdit={handleEditTaskAction}
            onDuplicate={handleDuplicateTaskAction}
            onDelete={handleDeleteTaskAction}
            onConfirmDelete={removeTask}
            onCancelDelete={() => setConfirmDeleteId(null)}
            renderEditForm={renderInlineEditForm}
            renderStatusMove={renderStatusMovePanel}
          />
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

    </div>
  );
}

export default App;
