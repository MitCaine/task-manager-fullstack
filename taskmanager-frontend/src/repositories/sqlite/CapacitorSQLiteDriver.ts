import { CapacitorSQLite } from '@capacitor-community/sqlite';
import type { SqliteDriver, SqliteParams } from './types';

export type CapacitorSQLiteDriverOptions = {
  database: string;
  readonly?: boolean;
};

export class CapacitorSQLiteDriver implements SqliteDriver {
  private readonly database: string;
  private readonly readonly: boolean;

  constructor({
    database,
    readonly = false,
  }: CapacitorSQLiteDriverOptions) {
    this.database = database;
    this.readonly = readonly;
  }

  async open(): Promise<void> {
    await CapacitorSQLite.open({
      database: this.database,
      readonly: this.readonly,
    });
  }

  async close(): Promise<void> {
    await CapacitorSQLite.close({ database: this.database });
  }

  async execute(sql: string): Promise<void> {
    await CapacitorSQLite.execute({ database: this.database, statements: sql });
  }

  async run(sql: string, params: SqliteParams = []): Promise<void> {
    await CapacitorSQLite.run({
      database: this.database,
      statement: sql,
      values: [...params],
    });
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: SqliteParams = [],
  ): Promise<T[]> {
    const result = await CapacitorSQLite.query({
      database: this.database,
      statement: sql,
      values: [...params],
    });
    return (result.values ?? []) as T[];
  }

  async beginTransaction(): Promise<void> {
    await CapacitorSQLite.beginTransaction({ database: this.database });
  }

  async commitTransaction(): Promise<void> {
    await CapacitorSQLite.commitTransaction({ database: this.database });
  }

  async rollbackTransaction(): Promise<void> {
    await CapacitorSQLite.rollbackTransaction({ database: this.database });
  }
}
