import { render, screen, waitFor, act, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'fs';
import App from './App';
import {
  getTasks, getTask, createTask, updateTask, deleteTask, patchTaskStatus,
  getProjects, createProject, getTags, createTag, getRecurrence, setRepeat, addTagToTask, removeTagFromTask,
  getSubtasks, getNotes, getReminders, getAttachments,
} from './api/tasks';
import type { Task } from './types/task';

jest.mock('./api/tasks');
jest.mock('./components/Calendar', () => () => (
  <div className="cal-card">
    <button type="button" className="cal-today-btn">Today</button>
    <div data-testid="calendar-background">Calendar background</div>
  </div>
));

const mockGetTasks       = getTasks       as jest.MockedFunction<typeof getTasks>;
const mockGetTask        = getTask        as jest.MockedFunction<typeof getTask>;
const mockCreateTask     = createTask     as jest.MockedFunction<typeof createTask>;
const mockUpdateTask     = updateTask     as jest.MockedFunction<typeof updateTask>;
const mockDeleteTask     = deleteTask     as jest.MockedFunction<typeof deleteTask>;
const mockPatchStatus    = patchTaskStatus as jest.MockedFunction<typeof patchTaskStatus>;
const mockGetProjects    = getProjects    as jest.MockedFunction<typeof getProjects>;
const mockCreateProject  = createProject  as jest.MockedFunction<typeof createProject>;
const mockGetTags        = getTags        as jest.MockedFunction<typeof getTags>;
const mockCreateTag      = createTag      as jest.MockedFunction<typeof createTag>;
const mockGetRecurrence  = getRecurrence  as jest.MockedFunction<typeof getRecurrence>;
const mockSetRepeat      = setRepeat      as jest.MockedFunction<typeof setRepeat>;
const mockAddTagToTask   = addTagToTask   as jest.MockedFunction<typeof addTagToTask>;
const mockRemoveTagFromTask = removeTagFromTask as jest.MockedFunction<typeof removeTagFromTask>;
const mockGetSubtasks    = getSubtasks    as jest.MockedFunction<typeof getSubtasks>;
const mockGetNotes       = getNotes       as jest.MockedFunction<typeof getNotes>;
const mockGetReminders   = getReminders   as jest.MockedFunction<typeof getReminders>;
const mockGetAttachments = getAttachments as jest.MockedFunction<typeof getAttachments>;

const sampleTask: Task = {
  taskID: 1,
  title: 'Buy milk',
  description: '',
  dateTimeScheduled: null,
  recurrenceRuleID: null,
};

const scheduledTask: Task = {
  taskID: 2,
  title: 'Dentist appointment',
  description: '',
  dateTimeScheduled: '2026-06-15T14:30:00',
};

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = jest.fn();
  mockGetTasks.mockResolvedValue([]);
  mockGetTask.mockImplementation(async id => ({ ...sampleTask, taskID: id }));
  mockCreateTask.mockResolvedValue(sampleTask);
  mockUpdateTask.mockImplementation(async (id, task) => ({ ...task, taskID: id } as Task));
  mockDeleteTask.mockResolvedValue(undefined);
  mockPatchStatus.mockResolvedValue(sampleTask);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockImplementation(async project => ({ projectID: 101, title: project.title }));
  mockGetTags.mockResolvedValue([]);
  mockCreateTag.mockImplementation(async tag => ({ tagID: 102, title: tag.title, color: tag.color }));
  mockGetSubtasks.mockResolvedValue([]);
  mockGetNotes.mockResolvedValue([]);
  mockGetReminders.mockResolvedValue([]);
  mockGetAttachments.mockResolvedValue([]);
  mockAddTagToTask.mockResolvedValue(undefined);
  mockRemoveTagFromTask.mockResolvedValue(undefined);
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'weekly',
    timesOfRecurrence: 0,
    startDateTime: '2026-01-01T00:00:00',
    endDateTime: '2036-01-01T00:00:00',
  });
  mockSetRepeat.mockImplementation(async (taskId, frequency) => ({
    ...sampleTask,
    taskID: taskId,
    recurrenceRuleID: frequency ? 11 : null,
  }));
});

afterEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

// Render helper supplies the common app setup for interaction tests.

/** Open the settings panel (⚙ Settings button). */
function openSettings() {
  userEvent.click(screen.getByRole('button', { name: /settings/i }));
}

async function openTaskActions(item?: HTMLElement) {
  const scope = item ? within(item) : screen;
  const actionButton = item
    ? scope.getByRole('button', { name: /task actions/i })
    : screen.getAllByRole('button', { name: /task actions/i })[0];
  fireEvent.click(actionButton);
  return scope.findByRole('menuitem', { name: /copy/i });
}

function getCreateDateInput(): HTMLInputElement {
  const input = document.querySelector('.app__add input[type="date"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Create date input not found');
  return input;
}

function getExpandedEditorLabel(label: 'Start' | 'End', container: ParentNode = document): HTMLElement {
  const element = within(getOpenTimeEditor(container)).getByText(`${label}:`);
  if (!(element instanceof HTMLElement)) throw new Error(`${label} editor label not found`);
  return element;
}

async function chooseTimeSegment(editor: HTMLElement, segmentIndex: number, value: string) {
  const segment = editor.querySelectorAll('.time-select')[segmentIndex];
  if (!(segment instanceof HTMLElement)) throw new Error(`Time segment ${segmentIndex} not found`);
  const trigger = segment.querySelector('.time-select__btn');
  if (!(trigger instanceof HTMLButtonElement)) throw new Error(`Time segment ${segmentIndex} trigger not found`);
  await act(async () => {
    fireEvent.click(trigger);
  });
  const dropdown = segment.querySelector('.time-select__dropdown');
  if (!(dropdown instanceof HTMLElement)) throw new Error(`Time segment ${segmentIndex} dropdown not found`);
  await act(async () => {
    fireEvent.click(within(dropdown).getByRole('button', { name: value }));
  });
}

async function setActiveEditorTime(container: HTMLElement, hourValue: string, minuteValue: string, ampmValue?: 'AM' | 'PM') {
  const editor = container.querySelector('.datetime-row__editor');
  if (!(editor instanceof HTMLElement)) throw new Error('Time editor not found');
  await chooseTimeSegment(editor, 0, hourValue);
  await chooseTimeSegment(editor, 1, minuteValue);
  if (ampmValue) await chooseTimeSegment(editor, 2, ampmValue);
}

function getOpenTimeEditor(container: ParentNode = document): HTMLElement {
  const editor = container.querySelector('.datetime-row__editor');
  if (!(editor instanceof HTMLElement)) throw new Error('Time editor not found');
  return editor;
}

function expectOpenTimeEditor(label: 'Start' | 'End', container: ParentNode = document) {
  expect(within(getOpenTimeEditor(container)).getByText(`${label}:`)).toBeInTheDocument();
}

function expectNoOpenTimeEditor(label: 'Start' | 'End', container: ParentNode = document) {
  const editor = container.querySelector('.datetime-row__editor');
  if (!(editor instanceof HTMLElement)) return;
  expect(within(editor).queryByText(`${label}:`)).not.toBeInTheDocument();
}

async function openCreateDateInput() {
  await act(async () => {
    fireEvent.click(getCreateDateInput());
  });
  await waitFor(() => expect(getCreateDateInput()).toHaveAttribute('data-open', 'true'));
}

function mobilePager(): HTMLElement {
  const pager = document.querySelector('.mobile-pager');
  if (!(pager instanceof HTMLElement)) throw new Error('Mobile pager not found');
  return pager;
}

function swipeOn(element: HTMLElement, startX: number, endX: number) {
  fireEvent.touchStart(element, { touches: [{ clientX: startX, clientY: 100 }] });
  fireEvent.touchEnd(element, { changedTouches: [{ clientX: endX, clientY: 105 }] });
}

function expectMobilePage(page: 'Add' | 'Tasks' | 'Calendar') {
  expect(screen.getByRole('button', { name: page })).toHaveClass('mobile-page-nav__btn--active');
}

function getCreateCard(): HTMLElement {
  const createCard = document.querySelector('.app__add');
  if (!(createCard instanceof HTMLElement)) throw new Error('Create card not found');
  return createCard;
}

function setWindowScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
  });
}

function dirtyDocumentScroll(value = 48) {
  setWindowScrollY(value);
  document.documentElement.scrollTop = value;
  document.body.scrollTop = value;
}

function expectDocumentScrollReset() {
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  expect(document.documentElement.scrollTop).toBe(0);
  expect(document.body.scrollTop).toBe(0);
}

async function focusTextField(element: HTMLInputElement | HTMLTextAreaElement) {
  await act(async () => {
    element.focus();
    fireEvent.focusIn(element);
  });
  expect(document.activeElement).toBe(element);
}

function textFocusSummaryLogs(info: jest.SpyInstance) {
  return info.mock.calls.filter(call => call[0] === '[text-focus-summary]');
}

async function expectScrollCorrectionStillActive(scrollTo: jest.SpyInstance) {
  scrollTo.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.scroll(window);
  });

  expectDocumentScrollReset();
}

function dirtyElementScroll(element: HTMLElement, value = 42) {
  element.scrollTop = value;
  element.scrollLeft = value;
}

function dispatchCancelableTouchMove(target: EventTarget) {
  const event = new Event('touchmove', { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

function dispatchTextTouch(target: EventTarget, type: 'touchstart' | 'touchmove', clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: type === 'touchmove' });
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: [{ clientY }],
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

function mockElementScrollRange(element: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop = 0) {
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(element, 'scrollTop', { configurable: true, writable: true, value: scrollTop });
}

function mockMobileTouchEnvironment() {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query.includes('pointer: coarse') || query.includes('max-width: 720px'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  };
}

function mockDesktopMediaEnvironment() {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  };
}

function mockInlineEditRects(fieldTop = 459) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  const rect = (top: number, bottom: number) => ({
    x: 0,
    y: top,
    top,
    bottom,
    left: 0,
    right: 320,
    width: 320,
    height: bottom - top,
    toJSON: () => ({}),
  });
  const spy = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getMockRect(this: HTMLElement): DOMRect {
        if (this.classList.contains('app__list')) return rect(67, 900);
    if (
      this instanceof HTMLInputElement &&
      this.getAttribute('aria-label') === 'Task title' &&
      this.closest('.item__edit-card')
    ) {
      const list = document.querySelector('.app__list');
      const scrollTop = list instanceof HTMLElement ? list.scrollTop : 0;
      return rect(fieldTop - scrollTop, fieldTop + 40 - scrollTop);
    }
    if (this.classList.contains('item__edit-card')) {
      const list = document.querySelector('.app__list');
      const scrollTop = list instanceof HTMLElement ? list.scrollTop : 0;
      return rect(fieldTop - 13 - scrollTop, fieldTop + 241 - scrollTop);
    }
    return original.call(this);
  });
  return () => spy.mockRestore();
}

function mockVisualViewport(values: Partial<VisualViewport>) {
  const original = window.visualViewport;
  const visualViewport = {
    height: 500,
    offsetTop: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ...values,
  };
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: visualViewport,
  });
  return () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: original,
    });
  };
}

function getCreateTitleInput(): HTMLInputElement {
  const title = within(getCreateCard()).getByPlaceholderText(/task title/i);
  if (!(title instanceof HTMLInputElement)) throw new Error('Create title input not found');
  return title;
}

function getCreateDescriptionTextarea(): HTMLTextAreaElement {
  const description = within(getCreateCard()).getByLabelText(/task description/i);
  if (!(description instanceof HTMLTextAreaElement)) throw new Error('Create description textarea not found');
  return description;
}

async function openInlineEditCard(task: Task = sampleTask): Promise<HTMLElement> {
  mockGetTasks.mockResolvedValue([task]);
  mockGetTask.mockResolvedValue(task);
  render(<App />);
  await screen.findByText(task.title);

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  return editCard;
}

async function openMobileEditPanel(task: Task = sampleTask): Promise<HTMLElement> {
  mockGetTasks.mockResolvedValue([task]);
  mockGetTask.mockResolvedValue(task);
  render(<App />);
  await screen.findByText(task.title);

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editPanel = document.querySelector('.mobile-edit-panel');
  if (!(editPanel instanceof HTMLElement)) throw new Error('Mobile edit panel not found');
  return editPanel;
}

// Rendering behavior.

test('does not render the old Task Manager heading', async () => {
  render(<App />);
  expect(screen.queryByRole('heading', { name: /task manager/i })).not.toBeInTheDocument();
});

test('shows 0 tasks in footer when no tasks are loaded', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  expect(screen.getAllByText(/0 tasks/i).length).toBeGreaterThanOrEqual(1);
});

test('task list empty state points mobile users to Add', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
  expect(screen.getByText('Swipe to Add and create your first task.')).toBeInTheDocument();
});

test('shows task titles after loading', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  expect(await screen.findByText('Buy milk')).toBeInTheDocument();
});

test('recurring desktop task card shows a schedule repeat indicator and non-recurring task card does not', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  mockGetTasks.mockResolvedValue([
    { ...sampleTask, taskID: 1, title: 'Recurring task', recurrenceRuleID: 10 },
    { ...sampleTask, taskID: 2, title: 'One-time task', recurrenceRuleID: null },
  ]);
  render(<App />);

  try {
    const recurringItem = (await screen.findByText('Recurring task')).closest('li');
    const oneTimeItem = screen.getByText('One-time task').closest('li');
    if (!(recurringItem instanceof HTMLElement) || !(oneTimeItem instanceof HTMLElement)) {
      throw new Error('Task cards not found');
    }

    const repeatIndicator = within(recurringItem).getByLabelText('Repeats');
    expect(repeatIndicator).toHaveClass('repeat-indicator');
    expect(repeatIndicator.closest('.item__meta--inline')).toBeInTheDocument();
    expect(within(oneTimeItem).queryByLabelText('Repeats')).not.toBeInTheDocument();
  } finally {
    restoreMedia();
  }
});

test('recurring mobile task card shows a schedule repeat indicator', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  mockGetTasks.mockResolvedValue([{ ...sampleTask, recurrenceRuleID: 10 }]);
  render(<App />);

  try {
    const taskItem = (await screen.findByText('Buy milk')).closest('li');
    if (!(taskItem instanceof HTMLElement)) throw new Error('Mobile task card not found');
    const repeatIndicator = within(taskItem).getByLabelText('Repeats');
    expect(repeatIndicator).toHaveClass('repeat-indicator');
    expect(repeatIndicator.closest('.item__meta--inline')).toBeInTheDocument();
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile task card groups status and overdue indicators below the title', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  mockGetTasks.mockResolvedValue([{
    ...sampleTask,
    title: 'A long mobile task title that can wrap independently',
    dateTimeScheduled: '2020-01-01T09:00:00',
  }]);
  render(<App />);

  try {
    const title = await screen.findByText('A long mobile task title that can wrap independently');
    const titleLine = title.closest('.item__title-line');
    const status = screen.getByRole('button', { name: /change status from active/i });
    const statusRow = status.closest('.item__status-row');

    expect(titleLine).toBeInTheDocument();
    expect(title.parentElement).toBe(titleLine);
    expect(statusRow?.parentElement).toBe(titleLine);
    expect(within(statusRow as HTMLElement).getByText('Overdue')).toHaveClass('item__badge--overdue');
  } finally {
    restoreTouchEnvironment();
  }
});

