import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import useProjectTagCatalog from './useProjectTagCatalog';
import { RepositoryProvider } from '../repositories';
import type { Repositories } from '../repositories';

type MockRepositories = Omit<Repositories, 'projects' | 'tags'> & {
  projects: jest.Mocked<Repositories['projects']>;
  tags: jest.Mocked<Repositories['tags']>;
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

function renderCatalogHook(repositories: Repositories, setError = jest.fn()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RepositoryProvider repositories={repositories}>
      {children}
    </RepositoryProvider>
  );

  return {
    setError,
    ...renderHook(() => useProjectTagCatalog({ setError }), { wrapper }),
  };
}

describe('useProjectTagCatalog', () => {
  let repositories: MockRepositories;

  beforeEach(() => {
    repositories = createMockRepositories();
    repositories.projects.list.mockResolvedValue([{ id: '1', title: 'Launch', description: null, dueDate: null }]);
    repositories.tags.list.mockResolvedValue([{ id: '2', title: 'Focus', color: '#6366f1' }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads projects and tags through an awaitable catalog load action', async () => {
    const { result, setError } = renderCatalogHook(repositories);

    await act(async () => {
      await result.current.actions.loadProjectTagCatalog();
    });

    expect(repositories.projects.list).toHaveBeenCalledTimes(1);
    expect(repositories.tags.list).toHaveBeenCalledTimes(1);
    expect(result.current.catalog.projects).toEqual([
      { projectID: 1, title: 'Launch', description: null, dueDate: null },
    ]);
    expect(result.current.catalog.tags).toEqual([{ tagID: 2, title: 'Focus', color: '#6366f1' }]);
    expect(setError).not.toHaveBeenCalled();
  });

  it('keeps successful catalog data and reports a load error when one catalog request fails', async () => {
    repositories.tags.list.mockRejectedValue(new Error('Tag load failed'));
    const { result, setError } = renderCatalogHook(repositories);

    await act(async () => {
      await result.current.actions.loadProjectTagCatalog();
    });

    expect(result.current.catalog.projects).toEqual([
      { projectID: 1, title: 'Launch', description: null, dueDate: null },
    ]);
    expect(result.current.catalog.tags).toEqual([]);
    await waitFor(() => expect(setError).toHaveBeenCalledWith('Failed to load projects or tags.'));
  });

  it('creates, updates, and deletes projects through the project repository', async () => {
    repositories.projects.create.mockResolvedValue({ id: '3', title: 'Roadmap', description: null, dueDate: null });
    repositories.projects.update.mockResolvedValue({ id: '3', title: 'Updated Roadmap', description: null, dueDate: null });
    repositories.projects.delete.mockResolvedValue(undefined);
    const { result } = renderCatalogHook(repositories);

    let created = null;
    await act(async () => {
      created = await result.current.actions.createProjectInCatalog(' Roadmap ');
    });

    expect(repositories.projects.create).toHaveBeenCalledWith({ title: 'Roadmap' });
    expect(created).toEqual({ projectID: 3, title: 'Roadmap', description: null, dueDate: null });
    expect(result.current.catalog.projects).toEqual([
      { projectID: 3, title: 'Roadmap', description: null, dueDate: null },
    ]);

    await act(async () => {
      await result.current.actions.updateProjectTitle(3, ' Updated Roadmap ');
    });

    expect(repositories.projects.update).toHaveBeenCalledWith('3', {
      title: 'Updated Roadmap',
      description: null,
      dueDate: null,
    });
    expect(result.current.catalog.projects).toEqual([
      { projectID: 3, title: 'Updated Roadmap', description: null, dueDate: null },
    ]);

    await act(async () => {
      await result.current.actions.deleteProjectFromCatalog(3);
    });

    expect(repositories.projects.delete).toHaveBeenCalledWith('3');
    expect(result.current.catalog.projects).toEqual([]);
  });

  it('creates, updates, and deletes tags through the tag repository', async () => {
    repositories.tags.create.mockResolvedValue({ id: '4', title: 'Deep Work', color: '#111827' });
    repositories.tags.update.mockResolvedValue({ id: '4', title: 'Deep Work', color: '#22c55e' });
    repositories.tags.delete.mockResolvedValue(undefined);
    const { result } = renderCatalogHook(repositories);

    let created = null;
    await act(async () => {
      created = await result.current.actions.createTagInCatalog(' Deep Work ', '#111827');
    });

    expect(repositories.tags.create).toHaveBeenCalledWith({ title: 'Deep Work', color: '#111827' });
    expect(created).toEqual({ tagID: 4, title: 'Deep Work', color: '#111827' });
    expect(result.current.catalog.tags).toEqual([{ tagID: 4, title: 'Deep Work', color: '#111827' }]);

    await act(async () => {
      await result.current.actions.updateTagColor(4, '#22c55e');
    });

    expect(repositories.tags.update).toHaveBeenCalledWith('4', {
      title: 'Deep Work',
      color: '#22c55e',
    });
    expect(result.current.catalog.tags).toEqual([{ tagID: 4, title: 'Deep Work', color: '#22c55e' }]);

    await act(async () => {
      await result.current.actions.deleteTagFromCatalog(4);
    });

    expect(repositories.tags.delete).toHaveBeenCalledWith('4');
    expect(result.current.catalog.tags).toEqual([]);
  });
});
