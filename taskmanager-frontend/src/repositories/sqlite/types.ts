export type SqliteValue = string | number | null;
export type SqliteParams = readonly SqliteValue[];
export type SqliteExecuteOptions = {
  transaction?: boolean;
};

export interface SqliteDriver {
  open(): Promise<void>;
  close(): Promise<void>;
  execute(sql: string, options?: SqliteExecuteOptions): Promise<void>;
  run(sql: string, params?: SqliteParams): Promise<void>;
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: SqliteParams,
  ): Promise<T[]>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
}

export type SQLiteTransactionContext = {
  readonly db: SqliteDriver;
  readonly inTransaction: true;
};

export type SQLiteTransactionWork<T> = (tx: SQLiteTransactionContext) => Promise<T>;
