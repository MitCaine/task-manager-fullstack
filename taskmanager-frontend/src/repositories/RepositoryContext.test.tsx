import { render, screen } from '@testing-library/react';
import { RepositoryProvider, useRepositories } from './RepositoryContext';
import { createRestRepositories } from './api';
import type { Repositories } from './contracts';

jest.mock('./api', () => ({
  createRestRepositories: jest.fn(),
}));

const mockCreateRestRepositories = createRestRepositories as jest.MockedFunction<typeof createRestRepositories>;

function createMockRepositories(label = 'mock'): Repositories {
  return {
    tasks: { list: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn(), updateStatus: jest.fn(), delete: jest.fn(), addTag: jest.fn(), removeTag: jest.fn() },
    projects: { list: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    tags: { list: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    subtasks: { listByTask: jest.fn(), create: jest.fn(), update: jest.fn(), updateStatus: jest.fn(), delete: jest.fn() },
    notes: { listByTask: jest.fn(), create: jest.fn(), delete: jest.fn() },
    reminders: { listByTask: jest.fn(), create: jest.fn(), updateDueDate: jest.fn(), delete: jest.fn() },
    attachments: { listByTask: jest.fn(), create: jest.fn(), delete: jest.fn() },
    recurrence: { getByTask: jest.fn(), setForTask: jest.fn() },
    __label: label,
  } as Repositories & { __label: string };
}

function RepositoryConsumer({ expected }: { expected?: Repositories }) {
  const repositories = useRepositories();

  if (expected) {
    return <div>{repositories === expected ? 'custom repositories' : 'unexpected repositories'}</div>;
  }

  return <div>{repositories.tasks ? 'default repositories' : 'missing repositories'}</div>;
}

function OutsideProviderConsumer() {
  useRepositories();
  return <div>unreachable</div>;
}

describe('RepositoryProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRestRepositories.mockReturnValue(createMockRepositories('default'));
  });

  it('supplies the default REST repositories', () => {
    render(
      <RepositoryProvider>
        <RepositoryConsumer />
      </RepositoryProvider>
    );

    expect(screen.getByText('default repositories')).toBeInTheDocument();
    expect(mockCreateRestRepositories).toHaveBeenCalledTimes(1);
  });

  it('allows custom repositories to be injected', () => {
    const repositories = createMockRepositories('custom');

    render(
      <RepositoryProvider repositories={repositories}>
        <RepositoryConsumer expected={repositories} />
      </RepositoryProvider>
    );

    expect(screen.getByText('custom repositories')).toBeInTheDocument();
  });

  it('throws a clear error outside the provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<OutsideProviderConsumer />)).toThrow(
      'useRepositories must be used within a RepositoryProvider.'
    );

    consoleError.mockRestore();
  });
});
