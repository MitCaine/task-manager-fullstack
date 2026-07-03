import type { RepositoryOperationOptions } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import type { SqliteDriver, SQLiteTransactionContext } from './types';

export async function dbForOperation(
  service: SQLiteDatabaseService,
  options?: RepositoryOperationOptions<SQLiteTransactionContext>,
): Promise<SqliteDriver> {
  return options?.tx?.db ?? service.getDb();
}
