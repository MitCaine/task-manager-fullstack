import type { RefObject } from 'react';

export type StatusMoveOption = {
  label: string;
  statusID: number | null;
};

export type StatusMoveDialogProps = {
  taskTitle: string;
  options: StatusMoveOption[];
  onClose: () => void;
  onMove: (statusID: number | null) => void;
  firstActionRef: RefObject<HTMLButtonElement>;
  inline?: boolean;
};

export default function StatusMoveDialog({
  taskTitle,
  options,
  onClose,
  onMove,
  firstActionRef,
  inline = false,
}: StatusMoveDialogProps): JSX.Element {
  return (
    <div className={`status-move${inline ? ' status-move--inline' : ''}`} onClick={inline ? undefined : onClose}>
      <div
        className={`status-move__panel${inline ? ' status-move__panel--inline' : ''}`}
        role={inline ? 'group' : 'dialog'}
        aria-modal={inline ? undefined : true}
        aria-label={inline ? `Move task ${taskTitle}` : undefined}
        aria-labelledby={inline ? undefined : 'status-move-title'}
        onClick={e => e.stopPropagation()}
      >
        {inline ? (
          <span className="status-move__eyebrow">Task Status</span>
        ) : (
          <div className="status-move__header">
            <div className="status-move__title-wrap" id="status-move-title">
              <span className="status-move__eyebrow">Move task</span>
              <span className="status-move__title">{taskTitle}</span>
            </div>
            <button className="btn btn--ghost btn--icon" aria-label="Close move task" onClick={onClose}>✕</button>
          </div>
        )}
        <div className="status-move__actions">
          {options.map(option => (
            <button
              key={option.label}
              type="button"
              ref={options[0] === option ? firstActionRef : undefined}
              className="btn status-move__btn"
              onClick={() => onMove(option.statusID)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {inline && <button className="btn btn--ghost btn--icon status-move__close" aria-label="Close move task" onClick={onClose}>✕</button>}
      </div>
    </div>
  );
}
