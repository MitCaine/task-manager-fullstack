import type { ChangeEvent } from 'react';
import type { Note } from '../types/task';

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

export default NotesSection;
