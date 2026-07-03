import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import useInlineEditWorkflow from './useInlineEditWorkflow';
import { RepositoryProvider } from '../repositories';
import type { Repositories } from '../repositories';
import type { Task } from '../types/task';

type MockRepositories = Omit<Repositories, 'tasks' | 'recurrence'> & {
  tasks: jest.Mocked<Repositories['tasks']>;
  recurrence: jest.Mocked<Repositories['recurrence']>;
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

const baseTask: Task = {
  taskID: 42,
  title: 'Draft',
  description: 'Old description',
  dateTimeScheduled: '2026-07-04T09:00:00',
  endDateTimeScheduled: null,
  statusID: 1,
  projectID: 5,
  priority: 'LOW',
  recurrenceRuleID: 99,
  tags: [{ tagID: 1, title: 'Old tag', color: null }],
};

function renderInlineEditHook(repositories: Repositories) {
  const setTasks = jest.fn();
  const setError = jest.fn();
  const setInlineEditOpenControl = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RepositoryProvider repositories={repositories}>
      {children}
    </RepositoryProvider>
  );

  return {
    setTasks,
    setError,
    setInlineEditOpenControl,
    ...renderHook(() => useInlineEditWorkflow({
      is24Hour: false,
      tags: [
        { tagID: 1, title: 'Old tag', color: null },
        { tagID: 2, title: 'New tag', color: '#6366f1' },
      ],
      setTasks,
      setError,
      createProjectFromDraft: jest.fn(),
      createTagFromDraft: jest.fn(),
      setInlineEditOpenControl,
      selectedTaskId: null,
    }), { wrapper }),
  };
}

function applyLastTasksUpdate(setTasks: jest.Mock, previous: Task[] = [baseTask]): Task[] {
  const update = setTasks.mock.calls.at(-1)?.[0];
  if (typeof update !== 'function') throw new Error('Expected setTasks functional update');
  return update(previous);
}

describe('useInlineEditWorkflow', () => {
  let repositories: MockRepositories;

  beforeEach(() => {
    repositories = createMockRepositories();
    repositories.tasks.get.mockResolvedValue({
      id: '42',
      title: 'Draft',
      description: 'Old description',
      dateTimeScheduled: '2026-07-04T09:00:00',
      endDateTimeScheduled: null,
      statusId: 'not_started',
      projectId: '5',
      priority: 'LOW',
      recurrenceRuleId: '99',
      tags: [{ id: '1', title: 'Old tag', color: null }],
    });
    repositories.tasks.update.mockResolvedValue({
      id: '42',
      title: 'Updated',
      description: 'New description',
      dateTimeScheduled: '2026-07-04T09:00:00',
      endDateTimeScheduled: null,
      statusId: 'not_started',
      projectId: '5',
      priority: 'HIGH',
      recurrenceRuleId: '99',
    });
    repositories.tasks.addTag.mockResolvedValue({ id: '42', title: 'Updated', description: 'New description' });
    repositories.tasks.removeTag.mockResolvedValue({ id: '42', title: 'Updated', description: 'New description' });
    repositories.recurrence.getByTask.mockResolvedValue({
      id: '99',
      intervalUnit: 'week',
      intervalValue: 1,
      timesOfRecurrence: 0,
      startDateTime: '2026-07-04T09:00:00',
      endDateTime: null,
    });
    repositories.recurrence.setForTask.mockResolvedValue({
      id: '42',
      title: 'Updated',
      description: 'New description',
      recurrenceRuleId: '100',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads fresh task tags and recurrence through repositories when edit starts', async () => {
    const { result, setTasks } = renderInlineEditHook(repositories);

    await act(async () => {
      await result.current.actions.startEdit(baseTask);
    });

    expect(repositories.tasks.get).toHaveBeenCalledWith('42');
    expect(repositories.recurrence.getByTask).toHaveBeenCalledWith('42');
    expect(result.current.draft.editTaskTagIDs).toEqual([1]);
    await waitFor(() => expect(result.current.draft.editRepeat).toEqual({ intervalUnit: 'week', intervalValue: 1 }));
    expect(applyLastTasksUpdate(setTasks)[0].tags).toEqual([{ tagID: 1, title: 'Old tag', color: null }]);
  });

  it('saves edits, reconciles tags, and updates recurrence through repositories', async () => {
    const { result, setTasks } = renderInlineEditHook(repositories);

    await act(async () => {
      await result.current.actions.startEdit(baseTask);
    });
    await waitFor(() => expect(result.current.draft.editRepeat).toEqual({ intervalUnit: 'week', intervalValue: 1 }));

    await act(async () => {
      result.current.draft.setEditTitle(' Updated ');
      result.current.draft.setEditDescription(' New description ');
      result.current.draft.setEditPriority('HIGH');
      result.current.draft.setEditTaskTagIDs([2]);
      result.current.draft.setEditRepeat({ intervalUnit: 'month', intervalValue: 1 });
    });
    await act(async () => {
      await result.current.actions.saveEdit(baseTask);
    });

    expect(repositories.tasks.update).toHaveBeenCalledWith('42', expect.objectContaining({
      title: 'Updated',
      description: 'New description',
      statusId: 'not_started',
      projectId: '5',
      priority: 'HIGH',
    }));
    expect(repositories.tasks.addTag).toHaveBeenCalledWith('42', '2');
    expect(repositories.tasks.removeTag).toHaveBeenCalledWith('42', '1');
    expect(repositories.recurrence.setForTask).toHaveBeenCalledWith('42', { intervalUnit: 'month', intervalValue: 1 });
    expect(repositories.tasks.get).toHaveBeenLastCalledWith('42');
    expect(applyLastTasksUpdate(setTasks)[0]).toEqual(expect.objectContaining({ recurrenceRuleID: 99 }));
  });

  it('reports update failures without changing task state', async () => {
    repositories.tasks.update.mockRejectedValue(new Error('update failed'));
    const { result, setError } = renderInlineEditHook(repositories);

    await act(async () => {
      await result.current.actions.startEdit(baseTask);
    });
    await act(async () => {
      await result.current.actions.saveEdit(baseTask);
    });

    expect(setError).toHaveBeenCalledWith('Failed to update task.');
  });

  it('reports update failure when the repository returns a non-numeric task ID', async () => {
    repositories.tasks.update.mockResolvedValue({
      id: 'task-uuid',
      title: 'Updated',
      description: 'New description',
    });
    const { result, setError } = renderInlineEditHook(repositories);

    await act(async () => {
      await result.current.actions.startEdit(baseTask);
    });
    await act(async () => {
      await result.current.actions.saveEdit(baseTask);
    });

    expect(setError).toHaveBeenCalledWith('Failed to update task.');
  });
});
