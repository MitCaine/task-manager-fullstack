import type { ReactNode } from 'react';
import { createRef } from 'react';
import type { MutableRefObject } from 'react';
import { act, renderHook } from '@testing-library/react';
import useCreateTaskWorkflow from './useCreateTaskWorkflow';
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

function renderCreateTaskHook(repositories: Repositories) {
  const setTasks = jest.fn();
  const setError = jest.fn();
  const setToasts = jest.fn();
  const toastIdRef = createRef<number>() as MutableRefObject<number>;
  toastIdRef.current = 0;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RepositoryProvider repositories={repositories}>
      {children}
    </RepositoryProvider>
  );

  return {
    setTasks,
    setError,
    setToasts,
    toastIdRef,
    ...renderHook(() => useCreateTaskWorkflow({
      is24Hour: false,
      projects: [{ projectID: 5, title: 'Work' }],
      tags: [{ tagID: 9, title: 'Focus', color: '#6366f1' }],
      setTasks,
      setError,
      setToasts,
      toastIdRef,
      createProjectFromDraft: jest.fn(),
      createTagFromDraft: jest.fn(),
    }), { wrapper }),
  };
}

function applyTasksUpdate(setTasks: jest.Mock, previous: Task[] = []): Task[] {
  const update = setTasks.mock.calls.at(-1)?.[0];
  if (typeof update !== 'function') throw new Error('Expected setTasks functional update');
  return update(previous);
}

describe('useCreateTaskWorkflow', () => {
  let repositories: MockRepositories;

  beforeEach(() => {
    repositories = createMockRepositories();
    repositories.tasks.create.mockResolvedValue({
      id: '101',
      title: 'Plan launch',
      description: 'Prepare notes',
      dateTimeScheduled: '2026-07-04T09:00:00',
      endDateTimeScheduled: null,
      statusId: null,
      scheduleId: null,
      recurrenceRuleId: null,
      projectId: '5',
      priority: 'HIGH',
      createdAt: '2026-07-02T12:00:00',
    });
    repositories.recurrence.setForTask.mockResolvedValue({
      id: '101',
      title: 'Plan launch',
      description: 'Prepare notes',
      dateTimeScheduled: '2026-07-04T09:00:00',
      endDateTimeScheduled: null,
      statusId: null,
      scheduleId: null,
      recurrenceRuleId: '77',
      projectId: '5',
      priority: 'HIGH',
      createdAt: '2026-07-02T12:00:00',
    });
    repositories.tasks.addTag.mockResolvedValue({
      id: '101',
      title: 'Plan launch',
      description: 'Prepare notes',
      dateTimeScheduled: '2026-07-04T09:00:00',
      endDateTimeScheduled: null,
      statusId: null,
      scheduleId: null,
      recurrenceRuleId: '77',
      projectId: '5',
      priority: 'HIGH',
      tags: [{ id: '9', title: 'Focus', color: '#6366f1' }],
      createdAt: '2026-07-02T12:00:00',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a task through the task repository and stores the legacy UI shape', async () => {
    const { result, setTasks, setToasts, setError } = renderCreateTaskHook(repositories);

    await act(async () => {
      result.current.draft.setInput(' Plan launch ');
      result.current.draft.setDescription(' Prepare notes ');
      result.current.draft.setNewPriority('HIGH');
      result.current.draft.setNewProjectID(5);
    });

    await act(async () => {
      await result.current.actions.addTask();
    });

    expect(repositories.tasks.create).toHaveBeenCalledWith({
      title: 'Plan launch',
      description: 'Prepare notes',
      dateTimeScheduled: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00$/),
      endDateTimeScheduled: null,
      priority: 'HIGH',
      projectId: '5',
    });
    expect(applyTasksUpdate(setTasks)).toEqual([
      expect.objectContaining({
        taskID: 101,
        title: 'Plan launch',
        projectID: 5,
        priority: 'HIGH',
      }),
    ]);
    expect(setToasts).toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
  });

  it('orchestrates recurrence and tags after creating a task', async () => {
    const { result, setTasks } = renderCreateTaskHook(repositories);

    await act(async () => {
      result.current.draft.setInput('Plan launch');
      result.current.draft.setNewRepeat({ intervalUnit: 'week', intervalValue: 1 });
      result.current.draft.setNewTaskTagIDs([9]);
    });

    await act(async () => {
      await result.current.actions.addTask();
    });

    expect(repositories.tasks.create).toHaveBeenCalledTimes(1);
    expect(repositories.recurrence.setForTask).toHaveBeenCalledWith('101', { intervalUnit: 'week', intervalValue: 1 });
    expect(repositories.tasks.addTag).toHaveBeenCalledWith('101', '9');
    expect(applyTasksUpdate(setTasks)).toEqual([
      expect.objectContaining({
        taskID: 101,
        recurrenceRuleID: 77,
        tags: [{ tagID: 9, title: 'Focus', color: '#6366f1' }],
      }),
    ]);
  });

  it('reports a create error when repository task creation fails', async () => {
    repositories.tasks.create.mockRejectedValue(new Error('create failed'));
    const { result, setError, setTasks } = renderCreateTaskHook(repositories);

    await act(async () => {
      result.current.draft.setInput('Plan launch');
    });
    await act(async () => {
      await result.current.actions.addTask();
    });

    expect(setError).toHaveBeenCalledWith('Failed to create task.');
    expect(setTasks).not.toHaveBeenCalled();
  });

  it('fails clearly when a repository returns a non-numeric task ID for the legacy UI shape', async () => {
    repositories.tasks.create.mockResolvedValue({
      id: 'task-uuid',
      title: 'Plan launch',
      description: '',
      dateTimeScheduled: null,
      endDateTimeScheduled: null,
    });
    const { result, setError } = renderCreateTaskHook(repositories);

    await act(async () => {
      result.current.draft.setInput('Plan launch');
    });
    await act(async () => {
      await result.current.actions.addTask();
    });

    expect(setError).toHaveBeenCalledWith('Failed to create task.');
  });
});