test('clicking task count badge shows all tasks and updates active styling', async () => {
  mockGetTasks.mockResolvedValue([
    { ...sampleTask, taskID: 1, title: 'Active task', statusID: null },
    { ...sampleTask, taskID: 2, title: 'Done task', statusID: 2 },
    { ...sampleTask, taskID: 3, title: 'Overdue task', statusID: null, dateTimeScheduled: '2026-01-01T09:00:00' },
  ]);
  render(<App />);
  await screen.findByText('Active task');

  const taskList = screen.getByRole('list', { name: /task list/i });
  const allBadge = screen.getByRole('button', { name: /3 tasks/i });
  const doneBadge = screen.getByRole('button', { name: /1 done/i });
  expect(allBadge).toHaveClass('task-count--active');

  await act(async () => {
    userEvent.click(doneBadge);
  });
  expect(within(taskList).getByText('Done task')).toBeInTheDocument();
  expect(within(taskList).queryByText('Active task')).not.toBeInTheDocument();
  expect(doneBadge).toHaveClass('task-count--active');

  await act(async () => {
    userEvent.click(allBadge);
  });
  expect(within(taskList).getByText('Active task')).toBeInTheDocument();
  expect(within(taskList).getByText('Done task')).toBeInTheDocument();
  expect(within(taskList).getByText('Overdue task')).toBeInTheDocument();
  expect(allBadge).toHaveClass('task-count--active');
});

test('clicking done count badge filters to completed tasks', async () => {
  mockGetTasks.mockResolvedValue([
    { ...sampleTask, taskID: 1, title: 'Active task', statusID: null },
    { ...sampleTask, taskID: 2, title: 'Done task', statusID: 2 },
  ]);
  render(<App />);
  await screen.findByText('Active task');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /1 done/i }));
  });

  const taskList = screen.getByRole('list', { name: /task list/i });
  expect(within(taskList).getByText('Done task')).toBeInTheDocument();
  expect(within(taskList).queryByText('Active task')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /1 done/i })).toHaveClass('task-count--active');
});

test('clicking overdue count badge filters to overdue tasks', async () => {
  mockGetTasks.mockResolvedValue([
    { ...sampleTask, taskID: 1, title: 'Active task', statusID: null, dateTimeScheduled: '2026-12-01T09:00:00' },
    { ...sampleTask, taskID: 2, title: 'Overdue task', statusID: null, dateTimeScheduled: '2026-01-01T09:00:00' },
  ]);
  render(<App />);
  await screen.findByText('Active task');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /1 overdue/i }));
  });

  const taskList = screen.getByRole('list', { name: /task list/i });
  expect(within(taskList).getByText('Overdue task')).toBeInTheDocument();
  expect(within(taskList).queryByText('Active task')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /1 overdue/i })).toHaveClass('task-count--active');
});

test('completed filter empty state explains completed tasks', async () => {
  mockGetTasks.mockResolvedValue([
    { ...sampleTask, taskID: 1, title: 'Active task', statusID: null },
  ]);
  render(<App />);
  await screen.findByText('Active task');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /Show filter:/ }));
  });
  await act(async () => {
    userEvent.click(screen.getByRole('menuitemradio', { name: 'Done' }));
  });

  expect(screen.getByText('No completed tasks yet')).toBeInTheDocument();
  expect(screen.getByText('Completed tasks will show here.')).toBeInTheDocument();
});

test('overdue filter empty state reinforces progress', async () => {
  mockGetTasks.mockResolvedValue([
    { ...sampleTask, taskID: 1, title: 'Future task', statusID: null, dateTimeScheduled: '2026-12-01T09:00:00' },
  ]);
  render(<App />);
  await screen.findByText('Future task');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /Show filter:/ }));
  });
  await act(async () => {
    userEvent.click(screen.getByRole('menuitemradio', { name: 'Overdue' }));
  });

  expect(screen.getByText('No overdue tasks')).toBeInTheDocument();
  expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
});

test('shows "No due date" for tasks without dateTimeScheduled', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  expect(await screen.findByText('No due date')).toBeInTheDocument();
});

test('shows formatted date for tasks with dateTimeScheduled', async () => {
  mockGetTasks.mockResolvedValue([scheduledTask]);
  render(<App />);
  await screen.findByText('Dentist appointment');
  expect(screen.queryByText('No due date')).not.toBeInTheDocument();
});

test('12-hour task time uses uppercase PM in US and European date formats', async () => {
  mockGetTasks.mockResolvedValue([{ ...sampleTask, dateTimeScheduled: '2026-06-15T21:00:00' }]);
  render(<App />);
  await screen.findByText('Buy milk');

  expect(screen.getByText(/9:00 PM/)).toBeInTheDocument();

  await act(async () => { openSettings(); });
  await act(async () => { userEvent.click(screen.getByRole('button', { name: /dd\/mm\/yyyy/i })); });

  expect(screen.getByText(/9:00 PM/)).toBeInTheDocument();
  expect(screen.queryByText(/pm/)).not.toBeInTheDocument();
});

test('24-hour task time converts PM storage to 21:00 for display', async () => {
  mockGetTasks.mockResolvedValue([{ ...sampleTask, dateTimeScheduled: '2026-06-15T21:00:00' }]);
  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => { openSettings(); });
  await act(async () => { userEvent.click(screen.getByRole('button', { name: /24-hour/i })); });

  expect(screen.getByText(/21:00/)).toBeInTheDocument();
  expect(screen.queryByText(/9:00 PM/)).not.toBeInTheDocument();
});

test('end time ranges format correctly in 12-hour and 24-hour modes', async () => {
  mockGetTasks.mockResolvedValue([{
    ...sampleTask,
    dateTimeScheduled: '2026-06-15T21:00:00',
    endDateTimeScheduled: '2026-06-15T22:00:00',
  }]);
  render(<App />);
  await screen.findByText('Buy milk');

  expect(screen.getByText(/9:00 PM - 10:00 PM/)).toBeInTheDocument();

  await act(async () => { openSettings(); });
  await act(async () => { userEvent.click(screen.getByRole('button', { name: /24-hour/i })); });

  expect(screen.getByText(/21:00 - 22:00/)).toBeInTheDocument();
});

test('title input is empty on initial render', async () => {
  render(<App />);
  const input = screen.getByPlaceholderText(/task title/i) as HTMLInputElement;
  expect(input.value).toBe('');
});

test('format toggle buttons are rendered inside the settings panel', async () => {
  render(<App />);
  await act(async () => { openSettings(); });
  expect(await screen.findByRole('button', { name: /24-hour/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /dd\/mm\/yyyy/i })).toBeInTheDocument();
});

// User interaction behavior.

test('typing in the title input updates its value', async () => {
  render(<App />);
  const input = screen.getByPlaceholderText(/task title/i) as HTMLInputElement;
  userEvent.type(input, 'New task');
  expect(input.value).toBe('New task');
});

test('clicking Add calls createTask and appends task to list', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.type(screen.getByPlaceholderText(/task title/i), 'Buy milk');
  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));

  expect(await screen.findByText('Buy milk')).toBeInTheDocument();
  expect(mockCreateTask).toHaveBeenCalledTimes(1);
});

test('clicking Add shows a non-disruptive task-created toast', async () => {
  mockCreateTask.mockResolvedValue({ ...sampleTask, title: 'Toast task' });
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.type(screen.getByPlaceholderText(/task title/i), 'Toast task');
  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));

  const toastMessage = await screen.findByText('Task added.');
  const toast = toastMessage.closest('.toast');
  if (!(toast instanceof HTMLElement)) throw new Error('Toast not found');

  expect(within(toast).getByText(/toast task/i)).toBeInTheDocument();
  expect(within(toast).queryByRole('button', { name: /\+1 hr/i })).not.toBeInTheDocument();
  expect(within(toast).queryByRole('button', { name: /tomorrow/i })).not.toBeInTheDocument();
  expect(within(toast).getAllByRole('button', { name: /dismiss/i }).length).toBeGreaterThan(0);
});

test('task-created confirmation toast auto-dismisses', async () => {
  mockCreateTask.mockResolvedValue({ ...sampleTask, title: 'Auto toast task' });
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  jest.useFakeTimers();
  try {
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/task title/i), { target: { value: 'Auto toast task' } });
      fireEvent.click(screen.getByRole('button', { name: /^add task$/i }));
    });

    expect(screen.getByText('Task added.')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    expect(screen.queryByText('Task added.')).not.toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

test('pressing Enter in title input calls createTask', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.type(screen.getByPlaceholderText(/task title/i), 'Buy milk{enter}');

  await waitFor(() => expect(mockCreateTask).toHaveBeenCalledTimes(1));
});

test('clicking delete button then confirming removes the task', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);

  await screen.findByText('Buy milk');

  // Step 1: click the ✕ icon to show confirmation
  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
  });

  // Step 2: wait for confirmation to appear, then click Delete
  const confirmBtn = await screen.findByRole('button', { name: /^delete$/i });
  await act(async () => { userEvent.click(confirmBtn); });

  await waitFor(() => {
    expect(mockDeleteTask).toHaveBeenCalledWith(1);
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });
});

test('clicking delete then Cancel leaves the task in place', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);

  await screen.findByText('Buy milk');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
  });
  const cancelBtn = await screen.findByRole('button', { name: /cancel/i });
  userEvent.click(cancelBtn);

  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(mockDeleteTask).not.toHaveBeenCalled();
});

test('toggling 24-hour format hides the AM/PM selector while editing time', async () => {
  render(<App />);
  // Start time is summarized by default; open the editor from the summary.
  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  // In default 12h mode the AM/PM segment should be available.
  expect(await screen.findByRole('button', { name: /^(AM|PM)$/ })).toBeInTheDocument();

  // Switch to 24-hour in settings
  await act(async () => { openSettings(); });
  await act(async () => { userEvent.click(screen.getByRole('button', { name: /24-hour/i })); });

  // AM/PM segment should be gone in 24h mode
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: /^(AM|PM)$/ })).not.toBeInTheDocument();
  });
});

test('12-hour mode shows AM and PM options while editing time', async () => {
  render(<App />);
  // Default is 12-hour; the compact summary opens the time editor.
  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  await act(async () => {
    userEvent.click(await screen.findByRole('button', { name: /^(AM|PM)$/ }));
  });
  expect(screen.getAllByRole('button', { name: 'AM' }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByRole('button', { name: 'PM' }).length).toBeGreaterThanOrEqual(1);
});

test('start time editor opens in one tap when priority menu is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });
  expect(await screen.findByText(/remove priority/i)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ start time/i }));
  });

  expect(screen.queryByText(/remove priority/i)).not.toBeInTheDocument();
  expectOpenTimeEditor('Start');
});

test('end time editor opens in one tap when start time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expectOpenTimeEditor('Start');
  const activeStartSummary = screen.getByRole('button', { name: /^start:/i });
  const inactiveEndSummary = screen.getByRole('button', { name: /\+ end time/i });
  expect(activeStartSummary).toHaveClass('datetime-row__time-summary--active');
  expect(within(activeStartSummary).getByText(/^Start:$/)).toHaveClass('datetime-row__summary-label--active');
  expect(inactiveEndSummary).not.toHaveClass('datetime-row__time-summary--active');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ end time/i }));
  });

  expectNoOpenTimeEditor('Start');
  expectOpenTimeEditor('End');
  const inactiveStartSummary = screen.getByRole('button', { name: /^start:/i });
  const activeEndSummary = screen.getByRole('button', { name: /^end:/i });
  expect(inactiveStartSummary).not.toHaveClass('datetime-row__time-summary--active');
  expect(within(inactiveStartSummary).getByText(/^Start:$/)).not.toHaveClass('datetime-row__summary-label--active');
  expect(activeEndSummary).toHaveClass('datetime-row__time-summary--active');
  expect(within(activeEndSummary).getByText(/^End:$/)).toHaveClass('datetime-row__summary-label--active');
});

test('expanded start and end time editor labels keep the fixed-width label hook', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(getExpandedEditorLabel('Start')).toHaveClass('datetime-row__end-label', 'datetime-row__end-label--fixed');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ end time/i }));
  });
  expect(getExpandedEditorLabel('End')).toHaveClass('datetime-row__end-label', 'datetime-row__end-label--fixed');
});

test('start time editor opens in one tap when end time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ End time/i));
  });
  expectOpenTimeEditor('End');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ start time/i }));
  });

  expectNoOpenTimeEditor('End');
  expectOpenTimeEditor('Start');
});

test('tapping the active start time summary toggles the editor closed', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expectOpenTimeEditor('Start');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^start:/i }));
  });

  expectNoOpenTimeEditor('Start');
});

test('priority opens in one tap when start time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expectOpenTimeEditor('Start');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });

  expectNoOpenTimeEditor('Start');
  expect(screen.getByText(/remove priority/i)).toBeInTheDocument();
});

test('project opens in one tap when start time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expectOpenTimeEditor('Start');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^project$/i }));
  });

  expectNoOpenTimeEditor('Start');
  expect(screen.getByText(/\+ new project/i)).toBeInTheDocument();
});

test('tags opens in one tap when start time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expectOpenTimeEditor('Start');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^tags$/i }));
  });

  expectNoOpenTimeEditor('Start');
  expect(screen.getByText(/\+ new tag/i)).toBeInTheDocument();
});

test('priority opens in one tap when end time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ End time/i));
  });
  expectOpenTimeEditor('End');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });

  expectNoOpenTimeEditor('End');
  expect(screen.getByText(/remove priority/i)).toBeInTheDocument();
});

test('priority closes when clicking the create title input', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });
  expect(await screen.findByText(/remove priority/i)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByPlaceholderText(/task title/i));
  });

  expect(screen.queryByText(/remove priority/i)).not.toBeInTheDocument();
});

test('project opens in one tap when priority is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });
  expect(await screen.findByText(/remove priority/i)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^project$/i }));
  });

  expect(screen.queryByText(/remove priority/i)).not.toBeInTheDocument();
  expect(screen.getByText(/\+ new project/i)).toBeInTheDocument();
});

test('priority menu options are real buttons', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });

  expect(screen.getByRole('button', { name: /remove priority/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^high$/i })).toBeInTheDocument();
});

test('open create dropdown controls close when their trigger is clicked again', async () => {
  render(<App />);
  const createCard = getCreateCard();
  const createScope = within(createCard);
  const triggers = [
    createScope.getByRole('button', { name: /^priority$/i }),
    createScope.getByRole('button', { name: /^project$/i }),
    createScope.getByRole('button', { name: /^tags$/i }),
    createScope.getByRole('button', { name: /repeat.*do not repeat/i }),
  ];

  for (const trigger of triggers) {
    await act(async () => {
      userEvent.click(trigger);
    });
    expect(createCard.querySelector('.tag-select__dropdown')).toBeInTheDocument();

    await act(async () => {
      userEvent.click(trigger);
    });
    expect(createCard.querySelector('.tag-select__dropdown')).not.toBeInTheDocument();
  }
});

test('start time editor closes when clicking the create title input', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expectOpenTimeEditor('Start');

  await act(async () => {
    userEvent.click(screen.getByPlaceholderText(/task title/i));
  });

  expectNoOpenTimeEditor('Start');
});

test('date closes when clicking the create title input', async () => {
  render(<App />);

  await openCreateDateInput();

  await act(async () => {
    userEvent.click(screen.getByPlaceholderText(/task title/i));
  });

  expect(getCreateDateInput()).not.toHaveAttribute('data-open');
});

test('date opens from priority in one tap', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });
  expect(await screen.findByText(/remove priority/i)).toBeInTheDocument();

  await openCreateDateInput();

  expect(screen.queryByText(/remove priority/i)).not.toBeInTheDocument();
  expect(getCreateDateInput()).toHaveAttribute('data-open', 'true');
});

test('start time editor opens from date in one tap', async () => {
  render(<App />);

  await openCreateDateInput();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ start time/i }));
  });

  expect(getCreateDateInput()).not.toHaveAttribute('data-open');
  expectOpenTimeEditor('Start');
});

test('end time editor opens from date in one tap', async () => {
  render(<App />);

  await openCreateDateInput();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ end time/i }));
  });

  expect(getCreateDateInput()).not.toHaveAttribute('data-open');
  expectOpenTimeEditor('End');
});

test('date opens from start time editor in one tap', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expectOpenTimeEditor('Start');

  await openCreateDateInput();

  expectNoOpenTimeEditor('Start');
  expect(getCreateDateInput()).toHaveAttribute('data-open', 'true');
});

