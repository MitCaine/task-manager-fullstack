import type {
  CreateProjectInput,
  EntityId,
  Project,
  UpdateProjectInput,
} from '../../domain/models';
import type { ProjectRepository, RepositoryOperationOptions } from '../contracts';
import type { SQLiteDatabaseService } from './SQLiteDatabaseService';
import { mapProjectRowToDomain, type ProjectRow } from './mappers';
import { dbForOperation } from './repositoryUtils';
import type { SQLiteTransactionContext } from './types';
import { generateEntityId } from './utils';

export class SQLiteProjectRepository implements ProjectRepository<SQLiteTransactionContext> {
  constructor(private readonly service: SQLiteDatabaseService) {}

  async list(options?: RepositoryOperationOptions<SQLiteTransactionContext>): Promise<Project[]> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<ProjectRow>(`
      SELECT id, title, description, due_date, created_at, updated_at
      FROM projects
      ORDER BY rowid
    `);
    return rows.map(mapProjectRowToDomain);
  }

  async create(
    input: CreateProjectInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Project> {
    const db = await dbForOperation(this.service, options);
    const id = generateEntityId();

    await db.run(`
      INSERT INTO projects (id, title, description, due_date)
      VALUES (?, ?, ?, ?)
    `, [
      id,
      input.title,
      input.description ?? null,
      input.dueDate ?? null,
    ]);

    return this.getRequired(id, options);
  }

  async update(
    id: EntityId,
    input: UpdateProjectInput,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Project> {
    const db = await dbForOperation(this.service, options);

    await db.run(`
      UPDATE projects
      SET title = ?,
          description = ?,
          due_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      input.title,
      input.description ?? null,
      input.dueDate ?? null,
      id,
    ]);

    return this.getRequired(id, options);
  }

  async delete(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<void> {
    const db = await dbForOperation(this.service, options);
    await db.run('DELETE FROM projects WHERE id = ?', [id]);
  }

  private async getRequired(
    id: EntityId,
    options?: RepositoryOperationOptions<SQLiteTransactionContext>,
  ): Promise<Project> {
    const db = await dbForOperation(this.service, options);
    const rows = await db.query<ProjectRow>(`
      SELECT id, title, description, due_date, created_at, updated_at
      FROM projects
      WHERE id = ?
    `, [id]);

    if (!rows[0]) throw new Error(`Project ${id} not found.`);
    return mapProjectRowToDomain(rows[0]);
  }
}
