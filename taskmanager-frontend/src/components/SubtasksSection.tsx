import type { ChangeEvent, KeyboardEvent } from 'react';
import type { Subtask } from '../types/task';

type SubtasksSectionProps = {
  subtasks: Subtask[];
  newSubtaskTitle: string;
  editingSubtaskId: number | null;
  editingSubtaskTitle: string;
  onNewSubtaskTitleChange: (value: string) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onRemoveSubtask: (subtaskId: number) => void;
  onStartEditSubtask: (subtask: Subtask) => void;
  onEditingSubtaskTitleChange: (value: string) => void;
  onSaveSubtaskTitle: (subtask: Subtask) => void;
  onCancelEditSubtask: () => void;
};

function SubtasksSection({
  subtasks,
  newSubtaskTitle,
  editingSubtaskId,
  editingSubtaskTitle,
  onNewSubtaskTitleChange,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onStartEditSubtask,
  onEditingSubtaskTitleChange,
  onSaveSubtaskTitle,
  onCancelEditSubtask,
}: SubtasksSectionProps) {
  const handleNewSubtaskTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onNewSubtaskTitleChange(event.target.value);
  };

  const handleNewSubtaskKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onAddSubtask();
  };

  const handleEditingSubtaskTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onEditingSubtaskTitleChange(event.target.value);
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>, subtask: Subtask) => {
    if (event.key === 'Enter') onSaveSubtaskTitle(subtask);
    if (event.key === 'Escape') onCancelEditSubtask();
  };

  return (
    <>
      <div className="sec-panel__add">
        <input
          className="input"
          placeholder="New subtask…"
          aria-label="New subtask"
          value={newSubtaskTitle}
          onChange={handleNewSubtaskTitleChange}
          onKeyDown={handleNewSubtaskKeyDown}
          autoFocus
        />
        <button className="btn btn--sm" onClick={onAddSubtask}>Add</button>
      </div>
      {subtasks.length === 0
        ? <p className="sec-panel__empty">No subtasks yet.</p>
        : subtasks.map(subtask => (
          <div key={subtask.subTaskID} className="sec-row">
            <input type="checkbox" className="item__checkbox" checked={subtask.statusID === 2} onChange={() => onToggleSubtask(subtask)} aria-label={`Toggle subtask ${subtask.title}`} />
            {editingSubtaskId === subtask.subTaskID ? (
              <input
                className="input sec-row__edit-input"
                aria-label="Subtask title"
                autoFocus
                value={editingSubtaskTitle}
                onChange={handleEditingSubtaskTitleChange}
                onBlur={() => onSaveSubtaskTitle(subtask)}
                onKeyDown={event => handleEditKeyDown(event, subtask)}
              />
            ) : (
              <span
                className={`sec-row__title${subtask.statusID === 2 ? ' sec-row__title--done' : ''}`}
                onClick={() => onStartEditSubtask(subtask)}
                title="Click to edit"
              >
                {subtask.title}
              </span>
            )}
            <button className="btn btn--danger btn--icon" onClick={() => onRemoveSubtask(subtask.subTaskID)} aria-label={`Delete subtask ${subtask.title}`}>✕</button>
          </div>
        ))
      }
    </>
  );
}

export default SubtasksSection;
