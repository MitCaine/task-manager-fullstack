import type { Attachment, Note, Project, Reminder, StatusId, Subtask, Tag } from '../../domain/models';
import { readNumber, readRequiredString, readStatusId, readString } from './utils';

export type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TagRow = {
  id: string;
  title: string;
  color: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type NoteRow = {
  id: string;
  task_id: string;
  title: string | null;
  context: string;
  timestamp: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ReminderRow = {
  id: string;
  task_id: string;
  due_date: string;
  notification_method: string | null;
  message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AttachmentRow = {
  id: string;
  task_id: string;
  file_or_link: string;
  metadata: string | null;
  file_size: number | null;
  mime_type: string | null;
  local_file_path: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SubtaskRow = {
  id: string;
  parent_task_id: string;
  title: string;
  status_id: string | null;
  date_time_scheduled: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function mapProjectRowToDomain(row: Record<string, unknown>): Project {
  return {
    id: readRequiredString(row, 'id'),
    title: readRequiredString(row, 'title'),
    description: readString(row, 'description'),
    dueDate: readString(row, 'due_date'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

export function mapTagRowToDomain(row: Record<string, unknown>): Tag {
  return {
    id: readRequiredString(row, 'id'),
    title: readRequiredString(row, 'title'),
    color: readString(row, 'color'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

export function mapNoteRowToDomain(row: Record<string, unknown>): Note {
  return {
    id: readRequiredString(row, 'id'),
    taskId: readRequiredString(row, 'task_id'),
    title: readString(row, 'title'),
    context: readRequiredString(row, 'context'),
    timestamp: readString(row, 'timestamp'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

export function mapReminderRowToDomain(row: Record<string, unknown>): Reminder {
  return {
    id: readRequiredString(row, 'id'),
    taskId: readRequiredString(row, 'task_id'),
    dueDate: readRequiredString(row, 'due_date'),
    notificationMethod: readString(row, 'notification_method'),
    message: readString(row, 'message'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

export function mapAttachmentRowToDomain(row: Record<string, unknown>): Attachment {
  return {
    id: readRequiredString(row, 'id'),
    taskId: readRequiredString(row, 'task_id'),
    fileOrLink: readRequiredString(row, 'file_or_link'),
    metadata: readString(row, 'metadata'),
    fileSize: readNumber(row, 'file_size'),
    mimeType: readString(row, 'mime_type'),
    localFilePath: readString(row, 'local_file_path'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function readOptionalStatusId(row: Record<string, unknown>): StatusId {
  return readString(row, 'status_id') === null ? 'not_started' : readStatusId(row, 'status_id');
}

export function mapSubtaskRowToDomain(row: Record<string, unknown>): Subtask {
  return {
    id: readRequiredString(row, 'id'),
    parentTaskId: readRequiredString(row, 'parent_task_id'),
    title: readRequiredString(row, 'title'),
    statusId: readOptionalStatusId(row),
    dateTimeScheduled: readString(row, 'date_time_scheduled'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}
