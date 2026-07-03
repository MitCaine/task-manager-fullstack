import type {
  CreateTaskInput,
  EntityId,
  StatusId,
  Task,
  UpdateTaskInput,
} from '../../domain/models';
import type { RepositoryOperationOptions, TaskRepository } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import {
  groupTaskTagsByTaskId,
  groupRecurrenceIdsByTaskId,
  mapTaskRowToDomain,
  type TaskRow,
  type TaskRecurrenceRow,
  type TaskTagRow,
} from './mappers';
import { dbForOperation } from './repositoryUtils';
import type { SqliteDriver, SQLiteTransactionContext } from './types';
import { generateEntityId } from './utils';

export class SQLiteTaskRepository implements TaskRepository<SQLiteTransactionContext> {
  constructor(private readonly service: SQLiteDatabaseService) {}

  async list(options?: RepositoryOperationOptions<SQLiteTransactionContext>): Promise<Task[]> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<TaskRow>(`
      SELECT id, title, description, date_time_scheduled, end_date_time_scheduled,
             status_id, schedule_id, project_id, priority, created_at, updated_at
      FROM tasks
      ORDER BY date_time_scheduled IS NULL, date_time_scheduled, rowid
    `);
    return this.hydrateTasks(db, rows);
  }

  async get(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Task> {
    const db = await dbForOperation(this.service, options);
    const task = await this.getRequiredWithDb(db, id);
    return task;
  }

  async create(
    input: CreateTaskInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Task> {
    const db = await dbForOperation(this.service, options);
    const id = generateEntityId();

    await db.run(`
      INSERT INTO tasks (
        id, title, description, date_time_scheduled, end_date_time_scheduled,
        status_id, project_id, priority
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      input.title,
      input.description ?? '',
      input.dateTimeScheduled ?? null,
      input.endDateTimeScheduled ?? null,
      input.statusId ?? 'not_started',
      input.projectId ?? null,
      input.priority ?? null,
    ]);

    return this.getRequiredWithDb(db, id);
  }

  async update(
    id: EntityId,
    input: UpdateTaskInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Task> {
    if (input.recurrenceRuleId !== undefined) {
      throw new Error('SQLiteTaskRepository does not persist recurrenceRuleId; use the recurrence repository boundary.');
    }

    const db = await dbForOperation(this.service, options);
    const existing = await this.getRequiredWithDb(db, id);

    await db.run(`
      UPDATE tasks
      SET title = ?,
          description = ?,
          date_time_scheduled = ?,
          end_date_time_scheduled = ?,
          status_id = ?,
          project_id = ?,
          priority = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      input.title,
      input.description !== undefined ? input.description : existing.description,
      input.dateTimeScheduled !== undefined ? input.dateTimeScheduled : existing.dateTimeScheduled ?? null,
      input.endDateTimeScheduled !== undefined ? input.endDateTimeScheduled : existing.endDateTimeScheduled ?? null,
      input.statusId !== undefined ? input.statusId ?? 'not_started' : existing.statusId ?? 'not_started',
      input.projectId !== undefined ? input.projectId : existing.projectId ?? null,
      input.priority !== undefined ? input.priority : existing.priority ?? null,
      id,
    ]);

    return this.getRequiredWithDb(db, id);
  }

  async updateStatus(
    id: EntityId,
    statusId: StatusId | null,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Task> {
    const db = await dbForOperation(this.service, options);

    await db.run(`
      UPDATE tasks
      SET status_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [statusId ?? 'not_started', id]);

    return this.getRequiredWithDb(db, id);
  }

  async delete(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<void> {
    const db = await dbForOperation(this.service, options);
    await db.run('DELETE FROM tasks WHERE id = ?', [id]);
  }

  async addTag(
    taskId: EntityId,
    tagId: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Task> {
    const db = await dbForOperation(this.service, options);
    await db.run(`
      INSERT OR IGNORE INTO task_tags (task_id, tag_id)
      VALUES (?, ?)
    `, [taskId, tagId]);
    return this.getRequiredWithDb(db, taskId);
  }

  async removeTag(
    taskId: EntityId,
    tagId: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Task> {
    const db = await dbForOperation(this.service, options);
    await db.run('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?', [taskId, tagId]);
    return this.getRequiredWithDb(db, taskId);
  }

  private async getRequiredWithDb(db: SqliteDriver, id: EntityId): Promise<Task> {
    const rows = await db.query<TaskRow>(`
      SELECT id, title, description, date_time_scheduled, end_date_time_scheduled,
             status_id, schedule_id, project_id, priority, created_at, updated_at
      FROM tasks
      WHERE id = ?
    `, [id]);

    if (!rows[0]) throw new Error(`Task ${id} not found.`);
    return (await this.hydrateTasks(db, rows))[0];
  }

  private async hydrateTasks(db: SqliteDriver, rows: TaskRow[]): Promise<Task[]> {
    if (rows.length === 0) return [];

    const taskIds = rows.map(row => row.id);
    const placeholders = taskIds.map(() => '?').join(', ');
    const tagRows = await db.query<TaskTagRow>(`
      SELECT task_tags.task_id,
             tags.id AS tag_id,
             tags.title,
             tags.color,
             tags.created_at,
             tags.updated_at
      FROM task_tags
      INNER JOIN tags ON tags.id = task_tags.tag_id
      WHERE task_tags.task_id IN (${placeholders})
      ORDER BY task_tags.task_id, task_tags.created_at, tags.rowid
    `, taskIds);
    const tagsByTaskId = groupTaskTagsByTaskId(tagRows);
    const recurrenceRows = await db.query<TaskRecurrenceRow>(`
      SELECT task_id, id AS recurrence_rule_id
      FROM recurrence_rules
      WHERE task_id IN (${placeholders})
      ORDER BY task_id
    `, taskIds);
    const recurrenceIdsByTaskId = groupRecurrenceIdsByTaskId(recurrenceRows);

    return rows.map(row => mapTaskRowToDomain(
      row,
      tagsByTaskId.get(row.id) ?? [],
      recurrenceIdsByTaskId.get(row.id) ?? null,
    ));
  }
}
