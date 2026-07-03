import type { Repositories } from './contracts';
import {
  createRuntimeRepositories,
  isSQLitePersistenceRequested,
  shouldUseSQLiteRepositories,
  SQLITE_PERSISTENCE_FLAG,
  SQLITE_RUNTIME_DATABASE,
} from './runtimeRepositories';
import type { SQLiteDatabaseService } from './sqlite';

function createMockRepositories(label: string): Repositories & { __label: string } {
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

function createMockSQLiteService() {
  return {
    initialize: jest.fn(async () => ({})),
    close: jest.fn(async () => undefined),
  } as unknown as SQLiteDatabaseService & {
    initialize: jest.Mock;
    close: jest.Mock;
  };
}

describe('runtime repository selection', () => {
  it('uses the project REACT_APP flag convention and keeps smoke gating separate', () => {
    expect(SQLITE_PERSISTENCE_FLAG).toBe('REACT_APP_ENABLE_SQLITE_PERSISTENCE');
    expect(SQLITE_PERSISTENCE_FLAG).not.toBe('REACT_APP_ENABLE_SQLITE_SMOKE');
    expect(SQLITE_RUNTIME_DATABASE).toBe('task_manager_sqlite');
    expect(isSQLitePersistenceRequested({ [SQLITE_PERSISTENCE_FLAG]: 'true' })).toBe(true);
  });

  it('selects REST by default', async () => {
    const rest = createMockRepositories('rest');
    const sqlite = createMockRepositories('sqlite');
    const sqliteService = createMockSQLiteService();

    const selection = await createRuntimeRepositories({
      env: {},
      getPlatform: () => 'web',
      isNativePlatform: () => false,
      createRestRepositories: jest.fn(() => rest),
      createSQLiteService: jest.fn(() => sqliteService),
      createSQLiteRepositories: jest.fn(() => sqlite),
    });

    expect(selection.kind).toBe('rest');
    expect(selection.repositories).toBe(rest);
    expect((selection.repositories as Repositories & { __label: string }).__label).toBe('rest');
    expect(sqliteService.initialize).not.toHaveBeenCalled();
  });

  it('selects REST on web when SQLite flag is disabled', async () => {
    const selection = await createRuntimeRepositories({
      env: {},
      getPlatform: () => 'web',
      isNativePlatform: () => false,
      createRestRepositories: () => createMockRepositories('rest'),
    });

    expect(selection.kind).toBe('rest');
  });

  it('selects REST on web even when SQLite flag is enabled', async () => {
    const selection = await createRuntimeRepositories({
      env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
      getPlatform: () => 'web',
      isNativePlatform: () => false,
      createRestRepositories: () => createMockRepositories('rest'),
      createSQLiteService: jest.fn(() => createMockSQLiteService()),
    });

    expect(selection.kind).toBe('rest');
  });

  it('selects SQLite only when the flag is enabled on a supported native platform', async () => {
    const rest = createMockRepositories('rest');
    const sqlite = createMockRepositories('sqlite');
    const sqliteService = createMockSQLiteService();
    const events: string[] = [];

    const selection = await createRuntimeRepositories({
      env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
      getPlatform: () => 'ios',
      isNativePlatform: () => true,
      createRestRepositories: jest.fn(() => rest),
      createSQLiteService: jest.fn(() => {
        events.push('service:create');
        return sqliteService;
      }),
      createSQLiteRepositories: jest.fn(() => {
        events.push('repositories:create');
        return sqlite;
      }),
    });

    expect(selection.kind).toBe('sqlite');
    expect(selection.repositories).toBe(sqlite);
    expect((selection.repositories as Repositories & { __label: string }).__label).toBe('sqlite');
    expect(sqliteService.initialize).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['service:create', 'repositories:create']);
  });

  it('does not select SQLite on unsupported native platforms', () => {
    expect(shouldUseSQLiteRepositories({
      env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
      getPlatform: () => 'android',
      isNativePlatform: () => true,
    })).toBe(false);
  });

  it('does not expose SQLite repositories if initialization fails', async () => {
    const sqliteService = createMockSQLiteService();
    sqliteService.initialize.mockRejectedValueOnce(new Error('sqlite init failed'));
    const createSQLiteRepositories = jest.fn(() => createMockRepositories('sqlite'));

    await expect(createRuntimeRepositories({
      env: { [SQLITE_PERSISTENCE_FLAG]: 'true' },
      getPlatform: () => 'ios',
      isNativePlatform: () => true,
      createSQLiteService: () => sqliteService,
      createSQLiteRepositories,
    })).rejects.toThrow('sqlite init failed');

    expect(createSQLiteRepositories).not.toHaveBeenCalled();
  });
});
