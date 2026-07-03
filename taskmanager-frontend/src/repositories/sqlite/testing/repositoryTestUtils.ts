import type { SQLiteDatabaseService } from '../SQLiteDatabaseService';

export async function seedTask(service: SQLiteDatabaseService, taskId = '42'): Promise<void> {
  const db = await service.getDb();
  await db.run(`
    INSERT INTO tasks (id, title, description, status_id)
    VALUES (?, ?, ?, 'not_started')
  `, [taskId, `Task ${taskId}`, '']);
}

export async function deleteTask(service: SQLiteDatabaseService, taskId = '42'): Promise<void> {
  const db = await service.getDb();
  await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
}
