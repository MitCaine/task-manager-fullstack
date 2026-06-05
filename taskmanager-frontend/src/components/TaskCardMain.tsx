import type { Task } from '../types/task';
import TaskCardBadges from './TaskCardBadges';
import TaskCardDescription from './TaskCardDescription';
import TaskCardToolbar from './TaskCardToolbar';
import TaskTags from './TaskTags';

type TaskCardMainProps = {
  task: Task;
  completed: boolean;
  overdue: boolean;
  statusID: number;
  statusLabel: string;
  dateTimeLabel: string;
  projectTitle: string | null;
  priorityLabel: string | null;
  subtaskDone: number;
  subtaskTotal: number;
  bulkMode: boolean;
  bulkSelected: boolean;
  tagsExpanded: boolean;
  visibleTagCount: number;
  actionMenuOpen: boolean;
  onOpenTask: () => void;
  onLongPressStart: () => void;
  onLongPressCancel: () => void;
  onOpenStatusMove: () => void;
  onToggleBulkSelect: () => void;
  onToggleComplete: () => void;
  onToggleTags: (taskId: number) => void;
  onToggleActions: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function TaskCardMain({
  task,
  completed,
  overdue,
  statusID,
  statusLabel,
  dateTimeLabel,
  projectTitle,
  priorityLabel,
  subtaskDone,
  subtaskTotal,
  bulkMode,
  bulkSelected,
  tagsExpanded,
  visibleTagCount,
  actionMenuOpen,
  onOpenTask,
  onLongPressStart,
  onLongPressCancel,
  onOpenStatusMove,
  onToggleBulkSelect,
  onToggleComplete,
  onToggleTags,
  onToggleActions,
  onEdit,
  onDuplicate,
  onDelete,
}: TaskCardMainProps): JSX.Element {
  return (
    <div
      className="item__main"
      onClick={onOpenTask}
      onTouchStart={onLongPressStart}
      onTouchMove={onLongPressCancel}
      onTouchEnd={onLongPressCancel}
      onMouseDown={onLongPressStart}
      onMouseLeave={onLongPressCancel}
      onMouseUp={onLongPressCancel}
      onContextMenu={e => { e.preventDefault(); if (!bulkMode) onOpenStatusMove(); }}
      style={{ cursor: 'pointer' }}
    >
      {bulkMode && (
        <input
          type="checkbox"
          className="item__checkbox item__bulk-checkbox"
          checked={bulkSelected}
          onChange={onToggleBulkSelect}
          onClick={e => e.stopPropagation()}
          aria-label={`Select task ${task.title}`}
        />
      )}
      {!bulkMode && (
        <input
          type="checkbox"
          className="item__checkbox"
          checked={completed}
          onChange={e => { e.stopPropagation(); onToggleComplete(); }}
          onClick={e => e.stopPropagation()}
          title={completed ? 'Mark as active' : 'Mark as done'}
          aria-label={completed ? `Mark ${task.title} as active` : `Mark ${task.title} as done`}
        />
      )}
      <div className="item__body">
        <div className="item__title-row">
          <div className="item__title-line">
            <span className={`item__title${completed ? ' item__title--done' : ''}`}>{task.title}</span>
            <button
              type="button"
              className={`item__status-pill item__status-pill--${completed ? 'done' : statusID === 3 ? 'progress' : 'active'}`}
              aria-label={`Change status from ${statusLabel}`}
              onClick={e => {
                e.stopPropagation();
                if (!bulkMode) {
                  onOpenStatusMove();
                }
              }}
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
            >
              {statusLabel}
            </button>
            {overdue && <span className="item__badge">Overdue</span>}
          </div>
          <span className="item__meta item__meta--inline">{dateTimeLabel}</span>
          <TaskCardBadges
            projectTitle={projectTitle}
            priority={task.priority}
            priorityLabel={priorityLabel}
            completed={completed}
            subtaskDone={subtaskDone}
            subtaskTotal={subtaskTotal}
          />
        </div>
        <TaskCardDescription description={task.description} />
        <TaskTags
          taskId={task.taskID}
          tags={task.tags}
          expanded={tagsExpanded}
          onToggle={onToggleTags}
          visibleTagCount={visibleTagCount}
        />
      </div>
      <TaskCardToolbar
        isOpen={actionMenuOpen}
        onToggle={onToggleActions}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  );
}

export default TaskCardMain;
