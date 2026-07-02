import { createNote, deleteNote, getNotes } from '../../api/tasks';
import type { CreateNoteInput, EntityId, Note } from '../../domain/models';
import type { NoteRepository } from '../contracts';
import { mapCreateNoteInputToApiArgs, mapNoteDtoToDomain } from './mappers/NoteMapper';
import { toApiId } from './mappers/mapperUtils';

export class ApiNoteRepository implements NoteRepository {
  async listByTask(taskId: EntityId): Promise<Note[]> {
    const notes = await getNotes(toApiId(taskId));
    return notes.map(mapNoteDtoToDomain);
  }

  async create(input: CreateNoteInput): Promise<Note> {
    const args = mapCreateNoteInputToApiArgs(input);
    return mapNoteDtoToDomain(await createNote(args.taskId, args.title, args.context));
  }

  async delete(id: EntityId): Promise<void> {
    await deleteNote(toApiId(id));
  }
}
