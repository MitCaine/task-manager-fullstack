type DetailHeaderProps = {
  title: string;
  onTitleChange: (value: string) => void;
  showDuplicateWarning: boolean;
  onClose: () => void;
};

function DetailHeader({ title, onTitleChange, showDuplicateWarning, onClose }: DetailHeaderProps) {
  return (
    <div className="detail__header">
      <input
        className="input detail__title-input"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Task title"
        aria-label="Task title"
      />
      {showDuplicateWarning && (
        <p className="input-warn-msg">A task with this title already exists.</p>
      )}
      <button className="btn btn--ghost btn--icon detail__close" onClick={onClose} title="Close" aria-label="Close task details">×</button>
    </div>
  );
}

export default DetailHeader;
