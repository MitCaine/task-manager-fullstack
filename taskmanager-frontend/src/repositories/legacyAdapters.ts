import type {
  Attachment as DomainAttachment,
  Note as DomainNote,
  Project as DomainProject,
  RecurrenceRule as DomainRecurrenceRule,
  Reminder as DomainReminder,
  Subtask as DomainSubtask,
  Tag as DomainTag,
  Task as DomainTask,
} from '../domain/models';
import type {
  Attachment,
  Note,
  Project,
  RecurrenceRule,
  Reminder,
  Subtask,
  Tag,
  Task,
} from '../types/task';
import { TASK_STATUS } from '../utils/taskUtils';
import { toLegacyNumericId } from './legacyIdAdapter';
import { mapStatusIdDomainToDto, mapStatusIdDtoToDomain } from './api/mappers/StatusMapper';

// Transitional adapters for the current UI, which still expects REST-shaped
// numeric IDs. Delete these when the app state moves fully to domain models.
export function toLegacyTag(tag: DomainTag): Tag {
  return {
    tagID: toLegacyNumericId(tag.id, 'tagID'),
    title: tag.title,
    color: tag.color ?? null,
  };
}

export function toLegacyProject(project: DomainProject): Project {
  const legacyProject: Project = {
    projectID: toLegacyNumericId(project.id, 'projectID'),
    title: project.title,
  };

  if (project.description !== undefined) legacyProject.description = project.description;
  if (project.dueDate !== undefined) legacyProject.dueDate = project.dueDate;

  return legacyProject;
}

export function toLegacyTask(task: DomainTask): Task {
  const legacyTask: Task = {
    taskID: toLegacyNumericId(task.id, 'taskID'),
    title: task.title,
    description: task.description,
    dateTimeScheduled: task.dateTimeScheduled ?? null,
    endDateTimeScheduled: task.endDateTimeScheduled ?? null,
    createdAt: task.createdAt ?? null,
    statusID: mapStatusIdDomainToDto(task.statusId),
    scheduleID: task.scheduleId ? toLegacyNumericId(task.scheduleId, 'scheduleID') : null,
    recurrenceRuleID: task.recurrenceRuleId === undefined
      ? undefined
      : task.recurrenceRuleId === null
        ? null
        : toLegacyNumericId(task.recurrenceRuleId, 'recurrenceRuleID'),
    projectID: task.projectId ? toLegacyNumericId(task.projectId, 'projectID') : null,
    priority: task.priority ?? null,
  };

  if (task.tags) legacyTask.tags = task.tags.map(toLegacyTag);

  return legacyTask;
}

export function toLegacySubtask(subtask: DomainSubtask): Subtask {
  return {
    subTaskID: toLegacyNumericId(subtask.id, 'subTaskID'),
    parentTaskID: toLegacyNumericId(subtask.parentTaskId, 'parentTaskID'),
    title: subtask.title,
    statusID: mapStatusIdDomainToDto(subtask.statusId) ?? TASK_STATUS.LEGACY_ACTIVE,
    dateTimeScheduled: subtask.dateTimeScheduled ?? null,
  };
}

export function toDomainStatusId(statusID: number | null | undefined) {
  return mapStatusIdDtoToDomain(statusID);
}

export function toLegacyNote(note: DomainNote): Note {
  return {
    noteID: toLegacyNumericId(note.id, 'noteID'),
    taskID: toLegacyNumericId(note.taskId, 'taskID'),
    title: note.title ?? '',
    context: note.context,
    timestamp: note.timestamp ?? note.createdAt ?? null,
  };
}

export function toLegacyReminder(reminder: DomainReminder): Reminder {
  return {
    reminderID: toLegacyNumericId(reminder.id, 'reminderID'),
    taskID: toLegacyNumericId(reminder.taskId, 'taskID'),
    dueDate: reminder.dueDate,
    notificationMethod: reminder.notificationMethod ?? '',
    message: reminder.message ?? null,
  };
}

export function toLegacyAttachment(attachment: DomainAttachment): Attachment {
  return {
    attachmentID: toLegacyNumericId(attachment.id, 'attachmentID'),
    taskID: toLegacyNumericId(attachment.taskId, 'taskID'),
    fileORLink: attachment.fileOrLink,
    metadata: attachment.metadata ?? null,
    fileSize: attachment.fileSize ?? 0,
  };
}

export function toLegacyRecurrenceRule(rule: DomainRecurrenceRule): RecurrenceRule {
  return {
    recurrenceRuleID: toLegacyNumericId(rule.id, 'recurrenceRuleID'),
    frequency: rule.frequency ?? null,
    intervalUnit: rule.intervalUnit ?? null,
    intervalValue: rule.intervalValue ?? null,
    timesOfRecurrence: rule.timesOfRecurrence,
    startDateTime: rule.startDateTime ?? null,
    endDateTime: rule.endDateTime ?? null,
  };
}
