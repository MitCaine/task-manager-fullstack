import type { Attachment, Note, Project, RecurrenceRule, Reminder, Subtask, Tag, Task } from '../types/task';

const BASE_URL      = '/tasks';
const SUBTASKS_URL  = '/subtasks';
const NOTES_URL     = '/notes';
const REMINDERS_URL = '/reminders';
const PROJECTS_URL  = '/projects';
const TAGS_URL      = '/tags';
const API_BASE_URL  = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/$/, '');

// Shared fetch wrappers raise HTTP status codes as errors.

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const requestUrl = apiUrl(url);
  const res = await fetch(requestUrl, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function apiDelete(url: string): Promise<void> {
  const requestUrl = apiUrl(url);
  const res = await fetch(requestUrl, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// Task endpoints.

export function getTasks(): Promise<Task[]> {
  return apiFetch(BASE_URL);
}

export function getTask(id: number): Promise<Task> {
  return apiFetch(`${BASE_URL}/${id}`);
}

export function createTask(task: Omit<Task, 'taskID'>): Promise<Task> {
  return apiFetch(BASE_URL, json('POST', task));
}

export function updateTask(id: number, task: Omit<Task, 'taskID'>): Promise<Task> {
  return apiFetch(`${BASE_URL}/${id}`, json('PUT', task));
}

export function patchTaskStatus(id: number, statusID: number | null): Promise<Task> {
  return apiFetch(`${BASE_URL}/${id}/status`, json('PATCH', { statusID }));
}

export function deleteTask(id: number): Promise<void> {
  return apiDelete(`${BASE_URL}/${id}`);
}

// Subtask endpoints.

export function getSubtasks(taskId: number): Promise<Subtask[]> {
  return apiFetch(`${BASE_URL}/${taskId}/subtasks`);
}

export function createSubtask(taskId: number, title: string): Promise<Subtask> {
  return apiFetch(`${BASE_URL}/${taskId}/subtasks`, json('POST', { title }));
}

export function updateSubtask(subTaskID: number, title: string): Promise<Subtask> {
  return apiFetch(`${SUBTASKS_URL}/${subTaskID}`, json('PUT', { title }));
}

export function patchSubtaskStatus(subTaskID: number, statusID: number): Promise<Subtask> {
  return apiFetch(`${SUBTASKS_URL}/${subTaskID}/status`, json('PATCH', { statusID }));
}

export function deleteSubtask(subTaskID: number): Promise<void> {
  return apiDelete(`${SUBTASKS_URL}/${subTaskID}`);
}

// Note endpoints.

export function getNotes(taskId: number): Promise<Note[]> {
  return apiFetch(`${BASE_URL}/${taskId}/notes`);
}

export function createNote(taskId: number, title: string, context: string): Promise<Note> {
  return apiFetch(`${BASE_URL}/${taskId}/notes`, json('POST', { title, context }));
}

export function deleteNote(noteId: number): Promise<void> {
  return apiDelete(`${NOTES_URL}/${noteId}`);
}

// Reminder endpoints.

export function getReminders(taskId: number): Promise<Reminder[]> {
  return apiFetch(`${BASE_URL}/${taskId}/reminders`);
}

export function createReminder(taskId: number, dueDate: string, message: string): Promise<Reminder> {
  return apiFetch(`${BASE_URL}/${taskId}/reminders`, json('POST', { dueDate, message }));
}

export function deleteReminder(reminderId: number): Promise<void> {
  return apiDelete(`${REMINDERS_URL}/${reminderId}`);
}

// Project endpoints.

export function getProjects(): Promise<Project[]> {
  return apiFetch(PROJECTS_URL);
}

export function createProject(p: Omit<Project, 'projectID'>): Promise<Project> {
  return apiFetch(PROJECTS_URL, json('POST', p));
}

export function deleteProject(id: number): Promise<void> {
  return apiDelete(`${PROJECTS_URL}/${id}`);
}

// Tag endpoints.

export function getTags(): Promise<Tag[]> {
  return apiFetch(TAGS_URL);
}

export function createTag(t: Omit<Tag, 'tagID'>): Promise<Tag> {
  return apiFetch(TAGS_URL, json('POST', t));
}

export function updateTag(id: number, color: string): Promise<Tag> {
  return apiFetch(`${TAGS_URL}/${id}`, json('PATCH', { color }));
}

export function deleteTag(id: number): Promise<void> {
  return apiDelete(`${TAGS_URL}/${id}`);
}

export function addTagToTask(taskId: number, tagId: number): Promise<void> {
  return apiFetch(`/tasks/${taskId}/tags/${tagId}`, { method: 'POST' });
}

export function removeTagFromTask(taskId: number, tagId: number): Promise<void> {
  return apiDelete(`/tasks/${taskId}/tags/${tagId}`);
}

// Link attachment endpoints.

export function getAttachments(taskId: number): Promise<Attachment[]> {
  return apiFetch(`${BASE_URL}/${taskId}/attachments`);
}

export function createAttachment(taskId: number, fileORLink: string, metadata: string): Promise<Attachment> {
  return apiFetch(`${BASE_URL}/${taskId}/attachments`, json('POST', { fileORLink, metadata }));
}

export function deleteAttachment(id: number): Promise<void> {
  return apiDelete(`/attachments/${id}`);
}

// Recurrence endpoints.

export function getRecurrence(taskId: number): Promise<RecurrenceRule> {
  return apiFetch(`${BASE_URL}/${taskId}/recurrence`);
}

export function setRepeat(taskId: number, frequency: string | null): Promise<Task> {
  return apiFetch(`${BASE_URL}/${taskId}/repeat`, json('PATCH', { frequency }));
}

export function patchReminderDate(reminderId: number, dueDate: string): Promise<Reminder> {
  return apiFetch(`/reminders/${reminderId}`, json('PATCH', { dueDate }));
}
