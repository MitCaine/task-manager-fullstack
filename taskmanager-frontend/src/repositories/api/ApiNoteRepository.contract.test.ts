import { createNote, deleteNote, getNotes } from '../../api/tasks';
import type { Note } from '../../types/task';
import { describeNoteRepositoryContract } from '../contracts/noteRepositoryContract';
import { ApiNoteRepository } from './ApiNoteRepository';

jest.mock('../../api/tasks');

const mockGetNotes = getNotes as jest.MockedFunction<typeof getNotes>;
const mockCreateNote = createNote as jest.MockedFunction<typeof createNote>;
const mockDeleteNote = deleteNote as jest.MockedFunction<typeof deleteNote>;

let nextNoteId = 100;
const noteStore = new Map<number, Note>();
const deletedNoteIds = new Set<number>();

function installNoteApiMocks() {
  mockGetNotes.mockImplementation(async taskId => (
    Array.from(noteStore.values()).filter(note => note.taskID === taskId)
  ));
  mockCreateNote.mockImplementation(async (taskId, title, context) => {
    const note: Note = {
      noteID: nextNoteId++,
      taskID: taskId,
      title,
      context,
      timestamp: '2026-07-02T12:00:00',
    };
    noteStore.set(note.noteID, note);
    return note;
  });
  mockDeleteNote.mockImplementation(async id => {
    deletedNoteIds.add(id);
    noteStore.delete(id);
  });
}

beforeEach(() => {
  nextNoteId = 100;
  noteStore.clear();
  deletedNoteIds.clear();
  jest.clearAllMocks();
  installNoteApiMocks();
});

describeNoteRepositoryContract({
  createRepository: () => new ApiNoteRepository(),
  seedNote: note => {
    noteStore.set(Number(note.id), {
      noteID: Number(note.id),
      taskID: Number(note.taskId),
      title: note.title ?? '',
      context: note.context,
      timestamp: note.timestamp,
    });
  },
  expectDeleted: id => {
    expect(deletedNoteIds.has(Number(id))).toBe(true);
  },
});
