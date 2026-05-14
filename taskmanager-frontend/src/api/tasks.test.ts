import {
  getTasks, getTask, createTask, updateTask, patchTaskStatus, deleteTask,
  getSubtasks, createSubtask, updateSubtask, patchSubtaskStatus, deleteSubtask,
  getNotes, createNote, deleteNote,
  getReminders, createReminder, deleteReminder, patchReminderDate,
  getProjects, createProject, deleteProject,
  getTags, createTag, updateTag, deleteTag, addTagToTask, removeTagFromTask,
  getAttachments, createAttachment, deleteAttachment,
  getRecurrence, setRepeat,
} from './tasks';
import type { Task, Subtask, Note, Reminder, Project, Tag, Attachment, RecurrenceRule } from '../types/task';

// Fetch mocks keep endpoint tests focused on request shape and parsing.

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

// Shared fixtures mirror the API response shapes used by callers.

const mockTask: Task = { taskID: 1, title: 'Test task', description: 'A description', dateTimeScheduled: null, userID: null };
const mockSubtask: Subtask = { subTaskID: 1, title: 'Step one', statusID: 1, parentTaskID: 1 };
const mockNote: Note = { noteID: 1, title: 'Title', context: 'Content', timestamp: '2026-01-01T12:00:00', taskID: 1 };
const mockReminder: Reminder = { reminderID: 1, dueDate: '2026-06-01T09:00:00', notificationMethod: 'browser', taskID: 1 };
const mockProject: Project = { projectID: 1, title: 'My project' };
const mockTag: Tag = { tagID: 1, title: 'Urgent', color: '#f87171' };
const mockAttachment: Attachment = { attachmentID: 1, fileORLink: 'https://example.com', fileSize: 0, taskID: 1 };
const mockRecurrence: RecurrenceRule = { recurrenceRuleID: 1, frequency: 'weekly', timesOfRecurrence: 0, startDateTime: '2026-01-01T00:00:00', endDateTime: '2036-01-01T00:00:00' };

// Task endpoint tests.

describe('getTasks', () => {
  test('makes a GET request to /tasks and returns parsed tasks', async () => {
    const spy = mockFetch(true, [mockTask]);
    const result = await getTasks();
    expect(spy).toHaveBeenCalledWith('/tasks', undefined);
    expect(result).toEqual([mockTask]);
  });

  test('throws with status code when response is not ok', async () => {
    mockFetch(false, []);
    await expect(getTasks()).rejects.toThrow('500');
  });
});

describe('getTask', () => {
  test('makes a GET request to /tasks/{id} and returns the task', async () => {
    const spy = mockFetch(true, mockTask);
    const result = await getTask(1);
    expect(spy).toHaveBeenCalledWith('/tasks/1', undefined);
    expect(result).toEqual(mockTask);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(getTask(99)).rejects.toThrow('500');
  });
});

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

describe('updateTask', () => {
  test('makes a PUT request to /tasks/{id} with JSON body', async () => {
    const spy = mockFetch(true, mockTask);
    const payload = { title: 'Updated', description: '' };
    const result = await updateTask(1, payload);
    expect(spy).toHaveBeenCalledWith('/tasks/1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify(payload),
    }));
    expect(result).toEqual(mockTask);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(updateTask(1, { title: 'x' })).rejects.toThrow('500');
  });
});

describe('patchTaskStatus', () => {
  test('makes a PATCH request to /tasks/{id}/status', async () => {
    const spy = mockFetch(true, { ...mockTask, statusID: 2 });
    const result = await patchTaskStatus(1, 2);
    expect(spy).toHaveBeenCalledWith('/tasks/1/status', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ statusID: 2 }),
    }));
    expect(result.statusID).toBe(2);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(patchTaskStatus(1, 2)).rejects.toThrow('500');
  });
});

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

// Subtask endpoint tests.

