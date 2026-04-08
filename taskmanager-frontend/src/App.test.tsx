import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { getTasks, createTask, deleteTask } from './api/tasks';
import type { Task } from './types/task';

jest.mock('./api/tasks');

const mockGetTasks = getTasks as jest.MockedFunction<typeof getTasks>;
const mockCreateTask = createTask as jest.MockedFunction<typeof createTask>;
const mockDeleteTask = deleteTask as jest.MockedFunction<typeof deleteTask>;

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
});

afterEach(() => {
  jest.clearAllMocks();
});

// -------------------------------------------------------------------------
// Rendering — regular cases
// -------------------------------------------------------------------------

test('renders the "Task Manager" heading', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /task manager/i })).toBeInTheDocument();
});

test('shows Total: 0 when no tasks are loaded', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  expect(screen.getByText(/total:\s*0/i)).toBeInTheDocument();
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
  // Wait for the task itself to load, then verify 'No due date' is absent
  await screen.findByText('Dentist appointment');
  expect(screen.queryByText('No due date')).not.toBeInTheDocument();
});

test('title input is empty on initial render', async () => {
  render(<App />);
  const input = screen.getByPlaceholderText(/enter a task title/i) as HTMLInputElement;
  expect(input.value).toBe('');
});

test('format toggle buttons are rendered', async () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /24-hour/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /dd\/mm\/yyyy/i })).toBeInTheDocument();
});

// -------------------------------------------------------------------------
// User interactions — regular cases
// -------------------------------------------------------------------------

test('typing in the title input updates its value', async () => {
  render(<App />);
  const input = screen.getByPlaceholderText(/enter a task title/i) as HTMLInputElement;
  userEvent.type(input, 'New task');
  expect(input.value).toBe('New task');
});

test('clicking Add calls createTask and appends task to list', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.type(screen.getByPlaceholderText(/enter a task title/i), 'Buy milk');
  userEvent.click(screen.getByRole('button', { name: /^add$/i }));

  expect(await screen.findByText('Buy milk')).toBeInTheDocument();
  expect(mockCreateTask).toHaveBeenCalledTimes(1);
});

test('pressing Enter in title input calls createTask', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.type(screen.getByPlaceholderText(/enter a task title/i), 'Buy milk{enter}');

  await waitFor(() => expect(mockCreateTask).toHaveBeenCalledTimes(1));
});

test('clicking Remove calls deleteTask with correct ID and removes task from list', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  mockDeleteTask.mockResolvedValue(undefined);
  render(<App />);

  await screen.findByText('Buy milk');

  userEvent.click(screen.getByRole('button', { name: /remove/i }));

  await waitFor(() => {
    expect(mockDeleteTask).toHaveBeenCalledWith(1);
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });
});

test('toggling 24-hour format shows hours 00–23', async () => {
  render(<App />);
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /24-hour/i }));
  });

  // In 24-hour mode, hour 00 through 23 should all be options
  await waitFor(() => {
    const hourSelect = screen.getAllByRole('combobox')[0];
    const options = Array.from((hourSelect as HTMLSelectElement).options).map(o => o.value);
    expect(options).toContain('00');
    expect(options).toContain('23');
    expect(options).toContain('13'); // present in 24-hour, absent in 12-hour
    expect(options.length).toBe(24);
  });
});

test('12-hour mode shows hours 01–12', async () => {
  render(<App />);
  // Default is 12-hour
  const hourSelect = screen.getAllByRole('combobox')[0];
  const options = Array.from((hourSelect as HTMLSelectElement).options).map(o => o.value);
  expect(options).toContain('12');
  expect(options).toContain('01');
  expect(options.length).toBe(12);
});

// -------------------------------------------------------------------------
// Edge cases
// -------------------------------------------------------------------------

test('clicking Add with empty title does NOT call createTask', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  userEvent.click(screen.getByRole('button', { name: /^add$/i }));

  expect(mockCreateTask).not.toHaveBeenCalled();
});

test('clicking Add with whitespace-only title does NOT call createTask', async () => {
  render(<App />);
  userEvent.type(screen.getByPlaceholderText(/enter a task title/i), '   ');
  userEvent.click(screen.getByRole('button', { name: /^add$/i }));

  expect(mockCreateTask).not.toHaveBeenCalled();
});

test('getTasks rejection is caught silently — app does not crash', async () => {
  mockGetTasks.mockRejectedValue(new Error('Network error'));
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());
  // App still renders, total stays 0
  expect(screen.getByText(/total:\s*0/i)).toBeInTheDocument();
});

test('createTask rejection is caught silently — list unchanged, no crash', async () => {
  render(<App />);
  await waitFor(() => expect(mockGetTasks).toHaveBeenCalled());

  mockCreateTask.mockRejectedValue(new Error('Server error'));
  const input = screen.getByPlaceholderText(/enter a task title/i) as HTMLInputElement;

  userEvent.type(input, 'Failing task');
  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /^add$/i }));
  });

  await waitFor(() => expect(mockCreateTask).toHaveBeenCalled());
  // Task should NOT appear in list since createTask failed
  expect(screen.queryByText('Failing task')).not.toBeInTheDocument();
  // Total stays 0
  expect(screen.getByText(/total:\s*0/i)).toBeInTheDocument();
});

test('deleteTask rejection is caught silently — task remains in list', async () => {
  mockGetTasks.mockResolvedValue([sampleTask]);
  mockDeleteTask.mockRejectedValue(new Error('Delete failed'));
  render(<App />);

  await screen.findByText('Buy milk');

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /remove/i }));
  });

  await waitFor(() => expect(mockDeleteTask).toHaveBeenCalled());
  // Task should still be in the list since delete failed
  expect(screen.getByText('Buy milk')).toBeInTheDocument();
});
