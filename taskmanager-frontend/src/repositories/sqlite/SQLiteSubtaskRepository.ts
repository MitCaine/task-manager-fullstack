import type { CreateSubtaskInput, EntityId, StatusId, Subtask, UpdateSubtaskInput } from '../../domain/models';
import type { RepositoryOperationOptions, SubtaskRepository } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import { mapSubtaskRowToDomain, type SubtaskRow } from './mappers';
import { dbForOperation } from './repositoryUtils';
import type { SQLiteTransactionContext } from './types';
import { generateEntityId } from './utils';

export class SQLiteSubtaskRepository implements SubtaskRepository<SQLiteTransactionContext> {
  constructor(private readonly service: SQLiteDatabaseService) {}

  async listByTask(
    taskId: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Subtask[]> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<SubtaskRow>(`
      SELECT id, parent_task_id, title, status_id, date_time_scheduled, created_at, updated_at
      FROM subtasks
      WHERE parent_task_id = ?
      ORDER BY rowid
    `, [taskId]);
    return rows.map(mapSubtaskRowToDomain);
  }

  async create(
    input: CreateSubtaskInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Subtask> {
    const db = await dbForOperation(this.service, options);
    const id = generateEntityId();

    await db.run(`
      INSERT INTO subtasks (id, parent_task_id, title, status_id, date_time_scheduled)
      VALUES (?, ?, ?, ?, ?)
    `, [
      id,
      input.parentTaskId,
      input.title,
      input.statusId ?? 'not_started',
      input.dateTimeScheduled ?? null,
    ]);

    return this.getRequired(id, options);
  }

  async update(
    id: EntityId,
    input: UpdateSubtaskInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Subtask> {
    const db = await dbForOperation(this.service, options);
    const existing = await this.getRequired(id, options);

    const nextStatusId =
        input.statusId !== undefined ? input.statusId ?? 'not_started' : existing.statusId ?? 'not_started';

    const nextDateTimeScheduled = input.dateTimeScheduled !== undefined ? input.dateTimeScheduled
        : existing.dateTimeScheduled ?? null;

    await db.run(`
      UPDATE subtasks
      SET title = ?,
          status_id = ?,
          date_time_scheduled = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      input.title,
      nextStatusId,
      nextDateTimeScheduled,
      id,
    ]);

    return this.getRequired(id, options);
  }

  async updateStatus(
    id: EntityId,
    statusId: StatusId | null,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Subtask> {
    const db = await dbForOperation(this.service, options);

    await db.run(`
      UPDATE subtasks
      SET status_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [statusId ?? 'not_started', id]);

    return this.getRequired(id, options);
  }

  async delete(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<void> {
    const db = await dbForOperation(this.service, options);
    await db.run('DELETE FROM subtasks WHERE id = ?', [id]);
  }

  private async getRequired(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Subtask> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<SubtaskRow>(`
      SELECT id, parent_task_id, title, status_id, date_time_scheduled, created_at, updated_at
      FROM subtasks
      WHERE id = ?
    `, [id]);

    if (!rows[0]) throw new Error(`Subtask ${id} not found.`);
    return mapSubtaskRowToDomain(rows[0]);
  }
}
