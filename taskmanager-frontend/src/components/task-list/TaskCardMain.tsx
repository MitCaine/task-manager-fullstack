import type { Task } from '../../types/task';
import { ProjectBadge } from '../create-task/TagProjectChips';
import TaskTags from '../create-task/TaskTags';

type TaskCardBadgesProps = {
  projectTitle: string | null;
  priority: Task['priority'];
  priorityLabel: string | null;
  recurring: boolean;
  completed: boolean;
  subtaskDone: number;
  subtaskTotal: number;
};

function TaskCardBadges({
  projectTitle,
  priority,
  priorityLabel,
  recurring,
  completed,
  subtaskDone,
  subtaskTotal,
}: TaskCardBadgesProps) {
  if (!projectTitle && !priority && !recurring && !completed && subtaskTotal === 0) return null;

  return (
    <div className="item__badges">
      {projectTitle && <ProjectBadge title={projectTitle} />}
      {priority && (
        <span className={`item__badge item__badge--priority item__badge--priority-${priority.toLowerCase()}`}>
          {priorityLabel}
        </span>
      )}
      {recurring && <span className="item__badge item__badge--repeat">Repeats</span>}
      {completed && <span className="item__badge item__badge--done">Done</span>}
      {subtaskTotal > 0 && (
        <span className={`item__badge ${subtaskDone === subtaskTotal ? 'item__badge--subtasks-done' : 'item__badge--subtasks'}`}>
          {subtaskDone}/{subtaskTotal}
        </span>
      )}
    </div>
  );
}

type TaskCardDescriptionProps = {
  description?: string | null;
};

function TaskCardDescription({ description }: TaskCardDescriptionProps) {
  if (!description) return null;
  return <p className="item__desc">{description}</p>;
}

type TaskCardToolbarProps = {
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function TaskCardToolbar({
  isOpen,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: TaskCardToolbarProps) {
  return (
    <div className="item__actions" onClick={e => e.stopPropagation()}>
      <button
        className={`btn btn--ghost btn--icon item__action-toggle${isOpen ? ' item__action-toggle--open' : ''}`}
        aria-label="Open task actions"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        ⋯
      </button>
      {isOpen && (
        <div className="item__action-menu" role="menu">
          <button type="button" role="menuitem" onClick={onEdit}>Edit</button>
          <button type="button" role="menuitem" onClick={onDuplicate}>Copy</button>
          <button type="button" role="menuitem" className="item__action-menu-danger" onClick={onDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}

type TaskCardMainProps = {
  task: Task;
  completed: boolean;
  overdue: boolean;
  statusID: number | null;
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
            recurring={Boolean(task.recurrenceRuleID)}
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
