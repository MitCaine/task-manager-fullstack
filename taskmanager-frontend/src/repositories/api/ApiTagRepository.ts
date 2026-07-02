import { createTag, deleteTag, getTags, updateTag } from '../../api/tasks';
import type { CreateTagInput, EntityId, Tag, UpdateTagInput } from '../../domain/models';
import type { TagRepository } from '../contracts';
import { mapCreateTagInputToDto, mapTagDtoToDomain, mapUpdateTagInputToDto } from './mappers/TagMapper';
import { toApiId } from './mappers/mapperUtils';

export class ApiTagRepository implements TagRepository {
  async list(): Promise<Tag[]> {
    const tags = await getTags();
    return tags.map(mapTagDtoToDomain);
  }

  async create(input: CreateTagInput): Promise<Tag> {
    return mapTagDtoToDomain(await createTag(mapCreateTagInputToDto(input)));
  }

  async update(id: EntityId, input: UpdateTagInput): Promise<Tag> {
    return mapTagDtoToDomain(await updateTag(toApiId(id), mapUpdateTagInputToDto(input)));
  }

  async delete(id: EntityId): Promise<void> {
    await deleteTag(toApiId(id));
  }
}
