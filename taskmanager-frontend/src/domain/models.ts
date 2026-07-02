export type EntityId = string;
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RecurrenceUnit = 'day' | 'week' | 'month' | 'year';

export interface EntityTimestamps {
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Tag extends EntityTimestamps {
  id: EntityId;
  title: string;
  color?: string | null;
}

export interface Project extends EntityTimestamps {
  id: EntityId;
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

export interface RecurrenceRule extends EntityTimestamps {
  id: EntityId;
  frequency?: string | null;
  intervalUnit?: RecurrenceUnit | string | null;
  intervalValue?: number | null;
  timesOfRecurrence: number;
  startDateTime?: string | null;
  endDateTime?: string | null;
}

export interface Task extends EntityTimestamps {
  id: EntityId;
  title: string;
  description: string;
  dateTimeScheduled?: string | null;
  endDateTimeScheduled?: string | null;
  statusId?: number | null;
  scheduleId?: EntityId | null;
  recurrenceRuleId?: EntityId | null;
  projectId?: EntityId | null;
  priority?: Priority | null;
  tags?: Tag[];
}

export interface Subtask extends EntityTimestamps {
  id: EntityId;
  parentTaskId: EntityId;
  title: string;
  statusId?: number | null;
  dateTimeScheduled?: string | null;
}

export interface Note extends EntityTimestamps {
  id: EntityId;
  taskId: EntityId;
  title?: string | null;
  context: string;
  timestamp?: string | null;
}

export interface Reminder extends EntityTimestamps {
  id: EntityId;
  taskId: EntityId;
  dueDate: string;
  notificationMethod?: string | null;
  message?: string | null;
}

export interface Attachment extends EntityTimestamps {
  id: EntityId;
  taskId: EntityId;
  fileOrLink: string;
  metadata?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  localFilePath?: string | null;
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  dateTimeScheduled?: string | null;
  endDateTimeScheduled?: string | null;
  statusId?: number | null;
  projectId?: EntityId | null;
  priority?: Priority | null;
};

export type UpdateTaskInput = CreateTaskInput & {
  recurrenceRuleId?: EntityId | null;
};

export type CreateProjectInput = {
  title: string;
  description?: string | null;
  dueDate?: string | null;
};

export type UpdateProjectInput = CreateProjectInput;

export type CreateTagInput = {
  title: string;
  color?: string | null;
};

export type UpdateTagInput = CreateTagInput;

export type CreateSubtaskInput = {
  parentTaskId: EntityId;
  title: string;
  statusId?: number | null;
  dateTimeScheduled?: string | null;
};

export type UpdateSubtaskInput = {
  title: string;
  statusId?: number | null;
  dateTimeScheduled?: string | null;
};

export type CreateNoteInput = {
  taskId: EntityId;
  title?: string | null;
  context: string;
};

export type CreateReminderInput = {
  taskId: EntityId;
  dueDate: string;
  message?: string | null;
  notificationMethod?: string | null;
};

export type CreateAttachmentInput = {
  taskId: EntityId;
  fileOrLink: string;
  metadata?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  localFilePath?: string | null;
};

export type RecurrenceIntervalInput = {
  intervalUnit: RecurrenceUnit;
  intervalValue: number;
} | null;
