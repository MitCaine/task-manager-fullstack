import type { EntityId, RecurrenceIntervalInput, RecurrenceRule, Task } from '../../domain/models';
import type { RecurrenceRepository, RepositoryOperationOptions } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import { mapRecurrenceRuleRowToDomain, type RecurrenceRuleRow } from './mappers';
import { dbForOperation } from './repositoryUtils';
import { SQLiteTaskRepository } from './SQLiteTaskRepository';
import type { SQLiteTransactionContext } from './types';
import { generateEntityId } from './utils';

const VALID_INTERVAL_UNITS = new Set(['day', 'week', 'month', 'year']);

export class SQLiteRecurrenceRepository implements RecurrenceRepository<SQLiteTransactionContext> {
  private readonly tasks: SQLiteTaskRepository;

  constructor(private readonly service: SQLiteDatabaseService) {
    this.tasks = new SQLiteTaskRepository(service);
  }

  async getByTask(
    taskId: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<RecurrenceRule> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<RecurrenceRuleRow>(`
      SELECT id, task_id, frequency, interval_unit, interval_value, times_of_recurrence,
             start_date_time, end_date_time, created_at, updated_at
      FROM recurrence_rules
      WHERE task_id = ?
    `, [taskId]);

    if (!rows[0]) throw new Error(`Recurrence rule for task ${taskId} not found.`);
    return mapRecurrenceRuleRowToDomain(rows[0]);
  }

  async setForTask(
    taskId: EntityId,
    interval: RecurrenceIntervalInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Task> {
    const db = await dbForOperation(this.service, options);

    if (interval === null) {
      await db.run('DELETE FROM recurrence_rules WHERE task_id = ?', [taskId]);
      return this.tasks.get(taskId, options);
    }

    if (!VALID_INTERVAL_UNITS.has(interval.intervalUnit)) {
      throw new Error('intervalUnit must be day, week, month, or year.');
    }
    if (!Number.isInteger(interval.intervalValue) || interval.intervalValue <= 0) {
      throw new Error('intervalValue must be a positive integer.');
    }

    const task = await this.tasks.get(taskId, options);
    const startDateTime = task.dateTimeScheduled ?? new Date().toISOString();
    const endDateTime = addYears(startDateTime, 10);
    const frequency = toLegacyFrequency(interval.intervalUnit, interval.intervalValue);
    const existing = await db.query<{ id: string }>(
      'SELECT id FROM recurrence_rules WHERE task_id = ?',
      [taskId],
    );

    if (existing[0]) {
      await db.run(`
        UPDATE recurrence_rules
        SET frequency = ?,
            interval_unit = ?,
            interval_value = ?,
            times_of_recurrence = 0,
            start_date_time = ?,
            end_date_time = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE task_id = ?
      `, [
        frequency,
        interval.intervalUnit,
        interval.intervalValue,
        startDateTime,
        endDateTime,
        taskId,
      ]);
    } else {
      await db.run(`
        INSERT INTO recurrence_rules (
          id, task_id, frequency, interval_unit, interval_value,
          times_of_recurrence, start_date_time, end_date_time
        )
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `, [
        generateEntityId(),
        taskId,
        frequency,
        interval.intervalUnit,
        interval.intervalValue,
        startDateTime,
        endDateTime,
      ]);
    }

    return this.tasks.get(taskId, options);
  }
}

function toLegacyFrequency(intervalUnit: string, intervalValue: number): string | null {
  if (intervalValue !== 1) return null;
  if (intervalUnit === 'day') return 'daily';
  if (intervalUnit === 'week') return 'weekly';
  if (intervalUnit === 'month') return 'monthly';
  return null;
}

function addYears(value: string, years: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid recurrence start date "${value}".`);
  }
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString();
}
