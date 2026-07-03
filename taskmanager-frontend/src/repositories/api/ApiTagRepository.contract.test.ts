import { createTag, deleteTag, getTags, updateTag } from '../../api/tasks';
import type { Tag } from '../../types/task';
import { describeTagRepositoryContract } from '../contracts/tagRepositoryContract';
import { ApiTagRepository } from './ApiTagRepository';

jest.mock('../../api/tasks');

const mockGetTags = getTags as jest.MockedFunction<typeof getTags>;
const mockCreateTag = createTag as jest.MockedFunction<typeof createTag>;
const mockUpdateTag = updateTag as jest.MockedFunction<typeof updateTag>;
const mockDeleteTag = deleteTag as jest.MockedFunction<typeof deleteTag>;

let nextTagId = 100;
const tagStore = new Map<number, Tag>();
const deletedTagIds = new Set<number>();

function installTagApiMocks() {
  mockGetTags.mockImplementation(async () => Array.from(tagStore.values()));
  mockCreateTag.mockImplementation(async input => {
    const tag: Tag = { ...input, tagID: nextTagId++ };
    tagStore.set(tag.tagID, tag);
    return tag;
  });
  mockUpdateTag.mockImplementation(async (id, input) => {
    const current = tagStore.get(id);
    if (!current) throw new Error(`Tag ${id} not found`);
    const tag: Tag = { ...current, ...input, tagID: id };
    tagStore.set(id, tag);
    return tag;
  });
  mockDeleteTag.mockImplementation(async id => {
    deletedTagIds.add(id);
    tagStore.delete(id);
  });
}

beforeEach(() => {
  nextTagId = 100;
  tagStore.clear();
  deletedTagIds.clear();
  jest.clearAllMocks();
  installTagApiMocks();
});

describeTagRepositoryContract({
  createRepository: () => new ApiTagRepository(),
  seedTag: tag => {
    tagStore.set(Number(tag.id), {
      tagID: Number(tag.id),
      title: tag.title,
      color: tag.color,
    });
  },
  expectDeleted: id => {
    expect(deletedTagIds.has(Number(id))).toBe(true);
  },
});