describe('getSubtasks', () => {
  test('makes a GET request to /tasks/{id}/subtasks', async () => {
    const spy = mockFetch(true, [mockSubtask]);
    const result = await getSubtasks(1);
    expect(spy).toHaveBeenCalledWith('/tasks/1/subtasks', undefined);
    expect(result).toEqual([mockSubtask]);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, []);
    await expect(getSubtasks(1)).rejects.toThrow('500');
  });
});

describe('createSubtask', () => {
  test('makes a POST request to /tasks/{id}/subtasks with title', async () => {
    const spy = mockFetch(true, mockSubtask);
    const result = await createSubtask(1, 'Step one');
    expect(spy).toHaveBeenCalledWith('/tasks/1/subtasks', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Step one' }),
    }));
    expect(result).toEqual(mockSubtask);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(createSubtask(1, 'Step')).rejects.toThrow('500');
  });
});

describe('updateSubtask', () => {
  test('makes a PUT request to /subtasks/{id} with new title', async () => {
    const spy = mockFetch(true, { ...mockSubtask, title: 'Updated step' });
    const result = await updateSubtask(1, 'Updated step');
    expect(spy).toHaveBeenCalledWith('/subtasks/1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated step' }),
    }));
    expect(result.title).toBe('Updated step');
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(updateSubtask(1, 'x')).rejects.toThrow('500');
  });
});

describe('patchSubtaskStatus', () => {
  test('makes a PATCH request to /subtasks/{id}/status', async () => {
    const spy = mockFetch(true, { ...mockSubtask, statusID: 2 });
    const result = await patchSubtaskStatus(1, 2);
    expect(spy).toHaveBeenCalledWith('/subtasks/1/status', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ statusID: 2 }),
    }));
    expect(result.statusID).toBe(2);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(patchSubtaskStatus(1, 2)).rejects.toThrow('500');
  });
});

describe('deleteSubtask', () => {
  test('makes a DELETE request to /subtasks/{id}', async () => {
    const spy = mockFetch(true, null);
    await deleteSubtask(3);
    expect(spy).toHaveBeenCalledWith('/subtasks/3', { method: 'DELETE' });
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, null);
    await expect(deleteSubtask(1)).rejects.toThrow('500');
  });
});

// Note endpoint tests.

describe('getNotes', () => {
  test('makes a GET request to /tasks/{id}/notes', async () => {
    const spy = mockFetch(true, [mockNote]);
    const result = await getNotes(1);
    expect(spy).toHaveBeenCalledWith('/tasks/1/notes', undefined);
    expect(result).toEqual([mockNote]);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, []);
    await expect(getNotes(1)).rejects.toThrow('500');
  });
});

describe('createNote', () => {
  test('makes a POST request to /tasks/{id}/notes with title and context', async () => {
    const spy = mockFetch(true, mockNote);
    const result = await createNote(1, 'Title', 'Content');
    expect(spy).toHaveBeenCalledWith('/tasks/1/notes', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Title', context: 'Content' }),
    }));
    expect(result).toEqual(mockNote);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(createNote(1, 'T', 'C')).rejects.toThrow('500');
  });
});

describe('deleteNote', () => {
  test('makes a DELETE request to /notes/{id}', async () => {
    const spy = mockFetch(true, null);
    await deleteNote(2);
    expect(spy).toHaveBeenCalledWith('/notes/2', { method: 'DELETE' });
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, null);
    await expect(deleteNote(1)).rejects.toThrow('500');
  });
});

// Reminder endpoint tests.

describe('getReminders', () => {
  test('makes a GET request to /tasks/{id}/reminders', async () => {
    const spy = mockFetch(true, [mockReminder]);
    const result = await getReminders(1);
    expect(spy).toHaveBeenCalledWith('/tasks/1/reminders', undefined);
    expect(result).toEqual([mockReminder]);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, []);
    await expect(getReminders(1)).rejects.toThrow('500');
  });
});