test('priority opens from date in one tap', async () => {
  render(<App />);

  await openCreateDateInput();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });

  expect(getCreateDateInput()).not.toHaveAttribute('data-open');
  expect(screen.getByText(/remove priority/i)).toBeInTheDocument();
});

test('closing start hour dropdown keeps the start editor open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });

  const hourButton = screen.getAllByRole('button', { name: /^\d{2}$/ })[0];
  await act(async () => {
    userEvent.click(hourButton);
  });
  await act(async () => {
    userEvent.click(hourButton);
  });

  expectOpenTimeEditor('Start');
});

test('date input remains usable after create control switching', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  await openCreateDateInput();
  await act(async () => {
    fireEvent.change(getCreateDateInput(), { target: { value: '2026-06-20' } });
  });

  expect(getCreateDateInput().value).toBe('2026-06-20');
  expect(getCreateDateInput()).toHaveAttribute('data-open', 'true');
});

test('create task date control renders the desktop-visible date display proxy', () => {
  render(<App />);

  const dateInput = getCreateDateInput();
  expect(dateInput).toHaveClass('datetime-row__date--proxy');

  const dateShell = dateInput.closest('.datetime-row__date-shell');
  if (!(dateShell instanceof HTMLElement)) throw new Error('Create date shell not found');

  const dateDisplay = dateShell.querySelector('.datetime-row__date-display');
  expect(dateDisplay).toBeInTheDocument();
  expect(dateDisplay).toHaveClass('btn', 'btn--ghost', 'btn--sm');
  expect(dateDisplay).toHaveAttribute('aria-hidden', 'true');
  expect(dateDisplay).not.toBeEmptyDOMElement();
});

test('create task date display receives the active styling hook when date control is open', async () => {
  render(<App />);

  await openCreateDateInput();

  const dateDisplay = document.querySelector('.datetime-row__date-display');
  if (!(dateDisplay instanceof HTMLElement)) throw new Error('Create date display not found');
  expect(dateDisplay).toHaveClass('datetime-row__date-display--active');
});

test('date, repeat, and create tags controls have aligned active/dropdown styling hooks', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');

  expect(css).toContain('.datetime-row__date:focus-visible');
  expect(css).toContain('.datetime-row__date--active');
  expect(css).toContain('.datetime-row__date-display--active');
  expect(css).toContain('.app__add .datetime-row__date-display');
  expect(css).toMatch(/\.app__add \.datetime-row__date--proxy:focus-visible \+ \.datetime-row__date-display,[\s\S]*?\.app__add \.datetime-row__date-display--active\s*\{[^}]*background:\s*var\(--input-bg\);[^}]*color:\s*var\(--accent\);/);
  expect(css).toMatch(/\.app__add \.datetime-row__time-summary--active\s*\{[^}]*background:\s*var\(--input-bg\);[^}]*color:\s*var\(--accent\);/);
  expect(css).toContain('.form-row .tag-select.tag-select--create-tags:last-child .tag-select__dropdown');
  expect(css).toMatch(  /\.form-row \.tag-select\.tag-select--create-tags:last-child \.tag-select__dropdown\s*\{[^}]*left:\s*0;[^}]*right:\s*auto;/);
  expect(css).toMatch(/\.tag-select__dropdown\.recurrence-select__dropdown--value-aligned\s*\{[^}]*left:\s*auto;[^}]*right:\s*0;[^}]*width:\s*max-content;/);
  expect(css).not.toContain('tag-select__dropdown--create-tags');
  expect(css).toMatch(/\.toasts\s*\{[^}]*top:\s*1rem;[^}]*left:\s*50%;[^}]*transform:\s*translateX\(-50%\);/);
});

test('desktop inline edit date and time controls use the create highlight styling contract', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const editHighlightRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__date:focus-visible,[\s\S]*?\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__time-summary--active\s*\{[^}]*\}/)?.[0] ?? '';

  expect(editHighlightRule).toContain('border-width: 1.5px');
  expect(editHighlightRule).toContain('border-color: transparent');
  expect(editHighlightRule).toContain('background: var(--input-bg)');
  expect(editHighlightRule).toContain('color: var(--accent)');
  expect(editHighlightRule).toContain('box-shadow: inset 0 0 0 1px var(--accent)');
});

test('filter dropdowns share left-aligned custom menu behavior and display long names', async () => {
  mockGetProjects.mockResolvedValue([
    { projectID: 7, title: 'Wedding Planning' },
    { projectID: 9, title: 'Task Manager' },
  ]);
  mockGetTags.mockResolvedValue([{ tagID: 8, title: 'Car Maintenance', color: '#22c55e' }]);
  render(<App />);

  const projectFilter = await screen.findByLabelText(/Project filter:/);
  userEvent.click(projectFilter);

  const projectMenu = await screen.findByRole('menu', { name: 'Project options' });
  expect(projectMenu).toHaveClass('tag-select__dropdown', 'filter-field__dropdown');
  expect(await within(projectMenu).findByRole('menuitemradio', { name: 'Wedding Planning' })).toBeInTheDocument();
  expect(within(projectMenu).getByRole('menuitemradio', { name: 'Task Manager' })).toBeInTheDocument();

  userEvent.click(screen.getByLabelText(/Tag filter:/));
  const tagMenu = await screen.findByRole('menu', { name: 'Tag options' });
  expect(await within(tagMenu).findByRole('menuitemradio', { name: 'Car Maintenance' })).toBeInTheDocument();

  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  expect(css).toMatch(/\.tag-select__dropdown\.filter-field__dropdown\s*\{[^}]*left:\s*0;[^}]*right:\s*auto;[^}]*width:\s*max-content;[^}]*min-width:\s*100%;[^}]*max-width:\s*min\(220px, calc\(100vw - 2rem\)\);/);
  expect(css).toMatch(/\.filter-field__dropdown \.tag-select__item\s*\{[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/);
});

test('repeat dropdown uses a value-aligned dropdown hook', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /repeat.*do not repeat/i }));
  });

  const dropdown = document.querySelector('.recurrence-select__dropdown');
  expect(dropdown).toHaveClass('recurrence-select__dropdown--value-aligned');
});

test('create tags dropdown uses the generic dropdown sizing', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^tags$/i }));
  });

  const dropdown = document.querySelector('.tag-select--create-tags .tag-select__dropdown');
  expect(dropdown).toBeInTheDocument();
  expect(dropdown).not.toHaveClass('tag-select__dropdown--create-tags');
});

test('create date selection updates the preview immediately', async () => {
  render(<App />);

  await openCreateDateInput();
  await act(async () => {
    fireEvent.change(getCreateDateInput(), { target: { value: '2026-06-20' } });
  });

  expect(getCreateDateInput().value).toBe('2026-06-20');
  expect(within(screen.getByLabelText(/task preview/i)).getByText('06/20/2026')).toBeInTheDocument();
});

test('selected create date is used when creating the task', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  await openCreateDateInput();
  await act(async () => {
    fireEvent.change(getCreateDateInput(), { target: { value: '2026-06-20' } });
  });
  userEvent.type(screen.getByPlaceholderText(/task title/i), 'Dated task');
  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));

  await waitFor(() => expect(mockCreateTask).toHaveBeenCalledTimes(1));
  expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Dated task',
    dateTimeScheduled: '2026-06-20T00:00:00',
  }));
});

test('create task defaults to no recurrence', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.type(screen.getByPlaceholderText(/task title/i), 'One-time task');
  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));

  await waitFor(() => expect(mockCreateTask).toHaveBeenCalledTimes(1));
  expect(mockSetRepeat).not.toHaveBeenCalled();
});

test('create form keeps repeat before the action row controls', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  const createCard = document.querySelector('.app__add');
  if (!(createCard instanceof HTMLElement)) throw new Error('Create card not found');
  const repeatButton = within(createCard).getByRole('button', { name: /repeat.*do not repeat/i });
  const priorityButton = within(createCard).getByRole('button', { name: /^priority$/i });
  const addButton = within(createCard).getByRole('button', { name: /^add task$/i });

  expect(within(repeatButton).getByText('Do not repeat')).toBeInTheDocument();
  expect(repeatButton.compareDocumentPosition(priorityButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(priorityButton.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('create task can select daily recurrence and saves it', async () => {
  mockCreateTask.mockResolvedValue({ ...sampleTask, taskID: 45, title: 'Daily task' });
  mockSetRepeat.mockResolvedValue({ ...sampleTask, taskID: 45, title: 'Daily task', recurrenceRuleID: 11 });
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.type(screen.getByPlaceholderText(/task title/i), 'Daily task');
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /repeat.*do not repeat/i }));
  });
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /^daily$/i }));
  });
  expect(within(screen.getByLabelText(/task preview/i)).getByText('Daily')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));

  await waitFor(() => expect(mockSetRepeat).toHaveBeenCalledWith(45, 'daily'));
});

test('create task can select weekly and monthly recurrence', async () => {
  mockCreateTask.mockResolvedValueOnce({ ...sampleTask, taskID: 46, title: 'Weekly task' });
  mockCreateTask.mockResolvedValueOnce({ ...sampleTask, taskID: 47, title: 'Monthly task' });
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.type(screen.getByPlaceholderText(/task title/i), 'Weekly task');
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /repeat.*do not repeat/i }));
  });
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /^weekly$/i }));
  });
  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));
  await waitFor(() => expect(mockSetRepeat).toHaveBeenCalledWith(46, 'weekly'));
  await waitFor(() => expect(screen.getByRole('button', { name: /repeat.*do not repeat/i })).toBeInTheDocument());

  userEvent.type(screen.getByPlaceholderText(/task title/i), 'Monthly task');
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /repeat.*do not repeat/i }));
  });
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /^monthly$/i }));
  });
  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));
  await waitFor(() => expect(mockSetRepeat).toHaveBeenCalledWith(47, 'monthly'));
});

test('swipe starting on the page area changes mobile view', async () => {
  render(<App />);
  expectMobilePage('Tasks');

  await act(async () => {
    swipeOn(mobilePager(), 320, 120);
  });

  expectMobilePage('Calendar');
});

test('swipe starting on the task creation card background changes back to task list', async () => {
  render(<App />);
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: 'Add' }));
  });
  expectMobilePage('Add');

  const createCard = document.querySelector('.app__add');
  if (!(createCard instanceof HTMLElement)) throw new Error('Create card not found');

  await act(async () => {
    swipeOn(createCard, 320, 120);
  });

  expectMobilePage('Tasks');
});

test('swipe starting on the calendar background changes back to task list', async () => {
  render(<App />);
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: 'Calendar' }));
  });
  expectMobilePage('Calendar');

  await act(async () => {
    swipeOn(screen.getByTestId('calendar-background'), 120, 320);
  });

  expectMobilePage('Tasks');
});

test('swipe starting inside the title input does not change mobile view', async () => {
  render(<App />);
  expectMobilePage('Tasks');

  await act(async () => {
    swipeOn(screen.getByPlaceholderText(/task title/i), 320, 120);
  });

  expectMobilePage('Tasks');
});

test('mobile description textareas keep a 16px font size above the iOS focus zoom threshold', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const mobileInputRules = css.match(/input\.input\[type="text"\][\s\S]*?textarea\.input\s*\{[^}]*font-size:\s*16px;[^}]*\}/g) ?? [];
  const mobileTextareaRules = css.match(/\.controls__description\s*\{[^}]*font-size:\s*16px;[^}]*\}/g) ?? [];
  const mobileTextareaFocusRules = css.match(/\.controls__description:focus\s*\{[^}]*font-size:\s*16px;[^}]*\}/g) ?? [];

  expect(mobileInputRules.length).toBeGreaterThanOrEqual(2);
  expect(mobileTextareaRules.length).toBeGreaterThanOrEqual(2);
  expect(mobileTextareaFocusRules.length).toBeGreaterThanOrEqual(2);
});

test('task card status row preserves desktop placement and becomes a full mobile metadata row', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const titleLineRule = css.match(/\.item__title-line\s*\{[^}]*\}/)?.[0] ?? '';
  const statusRowRules = css.match(/\.item__status-row\s*\{[^}]*\}/g) ?? [];
  const mobileOverdueRule = css.match(/\.item__status-row \.item__badge--overdue\s*\{[^}]*\}/)?.[0] ?? '';

  expect(titleLineRule).toContain('align-items: center');
  expect(titleLineRule).toContain('flex-wrap: wrap');
  expect(statusRowRules[0]).toContain('display: contents');
  expect(statusRowRules[1]).toContain('display: flex');
  expect(statusRowRules[1]).toContain('flex: 0 0 100%');
  expect(statusRowRules[1]).toContain('flex-wrap: wrap');
  expect(mobileOverdueRule).toContain('border-radius: 999px');
  expect(mobileOverdueRule).toContain('padding: 0.08rem 0.42rem');
  expect(css).toMatch(/\.item__chips,\s*\.item__badges,\s*\.selected-tags\s*\{[^}]*align-items:\s*flex-start;/);
});

test('repeat indicator remains lightweight but visible in schedule metadata', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const repeatIndicatorRule = css.match(/\.repeat-indicator\s*\{[^}]*\}/)?.[0] ?? '';

  expect(repeatIndicatorRule).toContain('color: var(--accent)');
  expect(repeatIndicatorRule).toContain('font-size: 1em');
  expect(repeatIndicatorRule).toContain('opacity: 0.78');
  expect(repeatIndicatorRule).not.toContain('background');
  expect(repeatIndicatorRule).not.toContain('border');
});

test('description character counter stays outside the text field', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const wrapperRule = css.match(/\.desc-wrap\s*\{[^}]*\}/)?.[0] ?? '';
  const counterRule = css.match(/\.char-count\s*\{[^}]*\}/)?.[0] ?? '';

  expect(wrapperRule).toContain('display: grid');
  expect(counterRule).toContain('position: static');
  expect(counterRule).toContain('justify-self: end');
  expect(counterRule).not.toContain('position: absolute');
});

test('mobile text focus guard resets document scroll after create title blur', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const title = getCreateTitleInput();
  await act(async () => {
    fireEvent.focusIn(title);
  });
  scrollTo.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.focusOut(title);
  });

  expectDocumentScrollReset();
  scrollTo.mockRestore();
});

test('mobile text focus guard resets document scroll after create description blur', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const description = getCreateDescriptionTextarea();
  await act(async () => {
    fireEvent.focusIn(description);
  });
  scrollTo.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.focusOut(description);
  });

  expectDocumentScrollReset();
  scrollTo.mockRestore();
});

test('mobile text focus guard reinitializes title after description focus', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const title = getCreateTitleInput();
  const description = getCreateDescriptionTextarea();
  await act(async () => {
    fireEvent.focusIn(description);
    fireEvent.focusOut(description, { relatedTarget: title });
    fireEvent.focusIn(title, { relatedTarget: description });
  });
  scrollTo.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.focusOut(title);
  });

  expectDocumentScrollReset();
  scrollTo.mockRestore();
});

test('mobile text focus guard reinitializes description after title focus', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const title = getCreateTitleInput();
  const description = getCreateDescriptionTextarea();
  await act(async () => {
    fireEvent.focusIn(title);
    fireEvent.focusOut(title, { relatedTarget: description });
    fireEvent.focusIn(description, { relatedTarget: title });
  });
  scrollTo.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.focusOut(description);
  });

  expectDocumentScrollReset();
  scrollTo.mockRestore();
});

test('mobile text focus guard covers inline edit title and description fields', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const editCard = await openInlineEditCard();
  const title = within(editCard).getByLabelText(/task title/i);
  const description = within(editCard).getByLabelText(/task description/i);
  if (!(title instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');
  if (!(description instanceof HTMLTextAreaElement)) throw new Error('Inline edit description textarea not found');

  await act(async () => {
    fireEvent.focusIn(description);
    fireEvent.focusOut(description, { relatedTarget: title });
    fireEvent.focusIn(title, { relatedTarget: description });
  });
  scrollTo.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.focusOut(title);
  });

  expectDocumentScrollReset();
  scrollTo.mockRestore();
});

