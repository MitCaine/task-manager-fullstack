import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import useTaskDetailResources from './useTaskDetailResources';
import { RepositoryProvider } from '../repositories';
import type { Repositories } from '../repositories';
import { TASK_STATUS } from '../utils/taskUtils';

type MockRepositories = Omit<Repositories, 'subtasks' | 'notes' | 'reminders' | 'attachments'> & {
  subtasks: jest.Mocked<Repositories['subtasks']>;
  notes: jest.Mocked<Repositories['notes']>;
  reminders: jest.Mocked<Repositories['reminders']>;
  attachments: jest.Mocked<Repositories['attachments']>;
};

function createMockRepositories(): MockRepositories {
  return {
    tasks: { list: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn(), updateStatus: jest.fn(), delete: jest.fn(), addTag: jest.fn(), removeTag: jest.fn() },
    projects: { list: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    tags: { list: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    subtasks: { listByTask: jest.fn(), create: jest.fn(), update: jest.fn(), updateStatus: jest.fn(), delete: jest.fn() },
    notes: { listByTask: jest.fn(), create: jest.fn(), delete: jest.fn() },
    reminders: { listByTask: jest.fn(), create: jest.fn(), updateDueDate: jest.fn(), delete: jest.fn() },
    attachments: { listByTask: jest.fn(), create: jest.fn(), delete: jest.fn() },
    recurrence: { getByTask: jest.fn(), setForTask: jest.fn() },
  } as MockRepositories;
}

function renderResourcesHook(repositories: Repositories, setError = jest.fn()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RepositoryProvider repositories={repositories}>
      {children}
    </RepositoryProvider>
  );

  return {
    setError,
    ...renderHook(() => useTaskDetailResources({ is24Hour: false, setError }), { wrapper }),
  };
}

describe('useTaskDetailResources', () => {
  let repositories: MockRepositories;

  beforeEach(() => {
    repositories = createMockRepositories();
    repositories.subtasks.listByTask.mockResolvedValue([
      { id: '11', parentTaskId: '7', title: 'Step', statusId: 'not_started', dateTimeScheduled: null },
    ]);
    repositories.notes.listByTask.mockResolvedValue([
      { id: '21', taskId: '7', title: '', context: 'Note body', timestamp: '2026-07-02T09:00:00' },
    ]);
    repositories.reminders.listByTask.mockResolvedValue([
      { id: '31', taskId: '7', dueDate: '2026-07-03T09:00:00', notificationMethod: 'browser', message: 'Ping' },
    ]);
    repositories.attachments.listByTask.mockResolvedValue([
      { id: '41', taskId: '7', fileOrLink: 'https://example.com', metadata: 'Example', fileSize: 0 },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads task detail resources through repositories', async () => {
    const { result, setError } = renderResourcesHook(repositories);

    await act(async () => {
      await result.current.actions.loadTaskSections(7);
    });

    expect(repositories.subtasks.listByTask).toHaveBeenCalledWith('7');
    expect(repositories.notes.listByTask).toHaveBeenCalledWith('7');
    expect(repositories.reminders.listByTask).toHaveBeenCalledWith('7');
    expect(repositories.attachments.listByTask).toHaveBeenCalledWith('7');
    expect(result.current.resources.subtasks[7]).toEqual([
      { subTaskID: 11, parentTaskID: 7, title: 'Step', statusID: TASK_STATUS.LEGACY_ACTIVE, dateTimeScheduled: null },
    ]);
    expect(result.current.resources.notes[7]).toEqual([
      { noteID: 21, taskID: 7, title: '', context: 'Note body', timestamp: '2026-07-02T09:00:00' },
    ]);
    expect(result.current.resources.reminders[7]).toEqual([
      { reminderID: 31, taskID: 7, dueDate: '2026-07-03T09:00:00', notificationMethod: 'browser', message: 'Ping' },
    ]);
    expect(result.current.resources.attachments[7]).toEqual([
      { attachmentID: 41, taskID: 7, fileORLink: 'https://example.com', metadata: 'Example', fileSize: 0 },
    ]);
    expect(setError).not.toHaveBeenCalled();
  });

  it('reports a task detail load error when a resource request fails', async () => {
    repositories.notes.listByTask.mockRejectedValue(new Error('notes failed'));
    const { result, setError } = renderResourcesHook(repositories);

    await act(async () => {
      await result.current.actions.loadTaskSections(7);
    });

    expect(setError).toHaveBeenCalledWith('Failed to load task details.');
    expect(result.current.resources.subtasks[7]).toBeUndefined();
  });

  it('creates, updates, toggles, and deletes subtasks through the subtask repository', async () => {
    repositories.subtasks.create.mockResolvedValue({ id: '12', parentTaskId: '7', title: 'Draft step', statusId: 'not_started', dateTimeScheduled: null });
    repositories.subtasks.update.mockResolvedValue({ id: '12', parentTaskId: '7', title: 'Renamed step', statusId: 'not_started', dateTimeScheduled: null });
    repositories.subtasks.updateStatus.mockResolvedValue({ id: '12', parentTaskId: '7', title: 'Renamed step', statusId: 'completed', dateTimeScheduled: null });
    repositories.subtasks.delete.mockResolvedValue(undefined);
    const { result } = renderResourcesHook(repositories);

    await act(async () => {
      result.current.draftSetters.setNewSubtaskTitle(' Draft step ');
    });
    await act(async () => {
      await result.current.actions.addSubtask(7);
    });

    expect(repositories.subtasks.create).toHaveBeenCalledWith({ parentTaskId: '7', title: 'Draft step' });
    expect(result.current.resources.subtasks[7]).toEqual([
      { subTaskID: 12, parentTaskID: 7, title: 'Draft step', statusID: TASK_STATUS.LEGACY_ACTIVE, dateTimeScheduled: null },
    ]);

    await act(async () => {
      result.current.draftSetters.setEditingSubtaskTitle(' Renamed step ');
    });
    await act(async () => {
      await result.current.actions.updateSubtaskTitle(7, result.current.resources.subtasks[7][0]);
    });

    expect(repositories.subtasks.update).toHaveBeenCalledWith('12', {
      title: 'Renamed step',
      statusId: 'not_started',
      dateTimeScheduled: null,
    });

    await act(async () => {
      await result.current.actions.toggleSubtask(7, result.current.resources.subtasks[7][0]);
    });

    expect(repositories.subtasks.updateStatus).toHaveBeenCalledWith('12', 'completed');

    await act(async () => {
      await result.current.actions.removeSubtask(7, 12);
    });

    expect(repositories.subtasks.delete).toHaveBeenCalledWith('12');
    expect(result.current.resources.subtasks[7]).toEqual([]);
  });

  it('creates and deletes notes reminders and attachments through repositories', async () => {
    repositories.notes.create.mockResolvedValue({ id: '22', taskId: '7', title: '', context: 'New note', timestamp: '2026-07-02T10:00:00' });
    repositories.notes.delete.mockResolvedValue(undefined);
    repositories.reminders.create.mockResolvedValue({ id: '32', taskId: '7', dueDate: '2026-07-04T09:00:00', notificationMethod: 'browser', message: 'Reminder' });
    repositories.reminders.delete.mockResolvedValue(undefined);
    repositories.attachments.create.mockResolvedValue({ id: '42', taskId: '7', fileOrLink: 'https://example.org', metadata: 'Example org', fileSize: 0 });
    repositories.attachments.delete.mockResolvedValue(undefined);
    const { result } = renderResourcesHook(repositories);

    await act(async () => {
      result.current.draftSetters.setNewNoteContent(' New note ');
      result.current.draftSetters.setNewReminderDate('2026-07-04');
      result.current.draftSetters.setNewReminderMessage('Reminder');
      result.current.draftSetters.setNewAttachmentUrl(' https://example.org ');
      result.current.draftSetters.setNewAttachmentLabel(' Example org ');
    });

    await act(async () => {
      await result.current.actions.addNote(7);
      await result.current.actions.addReminder(7);
      await result.current.actions.addAttachment(7);
    });

    expect(repositories.notes.create).toHaveBeenCalledWith({ taskId: '7', title: '', context: 'New note' });
    expect(repositories.reminders.create).toHaveBeenCalledWith({ taskId: '7', dueDate: '2026-07-04T09:00:00', message: 'Reminder' });
    expect(repositories.attachments.create).toHaveBeenCalledWith({ taskId: '7', fileOrLink: 'https://example.org', metadata: 'Example org' });
    expect(result.current.resources.notes[7][0].noteID).toBe(22);
    expect(result.current.resources.reminders[7][0].reminderID).toBe(32);
    expect(result.current.resources.attachments[7][0].attachmentID).toBe(42);

    await act(async () => {
      await result.current.actions.removeNote(7, 22);
      await result.current.actions.removeReminder(7, 32);
      await result.current.actions.removeAttachment(7, 42);
    });

    expect(repositories.notes.delete).toHaveBeenCalledWith('22');
    expect(repositories.reminders.delete).toHaveBeenCalledWith('32');
    expect(repositories.attachments.delete).toHaveBeenCalledWith('42');
  });

  it('fails clearly when a repository returns non-numeric IDs for the legacy UI shape', async () => {
    repositories.subtasks.listByTask.mockResolvedValue([
      { id: 'subtask-uuid', parentTaskId: '7', title: 'Step', statusId: 'not_started', dateTimeScheduled: null },
    ]);
    const { result, setError } = renderResourcesHook(repositories);

    await act(async () => {
      await result.current.actions.loadTaskSections(7);
    });

    expect(setError).toHaveBeenCalledWith('Failed to load task details.');
  });
});
