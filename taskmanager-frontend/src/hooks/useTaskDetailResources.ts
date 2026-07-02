import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Attachment, Note, Reminder, Subtask } from '../types/task';
import type {
  Attachment as DomainAttachment,
  Note as DomainNote,
  Reminder as DomainReminder,
  Subtask as DomainSubtask,
} from '../domain/models';
import { toLegacyNumericId, useRepositories } from '../repositories';
import { buildDateTimeString } from '../utils/dateTime';
import type { Ampm } from '../utils/taskForm';
import { TASK_STATUS } from '../utils/taskUtils';

type UseTaskDetailResourcesOptions = {
  is24Hour: boolean;
  setError: (message: string) => void;
};

type ResourceMap<T> = Record<number, T[]>;
type StateSetter<T> = Dispatch<SetStateAction<T>>;

type UseTaskDetailResourcesResult = {
  resources: {
    subtasks: ResourceMap<Subtask>;
    notes: ResourceMap<Note>;
    reminders: ResourceMap<Reminder>;
    attachments: ResourceMap<Attachment>;
  };
  drafts: {
    newSubtaskTitle: string;
    editingSubtaskId: number | null;
    editingSubtaskTitle: string;
    newNoteContent: string;
    newReminderDate: string;
    newReminderHour: string;
    newReminderMinute: string;
    newReminderAmpm: Ampm;
    newReminderMessage: string;
    newAttachmentUrl: string;
    newAttachmentLabel: string;
  };
  draftSetters: {
    setNewSubtaskTitle: StateSetter<string>;
    setEditingSubtaskId: StateSetter<number | null>;
    setEditingSubtaskTitle: StateSetter<string>;
    setNewNoteContent: StateSetter<string>;
    setNewReminderDate: StateSetter<string>;
    setNewReminderHour: StateSetter<string>;
    setNewReminderMinute: StateSetter<string>;
    setNewReminderAmpm: StateSetter<Ampm>;
    setNewReminderMessage: StateSetter<string>;
    setNewAttachmentUrl: StateSetter<string>;
    setNewAttachmentLabel: StateSetter<string>;
  };
  actions: {
    loadTaskSections: (taskId: number) => Promise<void>;
    clearDeletedTaskResources: (taskId: number) => void;
    addSubtask: (taskId: number) => Promise<void>;
    toggleSubtask: (taskId: number, subtask: Subtask) => Promise<void>;
    removeSubtask: (taskId: number, subTaskID: number) => Promise<void>;
    updateSubtaskTitle: (taskId: number, subtask: Subtask) => Promise<void>;
    addNote: (taskId: number) => Promise<void>;
    removeNote: (taskId: number, noteId: number) => Promise<void>;
    addReminder: (taskId: number) => Promise<void>;
    removeReminder: (taskId: number, reminderId: number) => Promise<void>;
    addAttachment: (taskId: number) => Promise<void>;
    removeAttachment: (taskId: number, attachmentId: number) => Promise<void>;
  };
  externalSetters: {
    setReminders: StateSetter<ResourceMap<Reminder>>;
  };
};

function toUiSubtask(subtask: DomainSubtask): Subtask {
  return {
    subTaskID: toLegacyNumericId(subtask.id, 'subTaskID'),
    parentTaskID: toLegacyNumericId(subtask.parentTaskId, 'parentTaskID'),
    title: subtask.title,
    statusID: subtask.statusId ?? TASK_STATUS.LEGACY_ACTIVE,
    dateTimeScheduled: subtask.dateTimeScheduled ?? null,
  };
}

function toUiNote(note: DomainNote): Note {
  return {
    noteID: toLegacyNumericId(note.id, 'noteID'),
    taskID: toLegacyNumericId(note.taskId, 'taskID'),
    title: note.title ?? '',
    context: note.context,
    timestamp: note.timestamp ?? note.createdAt ?? null,
  };
}

function toUiReminder(reminder: DomainReminder): Reminder {
  return {
    reminderID: toLegacyNumericId(reminder.id, 'reminderID'),
    taskID: toLegacyNumericId(reminder.taskId, 'taskID'),
    dueDate: reminder.dueDate,
    notificationMethod: reminder.notificationMethod ?? '',
    message: reminder.message ?? null,
  };
}

