export interface Task {
  taskID: number;
  title: string;
  description?: string;
  dateTimeScheduled?: string | null;
  endDateTimeScheduled?: string | null;
  createdAt?: string | null;
  userID?: number | null;
  statusID?: number | null;
  scheduleID?: number | null;
  recurrenceRuleID?: number | null;
  projectID?: number | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  tags?: Tag[];
}

export interface Project {
  projectID: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  userID?: number | null;
}

export interface Tag {
  tagID: number;
  title: string;
  color?: string | null;
  userID?: number | null;
}

export interface Subtask {
  subTaskID: number;
  title: string;
  statusID: number;
  dateTimeScheduled?: string | null;
  parentTaskID: number;
}

export interface Note {
  noteID: number;
  title: string;
  context: string;
  timestamp?: string | null;
  taskID: number;
}

export interface Reminder {
  reminderID: number;
  dueDate: string;
  notificationMethod: string;
  message?: string | null;
  taskID: number;
}

export interface Attachment {
  attachmentID: number;
  fileORLink: string;
  metadata?: string | null;
  fileSize: number;
  taskID: number;
}

export interface RecurrenceRule {
  recurrenceRuleID: number;
  frequency?: string | null;
  intervalUnit?: 'day' | 'week' | 'month' | 'year' | string | null;
  intervalValue?: number | null;
  timesOfRecurrence: number;
  startDateTime?: string | null;
  endDateTime?: string | null;
}
