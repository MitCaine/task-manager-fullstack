type TaskListEmptyStateProps = {
  title: string;
  body: string;
  showReset: boolean;
  onResetFilters: () => void;
};

function TaskListEmptyState({ title, body, showReset, onResetFilters }: TaskListEmptyStateProps) {
  return (
    <li className="empty">
      <span className="empty__title">{title}</span>
      <span className="empty__body">{body}</span>
      {showReset && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onResetFilters}
        >
          Reset filters
        </button>
      )}
    </li>
  );
}

export default TaskListEmptyState;