function toUiAttachment(attachment: DomainAttachment): Attachment {
  return {
    attachmentID: toLegacyNumericId(attachment.id, 'attachmentID'),
    taskID: toLegacyNumericId(attachment.taskId, 'taskID'),
    fileORLink: attachment.fileOrLink,
    metadata: attachment.metadata ?? null,
    fileSize: attachment.fileSize ?? 0,
  };
}

export default function useTaskDetailResources({ is24Hour, setError }: UseTaskDetailResourcesOptions): UseTaskDetailResourcesResult {
  const repositories = useRepositories();
  const [subtasks, setSubtasks] = useState<ResourceMap<Subtask>>({});
  const [notes, setNotes] = useState<ResourceMap<Note>>({});
  const [reminders, setReminders] = useState<ResourceMap<Reminder>>({});
  const [attachments, setAttachments] = useState<ResourceMap<Attachment>>({});

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderHour, setNewReminderHour] = useState('09');
  const [newReminderMinute, setNewReminderMinute] = useState('00');
  const [newReminderAmpm, setNewReminderAmpm] = useState<Ampm>('AM');
  const [newReminderMessage, setNewReminderMessage] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentLabel, setNewAttachmentLabel] = useState('');

  const loadTaskSections = async (taskId: number) => {
    setNewSubtaskTitle('');
    setNewNoteContent('');
    setNewReminderMessage('');
    setNewAttachmentUrl('');
    setNewAttachmentLabel('');
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
    try {
      const [subData, noteData, reminderData, attachData] = await Promise.all([
        subtasks[taskId]   ? Promise.resolve(subtasks[taskId])   : repositories.subtasks.listByTask(String(taskId)).then(items => items.map(toUiSubtask)),
        notes[taskId]      ? Promise.resolve(notes[taskId])      : repositories.notes.listByTask(String(taskId)).then(items => items.map(toUiNote)),
        reminders[taskId]  ? Promise.resolve(reminders[taskId])  : repositories.reminders.listByTask(String(taskId)).then(items => items.map(toUiReminder)),
        attachments[taskId] ? Promise.resolve(attachments[taskId]) : repositories.attachments.listByTask(String(taskId)).then(items => items.map(toUiAttachment)),
      ]);
      setSubtasks(prev    => ({ ...prev, [taskId]: subData }));
      setNotes(prev       => ({ ...prev, [taskId]: noteData }));
      setReminders(prev   => ({ ...prev, [taskId]: reminderData }));
      setAttachments(prev => ({ ...prev, [taskId]: attachData }));
    } catch {
      setError('Failed to load task details.');
    }
  };

  const clearDeletedTaskResources = (taskId: number) => {
    setSubtasks(prev => { const next = { ...prev }; delete next[taskId]; return next; });
    setNotes(prev =>    { const next = { ...prev }; delete next[taskId]; return next; });
    setReminders(prev => { const next = { ...prev }; delete next[taskId]; return next; });
  };

  const addSubtask = async (taskId: number) => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const saved = toUiSubtask(await repositories.subtasks.create({
        parentTaskId: String(taskId),
        title: newSubtaskTitle.trim(),
      }));
      setSubtasks(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewSubtaskTitle('');
    } catch {
      setError('Failed to create subtask.');
    }
  };

  const toggleSubtask = async (taskId: number, subtask: Subtask) => {
    const newStatusID = subtask.statusID === TASK_STATUS.DONE ? TASK_STATUS.LEGACY_ACTIVE : TASK_STATUS.DONE;
    try {
      const saved = toUiSubtask(await repositories.subtasks.updateStatus(String(subtask.subTaskID), newStatusID));
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].map(s => s.subTaskID === saved.subTaskID ? saved : s) }));
    } catch {
      setError('Failed to update subtask.');
    }
  };

  const removeSubtask = async (taskId: number, subTaskID: number) => {
    try {
      await repositories.subtasks.delete(String(subTaskID));
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].filter(s => s.subTaskID !== subTaskID) }));
    } catch {
      setError('Failed to delete subtask.');
    }
  };

  const updateSubtaskTitle = async (taskId: number, subtask: Subtask) => {
    const trimmed = editingSubtaskTitle.trim();
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
    if (!trimmed || trimmed === subtask.title) return;
    try {
      const saved = toUiSubtask(await repositories.subtasks.update(String(subtask.subTaskID), {
        title: trimmed,
        statusId: subtask.statusID,
        dateTimeScheduled: subtask.dateTimeScheduled ?? null,
      }));
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].map(s => s.subTaskID === saved.subTaskID ? saved : s) }));
    } catch {
      setError('Failed to update subtask.');
    }
  };

  const addNote = async (taskId: number) => {
    if (!newNoteContent.trim()) return;
    try {
      const saved = toUiNote(await repositories.notes.create({
        taskId: String(taskId),
        title: '',
        context: newNoteContent.trim(),
      }));
      setNotes(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewNoteContent('');
    } catch {
      setError('Failed to create note.');
    }
  };

  const removeNote = async (taskId: number, noteId: number) => {
    try {
      await repositories.notes.delete(String(noteId));
      setNotes(prev => ({ ...prev, [taskId]: prev[taskId].filter(n => n.noteID !== noteId) }));
    } catch {
      setError('Failed to delete note.');
    }
  };

  const addReminder = async (taskId: number) => {
    if (!newReminderDate) return;
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    try {
      const dueDate = buildDateTimeString(newReminderDate, newReminderHour, newReminderMinute, newReminderAmpm, is24Hour);
      const saved = toUiReminder(await repositories.reminders.create({
        taskId: String(taskId),
        dueDate,
        message: newReminderMessage.trim(),
      }));
      setReminders(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewReminderDate('');
      setNewReminderMessage('');
      setNewReminderHour('09'); setNewReminderMinute('00'); setNewReminderAmpm('AM');
    } catch {
      setError('Failed to create reminder.');
    }
  };

  const removeReminder = async (taskId: number, reminderId: number) => {
    try {
      await repositories.reminders.delete(String(reminderId));
      setReminders(prev => ({ ...prev, [taskId]: prev[taskId].filter(r => r.reminderID !== reminderId) }));
    } catch {
      setError('Failed to delete reminder.');
    }
  };

  const addAttachment = async (taskId: number) => {
    const url = newAttachmentUrl.trim();
    if (!url) return;
    try {
      const saved = toUiAttachment(await repositories.attachments.create({
        taskId: String(taskId),
        fileOrLink: url,
        metadata: newAttachmentLabel.trim(),
      }));
      setAttachments(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewAttachmentUrl('');
      setNewAttachmentLabel('');
    } catch {
      setError('Failed to add link.');
    }
  };

  const removeAttachment = async (taskId: number, attachmentId: number) => {
    try {
      await repositories.attachments.delete(String(attachmentId));
      setAttachments(prev => ({ ...prev, [taskId]: prev[taskId].filter(a => a.attachmentID !== attachmentId) }));
    } catch {
      setError('Failed to remove link.');
    }
  };

  return {
    resources: {
      subtasks,
      notes,
      reminders,
      attachments,
    },
    drafts: {
      newSubtaskTitle,
      editingSubtaskId,
      editingSubtaskTitle,
      newNoteContent,
      newReminderDate,
      newReminderHour,
      newReminderMinute,
      newReminderAmpm,
      newReminderMessage,
      newAttachmentUrl,
      newAttachmentLabel,
    },
    draftSetters: {
      setNewSubtaskTitle,
      setEditingSubtaskId,
      setEditingSubtaskTitle,
      setNewNoteContent,
      setNewReminderDate,
      setNewReminderHour,
      setNewReminderMinute,
      setNewReminderAmpm,
      setNewReminderMessage,
      setNewAttachmentUrl,
      setNewAttachmentLabel,
    },
    actions: {
      loadTaskSections,
      clearDeletedTaskResources,
      addSubtask,
      toggleSubtask,
      removeSubtask,
      updateSubtaskTitle,
      addNote,
      removeNote,
      addReminder,
      removeReminder,
      addAttachment,
      removeAttachment,
    },
    externalSetters: {
      setReminders,
    },
  };
}
