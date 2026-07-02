import type {
  Attachment,
  Note,
  Project,
  RecurrenceRule,
  Reminder,
  Subtask,
  Tag,
  Task,
} from '../../../types/task';
import { mapAttachmentDtoToDomain, mapCreateAttachmentInputToApiArgs } from './AttachmentMapper';
import { mapNoteDtoToDomain } from './NoteMapper';
import { mapProjectDtoToDomain, mapUpdateProjectInputToDto } from './ProjectMapper';
import { mapRecurrenceDtoToDomain, mapRecurrenceIntervalInputToDto } from './RecurrenceMapper';
import { mapReminderDtoToDomain } from './ReminderMapper';
import { mapSubtaskDtoToDomain } from './SubtaskMapper';
import { mapTagDtoToDomain } from './TagMapper';
import { mapCreateTaskInputToDto, mapTaskDtoToDomain, mapUpdateTaskInputToDto } from './TaskMapper';
import { MISSING_REST_TIMESTAMP, toApiId } from './mapperUtils';

describe('API repository mappers', () => {
  it('maps task DTOs to domain tasks without dropping nullable fields', () => {
    const task: Task = {
      taskID: 42,
      title: 'Ship v1',
      description: undefined,
      dateTimeScheduled: null,
      endDateTimeScheduled: '2026-07-02T11:00:00',
      createdAt: '2026-07-01T09:30:00',
      statusID: null,
      scheduleID: 7,
      recurrenceRuleID: 8,
      projectID: 9,
      priority: 'HIGH',
      userID: 3,
      tags: [{ tagID: 5, title: 'Release', color: null }],
    };

    expect(mapTaskDtoToDomain(task)).toEqual({
      id: '42',
      title: 'Ship v1',
      description: '',
      dateTimeScheduled: null,
      endDateTimeScheduled: '2026-07-02T11:00:00',
      statusId: null,
      scheduleId: '7',
      recurrenceRuleId: '8',
      projectId: '9',
      priority: 'HIGH',
      tags: [{
        id: '5',
        title: 'Release',
        color: null,
        createdAt: MISSING_REST_TIMESTAMP,
        updatedAt: MISSING_REST_TIMESTAMP,
      }],
      createdAt: '2026-07-01T09:30:00',
      updatedAt: '2026-07-01T09:30:00',
    });
  });

  it('maps task domain inputs back to REST DTO shapes', () => {
    expect(mapCreateTaskInputToDto({
      title: 'Plan',
      description: undefined,
      dateTimeScheduled: undefined,
      endDateTimeScheduled: null,
      statusId: null,
      projectId: '12',
      priority: null,
    })).toEqual({
      title: 'Plan',
      description: '',
      dateTimeScheduled: null,
      endDateTimeScheduled: null,
      statusID: null,
      projectID: 12,
      priority: null,
    });

    expect(mapUpdateTaskInputToDto({
      title: 'Plan',
      recurrenceRuleId: '33',
    })).toEqual(expect.objectContaining({
      recurrenceRuleID: 33,
    }));
  });

  it('maps project and tag DTOs while documenting missing REST timestamps', () => {
    const project: Project = { projectID: 1, title: 'Work', description: null, dueDate: null, userID: 4 };
    const tag: Tag = { tagID: 2, title: 'Focus', color: '#6366f1', userID: 4 };

    expect(mapProjectDtoToDomain(project)).toEqual({
      id: '1',
      title: 'Work',
      description: null,
      dueDate: null,
      createdAt: MISSING_REST_TIMESTAMP,
      updatedAt: MISSING_REST_TIMESTAMP,
    });
    expect(mapTagDtoToDomain(tag)).toEqual({
      id: '2',
      title: 'Focus',
      color: '#6366f1',
      createdAt: MISSING_REST_TIMESTAMP,
      updatedAt: MISSING_REST_TIMESTAMP,
    });
    expect(mapUpdateProjectInputToDto({ title: 'Home', description: null, dueDate: '2026-08-01T00:00:00' }))
      .toEqual({ title: 'Home', description: null, dueDate: '2026-08-01T00:00:00' });
  });

  it('maps child resources and preserves REST timestamp fields when available', () => {
    const subtask: Subtask = { subTaskID: 1, parentTaskID: 42, title: 'Step', statusID: 2, dateTimeScheduled: null };
    const note: Note = { noteID: 2, taskID: 42, title: '', context: 'Context', timestamp: '2026-07-02T10:00:00' };
    const reminder: Reminder = { reminderID: 3, taskID: 42, dueDate: '2026-07-03T09:00:00', notificationMethod: 'browser', message: null };
    const attachment: Attachment = { attachmentID: 4, taskID: 42, fileORLink: 'https://example.com', metadata: null, fileSize: 0 };

    expect(mapSubtaskDtoToDomain(subtask)).toEqual({
      id: '1',
      parentTaskId: '42',
      title: 'Step',
      statusId: 2,
      dateTimeScheduled: null,
      createdAt: MISSING_REST_TIMESTAMP,
      updatedAt: MISSING_REST_TIMESTAMP,
    });
    expect(mapNoteDtoToDomain(note)).toEqual({
      id: '2',
      taskId: '42',
      title: '',
      context: 'Context',
      timestamp: '2026-07-02T10:00:00',
      createdAt: '2026-07-02T10:00:00',
      updatedAt: '2026-07-02T10:00:00',
    });
    expect(mapReminderDtoToDomain(reminder)).toEqual({
      id: '3',
      taskId: '42',
      dueDate: '2026-07-03T09:00:00',
      notificationMethod: 'browser',
      message: null,
      createdAt: MISSING_REST_TIMESTAMP,
      updatedAt: MISSING_REST_TIMESTAMP,
    });
    expect(mapAttachmentDtoToDomain(attachment)).toEqual({
      id: '4',
      taskId: '42',
      fileOrLink: 'https://example.com',
      metadata: null,
      fileSize: 0,
      mimeType: null,
      localFilePath: null,
      createdAt: MISSING_REST_TIMESTAMP,
      updatedAt: MISSING_REST_TIMESTAMP,
    });
    expect(mapCreateAttachmentInputToApiArgs({ taskId: '42', fileOrLink: 'https://example.com' }))
      .toEqual({ taskId: 42, fileOrLink: 'https://example.com', metadata: '' });
  });

  it('maps recurrence DTOs and inputs', () => {
    const recurrence: RecurrenceRule = {
      recurrenceRuleID: 7,
      frequency: 'weekly',
      intervalUnit: 'week',
      intervalValue: 2,
      timesOfRecurrence: 0,
      startDateTime: '2026-07-01T09:00:00',
      endDateTime: '2036-07-01T09:00:00',
    };

    expect(mapRecurrenceDtoToDomain(recurrence)).toEqual({
      id: '7',
      frequency: 'weekly',
      intervalUnit: 'week',
      intervalValue: 2,
      timesOfRecurrence: 0,
      startDateTime: '2026-07-01T09:00:00',
      endDateTime: '2036-07-01T09:00:00',
      createdAt: MISSING_REST_TIMESTAMP,
      updatedAt: MISSING_REST_TIMESTAMP,
    });
    expect(mapRecurrenceIntervalInputToDto({ intervalUnit: 'month', intervalValue: 1 }))
      .toEqual({ intervalUnit: 'month', intervalValue: 1 });
    expect(mapRecurrenceIntervalInputToDto(null)).toBeNull();
  });

  it('rejects non-numeric IDs when converting domain IDs for REST', () => {
    expect(() => toApiId('local-task-id')).toThrow('Expected numeric REST id');
  });
});
