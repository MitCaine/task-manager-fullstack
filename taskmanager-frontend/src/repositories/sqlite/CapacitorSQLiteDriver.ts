import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import type { SqliteDriver, SqliteExecuteOptions, SqliteParams } from './types';

export type CapacitorSQLiteDriverOptions = {
  database: string;
  readonly?: boolean;
  connection?: CapacitorSQLiteConnectionLike;
};

type CapacitorSQLiteResult = {
  result?: boolean;
};

type CapacitorSQLiteValues = {
  values?: Record<string, unknown>[];
};

export type CapacitorSQLiteConnectionLike = {
  createConnection(
    database: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readonly: boolean,
  ): Promise<CapacitorSQLiteDBConnectionLike>;
  retrieveConnection(database: string, readonly: boolean): Promise<CapacitorSQLiteDBConnectionLike>;
  closeConnection(database: string, readonly: boolean): Promise<void>;
  checkConnectionsConsistency(): Promise<CapacitorSQLiteResult>;
};

export type CapacitorSQLiteDBConnectionLike = {
  open(): Promise<void>;
  isDBOpen(): Promise<CapacitorSQLiteResult>;
  close(): Promise<void>;
  execute(statements: string, transaction?: boolean): Promise<unknown>;
  run(statement: string, values?: SqliteParams): Promise<unknown>;
  query(statement: string, values?: SqliteParams): Promise<CapacitorSQLiteValues>;
  beginTransaction(): Promise<unknown>;
  commitTransaction(): Promise<unknown>;
  rollbackTransaction(): Promise<unknown>;
};

export class CapacitorSQLiteDriver implements SqliteDriver {
  private readonly database: string;
  private readonly readonly: boolean;
  private readonly connectionManager: CapacitorSQLiteConnectionLike;
  private connection: CapacitorSQLiteDBConnectionLike | null = null;

  constructor({
    database,
    readonly = false,
    connection,
  }: CapacitorSQLiteDriverOptions) {
    this.database = database;
    this.readonly = readonly;
    this.connectionManager = connection ?? new SQLiteConnection(CapacitorSQLite);
  }

  async open(): Promise<void> {
    const connection = await this.getOrCreateConnection();
    const consistency = await this.connectionManager.checkConnectionsConsistency();
    if (consistency.result === false) {
      throw new Error('Capacitor SQLite connection state is inconsistent.');
    }

    const openState = await connection.isDBOpen();
    if (!openState.result) {
      await connection.open();
    }
  }

  async close(): Promise<void> {
    if (!this.connection) return;

    try {
      const openState = await this.connection.isDBOpen();
      if (openState.result) {
        await this.connection.close();
      }
    } finally {
      await this.connectionManager.closeConnection(this.database, this.readonly);
      this.connection = null;
    }
  }

  async execute(sql: string, options: SqliteExecuteOptions = {}): Promise<void> {
    await this.requireConnection().execute(sql, options.transaction);
  }

  async run(sql: string, params: SqliteParams = []): Promise<void> {
    await this.requireConnection().run(sql, [...params]);
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: SqliteParams = [],
  ): Promise<T[]> {
    const result = await this.requireConnection().query(sql, [...params]);
    return (result.values ?? []) as T[];
  }

  async beginTransaction(): Promise<void> {
    await this.requireConnection().beginTransaction();
  }

  async commitTransaction(): Promise<void> {
    await this.requireConnection().commitTransaction();
  }

  async rollbackTransaction(): Promise<void> {
    await this.requireConnection().rollbackTransaction();
  }

  private async getOrCreateConnection(): Promise<CapacitorSQLiteDBConnectionLike> {
    if (this.connection) return this.connection;

    try {
      this.connection = await this.connectionManager.retrieveConnection(this.database, this.readonly);
    } catch {
      this.connection = await this.connectionManager.createConnection(
        this.database,
        false,
        'no-encryption',
        1,
        this.readonly,
      );
    }

    return this.connection;
  }

  private requireConnection(): CapacitorSQLiteDBConnectionLike {
    if (!this.connection) {
      throw new Error('Capacitor SQLite database is not open.');
    }
    return this.connection;
  }
}
