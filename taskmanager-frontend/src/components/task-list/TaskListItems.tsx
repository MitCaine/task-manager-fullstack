import { Fragment, type ReactNode } from 'react';
import type { Project, Subtask, Task } from '../../types/task';
import { isTaskDone, isTaskOverdue, normalizeTaskStatus, TASK_STATUS } from '../../utils/taskUtils';
import { findProjectById, formatPriorityLabel, formatTaskDateRange } from '../../utils/taskDisplayHelpers';
import ConfirmDelete from '../shared/ConfirmDelete';
import TaskCardMain from './TaskCardMain';
import { TaskListEmptyState } from './TaskListPresentation';

type TaskListItemsProps = {
  tasks: Task[];
  emptyState: {
    title: string;
    body: string;
  };
  hasActiveListFilters: boolean;
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
  onLoadRecurrenceLabel: (taskId: number) => void;
  onToggleTags: (taskId: number) => void;
  onToggleActions: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onConfirmDelete: (taskId: number) => void;
  onCancelDelete: () => void;
  renderEditForm: (task: Task, variant?: 'inline' | 'mobile') => ReactNode;
  renderStatusMove: (task: Task) => ReactNode;
};

function TaskListItems({
  tasks,
  emptyState,
  hasActiveListFilters,
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
  onLoadRecurrenceLabel,
  onToggleTags,
  onToggleActions,
  onEdit,
  onDuplicate,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  renderEditForm,
  renderStatusMove,
}: TaskListItemsProps): JSX.Element {
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

      {tasks.map(task => {
        const overdue = isTaskOverdue(task);
        const completed = isTaskDone(task);
        const statusID = normalizeTaskStatus(task.statusID);
        const statusLabel = completed ? 'Done' : statusID === TASK_STATUS.IN_PROGRESS ? 'In progress' : 'Active';
        const isSelected = selectedTaskId === task.taskID;
        const isEditingTask =
          editingId === task.taskID &&
          selectedTaskId === null;
        const taskSubtasks = subtasks[task.taskID] ?? [];
        const subtaskDone = taskSubtasks.filter(subtask => subtask.statusID === TASK_STATUS.DONE).length;
        const taskProjectTitle = task.projectID ? findProjectById(projects, task.projectID)?.title ?? null : null;

        return (
          <Fragment key={task.taskID}>
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
            {renderStatusMove(task)}
          </Fragment>
        );
      })}
    </ul>
  );
}

export default TaskListItems;
