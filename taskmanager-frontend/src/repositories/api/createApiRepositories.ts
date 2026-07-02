import type { Repositories } from '../contracts';
import { ApiAttachmentRepository } from './ApiAttachmentRepository';
import { ApiNoteRepository } from './ApiNoteRepository';
import { ApiProjectRepository } from './ApiProjectRepository';
import { ApiRecurrenceRepository } from './ApiRecurrenceRepository';
import { ApiReminderRepository } from './ApiReminderRepository';
import { ApiSubtaskRepository } from './ApiSubtaskRepository';
import { ApiTagRepository } from './ApiTagRepository';
import { ApiTaskRepository } from './ApiTaskRepository';

export function createApiRepositories(): Repositories {
  return {
    tasks: new ApiTaskRepository(),
    projects: new ApiProjectRepository(),
    tags: new ApiTagRepository(),
    subtasks: new ApiSubtaskRepository(),
    notes: new ApiNoteRepository(),
    reminders: new ApiReminderRepository(),
    attachments: new ApiAttachmentRepository(),
    recurrence: new ApiRecurrenceRepository(),
  };
}