test('mobile text focus guard keeps create title active after edit title to edit description to create title', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const editCard = await openInlineEditCard();
  const editTitle = within(editCard).getByLabelText(/task title/i);
  const editDescription = within(editCard).getByLabelText(/task description/i);
  const createTitle = getCreateTitleInput();
  if (!(editTitle instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');
  if (!(editDescription instanceof HTMLTextAreaElement)) throw new Error('Inline edit description textarea not found');

  await act(async () => {
    fireEvent.focusIn(editTitle);
    fireEvent.focusOut(editTitle, { relatedTarget: editDescription });
    fireEvent.focusIn(editDescription, { relatedTarget: editTitle });
    fireEvent.focusOut(editDescription, { relatedTarget: createTitle });
    fireEvent.focusIn(createTitle, { relatedTarget: editDescription });
  });
  scrollTo.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.focusOut(createTitle);
  });

  expectDocumentScrollReset();
  scrollTo.mockRestore();
});

test('stale edit description blur cannot disable create title scroll correction', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const editCard = await openInlineEditCard();
  const editDescription = within(editCard).getByLabelText(/task description/i);
  const createTitle = getCreateTitleInput();
  if (!(editDescription instanceof HTMLTextAreaElement)) throw new Error('Inline edit description textarea not found');

  jest.useFakeTimers();
  try {
    await focusTextField(editDescription);
    await focusTextField(createTitle);
    await act(async () => {
      fireEvent.focusOut(editDescription);
    });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    scrollTo.mockClear();
    dirtyDocumentScroll();

    await act(async () => {
      fireEvent.scroll(window);
    });

    expectDocumentScrollReset();
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
  }
});

test('mobile text focus guard keeps edit title active after create description to edit title', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const editCard = await openInlineEditCard();
  const createDescription = getCreateDescriptionTextarea();
  const editTitle = within(editCard).getByLabelText(/task title/i);
  if (!(editTitle instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');

  await act(async () => {
    fireEvent.focusIn(createDescription);
    fireEvent.focusOut(createDescription, { relatedTarget: editTitle });
    fireEvent.focusIn(editTitle, { relatedTarget: createDescription });
  });
  scrollTo.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.focusOut(editTitle);
  });

  expectDocumentScrollReset();
  scrollTo.mockRestore();
});

test('unmounting an edit textarea after create title focus does not disable scroll correction', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const editCard = await openInlineEditCard();
  const editDescription = within(editCard).getByLabelText(/task description/i);
  const createTitle = getCreateTitleInput();
  const cancel = within(editCard).getByRole('button', { name: /^cancel$/i });
  if (!(editDescription instanceof HTMLTextAreaElement)) throw new Error('Inline edit description textarea not found');

  jest.useFakeTimers();
  try {
    await focusTextField(editDescription);
    await focusTextField(createTitle);
    await act(async () => {
      fireEvent.click(cancel);
    });
    await focusTextField(createTitle);
    await act(async () => {
      fireEvent.focusOut(editDescription);
      jest.advanceTimersByTime(350);
    });
    scrollTo.mockClear();
    dirtyDocumentScroll();

    await act(async () => {
      fireEvent.scroll(window);
    });

    expectDocumentScrollReset();
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
  }
});

test('repeated create title and description swaps preserve scroll correction', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const title = getCreateTitleInput();
  const description = getCreateDescriptionTextarea();

  await focusTextField(title);
  await act(async () => {
    fireEvent.focusOut(title, { relatedTarget: description });
  });
  await focusTextField(description);
  await act(async () => {
    fireEvent.focusOut(description, { relatedTarget: title });
  });
  await focusTextField(title);
  await act(async () => {
    fireEvent.focusOut(title, { relatedTarget: description });
  });
  await focusTextField(description);

  await expectScrollCorrectionStillActive(scrollTo);
  scrollTo.mockRestore();
});

test('repeated inline edit title and description swaps preserve scroll correction', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const editCard = await openInlineEditCard();
  const title = within(editCard).getByLabelText(/task title/i);
  const description = within(editCard).getByLabelText(/task description/i);
  if (!(title instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');
  if (!(description instanceof HTMLTextAreaElement)) throw new Error('Inline edit description textarea not found');

  await focusTextField(title);
  await act(async () => {
    fireEvent.focusOut(title, { relatedTarget: description });
  });
  await focusTextField(description);
  await act(async () => {
    fireEvent.focusOut(description, { relatedTarget: title });
  });
  await focusTextField(title);
  await act(async () => {
    fireEvent.focusOut(title, { relatedTarget: description });
  });
  await focusTextField(description);

  await expectScrollCorrectionStillActive(scrollTo);
  scrollTo.mockRestore();
});

test('delayed blur cannot disable keyboard text mode while another app text field is active', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const title = getCreateTitleInput();
  const description = getCreateDescriptionTextarea();

  jest.useFakeTimers();
  try {
    await focusTextField(title);
    await focusTextField(description);
    await act(async () => {
      fireEvent.focusOut(title);
      jest.advanceTimersByTime(350);
    });

    expect(document.activeElement).toBe(description);
    await expectScrollCorrectionStillActive(scrollTo);
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
  }
});

test('null relatedTarget during create text transition preserves active DOM text field state', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const title = getCreateTitleInput();
  const description = getCreateDescriptionTextarea();

  jest.useFakeTimers();
  try {
    await focusTextField(title);
    await act(async () => {
      description.focus();
      fireEvent.focusOut(title);
      jest.advanceTimersByTime(350);
    });
    expect(document.activeElement).toBe(description);

    await expectScrollCorrectionStillActive(scrollTo);
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
  }
});

test('scroll correction follows the current active text field after stale previous blur', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const title = getCreateTitleInput();
  const description = getCreateDescriptionTextarea();

  jest.useFakeTimers();
  try {
    await focusTextField(title);
    await focusTextField(description);
    await act(async () => {
      fireEvent.focusOut(title);
      jest.advanceTimersByTime(350);
    });
    expect(document.activeElement).toBe(description);
    await expectScrollCorrectionStillActive(scrollTo);

    await focusTextField(title);
    await act(async () => {
      fireEvent.focusOut(description);
      jest.advanceTimersByTime(350);
    });
    expect(document.activeElement).toBe(title);
    await expectScrollCorrectionStillActive(scrollTo);
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
  }
});

test('text focus debug schedules exactly three summaries for one transition', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  jest.useFakeTimers();
  try {
    await focusTextField(getCreateTitleInput());
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    const summaries = textFocusSummaryLogs(info);
    expect(summaries).toHaveLength(3);
    expect(summaries.map(call => call[1].settledAtMs)).toEqual([40, 120, 300]);
    expect(new Set(summaries.map(call => `${call[1].transitionId}:${call[1].settledAtMs}`)).size).toBe(3);
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
    info.mockRestore();
  }
});

test('deduped text focusin does not schedule duplicate debug summaries', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  jest.useFakeTimers();
  try {
    const title = getCreateTitleInput();
    await focusTextField(title);
    await focusTextField(title);
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    const summaries = textFocusSummaryLogs(info);
    expect(summaries).toHaveLength(3);
    expect(summaries.map(call => call[1].settledAtMs)).toEqual([40, 120, 300]);
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
    info.mockRestore();
  }
});

test('focusout body gap followed by text focus does not schedule duplicate summaries', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  jest.useFakeTimers();
  try {
    const title = getCreateTitleInput();
    const description = getCreateDescriptionTextarea();
    await focusTextField(title);
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    info.mockClear();

    await act(async () => {
      fireEvent.focusOut(title);
    });
    await focusTextField(description);
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    const summaries = textFocusSummaryLogs(info);
    expect(summaries).toHaveLength(3);
    expect(summaries.map(call => call[1].settledAtMs)).toEqual([40, 120, 300]);
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
    info.mockRestore();
  }
});

test('repeated focusin events for the same text field reuse the same summary schedule', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  jest.useFakeTimers();
  try {
    const title = getCreateTitleInput();
    await act(async () => {
      title.focus();
      fireEvent.focusIn(title);
      fireEvent.focusIn(title);
      fireEvent.focusIn(title);
    });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    const summaries = textFocusSummaryLogs(info);
    expect(summaries).toHaveLength(3);
    expect(summaries.map(call => call[1].settledAtMs)).toEqual([40, 120, 300]);
  } finally {
    jest.useRealTimers();
    scrollTo.mockRestore();
    info.mockRestore();
  }
});

test('entering inline edit from a scrolled task list resets stale document scroll before edit focus', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText(sampleTask.title);

  const search = screen.getByPlaceholderText(/search tasks/i);
  const taskList = document.querySelector('.app__list');
  if (!(search instanceof HTMLInputElement)) throw new Error('Search input not found');
  if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

  await focusTextField(search);
  dirtyDocumentScroll();
  dirtyElementScroll(taskList, 88);
  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  expectDocumentScrollReset();
  expect(document.querySelector('.item__edit-card')).toBeInTheDocument();
  scrollTo.mockRestore();
});

test('edit-card correction result reports the current edit scope behind debug flag', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  const editCard = await openInlineEditCard();
  const title = within(editCard).getByLabelText(/task title/i);
  if (!(title instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');

  await focusTextField(title);
  dirtyDocumentScroll();
  await act(async () => {
    fireEvent.scroll(window);
  });

  const correctionResult = debug.mock.calls.find(call =>
    call[0] === '[text-focus-guard]' &&
    call[1]?.event === 'correction-result' &&
    String(call[1]?.activeTextScope).includes('item__edit-card')
  );
  expect(correctionResult).toBeTruthy();
  expect(String(correctionResult?.[1]?.activeTextScope)).toContain('item__edit-card');
  scrollTo.mockRestore();
  debug.mockRestore();
});

test('search to inline edit title keeps text mode active and corrects document scroll', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText(sampleTask.title);

  const search = screen.getByPlaceholderText(/search tasks/i);
  if (!(search instanceof HTMLInputElement)) throw new Error('Search input not found');
  await focusTextField(search);
  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });
  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Edit card not found');
  const title = within(editCard).getByLabelText(/task title/i);
  if (!(title instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');

  await focusTextField(title);
  dirtyDocumentScroll();
  await act(async () => {
    fireEvent.scroll(window);
  });

  const correctionResult = debug.mock.calls.find(call =>
    call[0] === '[text-focus-guard]' &&
    call[1]?.event === 'correction-result' &&
    Array.isArray(call[1]?.changed) &&
    call[1].changed.includes('document.documentElement.scrollTop') &&
    call[1].changed.includes('document.body.scrollTop')
  );
  expect(correctionResult?.[1]?.keyboardTextMode).toBe(true);
  expectDocumentScrollReset();
  scrollTo.mockRestore();
  debug.mockRestore();
});

test('opening inline edit after search blur does not inherit the task list text scope', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText(sampleTask.title);

  const search = screen.getByPlaceholderText(/search tasks/i);
  if (!(search instanceof HTMLInputElement)) throw new Error('Search input not found');
  await focusTextField(search);
  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });
  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Edit card not found');
  const title = within(editCard).getByLabelText(/task title/i);
  if (!(title instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');

  await focusTextField(title);

  const editFocus = debug.mock.calls.find(call =>
    call[0] === '[text-focus-guard]' &&
    call[1]?.event === 'focusin' &&
    String(call[1]?.eventTarget).includes('Task title') &&
    String(call[1]?.nextScope).includes('item__edit-card')
  );
  expect(editFocus?.[1]?.previousScope).toBe('null');
  scrollTo.mockRestore();
  debug.mockRestore();
});

test('correction-result debug log is emitted only behind the text focus debug flag', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  await focusTextField(getCreateTitleInput());
  dirtyDocumentScroll();
  await act(async () => {
    fireEvent.scroll(window);
  });

  expect(debug.mock.calls.some(call => call[1]?.event === 'correction-result')).toBe(false);
  expect(info.mock.calls.some(call => call[0] === '[text-focus-correction-summary]')).toBe(false);
  scrollTo.mockRestore();
  debug.mockRestore();
  info.mockRestore();
});

test('text focus correction summary emits scalar scroll and viewport evidence behind debug flag', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  const search = screen.getByPlaceholderText(/search tasks/i);
  if (!(search instanceof HTMLInputElement)) throw new Error('Search input not found');
  await focusTextField(search);
  info.mockClear();
  dirtyDocumentScroll();

  await act(async () => {
    fireEvent.scroll(window);
  });

  const summary = info.mock.calls.find(call =>
    typeof call[0] === 'string' &&
    call[0].startsWith('[text-focus-correction-summary]')
  );
  expect(summary).toBeTruthy();
  expect(summary).toHaveLength(1);
  expect(summary?.[0]).toContain('event=scroll');
  expect(summary?.[0]).toContain('active=input.input.search.mtop[Search tasks]');
  expect(summary?.[0]).toContain('scope=div.card.app__list');
  expect(summary?.[0]).toContain('source=null');
  expect(summary?.[0]).toContain('windowY=48->48');
  expect(summary?.[0]).toContain('docTop=48->0');
  expect(summary?.[0]).toContain('bodyTop=48->0');
  expect(summary?.[0]).toContain('changed=window.scrollY|document.documentElement.scrollTop|document.body.scrollTop');
  expect(summary?.[0]).toContain('scrollTo=true');
  expect(summary?.[0]).toContain('docAssign=true');
  expect(summary?.[0]).toContain('bodyAssign=true');
  expect(summary?.[0]).toContain('scrollToIgnored=true');
  expect(summary?.[0]).toContain('docAssignIgnored=false');
  expect(summary?.[0]).toContain('bodyAssignIgnored=false');
  expect(summary?.[0]).toContain('viewportStillOffset=false');
  expect(summary?.[0]).toContain('viewportStillPaged=false');
  scrollTo.mockRestore();
  info.mockRestore();
});

test('visual viewport drift is detected after document scroll has been corrected', async () => {
  const restoreVisualViewport = mockVisualViewport({ offsetTop: 22.328125, pageTop: 22.328125 });
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => setWindowScrollY(0));
  const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    await focusTextField(getCreateTitleInput());
    dirtyDocumentScroll();
    await act(async () => {
      fireEvent.scroll(window);
    });

    const drift = debug.mock.calls.find(call =>
      call[0] === '[text-focus-guard]' &&
      call[1]?.event === 'visual-viewport-drift-detected'
    );
    expect(drift?.[1]?.visualViewport).toEqual(expect.objectContaining({
      offsetTop: 22.328125,
      pageTop: 22.328125,
    }));
  } finally {
    scrollTo.mockRestore();
    debug.mockRestore();
    restoreVisualViewport();
  }
});