describe('createReminder', () => {
  test('makes a POST request to /tasks/{id}/reminders with dueDate and message', async () => {
    const spy = mockFetch(true, mockReminder);
    const result = await createReminder(1, '2026-06-01T09:00:00', 'Don\'t forget');
    expect(spy).toHaveBeenCalledWith('/tasks/1/reminders', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ dueDate: '2026-06-01T09:00:00', message: 'Don\'t forget' }),
    }));
    expect(result).toEqual(mockReminder);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(createReminder(1, '2026-06-01T09:00:00', '')).rejects.toThrow('500');
  });
});

describe('deleteReminder', () => {
  test('makes a DELETE request to /reminders/{id}', async () => {
    const spy = mockFetch(true, null);
    await deleteReminder(4);
    expect(spy).toHaveBeenCalledWith('/reminders/4', { method: 'DELETE' });
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, null);
    await expect(deleteReminder(1)).rejects.toThrow('500');
  });
});

describe('patchReminderDate', () => {
  test('makes a PATCH request to /reminders/{id} with dueDate', async () => {
    const spy = mockFetch(true, { ...mockReminder, dueDate: '2026-07-01T09:00:00' });
    const result = await patchReminderDate(1, '2026-07-01T09:00:00');
    expect(spy).toHaveBeenCalledWith('/reminders/1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ dueDate: '2026-07-01T09:00:00' }),
    }));
    expect(result.dueDate).toBe('2026-07-01T09:00:00');
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(patchReminderDate(1, '2026-07-01T09:00:00')).rejects.toThrow('500');
  });
});

// Project endpoint tests.

describe('getProjects', () => {
  test('makes a GET request to /projects', async () => {
    const spy = mockFetch(true, [mockProject]);
    const result = await getProjects();
    expect(spy).toHaveBeenCalledWith('/projects', undefined);
    expect(result).toEqual([mockProject]);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, []);
    await expect(getProjects()).rejects.toThrow('500');
  });
});

describe('createProject', () => {
  test('makes a POST request to /projects with project body', async () => {
    const spy = mockFetch(true, mockProject);
    const payload = { title: 'My project' };
    const result = await createProject(payload);
    expect(spy).toHaveBeenCalledWith('/projects', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    }));
    expect(result).toEqual(mockProject);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(createProject({ title: 'p' })).rejects.toThrow('500');
  });
});

describe('deleteProject', () => {
  test('makes a DELETE request to /projects/{id}', async () => {
    const spy = mockFetch(true, null);
    await deleteProject(1);
    expect(spy).toHaveBeenCalledWith('/projects/1', { method: 'DELETE' });
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, null);
    await expect(deleteProject(1)).rejects.toThrow('500');
  });
});

// Tag endpoint tests.

describe('getTags', () => {
  test('makes a GET request to /tags', async () => {
    const spy = mockFetch(true, [mockTag]);
    const result = await getTags();
    expect(spy).toHaveBeenCalledWith('/tags', undefined);
    expect(result).toEqual([mockTag]);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, []);
    await expect(getTags()).rejects.toThrow('500');
  });
});

describe('createTag', () => {
  test('makes a POST request to /tags with tag body', async () => {
    const spy = mockFetch(true, mockTag);
    const payload = { title: 'Urgent', color: '#f87171' };
    const result = await createTag(payload);
    expect(spy).toHaveBeenCalledWith('/tags', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    }));
    expect(result).toEqual(mockTag);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(createTag({ title: 't' })).rejects.toThrow('500');
  });
});

describe('updateTag', () => {
  test('makes a PATCH request to /tags/{id} with color', async () => {
    const spy = mockFetch(true, { ...mockTag, color: '#4ade80' });
    const result = await updateTag(1, '#4ade80');
    expect(spy).toHaveBeenCalledWith('/tags/1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ color: '#4ade80' }),
    }));
    expect(result.color).toBe('#4ade80');
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(updateTag(1, '#000')).rejects.toThrow('500');
  });
});

