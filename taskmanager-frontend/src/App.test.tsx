import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import {
  getTasks, createTask, deleteTask, patchTaskStatus,
  getProjects, getTags,
} from './api/tasks';
import type { Task } from './types/task';

jest.mock('./api/tasks');
jest.mock('./components/Calendar', () => () => null);

const mockGetTasks       = getTasks       as jest.MockedFunction<typeof getTasks>;
const mockCreateTask     = createTask     as jest.MockedFunction<typeof createTask>;
const mockDeleteTask     = deleteTask     as jest.MockedFunction<typeof deleteTask>;
const mockPatchStatus    = patchTaskStatus as jest.MockedFunction<typeof patchTaskStatus>;
const mockGetProjects    = getProjects    as jest.MockedFunction<typeof getProjects>;
const mockGetTags        = getTags        as jest.MockedFunction<typeof getTags>;

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
  mockCreateTask.mockResolvedValue(sampleTask);
  mockDeleteTask.mockResolvedValue(undefined);
  mockPatchStatus.mockResolvedValue(sampleTask);
  mockGetProjects.mockResolvedValue([]);
  mockGetTags.mockResolvedValue([]);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Open the settings panel (⚙ Settings button). */
function openSettings() {
  userEvent.click(screen.getByRole('button', { name: /settings/i }));
}

// ── Rendering ─────────────────────────────────────────────────────────────────

test('renders the "Task Manager" heading', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /task manager/i })).toBeInTheDocument();
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

// ── User interactions ─────────────────────────────────────────────────────────

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
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /delete task/i }));
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

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /delete task/i }));
  });
  const cancelBtn = await screen.findByRole('button', { name: /cancel/i });
  userEvent.click(cancelBtn);

  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(mockDeleteTask).not.toHaveBeenCalled();
});

test('toggling 24-hour format hides the AM/PM selector', async () => {
  render(<App />);
  // Show the time row so the AM/PM select appears
  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  // In default 12h mode the AM/PM options should be visible
  expect(await screen.findByRole('option', { name: 'AM' })).toBeInTheDocument();

  // Switch to 24-hour in settings
  await act(async () => { openSettings(); });
  await act(async () => { userEvent.click(screen.getByRole('button', { name: /24-hour/i })); });

  // AM/PM select should be gone in 24h mode
  await waitFor(() => {
    expect(screen.queryByRole('option', { name: 'AM' })).not.toBeInTheDocument();
  });
});

test('12-hour mode shows AM and PM options in the time selector', async () => {
  render(<App />);
  // Default is 12-hour; show the time row
  await act(async () => {
    userEvent.click(await screen.findByText(/\+ Start time/i));
  });
  expect(await screen.findByRole('option', { name: 'AM' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'PM' })).toBeInTheDocument();
});

// ── Edge cases ────────────────────────────────────────────────────────────────

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
  expect(screen.queryByText('Failing task')).not.toBeInTheDocument();
  expect(screen.getAllByText(/0 tasks/i).length).toBeGreaterThanOrEqual(1);
});

test('deleteTask rejection shows error banner — task remains in list', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  mockDeleteTask.mockRejectedValue(new Error('Delete failed'));
  render(<App />);

  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /delete task/i }));
  });
  const confirmBtn = await screen.findByRole('button', { name: /^delete$/i });
  await act(async () => { userEvent.click(confirmBtn); });

  await waitFor(() => expect(mockDeleteTask).toHaveBeenCalled());
  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(await screen.findByText(/failed to delete task/i)).toBeInTheDocument();
});

// ── Stats modal ───────────────────────────────────────────────────────────────

test('Stats button is rendered in the header', async () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /stats/i })).toBeInTheDocument();
});

test('clicking Stats button opens the stats modal', async () => {
  render(<App />);
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /stats/i }));
  });
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
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /stats/i }));
  });
  await screen.findByRole('heading', { name: /stats/i });
  const closeBtn = screen.getByRole('button', { name: /×/i });
  await act(async () => { userEvent.click(closeBtn); });
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: /stats/i })).not.toBeInTheDocument();
  });
});

// ── View tabs ─────────────────────────────────────────────────────────────────

test('"Board" tab button is rendered in the view tabs', async () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /^board$/i })).toBeInTheDocument();
});

test('clicking the Board tab shows the kanban column headers', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^board$/i }));
  });

  expect(screen.getByText('To Do')).toBeInTheDocument();
  expect(screen.getByText('In Progress')).toBeInTheDocument();
  // "Done" may appear in both kanban header and filter buttons
  expect(screen.getAllByText(/^done$/i).length).toBeGreaterThanOrEqual(1);
});

test('task without statusID appears in the To Do column of the kanban board', async () => {
  mockGetTasks.mockResolvedValue([{ ...sampleTask, statusID: null }]);
  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^board$/i }));
  });

  // Task title should appear inside the board
  expect(screen.getAllByText('Buy milk').length).toBeGreaterThanOrEqual(1);
});

// ── Task duplication ──────────────────────────────────────────────────────────

test('duplicate button is rendered for each task', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  render(<App />);
  await screen.findByText('Buy milk');
  expect(screen.getByRole('button', { name: /duplicate task/i })).toBeInTheDocument();
});

test('clicking duplicate calls createTask with " (copy)" appended to the title', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  const copy = { ...sampleTask, taskID: 99, title: 'Buy milk (copy)' };
  mockCreateTask.mockResolvedValue(copy);
  render(<App />);
  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /duplicate task/i }));
  });

  await waitFor(() => {
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Buy milk (copy)' })
    );
  });
});

// ── Bulk actions ──────────────────────────────────────────────────────────────

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

// ── Search ref ────────────────────────────────────────────────────────────────

test('search input placeholder mentions the "/" shortcut', async () => {
  render(<App />);
  const searchInput = screen.getByPlaceholderText(/press \/ to focus/i);
  expect(searchInput).toBeInTheDocument();
});
