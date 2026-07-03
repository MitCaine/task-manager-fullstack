import { runMigrations } from './migrations';
import type { SqliteDriver, SQLiteTransactionContext, SQLiteTransactionWork } from './types';

export type SQLiteDatabaseServiceOptions = {
  driver: SqliteDriver;
};

export class SQLiteDatabaseService {
  private readonly driver: SqliteDriver;
  private initializePromise: Promise<SqliteDriver> | null = null;
  private transactionQueue: Promise<unknown> = Promise.resolve();

  constructor({ driver }: SQLiteDatabaseServiceOptions) {
    this.driver = driver;
  }

  async initialize(): Promise<SqliteDriver> {
    if (!this.initializePromise) {
      this.initializePromise = this.openAndMigrate().catch(error => {
        this.initializePromise = null;
        throw error;
      });
    }
    return this.initializePromise;
  }

  async getDb(): Promise<SqliteDriver> {
    return this.initialize();
  }

  async close(): Promise<void> {
    await this.initializePromise?.catch(() => undefined);
    await this.driver.close();
    this.initializePromise = null;
    this.transactionQueue = Promise.resolve();
  }

  async transaction<T>(work: SQLiteTransactionWork<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const db = await this.initialize();
      const tx: SQLiteTransactionContext = { db, inTransaction: true };

      await db.beginTransaction();
      try {
        const result = await work(tx);
        await db.commitTransaction();
        return result;
      } catch (error) {
        await db.rollbackTransaction();
        throw error;
      }
    };

    const queued = this.transactionQueue.then(run, run);
    this.transactionQueue = queued.catch(() => undefined);
    return queued;
  }

  private async openAndMigrate(): Promise<SqliteDriver> {
    await this.driver.open();
    await this.applyPragmas();
    await runMigrations(this.driver);
    return this.driver;
  }

  private async applyPragmas(): Promise<void> {
    await this.driver.execute('PRAGMA foreign_keys = ON');
    await this.driver.execute('PRAGMA journal_mode = WAL');
    await this.driver.execute('PRAGMA synchronous = NORMAL');
    await this.driver.execute('PRAGMA busy_timeout = 5000');
  }
}
