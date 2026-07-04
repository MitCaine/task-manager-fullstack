type TaskListDateLabelProps = {
  isEuropeanDate: boolean;
};

export function TaskListDateLabel({ isEuropeanDate }: TaskListDateLabelProps): JSX.Element {
  return (
    <span className="task-card-toolbar__date">
      {new Date().toLocaleDateString(isEuropeanDate ? 'en-GB' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
    </span>
  );
}

type TaskListEmptyStateProps = {
  title: string;
  body: string;
  showReset: boolean;
  onResetFilters: () => void;
};

export function TaskListEmptyState({ title, body, showReset, onResetFilters }: TaskListEmptyStateProps) {
  return (
    <li className="empty-state">
      <h3>{title}</h3>
      <p>{body}</p>
      {showReset && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onResetFilters}>
          Reset filters
        </button>
      )}
    </li>
  );
}

export function TaskListLoading() {
  return (
    <div className="list-skeleton" aria-label="Loading tasks">
      <div />
      <div />
      <div />
    </div>
  );
}
