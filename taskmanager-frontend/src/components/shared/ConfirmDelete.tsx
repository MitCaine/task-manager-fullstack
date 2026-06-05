type ConfirmDeleteProps = {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDelete({ taskTitle, onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <div className="confirm-delete">
      <span>Delete &quot;{taskTitle}&quot;?</span>
      <button className="btn btn--danger btn--sm" onClick={onConfirm}>Delete</button>
      <button className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}

export default ConfirmDelete;