test('mobile text focus prevents touchmove outside the active text field by default', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    await focusTextField(getCreateTitleInput());
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    expect(dispatchCancelableTouchMove(taskList)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile text focus touch guard is enabled by default', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    await focusTextField(getCreateTitleInput());
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    expect(dispatchCancelableTouchMove(taskList)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile text focus touch guard does not prevent touchmove when keyboard text mode is inactive', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    expect(dispatchCancelableTouchMove(taskList)).toBe(false);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile text focus touch guard prevents active textarea touchmove when it has no internal scroll', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    const description = getCreateDescriptionTextarea();
    mockElementScrollRange(description, 56, 56);
    await focusTextField(description);

    expect(dispatchCancelableTouchMove(description)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile text focus touch guard allows active textarea scrolling within bounds', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    const description = getCreateDescriptionTextarea();
    mockElementScrollRange(description, 240, 80, 40);
    await focusTextField(description);

    dispatchTextTouch(description, 'touchstart', 200);
    expect(dispatchTextTouch(description, 'touchmove', 160)).toBe(false);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile text focus touch guard prevents textarea overscroll at the top and bottom', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    const description = getCreateDescriptionTextarea();
    mockElementScrollRange(description, 240, 80, 0);
    await focusTextField(description);

    dispatchTextTouch(description, 'touchstart', 160);
    expect(dispatchTextTouch(description, 'touchmove', 200)).toBe(true);

    description.scrollTop = 160;
    dispatchTextTouch(description, 'touchstart', 200);
    expect(dispatchTextTouch(description, 'touchmove', 160)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('create description textarea without internal scroll does not leak visual viewport drag', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    const description = getCreateDescriptionTextarea();
    mockElementScrollRange(description, 56, 56);
    await focusTextField(description);

    expect(dispatchCancelableTouchMove(description)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile edit description renders title-style input by default', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel();

  try {
    const description = within(editPanel).getByLabelText(/task description/i);
    expect(description).toBeInstanceOf(HTMLInputElement);
    expect(description).toHaveClass('input');
    expect(description).not.toHaveClass('controls__description');
  } finally {
    restoreTouchEnvironment();
  }
});

test('create description remains textarea with description class on mobile', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    const createDescription = getCreateDescriptionTextarea();
    expect(createDescription).toBeInstanceOf(HTMLTextAreaElement);
    expect(createDescription).toHaveClass('input');
    expect(createDescription).toHaveClass('controls__description');
  } finally {
    restoreTouchEnvironment();
  }
});

test('desktop edit description remains textarea', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  const editCard = await openInlineEditCard();

  try {
    const description = within(editCard).getByLabelText(/task description/i);
    expect(description).toBeInstanceOf(HTMLTextAreaElement);
    expect(description).toHaveClass('controls__description');
  } finally {
    restoreMedia();
  }
});

test('mobile edit title-style description keeps save semantics', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel({ ...sampleTask, description: 'old description' });

  try {
    const editDescription = within(editPanel).getByLabelText(/task description/i);
    if (!(editDescription instanceof HTMLInputElement)) throw new Error('Mobile edit description input not found');

    fireEvent.change(editDescription, { target: { value: 'new description' } });
    await act(async () => {
      userEvent.click(within(editPanel).getByRole('button', { name: /^save$/i }));
    });

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(1, expect.objectContaining({
      description: 'new description',
    })));
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile edit can change priority and save it', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel({ ...sampleTask, priority: 'LOW' });

  try {
    await act(async () => {
      userEvent.click(within(editPanel).getByRole('button', { name: /^low$/i }));
    });
    await act(async () => {
      userEvent.click(within(editPanel).getByRole('button', { name: /^high$/i }));
    });
    expect(within(editPanel).getByRole('button', { name: /^high$/i })).toBeInTheDocument();
    expect(mockUpdateTask).not.toHaveBeenCalled();
    await act(async () => {
      userEvent.click(within(editPanel).getByRole('button', { name: /^save$/i }));
    });

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(1, expect.objectContaining({
      priority: 'HIGH',
    })));
  } finally {
    restoreTouchEnvironment();
  }
});

test('open mobile edit dropdown controls close when their trigger is tapped again', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel();

  try {
    const editScope = within(editPanel);
    const triggers = [
      editScope.getByRole('button', { name: /^priority$/i }),
      editScope.getByRole('button', { name: /^project$/i }),
      editScope.getByRole('button', { name: /^tags$/i }),
      editScope.getByRole('button', { name: /repeat.*do not repeat/i }),
    ];

    for (const trigger of triggers) {
      await act(async () => {
        userEvent.click(trigger);
      });
      expect(editPanel.querySelector('.tag-select__dropdown')).toBeInTheDocument();

      await act(async () => {
        userEvent.click(trigger);
      });
      expect(editPanel.querySelector('.tag-select__dropdown')).not.toBeInTheDocument();
    }
  } finally {
    restoreTouchEnvironment();
  }
});

test('canceling mobile edit does not persist a dropdown draft change', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel({ ...sampleTask, priority: 'LOW' });

  try {
    const editScope = within(editPanel);
    await act(async () => {
      userEvent.click(editScope.getByRole('button', { name: /^low$/i }));
    });
    await act(async () => {
      userEvent.click(editScope.getByRole('button', { name: /^high$/i }));
    });
    expect(editScope.getByRole('button', { name: /^high$/i })).toBeInTheDocument();
    expect(mockUpdateTask).not.toHaveBeenCalled();

    await act(async () => {
      userEvent.click(editScope.getByRole('button', { name: /^cancel$/i }));
    });

    expect(mockUpdateTask).not.toHaveBeenCalled();
    const taskItem = document.querySelector(`#task-${sampleTask.taskID}`);
    if (!(taskItem instanceof HTMLElement)) throw new Error('Restored task item not found');
    expect(within(taskItem).getByText('Low')).toBeInTheDocument();
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile edit title and description focus do not report visual viewport drift in a stable viewport', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const restoreViewport = mockVisualViewport({ height: 888, offsetTop: 0, pageTop: 0, scale: 1 });
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  window.localStorage.setItem('taskManagerTextFocusDebug', '1');

  try {
    const editPanel = await openMobileEditPanel();
    const editTitle = within(editPanel).getByLabelText(/^task title$/i);
    const editDescription = within(editPanel).getByLabelText(/task description/i);
    if (!(editTitle instanceof HTMLInputElement)) throw new Error('Mobile edit title input not found');
    if (!(editDescription instanceof HTMLInputElement)) throw new Error('Mobile edit description input not found');

    await act(async () => {
      fireEvent.focusIn(editTitle);
      fireEvent.focusOut(editTitle, { relatedTarget: editDescription });
      fireEvent.focusIn(editDescription, { relatedTarget: editTitle });
    });

    expect(info.mock.calls.some(call =>
      typeof call[0] === 'string' &&
      call[0].includes('[text-focus-correction-summary]') &&
      call[0].includes('scope=div.item__edit-card.mobile-edit-panel') &&
      call[0].includes('stillDrifted=true')
    )).toBe(false);
  } finally {
    info.mockRestore();
    restoreViewport();
    restoreTouchEnvironment();
  }
});

test('inline edit entry does not prevent outside touchmove before the edit field focuses', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel();

  try {
    expect(editPanel).toBeInTheDocument();
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    expect(dispatchCancelableTouchMove(taskList)).toBe(false);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile edit renders in a stable panel outside the task list item flow', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel();

  try {
    expect(editPanel).toHaveClass('mobile-edit-panel');
    expect(editPanel.closest('li.item')).toBeNull();
    expect(editPanel.closest('.list')).toBeInTheDocument();
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile edit panel replaces the edited task item in the task list context', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel();

  try {
    const editRow = editPanel.closest('li.mobile-edit-row');
    const taskList = editRow?.closest('.list');
    if (!(editRow instanceof HTMLElement) || !(taskList instanceof HTMLElement)) {
      throw new Error('Mobile edit row not found');
    }
    expect(document.querySelector(`#task-${sampleTask.taskID}`)).not.toBeInTheDocument();
    expect(taskList).toContainElement(editRow);
    expect(editRow).toContainElement(editPanel);
  } finally {
    restoreTouchEnvironment();
  }
});

test('desktop edit visually replaces the original task card content', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  const task: Task = { ...sampleTask, description: 'Persisted only description' };
  const editCard = await openInlineEditCard(task);

  try {
    const taskItem = editCard.closest('li.item');
    if (!(taskItem instanceof HTMLElement)) throw new Error('Task item not found');

    expect(taskItem.querySelector('.item__main')).not.toBeInTheDocument();
    expect(taskItem.querySelector('.item__desc')).not.toBeInTheDocument();
    expect(within(editCard).getByDisplayValue('Persisted only description')).toBeInTheDocument();
  } finally {
    restoreMedia();
  }
});

test('mobile edit visually replaces the original task card content', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const task: Task = { ...sampleTask, description: 'Mobile persisted only description' };
  const editPanel = await openMobileEditPanel(task);

  try {
    expect(editPanel).toHaveClass('mobile-edit-panel');
    expect(editPanel.closest('li.item')).toBeNull();
    expect(document.querySelector(`#task-${task.taskID}`)).not.toBeInTheDocument();
    expect(screen.queryByText('Mobile persisted only description')).not.toBeInTheDocument();
    expect(within(editPanel).getByDisplayValue('Mobile persisted only description')).toBeInTheDocument();
  } finally {
    restoreTouchEnvironment();
  }
});

test('cancel edit restores the original task card', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  const task: Task = { ...sampleTask, description: 'Original card description' };
  const editCard = await openInlineEditCard(task);

  try {
    await act(async () => {
      userEvent.click(within(editCard).getByRole('button', { name: /^cancel$/i }));
    });

    const taskItem = document.querySelector(`#task-${task.taskID}`);
    if (!(taskItem instanceof HTMLElement)) throw new Error('Restored task item not found');
    expect(taskItem.querySelector('.item__main')).toBeInTheDocument();
    expect(within(taskItem).getByText(task.title)).toBeInTheDocument();
    expect(within(taskItem).getByText('Original card description')).toBeInTheDocument();
  } finally {
    restoreMedia();
  }
});

test('saving mobile edit restores the updated task card', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const task: Task = { ...sampleTask, title: 'Original mobile title' };
  mockUpdateTask.mockImplementation(async (id, updatedTask) => ({ ...task, ...updatedTask, taskID: id } as Task));
  const editPanel = await openMobileEditPanel(task);

  try {
    const titleInput = within(editPanel).getByLabelText(/^task title$/i);
    if (!(titleInput instanceof HTMLInputElement)) throw new Error('Mobile edit title input not found');
    fireEvent.change(titleInput, { target: { value: 'Updated mobile title' } });
    await act(async () => {
      userEvent.click(within(editPanel).getByRole('button', { name: /^save$/i }));
    });

    await screen.findByText('Updated mobile title');
    expect(document.querySelector('.mobile-edit-panel')).not.toBeInTheDocument();
    const taskItem = document.querySelector(`#task-${task.taskID}`);
    if (!(taskItem instanceof HTMLElement)) throw new Error('Updated task item not found');
    expect(taskItem.querySelector('.item__main')).toBeInTheDocument();
    expect(within(taskItem).queryByText('Original mobile title')).not.toBeInTheDocument();
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile edit panel is not sticky or an independent scroll container', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const panelRule = css.match(/\.mobile-page--tasks \.mobile-edit-panel\s*\{[^}]*\}/)?.[0] ?? '';

  expect(panelRule).toContain('overflow-y: visible');
  expect(panelRule).toContain('max-height: none');
  expect(panelRule).not.toContain('position: sticky');
  expect(panelRule).not.toContain('top: 0');
  expect(panelRule).not.toContain('overflow-y: auto');
  expect(panelRule).not.toContain('-webkit-overflow-scrolling: touch');
});

test('mobile edit dropdowns stay in panel flow and actions use a stable row', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const dropdownRule = css.match(/\.mobile-page--tasks \.mobile-edit-panel \.tag-select__dropdown\s*\{[^}]*\}/)?.[0] ?? '';
  const actionsRule = css.match(/\.mobile-page--tasks \.mobile-edit-panel \.item__edit-actions\s*\{[^}]*\}/)?.[0] ?? '';
  const actionButtonRule = css.match(/\.mobile-page--tasks \.mobile-edit-panel \.item__edit-actions \.btn\s*\{[^}]*\}/)?.[0] ?? '';

  expect(dropdownRule).toContain('position: static');
  expect(dropdownRule).toContain('max-height: min(14rem, 35dvh)');
  expect(dropdownRule).toContain('overflow-y: auto');
  expect(actionsRule).toContain('display: grid');
  expect(actionsRule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  expect(actionButtonRule).toContain('width: 100%');
});

test('mobile edit time controls keep Clear Time and Done on a full-width action row', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel();

  try {
    await act(async () => {
      userEvent.click(within(editPanel).getByRole('button', { name: /\+ start time/i }));
    });

    const editor = getOpenTimeEditor(editPanel);
    expect(within(editor).getByRole('button', { name: /clear time/i })).toBeInTheDocument();
    expect(within(editor).getByRole('button', { name: /^done$/i })).toBeInTheDocument();

    const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
    const timeRowRule = css.match(/\.mobile-page--tasks \.mobile-edit-panel \.datetime-row__time\s*\{[^}]*\}/)?.[0] ?? '';
    const editorActionsRule = css.match(/\.mobile-page--tasks \.mobile-edit-panel \.datetime-row__editor-actions\s*\{[^}]*\}/)?.[0] ?? '';

    expect(timeRowRule).toContain('grid-template-columns: 1.55rem minmax(0, 1fr) 0.18rem minmax(0, 1fr) minmax(0, 1fr)');
    expect(editorActionsRule).toContain('grid-column: 1 / -1');
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile task list remains the scroll owner for mobile edit', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const appListRules = css.match(/\.mobile-page--tasks \.app__list\s*\{[^}]*\}/g) ?? [];
  const appListScrollRule = appListRules.find(rule => rule.includes('overflow-y: auto')) ?? '';

  expect(appListScrollRule).toContain('overflow-y: auto');
  expect(appListScrollRule).toContain('-webkit-overflow-scrolling: touch');
});

test('mobile edit panel keeps the edit text focus scope separate from the list card', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel();

  try {
    expect(editPanel.getAttribute('data-text-focus-scope')).toBe('mobile-edit-1');
    const title = within(editPanel).getByLabelText(/task title/i);
    if (!(title instanceof HTMLInputElement)) throw new Error('Mobile edit title input not found');
    await focusTextField(title);
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');
    expect(dispatchCancelableTouchMove(taskList)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('desktop edit remains inline in the task list flow', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  const editCard = await openInlineEditCard();

  try {
    expect(editCard).toBeInTheDocument();
    expect(editCard.closest('li.item')).toBeInTheDocument();
    expect(document.querySelector('.mobile-edit-panel')).not.toBeInTheDocument();
  } finally {
    restoreMedia();
  }
});

test('desktop task selection highlights the task without opening competing edit panels', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  mockGetTasks.mockResolvedValue([sampleTask]);
  mockGetTask.mockResolvedValue(sampleTask);
  render(<App />);
  await screen.findByText('Buy milk');

  try {
    await act(async () => {
      userEvent.click(screen.getByText('Buy milk'));
    });

    await waitFor(() => expect(document.querySelector('.item--selected')).toBeInTheDocument());
    const pager = document.querySelector<HTMLElement>('.mobile-pager');
    expect(pager).not.toHaveClass('mobile-pager--detail-open');
    expect(document.querySelector('.app__detail')).not.toBeInTheDocument();
    expect(document.querySelector('.item__edit-card')).not.toBeInTheDocument();
    expect(document.querySelector('.mobile-edit-panel')).not.toBeInTheDocument();
    expect(document.querySelector('.mobile-edit-row')).not.toBeInTheDocument();
  } finally {
    restoreMedia();
  }
});

test('mobile edit entry does not reposition the task list', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editPanel = await openMobileEditPanel();

  try {
    expect(editPanel).toBeInTheDocument();
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    taskList.scrollTop = 120;
    await new Promise(resolve => window.setTimeout(resolve, 60));
    expect(taskList.scrollTop).toBe(120);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile edit panel exposes recurrence project and tag controls', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  mockGetProjects.mockResolvedValue([{ projectID: 7, title: 'Home' }]);
  mockGetTags.mockResolvedValue([{ tagID: 8, title: 'Errand', color: '#22c55e' }]);
  const editPanel = await openMobileEditPanel({ ...sampleTask, recurrenceRuleID: 10 });

  try {
    expect(within(editPanel).getByRole('button', { name: /repeat/i })).toBeInTheDocument();
    expect(within(editPanel).getByRole('button', { name: /project/i })).toBeInTheDocument();
    expect(within(editPanel).getByRole('button', { name: /tags/i })).toBeInTheDocument();
  } finally {
    restoreTouchEnvironment();
  }
});

test('desktop inline edit entry does not reposition the task list', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  const restoreRects = mockInlineEditRects();
  const editCard = await openInlineEditCard();

  try {
    expect(editCard).toBeInTheDocument();
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    await new Promise(resolve => window.setTimeout(resolve, 60));
    expect(taskList.scrollTop).toBe(0);
  } finally {
    restoreRects();
    restoreMedia();
  }
});

