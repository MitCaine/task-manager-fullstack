import {
  toLegacyAttachment,
  toLegacyNote,
  toLegacyProject,
  toLegacyReminder,
  toLegacySubtask,
  toLegacyTag,
  toLegacyTask,
} from './legacyAdapters';
import { TASK_STATUS } from '../utils/taskUtils';

describe('legacy adapters', () => {
  it('maps domain project and tag numeric IDs to legacy numeric IDs', () => {
    expect(toLegacyProject({ id: '1', title: 'Work', description: null, dueDate: null })).toEqual({
      projectID: 1,
      title: 'Work',
      description: null,
      dueDate: null,
    });
    expect(toLegacyTag({ id: '2', title: 'Focus', color: '#6366f1' })).toEqual({
      tagID: 2,
      title: 'Focus',
      color: '#6366f1',
    });
  });

  it('maps task optional relation IDs and tags explicitly', () => {
    expect(toLegacyTask({
      id: '10',
      title: 'Plan',
      description: '',
      scheduleId: null,
      recurrenceRuleId: '33',
      projectId: '5',
      tags: [{ id: '7', title: 'Deep work', color: null }],
    })).toEqual(expect.objectContaining({
      taskID: 10,
      scheduleID: null,
      recurrenceRuleID: 33,
      projectID: 5,
      tags: [{ tagID: 7, title: 'Deep work', color: null }],
    }));
  });

  it('maps child resources and preserves nullable timestamps', () => {
    expect(toLegacySubtask({ id: '11', parentTaskId: '10', title: 'Step', statusId: null })).toEqual({
      subTaskID: 11,
      parentTaskID: 10,
      title: 'Step',
      statusID: TASK_STATUS.LEGACY_ACTIVE,
      dateTimeScheduled: null,
    });
    expect(toLegacyNote({ id: '12', taskId: '10', title: null, context: 'Note', timestamp: null })).toEqual({
      noteID: 12,
      taskID: 10,
      title: '',
      context: 'Note',
      timestamp: null,
    });
    expect(toLegacyReminder({ id: '13', taskId: '10', dueDate: '2026-07-03T09:00:00', notificationMethod: null, message: null })).toEqual({
      reminderID: 13,
      taskID: 10,
      dueDate: '2026-07-03T09:00:00',
      notificationMethod: '',
      message: null,
    });
    expect(toLegacyAttachment({ id: '14', taskId: '10', fileOrLink: 'https://example.com', metadata: null, fileSize: null })).toEqual({
      attachmentID: 14,
      taskID: 10,
      fileORLink: 'https://example.com',
      metadata: null,
      fileSize: 0,
    });
  });

  it('throws clearly for non-numeric IDs', () => {
    expect(() => toLegacyTask({ id: 'task-uuid', title: 'Plan', description: '' })).toThrow(
      'Cannot adapt non-numeric domain taskID "task-uuid" to the legacy numeric UI id.'
    );
  });
});
