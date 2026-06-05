type TaskListDateLabelProps = {
  isEuropeanDate: boolean;
};

function TaskListDateLabel({ isEuropeanDate }: TaskListDateLabelProps): JSX.Element {
  return (
    <span className="task-card-toolbar__date">
      {new Date().toLocaleDateString(isEuropeanDate ? 'en-GB' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
    </span>
  );
}

export default TaskListDateLabel;
