import type { Task } from '../types/task';
import { ProjectBadge } from './TagProjectChips';

type TaskCardBadgesProps = {
  projectTitle: string | null;
  priority: Task['priority'];
  priorityLabel: string | null;
  completed: boolean;
  subtaskDone: number;
  subtaskTotal: number;
};

function TaskCardBadges({
  projectTitle,
  priority,
  priorityLabel,
  completed,
  subtaskDone,
  subtaskTotal,
}: TaskCardBadgesProps) {
  if (!projectTitle && !priority && !completed && subtaskTotal === 0) return null;

  return (
    <div className="item__badges">
      {projectTitle && <ProjectBadge title={projectTitle} />}
      {priority && (
        <span className={`item__badge item__badge--priority item__badge--priority-${priority.toLowerCase()}`}>
          {priorityLabel}
        </span>
      )}
      {completed && <span className="item__badge item__badge--done">Done</span>}
      {subtaskTotal > 0 && (
        <span className={`item__badge ${subtaskDone === subtaskTotal ? 'item__badge--subtasks-done' : 'item__badge--subtasks'}`}>
          {subtaskDone}/{subtaskTotal}
        </span>
      )}
    </div>
  );
}

export default TaskCardBadges;
