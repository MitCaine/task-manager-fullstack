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

export default TaskCardToolbar;
