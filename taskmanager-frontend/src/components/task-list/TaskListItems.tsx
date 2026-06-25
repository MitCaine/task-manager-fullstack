import { Fragment, type ReactNode } from 'react';
import type { Project, Subtask, Task } from '../../types/task';
import { isTaskOverdue } from '../../utils/taskUtils';
import { normalizeTaskStatus } from '../../utils/taskDisplay';
import { findProjectById, formatPriorityLabel, formatTaskDateRange } from '../../utils/taskDisplayHelpers';
import ConfirmDelete from '../shared/ConfirmDelete';
import TaskCardMain from './TaskCardMain';
import { DoneDivider, TaskListEmptyState } from './TaskListPresentation';
import type { FilterStatus } from './TaskListControls';

type TaskListItemsProps = {
  tasks: Task[];
  emptyState: {
    title: string;
    body: string;
  };
  hasActiveListFilters: boolean;
  filterStatus: FilterStatus;
  selectedTaskId: number | null;
  editingId: number | null;
  mobileEditLayout: boolean;
  bulkMode: boolean;
  bulkSelectedIds: Set<number>;
  expandedTagTaskIds: Set<number>;
  openActionTaskId: number | null;
  confirmDeleteId: number | null;
  subtasks: Record<number, Subtask[]>;
  projects: Project[];
  locale: string;
  is24Hour: boolean;
  recurrenceLabels: Record<number, string>;
  visibleTagCount: number;
  onResetFilters: () => void;
  onOpenTask: (task: Task) => void;
  onLongPressStart: (task: Task) => void;
  onLongPressCancel: () => void;
  onOpenStatusMove: (task: Task) => void;
  onToggleBulkSelect: (taskId: number) => void;
  onToggleComplete: (task: Task) => void;
  onLoadRecurrenceLabel: (taskId: number) => void;
  onToggleTags: (taskId: number) => void;
  onToggleActions: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onConfirmDelete: (taskId: number) => void;
  onCancelDelete: () => void;
  renderEditForm: (task: Task, variant?: 'inline' | 'mobile') => ReactNode;
};

function TaskListItems({
  tasks,
  emptyState,
  hasActiveListFilters,
  filterStatus,
  selectedTaskId,
  editingId,
  mobileEditLayout,
  bulkMode,
  bulkSelectedIds,
  expandedTagTaskIds,
  openActionTaskId,
  confirmDeleteId,
  subtasks,
  projects,
  locale,
  is24Hour,
  recurrenceLabels,
  visibleTagCount,
  onResetFilters,
  onOpenTask,
  onLongPressStart,
  onLongPressCancel,
  onOpenStatusMove,
  onToggleBulkSelect,
  onToggleComplete,
  onLoadRecurrenceLabel,
  onToggleTags,
  onToggleActions,
  onEdit,
  onDuplicate,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  renderEditForm,
}: TaskListItemsProps): JSX.Element {
  const firstDoneIdx = filterStatus === 'completed'
    ? -1
    : tasks.findIndex(task => task.statusID === 2);
  const doneCount = firstDoneIdx >= 0 ? tasks.length - firstDoneIdx : 0;

  return (
    <ul className="list" aria-label="Task list">
      {tasks.length === 0 && (
        <TaskListEmptyState
          title={emptyState.title}
          body={emptyState.body}
          showReset={hasActiveListFilters}
          onResetFilters={onResetFilters}
        />
      )}

      {tasks.map((task, idx) => {
        const overdue = isTaskOverdue(task);
        const completed = task.statusID === 2;
        const statusID = normalizeTaskStatus(task.statusID);
        const statusLabel = completed ? 'Done' : statusID === 3 ? 'In progress' : 'Active';
        const isSelected = selectedTaskId === task.taskID;
        const isEditingTask =
          editingId === task.taskID &&
          selectedTaskId === null;
        const taskSubtasks = subtasks[task.taskID] ?? [];
        const subtaskDone = taskSubtasks.filter(subtask => subtask.statusID === 2).length;
        const taskProjectTitle = task.projectID ? findProjectById(projects, task.projectID)?.title ?? null : null;

        return (
          <Fragment key={task.taskID}>
            {idx === firstDoneIdx && <DoneDivider doneCount={doneCount} />}
            {!(isEditingTask && mobileEditLayout) && (
              <li
                key={`task-${task.taskID}`}
                id={`task-${task.taskID}`}
                className={[
                  'item',
                  overdue ? 'item--overdue' : '',
                  completed ? 'item--completed' : '',
                  isSelected ? 'item--selected' : '',
                  isEditingTask ? 'item--editing' : '',
                  bulkMode && bulkSelectedIds.has(task.taskID) ? 'item--bulk-selected' : '',
                ].filter(Boolean).join(' ')}
              >
                <>
                  {!isEditingTask && (
                    <TaskCardMain
                      task={task}
                      completed={completed}
                      overdue={overdue}
                      statusID={statusID}
                      statusLabel={statusLabel}
                      dateTimeLabel={formatTaskDateRange(task.dateTimeScheduled, task.endDateTimeScheduled, locale, is24Hour)}
                      recurrenceLabel={recurrenceLabels[task.taskID]}
                      projectTitle={taskProjectTitle}
                      priorityLabel={task.priority ? formatPriorityLabel(task.priority) : null}
                      subtaskDone={subtaskDone}
                      subtaskTotal={taskSubtasks.length}
                      bulkMode={bulkMode}
                      bulkSelected={bulkSelectedIds.has(task.taskID)}
                      tagsExpanded={expandedTagTaskIds.has(task.taskID)}
                      visibleTagCount={visibleTagCount}
                      actionMenuOpen={openActionTaskId === task.taskID}
                      onOpenTask={() => onOpenTask(task)}
                      onLongPressStart={() => onLongPressStart(task)}
                      onLongPressCancel={onLongPressCancel}
                      onOpenStatusMove={() => onOpenStatusMove(task)}
                      onToggleBulkSelect={() => onToggleBulkSelect(task.taskID)}
                      onToggleComplete={() => onToggleComplete(task)}
                      onLoadRecurrenceLabel={() => onLoadRecurrenceLabel(task.taskID)}
                      onToggleTags={onToggleTags}
                      onToggleActions={() => onToggleActions(task.taskID)}
                      onEdit={() => onEdit(task)}
                      onDuplicate={() => onDuplicate(task)}
                      onDelete={() => onDelete(task.taskID)}
                    />
                  )}

                  {isEditingTask && !mobileEditLayout && renderEditForm(task)}

                  {confirmDeleteId === task.taskID && (
                    <ConfirmDelete
                      taskTitle={task.title}
                      onConfirm={() => onConfirmDelete(task.taskID)}
                      onCancel={onCancelDelete}
                    />
                  )}
                </>
              </li>
            )}
            {isEditingTask && mobileEditLayout && (
              <li id={`task-${task.taskID}`} className="mobile-edit-row">
                {renderEditForm(task, 'mobile')}
              </li>
            )}
          </Fragment>
        );
      })}
    </ul>
  );
}

export default TaskListItems;
