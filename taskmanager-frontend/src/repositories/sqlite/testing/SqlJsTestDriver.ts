import type { SqliteDriver, SqliteParams } from '../types';

type SqlJsDatabase = {
  exec(sql: string, params?: SqliteParams): Array<{ columns: string[]; values: unknown[][] }>;
  run(sql: string, params?: SqliteParams): void;
  close(): void;
};

type SqlJsModule = {
  Database: new () => SqlJsDatabase;
};

type InitSqlJs = () => Promise<SqlJsModule>;

export class SqlJsTestDriver implements SqliteDriver {
  private db: SqlJsDatabase | null = null;

  async open(): Promise<void> {
    if (this.db) return;
    const initSqlJs = require('sql.js/dist/sql-asm.js') as InitSqlJs;
    const SQL = await initSqlJs();
    this.db = new SQL.Database();
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  async execute(sql: string): Promise<void> {
    this.requireDb().exec(sql);
  }

  async run(sql: string, params: SqliteParams = []): Promise<void> {
    this.requireDb().run(sql, params);
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: SqliteParams = [],
  ): Promise<T[]> {
    const result = this.requireDb().exec(sql, params)[0];
    if (!result) return [];
    return result.values.map(row => {
      const item: Record<string, unknown> = {};
      result.columns.forEach((column, index) => {
        item[column] = row[index];
      });
      return item as T;
    });
  }

  async beginTransaction(): Promise<void> {
    await this.execute('BEGIN');
  }

  async commitTransaction(): Promise<void> {
    await this.execute('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    await this.execute('ROLLBACK');
  }

  private requireDb(): SqlJsDatabase {
    if (!this.db) throw new Error('SQL.js test database is not open.');
    return this.db;
  }
}
