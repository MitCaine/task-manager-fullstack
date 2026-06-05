import { useState } from 'react';
import {
  createAttachment,
  createNote,
  createReminder,
  createSubtask,
  deleteAttachment as deleteAttachmentAPI,
  deleteNote as deleteNoteAPI,
  deleteReminder as deleteReminderAPI,
  deleteSubtask as deleteSubtaskAPI,
  getAttachments,
  getNotes,
  getReminders,
  getSubtasks,
  patchSubtaskStatus,
  updateSubtask as updateSubtaskAPI,
} from '../api/tasks';
import type { Attachment, Note, Reminder, Subtask } from '../types/task';
import { buildDateTimeString } from '../utils/dateTime';
import type { Ampm } from '../utils/taskForm';

type UseTaskDetailResourcesOptions = {
  is24Hour: boolean;
  setError: (message: string) => void;
};

export default function useTaskDetailResources({ is24Hour, setError }: UseTaskDetailResourcesOptions) {
  const [subtasks, setSubtasks] = useState<Record<number, Subtask[]>>({});
  const [notes, setNotes] = useState<Record<number, Note[]>>({});
  const [reminders, setReminders] = useState<Record<number, Reminder[]>>({});
  const [attachments, setAttachments] = useState<Record<number, Attachment[]>>({});

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
        subtasks[taskId]   ? Promise.resolve(subtasks[taskId])   : getSubtasks(taskId),
        notes[taskId]      ? Promise.resolve(notes[taskId])      : getNotes(taskId),
        reminders[taskId]  ? Promise.resolve(reminders[taskId])  : getReminders(taskId),
        attachments[taskId] ? Promise.resolve(attachments[taskId]) : getAttachments(taskId),
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
      const saved = await createSubtask(taskId, newSubtaskTitle.trim());
      setSubtasks(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewSubtaskTitle('');
    } catch {
      setError('Failed to create subtask.');
    }
  };

  const toggleSubtask = async (taskId: number, subtask: Subtask) => {
    const newStatusID = subtask.statusID === 2 ? 1 : 2;
    try {
      const saved = await patchSubtaskStatus(subtask.subTaskID, newStatusID);
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].map(s => s.subTaskID === saved.subTaskID ? saved : s) }));
    } catch {
      setError('Failed to update subtask.');
    }
  };

  const removeSubtask = async (taskId: number, subTaskID: number) => {
    try {
      await deleteSubtaskAPI(subTaskID);
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
      const saved = await updateSubtaskAPI(subtask.subTaskID, trimmed);
      setSubtasks(prev => ({ ...prev, [taskId]: prev[taskId].map(s => s.subTaskID === saved.subTaskID ? saved : s) }));
    } catch {
      setError('Failed to update subtask.');
    }
  };

  const addNote = async (taskId: number) => {
    if (!newNoteContent.trim()) return;
    try {
      const saved = await createNote(taskId, '', newNoteContent.trim());
      setNotes(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewNoteContent('');
    } catch {
      setError('Failed to create note.');
    }
  };

  const removeNote = async (taskId: number, noteId: number) => {
    try {
      await deleteNoteAPI(noteId);
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
      const saved = await createReminder(taskId, dueDate, newReminderMessage.trim());
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
      await deleteReminderAPI(reminderId);
      setReminders(prev => ({ ...prev, [taskId]: prev[taskId].filter(r => r.reminderID !== reminderId) }));
    } catch {
      setError('Failed to delete reminder.');
    }
  };

  const loadAttachments = async (taskId: number) => {
    try {
      const data = await getAttachments(taskId);
      setAttachments(prev => ({ ...prev, [taskId]: data }));
    } catch { /* non-critical */ }
  };

  const addAttachment = async (taskId: number) => {
    const url = newAttachmentUrl.trim();
    if (!url) return;
    try {
      const saved = await createAttachment(taskId, url, newAttachmentLabel.trim());
      setAttachments(prev => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), saved] }));
      setNewAttachmentUrl('');
      setNewAttachmentLabel('');
    } catch {
      setError('Failed to add link.');
    }
  };

  const removeAttachment = async (taskId: number, attachmentId: number) => {
    try {
      await deleteAttachmentAPI(attachmentId);
      setAttachments(prev => ({ ...prev, [taskId]: prev[taskId].filter(a => a.attachmentID !== attachmentId) }));
    } catch {
      setError('Failed to remove link.');
    }
  };

  return {
    subtasks,
    notes,
    reminders,
    attachments,
    setReminders,
    newSubtaskTitle,
    setNewSubtaskTitle,
    editingSubtaskId,
    setEditingSubtaskId,
    editingSubtaskTitle,
    setEditingSubtaskTitle,
    newNoteContent,
    setNewNoteContent,
    newReminderDate,
    setNewReminderDate,
    newReminderHour,
    setNewReminderHour,
    newReminderMinute,
    setNewReminderMinute,
    newReminderAmpm,
    setNewReminderAmpm,
    newReminderMessage,
    setNewReminderMessage,
    newAttachmentUrl,
    setNewAttachmentUrl,
    newAttachmentLabel,
    setNewAttachmentLabel,
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
    loadAttachments,
    addAttachment,
    removeAttachment,
  };
}
