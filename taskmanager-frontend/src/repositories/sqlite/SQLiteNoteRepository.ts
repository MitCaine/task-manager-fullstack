import type { CreateNoteInput, EntityId, Note } from '../../domain/models';
import type { NoteRepository, RepositoryOperationOptions } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import { mapNoteRowToDomain, type NoteRow } from './mappers';
import { dbForOperation } from './repositoryUtils';
import type { SQLiteTransactionContext } from './types';
import { generateEntityId } from './utils';

export class SQLiteNoteRepository implements NoteRepository<SQLiteTransactionContext> {
  constructor(private readonly service: SQLiteDatabaseService) {}

  async listByTask(
    taskId: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Note[]> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<NoteRow>(`
      SELECT id, task_id, title, context, timestamp, created_at, updated_at
      FROM notes
      WHERE task_id = ?
      ORDER BY timestamp, rowid
    `, [taskId]);
    return rows.map(mapNoteRowToDomain);
  }

  async create(
    input: CreateNoteInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Note> {
    const db = await dbForOperation(this.service, options);
    const id = generateEntityId();

    await db.run(`
      INSERT INTO notes (id, task_id, title, context)
      VALUES (?, ?, ?, ?)
    `, [
      id,
      input.taskId,
      input.title ?? null,
      input.context,
    ]);

    return this.getRequired(id, options);
  }

  async delete(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<void> {
    const db = await dbForOperation(this.service, options);
    await db.run('DELETE FROM notes WHERE id = ?', [id]);
  }

  private async getRequired(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Note> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<NoteRow>(`
      SELECT id, task_id, title, context, timestamp, created_at, updated_at
      FROM notes
      WHERE id = ?
    `, [id]);

    if (!rows[0]) throw new Error(`Note ${id} not found.`);
    return mapNoteRowToDomain(rows[0]);
  }
}
