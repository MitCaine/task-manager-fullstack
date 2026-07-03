import type { CreateReminderInput, EntityId, Reminder } from '../../domain/models';
import type { ReminderRepository, RepositoryOperationOptions } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import { mapReminderRowToDomain, type ReminderRow } from './mappers';
import { dbForOperation } from './repositoryUtils';
import type { SQLiteTransactionContext } from './types';
import { generateEntityId } from './utils';

export class SQLiteReminderRepository implements ReminderRepository<SQLiteTransactionContext> {
  constructor(private readonly service: SQLiteDatabaseService) {}

  async listByTask(
    taskId: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Reminder[]> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<ReminderRow>(`
      SELECT id, task_id, due_date, notification_method, message, created_at, updated_at
      FROM reminders
      WHERE task_id = ?
      ORDER BY due_date, rowid
    `, [taskId]);
    return rows.map(mapReminderRowToDomain);
  }

  async create(
    input: CreateReminderInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Reminder> {
    const db = await dbForOperation(this.service, options);
    const id = generateEntityId();

    await db.run(`
      INSERT INTO reminders (id, task_id, due_date, notification_method, message)
      VALUES (?, ?, ?, ?, ?)
    `, [
      id,
      input.taskId,
      input.dueDate,
      input.notificationMethod ?? 'browser',
      input.message ?? null,
    ]);

    return this.getRequired(id, options);
  }

  async updateDueDate(
    id: EntityId,
    dueDate: string,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Reminder> {
    const db = await dbForOperation(this.service, options);

    await db.run(`
      UPDATE reminders
      SET due_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [dueDate, id]);

    return this.getRequired(id, options);
  }

  async delete(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<void> {
    const db = await dbForOperation(this.service, options);
    await db.run('DELETE FROM reminders WHERE id = ?', [id]);
  }

  private async getRequired(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Reminder> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<ReminderRow>(`
      SELECT id, task_id, due_date, notification_method, message, created_at, updated_at
      FROM reminders
      WHERE id = ?
    `, [id]);

    if (!rows[0]) throw new Error(`Reminder ${id} not found.`);
    return mapReminderRowToDomain(rows[0]);
  }
}
