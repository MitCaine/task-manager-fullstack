import type { Task } from '../types/task';

const BASE_URL = '/tasks';

export async function getTasks(): Promise<Task[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error(`Failed to load tasks: HTTP ${res.status}`);
  return res.json() as Promise<Task[]>;
}

export async function createTask(task: Omit<Task, 'taskID'>): Promise<Task> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error(`Failed to create task: HTTP ${res.status}`);
  return res.json() as Promise<Task>;
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete task: HTTP ${res.status}`);
}
