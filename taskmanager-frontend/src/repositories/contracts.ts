import type {
  Attachment,
  CreateAttachmentInput,
  CreateNoteInput,
  CreateProjectInput,
  CreateReminderInput,
  CreateSubtaskInput,
  CreateTagInput,
  CreateTaskInput,
  EntityId,
  Note,
  Project,
  RecurrenceIntervalInput,
  RecurrenceRule,
  Reminder,
  Subtask,
  Tag,
  Task,
  UpdateProjectInput,
  UpdateSubtaskInput,
  UpdateTagInput,
  UpdateTaskInput,
} from '../domain/models';

export interface RepositoryOperationOptions<TTransaction = unknown> {
  tx?: TTransaction;
}

export interface TaskRepository<TTransaction = unknown> {
  list(options?: RepositoryOperationOptions<TTransaction>): Promise<Task[]>;
  get(id: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<Task>;
  create(input: CreateTaskInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Task>;
  update(id: EntityId, input: UpdateTaskInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Task>;
  updateStatus(id: EntityId, statusId: number | null, options?: RepositoryOperationOptions<TTransaction>): Promise<Task>;
  delete(id: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<void>;
  addTag(taskId: EntityId, tagId: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<Task>;
  removeTag(taskId: EntityId, tagId: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<Task>;
}

export interface ProjectRepository<TTransaction = unknown> {
  list(options?: RepositoryOperationOptions<TTransaction>): Promise<Project[]>;
  create(input: CreateProjectInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Project>;
  update(id: EntityId, input: UpdateProjectInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Project>;
  delete(id: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<void>;
}

export interface TagRepository<TTransaction = unknown> {
  list(options?: RepositoryOperationOptions<TTransaction>): Promise<Tag[]>;
  create(input: CreateTagInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Tag>;
  update(id: EntityId, input: UpdateTagInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Tag>;
  delete(id: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<void>;
}

export interface SubtaskRepository<TTransaction = unknown> {
  listByTask(taskId: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<Subtask[]>;
  create(input: CreateSubtaskInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Subtask>;
  update(id: EntityId, input: UpdateSubtaskInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Subtask>;
  updateStatus(id: EntityId, statusId: number | null, options?: RepositoryOperationOptions<TTransaction>): Promise<Subtask>;
  delete(id: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<void>;
}

export interface NoteRepository<TTransaction = unknown> {
  listByTask(taskId: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<Note[]>;
  create(input: CreateNoteInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Note>;
  delete(id: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<void>;
}

export interface ReminderRepository<TTransaction = unknown> {
  listByTask(taskId: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<Reminder[]>;
  create(input: CreateReminderInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Reminder>;
  updateDueDate(id: EntityId, dueDate: string, options?: RepositoryOperationOptions<TTransaction>): Promise<Reminder>;
  delete(id: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<void>;
}

export interface AttachmentRepository<TTransaction = unknown> {
  listByTask(taskId: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<Attachment[]>;
  create(input: CreateAttachmentInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Attachment>;
  delete(id: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<void>;
}

export interface RecurrenceRepository<TTransaction = unknown> {
  getByTask(taskId: EntityId, options?: RepositoryOperationOptions<TTransaction>): Promise<RecurrenceRule>;
  setForTask(taskId: EntityId, interval: RecurrenceIntervalInput, options?: RepositoryOperationOptions<TTransaction>): Promise<Task>;
}

export interface Repositories<TTransaction = unknown> {
  tasks: TaskRepository<TTransaction>;
  projects: ProjectRepository<TTransaction>;
  tags: TagRepository<TTransaction>;
  subtasks: SubtaskRepository<TTransaction>;
  notes: NoteRepository<TTransaction>;
  reminders: ReminderRepository<TTransaction>;
  attachments: AttachmentRepository<TTransaction>;
  recurrence: RecurrenceRepository<TTransaction>;
}
