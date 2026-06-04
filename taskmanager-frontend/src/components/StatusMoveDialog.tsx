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
};

export default function StatusMoveDialog({
  taskTitle,
  options,
  onClose,
  onMove,
  firstActionRef,
}: StatusMoveDialogProps): JSX.Element {
  return (
    <div className="status-move" onClick={onClose}>
      <div className="status-move__panel" role="dialog" aria-modal="true" aria-labelledby="status-move-title" onClick={e => e.stopPropagation()}>
        <div className="status-move__header">
          <div className="status-move__title-wrap" id="status-move-title">
            <span className="status-move__eyebrow">Move task</span>
            <span className="status-move__title">{taskTitle}</span>
          </div>
          <button className="btn btn--ghost btn--icon" aria-label="Close move task" onClick={onClose}>✕</button>
        </div>
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
      </div>
    </div>
  );
}
