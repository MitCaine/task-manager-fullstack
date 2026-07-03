import { Capacitor } from '@capacitor/core';
import type { Repositories } from './contracts';
import { createRestRepositories as defaultCreateRestRepositories } from './api';
import {
  CapacitorSQLiteDriver,
  createSQLiteRepositories as defaultCreateSQLiteRepositories,
  SQLiteDatabaseService,
} from './sqlite';

export const SQLITE_PERSISTENCE_FLAG = 'REACT_APP_ENABLE_SQLITE_PERSISTENCE';
export const SQLITE_RUNTIME_DATABASE = 'task_manager_sqlite';

export type RepositoryRuntimeKind = 'rest' | 'sqlite';

export type RepositoryRuntimeSelection = {
  kind: RepositoryRuntimeKind;
  repositories: Repositories;
  close: () => Promise<void>;
};

export type RepositoryRuntimeOptions = {
  env?: Record<string, string | undefined>;
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
  createRestRepositories?: () => Repositories;
  createSQLiteService?: () => SQLiteDatabaseService;
  createSQLiteRepositories?: (service: SQLiteDatabaseService) => Repositories;
};

const SUPPORTED_SQLITE_NATIVE_PLATFORMS = new Set(['ios']);

let defaultRuntimeSelectionPromise: Promise<RepositoryRuntimeSelection> | null = null;

export function isSQLitePersistenceRequested(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[SQLITE_PERSISTENCE_FLAG] === 'true';
}

export function isSupportedSQLiteNativePlatform({
  getPlatform = () => Capacitor.getPlatform(),
  isNativePlatform = () => Capacitor.isNativePlatform(),
}: Pick<RepositoryRuntimeOptions, 'getPlatform' | 'isNativePlatform'> = {}): boolean {
  return isNativePlatform() && SUPPORTED_SQLITE_NATIVE_PLATFORMS.has(getPlatform());
}

export function shouldUseSQLiteRepositories(options: RepositoryRuntimeOptions = {}): boolean {
  return isSQLitePersistenceRequested(options.env ?? process.env)
    && isSupportedSQLiteNativePlatform(options);
}

export async function createRuntimeRepositories(
  options: RepositoryRuntimeOptions = {},
): Promise<RepositoryRuntimeSelection> {
  if (!shouldUseSQLiteRepositories(options)) {
    return createRestRuntimeSelection(options.createRestRepositories);
  }

  const service = (options.createSQLiteService ?? createDefaultSQLiteService)();
  await service.initialize();

  return {
    kind: 'sqlite',
    repositories: (options.createSQLiteRepositories ?? defaultCreateSQLiteRepositories)(service),
    close: () => service.close(),
  };
}

export function createRestRuntimeSelection(
  createRestRepositories = defaultCreateRestRepositories,
): RepositoryRuntimeSelection {
  return {
    kind: 'rest',
    repositories: createRestRepositories(),
    close: async () => undefined,
  };
}

export function createDefaultRuntimeRepositoriesSyncIfReady(): RepositoryRuntimeSelection | null {
  if (shouldUseSQLiteRepositories()) return null;
  return createRestRuntimeSelection();
}

export function getDefaultRuntimeRepositories(): Promise<RepositoryRuntimeSelection> {
  if (!defaultRuntimeSelectionPromise) {
    defaultRuntimeSelectionPromise = createRuntimeRepositories();
  }
  return defaultRuntimeSelectionPromise;
}

export async function resetDefaultRuntimeRepositoriesForTests(): Promise<void> {
  const current = defaultRuntimeSelectionPromise;
  defaultRuntimeSelectionPromise = null;
  if (!current) return;

  await current.then(selection => selection.close()).catch(() => undefined);
}

function createDefaultSQLiteService(): SQLiteDatabaseService {
  return new SQLiteDatabaseService({
    driver: new CapacitorSQLiteDriver({ database: SQLITE_RUNTIME_DATABASE }),
  });
}