test('desktop inline edit keeps date start and end controls on one row without changing create selectors', () => {
  const css = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const editLayoutRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row\s*\{[^}]*\}/)?.[0] ?? '';
  const editSummaryRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__summary-row\s*\{[^}]*\}/)?.[0] ?? '';
  const editDateRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__date\s*\{[^}]*\}/)?.[0] ?? '';
  const editDateTextRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__date::\-webkit-datetime-edit\s*\{[^}]*\}/)?.[0] ?? '';
  const editTimeControlRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__time-control\s*\{[^}]*\}/)?.[0] ?? '';
  const editTimeSummaryRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__time-summary\s*\{[^}]*\}/)?.[0] ?? '';
  const editTimeTextRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__time-text\s*\{[^}]*\}/)?.[0] ?? '';
  const editExpandedRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__time\s*\{[^}]*\}/)?.[0] ?? '';
  const editActionsRule = css.match(/\.item__edit-card:not\(\.mobile-edit-panel\) \.datetime-row__editor-actions\s*\{[^}]*\}/)?.[0] ?? '';

  expect(editLayoutRule).toContain('display: grid');
  expect(editLayoutRule).toContain('grid-template-columns: minmax(0, 0.8fr) repeat(2, minmax(0, 1fr))');
  expect(editLayoutRule).toContain('max-width: 100%');
  expect(editSummaryRule).toContain('grid-column: 2 / 4');
  expect(editSummaryRule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  expect(editSummaryRule).toContain('min-width: 0');
  expect(editDateRule).toContain('text-align: center');
  expect(editDateTextRule).toContain('justify-content: center');
  expect(editTimeControlRule).toContain('min-width: 0');
  expect(editTimeControlRule).toContain('max-width: 100%');
  expect(editTimeSummaryRule).toContain('min-width: 0');
  expect(editTimeTextRule).toContain('overflow: hidden');
  expect(editTimeTextRule).toContain('text-overflow: ellipsis');
  expect(editExpandedRule).toContain('grid-template-columns: 2.4rem minmax(0, 1fr) auto minmax(0, 1fr) minmax(0, 1fr) auto');
  expect(editExpandedRule).toContain('max-width: 100%');
  expect(editActionsRule).toContain('grid-column: auto');
  expect(editActionsRule).toContain('justify-content: flex-end');
  expect(editActionsRule).toContain('justify-self: end');
  expect(editActionsRule).toContain('min-width: 0');
  expect(editActionsRule).toContain('max-width: 100%');
  expect(css).toContain('.app__add .datetime-row {');
  expect(css).toContain('grid-template-columns: 7.75rem minmax(7rem, 1fr) minmax(7rem, 1fr)');
  expect(css).not.toContain('datetime-row--desktop-single-row');
});

test('inline edit title first outside touchmove is prevented immediately after focus', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editCard = await openMobileEditPanel();

  try {
    const title = within(editCard).getByLabelText(/task title/i);
    if (!(title instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');
    await focusTextField(title);
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    expect(dispatchCancelableTouchMove(taskList)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('inline edit description first outside touchmove is prevented immediately after focus', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editCard = await openMobileEditPanel();

  try {
    const description = within(editCard).getByLabelText(/task description/i);
    if (!(description instanceof HTMLInputElement)) throw new Error('Mobile edit description input not found');
    await focusTextField(description);
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    expect(dispatchCancelableTouchMove(taskList)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('edit-entry reset does not clear the active text guard after focusin', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const editCard = await openMobileEditPanel();

  try {
    const title = within(editCard).getByLabelText(/task title/i);
    if (!(title instanceof HTMLInputElement)) throw new Error('Inline edit title input not found');
    await focusTextField(title);
    await act(async () => {
      document.dispatchEvent(new CustomEvent('task-manager:edit-entry-reset'));
    });
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');

    expect(dispatchCancelableTouchMove(taskList)).toBe(true);
  } finally {
    restoreTouchEnvironment();
  }
});

test('mobile text focus touch guard keeps debug logs gated', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  try {
    await focusTextField(getCreateTitleInput());
    const taskList = document.querySelector('.app__list');
    if (!(taskList instanceof HTMLElement)) throw new Error('Task list not found');
    expect(dispatchCancelableTouchMove(taskList)).toBe(true);
    expect(debug).not.toHaveBeenCalled();
  } finally {
    debug.mockRestore();
    restoreTouchEnvironment();
  }
});

test('mobile text focus touch guard does not block horizontal pager swipes when no text field is focused', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  render(<App />);
  expectMobilePage('Tasks');

  try {
    expect(dispatchCancelableTouchMove(mobilePager())).toBe(false);
    await act(async () => {
      swipeOn(mobilePager(), 320, 120);
    });

    expectMobilePage('Calendar');
  } finally {
    restoreTouchEnvironment();
  }
});

test('swipe starting inside a time dropdown does not change mobile view', async () => {
  render(<App />);
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: 'Add' }));
  });
  expectMobilePage('Add');

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  const firstTimeButton = document.querySelector('.time-select__btn');
  if (!(firstTimeButton instanceof HTMLElement)) throw new Error('Time selector button not found');
  await act(async () => {
    fireEvent.click(firstTimeButton);
  });
  const dropdown = document.querySelector('.time-select__dropdown');
  if (!(dropdown instanceof HTMLElement)) throw new Error('Time dropdown not found');

  await act(async () => {
    swipeOn(dropdown, 320, 120);
  });

  expectMobilePage('Add');
});

test('swipe starting on a calendar navigation button does not change mobile view', async () => {
  render(<App />);
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: 'Calendar' }));
  });
  expectMobilePage('Calendar');
  const calendarTodayButton = document.querySelector('.cal-today-btn');
  if (!(calendarTodayButton instanceof HTMLElement)) throw new Error('Calendar Today button not found');

  await act(async () => {
    swipeOn(calendarTodayButton, 120, 320);
  });

  expectMobilePage('Calendar');
});

test('swipe starting inside a task action menu does not change mobile view', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');
  expectMobilePage('Tasks');

  await openTaskActions();
  const menu = document.querySelector('.item__action-menu');
  if (!(menu instanceof HTMLElement)) throw new Error('Task action menu not found');

  await act(async () => {
    swipeOn(menu, 320, 120);
  });

  expectMobilePage('Tasks');
});

test('create task with start and end sends endDateTimeScheduled with priority project and tags', async () => {
  mockGetProjects.mockResolvedValue([{ projectID: 7, title: 'Home' }]);
  mockGetTags.mockResolvedValue([{ tagID: 8, title: 'Errand', color: '#22c55e' }]);
  mockCreateTask.mockResolvedValue({ ...sampleTask, taskID: 44, title: 'Full task' });
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  const createCard = document.querySelector('.app__add');
  if (!(createCard instanceof HTMLElement)) throw new Error('Create card not found');
  const createScope = within(createCard);

  await act(async () => {
    fireEvent.change(getCreateDateInput(), { target: { value: '2026-06-20' } });
  });
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /\+ start time/i }));
  });
  await setActiveEditorTime(createCard, '10', '00', 'AM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /\+ end time/i }));
  });
  await setActiveEditorTime(createCard, '11', '00', 'AM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /^priority$/i }));
  });
  await act(async () => {
    userEvent.click(createScope.getByText(/^High$/i));
  });
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /^project$/i }));
  });
  await act(async () => {
    userEvent.click(createScope.getByLabelText(/home/i));
  });
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /^tags$/i }));
  });
  await act(async () => {
    userEvent.click(createScope.getByLabelText(/errand/i));
  });
  userEvent.type(createScope.getByPlaceholderText(/task title/i), 'Full task');
  userEvent.click(createScope.getByRole('button', { name: /^add task$/i }));

  await waitFor(() => expect(mockCreateTask).toHaveBeenCalledTimes(1));
  expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Full task',
    dateTimeScheduled: expect.stringMatching(/^2026-06-20T\d{2}:\d{2}:00$/),
    endDateTimeScheduled: expect.stringMatching(/^2026-06-20T\d{2}:\d{2}:00$/),
    priority: 'HIGH',
    projectID: 7,
  }));
  await waitFor(() => expect(mockAddTagToTask).toHaveBeenCalledWith(44, 8));
});

test('create task blocks end time before start time', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  const createCard = document.querySelector('.app__add');
  if (!(createCard instanceof HTMLElement)) throw new Error('Create card not found');
  const createScope = within(createCard);

  await act(async () => {
    fireEvent.change(getCreateDateInput(), { target: { value: '2026-06-20' } });
    userEvent.type(createScope.getByPlaceholderText(/task title/i), 'Invalid range');
  });
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /\+ start time/i }));
  });
  await setActiveEditorTime(createCard, '09', '00', 'PM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
    userEvent.click(createScope.getByRole('button', { name: /\+ end time/i }));
  });
  await setActiveEditorTime(createCard, '08', '00', 'PM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
  });

  expect(createScope.getByText('End time must be after start time.')).toBeInTheDocument();
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /^add task$/i }));
  });
  expect(mockCreateTask).not.toHaveBeenCalled();
});

test('create task blocks end time equal to start time and clears when valid', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  const createCard = document.querySelector('.app__add');
  if (!(createCard instanceof HTMLElement)) throw new Error('Create card not found');
  const createScope = within(createCard);

  await act(async () => {
    fireEvent.change(getCreateDateInput(), { target: { value: '2026-06-20' } });
    userEvent.type(createScope.getByPlaceholderText(/task title/i), 'Equal range');
  });
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /\+ start time/i }));
  });
  await setActiveEditorTime(createCard, '09', '00', 'PM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
    userEvent.click(createScope.getByRole('button', { name: /\+ end time/i }));
  });
  await setActiveEditorTime(createCard, '09', '00', 'PM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
  });
  expect(createScope.getByText('End time must be after start time.')).toBeInTheDocument();
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /^add task$/i }));
  });
  expect(mockCreateTask).not.toHaveBeenCalled();

  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /end:\s*09:00 PM/i }));
  });
  await setActiveEditorTime(createCard, '10', '00', 'PM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
  });
  await waitFor(() => expect(createScope.queryByText('End time must be after start time.')).not.toBeInTheDocument());
});

test('create warning appears when start time changes after end time exists', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  const createCard = document.querySelector('.app__add');
  if (!(createCard instanceof HTMLElement)) throw new Error('Create card not found');
  const createScope = within(createCard);

  await act(async () => {
    fireEvent.change(getCreateDateInput(), { target: { value: '2026-06-20' } });
  });
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /\+ start time/i }));
  });
  await setActiveEditorTime(createCard, '09', '00', 'PM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
    userEvent.click(createScope.getByRole('button', { name: /\+ end time/i }));
  });
  await setActiveEditorTime(createCard, '10', '00', 'PM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
  });
  expect(createScope.queryByText('End time must be after start time.')).not.toBeInTheDocument();

  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /start:\s*09:00 PM/i }));
  });
  await setActiveEditorTime(createCard, '11', '00', 'PM');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
  });

  expect(createScope.getByText('End time must be after start time.')).toBeInTheDocument();
});

test('task tag chips keep user tag colors as accents instead of foreground text color', async () => {
  mockGetTasks.mockResolvedValue([{
    ...sampleTask,
    tags: [{ tagID: 9, title: 'Pale tag', color: '#fef3c7' }],
  }]);
  render(<App />);

  const tagChip = await screen.findByText('Pale tag');
  expect(tagChip).toHaveClass('item__tag-chip');
  expect(tagChip.style.getPropertyValue('--tag-color')).toBe('#fef3c7');
  expect(tagChip.style.color).toBe('');
});

test('project badges stay content-sized and wrap long names without stretching', () => {
  const appCss = readFileSync(`${process.cwd()}/src/App.css`, 'utf8');
  const calendarCss = readFileSync(`${process.cwd()}/src/components/Calendar.css`, 'utf8');
  const taskProjectRule = appCss.match(/\.item__project-chip\s*\{[^}]*\}/)?.[0] ?? '';
  const calendarProjectRule = calendarCss.match(/\.cal-item__project-chip\s*\{[^}]*\}/)?.[0] ?? '';

  for (const rule of [taskProjectRule, calendarProjectRule]) {
    expect(rule).toContain('display: inline-flex');
    expect(rule).toContain('width: fit-content');
    expect(rule).toContain('max-width: 100%');
    expect(rule).toContain('align-self: flex-start');
    expect(rule).toContain('white-space: normal');
    expect(rule).toContain('overflow-wrap: anywhere');
  }
});

test('editing a task with end time preserves endDateTimeScheduled and metadata', async () => {
  const taskWithEnd: Task = {
    ...sampleTask,
    taskID: 50,
    title: 'Timed task',
    dateTimeScheduled: '2026-06-20T09:15:00',
    endDateTimeScheduled: '2026-06-20T10:45:00',
    priority: 'HIGH',
    projectID: 7,
    tags: [{ tagID: 8, title: 'Errand', color: '#22c55e' }],
  };
  mockGetTasks.mockResolvedValue([taskWithEnd]);
  mockGetTask.mockResolvedValue(taskWithEnd);
  mockGetProjects.mockResolvedValue([{ projectID: 7, title: 'Home' }]);
  mockGetTags.mockResolvedValue([{ tagID: 8, title: 'Errand', color: '#22c55e' }]);
  render(<App />);
  await screen.findByText('Timed task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });
  expect(await screen.findByRole('button', { name: /^end:/i })).toHaveTextContent(/10:45 AM/i);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^save$/i }));
  });

  await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(50, expect.objectContaining({
    dateTimeScheduled: '2026-06-20T09:15:00',
    endDateTimeScheduled: '2026-06-20T10:45:00',
    priority: 'HIGH',
    projectID: 7,
  })));
  expect(mockAddTagToTask).not.toHaveBeenCalled();
  expect(mockRemoveTagFromTask).not.toHaveBeenCalled();
});

test('inline edit form hydrates and saves changed project and tags', async () => {
  const taskWithMetadata: Task = {
    ...sampleTask,
    taskID: 52,
    title: 'Metadata task',
    projectID: 7,
    tags: [{ tagID: 8, title: 'Errand', color: '#22c55e' }],
  };
  mockGetTasks.mockResolvedValue([taskWithMetadata]);
  mockGetTask.mockResolvedValue(taskWithMetadata);
  mockGetProjects.mockResolvedValue([
    { projectID: 7, title: 'Home' },
    { projectID: 12, title: 'Work' },
  ]);
  mockGetTags.mockResolvedValue([
    { tagID: 8, title: 'Errand', color: '#22c55e' },
    { tagID: 9, title: 'Focus', color: '#6366f1' },
  ]);
  render(<App />);
  await screen.findByText('Metadata task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  expect(editScope.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  expect(editScope.getByText('Errand')).toBeInTheDocument();

  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: 'Home' }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: 'Work' }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /1 tag/i }));
  });
  const tagDropdown = editCard.querySelector('.tag-select__dropdown');
  if (!(tagDropdown instanceof HTMLElement)) throw new Error('Tag dropdown not found');
  expect(tagDropdown).toBeVisible();
  expect(editCard.closest('.item')).toHaveClass('item--editing');
  const tagOptions = within(tagDropdown).getAllByRole('checkbox');
  await act(async () => {
    userEvent.click(tagOptions[0]);
    userEvent.click(tagOptions[1]);
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^save$/i }));
  });

  await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(52, expect.objectContaining({
    projectID: 12,
  })));
  expect(mockAddTagToTask).toHaveBeenCalledWith(52, 9);
  expect(mockRemoveTagFromTask).toHaveBeenCalledWith(52, 8);
});

