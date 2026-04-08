import type { Task } from '../types/task';

type TaskListProps = {
  tasks: Task[];
  onDelete(id: number): void;
};

export default function TaskList({ tasks, onDelete }: TaskListProps) {
  if (tasks.length === 0) return <p>No tasks yet.</p>;

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.taskID}>
          <span>{task.title}</span>
          <button onClick={() => onDelete(task.taskID)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
