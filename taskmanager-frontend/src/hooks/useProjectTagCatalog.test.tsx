import { act, renderHook, waitFor } from '@testing-library/react';
import useProjectTagCatalog from './useProjectTagCatalog';
import { getProjects, getTags } from '../api/tasks';

jest.mock('../api/tasks');

const mockGetProjects = getProjects as jest.MockedFunction<typeof getProjects>;
const mockGetTags = getTags as jest.MockedFunction<typeof getTags>;

describe('useProjectTagCatalog', () => {
  beforeEach(() => {
    mockGetProjects.mockResolvedValue([{ projectID: 1, title: 'Launch' }]);
    mockGetTags.mockResolvedValue([{ tagID: 2, title: 'Focus', color: '#6366f1' }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads projects and tags through an awaitable catalog load action', async () => {
    const setError = jest.fn();
    const { result } = renderHook(() => useProjectTagCatalog({ setError }));

    await act(async () => {
      await result.current.actions.loadProjectTagCatalog();
    });

    expect(result.current.catalog.projects).toEqual([{ projectID: 1, title: 'Launch' }]);
    expect(result.current.catalog.tags).toEqual([{ tagID: 2, title: 'Focus', color: '#6366f1' }]);
    expect(setError).not.toHaveBeenCalled();
  });

  it('keeps successful catalog data and reports a load error when one catalog request fails', async () => {
    const setError = jest.fn();
    mockGetTags.mockRejectedValue(new Error('Tag load failed'));
    const { result } = renderHook(() => useProjectTagCatalog({ setError }));

    await act(async () => {
      await result.current.actions.loadProjectTagCatalog();
    });

    expect(result.current.catalog.projects).toEqual([{ projectID: 1, title: 'Launch' }]);
    expect(result.current.catalog.tags).toEqual([]);
    await waitFor(() => expect(setError).toHaveBeenCalledWith('Failed to load projects or tags.'));
  });
});
