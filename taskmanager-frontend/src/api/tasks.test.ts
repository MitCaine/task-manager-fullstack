import { getTasks, createTask, deleteTask } from './tasks';
import type { Task } from '../types/task';

const mockTask: Task = {
  taskID: 1,
  title: 'Test task',
  description: 'A description',
  dateTimeScheduled: null,
  userID: null,
};

function mockFetch(ok: boolean, body: unknown): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  } as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

// -------------------------------------------------------------------------
// getTasks
// -------------------------------------------------------------------------

describe('getTasks', () => {
  test('makes a GET request to /tasks and returns parsed tasks', async () => {
    const spy = mockFetch(true, [mockTask]);
    const result = await getTasks();
    expect(spy).toHaveBeenCalledWith('/tasks');
    expect(result).toEqual([mockTask]);
  });

  test('throws with status code when response is not ok', async () => {
    mockFetch(false, []);
    await expect(getTasks()).rejects.toThrow('500');
  });
});

// -------------------------------------------------------------------------
// createTask
// -------------------------------------------------------------------------

describe('createTask', () => {
  test('makes a POST request to /tasks with JSON body and returns created task', async () => {
    const spy = mockFetch(true, mockTask);
    const payload = { title: 'Test task', description: '', dateTimeScheduled: null };

    const result = await createTask(payload);

    expect(spy).toHaveBeenCalledWith('/tasks', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
    expect(result).toEqual(mockTask);
  });

  test('throws with status code when response is not ok', async () => {
    mockFetch(false, {});
    await expect(createTask({ title: 'x' })).rejects.toThrow('500');
  });
});

// -------------------------------------------------------------------------
// deleteTask
// -------------------------------------------------------------------------

describe('deleteTask', () => {
  test('makes a DELETE request to /tasks/{id}', async () => {
    const spy = mockFetch(true, null);
    await deleteTask(5);
    expect(spy).toHaveBeenCalledWith('/tasks/5', { method: 'DELETE' });
  });

  test('resolves without a value on success', async () => {
    mockFetch(true, null);
    const result = await deleteTask(1);
    expect(result).toBeUndefined();
  });

  test('throws with status code when response is not ok', async () => {
    mockFetch(false, null);
    await expect(deleteTask(1)).rejects.toThrow('500');
  });
});
