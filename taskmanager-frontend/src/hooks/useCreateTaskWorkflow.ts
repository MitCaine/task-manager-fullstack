import { useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Project, Tag, Task } from '../types/task';
import type { Task as DomainTask } from '../domain/models';
import type { ToastListItem } from '../components/shared/ToastList';
import type { Ampm } from '../utils/taskForm';
import type { RepeatValue } from '../utils/taskRecurrence';
import { findProjectById, findTagsByIds } from '../utils/taskDisplayHelpers';
import { buildValidatedTaskSchedule, getDefaultEndTime } from '../utils/taskScheduling';
import { toLegacyNumericId, useRepositories } from '../repositories';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

type UseCreateTaskWorkflowOptions = {
  is24Hour: boolean;
  projects: Project[];
  tags: Tag[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setError: (message: string) => void;
  setToasts: Dispatch<SetStateAction<ToastListItem[]>>;
  toastIdRef: MutableRefObject<number>;
  createProjectFromDraft: () => Promise<Project | null>;
  createTagFromDraft: () => Promise<Tag | null>;
};

function getNow(): { date: string; hour: string; minute: string; ampm: Ampm } {
  const now = new Date();
  const h = now.getHours();
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    hour: String(h % 12 || 12).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0'),
    ampm: h >= 12 ? 'PM' : 'AM',
  };
}

function toUiTask(task: DomainTask): Task {
  const uiTask: Task = {
    taskID: toLegacyNumericId(task.id, 'taskID'),
    title: task.title,
    description: task.description,
    dateTimeScheduled: task.dateTimeScheduled ?? null,
    endDateTimeScheduled: task.endDateTimeScheduled ?? null,
    createdAt: task.createdAt ?? null,
    statusID: task.statusId ?? null,
    scheduleID: task.scheduleId ? toLegacyNumericId(task.scheduleId, 'scheduleID') : null,
    recurrenceRuleID: task.recurrenceRuleId ? toLegacyNumericId(task.recurrenceRuleId, 'recurrenceRuleID') : null,
    projectID: task.projectId ? toLegacyNumericId(task.projectId, 'projectID') : null,
    priority: task.priority ?? null,
  };

  if (task.tags) {
    uiTask.tags = task.tags.map(tag => ({
      tagID: toLegacyNumericId(tag.id, 'tagID'),
      title: tag.title,
      color: tag.color ?? null,
    }));
  }

  return uiTask;
}

