import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RepositoryProvider, useRepositories } from './RepositoryContext';
import type { Repositories } from './contracts';
import { SQLITE_PERSISTENCE_FLAG } from './runtimeRepositories';

function createMockRepositories(label = 'mock'): Repositories & { __label: string } {
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

  return <div>{(repositories as Repositories & { __label?: string }).__label ?? 'missing label'}</div>;
}

function RepositoryIdentityConsumer({ onRepository }: { onRepository: (repositories: Repositories) => void }) {
  const repositories = useRepositories();
  onRepository(repositories);
  return <div>repository identity captured</div>;
}

function OutsideProviderConsumer() {
  useRepositories();
  return <div>unreachable</div>;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div>{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

describe('RepositoryProvider', () => {
  it('supplies REST repositories by default after runtime selection resolves', async () => {
    const createRestRepositories = jest.fn(() => createMockRepositories('rest'));

    render(
      <RepositoryProvider runtimeOptions={{
        env: {},
        getPlatform: () => 'web',
        isNativePlatform: () => false,
        createRestRepositories,
      }}>
        <RepositoryConsumer />
      </RepositoryProvider>
    );

    expect(screen.queryByText('rest')).not.toBeInTheDocument();
    expect(await screen.findByText('rest')).toBeInTheDocument();
    expect(createRestRepositories).toHaveBeenCalledTimes(1);
  });

  it('keeps default repositories stable across rerenders', async () => {
    const seenRepositories: Repositories[] = [];
    const createRestRepositories = jest.fn(() => createMockRepositories('rest'));
    const runtimeOptions = {
      env: {},
      getPlatform: () => 'web',
      isNativePlatform: () => false,
      createRestRepositories,
    };

    const { rerender } = render(
      <RepositoryProvider runtimeOptions={runtimeOptions}>
        <RepositoryIdentityConsumer onRepository={repositories => seenRepositories.push(repositories)} />
      </RepositoryProvider>
    );

    await screen.findByText('repository identity captured');

    rerender(
      <RepositoryProvider runtimeOptions={runtimeOptions}>
        <RepositoryIdentityConsumer onRepository={repositories => seenRepositories.push(repositories)} />
      </RepositoryProvider>
    );

    await waitFor(() => expect(seenRepositories.length).toBeGreaterThanOrEqual(2));
    expect(createRestRepositories).toHaveBeenCalledTimes(1);
    expect(seenRepositories[1]).toBe(seenRepositories[0]);
  });

  it('allows custom repositories to be injected synchronously', () => {
    const repositories = createMockRepositories('custom');

    render(
      <RepositoryProvider repositories={repositories}>
        <RepositoryConsumer expected={repositories} />
      </RepositoryProvider>
    );

    expect(screen.getByText('custom repositories')).toBeInTheDocument();
  });

  it('initializes SQLite before exposing repositories', async () => {
    const sqlite = createMockRepositories('sqlite');
    const events: string[] = [];
    const service = {
      initialize: jest.fn(async () => {
        events.push('initialize');
      }),
      close: jest.fn(async () => undefined),
    };

    render(
      <RepositoryProvider runtimeOptions={{
        env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
        getPlatform: () => 'ios',
        isNativePlatform: () => true,
        createSQLiteService: () => service as never,
        createSQLiteRepositories: () => {
          events.push('create-repositories');
          return sqlite;
        },
      }}>
        <RepositoryConsumer />
      </RepositoryProvider>
    );

    expect(screen.queryByText('sqlite')).not.toBeInTheDocument();
    expect(await screen.findByText('sqlite')).toBeInTheDocument();
    expect(events).toEqual(['initialize', 'create-repositories']);
  });

  it('closes provider-created SQLite selection on unmount', async () => {
    const service = {
      initialize: jest.fn(async () => undefined),
      close: jest.fn(async () => undefined),
    };

    const { unmount } = render(
      <RepositoryProvider runtimeOptions={{
        env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
        getPlatform: () => 'ios',
        isNativePlatform: () => true,
        createSQLiteService: () => service as never,
        createSQLiteRepositories: () => createMockRepositories('sqlite'),
      }}>
        <RepositoryConsumer />
      </RepositoryProvider>
    );

    expect(await screen.findByText('sqlite')).toBeInTheDocument();

    unmount();

    expect(service.close).toHaveBeenCalledTimes(1);
  });

  it('does not close injected custom repositories on unmount', () => {
    const repositories = createMockRepositories('custom');
    const close = jest.fn();

    const { unmount } = render(
      <RepositoryProvider repositories={repositories}>
        <RepositoryConsumer expected={repositories} />
      </RepositoryProvider>
    );

    unmount();

    expect(close).not.toHaveBeenCalled();
  });

  it('does not double-close provider-created selection across rerenders', async () => {
    const service = {
      initialize: jest.fn(async () => undefined),
      close: jest.fn(async () => undefined),
    };
    const stableRuntimeOptions = {
      env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
      getPlatform: () => 'ios',
      isNativePlatform: () => true,
      createSQLiteService: () => service as never,
      createSQLiteRepositories: () => createMockRepositories('sqlite'),
    };

    const { rerender, unmount } = render(
      <RepositoryProvider runtimeOptions={stableRuntimeOptions}>
        <RepositoryConsumer />
      </RepositoryProvider>
    );

    expect(await screen.findByText('sqlite')).toBeInTheDocument();

    rerender(
      <RepositoryProvider runtimeOptions={stableRuntimeOptions}>
        <RepositoryConsumer />
      </RepositoryProvider>
    );
    rerender(
      <RepositoryProvider runtimeOptions={stableRuntimeOptions}>
        <RepositoryConsumer />
      </RepositoryProvider>
    );

    unmount();

    expect(service.close).toHaveBeenCalledTimes(1);
  });

  it('closes async SQLite selection if initialization resolves after unmount without setting state', async () => {
    let resolveInitialize: (() => void) | undefined;
    const service = {
      initialize: jest.fn(() => new Promise<void>(resolve => {
        resolveInitialize = resolve;
      })),
      close: jest.fn(async () => undefined),
    };

    const { unmount } = render(
      <RepositoryProvider runtimeOptions={{
        env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
        getPlatform: () => 'ios',
        isNativePlatform: () => true,
        createSQLiteService: () => service as never,
        createSQLiteRepositories: () => createMockRepositories('sqlite'),
      }}>
        <RepositoryConsumer />
      </RepositoryProvider>
    );

    expect(screen.queryByText('sqlite')).not.toBeInTheDocument();

    unmount();
    await act(async () => {
      resolveInitialize?.();
    });

    await waitFor(() => expect(service.close).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('sqlite')).not.toBeInTheDocument();
  });

  it('surfaces SQLite initialization failure instead of falling back to REST', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const createRestRepositories = jest.fn(() => createMockRepositories('rest'));

    render(
      <ErrorBoundary>
        <RepositoryProvider runtimeOptions={{
          env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
          getPlatform: () => 'ios',
          isNativePlatform: () => true,
          createRestRepositories,
          createSQLiteService: () => ({
            initialize: jest.fn(async () => {
              throw new Error('sqlite failed');
            }),
            close: jest.fn(async () => undefined),
          }) as never,
          createSQLiteRepositories: jest.fn(() => createMockRepositories('sqlite')),
        }}>
          <RepositoryConsumer />
        </RepositoryProvider>
      </ErrorBoundary>
    );

    expect(await screen.findByText('sqlite failed')).toBeInTheDocument();
    expect(createRestRepositories).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('throws a clear error outside the provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<OutsideProviderConsumer />)).toThrow(
      'useRepositories must be used within a RepositoryProvider.'
    );

    consoleError.mockRestore();
  });
});
