import type { Repositories } from '../contracts';
import { SQLiteAttachmentRepository } from './SQLiteAttachmentRepository';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import { SQLiteNoteRepository } from './SQLiteNoteRepository';
import { SQLiteProjectRepository } from './SQLiteProjectRepository';
import { SQLiteRecurrenceRepository } from './SQLiteRecurrenceRepository';
import { SQLiteReminderRepository } from './SQLiteReminderRepository';
import { SQLiteSubtaskRepository } from './SQLiteSubtaskRepository';
import { SQLiteTagRepository } from './SQLiteTagRepository';
import { SQLiteTaskRepository } from './SQLiteTaskRepository';
import type { SQLiteTransactionContext } from './types';

export function createSQLiteRepositories(
  service: SQLiteDatabaseService,
): Repositories<SQLiteTransactionContext> {
  return {
    tasks: new SQLiteTaskRepository(service),
    projects: new SQLiteProjectRepository(service),
    tags: new SQLiteTagRepository(service),
    subtasks: new SQLiteSubtaskRepository(service),
    notes: new SQLiteNoteRepository(service),
    reminders: new SQLiteReminderRepository(service),
    attachments: new SQLiteAttachmentRepository(service),
    recurrence: new SQLiteRecurrenceRepository(service),
  };
}