export default function useCreateTaskWorkflow({
  is24Hour,
  projects,
  tags,
  setTasks,
  setError,
  setToasts,
  toastIdRef,
  createProjectFromDraft,
  createTagFromDraft,
}: UseCreateTaskWorkflowOptions) {
  const repositories = useRepositories();
  const { date: initDate, hour: initHour, minute: initMinute, ampm: initAmpm } = getNow();
  const [input, setInput] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initDate);
  const [hour, setHour] = useState(initHour);
  const [minute, setMinute] = useState(initMinute);
  const [ampm, setAmpm] = useState<Ampm>(initAmpm);
  const [showAddTime, setShowAddTime] = useState(false);
  const [showAddEndTime, setShowAddEndTime] = useState(false);
  const [endHour, setEndHour] = useState('12');
  const [endMinute, setEndMinute] = useState('00');
  const [endAmpm, setEndAmpm] = useState<Ampm>('AM');
  const [newPriority, setNewPriority] = useState<Priority | ''>('');
  const [newRepeat, setNewRepeat] = useState<RepeatValue>(null);
  const [newProjectID, setNewProjectID] = useState<number | ''>('');
  const [newTaskTagIDs, setNewTaskTagIDs] = useState<number[]>([]);
  const [showInlineProject, setShowInlineProject] = useState(false);
  const [showInlineTag, setShowInlineTag] = useState(false);

  const {
    dateTimeScheduled: draftDateTimeScheduled,
    endDateTimeScheduled: draftEndDateTimeScheduled,
    rangeError: currentCreateTimeRangeError,
  } = buildValidatedTaskSchedule({
    date,
    showTime: showAddTime,
    hour,
    minute,
    ampm,
    showEndTime: showAddEndTime,
    endHour,
    endMinute,
    endAmpm,
    is24Hour,
  });
  const draftProject = findProjectById(projects, newProjectID);
  const draftTags = findTagsByIds(tags, newTaskTagIDs);

  const toggleAddEndTime = () => {
    if (showAddEndTime) { setShowAddEndTime(false); return; }
    const nextEnd = getDefaultEndTime({ hour, minute, ampm, is24Hour });
    setEndHour(nextEnd.endHour);
    setEndMinute(nextEnd.endMinute);
    setEndAmpm(nextEnd.endAmpm);
    setShowAddEndTime(true);
  };

  const resetCreateDraft = () => {
    setInput('');
    setDescription('');
    setNewPriority('');
    setNewRepeat(null);
    setNewProjectID('');
    setNewTaskTagIDs([]);
    setShowAddTime(false);
    setShowAddEndTime(false);
    const n = getNow();
    setDate(n.date);
    setHour(n.hour);
    setMinute(n.minute);
    setAmpm(n.ampm);
  };

  const addTask = async () => {
    if (input.trim() === '') {
      setTitleError(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setTitleError(true)));
      return;
    }
    const { dateTimeScheduled, endDateTimeScheduled, rangeError } = buildValidatedTaskSchedule({
      date,
      showTime: showAddTime,
      hour,
      minute,
      ampm,
      showEndTime: showAddEndTime,
      endHour,
      endMinute,
      endAmpm,
      is24Hour,
    });
    if (rangeError) {
      return;
    }
    try {
      const saved = toUiTask(await repositories.tasks.create({
        title: input.trim(),
        description: description.trim(),
        dateTimeScheduled,
        endDateTimeScheduled,
        priority: newPriority || null,
        projectId: newProjectID !== '' ? String(newProjectID) : null,
      }));
      let taskForState = saved;
      if (newRepeat) {
        const repeated = toUiTask(await repositories.recurrence.setForTask(String(saved.taskID), newRepeat));
        taskForState = { ...saved, recurrenceRuleID: repeated.recurrenceRuleID ?? null };
      }
      if (newTaskTagIDs.length > 0) {
        await Promise.all(newTaskTagIDs.map(tagId => repositories.tasks.addTag(String(saved.taskID), String(tagId))));
        const tagObjects = tags.filter(t => newTaskTagIDs.includes(t.tagID));
        taskForState = { ...taskForState, tags: tagObjects };
      }
      setTasks(prev => [...prev, taskForState]);
      resetCreateDraft();
      setToasts(prev => [...prev, {
        id: ++toastIdRef.current,
        taskTitle: taskForState.title,
        message: 'Task added.',
        kind: 'confirmation',
        autoDismissMs: 3500,
      }]);
    } catch {
      setError('Failed to create task.');
    }
  };

  const addProject = async () => {
    const saved = await createProjectFromDraft();
    if (saved) setShowInlineProject(false);
  };

  const addTagInline = async () => {
    const saved = await createTagFromDraft();
    if (!saved) return;
    setNewTaskTagIDs(prev => [...prev, saved.tagID]);
    setShowInlineTag(false);
  };

  return {
    draft: {
      input,
      setInput,
      titleError,
      setTitleError,
      description,
      setDescription,
      date,
      setDate,
      hour,
      setHour,
      minute,
      setMinute,
      ampm,
      setAmpm,
      showAddTime,
      setShowAddTime,
      showAddEndTime,
      setShowAddEndTime,
      endHour,
      setEndHour,
      endMinute,
      setEndMinute,
      endAmpm,
      setEndAmpm,
      newPriority,
      setNewPriority,
      newRepeat,
      setNewRepeat,
      newProjectID,
      setNewProjectID,
      newTaskTagIDs,
      setNewTaskTagIDs,
      showInlineProject,
      setShowInlineProject,
      showInlineTag,
      setShowInlineTag,
    },
    derived: {
      draftDateTimeScheduled,
      draftEndDateTimeScheduled,
      currentCreateTimeRangeError,
      draftProject,
      draftTags,
    },
    actions: {
      addTask,
      addProject,
      addTagInline,
      toggleAddEndTime,
    },
  };
}