describe('deleteTag', () => {
  test('makes a DELETE request to /tags/{id}', async () => {
    const spy = mockFetch(true, null);
    await deleteTag(2);
    expect(spy).toHaveBeenCalledWith('/tags/2', { method: 'DELETE' });
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, null);
    await expect(deleteTag(1)).rejects.toThrow('500');
  });
});

describe('addTagToTask', () => {
  test('makes a POST request to /tasks/{id}/tags/{tagId}', async () => {
    const spy = mockFetch(true, null);
    await addTagToTask(1, 3);
    expect(spy).toHaveBeenCalledWith('/tasks/1/tags/3', { method: 'POST' });
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, null);
    await expect(addTagToTask(1, 3)).rejects.toThrow('500');
  });
});

describe('removeTagFromTask', () => {
  test('makes a DELETE request to /tasks/{id}/tags/{tagId}', async () => {
    const spy = mockFetch(true, null);
    await removeTagFromTask(1, 3);
    expect(spy).toHaveBeenCalledWith('/tasks/1/tags/3', { method: 'DELETE' });
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, null);
    await expect(removeTagFromTask(1, 3)).rejects.toThrow('500');
  });
});

// Link attachment endpoint tests.

describe('getAttachments', () => {
  test('makes a GET request to /tasks/{id}/attachments', async () => {
    const spy = mockFetch(true, [mockAttachment]);
    const result = await getAttachments(1);
    expect(spy).toHaveBeenCalledWith('/tasks/1/attachments', undefined);
    expect(result).toEqual([mockAttachment]);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, []);
    await expect(getAttachments(1)).rejects.toThrow('500');
  });
});

describe('createAttachment', () => {
  test('makes a POST request to /tasks/{id}/attachments with url and metadata', async () => {
    const spy = mockFetch(true, mockAttachment);
    const result = await createAttachment(1, 'https://example.com', 'Docs');
    expect(spy).toHaveBeenCalledWith('/tasks/1/attachments', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ fileORLink: 'https://example.com', metadata: 'Docs' }),
    }));
    expect(result).toEqual(mockAttachment);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(createAttachment(1, 'https://example.com', '')).rejects.toThrow('500');
  });
});

describe('deleteAttachment', () => {
  test('makes a DELETE request to /attachments/{id}', async () => {
    const spy = mockFetch(true, null);
    await deleteAttachment(5);
    expect(spy).toHaveBeenCalledWith('/attachments/5', { method: 'DELETE' });
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, null);
    await expect(deleteAttachment(1)).rejects.toThrow('500');
  });
});

// Recurrence endpoint tests.

describe('getRecurrence', () => {
  test('makes a GET request to /tasks/{id}/recurrence', async () => {
    const spy = mockFetch(true, mockRecurrence);
    const result = await getRecurrence(1);
    expect(spy).toHaveBeenCalledWith('/tasks/1/recurrence', undefined);
    expect(result).toEqual(mockRecurrence);
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(getRecurrence(1)).rejects.toThrow('500');
  });
});

describe('setRepeat', () => {
  test('makes a PATCH request to /tasks/{id}/repeat with frequency', async () => {
    const spy = mockFetch(true, mockTask);
    const result = await setRepeat(1, 'weekly');
    expect(spy).toHaveBeenCalledWith('/tasks/1/repeat', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ frequency: 'weekly' }),
    }));
    expect(result).toEqual(mockTask);
  });

  test('sends null frequency to clear recurrence', async () => {
    const spy = mockFetch(true, mockTask);
    await setRepeat(1, null);
    expect(spy).toHaveBeenCalledWith('/tasks/1/repeat', expect.objectContaining({
      body: JSON.stringify({ frequency: null }),
    }));
  });

  test('throws when response is not ok', async () => {
    mockFetch(false, {});
    await expect(setRepeat(1, 'daily')).rejects.toThrow('500');
  });
});