test('desktop inline edit can change priority and save it', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  const editCard = await openInlineEditCard({ ...sampleTask, priority: 'LOW' });

  try {
    await act(async () => {
      userEvent.click(within(editCard).getByRole('button', { name: /^low$/i }));
    });
    await act(async () => {
      userEvent.click(within(editCard).getByRole('button', { name: /^medium$/i }));
    });
    await act(async () => {
      userEvent.click(within(editCard).getByRole('button', { name: /^save$/i }));
    });

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(1, expect.objectContaining({
      priority: 'MEDIUM',
    })));
  } finally {
    restoreMedia();
  }
});

test('inline edit can clear priority', async () => {
  const restoreMedia = mockDesktopMediaEnvironment();
  const editCard = await openInlineEditCard({ ...sampleTask, priority: 'HIGH' });

  try {
    await act(async () => {
      userEvent.click(within(editCard).getByRole('button', { name: /^high$/i }));
    });
    await act(async () => {
      userEvent.click(within(editCard).getByRole('button', { name: /remove priority/i }));
    });
    await act(async () => {
      userEvent.click(within(editCard).getByRole('button', { name: /^save$/i }));
    });

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(1, expect.objectContaining({
      priority: null,
    })));
  } finally {
    restoreMedia();
  }
});

test('inline edit uses compact start and end time summaries', async () => {
  const timedTask: Task = {
    ...sampleTask,
    taskID: 53,
    title: 'Compact timed task',
    dateTimeScheduled: '2026-06-20T21:40:00',
    endDateTimeScheduled: '2026-06-20T22:40:00',
  };
  mockGetTasks.mockResolvedValue([timedTask]);
  mockGetTask.mockResolvedValue(timedTask);
  render(<App />);
  await screen.findByText('Compact timed task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  const startSummary = editScope.getByRole('button', { name: /start:\s*09:40 PM/i });
  const endSummary = editScope.getByRole('button', { name: /end:\s*10:40 PM/i });
  expect(startSummary).toBeInTheDocument();
  expect(endSummary).toBeInTheDocument();
  expect(editCard.querySelector('.datetime-row__editor:empty')).toBeNull();

  await act(async () => {
    userEvent.click(endSummary);
  });
  expect(endSummary).toHaveClass('datetime-row__time-summary--active');
  expectOpenTimeEditor('End', editCard);

  await act(async () => {
    userEvent.click(endSummary);
  });
  expectNoOpenTimeEditor('End', editCard);
  expect(editCard.querySelector('.datetime-row__editor:empty')).toBeNull();
});

test('inline edit date input updates the edited task date without opening an empty editor block', async () => {
  const datedTask: Task = {
    ...sampleTask,
    taskID: 57,
    title: 'Date edit task',
    dateTimeScheduled: '2026-06-20T09:40:00',
  };
  mockGetTasks.mockResolvedValue([datedTask]);
  mockGetTask.mockResolvedValue(datedTask);
  render(<App />);
  await screen.findByText('Date edit task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const dateInput = editCard.querySelector('.datetime-row__date');
  if (!(dateInput instanceof HTMLInputElement)) throw new Error('Inline edit date input not found');
  expect(dateInput).toHaveAttribute('type', 'date');
  expect(editCard.querySelector('.datetime-row__editor:empty')).toBeNull();

  await act(async () => {
    fireEvent.change(dateInput, { target: { value: '2026-06-22' } });
  });
  await act(async () => {
    userEvent.click(within(editCard).getByRole('button', { name: /^save$/i }));
  });

  await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(57, expect.objectContaining({
    dateTimeScheduled: '2026-06-22T09:40:00',
  })));
});

test('inline edit end time can be changed and saved', async () => {
  const timedTask: Task = {
    ...sampleTask,
    taskID: 54,
    title: 'Change end task',
    dateTimeScheduled: '2026-06-20T21:40:00',
    endDateTimeScheduled: '2026-06-20T22:40:00',
  };
  mockGetTasks.mockResolvedValue([timedTask]);
  mockGetTask.mockResolvedValue(timedTask);
  render(<App />);
  await screen.findByText('Change end task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /end:\s*10:40 PM/i }));
  });
  const editor = editCard.querySelector('.datetime-row__editor');
  if (!(editor instanceof HTMLElement)) throw new Error('Time editor not found');
  const editorScope = within(editor);
  await act(async () => {
    userEvent.click(editorScope.getByRole('button', { name: '10' }));
  });
  await act(async () => {
    userEvent.click(editorScope.getByRole('button', { name: '11' }));
  });
  await act(async () => {
    userEvent.click(editorScope.getByRole('button', { name: /done/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^save$/i }));
  });

  await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(54, expect.objectContaining({
    endDateTimeScheduled: '2026-06-20T23:40:00',
  })));
});

test('inline edit hydrates existing recurrence', async () => {
  const recurringTask: Task = {
    ...sampleTask,
    taskID: 60,
    title: 'Recurring edit task',
    recurrenceRuleID: 10,
  };
  mockGetTasks.mockResolvedValue([recurringTask]);
  mockGetTask.mockResolvedValue(recurringTask);
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'weekly',
    timesOfRecurrence: 0,
    startDateTime: '2026-01-01T00:00:00',
    endDateTime: '2036-01-01T00:00:00',
  });
  render(<App />);
  await screen.findByText('Recurring edit task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  await waitFor(() => expect(within(editCard).getByRole('button', { name: /repeat.*weekly/i })).toBeInTheDocument());
});

test('inline edit can change recurrence', async () => {
  const recurringTask: Task = {
    ...sampleTask,
    taskID: 61,
    title: 'Change recurrence task',
    recurrenceRuleID: 10,
  };
  mockGetTasks.mockResolvedValue([recurringTask]);
  mockGetTask.mockResolvedValue(recurringTask);
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'weekly',
    timesOfRecurrence: 0,
    startDateTime: '2026-01-01T00:00:00',
    endDateTime: '2036-01-01T00:00:00',
  });
  render(<App />);
  await screen.findByText('Change recurrence task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  await waitFor(() => expect(editScope.getByRole('button', { name: /repeat.*weekly/i })).toBeInTheDocument());
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /repeat.*weekly/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('menuitem', { name: /^monthly$/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^save$/i }));
  });

  await waitFor(() => expect(mockSetRepeat).toHaveBeenCalledWith(61, 'monthly'));
});

test('inline edit can remove recurrence', async () => {
  const recurringTask: Task = {
    ...sampleTask,
    taskID: 62,
    title: 'Remove recurrence task',
    recurrenceRuleID: 10,
  };
  mockGetTasks.mockResolvedValue([recurringTask]);
  mockGetTask.mockResolvedValue(recurringTask);
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'daily',
    timesOfRecurrence: 0,
    startDateTime: '2026-01-01T00:00:00',
    endDateTime: '2036-01-01T00:00:00',
  });
  render(<App />);
  await screen.findByText('Remove recurrence task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  await waitFor(() => expect(editScope.getByRole('button', { name: /repeat.*daily/i })).toBeInTheDocument());
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /repeat.*daily/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('menuitem', { name: /do not repeat/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^save$/i }));
  });

  await waitFor(() => expect(mockSetRepeat).toHaveBeenCalledWith(62, null));
});

test('edit task blocks end time before start time', async () => {
  const timedTask: Task = {
    ...sampleTask,
    taskID: 58,
    title: 'Invalid edit range',
    dateTimeScheduled: '2026-06-20T21:40:00',
    endDateTimeScheduled: '2026-06-20T22:40:00',
  };
  mockGetTasks.mockResolvedValue([timedTask]);
  mockGetTask.mockResolvedValue(timedTask);
  render(<App />);
  await screen.findByText('Invalid edit range');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /end:\s*10:40 PM/i }));
  });
  await setActiveEditorTime(editCard, '08', '00', 'PM');
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /done/i }));
  });

  expect(editScope.getByText('End time must be after start time.')).toBeInTheDocument();
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^save$/i }));
  });
  expect(mockUpdateTask).not.toHaveBeenCalled();
});

test('edit warning clears when end time is removed', async () => {
  const timedTask: Task = {
    ...sampleTask,
    taskID: 59,
    title: 'Remove invalid end',
    dateTimeScheduled: '2026-06-20T21:40:00',
    endDateTimeScheduled: '2026-06-20T22:40:00',
  };
  mockGetTasks.mockResolvedValue([timedTask]);
  mockGetTask.mockResolvedValue(timedTask);
  render(<App />);
  await screen.findByText('Remove invalid end');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /end:\s*10:40 PM/i }));
  });
  await setActiveEditorTime(editCard, '08', '00', 'PM');
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /done/i }));
  });
  expect(editScope.getByText('End time must be after start time.')).toBeInTheDocument();

  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /end:\s*08:00 PM/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /clear time/i }));
  });
  expect(editScope.queryByText('End time must be after start time.')).not.toBeInTheDocument();
});

test('24-hour create validation still blocks end time before start time', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  await act(async () => { openSettings(); });
  await act(async () => { userEvent.click(screen.getByRole('button', { name: /24-hour/i })); });
  const createCard = document.querySelector('.app__add');
  if (!(createCard instanceof HTMLElement)) throw new Error('Create card not found');
  const createScope = within(createCard);

  await act(async () => {
    fireEvent.change(getCreateDateInput(), { target: { value: '2026-06-20' } });
    userEvent.type(createScope.getByPlaceholderText(/task title/i), 'Invalid 24 hour range');
  });
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /\+ start time/i }));
  });
  await setActiveEditorTime(createCard, '21', '00');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
    userEvent.click(createScope.getByRole('button', { name: /\+ end time/i }));
  });
  await setActiveEditorTime(createCard, '20', '00');
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /done/i }));
  });

  expect(createScope.getByText('End time must be after start time.')).toBeInTheDocument();
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /^add task$/i }));
  });
  expect(mockCreateTask).not.toHaveBeenCalled();
});

test('creating a new project from inline edit applies it on save', async () => {
  const task: Task = { ...sampleTask, taskID: 55, title: 'New project task' };
  mockGetTasks.mockResolvedValue([task]);
  mockGetTask.mockResolvedValue(task);
  mockCreateProject.mockResolvedValue({ projectID: 13, title: 'Office' });
  render(<App />);
  await screen.findByText('New project task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^project$/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /\+ new project/i }));
  });
  await act(async () => {
    userEvent.type(editScope.getByLabelText(/project name/i), 'Office');
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^create$/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^save$/i }));
  });

  expect(mockCreateProject).toHaveBeenCalledWith({ title: 'Office' });
  await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(55, expect.objectContaining({
    projectID: 13,
  })));
});

test('creating a new tag from inline edit applies it on save', async () => {
  const task: Task = { ...sampleTask, taskID: 56, title: 'New tag task', tags: [] };
  mockGetTasks.mockResolvedValue([task]);
  mockGetTask.mockResolvedValue(task);
  mockCreateTag.mockResolvedValue({ tagID: 14, title: 'Deep Work', color: '#6366f1' });
  render(<App />);
  await screen.findByText('New tag task');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^tags$/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /\+ new tag/i }));
  });
  await act(async () => {
    userEvent.type(editScope.getByLabelText(/tag name/i), 'Deep Work');
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^create$/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /^save$/i }));
  });

  expect(mockCreateTag).toHaveBeenCalledWith({ title: 'Deep Work', color: '#6366f1' });
  await waitFor(() => expect(mockAddTagToTask).toHaveBeenCalledWith(56, 14));
});

test('editing a task and clearing end time sends null endDateTimeScheduled', async () => {
  const taskWithEnd: Task = {
    ...sampleTask,
    taskID: 51,
    title: 'Clear end',
    dateTimeScheduled: '2026-06-20T09:15:00',
    endDateTimeScheduled: '2026-06-20T10:45:00',
  };
  mockGetTasks.mockResolvedValue([taskWithEnd]);
  mockGetTask.mockResolvedValue(taskWithEnd);
  render(<App />);
  await screen.findByText('Clear end');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });
  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Inline edit card not found');
  const editScope = within(editCard);
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /end:\s*10:45 AM/i }));
  });
  await act(async () => {
    userEvent.click(editScope.getByRole('button', { name: /clear time/i }));
  });
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^save$/i }));
  });

  await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith(51, expect.objectContaining({
    endDateTimeScheduled: null,
  })));
});

test('existing task without end time still opens edit without an end summary', async () => {
  mockGetTasks.mockResolvedValue([scheduledTask]);
  mockGetTask.mockResolvedValue(scheduledTask);
  render(<App />);
  await screen.findByText('Dentist appointment');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  const editCard = document.querySelector('.item__edit-card');
  if (!(editCard instanceof HTMLElement)) throw new Error('Edit card not found');
  expect(within(editCard).queryByRole('button', { name: /^end:/i })).not.toBeInTheDocument();
  expect(within(editCard).getByRole('button', { name: /\+ end time/i })).toBeInTheDocument();
});

// Edge-case behavior.

test('clicking Add with empty title does NOT call createTask', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));

  expect(mockCreateTask).not.toHaveBeenCalled();
});

test('clicking Add with whitespace-only title does NOT call createTask', async () => {
  render(<App />);
  userEvent.type(screen.getByPlaceholderText(/task title/i), '   ');
  userEvent.click(screen.getByRole('button', { name: /^add task$/i }));

  expect(mockCreateTask).not.toHaveBeenCalled();
});

test('getTasks rejection shows error banner and renders app', async () => {
  mockGetTasks.mockRejectedValue(new Error('Network error'));
  render(<App />);
  // Wait for error to appear in the banner
  expect(await screen.findByText(/failed to load tasks/i)).toBeInTheDocument();
  expect(screen.getAllByText(/0 tasks/i).length).toBeGreaterThanOrEqual(1);
});

test('createTask rejection shows error banner, list unchanged', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  mockCreateTask.mockRejectedValue(new Error('Server error'));
  const input = screen.getByPlaceholderText(/task title/i) as HTMLInputElement;

  userEvent.type(input, 'Failing task');
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^add task$/i }));
  });

  await waitFor(() => expect(mockCreateTask).toHaveBeenCalled());
  expect(await screen.findByText(/failed to create task/i)).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: /task list/i })).queryByText('Failing task')).not.toBeInTheDocument();
  expect(screen.getAllByText(/0 tasks/i).length).toBeGreaterThanOrEqual(1);
});

test('deleteTask rejection shows error banner — task remains in list', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  mockDeleteTask.mockRejectedValue(new Error('Delete failed'));
  render(<App />);

  await screen.findByText('Buy milk');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
  });
  const confirmBtn = await screen.findByRole('button', { name: /^delete$/i });
  await act(async () => { userEvent.click(confirmBtn); });

  await waitFor(() => expect(mockDeleteTask).toHaveBeenCalled());
  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(await screen.findByText(/failed to delete task/i)).toBeInTheDocument();
});

// Stats modal behavior.

test('Stats button is rendered in the header', async () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /stats/i })).toBeInTheDocument();
});

test('clicking Stats button opens the stats modal', async () => {
  render(<App />);
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /stats/i }));
  });
  expect(await screen.findByRole('dialog', { name: /stats/i })).toBeInTheDocument();
  const heading = await screen.findByRole('heading', { name: /stats/i });
  expect(heading).toBeInTheDocument();
  // Scope queries to the modal to avoid matching filter buttons with same text
  const modal = heading.closest('.modal') as HTMLElement;
  expect(within(modal).getByText(/total/i)).toBeInTheDocument();
  expect(within(modal).getAllByText(/^done$/i).length).toBeGreaterThanOrEqual(1);
  expect(within(modal).getByText(/active/i)).toBeInTheDocument();
});

test('closing the stats modal removes it from the DOM', async () => {
  render(<App />);
  const statsButton = screen.getByRole('button', { name: /stats/i });
  await act(async () => {
    userEvent.click(statsButton);
  });
  await screen.findByRole('heading', { name: /stats/i });
  const closeBtn = screen.getByRole('button', { name: /close stats/i });
  expect(closeBtn).toHaveFocus();
  await act(async () => { userEvent.click(closeBtn); });
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: /stats/i })).not.toBeInTheDocument();
  });
  expect(statsButton).toHaveFocus();
});

