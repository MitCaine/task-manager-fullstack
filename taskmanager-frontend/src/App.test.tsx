import { render, screen, waitFor, act, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import {
  getTasks, getTask, createTask, updateTask, deleteTask, patchTaskStatus,
  getProjects, getTags, getRecurrence, setRepeat, addTagToTask, removeTagFromTask,
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
const mockGetTags        = getTags        as jest.MockedFunction<typeof getTags>;
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
};

const scheduledTask: Task = {
  taskID: 2,
  title: 'Dentist appointment',
  description: '',
  dateTimeScheduled: '2026-06-15T14:30:00',
};

beforeEach(() => {
  mockGetTasks.mockResolvedValue([]);
  mockGetTask.mockImplementation(async id => ({ ...sampleTask, taskID: id }));
  mockCreateTask.mockResolvedValue(sampleTask);
  mockUpdateTask.mockImplementation(async (id, task) => ({ ...task, taskID: id } as Task));
  mockDeleteTask.mockResolvedValue(undefined);
  mockPatchStatus.mockResolvedValue(sampleTask);
  mockGetProjects.mockResolvedValue([]);
  mockGetTags.mockResolvedValue([]);
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

test('shows task titles after loading', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  expect(await screen.findByText('Buy milk')).toBeInTheDocument();
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
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();
});

test('end time editor opens in one tap when start time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ end time/i }));
  });

  expect(screen.queryByText(/^Start:$/)).not.toBeInTheDocument();
  expect(screen.getByText(/^End:$/)).toBeInTheDocument();
});

test('start time editor opens in one tap when end time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ End time/i));
  });
  expect(screen.getByText(/^End:$/)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ start time/i }));
  });

  expect(screen.queryByText(/^End:$/)).not.toBeInTheDocument();
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();
});

test('tapping the active start time summary toggles the editor closed', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^start:/i }));
  });

  expect(screen.queryByText(/^Start:$/)).not.toBeInTheDocument();
});

test('priority opens in one tap when start time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });

  expect(screen.queryByText(/^Start:$/)).not.toBeInTheDocument();
  expect(screen.getByText(/remove priority/i)).toBeInTheDocument();
});

test('project opens in one tap when start time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^project$/i }));
  });

  expect(screen.queryByText(/^Start:$/)).not.toBeInTheDocument();
  expect(screen.getByText(/\+ new project/i)).toBeInTheDocument();
});

test('tags opens in one tap when start time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^tags$/i }));
  });

  expect(screen.queryByText(/^Start:$/)).not.toBeInTheDocument();
  expect(screen.getByText(/\+ new tag/i)).toBeInTheDocument();
});

test('priority opens in one tap when end time editor is open', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ End time/i));
  });
  expect(screen.getByText(/^End:$/)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^priority$/i }));
  });

  expect(screen.queryByText(/^End:$/)).not.toBeInTheDocument();
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

test('start time editor closes when clicking the create title input', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();

  await act(async () => {
    userEvent.click(screen.getByPlaceholderText(/task title/i));
  });

  expect(screen.queryByText(/^Start:$/)).not.toBeInTheDocument();
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
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();
});

test('end time editor opens from date in one tap', async () => {
  render(<App />);

  await openCreateDateInput();

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /\+ end time/i }));
  });

  expect(getCreateDateInput()).not.toHaveAttribute('data-open');
  expect(screen.getByText(/^End:$/)).toBeInTheDocument();
});

test('date opens from start time editor in one tap', async () => {
  render(<App />);

  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();

  await openCreateDateInput();

  expect(screen.queryByText(/^Start:$/)).not.toBeInTheDocument();
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

  expect(screen.getByText(/^Start:$/)).toBeInTheDocument();
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
  await act(async () => {
    userEvent.click(createScope.getByRole('button', { name: /\+ end time/i }));
  });
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
  await act(async () => {
    userEvent.click(await screen.findByRole('button', { name: /clear end time/i }));
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
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');

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
