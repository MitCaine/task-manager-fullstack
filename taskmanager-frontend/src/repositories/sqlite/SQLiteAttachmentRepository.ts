import type { Attachment, CreateAttachmentInput, EntityId } from '../../domain/models';
import type { AttachmentRepository, RepositoryOperationOptions } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import { mapAttachmentRowToDomain, type AttachmentRow } from './mappers';
import { dbForOperation } from './repositoryUtils';
import type { SQLiteTransactionContext } from './types';
import { generateEntityId } from './utils';

export class SQLiteAttachmentRepository implements AttachmentRepository<SQLiteTransactionContext> {
  constructor(private readonly service: SQLiteDatabaseService) {}

  async listByTask(
    taskId: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Attachment[]> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<AttachmentRow>(`
      SELECT id, task_id, file_or_link, metadata, file_size, mime_type, local_file_path, created_at, updated_at
      FROM attachments
      WHERE task_id = ?
      ORDER BY rowid
    `, [taskId]);
    return rows.map(mapAttachmentRowToDomain);
  }

  async create(
    input: CreateAttachmentInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Attachment> {
    const db = await dbForOperation(this.service, options);
    const id = generateEntityId();

    await db.run(`
      INSERT INTO attachments (id, task_id, file_or_link, metadata, file_size, mime_type, local_file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      input.taskId,
      input.fileOrLink,
      input.metadata ?? null,
      input.fileSize ?? 0,
      input.mimeType ?? null,
      input.localFilePath ?? null,
    ]);

    return this.getRequired(id, options);
  }

  async delete(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<void> {
    const db = await dbForOperation(this.service, options);
    await db.run('DELETE FROM attachments WHERE id = ?', [id]);
  }

  private async getRequired(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Attachment> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<AttachmentRow>(`
      SELECT id, task_id, file_or_link, metadata, file_size, mime_type, local_file_path, created_at, updated_at
      FROM attachments
      WHERE id = ?
    `, [id]);

    if (!rows[0]) throw new Error(`Attachment ${id} not found.`);
    return mapAttachmentRowToDomain(rows[0]);
  }
}