test('Settings trigger exposes popover state and controls', async () => {
  render(<App />);
  const settingsButton = screen.getByRole('button', { name: /settings/i });

  expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
  expect(settingsButton).toHaveAttribute('aria-controls', 'task-card-settings-panel');

  await act(async () => {
    userEvent.click(settingsButton);
  });

  expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('region', { name: /settings/i })).toHaveAttribute('id', 'task-card-settings-panel');
});

// Task move behavior.

test('Board tab is not rendered in the view tabs', async () => {
  render(<App />);
  expect(screen.queryByRole('button', { name: /^board$/i })).not.toBeInTheDocument();
});

test('opening the task move menu shows alternate statuses', async () => {
  mockGetTasks.mockResolvedValue([{ ...sampleTask, statusID: null }]);
  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    fireEvent.contextMenu(screen.getByText('Buy milk'));
  });

  expect(screen.getByRole('dialog', { name: /move task buy milk/i })).toBeInTheDocument();
  expect(screen.getByText('Move task')).toBeInTheDocument();
  expect(screen.getByText('In Progress')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /in progress/i })).toHaveFocus();
  expect(screen.getAllByText(/^done$/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.queryByRole('button', { name: /^active$/i })).not.toBeInTheDocument();
});

test('Escape closes settings without closing the task detail panel', async () => {
  const restoreTouchEnvironment = mockMobileTouchEnvironment();
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');

  try {
    await act(async () => {
      userEvent.click(screen.getByText('Buy milk'));
    });
    expect(await screen.findByRole('button', { name: /close task details/i })).toBeInTheDocument();

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: /settings/i }));
    });
    expect(screen.getByRole('region', { name: /settings/i })).toBeInTheDocument();

    await act(async () => {
      userEvent.keyboard('{Escape}');
    });

    expect(screen.queryByRole('region', { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close task details/i })).toBeInTheDocument();
  } finally {
    restoreTouchEnvironment();
  }
});

test('task move menu updates status', async () => {
  mockGetTasks.mockResolvedValue([{ ...sampleTask, statusID: null }]);
  mockPatchStatus.mockResolvedValue({ ...sampleTask, statusID: 3 });
  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    fireEvent.contextMenu(screen.getByText('Buy milk'));
  });

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /in progress/i }));
  });

  await waitFor(() => {
    expect(mockPatchStatus).toHaveBeenCalledWith(sampleTask.taskID, 3);
  });
});

// Task duplication behavior.

test('task action menu shows edit, copy, and delete actions', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');

  await openTaskActions();

  expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /copy/i })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
});

test('clicking edit opens an inline task edit card', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /edit/i }));
  });

  expect(screen.getByDisplayValue('Buy milk')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
});

test('clicking duplicate calls createTask with " (copy)" appended to the title', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  const copy = { ...sampleTask, taskID: 99, title: 'Buy milk (copy)' };
  mockCreateTask.mockResolvedValue(copy);
  render(<App />);
  await screen.findByText('Buy milk');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /copy/i }));
  });

  await waitFor(() => {
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Buy milk (copy)' })
    );
  });
});

test('clicking duplicate increments copy suffix when duplicating a copy', async () => {
  const copiedTask: Task = { ...sampleTask, taskID: 2, title: 'Buy milk (copy)' };
  mockGetTasks.mockResolvedValue([sampleTask, copiedTask]);
  mockCreateTask.mockResolvedValue({ ...sampleTask, taskID: 99, title: 'Buy milk (copy 2)' });

  render(<App />);
  await screen.findByText('Buy milk (copy)');

  const copiedItem = screen.getByText('Buy milk (copy)').closest('li');
  expect(copiedItem).not.toBeNull();

  await openTaskActions(copiedItem as HTMLElement);
  await act(async () => {
    userEvent.click(within(copiedItem as HTMLElement).getByRole('menuitem', { name: /copy/i }));
  });

  await waitFor(() => {
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Buy milk (copy 2)' })
    );
  });
});

test('clicking duplicate reuses the lowest missing copy suffix', async () => {
  const copiedTask: Task = { ...sampleTask, taskID: 2, title: 'Buy milk (copy 2)' };
  mockGetTasks.mockResolvedValue([sampleTask, copiedTask]);
  mockCreateTask.mockResolvedValue({ ...sampleTask, taskID: 99, title: 'Buy milk (copy)' });

  render(<App />);
  await screen.findByText('Buy milk (copy 2)');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /copy/i }));
  });

  await waitFor(() => {
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Buy milk (copy)' })
    );
  });
});

test('clicking duplicate carries over the recurrence rule', async () => {
  const recurringTask: Task = { ...sampleTask, recurrenceRuleID: 10 };
  const copy = { ...recurringTask, taskID: 99, title: 'Buy milk (copy)', recurrenceRuleID: null };
  mockGetTasks.mockResolvedValue([recurringTask]);
  mockCreateTask.mockResolvedValue(copy);
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'monthly',
    timesOfRecurrence: 0,
    startDateTime: '2026-01-01T00:00:00',
    endDateTime: '2036-01-01T00:00:00',
  });
  mockSetRepeat.mockResolvedValue({ ...copy, recurrenceRuleID: 12 });

  render(<App />);
  await screen.findByText('Buy milk');

  await openTaskActions();
  await act(async () => {
    userEvent.click(screen.getByRole('menuitem', { name: /copy/i }));
  });

  await waitFor(() => {
    expect(mockGetRecurrence).toHaveBeenCalledWith(1);
    expect(mockSetRepeat).toHaveBeenCalledWith(99, 'monthly');
  });
});

test('completing a recurring task with end time creates the next occurrence with matching duration', async () => {
  const recurringTask: Task = {
    ...sampleTask,
    recurrenceRuleID: 10,
    dateTimeScheduled: '2026-06-15T14:30:00',
    endDateTimeScheduled: '2026-06-15T15:30:00',
  };
  mockGetTasks.mockResolvedValue([recurringTask]);
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'weekly',
    timesOfRecurrence: 0,
    startDateTime: '2026-06-15T14:30:00',
    endDateTime: '2036-06-15T14:30:00',
  });
  mockCreateTask.mockResolvedValue({ ...recurringTask, taskID: 99, recurrenceRuleID: null });
  mockGetTask.mockResolvedValue({ ...recurringTask, taskID: 99, recurrenceRuleID: 12 });

  render(<App />);
  await screen.findByText('Buy milk');

  const statusCheckbox = screen.getByTitle(/mark as done/i);
  await act(async () => {
    userEvent.click(statusCheckbox);
  });

  await waitFor(() => expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
    dateTimeScheduled: '2026-06-22T14:30:00',
    endDateTimeScheduled: '2026-06-22T15:30:00',
  })));
  expect(mockSetRepeat).toHaveBeenCalledWith(99, 'weekly');
});

// Bulk action behavior.

test('"Select" button is rendered in the task count row', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: /^select$/i })).toBeInTheDocument();
});

test('clicking Select shows Cancel button', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
});

test('clicking Cancel exits bulk mode', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /cancel/i }));
  });
  expect(screen.getByRole('button', { name: /^select$/i })).toBeInTheDocument();
});

test('bulk action bar is not visible until a task is selected', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  // Bar only appears after selecting something
  expect(screen.queryByText(/1 selected/i)).not.toBeInTheDocument();
});

test('selecting a task shows the bulk action bar', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  // Click the bulk checkbox for the task
  // The bulk-select checkbox renders first in the DOM (before the status checkbox)
  const checkboxes = screen.getAllByRole('checkbox');
  await act(async () => { userEvent.click(checkboxes[0]); });
  expect(await screen.findByText(/1 selected/i)).toBeInTheDocument();
});

test('"Mark done" in bulk bar calls patchTaskStatus for each selected task', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  mockPatchStatus.mockResolvedValue({ ...sampleTask, statusID: 2 });
  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  const checkboxes = screen.getAllByRole('checkbox');
  await act(async () => { userEvent.click(checkboxes[0]); });
  await screen.findByText(/1 selected/i);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /mark done/i }));
  });

  await waitFor(() => {
    expect(mockPatchStatus).toHaveBeenCalledWith(sampleTask.taskID, 2);
  });
});

test('bulk mark done on a recurring task generates the next occurrence', async () => {
  const recurringTask: Task = {
    ...sampleTask,
    recurrenceRuleID: 10,
    dateTimeScheduled: '2099-06-15T14:30:00',
    endDateTimeScheduled: '2099-06-15T15:30:00',
    priority: 'HIGH',
    projectID: 8,
    tags: [{ tagID: 4, title: 'Focus', color: '#22c55e' }],
  };
  const nextOccurrence: Task = {
    ...recurringTask,
    taskID: 99,
    recurrenceRuleID: 12,
    dateTimeScheduled: '2099-06-22T14:30:00',
    endDateTimeScheduled: '2099-06-22T15:30:00',
  };
  mockGetTasks
    .mockResolvedValueOnce([recurringTask])
    .mockResolvedValueOnce([nextOccurrence]);
  mockGetTask.mockImplementation(async id => id === recurringTask.taskID
    ? recurringTask
    : nextOccurrence);
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'weekly',
    timesOfRecurrence: 0,
    startDateTime: '2099-06-15T14:30:00',
    endDateTime: '2109-06-15T14:30:00',
  });
  mockCreateTask.mockResolvedValue({ ...recurringTask, taskID: 99, recurrenceRuleID: null, tags: [] });

  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  const checkboxes = screen.getAllByRole('checkbox');
  await act(async () => { userEvent.click(checkboxes[0]); });
  await screen.findByText(/1 selected/i);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /mark done/i }));
  });

  await waitFor(() => {
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      title: recurringTask.title,
      description: recurringTask.description,
      priority: recurringTask.priority,
      projectID: recurringTask.projectID,
      dateTimeScheduled: '2099-06-22T14:30:00',
      endDateTimeScheduled: '2099-06-22T15:30:00',
    }));
  });
  expect(mockAddTagToTask).toHaveBeenCalledWith(99, 4);
  expect(mockSetRepeat).toHaveBeenCalledWith(99, 'weekly');
  expect(mockDeleteTask).toHaveBeenCalledWith(recurringTask.taskID);
  expect(mockPatchStatus).not.toHaveBeenCalled();
  expect(await screen.findByText(/06\/22\/2099/)).toBeInTheDocument();
});

test('bulk mark done on mixed recurring and non-recurring tasks handles both paths', async () => {
  const recurringTask: Task = {
    ...sampleTask,
    taskID: 1,
    title: 'Recurring task',
    statusID: 3,
    recurrenceRuleID: 10,
    dateTimeScheduled: '2099-06-15T09:00:00',
  };
  const oneTimeTask: Task = {
    ...sampleTask,
    taskID: 2,
    title: 'One-time task',
    recurrenceRuleID: null,
  };
  const nextOccurrence: Task = {
    ...recurringTask,
    taskID: 99,
    recurrenceRuleID: 12,
    dateTimeScheduled: '2099-06-16T09:00:00',
  };
  mockGetTasks
    .mockResolvedValueOnce([recurringTask, oneTimeTask])
    .mockResolvedValueOnce([{ ...oneTimeTask, statusID: 2 }, nextOccurrence]);
  mockGetTask.mockImplementation(async id => {
    if (id === recurringTask.taskID) return recurringTask;
    if (id === oneTimeTask.taskID) return oneTimeTask;
    return nextOccurrence;
  });
  mockPatchStatus.mockResolvedValue({ ...oneTimeTask, statusID: 2 });
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'daily',
    timesOfRecurrence: 0,
    startDateTime: '2099-06-15T09:00:00',
    endDateTime: '2109-06-15T09:00:00',
  });
  mockCreateTask.mockResolvedValue({ ...recurringTask, taskID: 99, recurrenceRuleID: null });

  render(<App />);
  await screen.findByText('Recurring task');
  await screen.findByText('One-time task');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  const checkboxes = screen.getAllByRole('checkbox');
  await act(async () => {
    userEvent.click(checkboxes[0]);
    userEvent.click(checkboxes[1]);
  });
  await screen.findByText(/2 selected/i);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /mark done/i }));
  });

  await waitFor(() => {
    expect(mockPatchStatus).toHaveBeenCalledWith(oneTimeTask.taskID, 2);
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      title: recurringTask.title,
      dateTimeScheduled: '2099-06-16T09:00:00',
    }));
  });
  expect(mockSetRepeat).toHaveBeenCalledWith(99, 'daily');
  expect(mockDeleteTask).toHaveBeenCalledWith(recurringTask.taskID);
  expect(mockPatchStatus).not.toHaveBeenCalledWith(recurringTask.taskID, 2);
  expect(await screen.findByText(/06\/16\/2099/)).toBeInTheDocument();
});

test('completed recurring task checkbox toggles back to active without generating a next occurrence', async () => {
  const completedRecurringTask: Task = {
    ...sampleTask,
    recurrenceRuleID: 10,
    statusID: 2,
    dateTimeScheduled: '2099-06-15T09:00:00',
  };
  mockGetTasks.mockResolvedValue([completedRecurringTask]);
  mockPatchStatus.mockResolvedValue({ ...completedRecurringTask, statusID: null });

  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByTitle(/mark as active/i));
  });

  await waitFor(() => {
    expect(mockPatchStatus).toHaveBeenCalledWith(completedRecurringTask.taskID, null);
  });
  expect(mockGetRecurrence).not.toHaveBeenCalled();
  expect(mockCreateTask).not.toHaveBeenCalled();
  expect(mockDeleteTask).not.toHaveBeenCalled();
});

test('bulk mark done probes recurrence when selected task data has no recurrenceRuleID', async () => {
  const listTaskWithoutRuleId: Task = {
    ...sampleTask,
    recurrenceRuleID: undefined,
    dateTimeScheduled: '2099-06-15T14:30:00',
  };
  const nextOccurrence: Task = {
    ...listTaskWithoutRuleId,
    taskID: 99,
    recurrenceRuleID: 12,
    dateTimeScheduled: '2099-06-22T14:30:00',
  };
  mockGetTasks
    .mockResolvedValueOnce([listTaskWithoutRuleId])
    .mockResolvedValueOnce([nextOccurrence]);
  mockGetTask.mockImplementation(async id => id === listTaskWithoutRuleId.taskID
    ? listTaskWithoutRuleId
    : nextOccurrence);
  mockGetRecurrence.mockResolvedValue({
    recurrenceRuleID: 10,
    frequency: 'weekly',
    timesOfRecurrence: 0,
    startDateTime: '2099-06-15T14:30:00',
    endDateTime: '2109-06-15T14:30:00',
  });
  mockCreateTask.mockResolvedValue({ ...listTaskWithoutRuleId, taskID: 99, recurrenceRuleID: null });

  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  const checkboxes = screen.getAllByRole('checkbox');
  await act(async () => { userEvent.click(checkboxes[0]); });
  await screen.findByText(/1 selected/i);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /mark done/i }));
  });

  await waitFor(() => {
    expect(mockGetRecurrence).toHaveBeenCalledWith(listTaskWithoutRuleId.taskID);
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      dateTimeScheduled: '2099-06-22T14:30:00',
    }));
  });
  expect(mockPatchStatus).not.toHaveBeenCalledWith(listTaskWithoutRuleId.taskID, 2);
});

test('"Delete" in bulk bar calls deleteTask for each selected task', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^select$/i }));
  });
  const checkboxes = screen.getAllByRole('checkbox');
  await act(async () => { userEvent.click(checkboxes[0]); });
  await screen.findByText(/1 selected/i);

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
  });

  await waitFor(() => {
    expect(mockDeleteTask).toHaveBeenCalledWith(sampleTask.taskID);
  });
});

// Search field.

test('search input has a concise placeholder', async () => {
  render(<App />);
  const searchInput = screen.getByPlaceholderText(/search tasks/i);
  expect(searchInput).toBeInTheDocument();
});
