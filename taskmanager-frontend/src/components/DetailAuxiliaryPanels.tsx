import type { ChangeEvent, KeyboardEvent } from 'react';
import type { Attachment, Note, Subtask } from '../types/task';
import DetailSectionShell from './DetailSectionShell';

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

type NotesSectionProps = {
  notes: Note[];
  newNoteContent: string;
  onNoteContentChange: (value: string) => void;
  onAddNote: () => void;
  onRemoveNote: (noteId: number) => void;
  formatDateTime: (dateTime: string) => string;
};

function NotesSection({
  notes,
  newNoteContent,
  onNoteContentChange,
  onAddNote,
  onRemoveNote,
  formatDateTime,
}: NotesSectionProps) {
  const handleNoteContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onNoteContentChange(event.target.value);
  };

  return (
    <>
      <div className="sec-panel__add sec-panel__add--col">
        <textarea className="input controls__description" placeholder="Note content…" aria-label="Note text" value={newNoteContent} onChange={handleNoteContentChange} rows={2} autoFocus />
        <button className="btn btn--sm" onClick={onAddNote}>Add Note</button>
      </div>
      {notes.length === 0
        ? <p className="sec-panel__empty">No notes yet.</p>
        : notes.map(note => (
          <div key={note.noteID} className="note-row">
            <div className="note-row__body">
              <p className="note-row__content">{note.context}</p>
              <span className="note-row__time">{formatDateTime(note.timestamp)}</span>
            </div>
            <button className="btn btn--danger btn--icon" onClick={() => onRemoveNote(note.noteID)} aria-label="Delete note">✕</button>
          </div>
        ))
      }
    </>
  );
}

type LinksSectionProps = {
  attachments: Attachment[];
  newAttachmentUrl: string;
  newAttachmentLabel: string;
  onAttachmentUrlChange: (value: string) => void;
  onAttachmentLabelChange: (value: string) => void;
  onAddAttachment: () => void;
  onRemoveAttachment: (attachmentId: number) => void;
};

function LinksSection({
  attachments,
  newAttachmentUrl,
  newAttachmentLabel,
  onAttachmentUrlChange,
  onAttachmentLabelChange,
  onAddAttachment,
  onRemoveAttachment,
}: LinksSectionProps) {
  const handleAddOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onAddAttachment();
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAttachmentUrlChange(event.target.value);
  };

  const handleLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAttachmentLabelChange(event.target.value);
  };

  return (
    <>
      <div className="sec-panel__add sec-panel__add--col">
        <input
          className="input"
          placeholder="URL…"
          aria-label="Attachment URL"
          value={newAttachmentUrl}
          onChange={handleUrlChange}
          onKeyDown={handleAddOnEnter}
          autoFocus
        />
        <input
          className="input"
          placeholder="Label (optional)…"
          aria-label="Attachment label"
          value={newAttachmentLabel}
          onChange={handleLabelChange}
          onKeyDown={handleAddOnEnter}
        />
        <button className="btn btn--sm" onClick={onAddAttachment}>Add Link</button>
      </div>
      {attachments.length === 0
        ? <p className="sec-panel__empty">No links yet.</p>
        : attachments.map(attachment => (
          <div key={attachment.attachmentID} className="sec-row">
            <div className="sec-row__body">
              <a href={attachment.fileORLink} target="_blank" rel="noopener noreferrer" className="attachment-link">
                {attachment.metadata || attachment.fileORLink}
              </a>
            </div>
            <button className="btn btn--danger btn--icon" onClick={() => onRemoveAttachment(attachment.attachmentID)} aria-label="Delete attachment">✕</button>
          </div>
        ))
      }
    </>
  );
}

type DetailSubtasksPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  subtasks: Subtask[];
  doneCount: number;
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

export function DetailSubtasksPanel({
  isOpen,
  onToggle,
  subtasks,
  doneCount,
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
}: DetailSubtasksPanelProps): JSX.Element {
  return (
    <DetailSectionShell
      title="Subtasks"
      isOpen={isOpen}
      onToggle={onToggle}
      badgeContent={subtasks.length > 0 ? `${doneCount}/${subtasks.length}` : null}
      badgeClassName={`item__badge ${doneCount === subtasks.length ? 'item__badge--subtasks-done' : 'item__badge--subtasks'}`}
    >
      <SubtasksSection
        subtasks={subtasks}
        newSubtaskTitle={newSubtaskTitle}
        editingSubtaskId={editingSubtaskId}
        editingSubtaskTitle={editingSubtaskTitle}
        onNewSubtaskTitleChange={onNewSubtaskTitleChange}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onRemoveSubtask={onRemoveSubtask}
        onStartEditSubtask={onStartEditSubtask}
        onEditingSubtaskTitleChange={onEditingSubtaskTitleChange}
        onSaveSubtaskTitle={onSaveSubtaskTitle}
        onCancelEditSubtask={onCancelEditSubtask}
      />
    </DetailSectionShell>
  );
}

type DetailNotesPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  notes: Note[];
  newNoteContent: string;
  onNoteContentChange: (value: string) => void;
  onAddNote: () => void;
  onRemoveNote: (noteId: number) => void;
  formatDateTime: (dateTime: string) => string;
};

export function DetailNotesPanel({
  isOpen,
  onToggle,
  notes,
  newNoteContent,
  onNoteContentChange,
  onAddNote,
  onRemoveNote,
  formatDateTime,
}: DetailNotesPanelProps): JSX.Element {
  return (
    <DetailSectionShell
      title="Notes"
      isOpen={isOpen}
      onToggle={onToggle}
      badgeContent={notes.length > 0 ? notes.length : null}
    >
      <NotesSection
        notes={notes}
        newNoteContent={newNoteContent}
        onNoteContentChange={onNoteContentChange}
        onAddNote={onAddNote}
        onRemoveNote={onRemoveNote}
        formatDateTime={formatDateTime}
      />
    </DetailSectionShell>
  );
}

type DetailLinksPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  attachments: Attachment[];
  newAttachmentUrl: string;
  newAttachmentLabel: string;
  onAttachmentUrlChange: (value: string) => void;
  onAttachmentLabelChange: (value: string) => void;
  onAddAttachment: () => void;
  onRemoveAttachment: (attachmentId: number) => void;
};

export function DetailLinksPanel({
  isOpen,
  onToggle,
  attachments,
  newAttachmentUrl,
  newAttachmentLabel,
  onAttachmentUrlChange,
  onAttachmentLabelChange,
  onAddAttachment,
  onRemoveAttachment,
}: DetailLinksPanelProps): JSX.Element {
  return (
    <DetailSectionShell
      title="Links"
      isOpen={isOpen}
      onToggle={onToggle}
      badgeContent={attachments.length > 0 ? attachments.length : null}
    >
      <LinksSection
        attachments={attachments}
        newAttachmentUrl={newAttachmentUrl}
        newAttachmentLabel={newAttachmentLabel}
        onAttachmentUrlChange={onAttachmentUrlChange}
        onAttachmentLabelChange={onAttachmentLabelChange}
        onAddAttachment={onAddAttachment}
        onRemoveAttachment={onRemoveAttachment}
      />
    </DetailSectionShell>
  );
}
