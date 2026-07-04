import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Project, Tag, Task } from '../types/task';
import type { Ampm } from '../utils/taskForm';
import type { RepeatValue } from '../utils/taskRecurrence';
import {
  normalizeRecurrenceRule,
  recurrenceIntervalKey,
} from '../utils/taskRecurrence';
import { deriveTaskEditDraft } from '../utils/taskEditDraft';
import { buildValidatedTaskSchedule, getDefaultEndTime } from '../utils/taskScheduling';
import { toDomainEntityId, toDomainStatusId, toLegacyRecurrenceRule, toLegacyTask, useRepositories } from '../repositories';

type EditPriority = 'LOW' | 'MEDIUM' | 'HIGH' | '';

type UseInlineEditWorkflowOptions = {
  is24Hour: boolean;
  tags: Tag[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setError: (message: string) => void;
  createProjectFromDraft: () => Promise<Project | null>;
  createTagFromDraft: () => Promise<Tag | null>;
  setInlineEditOpenControl: Dispatch<SetStateAction<string | null>>;
  selectedTaskId: number | null;
};

export default function useInlineEditWorkflow({
  is24Hour,
  tags,
  setTasks,
  setError,
  createProjectFromDraft,
  createTagFromDraft,
  setInlineEditOpenControl,
  selectedTaskId,
}: UseInlineEditWorkflowOptions) {
  const repositories = useRepositories();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editHour, setEditHour] = useState('12');
  const [editMinute, setEditMinute] = useState('00');
  const [editAmpm, setEditAmpm] = useState<Ampm>('AM');
  const [editShowTime, setEditShowTime] = useState(false);
  const [editShowEndTime, setEditShowEndTime] = useState(false);
  const [editEndHour, setEditEndHour] = useState('12');
  const [editEndMinute, setEditEndMinute] = useState('00');
  const [editEndAmpm, setEditEndAmpm] = useState<Ampm>('AM');
  const [editPriority, setEditPriority] = useState<EditPriority>('');
  const [editTaskTagIDs, setEditTaskTagIDs] = useState<number[]>([]);
  const [editProjectID, setEditProjectID] = useState<number | ''>('');
  const [editRepeat, setEditRepeat] = useState<RepeatValue>(null);
  const [originalRepeatKey, setOriginalRepeatKey] = useState('');
  const [showInlineEditProject, setShowInlineEditProject] = useState(false);
  const [showInlineEditTag, setShowInlineEditTag] = useState(false);

  const { rangeError: currentEditTimeRangeError } = buildValidatedTaskSchedule({
    date: editDate,
    showTime: editShowTime,
    hour: editHour,
    minute: editMinute,
    ampm: editAmpm,
    showEndTime: editShowEndTime,
    endHour: editEndHour,
    endMinute: editEndMinute,
    endAmpm: editEndAmpm,
    is24Hour,
  });

  const startEdit = async (task: Task) => {
    const draft = deriveTaskEditDraft(task, is24Hour);
    setEditingId(task.taskID);
    setEditTitle(draft.title);
    setEditDescription(draft.description);
    setEditPriority(draft.priority);
    setEditProjectID(draft.projectID);
    setEditShowTime(draft.showTime);
    setEditDate(draft.date);
    setEditHour(draft.hour);
    setEditMinute(draft.minute);
    setEditAmpm(draft.ampm);
    setEditShowEndTime(draft.showEndTime);
    setEditEndHour(draft.endHour);
    setEditEndMinute(draft.endMinute);
    setEditEndAmpm(draft.endAmpm);
    setShowInlineEditProject(false);
    setShowInlineEditTag(false);
    setInlineEditOpenControl(null);
    try {
      const fresh = toLegacyTask(await repositories.tasks.get(toDomainEntityId(task.taskID)));
      setEditTaskTagIDs((fresh.tags ?? []).map(t => t.tagID));
      setTasks(prev => prev.map(t => t.taskID === fresh.taskID ? { ...t, tags: fresh.tags } : t));
    } catch {
      setEditTaskTagIDs((task.tags ?? []).map(t => t.tagID));
    }
    if (!task.recurrenceRuleID) {
      setEditRepeat(null);
      setOriginalRepeatKey('');
    } else {
      repositories.recurrence.getByTask(toDomainEntityId(task.taskID))
        .then(rule => {
          const repeat = normalizeRecurrenceRule(toLegacyRecurrenceRule(rule));
          setEditRepeat(repeat);
          setOriginalRepeatKey(recurrenceIntervalKey(repeat));
        })
        .catch(() => {
          setEditRepeat(null);
          setOriginalRepeatKey('');
        });
    }
  };

  const cancelEdit = () => setEditingId(null);

  const toggleEditEndTime = () => {
    if (editShowEndTime) {
      setEditShowEndTime(false);
      return;
    }
    const nextEnd = getDefaultEndTime({ hour: editHour, minute: editMinute, ampm: editAmpm, is24Hour });
    setEditEndHour(nextEnd.endHour);
    setEditEndMinute(nextEnd.endMinute);
    setEditEndAmpm(nextEnd.endAmpm);
    setEditShowEndTime(true);
  };

  const saveEdit = async (task: Task) => {
    const { dateTimeScheduled, endDateTimeScheduled, rangeError } = buildValidatedTaskSchedule({
      date: editDate,
      showTime: editShowTime,
      hour: editHour,
      minute: editMinute,
      ampm: editAmpm,
      showEndTime: editShowEndTime,
      endHour: editEndHour,
      endMinute: editEndMinute,
      endAmpm: editEndAmpm,
      is24Hour,
    });
    if (rangeError) {
      return;
    }
    try {
      const saved = toLegacyTask(await repositories.tasks.update(toDomainEntityId(task.taskID), {
        title: editTitle.trim() || task.title,
        description: editDescription.trim(),
        dateTimeScheduled,
        endDateTimeScheduled,
        statusId: toDomainStatusId(task.statusID),
        priority: editPriority || null,
        projectId: editProjectID !== '' ? toDomainEntityId(editProjectID) : null,
      }));
      const currentTagIDs = (task.tags ?? []).map(t => t.tagID);
      const toAdd = editTaskTagIDs.filter(id => !currentTagIDs.includes(id));
      const toRemove = currentTagIDs.filter(id => !editTaskTagIDs.includes(id));
      await Promise.all([
        ...toAdd.map(tagId => repositories.tasks.addTag(toDomainEntityId(task.taskID), toDomainEntityId(tagId))),
        ...toRemove.map(tagId => repositories.tasks.removeTag(toDomainEntityId(task.taskID), toDomainEntityId(tagId))),
      ]);
      const tagObjects = tags.filter(t => editTaskTagIDs.includes(t.tagID));
      setTasks(prev => prev.map(t => t.taskID === saved.taskID ? { ...saved, tags: tagObjects } : t));
      if (selectedTaskId === null) setEditingId(null);
      if (recurrenceIntervalKey(editRepeat) !== originalRepeatKey) {
        try {
          await repositories.recurrence.setForTask(toDomainEntityId(task.taskID), editRepeat);
          setOriginalRepeatKey(recurrenceIntervalKey(editRepeat));
          const freshTask = toLegacyTask(await repositories.tasks.get(toDomainEntityId(task.taskID)));
          setTasks(prev => prev.map(t => t.taskID === task.taskID ? { ...t, recurrenceRuleID: freshTask.recurrenceRuleID } : t));
        } catch { /* non-critical */ }
      }
    } catch {
      setError('Failed to update task.');
    }
  };

  const addProjectInlineEdit = async () => {
    const saved = await createProjectFromDraft();
    if (!saved) return;
    setEditProjectID(saved.projectID);
    setShowInlineEditProject(false);
  };

  const addTagInlineEdit = async () => {
    const saved = await createTagFromDraft();
    if (!saved) return;
    setEditTaskTagIDs(prev => [...prev, saved.tagID]);
    setShowInlineEditTag(false);
  };

  return {
    draft: {
      editingId,
      setEditingId,
      editTitle,
      setEditTitle,
      editDescription,
      setEditDescription,
      editDate,
      setEditDate,
      editHour,
      setEditHour,
      editMinute,
      setEditMinute,
      editAmpm,
      setEditAmpm,
      editShowTime,
      setEditShowTime,
      editShowEndTime,
      setEditShowEndTime,
      editEndHour,
      setEditEndHour,
      editEndMinute,
      setEditEndMinute,
      editEndAmpm,
      setEditEndAmpm,
      editPriority,
      setEditPriority,
      editTaskTagIDs,
      setEditTaskTagIDs,
      editProjectID,
      setEditProjectID,
      editRepeat,
      setEditRepeat,
      showInlineEditProject,
      setShowInlineEditProject,
      showInlineEditTag,
      setShowInlineEditTag,
    },
    derived: {
      currentEditTimeRangeError,
    },
    actions: {
      startEdit,
      saveEdit,
      cancelEdit,
      toggleEditEndTime,
      addProjectInlineEdit,
      addTagInlineEdit,
    },
  };
}
