import type {
  CreateTagInput,
  EntityId,
  Tag,
  UpdateTagInput,
} from '../../domain/models';
import type { RepositoryOperationOptions, TagRepository } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import { mapTagRowToDomain, type TagRow } from './mappers';
import { dbForOperation } from './repositoryUtils';
import type { SQLiteTransactionContext } from './types';
import { generateEntityId } from './utils';

export class SQLiteTagRepository implements TagRepository<SQLiteTransactionContext> {
  constructor(private readonly service: SQLiteDatabaseService) {}

  async list(options?: RepositoryOperationOptions<SQLiteTransactionContext>): Promise<Tag[]> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<TagRow>(`
      SELECT id, title, color, created_at, updated_at
      FROM tags
      ORDER BY rowid
    `);
    return rows.map(mapTagRowToDomain);
  }

  async create(
    input: CreateTagInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Tag> {
    const db = await dbForOperation(this.service, options);
    const id = generateEntityId();

    await db.run(`
      INSERT INTO tags (id, title, color)
      VALUES (?, ?, ?)
    `, [
      id,
      input.title,
      input.color ?? null,
    ]);

    return this.getRequired(id, options);
  }

  async update(
    id: EntityId,
    input: UpdateTagInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Tag> {
    const db = await dbForOperation(this.service, options);

    await db.run(`
      UPDATE tags
      SET title = ?,
          color = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      input.title,
      input.color ?? null,
      id,
    ]);

    return this.getRequired(id, options);
  }

  async delete(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<void> {
    const db = await dbForOperation(this.service, options);
    await db.run('DELETE FROM tags WHERE id = ?', [id]);
  }

  private async getRequired(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Tag> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<TagRow>(`
      SELECT id, title, color, created_at, updated_at
      FROM tags
      WHERE id = ?
    `, [id]);

    if (!rows[0]) throw new Error(`Tag ${id} not found.`);
    return mapTagRowToDomain(rows[0]);
  }
}
